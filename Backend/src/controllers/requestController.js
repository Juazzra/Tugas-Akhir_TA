const pool = require('../config/db');
const storage = require('../utils/storage');

// ==========================================
// KARYAWAN: BUAT REQUEST (OPTIMASI PROMISE.ALL)
// ==========================================
exports.createRequest = async (req, res) => {
    const client = await pool.connect();
    try {
        const { tgl_pengambilan, keranjang } = req.body;
        const user_id = req.user.id;
        // [+] TAMBAHKAN VALIDASI INI SEBELUM 'BEGIN'
        if (!keranjang || !Array.isArray(keranjang) || keranjang.length === 0) {
            return res.status(400).json({ message: 'Keranjang belanja tidak boleh kosong!' });
        }
        for (let item of keranjang) {
            if (!item.jumlah || item.jumlah <= 0) {
                return res.status(400).json({ message: 'Kuantitas barang harus lebih besar dari 0!' });
            }
        }
        // ==========================================
        await client.query('BEGIN'); // Kunci transaksi

        const headerResult = await client.query(
            `INSERT INTO request_header (user_id, tgl_pengambilan, status) VALUES ($1, $2, 'pending') RETURNING id`, 
            [user_id, tgl_pengambilan]
        );
        const request_id = headerResult.rows[0].id;

        // 1. Cek stok semua barang dulu (Biar gak capek upload kalau ternyata stok kurang)
        for (let item of keranjang) {
            const checkStock = await client.query('SELECT stok_aktual, nama_barang FROM items WHERE id = $1', [item.item_id]);
            if (checkStock.rows.length === 0) throw new Error(`Barang ID ${item.item_id} tidak ditemukan.`);
            if (checkStock.rows[0].stok_aktual < item.jumlah) throw new Error(`Stok ${checkStock.rows[0].nama_barang} tidak cukup!`);
        }

        // 2. PARALELISASI UPLOAD: Upload semua foto serentak (Bikin Backend 5x Lebih Cepat!)
        const uploadPromises = keranjang.map(async (item) => {
            let finalPhotoUrl = null;
            if (item.foto_bukti && item.foto_bukti.startsWith('data:image')) {
                const base64Data = item.foto_bukti.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const contentType = item.foto_bukti.split(';')[0].split(':')[1];
                const filePath = `BuktiAlasan/req_${request_id}_item_${item.item_id.substring(0,8)}_${Date.now()}.jpg`;

                finalPhotoUrl = await storage.uploadFile(filePath, buffer, contentType);
            }
            return { ...item, finalPhotoUrl };
        });

        const keranjangWithPhotos = await Promise.all(uploadPromises);

        // 3. Masukkan ke database setelah semua foto beres
        for (let item of keranjangWithPhotos) {
            await client.query(
                `INSERT INTO request_detail (request_id, item_id, jumlah, alasan, foto_bukti) VALUES ($1, $2, $3, $4, $5)`,
                [request_id, item.item_id, item.jumlah, item.alasan || null, item.finalPhotoUrl]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Request sukses (Dioptimasi)!', request_id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(400).json({ message: err.message || 'Server error' });
    } finally {
        client.release();
    }
};

// ==========================================
// ADMIN: LIHAT SEMUA REQUEST (HANYA HEADER NOTA)
// ==========================================
exports.getAllRequests = async (req, res) => {
    try {
        const query = `
            SELECT 
                rh.id, rh.status, rh.tgl_pengambilan, 
                u.nama AS nama_karyawan, u.nik
            FROM request_header rh
            JOIN users u ON rh.user_id = u.id
            ORDER BY rh.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error mengambil data' });
    }
};

// ==========================================
// ADMIN: MULAI SERAH TERIMA (KUNCI GATEKEEPER - FIX RACE CONDITION)
// ==========================================
exports.startProcessing = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN'); // Kunci transaksi dimulai

        // 1. Update status ke 'processing' terlebih dahulu
        const result = await client.query(
            "UPDATE request_header SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'approved' RETURNING *", [id]
        );

        if (result.rows.length === 0) {
            throw new Error('Request tidak valid atau belum di-approve.');
        }

        // 2. Hitung jumlah sesi aktif berstatus 'processing'
        const checkActive = await client.query("SELECT COUNT(*) FROM request_header WHERE status = 'processing'");
        if (parseInt(checkActive.rows[0].count) > 1) {
            throw new Error('Ada sesi serah terima lain yang sedang berjalan! Selesaikan sesi tersebut terlebih dahulu.');
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Sesi dimulai. Gerbang Scanner Terbuka.', data: result.rows[0] });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("ERROR DI START PROCESSING:", err.message); 
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

// ==========================================
// ADMIN: UPDATE STATUS (Approve/Reject/Batalkan)
// ==========================================
exports.updateRequestStatus = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowedStatuses = ['pending', 'approved', 'rejected', 'processing', 'completed'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: 'Status yang dikirim tidak valid!' });
        }
        await client.query('BEGIN');

        // Jika membatalkan sesi processing
        if (status === 'pending') {
            await client.query("UPDATE request_detail SET is_scanned = false WHERE request_id = $1", [id]);
        }

        const result = await client.query(
            "UPDATE request_header SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *",
            [status, id]
        );

        if (result.rows.length === 0) throw new Error('Request tidak ditemukan');

        await client.query('COMMIT');
        res.json({ message: `Status diubah menjadi ${status}`, data: result.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

// ==========================================
// HARDWARE ESP32: VERIFIKASI BARANG (GATEKEEPER)
// ==========================================
exports.verifyScanItem = async (req, res) => {
    const client = await pool.connect();
    try {
        const { barcode } = req.body; // Alat ESP32 HANYA kirim barcode
        await client.query('BEGIN');

        // 1. GATEKEEPER: Cek gerbang mana yang lagi dibuka Admin
        const activeReq = await client.query("SELECT id FROM request_header WHERE status = 'processing'");
        if (activeReq.rows.length === 0) throw new Error('DENIED: Sesi serah terima belum dibuka oleh Admin!');
        const activeRequestId = activeReq.rows[0].id;

        // 2. Cari ID Master Barang
        const itemQ = await client.query('SELECT id, nama_barang FROM items WHERE barcode = $1', [barcode]);
        if (itemQ.rows.length === 0) throw new Error('DENIED: Barcode tidak terdaftar di sistem!');
        const item = itemQ.rows[0];

        // 3. Cocokkan barang dengan Nota
        const detailQ = await client.query(
            `UPDATE request_detail SET is_scanned = true 
             WHERE request_id = $1 AND item_id = $2 AND is_scanned = false RETURNING id`,
            [activeRequestId, item.id]
        );

        if (detailQ.rows.length === 0) throw new Error(`DENIED: ${item.nama_barang} bukan untuk nota ini atau sudah discan!`);

        await client.query('COMMIT');
        res.json({ message: `ACC: ${item.nama_barang} terverifikasi!` });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

// ==========================================
// ADMIN: SELESAIKAN SERAH TERIMA & POTONG STOK
// ==========================================
exports.completeHandover = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const admin_id = req.user.id;

        await client.query('BEGIN');

        // Pastikan semua barang sudah di-scan ESP32
        const checkUnscanned = await client.query(
            'SELECT COUNT(*) FROM request_detail WHERE request_id = $1 AND is_scanned = false', [id]
        );
        if (parseInt(checkUnscanned.rows[0].count) > 0) throw new Error('GAGAL: Masih ada barang fisik yang belum discan alat!');

        // Ambil data untuk potong stok
        const details = await client.query('SELECT item_id, jumlah FROM request_detail WHERE request_id = $1', [id]);

        for (let row of details.rows) {
            // [+] TAMBAHAN: Cek stok aktual di detik-detik terakhir sebelum potong!
            const cekStok = await client.query('SELECT stok_aktual, nama_barang FROM items WHERE id = $1', [row.item_id]);
            if (cekStok.rows[0].stok_aktual < row.jumlah) {
                throw new Error(`GAGAL! Stok "${cekStok.rows[0].nama_barang}" saat ini sisa ${cekStok.rows[0].stok_aktual}, tidak cukup untuk dipotong!`);
            }

            // Lanjut potong stok
            await client.query('UPDATE items SET stok_aktual = stok_aktual - $1 WHERE id = $2', [row.jumlah, row.item_id]);
            
            // Catat log
            await client.query(
                `INSERT INTO inventory_logs (item_id, user_id, tipe_transaksi, qty, referensi_id) VALUES ($1, $2, 'OUT', $3, $4)`,
                [row.item_id, admin_id, row.jumlah, id]
            );
        }

        await client.query("UPDATE request_header SET status = 'completed' WHERE id = $1", [id]);
        await client.query('COMMIT');
        res.json({ message: 'Transaksi Sukses! Stok gudang dipotong otomatis.' });

    } catch (err) {
        await client.query('ROLLBACK');
        res.status(400).json({ message: err.message });
    } finally {
        client.release();
    }
};

// ==========================================
// KARYAWAN: LIHAT REQUEST SENDIRI
// ==========================================
exports.getMyRequests = async (req, res) => {
    try {
        const result = await pool.query("SELECT id, status, tgl_pengambilan, created_at FROM request_header WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ==========================================
// GLOBAL: LIHAT DETAIL BARANG DALAM NOTA (FIX PRIVACY)
// ==========================================
exports.getRequestDetails = async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Validasi Kepemilikan: Karyawan dilarang intip nota orang lain
        const authCheck = await pool.query(
            `SELECT id FROM request_header WHERE id = $1 AND (user_id = $2 OR $3 = 'admin')`,
            [requestId, userId, userRole]
        );

        if (authCheck.rows.length === 0) {
            return res.status(403).json({ message: 'Akses Ditolak! Anda bukan pemilik nota ini.' });
        }

        const result = await pool.query(
            `SELECT 
                rd.id, rd.item_id, i.nama_barang, i.barcode, 
                rd.jumlah, rd.alasan, rd.is_scanned, rd.foto_bukti 
            FROM request_detail rd 
            JOIN items i ON rd.item_id = i.id 
            WHERE rd.request_id = $1`, 
            [requestId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error mengambil detail' });
    }
};