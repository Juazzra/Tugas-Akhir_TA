const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Rute POST untuk scanner ESP32
router.post('/', async (req, res) => {
    // ==========================================
    // SECURITY PATCH: GATEKEEPER API KEY VIA .ENV
    // ==========================================
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ESP32_API_KEY; 

    if (!validApiKey) {
        console.error('CRITICAL ERROR: ESP32_API_KEY belum di-set di file .env!');
        return res.status(500).json({ status: 'error', lcd_line_1: 'SYSTEM ERROR', lcd_line_2: 'NO API KEY' });
    }

    if (apiKey !== validApiKey) {
        console.warn('⚠️  PERINGATAN: Akses ditolak! Key tidak cocok.');
        return res.status(401).json({ status: 'error', lcd_line_1: 'AKSES DITOLAK!', lcd_line_2: 'UNAUTHORIZED' });
    }
    // ==========================================

    // Simpan status IP & waktu terakhir aktif scanner
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if (ip && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }
        if (ip && ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }
        
        const fs = require('fs');
        const path = require('path');
        const statusFilePath = path.join(__dirname, '../config/scanner_status.json');
        
        const configDir = path.dirname(statusFilePath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        const statusData = {
            ip: ip || '127.0.0.1',
            lastSeen: new Date().toISOString()
        };
        
        fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2), 'utf8');
    } catch (e) {
        console.error('Gagal mencatat status scanner:', e.message);
    }

    try {
        // --- SANITASI DATA ---
        const code = req.body.code ? String(req.body.code).trim() : null;
        const mode = req.body.mode ? String(req.body.mode).trim() : null;

        if (!code || !mode) {
            return res.status(400).json({ status: 'error', lcd_line_1: 'Data Kosong!', lcd_line_2: 'Cek Alat Scan' });
        }

        // ==========================================
        // 1. MODE OUT (SERAH TERIMA BARANG KARYAWAN)
        // ==========================================
        if (mode === 'OUT') {
            // A. Cek Gerbang: Apakah Admin sedang membuka sesi 'processing'?
            const activeReq = await pool.query("SELECT id FROM request_header WHERE status = 'processing'");
            if (activeReq.rows.length === 0) {
                return res.json({ status: 'error', lcd_line_1: 'Akses Ditolak!', lcd_line_2: 'Buka Sesi Admin' });
            }
            const activeRequestId = activeReq.rows[0].id;

            // B. Cari Data Barang di Master
            const itemResult = await pool.query(
                'SELECT id, nama_barang FROM items WHERE barcode = $1 AND is_active = TRUE', [code]
            );
            
            if (itemResult.rows.length === 0) {
                return res.json({ status: 'error', lcd_line_1: 'Barcode Salah!', lcd_line_2: 'Tidak Terdaftar' });
            }
            
            const item = itemResult.rows[0];
            const namaLcd = item.nama_barang.substring(0, 16); 

            // C. Gatekeeper Validasi: Ceklis HANYA 1 BARANG per ketukan scan menggunakan ctid
            const detailResult = await pool.query(
                `UPDATE request_detail SET is_scanned = true 
                 WHERE ctid = (
                     SELECT ctid FROM request_detail 
                     WHERE request_id = $1 AND item_id = $2 AND is_scanned = false 
                     LIMIT 1
                 ) RETURNING *`,
                [activeRequestId, item.id]
            );

            if (detailResult.rows.length === 0) {
                return res.json({ status: 'error', lcd_line_1: 'Salah Barang!', lcd_line_2: 'Atau Sdh Discan' });
            }

            // D. Sukses! Tinggalkan jejak scan (History) di tabel scanner_queue
            await pool.query(
                'INSERT INTO scanner_queue (barcode, mode, status) VALUES ($1, $2, $3)',
                [code, 'OUT', 'PENDING'] 
            );

            return res.json({ status: 'success', lcd_line_1: 'Scan Berhasil!', lcd_line_2: namaLcd });
        }

        // ==========================================
        // 2. MODE IN (RESTOCK GUDANG / BARANG MASUK)
        // ==========================================
        if (mode === 'IN') {
            const queueCheck = await pool.query("SELECT id FROM scanner_queue WHERE barcode = $1 AND status = 'PENDING' AND mode = 'IN'", [code]);
            if (queueCheck.rows.length > 0) return res.json({ status: 'success', lcd_line_1: 'Sudah Masuk!', lcd_line_2: 'Tunggu Konfirmasi' });

            const itemResult = await pool.query('SELECT nama_barang FROM items WHERE barcode = $1', [code]);
            
            if (itemResult.rows.length === 0) {
                await pool.query('INSERT INTO scanner_queue (barcode, mode, status) VALUES ($1, $2, $3)', [code, 'IN', 'PENDING']);
                return res.json({ status: 'success', lcd_line_1: 'Barang Baru IN!', lcd_line_2: 'Antre Didaftar' });
            }

            const namaLcd = itemResult.rows[0].nama_barang.substring(0, 16);
            await pool.query('INSERT INTO scanner_queue (barcode, mode, status) VALUES ($1, $2, $3)', [code, 'IN', 'PENDING']);
            return res.json({ status: 'success', lcd_line_1: 'Antrean MASUK:', lcd_line_2: namaLcd });
        }

        return res.status(400).json({ status: 'error', lcd_line_1: 'Mode Salah!', lcd_line_2: mode });

    } catch (err) {
        console.error('Error di API Scanner:', err.message);
        return res.status(500).json({ status: 'error', lcd_line_1: 'System Error!', lcd_line_2: 'Cek Server' });
    }
});

