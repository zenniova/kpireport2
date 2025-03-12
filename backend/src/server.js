require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const dataRoutes = require('./routes/dataRoutes');
const cleanupUploads = require('./services/cleanupService');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Test routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  res.json({ 
    status: 'success',
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Main routes
app.use('/api/data', dataRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Jalankan cleanup setiap jam
setInterval(cleanupUploads, 60 * 60 * 1000); // Setiap 1 jam

// Jalankan cleanup saat server start
cleanupUploads();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test the API at http://localhost:${PORT}/`);
  console.log(`Test endpoint at http://localhost:${PORT}/test`);
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
}); 