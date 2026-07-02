const pool = require('../config/db');
const storage = require('../utils/storage');
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

// ==========================================
// ADMIN: TAMBAH BARANG BARU (+ FOTO)
// ==========================================
exports.createItem = async (req, res) => {
    try {
        const { barcode, nama_barang, jenis, stok_aktual, foto_base64, stok_min, stok_safety, stok_max, rata_kebutuhan_bulanan, harga_per_unit } = req.body;

        // Cek apakah barcode sudah ada
        const itemExist = await pool.query('SELECT * FROM items WHERE barcode = $1', [barcode]);
        if (itemExist.rows.length > 0) {
            return res.status(400).json({ message: 'Barcode sudah terdaftar untuk barang lain!' });
        }

        let finalPhotoUrl = null;

        // Jika Admin mengunggah foto barang
        if (foto_base64 && foto_base64.startsWith('data:image')) {
            const base64Data = foto_base64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const contentType = foto_base64.split(';')[0].split(':')[1];
            
            // Simpan di direktori 'uploads/Items'
            const fileName = `Items/item_${barcode}_${Date.now()}.jpg`;

            finalPhotoUrl = await storage.uploadFile(fileName, buffer, contentType);
        }

        const newItem = await pool.query(
            'INSERT INTO items (barcode, nama_barang, jenis, stok_aktual, foto_barang, stok_min, stok_safety, stok_max, rata_kebutuhan_bulanan, harga_per_unit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [barcode, nama_barang, jenis, stok_aktual || 0, finalPhotoUrl, stok_min || 0, stok_safety || 0, stok_max || 0, rata_kebutuhan_bulanan || 0, harga_per_unit || 0]
        );

        res.status(201).json({
            message: 'Barang beserta foto berhasil ditambahkan!',
            item: newItem.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat menambah barang' });
    }
};

// ==========================================
// ADMIN: EDIT BARANG (+ UPDATE FOTO)
// ==========================================
exports.updateItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { barcode, nama_barang, jenis, foto_base64, stok_min, stok_safety, stok_max, rata_kebutuhan_bulanan, harga_per_unit } = req.body;

        let finalPhotoUrl = null;

        // Jika Admin mengganti foto barang saat proses edit
        if (foto_base64 && foto_base64.startsWith('data:image')) {
            const base64Data = foto_base64.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const contentType = foto_base64.split(';')[0].split(':')[1];
            const fileName = `Items/item_update_${id}_${Date.now()}.jpg`;

            finalPhotoUrl = await storage.uploadFile(fileName, buffer, contentType);
        }

        // COALESCE digunakan agar jika finalPhotoUrl null (Admin tidak ganti foto), foto lama tetap dipertahaman
        const query = `
            UPDATE items 
            SET barcode = $1, nama_barang = $2, jenis = $3, 
                foto_barang = COALESCE($4, foto_barang), 
                stok_min = $5, stok_safety = $6, stok_max = $7,
                rata_kebutuhan_bulanan = $8, harga_per_unit = $9,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = $10 RETURNING *
        `;
        const result = await pool.query(query, [barcode, nama_barang, jenis, finalPhotoUrl, stok_min || 0, stok_safety || 0, stok_max || 0, rata_kebutuhan_bulanan || 0, harga_per_unit || 0, id]);

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
            SELECT il.id, (il.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta') AS created_at, i.nama_barang, il.tipe_transaksi, il.qty, u.nama AS pic_admin
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

// ==========================================
// ADMIN: LIHAT ANTREAN BARANG MASUK (MODE IN)
// ==========================================
exports.getRestockQueue = async (req, res) => {
    try {
        // Query ini akan otomatis mengelompokkan barang yang di-scan berkali-kali
        // Contoh: Helm Merah discan 5x -> Hasilnya langsung terhitung Qty: 5
        const query = `
            SELECT 
                sq.barcode, 
                i.id AS item_id,
                i.nama_barang, 
                COUNT(sq.id) AS jumlah_masuk,
                MIN(sq.scanned_at) AS waktu_scan_pertama
            FROM scanner_queue sq
            LEFT JOIN items i ON sq.barcode = i.barcode
            WHERE sq.status = 'PENDING' AND sq.mode = 'IN'
            GROUP BY sq.barcode, i.id, i.nama_barang
            ORDER BY waktu_scan_pertama ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error getRestockQueue:", err.message);
        res.status(500).json({ message: 'Gagal mengambil antrean barang masuk' });
    }
};

// ==========================================
// ADMIN: EKSEKUSI ANTREAN (APPROVE RESTOCK KUSTOM QTY)
// ==========================================
exports.approveRestock = async (req, res) => {
    const client = await pool.connect();
    try {
        const { items_to_approve } = req.body; 
        const admin_id = req.user.id;

        if (!items_to_approve || items_to_approve.length === 0) {
            throw new Error('Tidak ada data barang untuk disubmit.');
        }

        await client.query('BEGIN');
        
        const processedBarcodes = []; // Array untuk menampung barcode yang sukses diproses

        for (let item of items_to_approve) {
            if (!item.qty || item.qty <= 0) {
                throw new Error(`Jumlah QTY untuk barcode ${item.barcode} tidak valid (tidak boleh 0 atau minus)!`);
            }
            
            const updateRes = await client.query(
                'UPDATE items SET stok_aktual = stok_aktual + $1 WHERE barcode = $2 RETURNING id',
                [item.qty, item.barcode]
            );
            
            if (updateRes.rows.length === 0) {
                throw new Error(`Barcode ${item.barcode} tidak terdaftar di sistem! Silakan daftarkan barang tersebut terlebih dahulu.`);
            }

            await client.query(
                `INSERT INTO inventory_logs (item_id, user_id, tipe_transaksi, qty, referensi_id) 
                 VALUES ($1, $2, 'IN', $3, NULL)`,
                [updateRes.rows[0].id, admin_id, item.qty]
            );
            // Masukkan barcode ini ke daftar sukses
            processedBarcodes.push(item.barcode);
        }

        // PERBAIKAN: Ubah jadi 'APPROVED', TAPI HANYA untuk barcode yang barusan disubmit dari UI
        if (processedBarcodes.length > 0) {
            await client.query(
                "UPDATE scanner_queue SET status = 'APPROVED' WHERE status = 'PENDING' AND mode = 'IN' AND barcode = ANY($1)",
                [processedBarcodes]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Restock Fisik Berhasil! Stok gudang telah bertambah.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error approveRestock:", err.message);
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

// ==========================================
// ADMIN: TOLAK/HAPUS ANTREAN SALAH SCAN (PER BARCODE)
// ==========================================
exports.rejectRestock = async (req, res) => {
    try {
        const { barcode } = req.body; // Menerima barcode spesifik dari UI
        
        if (!barcode) return res.status(400).json({ message: 'Barcode diperlukan' });

        // Mengubah status jadi 'REJECTED' HANYA pada barcode yang diklik
        await pool.query(
            "UPDATE scanner_queue SET status = 'REJECTED' WHERE status = 'PENDING' AND mode = 'IN' AND barcode = $1",
            [barcode]
        );
        res.json({ message: `Scan untuk kode ${barcode} berhasil dihapus dari antrean.` });
    } catch (err) {
        console.error("Error rejectRestock:", err.message);
        res.status(500).json({ message: 'Server error saat menolak antrean.' });
    }
};