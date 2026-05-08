const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // WAJIB ADA untuk Supabase/Cloud DB
    ssl: {
        rejectUnauthorized: false
    }
});

// Tambahkan baris ini buat ngecek:
console.log('Cek URL:', process.env.DATABASE_URL ? 'URL Terdeteksi' : 'URL KOSONG');

pool.connect((err) => {
    if (err) {
        console.error('Buset, gagal konek ke database Supabase:', err.stack);
    } else {
        console.log('Mantap! Berhasil konek ke Supabase PostgreSQL.');
    }
});

module.exports = pool;