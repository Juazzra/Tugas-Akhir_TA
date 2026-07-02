const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const storage = require('../utils/storage');

// ==========================================
// REGISTER KARYAWAN / ADMIN
// ==========================================
exports.register = async (req, res) => {
    try {
        const { nik, pin, nama, departemen_id, nama_leader, tipe_karyawan, role } = req.body;

        // 1. Validasi Kehadiran Input
        if (!nik || !pin || !nama || !role) {
            return res.status(400).json({ message: 'NIK, PIN, Nama, dan Role wajib diisi!' });
        }

        const cleanNik = String(nik).trim();
        const cleanNama = String(nama).trim();
        const cleanPin = String(pin).trim();
        const cleanRole = String(role).trim();

        if (cleanNik === '' || cleanNama === '' || cleanPin === '' || cleanRole === '') {
            return res.status(400).json({ message: 'Input tidak boleh kosong atau hanya berisi spasi!' });
        }

        // 2. Validasi Format PIN (Wajib angka dan tepat 6 digit)
        if (!/^\d{6}$/.test(cleanPin)) {
            return res.status(400).json({ message: 'PIN harus berupa angka dan tepat 6 digit (contoh: 123456)!' });
        }

        // Cek apakah NIK sudah terdaftar
        const userExist = await pool.query('SELECT * FROM users WHERE nik = $1', [cleanNik]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'NIK sudah terdaftar!' });
        }

        // Hash PIN
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(cleanPin, salt);

        // Masukkan data ke database
        const newUser = await pool.query(
            `INSERT INTO users (nik, pin, nama, departemen_id, nama_leader, tipe_karyawan, role) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nik, nama, role`,
            [cleanNik, hashedPin, cleanNama, departemen_id || null, nama_leader || null, tipe_karyawan || 'tetap', cleanRole]
        );

        res.status(201).json({
            message: 'Registrasi berhasil!',
            user: newUser.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        // Tangkap error Foreign Key Constraint (Departemen tidak valid)
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Departemen ID yang dipilih tidak valid!' });
        }
        res.status(500).json({ message: 'Server error saat melakukan registrasi' });
    }
};

// ==========================================
// LOGIN KARYAWAN / ADMIN
// ==========================================
exports.login = async (req, res) => {
    try {
        const { nik, pin } = req.body;

        // 1. Validasi Kehadiran Input
        if (!nik || !pin) {
            return res.status(400).json({ message: 'NIK dan PIN wajib diisi!' });
        }

        const cleanNik = String(nik).trim();
        const cleanPin = String(pin).trim();

        if (cleanNik === '' || cleanPin === '') {
            return res.status(400).json({ message: 'NIK dan PIN tidak boleh kosong!' });
        }

        // Cari user berdasarkan NIK
        const result = await pool.query('SELECT * FROM users WHERE nik = $1', [cleanNik]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'NIK atau PIN salah!' });
        }

        const user = result.rows[0];
        if (user.is_active === false) {
            return res.status(403).json({ message: 'Akun Anda telah dinonaktifkan oleh Admin!' });
        }
        
        // Cocokkan PIN yang diinput dengan Hash PIN di database
        const isMatch = await bcrypt.compare(pin, user.pin);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'NIK atau PIN salah!' });
        }

        // Buat Token JWT (Berisi ID, NIK, dan Role)
        const payload = {
            user: {
                id: user.id,
                nik: user.nik,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' }, // Token berlaku 1 hari
            (err, token) => {
                if (err) throw err;
                res.json({ token, message: 'Login berhasil!' });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==========================================
// ADMIN: LIHAT DAFTAR SEMUA AKUN
// ==========================================
exports.getAllUsers = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, 
                u.nik, 
                u.nama,
                u.foto_profil, 
                d.nama_dept AS departemen, 
                u.tipe_karyawan, 
                u.role,
                u.created_at
            FROM users u
            LEFT JOIN departments d ON u.departemen_id = d.id
            ORDER BY u.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat mengambil data user' });
    }
};

// ==========================================
// ADMIN: EDIT DATA KARYAWAN
// ==========================================
exports.updateUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { departemen_id, role, tipe_karyawan, nama_leader } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET departemen_id = $1, role = $2, tipe_karyawan = $3, nama_leader = $4 
             WHERE id = $5 RETURNING id, nik, nama`,
            [departemen_id || null, role, tipe_karyawan, nama_leader, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
        res.json({ message: 'Data karyawan berhasil diupdate', data: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat update user' });
    }
};

// ==========================================
// ADMIN: RESET PIN KARYAWAN (Ke 123456)
// ==========================================
exports.resetPinByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash('123456', salt);

        const result = await pool.query('UPDATE users SET pin = $1 WHERE id = $2 RETURNING id, nik', [hashedPin, id]);
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
        res.json({ message: 'PIN berhasil di-reset menjadi 123456' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat reset PIN' });
    }
};

// ==========================================
// KARYAWAN (FRONTEND): LIHAT PROFIL SENDIRI
// ==========================================
exports.getMyProfile = async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.nik, u.nama, u.foto_profil, d.nama_dept, u.nama_leader, u.role 
            FROM users u
            LEFT JOIN departments d ON u.departemen_id = d.id
            WHERE u.id = $1
        `;
        const result = await pool.query(query, [req.user.id]); // Ambil ID dari token JWT
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat mengambil profil' });
    }
};

