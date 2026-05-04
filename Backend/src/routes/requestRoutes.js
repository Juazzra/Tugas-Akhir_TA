const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Karyawan: Membuat request baru (Cukup punya token login)
router.post('/', verifyToken, requestController.createRequest);

// Admin: Melihat semua daftar request
router.get('/', verifyToken, isAdmin, requestController.getAllRequests);

// (Taruh di atas rute '/:id/status' agar tidak bentrok)
router.get('/me', verifyToken, requestController.getMyRequests);
router.get('/:id/details', verifyToken, requestController.getRequestDetails);

// Admin: Mengubah status request (Approve/Reject)
router.put('/:id/status', verifyToken, isAdmin, requestController.updateRequestStatus);

// Hardware Bridge: Verifikasi scan barang keluar
router.put('/scan-verify', verifyToken, requestController.verifyScanItem);

// Admin: Selesaikan serah terima (potong stok & log)
router.post('/:id/complete', verifyToken, isAdmin, requestController.completeHandover);

module.exports = router;