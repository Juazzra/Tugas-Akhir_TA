const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST: Register Karyawan/Admin
const register = async (req, res) => {
    const { nama, username, password, role } = req.body;
    try {
        // Acak password (hashing)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'INSERT INTO users (nama, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, nama, username, role',
            [nama, username, hashedPassword, role]
        );
        
        res.status(201).json({ success: true, message: 'Registrasi berhasil', data: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Username sudah dipakai!' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

const login = async (req, res) => {
    const { username, password } = req.body;
    
    console.log("=== Debug Login ===");
    console.log("Username dari Postman:", username);
    console.log("Password dari Postman:", password);

    try {
        // 1. Ambil user berdasarkan username
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length === 0) {
            console.log("User tidak ditemukan di DB");
            return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
        }

        const user = result.rows[0];
        console.log("User ditemukan:", user.username);
        console.log("Password di DB (Hashed):", user.password);

        // 2. Bandingkan password
        // PENTING: bcrypt.compare(password_polos, password_hash)
        const isMatch = await bcrypt.compare(password, user.password);
        
        console.log("Hasil Cocok:", isMatch);
        console.log("====================");

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
        }

        // 3. Jika cocok, buat token
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login berhasil',
            token: token,
            data: { id: user.id, nama: user.nama, role: user.role }
        });

    } catch (error) {
        console.error("Error Login:", error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
module.exports = { register, login };