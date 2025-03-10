import axios from 'axios';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import config from '../config/config';

const API_URL = 'http://localhost:3000/api';

// Create axios instance with config
const axiosInstance = axios.create({
  baseURL: config.API_URL,
  timeout: 30000, // 30 seconds
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024 // 50MB
});

export const fetchColumns = async () => {
  try {
    const response = await axios.get(`${API_URL}/columns`);
    return response.data;
  } catch (error) {
    console.error('Error fetching columns:', error);
    throw error;
  }
};

export const fetchData = async (params) => {
  try {
    const response = await axios.post(`${API_URL}/data`, params);
    return response.data;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
};

export const processData = async (formData) => {
  try {
    const response = await axiosInstance.post('/process-data', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error processing data:', error);
    throw error;
  }
};

export const fetchDateRange = async () => {
  try {
    const response = await axios.get(`${API_URL}/date-range`);
    return response.data;
  } catch (error) {
    console.error('Error fetching date range:', error);
    throw error;
  }
};

export const exportToExcel = (data, columns, filename = 'data') => {
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: columns
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `${filename}.xlsx`);
};

export const exportToCSV = (data, columns, filename = 'data') => {
  const csvContent = [
    columns.join(','),
    ...data.map(row => columns.map(col => `"${row[col] || ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

export const exportToZip = async (data, columns, filename = 'data') => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  // Add Excel file
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns });
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  zip.file(`${filename}.xlsx`, excelBuffer);

  // Add CSV file
  const csvContent = [
    columns.join(','),
    ...data.map(row => columns.map(col => `"${row[col] || ''}"`).join(','))
  ].join('\n');
  zip.file(`${filename}.csv`, csvContent);

  // Generate zip file
  const zipContent = await zip.generateAsync({ type: 'blob' });
  saveAs(zipContent, `${filename}.zip`);
};

export const processFiles = async (formData) => {
  try {
    const response = await axiosInstance.post('/process-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error processing files:', error);
    throw error;
  }
};

export const processSiteFile = async (formData) => {
  try {
    const response = await axiosInstance.post('/site-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error processing site file:', error);
    throw error;
  }
};

export const processMetricsFile = async (formData) => {
  try {
    const response = await axiosInstance.post('/metrics-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error processing metrics file:', error);
    throw error;
  }
};

export const fetchCompareData = async (params) => {
  try {
    const response = await axiosInstance.post('/compare-data', params);
    return response.data;
  } catch (error) {
    console.error('Error fetching comparison data:', error);
    throw error;
  }
}; 