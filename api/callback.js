const { setCorsHeaders, parseBody } = require('../lib/utils');

if (!global.__cardCallbacks) {
    global.__cardCallbacks = [];
}
const MAX_CALLBACKS = 500;

module.exports = async function handler(req, res) {
    setCorsHeaders(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const payload = req.method === 'GET' ? req.query : parseBody(req);
    const action = payload.action || ''; 

    // ========== 1. PENDING (Bot gọi để lấy thẻ) ==========
    if (req.method === 'GET' && action === 'pending') {
        const pending = global.__cardCallbacks.filter(c => c.processed === false);
        return res.status(200).json({ success: true, count: pending.length, callbacks: pending });
    }

    // ========== 2. ACK (Bot gọi để đánh dấu đã cộng tiền) ==========
    if (req.method === 'POST' && action === 'ack') {
        let ids = [];
        if (payload.ids && Array.isArray(payload.ids)) ids = payload.ids;
        else if (payload.id) ids = [payload.id];
        else return res.status(400).json({ error: 'Thiếu id hoặc ids' });

        let processed = 0;
        const now = new Date().toISOString();
        for (const cbId of ids) {
            const cb = global.__cardCallbacks.find(c => c.id === cbId && !c.processed);
            if (cb) {
                cb.processed = true;
                cb.processed_at = now;
                processed++;
            }
        }
        return res.status(200).json({ success: true, processed });
    }

    // ========== 3. DASHBOARD (Lấy lịch sử xem Web) ==========
    if (req.method === 'GET' && !payload.request_id && !payload.status) {
        return res.status(200).json({
            success: true,
            total: global.__cardCallbacks.length,
            pending: global.__cardCallbacks.filter(c => c.processed === false).length,
            logs: global.__cardCallbacks.slice(-100).reverse(),
        });
    }

    // ========== 4. NHẬN CALLBACK TỪ GACHTHEFAST ==========
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log(`[CALLBACK LOG] Received (${req.method}):`, JSON.stringify(payload));

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
