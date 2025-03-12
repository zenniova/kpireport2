const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    server: process.env.DB_HOST,     // Gunakan DB_HOST sebagai server
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
    options: {
        encrypt: false,              // Untuk koneksi lokal
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS'   // Jika menggunakan SQL Express
    }
};

console.log('Database Config:', {
    server: dbConfig.server,
    database: dbConfig.database,
    user: dbConfig.user,
    port: dbConfig.port
});

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('Connected to MSSQL');
        return pool;
    })
    .catch(err => {
        console.log('Database Connection Failed! Bad Config:', err);
        console.log('Connection details:', {
            server: dbConfig.server,
            database: dbConfig.database,
            user: dbConfig.user,
            port: dbConfig.port
        });
        return err;
    });

module.exports = {
    sql,
    poolPromise
}; 