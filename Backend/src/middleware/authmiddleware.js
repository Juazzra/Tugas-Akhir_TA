const jwt = require('jsonwebtoken');

// Middleware untuk mengecek apakah user sudah login (Punya Token)
exports.verifyToken = (req, res, next) => {
    // Ambil token dari header 'Authorization' (Format: Bearer <token>)
    const token = req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Akses ditolak, token tidak ditemukan!' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user; // Simpan data user (id, nik, role) ke request
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token tidak valid!' });
    }
};

// Middleware khusus untuk mengecek apakah user adalah Admin
exports.isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Akses ditolak, khusus Admin!' });
    }
    next();
};