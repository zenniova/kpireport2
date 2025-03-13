import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Button, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  Box,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import DatePicker from 'react-datepicker';
import { 
  fetchCompareData,
  processSiteFile,
  processMetricsFile
} from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import "react-datepicker/dist/react-datepicker.css";
import './ColumnQuery.css';
import jsPDF from 'jspdf';
import { FaDownload } from 'react-icons/fa';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const formatDateForAPI = (date) => {
  if (!date) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const formatDateDisplay = (date) => {
  if (!date) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PREVIEW_ROWS = 5;

const calculateChange = (before, after) => {
  if (!before || !after) return 0;
  return ((after - before) / before) * 100;
};

const getStatus = (change) => {
  if (change > 0) return 'Improve';
  if (change < 0) return 'Degrade';
  return 'Maintain';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Improve':
      return '#28a745'; // green
    case 'Degrade':
      return '#dc3545'; // red
    case 'Maintain':
      return '#ffc107'; // yellow
    default:
      return '#6c757d'; // gray
  }
};

const ColumnQuery = () => {
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [executedDateRange, setExecutedDateRange] = useState({
    start: null,
    end: null
  });
  const [surroundingDateRange, setSurroundingDateRange] = useState({
    start: null,
    end: null
  });
  const [selectedSites, setSelectedSites] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [activeTab, setActiveTab] = useState('executed');
  const [previewData, setPreviewData] = useState({
    executed: [],
    surrounding: []
  });
  const [sitePreview, setSitePreview] = useState([]);
  const [metricsPreview, setMetricsPreview] = useState([]);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [dataType, setDataType] = useState('daily');

  // Fetch available columns when component mounts
  useEffect(() => {
    fetchColumns();
  }, []);

  const fetchColumns = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/columns');
      setColumns(response.data);
    } catch (error) {
      console.error('Error fetching columns:', error);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleColumnChange = (event) => {
    setSelectedColumns(event.target.value);
  };

  const handleSubmit = async () => {
    if (!file || selectedColumns.length === 0) {
      alert('Please select a file and at least one column');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // First, process the file to get Site IDs
      const fileResponse = await axios.post('http://localhost:3000/api/process', formData);
      const siteIds = fileResponse.data.parameters;

      // Then, fetch data for selected columns and Site IDs
      const dataResponse = await axios.post('http://localhost:3000/api/data', {
        siteIds: siteIds,
        metrics: selectedColumns,
        startDate: '2024-01-01', // You might want to make these dates dynamic
        endDate: '2024-12-31'
      });

      setData(dataResponse.data.data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing data');
    } finally {
      setLoading(false);
    }
  };

  // Define columns for DataGrid
  const gridColumns = selectedColumns.map(col => ({
    field: col,
    headerName: col,
    width: 150,
    valueGetter: (params) => params.row[col]
  }));

  const handleSiteFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('siteFile', file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvContent = event.target.result;
        const lines = csvContent.split('\n');
        const preview = lines.slice(0, 6).map(line => {
          const values = line.split(',');
          return {
            siteId: values[0],
            eNodeBId: values[1],
            cellId: values[2]
          };
        });
        setSitePreview(preview);
      };
      reader.readAsText(file);
      
      const response = await processSiteFile(formData);
      setSelectedSites(response.sites);
      
    } catch (error) {
      console.error('Error processing site file: ' + error.message);
    }
  };

  const handleMetricsFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('metricsFile', file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvContent = event.target.result;
        const lines = csvContent.split('\n');
        setMetricsPreview(lines.slice(0, 6));
      };
      reader.readAsText(file);
      
      const response = await processMetricsFile(formData);
      setSelectedMetrics(response.metrics);
      
    } catch (error) {
      console.error('Error processing metrics file: ' + error.message);
    }
  };

  const fetchComparisonData = async () => {
    if (!selectedSites.length || !selectedMetrics.length) {
      console.error('Please upload both site list and metrics files');
      return;
    }

    if (!executedDateRange.start || !executedDateRange.end || 
        !surroundingDateRange.start || !surroundingDateRange.end) {
      console.error('Please select date ranges for both periods');
      return;
    }

    try {
      setLoading(true);
      const response = await fetchCompareData({
        sites: selectedSites,
        metrics: selectedMetrics,
        dataType,
        executed: {
          start: formatDateForAPI(executedDateRange.start),
          end: formatDateForAPI(executedDateRange.end)
        },
        surrounding: {
          start: formatDateForAPI(surroundingDateRange.start),
          end: formatDateForAPI(surroundingDateRange.end)
        }
      });

      const formattedPreviewData = {
        executed: [],
        surrounding: []
      };

      const firstMetric = selectedMetrics[0];
      if (response[firstMetric]) {
        formattedPreviewData.executed = response[firstMetric].executed.map(item => ({
          DAY: item.DAY,
          ...selectedMetrics.reduce((acc, metric) => ({
            ...acc,
            [metric]: response[metric].executed.find(d => d.DAY === item.DAY)?.value || null
          }), {})
        }));

        formattedPreviewData.surrounding = response[firstMetric].surrounding.map(item => ({
          DAY: item.DAY,
          ...selectedMetrics.reduce((acc, metric) => ({
            ...acc,
            [metric]: response[metric].surrounding.find(d => d.DAY === item.DAY)?.value || null
          }), {})
        }));
      }

      setPreviewData(formattedPreviewData);
      setChartData(prepareComparisonChartData(response));
      
      // Hitung rata-rata untuk setiap metrik
      const report = {};
      Object.entries(response).forEach(([metric, data]) => {
        const beforeAvg = data.surrounding.reduce((sum, item) => sum + item.value, 0) / data.surrounding.length;
        const afterAvg = data.executed.reduce((sum, item) => sum + item.value, 0) / data.executed.length;
        const change = calculateChange(beforeAvg, afterAvg);
        
        report[metric] = {
          before: beforeAvg,
          after: afterAvg,
          change: change,
          status: getStatus(change)
        };
      });

      setAnalysisReport(report);
    } catch (error) {
      console.error('Error fetching comparison data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const prepareComparisonChartData = (data) => {
    return Object.entries(data).map(([metric, periodData]) => {
      // Ambil panjang data terpendek untuk normalisasi
      const minLength = Math.min(
        periodData.executed.length,
        periodData.surrounding.length
      );

      // Normalisasi data agar memiliki panjang yang sama
      const normalizedData = Array.from({ length: minLength }, (_, index) => ({
        day: `Day ${index + 1}`,
        executed: periodData.executed[index]?.value || null,
        surrounding: periodData.surrounding[index]?.value || null,
        actualDate: periodData.executed[index]?.DAY || periodData.surrounding[index]?.DAY
      }));

      return {
        metric,
        chartData: {
          labels: normalizedData.map(d => d.day),
          datasets: [
            {
              label: 'Cell Execute',
              data: normalizedData.map(d => d.executed),
              borderColor: '#4B89DC',
              backgroundColor: '#4B89DC',
              tension: 0.4,
              pointRadius: 2,
              borderWidth: 1.5,
              fill: false
            },
            {
              label: 'Surrounding',
              data: normalizedData.map(d => d.surrounding),
              borderColor: '#E9573F',
              backgroundColor: '#E9573F',
              tension: 0.4,
              pointRadius: 2,
              borderWidth: 1.5,
              fill: false
            }
          ]
        },
        options: {
          devicePixelRatio: 3,
          responsive: true,
          maintainAspectRatio: true,
          animation: false,
          elements: {
            line: {
              tension: 0.4,
              borderWidth: 2
            },
            point: {
              radius: 3,
              hitRadius: 10,
              hoverRadius: 5
            }
          },
          plugins: {
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 10,
                padding: 15,
                font: {
                  size: 10,
                  family: "'Arial', sans-serif"
                },
                usePointStyle: true,
                pointStyle: 'line'
              }
            },
            title: {
              display: true,
              text: metric.toUpperCase(),
              align: 'start',
              font: {
                size: 13,
                weight: '500',
                family: "'Arial', sans-serif"
              },
              padding: {
                bottom: 10
              }
            },
            tooltip: {
              callbacks: {
                title: (tooltipItems) => {
                  const index = tooltipItems[0].dataIndex;
                  return normalizedData[index].actualDate;
                },
                label: (context) => {
                  const label = context.dataset.label;
                  const value = context.parsed.y;
                  return `${label}: ${value?.toFixed(2) || 'N/A'}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              grid: {
                color: '#E5E5E5',
                drawBorder: false,
                lineWidth: 0.5
              },
              ticks: {
                font: {
                  size: 10,
                  family: "'Arial', sans-serif"
                },
                padding: 5
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 10,
                  family: "'Arial', sans-serif"
                }
              }
            }
          },
          layout: {
            padding: {
              left: 10,
              right: 25,
              top: 25,
              bottom: 15
            }
          }
        }
      };
    });
  };

  const downloadReport = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const chartElements = document.querySelectorAll('.chart-section canvas');
      const chartCanvases = [];
      
      // Tingkatkan resolusi
      const originalPixelRatio = window.devicePixelRatio;
      window.devicePixelRatio = 4; // Tingkatkan dari 3 ke 4

      for (const chart of chartElements) {
        const canvas = chart;
        const newCanvas = document.createElement('canvas');
        const newContext = newCanvas.getContext('2d');
        
        // Tingkatkan ukuran canvas
        newCanvas.width = canvas.width * 3;
        newCanvas.height = canvas.height * 3;
        
        newContext.scale(3, 3);
        newContext.drawImage(canvas, 0, 0);
        chartCanvases.push(newCanvas);
      }

      window.devicePixelRatio = originalPixelRatio;

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margins = 15; // Kurangi margin untuk ruang lebih
      const contentWidth = pageWidth - (margins * 2);

      // Cover Page yang lebih profesional dengan gradient baru
      const gradientHeight = pageHeight / 2;
      pdf.setFillColor(25, 47, 96); // Navy blue untuk bagian atas
      pdf.rect(0, 0, pageWidth, gradientHeight, 'F');
      pdf.setFillColor(41, 58, 117); // Navy blue yang lebih terang untuk bagian bawah
      pdf.rect(0, gradientHeight, pageWidth, pageHeight - gradientHeight, 'F');

      // Logo perusahaan (jika ada)
      // pdf.addImage(logoData, 'PNG', margins, 20, 40, 40);

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.text('KPI Analysis Report', pageWidth / 2, pageHeight / 2 - 30, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const reportPeriod = `${formatDateDisplay(executedDateRange.start)} - ${formatDateDisplay(executedDateRange.end)}`;
      pdf.text(`Analysis Period: ${reportPeriod}`, pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

      // Report metadata
      pdf.setFontSize(10);
      pdf.text(`Report ID: RPT-${Date.now().toString().slice(-6)}`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth / 2, pageHeight / 2 + 35, { align: 'center' });

      // Table of Contents
      pdf.addPage();
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Table of Contents', margins, 30);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      let tocY = 50;
      const sections = [
        '1. Analysis Overview',
        '2. Period Comparison',
        '3. KPI Visualizations',
        '4. Performance Analysis'
      ];

      sections.forEach((section, index) => {
        pdf.text(section, margins, tocY + (index * 12));
      });

      // Analysis Overview Page
      pdf.addPage();
      createPageHeader(pdf, 'Analysis Overview', 1);
      let currentY = 50;

      // Analysis Configuration Box
      createSectionBox(pdf, currentY, contentWidth, margins, 80);
      currentY = addConfigurationDetails(pdf, currentY, margins, {
        dataType,
        siteCount: selectedSites.length,
        metricCount: selectedMetrics.length,
        executedRange: executedDateRange,
        surroundingRange: surroundingDateRange
      });

      // Period Comparison Page
      pdf.addPage();
      createPageHeader(pdf, 'Period Comparison', 2);
      currentY = 50;

      // Comparison Summary Box
      if (analysisReport) {
        const summaryStats = calculateSummaryStats(analysisReport);
        createSummaryBox(pdf, currentY, contentWidth, margins, summaryStats);
        currentY += 100;
      }

      // KPI Visualizations Pages
      chartCanvases.forEach((canvas, index) => {
        pdf.addPage();
        if (index === 0) {
          createPageHeader(pdf, 'KPI Visualizations', 3);
        }
        
        currentY = 50;
        
        // Metric Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(selectedMetrics[index], margins, currentY);
        currentY += 10;

        // Chart Container
        pdf.setDrawColor(220, 220, 220);
        pdf.setFillColor(252, 252, 252);
        pdf.roundedRect(margins - 2, currentY - 2, contentWidth + 4, 160, 2, 2, 'FD');

        // Add high-quality chart
        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', margins, currentY, contentWidth, 150, undefined, 'FAST');
        
        // Add metric analysis if available
        if (analysisReport && analysisReport[selectedMetrics[index]]) {
          currentY += 170;
          addMetricAnalysis(pdf, currentY, margins, selectedMetrics[index], analysisReport[selectedMetrics[index]]);
        }
      });

      // Performance Analysis Page
      if (analysisReport) {
        pdf.addPage();
        createPageHeader(pdf, 'Performance Analysis', 4);
        currentY = 50;
        createAnalysisTable(pdf, currentY, contentWidth, margins, analysisReport);
      }

      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 25, pageHeight - 10);
      }

      pdf.save(`KPI_Analysis_Report_${formatDateForAPI(executedDateRange.start)}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
      console.error('Failed to generate report');
    }
  };

  // Helper functions untuk PDF generation
  const createPageHeader = (pdf, title, sectionNumber) => {
    // Gradient header dengan warna yang lebih profesional
    pdf.setFillColor(25, 47, 96); // Warna navy blue yang lebih gelap
    pdf.rect(0, 0, pdf.internal.pageSize.width, 25, 'F');
    
    // Tambahkan garis aksen
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.5);
    pdf.line(15, 23, pdf.internal.pageSize.width - 15, 23);

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${sectionNumber}. ${title}`, 15, 17);
  };

  const createSectionBox = (pdf, y, width, margins, height) => {
    pdf.setDrawColor(220, 220, 220);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margins, y, width, height, 3, 3, 'FD');
  };

  const addConfigurationDetails = (pdf, y, margins, config) => {
    const { dataType, siteCount, metricCount, executedRange, surroundingRange } = config;
    const contentWidth = pdf.internal.pageSize.width - (margins * 2);
    
    // Box utama dengan shadow effect
    pdf.setDrawColor(230, 230, 230);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margins - 1, y - 1, contentWidth + 2, 110, 3, 3, 'FD');
    
    // Header section dengan background yang lebih terang
    pdf.setFillColor(235, 242, 248); // Warna biru muda yang lebih terang
    pdf.rect(margins, y, contentWidth, 25, 'F');
    
    // Title dengan warna yang lebih kontras
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(25, 47, 96); // Menggunakan warna navy blue untuk teks
    pdf.text('Configuration Details', margins + 10, y + 17);

    // Content dengan layout yang lebih rapi
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);

    const details = [
      { label: 'Data Type', value: dataType.charAt(0).toUpperCase() + dataType.slice(1) },
      { label: 'Total Sites', value: `${siteCount} sites` },
      { label: 'Total Metrics', value: `${metricCount} metrics` },
      { label: 'Executed Period', value: `${formatDateDisplay(executedRange.start)} - ${formatDateDisplay(executedRange.end)}` },
      { label: 'Surrounding Period', value: `${formatDateDisplay(surroundingRange.start)} - ${formatDateDisplay(surroundingRange.end)}` }
    ];

    // Add details dengan layout grid
    details.forEach((detail, index) => {
      const yPos = y + 40 + (index * 13);
      
      // Label dengan style
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`${detail.label}:`, margins + 15, yPos);
      
      // Value dengan style berbeda
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.text(detail.value, margins + 100, yPos);
    });

    return y + 120;
  };

  const calculateSummaryStats = (analysisReport) => {
    const stats = {
      totalMetrics: Object.keys(analysisReport).length,
      improved: 0,
      degraded: 0,
      maintained: 0,
      averageChange: 0
    };

    Object.values(analysisReport).forEach(data => {
      if (data.change > 0) stats.improved++;
      else if (data.change < 0) stats.degraded++;
      else stats.maintained++;
      
      stats.averageChange += data.change;
    });

    stats.averageChange = stats.averageChange / stats.totalMetrics;
    return stats;
  };

  const createSummaryBox = (pdf, y, width, margins, stats) => {
    // Box utama dengan shadow effect
    pdf.setDrawColor(230, 230, 230);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(margins - 1, y - 1, width + 2, 120, 3, 3, 'FD');

    // Header section dengan background yang lebih terang
    pdf.setFillColor(235, 242, 248); // Warna biru muda yang lebih terang
    pdf.rect(margins, y, width, 25, 'F');

    // Title dengan warna yang lebih kontras
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(25, 47, 96); // Menggunakan warna navy blue untuk teks
    pdf.text('Performance Overview', margins + 10, y + 17);

    // Content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    const summaryItems = [
      { 
        label: 'Total Metrics Analyzed',
        value: stats.totalMetrics.toString(),
        description: 'Total number of KPIs analyzed'
      },
      { 
        label: 'Improved Metrics',
        value: `${stats.improved} (${((stats.improved/stats.totalMetrics)*100).toFixed(1)}%)`,
        color: '#28a745',
        description: 'KPIs showing positive change'
      },
      { 
        label: 'Degraded Metrics',
        value: `${stats.degraded} (${((stats.degraded/stats.totalMetrics)*100).toFixed(1)}%)`,
        color: '#dc3545',
        description: 'KPIs showing negative change'
      },
      { 
        label: 'Maintained Metrics',
        value: `${stats.maintained} (${((stats.maintained/stats.totalMetrics)*100).toFixed(1)}%)`,
        color: '#ffc107',
        description: 'KPIs with no significant change'
      },
      { 
        label: 'Average Change',
        value: `${stats.averageChange > 0 ? '+' : ''}${stats.averageChange.toFixed(2)}%`,
        color: stats.averageChange >= 0 ? '#28a745' : '#dc3545',
        description: 'Overall performance trend'
      }
    ];

    // Add items dengan layout yang lebih informatif
    summaryItems.forEach((item, index) => {
      const yPos = y + 40 + (index * 15);
      
      // Label
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(item.label + ':', margins + 15, yPos);
      
      // Value dengan warna sesuai status
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(item.color || 60, 60, 60);
      pdf.text(item.value, margins + 140, yPos);
      
      // Description
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128);
      pdf.text(item.description, margins + 220, yPos);
    });

    return y + 130;
  };

  const addMetricAnalysis = (pdf, y, margins, metric, data) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Analysis:', margins, y);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);

    const change = data.change.toFixed(2);
    const direction = data.change > 0 ? 'increased' : 'decreased';
    const analysis = `The ${metric} has ${direction} by ${Math.abs(change)}% from ${data.before.toFixed(2)} to ${data.after.toFixed(2)}.`;
    
    pdf.text(analysis, margins, y + 15);
  };

  const createAnalysisTable = (pdf, y, width, margins, analysisReport) => {
    pdf.setFillColor(52, 152, 219);
    pdf.rect(margins, y, width, 12, 'F');

    // Table header
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);

    const columns = [
      { title: 'Metric', width: width * 0.3 },
      { title: 'Before', width: width * 0.15 },
      { title: 'After', width: width * 0.15 },
      { title: 'Change (%)', width: width * 0.2 },
      { title: 'Status', width: width * 0.2 }
    ];

    let xPos = margins + 5;
    columns.forEach(col => {
      pdf.text(col.title, xPos, y + 8);
      xPos += col.width;
    });

    // Table rows
    pdf.setFont('helvetica', 'normal');
    let currentY = y + 12;

    Object.entries(analysisReport).forEach(([metric, data], index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margins, currentY, width, 10, 'F');
      }

      xPos = margins + 5;
      pdf.setTextColor(60, 60, 60);
      
      // Metric name
      pdf.text(metric, xPos, currentY + 7);
      xPos += columns[0].width;

      // Before value
      pdf.text(data.before.toFixed(2), xPos, currentY + 7);
      xPos += columns[1].width;

      // After value
      pdf.text(data.after.toFixed(2), xPos, currentY + 7);
      xPos += columns[2].width;

      // Change percentage
      const changeColor = data.change >= 0 ? [40, 167, 69] : [220, 53, 69];
      pdf.setTextColor(...changeColor);
      pdf.text(`${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}%`, xPos, currentY + 7);
      xPos += columns[3].width;

      // Status
      const statusColor = getStatusColor(data.status).replace('#', '');
      pdf.setTextColor(
        parseInt(statusColor.substr(0, 2), 16),
        parseInt(statusColor.substr(2, 2), 16),
        parseInt(statusColor.substr(4, 2), 16)
      );
      pdf.text(data.status, xPos, currentY + 7);

      currentY += 10;
    });

    return currentY;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Select Data
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </Box>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Columns</InputLabel>
              <Select
                multiple
                value={selectedColumns}
                onChange={handleColumnChange}
                label="Select Columns"
              >
                {columns.map((column) => (
                  <MenuItem key={column} value={column}>
                    {column}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button 
              variant="contained" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Submit'}
            </Button>
          </Paper>
        </Grid>

        {data.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: 400 }}>
              <DataGrid
                rows={data.map((row, index) => ({ id: index, ...row }))}
                columns={[
                  { field: 'Day', headerName: 'Day', width: 150 },
                  { field: 'Site_ID', headerName: 'Site ID', width: 150 },
                  { field: 'NE_Name', headerName: 'NE Name', width: 150 },
                  ...gridColumns
                ]}
                pageSize={5}
                rowsPerPageOptions={[5]}
              />
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ColumnQuery; 