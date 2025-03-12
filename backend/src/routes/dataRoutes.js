const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const dataController = require('../controllers/dataController');
const upload = require('../middleware/upload');

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'))
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`)
    }
});

const uploadMulter = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
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
router.post('/process-data', uploadMulter.single('file'), dataController.processData);

// Add new route for date range
router.get('/date-range', dataController.getDateRange);

router.post('/site-file', uploadMulter.single('siteFile'), dataController.processSiteFile);
router.post('/metrics-file', uploadMulter.single('metricsFile'), dataController.processMetricsFile);
router.post('/compare-data', dataController.getComparisonData);

// Get routes
router.get('/metrics', dataController.getNetworkMetrics);

// Post routes
router.post('/upload', uploadMulter.single('file'), dataController.processData);
router.post('/network-data', dataController.processNetworkData);

module.exports = router; 