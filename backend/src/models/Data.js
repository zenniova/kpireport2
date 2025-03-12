const mongoose = require('mongoose');

const DataSchema = new mongoose.Schema({
    // Basic Cell Information
    day: {
        type: Date,
        required: true,
        index: true
    },
    siteId: {
        type: String,
        required: true,
        index: true
    },
    neName: {
        type: String,
        required: true
    },
    eNodeBID: {
        type: Number,
        required: true
    },
    cellId: {
        type: Number,
        required: true
    },
    cellName: {
        type: String,
        required: true,
        index: true
    },

    // Key Performance Indicators
    kpi: {
        availability: {
            beyondSR: Number,              // AVAILABILITY_BEYOND_SR(%)
            cellAvailDuration: Number,     // L Cell Avail Dur (s)
            cellUnavailDuration: {
                system: Number,            // L Cell Unavail Dur Sys (s)
                energySaving: Number,      // L Cell Unavail Dur EnergySaving (s)
                manual: Number             // L Cell Unavail Dur Manual (s)
            }
        },
        users: {
            total: {
                avg: Number,               // Total Avg User
                max: Number                // Total Max User
            },
            busyHour: {
                avg: Number,               // AVERAGE_USER_BH
                max: Number,               // MAX_USER_BH
                activeAvg: Number,         // L Traffic ActiveUser Avg_BH
                activeMax: Number          // L Traffic ActiveUser Max_BH
            }
        },
        traffic: {
            uplink: {
                volume: Number,            // Uplink_Traffic_Volume(MB)
                utilization: Number,       // PRB_UL_UTIL_BH(%)
                throughput: {
                    mean: Number,          // MEAN_CELL_UL_THR (Mbps)
                    userMean: Number       // MEAN_USER_UL_THR (Mbps)
                }
            },
            downlink: {
                volume: Number,            // Downlink_Traffic_Volume(MB)
                utilization: Number,       // PRB_DL_UTIL_BH(%)
                throughput: {
                    mean: Number,          // MEAN_CELL_DL_THR (Mbps)
                    userMean: Number       // MEAN_USER_DL_THR (Mbps)
                }
            }
        },
        performance: {
            success: {
                callSetup: Number,         // Call Setup Success Rate (%)
                rrc: Number,               // RRC Success Rate (%)
                erab: Number,              // ERAB Success Rate (%)
                s1Signalink: Number,       // S1 SIGNALINK SR (%)
                intraFHO: Number,          // INTRA FHO SR (%)
                csfb: Number               // CSFB SR (%)
            },
            drop: {
                services: Number,          // SERVICES DROP RATE (%)
                transmission: Number       // SERVICES DROP RATE TRANSMISSION (%)
            }
        },
        radio: {
            pdcch: {
                usage: Number,             // PDCCH_USAGE (%)
                agg8: Number              // PDCCH_AGG8 (%)
            },
            pusch: {
                utilization: Number        // PUSCH_UTIL (%)
            },
            rank2Distribution: Number      // RANK2 DISTRIBUTION (%)
        }
    },

    // Raw Counters
    counters: {
        rrc: {
            num: Number,                   // RRC_NUM
            den: Number                    // RRC_DEN
        },
        erab: {
            setup: {
                num: Number,               // ERAB_SETUP_NUM
                den: Number                // ERAB_SETUP_DENUM
            }
        },
        s1: {
            signal: {
                num: Number,               // S1_SIG_NUM
                den: Number                // S1_SIG_DENUM
            }
        },
        prb: {
            uplink: {
                num: Number,               // PRB_UL_NUM
                den: Number                // PRB_UL_DEN
            },
            downlink: {
                num: Number,               // PRB_DL_NUM
                den: Number                // PRB_DL_DEN
            }
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for common queries
DataSchema.index({ 'day': 1, 'siteId': 1 });
DataSchema.index({ 'day': 1, 'cellName': 1 });
DataSchema.index({ 'kpi.availability.beyondSR': 1 });
DataSchema.index({ 'kpi.performance.success.callSetup': 1 });

// Virtual for cell full identifier
DataSchema.virtual('cellIdentifier').get(function() {
    return `${this.siteId}_${this.cellId}`;
});

// Method to get KPI summary
DataSchema.methods.getKPISummary = function() {
    return {
        availability: this.kpi.availability.beyondSR,
        callSetupSuccess: this.kpi.performance.success.callSetup,
        trafficVolume: {
            uplink: this.kpi.traffic.uplink.volume,
            downlink: this.kpi.traffic.downlink.volume
        },
        users: {
            average: this.kpi.users.total.avg,
            maximum: this.kpi.users.total.max
        }
    };
};

module.exports = mongoose.model('Data', DataSchema); 