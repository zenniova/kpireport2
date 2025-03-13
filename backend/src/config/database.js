const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    server: process.env.DB_SERVER || 'ZENNI',
    database: process.env.DB_NAME || 'daily_kpi_performance',
    user: process.env.DB_USER || 'zenni',
    password: process.env.DB_PASSWORD || '#ICTelkomJabar1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS',
        port: parseInt(process.env.DB_PORT || '1433')
    }
};

let pool = null;

async function connectToDatabase() {
    try {
        if (pool) {
            return pool;
        }
        
        console.log('Attempting to connect with config:', {
            server: config.server,
            database: config.database,
            user: config.user,
            instanceName: config.options.instanceName,
            port: config.options.port
        });
        
        pool = await new sql.ConnectionPool(config).connect();
        console.log('✅ Connected to database successfully');
        return pool;
    } catch (err) {
        console.error('❌ Database Connection Failed:', err);
        throw err;
    }
}

module.exports = {
    connectToDatabase,
    sql,
    getPool: () => pool
};
