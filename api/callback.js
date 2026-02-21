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

    const payload = req.method === 'GET' ? req.query : parseBody(req);
    const action = payload.action || ''; // '?action=pending' hoặc '?action=ack'

    // ========== 1. API: PENDING (Bot gọi để lấy thẻ chưa xử lý) ==========
    if (req.method === 'GET' && action === 'pending') {
        const pending = global.__cardCallbacks.filter(c => c.processed === false);
        return res.status(200).json({
            success: true,
            count: pending.length,
            callbacks: pending,
        });
    }

    // ========== 2. API: ACK (Bot gọi để đánh dấu đã cộng tiền) ==========
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

    // ========== 3. API: DASHBOARD (Trang chủ lấy logs xem lịch sử) ==========
    if (req.method === 'GET' && !payload.request_id && !payload.status) {
        return res.status(200).json({
            success: true,
            total: global.__cardCallbacks.length,
            pending: global.__cardCallbacks.filter(c => c.processed === false).length,
            logs: global.__cardCallbacks.slice(-100).reverse(),
        });
    }

    // ========== 4. API: NHẬN CALLBACK TỪ GACHTHEFAST ==========
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log(`[CALLBACK LOG] Received (${req.method}):`, JSON.stringify(payload));

        // CHẶN REQUEST ẢO/RÁC TỪ CÁC TOOL SCAN VÀ BOT PING TỰ ĐỘNG
        if (!payload.request_id && !payload.callback_sign) {
            console.log(`[CALLBACK LOG] Đã bỏ qua request rác không có chữ ký.`);
            return res.status(200).json({ success: true, message: 'Ignored invalid request' });
        }

        // Lưu toàn bộ data callback
        const entry = {
            id: `cb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            timestamp: new Date().toISOString(),
            processed: false,
            processed_at: null,

            // Lưu toàn bộ data từ hệ thống card
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

            // Lưu raw để debug
            raw: payload,
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

        console.log(`[CALLBACK LOG] Saved: ${entry.id} | Pending: ${global.__cardCallbacks.filter(c => !c.processed).length}`);

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('[CALLBACK ERROR]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
