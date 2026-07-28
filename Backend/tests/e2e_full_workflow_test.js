const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Setup database pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gudang_db',
    ssl: (process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : false
});

// Helper for making HTTP fetch requests locally
async function request(serverUrl, method, endpoint, headers = {}, body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const res = await fetch(`${serverUrl}${endpoint}`, options);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
}

async function runE2ETest() {
    console.log('===========================================================');
    console.log('🚀 MEMULAI PENGUJIAN END-TO-END (E2E) SISTEM WMS');
    console.log('===========================================================\n');

    // 1. Inisialisasi Express Server versi pengujian (Port 3999)
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '2mb' }));
    app.use(express.urlencoded({ limit: '1mb', extended: true }));

    app.use('/api/items', require('../src/routes/itemroutes'));
    app.use('/api/requests', require('../src/routes/requestRoutes'));
    app.use('/api/users', require('../src/routes/userRoutes'));
    app.use('/api/scanner', require('../src/routes/scanner'));
    app.use('/api/inventory-logs', require('../src/routes/logRoutes'));

    const TEST_PORT = 3999;
    const server = app.listen(TEST_PORT);
    const BASE_URL = `http://localhost:${TEST_PORT}`;

    let adminToken = null;
    let employeeToken = null;
    let testRequestId = null;
    let targetItem = null;
    let initialStock = 0;

    try {
        // -------------------------------------------------------------
        // TAHAP 1: AUTHENTICATION (LOGIN ADMIN & KARYAWAN)
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 1/7] Otentikasi Pengguna (Login)');
        
        // Admin Login
        const adminLogin = await request(BASE_URL, 'POST', '/api/users/login', {}, {
            nik: 'HRG001',
            pin: '123456'
        });
        if (adminLogin.status !== 200 || !adminLogin.data.token) {
            throw new Error(`Gagal Login Admin: ${JSON.stringify(adminLogin.data)}`);
        }
        adminToken = adminLogin.data.token;
        console.log('  ✅ Admin Login Berhasil (NIK: HRG001)');

        // Employee Login
        const empLogin = await request(BASE_URL, 'POST', '/api/users/login', {}, {
            nik: 'SEC001',
            pin: '123456'
        });
        if (empLogin.status !== 200 || !empLogin.data.token) {
            throw new Error(`Gagal Login Karyawan: ${JSON.stringify(empLogin.data)}`);
        }
        employeeToken = empLogin.data.token;
        console.log('  ✅ Karyawan Login Berhasil (NIK: SEC001)\n');

        // -------------------------------------------------------------
        // TAHAP 2: CEK ITEM & KETERSEDIAAN STOK
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 2/7] Pengecekan Catalog & Stok Barang');
        const itemsRes = await request(BASE_URL, 'GET', '/api/items', {
            'Authorization': `Bearer ${employeeToken}`
        });

        const itemsList = itemsRes.data?.data || itemsRes.data;
        if (itemsRes.status !== 200 || !Array.isArray(itemsList) || itemsList.length === 0) {
            throw new Error(`Gagal mengambil daftar barang atau catalog kosong: ${JSON.stringify(itemsRes.data)}`);
        }

        // Cari item "Seragam XL" atau item pertama yang aktif
        targetItem = itemsList.find(i => i.barcode === '899123456002') || itemsList[0];
        initialStock = targetItem.stok_aktual;
        console.log(`  📦 Barang Target : ${targetItem.nama_barang} (Barcode: ${targetItem.barcode})`);
        console.log(`  📊 Stok Awal     : ${initialStock} unit`);

        // Jika stok 0, tambahkan stok sementara via database untuk keperluan testing
        if (initialStock === 0) {
            console.log('  ⚠️  Stok 0, menambahkan stok dummy +10 unit untuk testing...');
            await pool.query('UPDATE items SET stok_aktual = 10 WHERE id = $1', [targetItem.id]);
            initialStock = 10;
        }
        console.log('');

        // -------------------------------------------------------------
        // TAHAP 3: KARYAWAN BUAT PERMINTAAN BARANG (CHECKOUT REQUEST)
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 3/7] Karyawan Membuat Permintaan Barang (Checkout)');
        const createReqRes = await request(BASE_URL, 'POST', '/api/requests', {
            'Authorization': `Bearer ${employeeToken}`
        }, {
            tgl_pengambilan: '2026-08-01',
            keranjang: [
                {
                    item_id: targetItem.id,
                    jumlah: 1,
                    alasan: 'Testing E2E Automated Flow'
                }
            ]
        });

        if (createReqRes.status !== 201 || !createReqRes.data.request_id) {
            throw new Error(`Gagal membuat request: ${JSON.stringify(createReqRes.data)}`);
        }
        testRequestId = createReqRes.data.request_id;
        console.log(`  ✅ Request Berhasil Dibuat (Request ID: ${testRequestId})\n`);

        // -------------------------------------------------------------
        // TAHAP 4: ADMIN APPROVE & BUKA SESI PROCESSING
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 4/7] Admin Menyetujui Request & Membuka Gerbang Processing');
        
        // Approve
        const approveRes = await request(BASE_URL, 'PUT', `/api/requests/${testRequestId}/status`, {
            'Authorization': `Bearer ${adminToken}`
        }, { status: 'approved' });
        if (approveRes.status !== 200) {
            throw new Error(`Gagal Approve Request: ${JSON.stringify(approveRes.data)}`);
        }
        console.log('  ✅ Status Request di-Update -> APPROVED');

        // Start Process (Kunci Sesi ESP32)
        const startRes = await request(BASE_URL, 'PUT', `/api/requests/${testRequestId}/start-process`, {
            'Authorization': `Bearer ${adminToken}`
        });
        if (startRes.status !== 200) {
            throw new Error(`Gagal Membuka Sesi Processing: ${JSON.stringify(startRes.data)}`);
        }
        console.log('  ✅ Sesi Serah Terima Dibuka -> PROCESSING (Gerbang Scanner Aktif)\n');

        // -------------------------------------------------------------
        // TAHAP 5: SIMULASI HARDWARE SCANNER ESP32 (IOT GATEKEEPER)
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 5/7] Simulasi Hardware ESP32 Melakukan Scan Barcode');
        const apiKey = process.env.ESP32_API_KEY || 'kunci_rahasia_iot_2026';
        const scanRes = await request(BASE_URL, 'POST', '/api/scanner', {
            'x-api-key': apiKey
        }, {
            code: targetItem.barcode,
            mode: 'OUT'
        });

        if (scanRes.status !== 200 || scanRes.data.status !== 'success') {
            throw new Error(`Gagal Scan Barcode ESP32: ${JSON.stringify(scanRes.data)}`);
        }
        console.log(`  📟 Response LCD ESP32 : "${scanRes.data.lcd_line_1} - ${scanRes.data.lcd_line_2}"`);
        console.log('  ✅ Barcode Fisik Terverifikasi & Ter-centang di Sistem!\n');

        // -------------------------------------------------------------
        // TAHAP 6: ADMIN SELESAIKAN SERAH TERIMA & POTONG STOK
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 6/7] Admin Menyelesaikan Serah Terima (Complete Handover)');
        const completeRes = await request(BASE_URL, 'POST', `/api/requests/${testRequestId}/complete`, {
            'Authorization': `Bearer ${adminToken}`
        }, {
            pengambilan_oleh: 'ambil_sendiri'
        });

        if (completeRes.status !== 200) {
            throw new Error(`Gagal Memproses Complete Handover: ${JSON.stringify(completeRes.data)}`);
        }
        console.log('  ✅ Transaksi Dinyatakan COMPLETED! Stok dipotong otomatis.\n');

        // -------------------------------------------------------------
        // TAHAP 7: VERIFIKASI INTEGRITAS DATABASE & LOGS
        // -------------------------------------------------------------
        console.log('📌 [TAHAP 7/7] Verifikasi Integritas Data & Mutasi Stok');
        
        // Verifikasi Stok Berkurang
        const updatedItemQ = await pool.query('SELECT stok_aktual FROM items WHERE id = $1', [targetItem.id]);
        const finalStock = updatedItemQ.rows[0].stok_aktual;
        console.log(`  📉 Stok Akhir Barang : ${finalStock} unit (Stok Awal: ${initialStock})`);
        
        if (finalStock !== initialStock - 1) {
            throw new Error(`Pemotongan stok tidak presisi! Harusnya ${initialStock - 1}, tetapi tercatat ${finalStock}`);
        }
        console.log('  ✅ Pengurangan Stok Tepat -1 Unit!');

        // Verifikasi Inventory Logs
        const logQ = await pool.query('SELECT * FROM inventory_logs WHERE referensi_id = $1', [testRequestId]);
        if (logQ.rows.length === 0) {
            throw new Error('Log transaksi tidak ditemukan di tabel inventory_logs!');
        }
        console.log(`  📋 Log Riwayat       : ${logQ.rows[0].tipe_transaksi} | Qty: ${logQ.rows[0].qty} | Ref ID: ${logQ.rows[0].referensi_id}`);
        console.log('  ✅ Audit Log Terbikin Sempurna!');

        console.log('\n===========================================================');
        console.log('🎉 PENGUJIAN END-TO-END (E2E) SELESAI & 100% LULUS!');
        console.log('===========================================================\n');

    } catch (err) {
        console.error('\n❌ PENGUJIAN E2E GAGAL!');
        console.error(`Pesan Error: ${err.message}\n`);
    } finally {
        server.close();
        await pool.end();
    }
}

runE2ETest();
