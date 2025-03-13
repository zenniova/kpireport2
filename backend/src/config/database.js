const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    server: 'DESKTOP-77H468P',
    database: 'daily_kpi_performance',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        trustedConnection: true,
        integratedSecurity: true
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
            authentication: 'Windows Authentication'
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
