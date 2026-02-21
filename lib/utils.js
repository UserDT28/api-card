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
 * Parse body
 */
function parseBody(req) {
    return req.body || {};
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
