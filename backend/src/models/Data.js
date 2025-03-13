class Data {
    constructor(data) {
        this.date = data.date;
        this.siteId = data.siteId;
        this.cellName = data.cellName;
    }

    toSQL() {
        return {
            date: this.date,
            site_id: this.siteId,
            cell_name: this.cellName
        };
    }

    static async findAll(pool, query = '') {
        try {
            const result = await pool.request()
                .query(`SELECT * FROM [4G cell daily Beyond] ${query}`);
            return result.recordset;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Data; 