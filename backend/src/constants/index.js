module.exports = {
    DATABASE: {
        TABLE_NAMES: {
            KPI_DATA: '[4G cell daily Beyond]'
        },
        COLUMNS: {
            BASIC: [
                'Day',
                'Site_ID',
                'NE_Name',
                'eNodeBID',
                'Cell_Id',
                'Cellname',
                'AVAILABILITY_BEYOND_SR',
                'Total_Avg_User',
                'Total_Max_User',
                'AVERAGE_USER_BH',
                'MAX_USER_BH'
            ],
            TRAFFIC: [
                'Uplink_Traffic_Volume(MB)',
                'Downlink_Traffic_Volume(MB)',
                'MEAN_CELL_UL_THR (Mbps)',
                'MEAN_CELL_DL_THR (Mbps)',
                'MEAN_USER_UL_THR (Mbps)',
                'MEAN_USER_DL_THR (Mbps)'
            ],
            PERFORMANCE: [
                'Call Setup Success Rate (%)',
                'RRC Success Rate (%)',
                'ERAB Success Rate (%)',
                'S1 SIGNALINK SR (%)',
                'SERVICES DROP RATE (%)'
            ]
        }
    },
    ERROR_MESSAGES: {
        DB_CONNECTION_FAILED: 'Database connection failed',
        INTERNAL_SERVER_ERROR: 'Internal server error',
        INVALID_REQUEST: 'Invalid request'
    },
    SUCCESS_MESSAGES: {
        DB_CONNECTED: 'Connected to database successfully',
        SERVER_STARTED: 'Server is running on port'
    },
    QUERY_TEMPLATES: {
        SELECT_ALL: `
            SELECT *
            FROM [4G cell daily Beyond]
            WHERE Site_ID IN (@siteIds)
            AND Day BETWEEN @startDate AND @endDate
        `,
        SELECT_METRICS: `
            SELECT Day, Site_ID, NE_Name, 
                   AVAILABILITY_BEYOND_SR,
                   [Total Avg User], [Total Max User],
                   [MEAN_CELL_UL_THR (Mbps)], [MEAN_CELL_DL_THR (Mbps)]
            FROM [4G cell daily Beyond]
            WHERE Site_ID IN (@siteIds)
            AND Day BETWEEN @startDate AND @endDate
        `
    }
}; 