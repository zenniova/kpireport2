const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,     // IP PC lokal Anda
  port: process.env.DB_PORT,     // Port MySQL default 3306
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Tambahkan timeout yang lebih lama untuk koneksi remote
  connectTimeout: 60000
};

// Tambahkan SSL untuk production
if (process.env.NODE_ENV === 'production') {
  dbConfig.ssl = {
    rejectUnauthorized: false
  };
}

// Log konfigurasi (tanpa password)
console.log('Database configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database
});

const pool = mysql.createPool(dbConfig);

// Test connection immediately
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err);
    return false;
  }
};

// Execute test
testConnection();

module.exports = pool; 