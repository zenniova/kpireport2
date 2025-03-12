const mongoose = require('mongoose');

const NetworkMetricsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true
    },
    siteId: {
        type: String,
        required: true
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
        required: true
    },
    metrics: {
        availability: {
            beyondSR: Number  // AVAILABILITY_BEYOND_SR(%)
        },
        users: {
            totalAvg: Number,     // Total Avg User
            totalMax: Number,     // Total Max User
            avgBH: Number,        // AVERAGE_USER_BH
            maxBH: Number,        // MAX_USER_BH
            activeUserAvgBH: Number,  // L Traffic ActiveUser Avg_BH
            activeUserMaxBH: Number   // L Traffic ActiveUser Max_BH
        },
        traffic: {
            uplink: {
                volume: Number,       // Uplink_Traffic_Volume(MB)
                utilization: Number   // PRB_UL_UTIL_BH(%)
            },
            downlink: {
                volume: Number,       // Downlink_Traffic_Volume(MB)
                utilization: Number   // PRB_DL_UTIL_BH(%)
            }
        },
        performance: {
            callSetupSuccessRate: Number,    // Call Setup Success Rate (%)
            rrcSuccessRate: Number,          // RRC Success Rate (%)
            erabSuccessRate: Number,         // ERAB Success Rate (%)
            s1SignalinkSR: Number,          // S1 SIGNALINK SR (%)
            servicesDropRate: Number         // SERVICES DROP RATE (%)
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('NetworkMetrics', NetworkMetricsSchema); 