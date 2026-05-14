const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ==========================================
// KARYAWAN: BUAT REQUEST BARANG (CHECKOUT KERANJANG) (Foto Supabase)
// ==========================================
exports.createRequest = async (req, res) => {
    const client = await pool.connect();
    try {
        const { tgl_pengambilan, keranjang } = req.body;
        const user_id = req.user.id;

        await client.query('BEGIN');

        const headerResult = await client.query(
            `INSERT INTO request_header (user_id, tgl_pengambilan, status) VALUES ($1, $2, 'pending') RETURNING id`, 
            [user_id, tgl_pengambilan]
        );
        const request_id = headerResult.rows[0].id;

        for (let item of keranjang) {
            const checkStock = await client.query('SELECT stok_aktual, nama_barang FROM items WHERE id = $1', [item.item_id]);
            if (checkStock.rows.length === 0) throw new Error(`Barang ID ${item.item_id} tidak ditemukan.`);
            if (checkStock.rows[0].stok_aktual < item.jumlah) throw new Error(`Stok ${checkStock.rows[0].nama_barang} tidak cukup!`);

            let finalPhotoUrl = null;

            // UPLOAD CLOUD SUPABASE
            if (item.foto_bukti && item.foto_bukti.startsWith('data:image')) {
                console.log("URL Cloud:", process.env.SUPABASE_URL);
                console.log("Service Key:", process.env.SUPABASE_SERVICE_KEY ? "Kunci Terbaca (Aman)" : "Kunci UNDEFINED (Kosong!)");
                const base64Data = item.foto_bukti.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const contentType = item.foto_bukti.split(';')[0].split(':')[1];
                
                const filePath = `BuktiPenyerahan/req_${request_id}_item_${item.item_id.substring(0,8)}_${Date.now()}.jpg`;

                const { error } = await supabase.storage.from('uploads').upload(filePath, buffer, { contentType, upsert: true });
                if (error) throw error;

                const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filePath);
                finalPhotoUrl = publicUrlData.publicUrl;
            }

            await client.query(
                `INSERT INTO request_detail (request_id, item_id, jumlah, alasan, foto_bukti) VALUES ($1, $2, $3, $4, $5)`,
                [request_id, item.item_id, item.jumlah, item.alasan || null, finalPhotoUrl]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Request sukses (Cloud Mode)!', request_id });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ message: err.message || 'Server error' });
    } finally {
        client.release();
    }
};

// ==========================================
// ADMIN: LIHAT SEMUA REQUEST (DASHBOARD)
// ==========================================
exports.getAllRequests = async (req, res) => {
    try {
        const query = `
            SELECT 
                rh.id, 
                rh.status, 
                rh.tgl_pengambilan, 
                u.nama AS nama_karyawan, 
                u.nik,
                rd.jumlah,
                rd.alasan,
                rd.foto_bukti, -- FOTO BUKTI SEKARANG IKUT KETARIK
                i.nama_barang
            FROM request_header rh
            JOIN users u ON rh.user_id = u.id
            JOIN request_detail rd ON rh.id = rd.request_id
            JOIN items i ON rd.item_id = i.id
            ORDER BY rh.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat mengambil data request' });
    }
};

// ==========================================
// ADMIN: APPROVE / REJECT REQUEST
// ==========================================
exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params; // ID dari URL endpoint
        const { status } = req.body; // Status baru: 'approved' atau 'rejected'

        // Validasi input status
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Status hanya boleh 'approved' atau 'rejected'" });
        }

        const updateQuery = `
            UPDATE request_header 
            SET status = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $2 RETURNING id, status
        `;
        const result = await pool.query(updateQuery, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Data request tidak ditemukan!' });
        }

        res.json({
            message: `Request berhasil diubah menjadi: ${status}`,
            data: result.rows[0]
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat update status' });
    }
};

// ==========================================
// HARDWARE BRIDGE: VERIFIKASI SCAN BARANG KELUAR
// ==========================================
exports.verifyScanItem = async (req, res) => {
    try {
        // req.body.barcode ini nanti yang akan dikirim oleh alat Firebase Orang B
        const { request_id, barcode } = req.body;

        // 1. Cari ID barang berdasarkan barcode yang ditembak scanner
        const itemQuery = await pool.query('SELECT id, nama_barang FROM items WHERE barcode = $1', [barcode]);
        if (itemQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Barcode tidak terdaftar di sistem master!' });
        }
        const item = itemQuery.rows[0];

        // 2. Cek apakah barang ini ada di list request karyawan DAN belum di-scan
        const detailQuery = await pool.query(
            `UPDATE request_detail SET is_scanned = true 
             WHERE request_id = $1 AND item_id = $2 AND is_scanned = false 
             RETURNING id`,
            [request_id, item.id]
        );

        // Jika tidak ada yang ter-update, berarti barang salah atau sudah di-scan
        if (detailQuery.rows.length === 0) {
            return res.status(400).json({ 
                message: `TOLAK: ${item.nama_barang} tidak ada di list request, atau sudah di-scan sebelumnya!` 
            });
        }

        res.json({ message: `ACC: Scan sukses! ${item.nama_barang} terverifikasi.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error saat verifikasi scan' });
    }
};

// ==========================================
// ADMIN: SELESAIKAN SERAH TERIMA (POTONG STOK & LOG)
// ==========================================
exports.completeHandover = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params; // ID dari request_header
        const admin_id = req.user.id; // Admin yang bertugas

        await client.query('BEGIN'); // Mulai transaksi aman

        // 1. Pastikan SEMUA barang di keranjang sudah di-scan oleh hardware
        const checkUnscanned = await client.query(
            'SELECT COUNT(*) FROM request_detail WHERE request_id = $1 AND is_scanned = false', 
            [id]
        );
        if (parseInt(checkUnscanned.rows[0].count) > 0) {
            throw new Error('Gagal: Masih ada barang yang belum di-scan barcode-nya!');
        }

        // 2. Ambil detail barang untuk memotong stok dan mencatat log
        const details = await client.query('SELECT item_id, jumlah FROM request_detail WHERE request_id = $1', [id]);

        for (let row of details.rows) {
            // Potong stok di tabel items
            await client.query(
                'UPDATE items SET stok_aktual = stok_aktual - $1 WHERE id = $2',
                [row.jumlah, row.item_id]
            );

            // Masukkan jejak ke inventory_logs
            await client.query(
                `INSERT INTO inventory_logs (item_id, user_id, tipe_transaksi, qty, referensi_id)
                 VALUES ($1, $2, 'OUT', $3, $4)`,
                [row.item_id, admin_id, row.jumlah, id]
            );
        }

        // 3. Update status utama menjadi 'completed'
        await client.query("UPDATE request_header SET status = 'completed' WHERE id = $1", [id]);

        await client.query('COMMIT'); // Simpan semua perubahan
        res.json({ message: 'Serah terima selesai! Stok berhasil dipotong dan log tercatat.' });

    } catch (err) {
        await client.query('ROLLBACK'); // Batalkan jika ada error
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
        const query = `
            SELECT id, status, tgl_pengambilan, created_at 
            FROM request_header 
            WHERE user_id = $1 ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

// ==========================================
// GLOBAL: LIHAT DETAIL ITEM DALAM REQUEST
// ==========================================
exports.getRequestDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT rd.id, rd.item_id, i.nama_barang, i.barcode, rd.jumlah, rd.alasan, rd.is_scanned 
            FROM request_detail rd
            JOIN items i ON rd.item_id = i.id
            WHERE rd.request_id = $1
        `;
        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.uploadBuktiPenyerahan = async (req, res) => {
    try {
        const requestId = req.params.id;
        if (!req.file) return res.status(400).json({ error: 'File tidak ditemukan' });

        // Multer memoryStorage memberikan kita 'buffer'
        const buffer = req.file.buffer;
        const fileName = `BuktiAdmin/admin_verify_${requestId}_${Date.now()}.jpg`;

        // Upload ke Supabase Storage
        const { error } = await supabase.storage
            .from('uploads')
            .upload(fileName, buffer, { contentType: req.file.mimetype });

        if (error) throw error;

        const publicUrl = supabase.storage.from('uploads').getPublicUrl(fileName).data.publicUrl;

        // Update database dengan LINK CLOUD
        await pool.query(
            'UPDATE request_detail SET foto_bukti = $1 WHERE request_id = $2',
            [publicUrl, requestId]
        );

        res.json({ status: 'success', url: publicUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};