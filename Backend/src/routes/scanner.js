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

module.exports = router;