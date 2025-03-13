const { ERROR_MESSAGES } = require('../constants');

const validateDateRange = (req, res, next) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: 'Start date and end date are required'
        });
    }
    next();
};

const validateSiteIds = (req, res, next) => {
    const { siteIds } = req.body;
    if (!siteIds || !Array.isArray(siteIds) || siteIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid site IDs array is required'
        });
    }
    next();
};

module.exports = {
    validateDateRange,
    validateSiteIds
}; 