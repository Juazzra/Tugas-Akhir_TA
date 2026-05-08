const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    // Ganti 5 baris jadi 1 baris URL ini:
    connectionString: process.env.DATABASE_URL,
    
    // WAJIB DITAMBAHKAN UNTUK SUPABASE / CLOUD DB:
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err) => {
    if (err) {
        console.error('Buset, gagal konek ke database:', err.stack);
    } else {
        console.log('Mantap! Berhasil konek ke Supabase PostgreSQL.');
    }
});

module.exports = pool;