const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err) => {
    if (err) {
        console.error('Buset, gagal konek ke database:', err.stack);
    } else {
        console.log('Mantap! Berhasil konek ke PostgreSQL.');
    }
});

module.exports = pool; // Baris ini WAJIB ada agar bisa dipanggil controller