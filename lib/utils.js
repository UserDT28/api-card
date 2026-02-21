function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseBody(req) {
    return req.body || {};
}

function formatVND(amount) {
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

module.exports = {
    setCorsHeaders,
    parseBody,
    formatVND,
};
