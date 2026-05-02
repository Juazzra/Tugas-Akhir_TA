const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ==========================================
// REGISTER KARYAWAN / ADMIN
// ==========================================
exports.register = async (req, res) => {
    try {
        // Ambil data dari request body (Sesuai skema database baru)
        const { nik, pin, nama, departemen_id, nama_leader, tipe_karyawan, role } = req.body;

        // Cek apakah NIK sudah terdaftar
        const userExist = await pool.query('SELECT * FROM users WHERE nik = $1', [nik]);
        if (userExist.rows.length > 0) {
            return res.status(400).json({ message: 'NIK sudah terdaftar!' });
        }

        // Hash PIN (Sama seperti hash password)
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(pin, salt);

        // Masukkan data ke database
        const newUser = await pool.query(
            `INSERT INTO users (nik, pin, nama, departemen_id, nama_leader, tipe_karyawan, role) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, nik, nama, role`,
            [nik, hashedPin, nama, departemen_id || null, nama_leader || null, tipe_karyawan || 'tetap', role]
        );

        res.status(201).json({
            message: 'Registrasi berhasil!',
            user: newUser.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==========================================
// LOGIN KARYAWAN / ADMIN
// ==========================================
exports.login = async (req, res) => {
    try {
        const { nik, pin } = req.body;

        // Cari user berdasarkan NIK
        const result = await pool.query('SELECT * FROM users WHERE nik = $1', [nik]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'NIK atau PIN salah!' });
        }

        const user = result.rows[0];

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