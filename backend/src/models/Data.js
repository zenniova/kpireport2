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
}

module.exports = Data; 