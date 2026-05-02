const pool = require('../config/db');

// Lihat semua barang (Untuk Katalog di HP Karyawan)
exports.getAllItems = async (req, res) => {
    try {
        // Ambil semua barang, urutkan berdasarkan nama
        const result = await pool.query('SELECT * FROM items ORDER BY nama_barang ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Tambah barang baru (Khusus Admin)
exports.createItem = async (req, res) => {
    try {
        const { barcode, nama_barang, jenis, stok_aktual } = req.body;

        // Cek apakah barcode sudah ada
        const itemExist = await pool.query('SELECT * FROM items WHERE barcode = $1', [barcode]);
        if (itemExist.rows.length > 0) {
            return res.status(400).json({ message: 'Barcode sudah terdaftar untuk barang lain!' });
        }

        const newItem = await pool.query(
            'INSERT INTO items (barcode, nama_barang, jenis, stok_aktual) VALUES ($1, $2, $3, $4) RETURNING *',
            [barcode, nama_barang, jenis, stok_aktual || 0]
        );

        res.status(201).json({
            message: 'Barang berhasil ditambahkan!',
            item: newItem.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};