// Rute GET untuk mengecek status koneksi scanner
const { verifyToken, isAdmin } = require('../middleware/authmiddleware');
router.get('/status', verifyToken, isAdmin, async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const { exec } = require('child_process');
    const statusFilePath = path.join(__dirname, '../config/scanner_status.json');
    
    let statusData = { ip: null, lastSeen: null };
    try {
        if (fs.existsSync(statusFilePath)) {
            statusData = JSON.parse(fs.readFileSync(statusFilePath, 'utf8'));
        }
    } catch (e) {
        console.error('Gagal membaca file status scanner:', e.message);
    }
    
    if (!statusData.ip) {
        return res.json({
            connected: false,
            ip: null,
            lastSeen: null,
            message: 'Scanner belum pernah terhubung'
        });
    }
    
    // Bersihkan IP dari karakter aneh untuk menghindari command injection
    const cleanIp = statusData.ip.replace(/[^0-9a-fA-F.:]/g, '');
    if (!cleanIp) {
        return res.json({
            connected: false,
            ip: null,
            lastSeen: statusData.lastSeen,
            message: 'Format IP scanner tidak valid'
        });
    }

    // Ping IP address scanner
    const isWindows = process.platform === 'win32';
    const cmd = isWindows 
        ? `ping -n 1 -w 1000 ${cleanIp}` 
        : `ping -c 1 -W 1 ${cleanIp}`;
        
    exec(cmd, (error, stdout, stderr) => {
        let isConnected = false;
        
        if (stdout) {
            const out = stdout.toLowerCase();
            const hasTimeout = out.includes('timed out') || out.includes('waktu habis');
            const hasUnreachable = out.includes('unreachable') || out.includes('tidak terjangkau');
            const hasLoss100 = out.includes('100% loss') || out.includes('100% kegagalan');
            const hasReply = out.includes('reply from') || out.includes('balasan dari');
            
            if (isWindows) {
                isConnected = hasReply && !hasTimeout && !hasUnreachable && !hasLoss100;
            } else {
                isConnected = !error && !hasLoss100;
            }
        } else {
            isConnected = !error;
        }

        // Proteksi Loopback/Localhost:
        // Karena loopback IP (127.0.0.1 atau ::1) selalu aktif, kita anggap tersambung
        // hanya jika scan terakhir dilakukan dalam 30 detik terakhir.
        if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
            const lastSeenDate = new Date(statusData.lastSeen);
            const now = new Date();
            const diffSec = (now - lastSeenDate) / 1000;
            if (diffSec > 30) {
                isConnected = false;
            }
        }

        return res.json({
            connected: isConnected,
            ip: cleanIp,
            lastSeen: statusData.lastSeen,
            message: isConnected ? 'Scanner terhubung' : 'Scanner tidak terjangkau (Offline)'
        });
    });
});

module.exports = router;

