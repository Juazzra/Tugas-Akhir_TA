const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Endpoint Lihat Barang (Semua user yang login boleh akses)
router.get('/', verifyToken, itemController.getAllItems);

// Endpoint Tambah Barang (Hanya ADMIN yang boleh akses)
router.post('/', verifyToken, isAdmin, itemController.createItem);

module.exports = router;