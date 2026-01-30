const cors = require('cors');

const corsOptions = {
  // IMPORTANT: When using credentials (cookies), origin CANNOT be '*'
  // If CORS_ORIGIN is set (comma-separated list), use that; otherwise reflect the request origin.
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true, // 'true' tells cors to echo back the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(corsOptions);
