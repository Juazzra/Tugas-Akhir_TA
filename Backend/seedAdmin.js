const bcrypt = require('bcrypt');
require('dotenv').config(); // Untuk membaca .env jika ada
const pool = require('./src/config/db'); // Sesuaikan path jika berbeda

async function createSuperAdmin() {
    try {
        console.log('Memulai pembuatan Super Admin pertama...');

        // Cek apakah tabel users sudah ada isinya
        const checkUsers = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(checkUsers.rows[0].count) > 0) {
            console.log('Batal: Database sudah memiliki user. Gunakan API untuk menambah user baru.');
            process.exit(0);
        }

        // Enkripsi PIN Default (misal: 123456)
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash('123456', salt);

        // Masukkan Super Admin ke database
        // (Kita biarkan departemen_id kosong/null dulu agar aman)
        const query = `
            INSERT INTO users (nik, pin, nama, tipe_karyawan, role) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING nik, nama, role
        `;
        const values = ['ADMIN001', hashedPin, 'Super Admin Pabrik', 'tetap', 'admin'];

        const result = await pool.query(query, values);
        
        console.log('✅ Berhasil! Super Admin telah dibuat:');
        console.log(result.rows[0]);
        console.log('Silakan login di aplikasi menggunakan NIK: ADMIN001 dan PIN: 123456');

    } catch (err) {
        console.error('❌ Gagal membuat Super Admin:', err.message);
    } finally {
        // Wajib menutup koneksi setelah selesai agar script bisa berhenti
        pool.end(); 
    }
}

createSuperAdmin();