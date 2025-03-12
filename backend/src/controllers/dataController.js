const Data = require('../models/Data');
const csv = require('csv-parser');
const fs = require('fs');
const pool = require('../config/database');
const NetworkMetrics = require('../models/NetworkMetrics');

const dataController = {
  // Get available columns from database
  async getColumns(req, res) {
    try {
      const [rows] = await pool.query('SHOW COLUMNS FROM kpi');
      const columns = rows.map(row => row.Field);
      res.json(columns);
    } catch (error) {
      console.error('Error fetching columns:', error);
      res.status(500).json({ error: 'Failed to fetch columns' });
    }
  },

  // Process CSV file and get data based on parameters
  async processData(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const parameters = [];

      // Read CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (row) => {
            // Assuming first column contains the parameter (e.g., Site_ID)
            const param = Object.values(row)[0];
            if (param && param.trim()) {
              parameters.push(param.trim());
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      if (parameters.length === 0) {
        throw new Error('No valid parameters found in CSV file');
      }

      // Create query with parameters
      const placeholders = parameters.map(() => '?').join(',');
      const query = `SELECT * FROM [4G cell daily Beyond] WHERE Site_ID IN (${placeholders})`;
      
      // Execute query
      const [rows] = await pool.query(query, parameters);

      // Delete temporary file
      fs.unlinkSync(req.file.path);

      res.json({
        parameters,
        data: rows,
        totalRows: rows.length,
        message: 'Data retrieved successfully'
      });

    } catch (error) {
      console.error('Error processing file:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: error.message });
    }
  },

  // Get data for selected columns and parameters
  async getData(req, res) {
    try {
      const { columns, parameters, startDate, endDate } = req.body;
      
      if (!columns || !Array.isArray(columns) || columns.length === 0) {
        return res.status(400).json({ error: 'Please provide an array of column names' });
      }

      if (!parameters || !Array.isArray(parameters) || parameters.length === 0) {
        return res.status(400).json({ error: 'Please provide an array of parameters' });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Please provide date range' });
      }

      const columnList = columns.join(', ');
      const placeholders = parameters.map(() => '?').join(',');
      
      const query = `
        SELECT 
          ${columnList}
        FROM [4G cell daily Beyond] 
        WHERE Site_ID IN (${placeholders})
        AND (
          (DAY REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
            AND STR_TO_DATE(DAY, '%Y-%m-%d') BETWEEN STR_TO_DATE(?, '%m/%d/%Y') AND STR_TO_DATE(?, '%m/%d/%Y'))
          OR 
          (DAY REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' 
            AND STR_TO_DATE(DAY, '%m/%d/%Y') BETWEEN STR_TO_DATE(?, '%m/%d/%Y') AND STR_TO_DATE(?, '%m/%d/%Y'))
        )
        ORDER BY 
          CASE 
            WHEN DAY REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
              THEN STR_TO_DATE(DAY, '%Y-%m-%d')
            WHEN DAY REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' 
              THEN STR_TO_DATE(DAY, '%m/%d/%Y')
            ELSE NULL 
          END ASC
      `;
      
      // Duplicate date parameters for both format conditions
      const queryParams = [...parameters, startDate, endDate, startDate, endDate];
      const [rows] = await pool.query(query, queryParams);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  },

  // Get available date range from database
  async getDateRange(req, res) {
    try {
      // Get unique dates and handle both date formats
      const query = `
        SELECT DISTINCT 
          CASE 
            WHEN DAY REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
              THEN DATE_FORMAT(STR_TO_DATE(DAY, '%Y-%m-%d'), '%m/%d/%Y')
            WHEN DAY REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' 
              THEN DATE_FORMAT(STR_TO_DATE(DAY, '%m/%d/%Y'), '%m/%d/%Y')
            ELSE NULL 
          END as formatted_day,
          DAY as original_day
        FROM kpi 
        WHERE DAY IS NOT NULL 
        ORDER BY 
          CASE 
            WHEN DAY REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
              THEN STR_TO_DATE(DAY, '%Y-%m-%d')
            WHEN DAY REGEXP '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' 
              THEN STR_TO_DATE(DAY, '%m/%d/%Y')
            ELSE NULL 
          END ASC
      `;
      const [dates] = await pool.query(query);
      console.log('Raw dates from DB:', dates);
      
      if (dates.length === 0) {
        return res.status(404).json({ error: 'No dates available' });
      }

      // Filter out any null values and format dates
      const availableDates = dates
        .filter(d => d.formatted_day) // Remove any null values
        .map(d => {
          console.log('Processing date:', {
            original: d.original_day,
            formatted: d.formatted_day
          });
          return d.formatted_day;
        });

      if (availableDates.length === 0) {
        return res.status(404).json({ error: 'No valid dates available after formatting' });
      }

      const response = {
        minDate: availableDates[0],
        maxDate: availableDates[availableDates.length - 1],
        availableDates: availableDates
      };
      console.log('Sending response:', response);

      res.json(response);
    } catch (error) {
      console.error('Error fetching date range:', error);
      res.status(500).json({ error: 'Failed to fetch date range: ' + error.message });
    }
  },

  processFiles: async (req, res) => {
    try {
      if (!req.files || !req.files.siteFile || !req.files.kpiFile) {
        return res.status(400).json({ error: 'Please upload both site and KPI files' });
      }

      const siteParameters = [];
      const kpiColumns = new Set();

      // Process site file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.files.siteFile.path)
          .pipe(csv())
          .on('data', (row) => {
            const siteId = Object.values(row)[0];
            if (siteId && siteId.trim()) {
              siteParameters.push(siteId.trim());
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Process KPI file
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.files.kpiFile.path)
          .pipe(csv())
          .on('headers', (headers) => {
            headers.forEach(header => kpiColumns.add(header.trim()));
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Clean up temporary files
      fs.unlinkSync(req.files.siteFile.path);
      fs.unlinkSync(req.files.kpiFile.path);

      res.json({
        siteParameters,
        kpiColumns: Array.from(kpiColumns),
        message: 'Files processed successfully'
      });

    } catch (error) {
      console.error('Error processing files:', error);
      if (req.files) {
        if (req.files.siteFile && fs.existsSync(req.files.siteFile.path)) {
          fs.unlinkSync(req.files.siteFile.path);
        }
        if (req.files.kpiFile && fs.existsSync(req.files.kpiFile.path)) {
          fs.unlinkSync(req.files.kpiFile.path);
        }
      }
      res.status(500).json({ error: error.message });
    }
  },

  processSiteFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const sites = [];

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv({
            mapHeaders: ({ header }) => header.trim(),
            mapValues: ({ value }) => value.trim()
          }))
          .on('data', (row) => {
            // Log untuk debugging
            console.log('Processing row:', row);
            
            // Cek apakah ada data di row
            if (Object.keys(row).length > 0) {
              // Ambil nilai dari kolom yang ada
              const site = {
                siteId: row['Site_ID'] || row['SITE_ID'] || row['site_id'] || '',
                eNodeBId: row['eNodeBID'] || row['ENODEBID'] || row['enodeb_id'] || '',
                cellId: row['Cell_Id'] || row['CELL_ID'] || row['cell_id'] || '',
              };

              // Validasi data
              if (site.siteId && site.eNodeBId && site.cellId) {
                sites.push(site);
              } else {
                console.log('Skipping invalid row:', row);
              }
            }
          })
          .on('end', resolve)
          .on('error', (error) => {
            reject(error);
          })
          .on('finish', () => {
            // Hapus file setelah selesai diproses
            fs.unlink(req.file.path, (err) => {
              if (err) console.error('Error deleting file:', err);
            });
          });
      });

      // Log untuk debugging
      console.log('Processed sites:', sites);

      // Validasi hasil
      if (sites.length === 0) {
        return res.status(400).json({ 
          error: 'No valid site data found in CSV. Please check the file format.',
          expectedFormat: {
            headers: ['Site_ID', 'eNodeBID', 'Cell_Id'],
            example: 'Site_ID,eNodeBID,Cell_Id\nBDG074,149074,12'
          }
        });
      }

      res.json({
        sites,
        message: 'Site file processed successfully',
        totalSites: sites.length
      });

    } catch (error) {
      console.error('Error processing site file:', error);
      // Pastikan file dihapus jika terjadi error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      res.status(500).json({ 
        error: 'Error processing file: ' + error.message,
        details: error.stack
      });
    }
  },

  processMetricsFile: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const metrics = new Set();

      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv({
            mapHeaders: ({ header }) => header.trim(), // Trim header names
            mapValues: ({ value }) => value.trim() // Trim values
          }))
          .on('data', (row) => {
            // Log untuk debugging
            console.log('Processing metrics row:', row);
            
            // Ambil semua kolom sebagai metrics
            Object.keys(row).forEach(key => {
              if (key && key.trim()) {
                metrics.add(key.trim());
              }
            });

            // Jika row memiliki single column, tambahkan valuenya juga
            Object.values(row).forEach(value => {
              if (value && value.trim()) {
                metrics.add(value.trim());
              }
            });
          })
          .on('headers', (headers) => {
            console.log('CSV Headers:', headers);
            headers.forEach(header => {
              if (header && header.trim()) {
                metrics.add(header.trim());
              }
            });
          })
          .on('end', () => {
            console.log('Finished processing metrics:', Array.from(metrics));
            resolve();
          })
          .on('error', (error) => {
            console.error('CSV parsing error:', error);
            reject(error);
          });
      });

      // Cleanup file
      fs.unlinkSync(req.file.path);

      // Validasi hasil
      if (metrics.size === 0) {
        return res.status(400).json({ 
          error: 'No valid metrics found in CSV. Please check the file format.',
          expectedFormat: {
            option1: 'Single column with metric names',
            example1: 'Metric\nRRC_CONNECTED\nPDCCH_UTIL\n',
            option2: 'Multiple columns with headers as metrics',
            example2: 'RRC_CONNECTED,PDCCH_UTIL\nvalue1,value2'
          }
        });
      }

      // Filter out any non-column metrics
      const [columns] = await pool.query('SHOW COLUMNS FROM kpi');
      const validColumns = new Set(columns.map(col => col.Field));
      
      const validMetrics = Array.from(metrics).filter(metric => 
        validColumns.has(metric) && 
        !['Site_ID', 'Cell_id', 'DAY'].includes(metric)
      );

      if (validMetrics.length === 0) {
        return res.status(400).json({
          error: 'No valid KPI metrics found in CSV. Metrics must match column names in database.',
          availableMetrics: Array.from(validColumns)
        });
      }

      res.json({
        metrics: validMetrics,
        message: 'Metrics file processed successfully',
        totalMetrics: validMetrics.length
      });

    } catch (error) {
      console.error('Error processing metrics file:', error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ 
        error: 'Error processing metrics file: ' + error.message,
        details: error.stack
      });
    }
  },

  getComparisonData: async (req, res) => {
    try {
      const { 
        sites, 
        metrics,
        dataType,
        executed: { start: executedStart, end: executedEnd },
        surrounding: { start: surroundingStart, end: surroundingEnd }
      } = req.body;

      if (!sites?.length) {
        return res.status(400).json({ error: 'Missing site list' });
      }

      const siteIds = sites.map(site => site.siteId);
      
      // Query berdasarkan tipe data
      const getQuery = (period) => {
        if (dataType === 'hourly') {
          return `
            SELECT 
              CONCAT(DAY, ' ', HOUR, ':00') as DAY,
              Site_ID,
              Cell_id,
              ${metrics.join(',')}
            FROM [4G cell daily Beyond]
            WHERE Site_ID IN (?)
            AND STR_TO_DATE(DAY, '%m/%d/%Y') 
              BETWEEN STR_TO_DATE(?, '%m/%d/%Y') 
              AND STR_TO_DATE(?, '%m/%d/%Y')
            ORDER BY STR_TO_DATE(DAY, '%m/%d/%Y'), HOUR ASC
          `;
        } else {
          return `
            SELECT 
              DAY,
              Site_ID,
              Cell_id,
              ${metrics.join(',')},
              COUNT(*) as count,
              ${metrics.map(metric => `AVG(${metric}) as avg_${metric}`).join(',')}
            FROM [4G cell daily Beyond]
            WHERE Site_ID IN (?)
            AND STR_TO_DATE(DAY, '%m/%d/%Y') 
              BETWEEN STR_TO_DATE(?, '%m/%d/%Y') 
              AND STR_TO_DATE(?, '%m/%d/%Y')
            GROUP BY DAY, Site_ID, Cell_id
            ORDER BY STR_TO_DATE(DAY, '%m/%d/%Y') ASC
          `;
        }
      };

      const executedQuery = getQuery('executed');
      const surroundingQuery = getQuery('surrounding');

      const [executedRows] = await pool.query(executedQuery, [
        siteIds, 
        executedStart, 
        executedEnd
      ]);

      const [surroundingRows] = await pool.query(surroundingQuery, [
        siteIds, 
        surroundingStart, 
        surroundingEnd
      ]);

      // Proses data sesuai tipe
      const processDataByMetric = (rows) => {
        const metricData = {};
        
        metrics.forEach(metric => {
          metricData[metric] = {};
        });

        rows.forEach(row => {
          metrics.forEach(metric => {
            const value = dataType === 'daily' ? row[`avg_${metric}`] : row[metric];
            if (!metricData[metric][row.DAY]) {
              metricData[metric][row.DAY] = {
                sum: 0,
                count: 0
              };
            }
            metricData[metric][row.DAY].sum += parseFloat(value) || 0;
            metricData[metric][row.DAY].count++;
          });
        });

        const result = {};
        metrics.forEach(metric => {
          result[metric] = Object.entries(metricData[metric]).map(([datetime, data]) => ({
            DAY: datetime,
            value: data.sum / data.count
          })).sort((a, b) => new Date(a.DAY) - new Date(b.DAY));
        });

        return result;
      };

      // Proses data untuk kedua periode
      const executedData = processDataByMetric(executedRows);
      const surroundingData = processDataByMetric(surroundingRows);

      // Format hasil akhir
      const result = {};
      metrics.forEach(metric => {
        result[metric] = {
          executed: executedData[metric],
          surrounding: surroundingData[metric]
        };
      });

      res.json(result);

    } catch (error) {
      console.error('Error fetching comparison data:', error);
      res.status(500).json({ error: error.message });
    }
  },

  processNetworkData: async (req, res) => {
    try {
      const data = req.body;
      
      const metrics = new NetworkMetrics({
        date: new Date(data.Day),
        siteId: data['Site ID'],
        neName: data['NE Name'],
        eNodeBID: parseInt(data.eNodeBID),
        cellId: parseInt(data['Cell Id']),
        cellName: data.Cellname,
        metrics: {
          availability: {
            beyondSR: parseFloat(data['AVAILABILITY_BEYOND_SR(%)'])
          },
          users: {
            totalAvg: parseFloat(data['Total Avg User']),
            totalMax: parseFloat(data['Total Max User']),
            avgBH: parseFloat(data['AVERAGE_USER_BH']),
            maxBH: parseFloat(data['MAX_USER_BH']),
            activeUserAvgBH: parseFloat(data['L Traffic ActiveUser Avg_BH']),
            activeUserMaxBH: parseFloat(data['L Traffic ActiveUser Max_BH'])
          },
          traffic: {
            uplink: {
              volume: parseFloat(data['Uplink_Traffic_Volume(MB)']),
              utilization: parseFloat(data['PRB_UL_UTIL_BH(%)'])
            },
            downlink: {
              volume: parseFloat(data['Downlink_Traffic_Volume(MB)']),
              utilization: parseFloat(data['PRB_DL_UTIL_BH(%)'])
            }
          },
          performance: {
            callSetupSuccessRate: parseFloat(data['Call Setup Success Rate (%)']),
            rrcSuccessRate: parseFloat(data['RRC Success Rate (%)']),
            erabSuccessRate: parseFloat(data['ERAB Success Rate (%)']),
            s1SignalinkSR: parseFloat(data['S1 SIGNALINK SR (%)']),
            servicesDropRate: parseFloat(data['SERVICES DROP RATE (%)'])
          }
        }
      });

      await metrics.save();
      res.status(201).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error processing network data:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  getNetworkMetrics: async (req, res) => {
    try {
      const metrics = await NetworkMetrics.find(req.query);
      res.status(200).json({
        success: true,
        count: metrics.length,
        data: metrics
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};

function formatDataForSeparateCharts(data, metrics) {
  return data.map(row => {
    const formattedRow = {
      date: row.DAY,
    };
    
    metrics.forEach(metric => {
      formattedRow[metric] = row[metric];
    });
    
    return formattedRow;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function formatDataForCombinedCharts(beforeData, afterData, metrics) {
  const combinedData = [];
  
  // Process before data
  beforeData.forEach(row => {
    const existingEntry = combinedData.find(entry => entry.date === row.DAY);
    if (existingEntry) {
      metrics.forEach(metric => {
        existingEntry[`before_${metric}`] = row[metric];
      });
    } else {
      const newEntry = { date: row.DAY };
      metrics.forEach(metric => {
        newEntry[`before_${metric}`] = row[metric];
      });
      combinedData.push(newEntry);
    }
  });

  // Process after data
  afterData.forEach(row => {
    const existingEntry = combinedData.find(entry => entry.date === row.DAY);
    if (existingEntry) {
      metrics.forEach(metric => {
        existingEntry[`after_${metric}`] = row[metric];
      });
    } else {
      const newEntry = { date: row.DAY };
      metrics.forEach(metric => {
        newEntry[`after_${metric}`] = row[metric];
      });
      combinedData.push(newEntry);
    }
  });

  return combinedData.sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = {
  ...dataController,
  processNetworkData
}; 