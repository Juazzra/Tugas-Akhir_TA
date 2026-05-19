const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Rute POST untuk scanner ESP32
router.post('/', async (req, res) => {
    try {
        // --- SANITASI DATA ---
        const code = req.body.code ? String(req.body.code).trim() : null;
        const mode = req.body.mode ? String(req.body.mode).trim() : null;

        if (!code || !mode) {
            return res.status(400).json({ 
                status: 'error', 
                lcd_line_1: 'Data Kosong!', 
                lcd_line_2: 'Cek Alat Scan' 
            });
        }

        // ==========================================
        // 1. MODE OUT (SERAH TERIMA BARANG KARYAWAN) -> TERINTEGRASI GATEKEEPER
        // ==========================================
        if (mode === 'OUT') {
            // A. Cek Gerbang: Apakah Admin sedang membuka sesi 'processing'?
            const activeReq = await pool.query("SELECT id FROM request_header WHERE status = 'processing'");
            if (activeReq.rows.length === 0) {
                // Bunyikan buzzer error di ESP32, tampilkan di LCD
                return res.json({ 
                    status: 'error', 
                    lcd_line_1: 'Akses Ditolak!', 
                    lcd_line_2: 'Buka Sesi Admin' 
                });
            }
            const activeRequestId = activeReq.rows[0].id;

            // B. Cari Data Barang di Master
            const itemResult = await pool.query('SELECT id, nama_barang FROM items WHERE barcode = $1 AND is_active = TRUE', [code]);
            if (itemResult.rows.length === 0) {
                return res.json({ 
                    status: 'error', 
                    lcd_line_1: 'Barcode Salah!', 
                    lcd_line_2: 'Tidak Terdaftar' 
                });
            }
            
            const item = itemResult.rows[0];
            const namaLcd = item.nama_barang.substring(0, 16); // Potong maksimal 16 huruf buat LCD

            // C. Gatekeeper Validasi: Cocokkan barang dengan nota yang lagi aktif
            const detailResult = await pool.query(
                `UPDATE request_detail SET is_scanned = true 
                 WHERE request_id = $1 AND item_id = $2 AND is_scanned = false RETURNING id`,
                [activeRequestId, item.id]
            );

            if (detailResult.rows.length === 0) {
                // Barang tidak ada di nota, atau karyawan dobel nge-scan
                return res.json({ 
                    status: 'error', 
                    lcd_line_1: 'Salah Barang!', 
                    lcd_line_2: 'Atau Sdh Discan' 
                });
            }

            // D. Sukses! Barang sesuai nota.
            return res.json({ 
                status: 'success', 
                lcd_line_1: 'Scan Berhasil!', 
                lcd_line_2: namaLcd 
            });
        }

        // ==========================================
        // 2. MODE IN (RESTOCK GUDANG / BARANG MASUK)
        // ==========================================
        if (mode === 'IN') {
            // Cek master barang
            const itemResult = await pool.query('SELECT nama_barang FROM items WHERE barcode = $1', [code]);
            
            if (itemResult.rows.length === 0) {
                // Barang baru yang belum pernah ada
                await pool.query(
                    'INSERT INTO scanner_queue (barcode, mode, status) VALUES ($1, $2, $3)',
                    [code, 'IN', 'PENDING']
                );
                return res.json({ 
                    status: 'success', 
                    lcd_line_1: 'Barang Baru IN!', 
                    lcd_line_2: 'Antre Didaftar' 
                });
            }

            const namaLcd = itemResult.rows[0].nama_barang.substring(0, 16);
            // Masukkan ke antrean restock untuk diproses admin nanti
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

        // Jika string mode yang dikirim ESP32 salah tulis
        return res.status(400).json({ status: 'error', lcd_line_1: 'Mode Salah!', lcd_line_2: mode });

    } catch (err) {
        console.error('Error di API Scanner:', err.message);
        return res.status(500).json({ status: 'error', lcd_line_1: 'System Error!', lcd_line_2: 'Cek Server' });
    }
});

module.exports = router;