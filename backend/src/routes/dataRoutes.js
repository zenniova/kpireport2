const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dataController = require('../controllers/dataController');

// Konfigurasi multer dengan batasan ukuran file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads/'))
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Route to get all column names
router.get('/columns', dataController.getColumns);

// Route to get data for selected columns
router.post('/data', dataController.getData);

// Main route
router.post('/process-data', 
  upload.single('file'),
  (req, res, next) => {
    console.log('File received:', req.file);
    next();
  },
  dataController.processData
);

// Add new route for date range
router.get('/date-range', dataController.getDateRange);

router.post('/site-file', upload.single('siteFile'), dataController.processSiteFile);
router.post('/metrics-file', upload.single('metricsFile'), dataController.processMetricsFile);
router.post('/compare-data', dataController.getComparisonData);

module.exports = router; 