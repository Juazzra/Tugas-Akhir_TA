const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken, isAdmin } = require('../middleware/authmiddleware');

// Karyawan: Membuat request baru (Checkout)
router.post('/', verifyToken, requestController.createRequest);

// Karyawan: Melihat history request sendiri
router.get('/me', verifyToken, requestController.getMyRequests);

// Admin: Melihat semua daftar request
router.get('/', verifyToken, isAdmin, requestController.getAllRequests);

// Admin & Karyawan: Lihat detail barang dalam satu nota
router.get('/:id/details', verifyToken, requestController.getRequestDetails);

// Admin: Mulai Serah Terima (Kunci Gerbang ESP32)
router.put('/:id/start-process', verifyToken, isAdmin, requestController.startProcessing);

// Admin: Mengubah status request (Approve/Reject/Batal Sesi)
router.put('/:id/status', verifyToken, isAdmin, requestController.updateRequestStatus);

// Admin: Tombol Selesai Manual (Potong stok & log)
router.post('/:id/complete', verifyToken, isAdmin, requestController.completeHandover);

// Hardware Bridge: Verifikasi scan ESP32 (Otomatis deteksi sesi)
router.put('/scan-verify', verifyToken, requestController.verifyScanItem);

module.exports = router;