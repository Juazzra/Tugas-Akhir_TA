const pool = require('../config/db');

// GET: Ambil semua master barang
const getAllItems = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// POST: Tambah barang baru
const createItem = async (req, res) => {
    const { barcode, nama_barang, jenis, stok_aktual } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO items (barcode, nama_barang, jenis, stok_aktual) VALUES ($1, $2, $3, $4) RETURNING *',
            [barcode, nama_barang, jenis, stok_aktual || 0]
        );
        res.status(201).json({
            success: true,
            message: 'Barang berhasil ditambahkan',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        // Tangkap error jika barcode duplikat
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Barcode sudah terdaftar!' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllItems,
    createItem
};