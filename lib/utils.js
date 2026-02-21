/**
 * Utility helpers cho Vercel Card API
 * Vercel chỉ nhận callback + hiển thị, không cần crypto/signing
 */

/**
 * CORS headers
 */
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Parse body (Hỗ trợ cả JSON và URL-encoded từ Gachthefast)
 */
function parseBody(req) {
    if (!req.body) return {};

    // Nếu req.body đã là object (được Vercel parse sẵn JSON)
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        return req.body;
    }

    // Nếu Gachthefast gửi x-www-form-urlencoded, req.body có thể là string
    try {
        const bodyStr = req.body.toString();
        // Thử parse JSON trước
        if (bodyStr.startsWith('{')) {
            return JSON.parse(bodyStr);
        }

        // Parse dạng Form URL-encoded (status=1&request_id=...)
        const parsed = {};
        const params = new URLSearchParams(bodyStr);
        for (const [key, value] of params.entries()) {
            parsed[key] = value;
        }
        return parsed;
    } catch (err) {
        console.error('Lỗi parse body:', err);
        return {};
    }
}

/**
 * Format số tiền VND
 */
function formatVND(amount) {
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

module.exports = {
    setCorsHeaders,
    parseBody,
    formatVND,
};
