const pool = require('../config/db');

// ==========================================
// KARYAWAN & ADMIN: LIHAT BARANG (Paginasi & Search)
// ==========================================
exports.getAllItems = async (req, res) => {
    try {
        // Tangkap query dari URL (contoh: ?search=helm&page=1&limit=10)
        const { search = '', page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // 1. Hitung total data (untuk tau ada berapa halaman)
        const countQuery = `SELECT COUNT(*) FROM items WHERE is_active = true AND nama_barang ILIKE $1`;
        const countResult = await pool.query(countQuery, [`%${search}%`]);
        const totalItems = parseInt(countResult.rows[0].count);

        // 2. Ambil data sesuai limit & offset
        const query = `
            SELECT * FROM items 
            WHERE is_active = true AND nama_barang ILIKE $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await pool.query(query, [`%${search}%`, limit, offset]);

        // Kirim response dengan format Paginasi
        res.json({
            data: result.rows,
            totalItems: totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// ==========================================
// KARYAWAN & ADMIN: LIHAT BARANG BERDASARKAN ID
// ==========================================
exports.getItemById = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `SELECT * FROM items WHERE id = $1 AND is_active = true`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Barang tidak ditemukan atau tidak aktif' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat mengambil data barang' });
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

exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode, nama_barang, jenis } = req.body;

        // Note: Stok tidak di-update di sini, stok berubah murni dari transaksi masuk/keluar
        const query = `
            UPDATE items 
            SET barcode = $1, nama_barang = $2, jenis = $3, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $4 RETURNING *
        `;
        const result = await pool.query(query, [barcode, nama_barang, jenis, id]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Barang tidak ditemukan' });
        res.json({ message: 'Data barang berhasil diupdate!', data: result.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat edit barang' });
    }
};

// ==========================================
// ADMIN: HAPUS BARANG (SOFT DELETE)
// ==========================================
exports.deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        // Kita set is_active jadi false agar hilang dari katalog karyawan
        const result = await pool.query('UPDATE items SET is_active = false WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'Barang tidak ditemukan' });
        res.json({ message: 'Barang berhasil dihapus dari katalog (Soft Delete).' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat hapus barang' });
    }
};

// ==========================================
// ADMIN: HISTORY LOGS (Paginasi)
// ==========================================
exports.getInventoryLogs = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const countResult = await pool.query('SELECT COUNT(*) FROM inventory_logs');
        const totalItems = parseInt(countResult.rows[0].count);

        const query = `
            SELECT il.id, il.created_at, i.nama_barang, il.tipe_transaksi, il.qty, u.nama AS pic_admin
            FROM inventory_logs il
            JOIN items i ON il.item_id = i.id
            LEFT JOIN users u ON il.user_id = u.id
            ORDER BY il.created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await pool.query(query, [limit, offset]);

        res.json({
            data: result.rows,
            totalItems: totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error saat ambil logs' });
    }
};