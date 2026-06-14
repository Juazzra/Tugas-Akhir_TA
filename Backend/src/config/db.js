const { Pool } = require('pg');
require('dotenv').config();

const isLocalDb = !process.env.DATABASE_URL || 
                  process.env.DATABASE_URL.includes('localhost') || 
                  process.env.DATABASE_URL.includes('127.0.0.1') || 
                  process.env.DB_SSL === 'false';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // WAJIB ADA untuk Supabase/Cloud DB, dinonaktifkan jika database lokal
    ssl: isLocalDb ? false : {
        rejectUnauthorized: false
    }
});

// Tambahkan baris ini buat ngecek:
console.log('Cek URL:', process.env.DATABASE_URL ? 'URL Terdeteksi' : 'URL KOSONG');

pool.connect((err) => {
    if (err) {
        console.error('Buset, gagal konek ke database:', err.stack);
    } else {
        console.log(isLocalDb ? 'Mantap! Berhasil konek ke Local PostgreSQL.' : 'Mantap! Berhasil konek ke Supabase PostgreSQL.');
    }
});

module.exports = pool;