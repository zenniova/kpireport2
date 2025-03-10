import React, { useState } from 'react';
import './ExportDialog.css';
import { FaFileExcel, FaFileCsv, FaFileArchive, FaTimes } from 'react-icons/fa';

const ExportDialog = ({ isOpen, onClose, onExport, defaultFileName }) => {
  const [fileName, setFileName] = useState(defaultFileName);

  if (!isOpen) return null;

  const handleSubmit = (type) => {
    onExport(type, fileName);
    onClose();
  };

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        <div className="export-dialog-header">
          <h3>Export Data</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="export-dialog-content">
          <div className="filename-input">
            <label htmlFor="filename">File Name:</label>
            <input
              type="text"
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
            />
          </div>
          <div className="export-options">
            <button 
              className="export-option excel"
              onClick={() => handleSubmit('excel')}
            >
              <FaFileExcel />
              <span>Excel (.xlsx)</span>
            </button>
            <button 
              className="export-option csv"
              onClick={() => handleSubmit('csv')}
            >
              <FaFileCsv />
              <span>CSV (.csv)</span>
            </button>
            <button 
              className="export-option zip"
              onClick={() => handleSubmit('zip')}
            >
              <FaFileArchive />
              <span>All Formats (.zip)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog; 