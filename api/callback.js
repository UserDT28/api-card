const { setCorsHeaders, parseBody } = require('../lib/utils');

/**
 * POST /api/callback
 * → Nhận callback từ hệ thống card khi thẻ xử lý xong
 *   Chỉ lưu lại data, Bot sẽ poll lấy sau
 * 
 * GET /api/callback
 * → Lấy tất cả callback logs (cho dashboard)
 */

// Global storage (persist giữa các request trong cùng instance)
if (!global.__cardCallbacks) {
    global.__cardCallbacks = [];
}

const MAX_CALLBACKS = 500;

module.exports = async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') return res.status(200).end();

    // ========== GET: Dashboard lấy logs ==========
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            total: global.__cardCallbacks.length,
            pending: global.__cardCallbacks.filter(c => c.processed === false).length,
            logs: global.__cardCallbacks.slice(-100).reverse(),
        });
    }

    // ========== POST: Nhận callback từ hệ thống card ==========
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = parseBody(req);

        console.log('[CALLBACK] Received:', JSON.stringify(body));

        // Lưu toàn bộ data callback
        const entry = {
            id: `cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: new Date().toISOString(),
            processed: false,
            processed_at: null,

            // Lưu toàn bộ data từ hệ thống card
            status: Number(body.status) || 0,
            message: body.message || '',
            request_id: body.request_id || '',
            trans_id: body.trans_id || '',
            telco: body.telco || '',
            code: body.code || '',
            serial: body.serial || '',
            declared_value: Number(body.declared_value) || 0,
            value: Number(body.value) || 0,
            amount: Number(body.amount) || 0,
            callback_sign: body.callback_sign || '',

            // Lưu raw để debug
            raw: body,
        };

        global.__cardCallbacks.push(entry);

        // Dọn dẹp entries cũ đã processed
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

        console.log(`[CALLBACK] Saved: ${entry.id} | Pending: ${global.__cardCallbacks.filter(c => !c.processed).length}`);

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[CALLBACK ERROR]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
