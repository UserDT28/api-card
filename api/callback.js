const { setCorsHeaders, parseBody } = require('../lib/utils');

// Global storage (persist giữa các request trong cùng instance)
if (!global.__cardCallbacks) {
    global.__cardCallbacks = [];
}
const MAX_CALLBACKS = 500;

module.exports = async function handler(req, res) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    // ========== Lấy payload từ GET query hoặc POST body ==========
    const payload = req.method === 'GET' ? req.query : parseBody(req);

    // ========== GET: Dashboard lấy logs (nếu không có request_id) ==========
    if (req.method === 'GET' && !payload.request_id && !payload.status) {
        return res.status(200).json({
            success: true,
            total: global.__cardCallbacks.length,
            pending: global.__cardCallbacks.filter(c => c.processed === false).length,
            logs: global.__cardCallbacks.slice(-100).reverse(),
        });
    }

    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log(`[CALLBACK] Received (${req.method}):`, JSON.stringify(payload));

        const entry = {
            id: `cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: new Date().toISOString(),
            processed: false,
            processed_at: null,
            status: Number(payload.status) || 0,
            message: payload.message || '',
            request_id: payload.request_id || '',
            trans_id: payload.trans_id || '',
            telco: payload.telco || '',
            code: payload.code || '',
            serial: payload.serial || '',
            declared_value: Number(payload.declared_value) || 0,
            value: Number(payload.value) || 0,
            amount: Number(payload.amount) || 0,
            callback_sign: payload.callback_sign || '',
            raw: payload,
        };

        global.__cardCallbacks.push(entry);

        if (global.__cardCallbacks.length > MAX_CALLBACKS) {
            const oldProcessed = global.__cardCallbacks.filter(c => c.processed);
            if (oldProcessed.length > 100) {
                let removed = 0;
                const toRemove = oldProcessed.length - 100;
                global.__cardCallbacks = global.__cardCallbacks.filter(c => {
                    if (c.processed && removed < toRemove) { removed++; return false; }
                    return true;
                });
            }
        }
        return res.status(200).json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
