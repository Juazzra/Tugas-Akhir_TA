const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/scanner
// Payload dari ESP32: { "code": "128-Mouse", "mode": "IN" } atau { "code": "128-Mouse", "mode": "OUT" }
router.post('/', async (req, res) => {
    const { code, mode } = req.body;

    try {
        // 1. Cek eksistensi barang di database
        const itemResult = await pool.query(
            'SELECT * FROM items WHERE barcode = $1 AND is_active = TRUE', 
            [code]
        );
        
        if (itemResult.rows.length === 0) {
            // Maksimal 16 karakter per baris agar pas di LCD
            return res.json({ 
                status: 'error', 
                lcd_line_1: 'Barang Tidak', 
                lcd_line_2: 'Ditemukan!' 
            });
        }

        const item = itemResult.rows[0];
        // Potong nama barang jika terlalu panjang untuk baris ke-2 LCD
        const namaLcd = item.nama_barang.substring(0, 16); 

        // ==========================================
        // LOGIKA MODE MASUK (IN) via GM65 (Barcode)
        // ==========================================
        if (mode === 'IN') {
            await pool.query(
                'INSERT INTO scanner_queue (barcode, mode, status) VALUES ($1, $2, $3)',
                [code, 'IN', 'PENDING']
            );
            
            return res.json({ 
                status: 'success', 
                lcd_line_1: 'Antrean MASUK:', 
                lcd_line_2: namaLcd 
            });
        }

        // ==========================================
        // LOGIKA MODE KELUAR (OUT) via RC522 (RFID)
        // ==========================================
        if (mode === 'OUT') {
            // Cek stok fisik terlebih dahulu sebelum mengizinkan antrean keluar
            if (item.stok_aktual <= 0) {
                return res.json({ 
                    status: 'error', 
                    lcd_line_1: 'Stok Kosong!', 
                    lcd_line_2: namaLcd 
                });
            }

            // Masukkan ke antrean untuk diproses lebih lanjut oleh HRG di Web
            await pool.query(
                'INSERT INTO scanner_queue (barcode, mode, status) VALUES ($1, $2, $3)',
                [code, 'OUT', 'PENDING']
            );

            return res.json({ 
                status: 'success', 
                lcd_line_1: 'Antrean KELUAR:', 
                lcd_line_2: namaLcd 
            });
        }

        // Jika ESP32 mengirim mode yang tidak valid
        return res.status(400).json({ 
            status: 'error', 
            lcd_line_1: 'Mode Tidak', 
            lcd_line_2: 'Dikenali!' 
        });

    } catch (err) {
        console.error('Error di API Scanner:', err.stack);
        return res.status(500).json({ 
            status: 'error', 
            lcd_line_1: 'System Error!', 
            lcd_line_2: 'Cek Server Node' 
        });
    }
});


// GET /api/scanner/queue - Untuk menampilkan daftar antrean ke tabel HRG
router.get('/queue', async (req, res) => {
    try {
        // Kita JOIN dengan tabel items biar nama barangnya muncul di UI
        const query = `
            SELECT sq.id, sq.barcode, sq.mode, sq.status, sq.scanned_at, i.nama_barang
            FROM scanner_queue sq
            LEFT JOIN items i ON sq.barcode = i.barcode
            WHERE sq.status = 'PENDING'
            ORDER BY sq.scanned_at ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error get queue:', err);
        res.status(500).json({ error: 'Gagal mengambil antrean' });
    }
});

// POST /api/scanner/queue/:id/process - Eksekusi tombol Approve/Reject
router.post('/queue/:id/process', async (req, res) => {
    const queueId = req.params.id;
    const { action, qty } = req.body; // Sekarang menerima 'qty' dari frontend

    try {
        // Mulai transaksi database (wajib kalau ubah >1 tabel)
        await pool.query('BEGIN');

        const statusBaru = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        
        // 1. Ambil data antreannya
        const queueRes = await pool.query('SELECT * FROM scanner_queue WHERE id = $1', [queueId]);
        if (queueRes.rows.length === 0) throw new Error('Antrean tidak ditemukan');
        const queue = queueRes.rows[0];

        // 2. Ubah status di scanner_queue
        await pool.query('UPDATE scanner_queue SET status = $1 WHERE id = $2', [statusBaru, queueId]);

        // 3. Jika di-APPROVE, eksekusi stok dan log
        if (action === 'APPROVE') {
            const itemRes = await pool.query('SELECT id, stok_aktual FROM items WHERE barcode = $1', [queue.barcode]);
            if (itemRes.rows.length === 0) throw new Error('Barang tidak valid di database');
            const item = itemRes.rows[0];
            
            let finalQty = 0;

            if (queue.mode === 'IN') {
                // MASUK: Ambil dari input HRG
                finalQty = parseInt(qty, 10);
                if (isNaN(finalQty) || finalQty <= 0) throw new Error('Quantity tidak valid');
                
                await pool.query('UPDATE items SET stok_aktual = stok_aktual + $1, updated_at = CURRENT_TIMESTAMP WHERE barcode = $2', [finalQty, queue.barcode]);
            } else if (queue.mode === 'OUT') {
                // KELUAR: Otomatis 1 (sesuai SOP sat-set RFID)
                finalQty = 1;
                if (item.stok_aktual < finalQty) throw new Error('Stok fisik tidak mencukupi!');
                
                await pool.query('UPDATE items SET stok_aktual = stok_aktual - $1, updated_at = CURRENT_TIMESTAMP WHERE barcode = $2', [finalQty, queue.barcode]);
            }

            // 4. Catat ke riwayat log (Audit Trail)
            await pool.query(
                'INSERT INTO inventory_logs (item_id, tipe_transaksi, qty) VALUES ($1, $2, $3)',
                [item.id, queue.mode, finalQty]
            );
        }

        // Simpan semua perubahan
        await pool.query('COMMIT'); 
        res.json({ status: 'success', message: `Data berhasil di-${statusBaru}` });

    } catch (err) {
        // Jika ada yang gagal, kembalikan database ke kondisi awal
        await pool.query('ROLLBACK');
        console.error('Error process queue:', err);
        res.status(500).json({ error: err.message || 'Gagal memproses antrean' });
    }
});

module.exports = router;