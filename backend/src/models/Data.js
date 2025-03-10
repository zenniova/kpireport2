const pool = require('../config/database');

class Data {
  static async getDataByColumns(columns, startDate, endDate) {
    try {
      // Memastikan DAY selalu termasuk dalam query untuk filtering
      if (!columns.includes('DAY')) {
        columns.unshift('DAY');
      }

      const selectedColumns = columns.join(', ');
      const query = `
        SELECT ${selectedColumns}
        FROM kpi
        WHERE DAY BETWEEN ? AND ?
        ORDER BY DAY ASC
      `;

      const [results] = await pool.query(query, [startDate, endDate]);
      return results;
    } catch (error) {
      throw new Error(`Error fetching KPI data: ${error.message}`);
    }
  }

  // Mendapatkan daftar kolom yang tersedia
  static async getAvailableColumns() {
    const columns = [
      'id',
      'DAY',
      'Site_iD',
      'NE_Name',
      'eNodeB_ID',
      'Cell_id',
      'Site_id_type_sector',
      'Cellname',
      'CSSR',
      'Service_drop',
      'RRC_User_BH',
      'Active_User_BH',
      'PRB_DL_BH',
      'PRB_UL_BH',
      'User_DL_Thp_BH',
      'User_UL_Thp_BH',
      'Total_Payload_GB'
    ];
    return columns;
  }

  static async getNetworkData(startDate, endDate, siteList, selectedMetrics) {
    try {
      const siteIds = siteList.map(site => site.Site_ID);
      const placeholders = siteIds.map(() => '?').join(',');
      
      // Dynamically build the SELECT clause based on selectedMetrics
      const metricsColumns = ['DAY', 'Site_ID', ...selectedMetrics];
      const selectClause = metricsColumns.join(', ');

      const query = `
        SELECT ${selectClause}
        FROM kpi
        WHERE Site_iD IN (${placeholders})
        AND DAY BETWEEN ? AND ?
        ORDER BY DAY ASC, Site_iD ASC
      `;

      console.log('Executing query:', query);
      console.log('Parameters:', [...siteIds, startDate, endDate]);

      const [results] = await pool.query(query, [...siteIds, startDate, endDate]);
      return results;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error(`Error fetching network data: ${error.message}`);
    }
  }

  static async saveUploadHistory(fileInfo) {
    try {
      const query = `
        INSERT INTO upload_history 
        (filename, upload_date, file_type) 
        VALUES (?, NOW(), ?)
      `;

      const [result] = await pool.query(query, [
        fileInfo.filename,
        fileInfo.fileType
      ]);
      return result;
    } catch (error) {
      throw new Error(`Error saving upload history: ${error.message}`);
    }
  }

  // Method untuk testing koneksi database
  static async testConnection() {
    try {
      const [result] = await pool.query('SELECT 1');
      return result;
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }
}

module.exports = Data; 