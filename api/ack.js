const { setCorsHeaders, parseBody } = require('../lib/utils');

/**
 * POST /api/ack
 * → Bot gọi để đánh dấu callback đã xử lý
 * Body: { ids: ["cb_xxx"] } hoặc { id: "cb_xxx" }
 */
module.exports = async function handler(req, res) {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

    try {
        const body = parseBody(req);

        let ids = [];
        if (body.ids && Array.isArray(body.ids)) ids = body.ids;
        else if (body.id) ids = [body.id];
        else return res.status(400).json({ error: 'Thiếu id hoặc ids' });

        if (!global.__cardCallbacks) global.__cardCallbacks = [];

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
    } catch (err) {
        console.error('[ACK ERROR]', err.message);
        return res.status(500).json({ error: err.message });
    }
};
