const sql = require('mssql');

const config = {
    server: 'ZENNI',
    database: 'daily_kpi_performance',
    user: 'zenni',
    password: '#ICTelkomJabar1',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS',
        port: 1433
    }
};

async function testConnection() {
    try {
        console.log('Testing connection with config:', {
            server: config.server,
            database: config.database,
            user: config.user,
            instanceName: config.options.instanceName,
            port: config.options.port
        });

        const pool = await sql.connect(config);
        
        // Test query
        const result = await pool.request()
            .query('SELECT @@VERSION as version');
        
        console.log('SQL Server Version:', result.recordset[0].version);
        console.log('Connection successful!');

        // Close connection
        await sql.close();
        console.log('Connection closed');
    } catch (err) {
        console.error('Error:', err);
    }
}

testConnection(); 