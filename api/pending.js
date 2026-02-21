const { setCorsHeaders } = require('../lib/utils');

/**
 * GET /api/pending
 * → Bot poll endpoint: lấy callbacks chưa xử lý
 */
module.exports = async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

    if (!global.__cardCallbacks) global.__cardCallbacks = [];

    const pending = global.__cardCallbacks.filter(c => c.processed === false);

    return res.status(200).json({
        success: true,
        count: pending.length,
        callbacks: pending,
    });
};
