const { setCorsHeaders } = require('../lib/utils');

/**
 * GET /api/status
 * Health check endpoint
 */
module.exports = async function handler(req, res) {
    setCorsHeaders(res);

    return res.status(200).json({
        status: 'ok',
        service: 'Card API Intermediary',
        time: new Date().toISOString(),
        configured: !!(process.env.PARTNER_ID && process.env.PARTNER_KEY && process.env.API_DOMAIN),
    });
};