// ==========================================
// KARYAWAN (FRONTEND): UPDATE NAMA LEADER
// ==========================================
exports.updateMyProfile = async (req, res) => {
    try {
        const { nama_leader } = req.body;
        await pool.query('UPDATE users SET nama_leader = $1 WHERE id = $2', [nama_leader, req.user.id]);
        res.json({ message: 'Profil berhasil diperbarui' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat update profil' });
    }
};

// ==========================================
// KARYAWAN (FRONTEND): GANTI PIN MANDIRI
// ==========================================
exports.changeMyPin = async (req, res) => {
    try {
        const { pin_lama, pin_baru } = req.body;
        
        // 1. Validasi Kehadiran Input
        if (!pin_lama || !pin_baru) {
            return res.status(400).json({ message: 'PIN lama dan PIN baru wajib diisi!' });
        }

        const cleanPinLama = String(pin_lama).trim();
        const cleanPinBaru = String(pin_baru).trim();

        if (cleanPinLama === '' || cleanPinBaru === '') {
            return res.status(400).json({ message: 'PIN tidak boleh kosong!' });
        }

        // 2. Validasi Format PIN Baru (Wajib angka dan tepat 6 digit)
        if (!/^\d{6}$/.test(cleanPinBaru)) {
            return res.status(400).json({ message: 'PIN baru harus berupa angka dan tepat 6 digit (contoh: 123456)!' });
        }
        
        // 3. Ambil PIN lama dari database
        const user = await pool.query('SELECT pin FROM users WHERE id = $1', [req.user.id]);
        
        // 4. Cek apakah PIN lama yang diinput cocok dengan database
        const isMatch = await bcrypt.compare(cleanPinLama, user.rows[0].pin);
        if (!isMatch) return res.status(400).json({ message: 'PIN lama salah!' });

        // 5. Hash PIN baru dan simpan
        const salt = await bcrypt.genSalt(10);
        const hashedNewPin = await bcrypt.hash(cleanPinBaru, salt);
        
        await pool.query('UPDATE users SET pin = $1 WHERE id = $2', [hashedNewPin, req.user.id]);
        res.json({ message: 'PIN berhasil diubah!' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat ganti PIN' });
    }
};

// ==========================================
// ADMIN: DELETE / SOFT DELETE KARYAWAN
// ==========================================
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.query; // Membaca query parameter: ?type=hard atau ?type=soft

        if (type === 'hard') {
            // HARD DELETE: Hapus permanen dari database
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
            return res.json({ message: 'Akun berhasil dihapus permanen (Hard Delete).' });
        } else {
            // SOFT DELETE (Default): Ubah is_active jadi false
            await pool.query('UPDATE users SET is_active = false WHERE id = $1', [id]);
            return res.json({ message: 'Akun berhasil dinonaktifkan (Soft Delete).' });
        }

    } catch (err) {
        console.error(err.message);
        // Tangkap error Foreign Key Constraint (Jika akun sudah punya riwayat transaksi)
        if (err.code === '23503') {
            return res.status(400).json({ 
                message: 'GAGAL: Akun ini tidak bisa di-Hard Delete karena sudah memiliki riwayat transaksi di gudang! Silakan gunakan opsi Soft Delete.' 
            });
        }
        res.status(500).json({ message: 'Server error saat menghapus user' });
    }
};

// ==========================================
// KARYAWAN/ADMIN: UPLOAD FOTO PROFIL
// ==========================================
exports.uploadFotoProfil = async (req, res) => {
    try {
        const { foto_base64 } = req.body;
        const user_id = req.user.id;

        if (!foto_base64 || !foto_base64.startsWith('data:image')) {
            return res.status(400).json({ message: 'Format foto tidak valid!' });
        }

        // 1. Ekstrak data Base64
        const base64Data = foto_base64.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const contentType = foto_base64.split(';')[0].split(':')[1];
        
        // 2. Set lokasi file di Supabase (uploads > EmplyProfile)
        const fileName = `EmplyProfile/profil_${user_id}_${Date.now()}.jpg`;

        // 3. Upload file
        const finalPhotoUrl = await storage.uploadFile(fileName, buffer, contentType);

        // 5. Simpan URL ke database users
        await pool.query('UPDATE users SET foto_profil = $1 WHERE id = $2', [finalPhotoUrl, user_id]);

        res.json({ 
            message: 'Foto profil berhasil diupdate!', 
            foto_profil: finalPhotoUrl 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat upload foto profil' });
    }
};

// ==========================================
// ADMIN: LIHAT RIWAYAT TRANSAKSI KARYAWAN
// ==========================================
exports.getUserTransactionHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit || 10);

        const query = `
            SELECT
                il.id,
                (il.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') AS created_at,
                i.nama_barang,
                i.barcode,
                il.tipe_transaksi,
                il.qty,
                admin.nama AS pic_admin,
                rh.status AS status_request
            FROM inventory_logs il
            JOIN request_header rh ON il.referensi_id = rh.id
            JOIN items i ON il.item_id = i.id
            LEFT JOIN users admin ON il.user_id = admin.id
            WHERE rh.user_id = $1
              AND il.tipe_transaksi = 'OUT'
            ORDER BY il.created_at DESC
            LIMIT $2
        `;

        const result = await pool.query(query, [id, limit]);

        res.json({
            data: result.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat mengambil riwayat transaksi karyawan' });
    }
};
