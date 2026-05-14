const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// GET /api/inventory-logs
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const query = `
            SELECT l.id, l.created_at, l.tipe_transaksi, l.qty, i.nama_barang, i.barcode 
            FROM inventory_logs l
            LEFT JOIN items i ON l.item_id = i.id
            ORDER BY l.created_at DESC
        `;
        const result = await pool.query(query);
        res.json({ data: result.rows });
    } catch (err) {
        console.error('Error get logs:', err);
        res.status(500).json({ message: 'Gagal mengambil data log inventori' });
    }
});

module.exports = router;