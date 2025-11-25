const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecoalerta_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Monitoramento de erros fatais em conexões ociosas no pool
pool.on('error', (err) => {
    console.error('[DB Connection Error]', err.code, err.message);
});

module.exports = pool;