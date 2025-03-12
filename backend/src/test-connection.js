const { sql, poolPromise } = require('./config/database');

async function testConnection() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT @@version');
        console.log('SQL Server Version:', result.recordset[0]);
    } catch (err) {
        console.error('Error:', err);
    }
}

testConnection(); 