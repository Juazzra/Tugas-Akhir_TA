const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Endpoint yang bisa diakses Admin & Karyawan
router.get('/', verifyToken, itemController.getAllItems);
router.get('/:id', verifyToken, itemController.getItemById);

// Endpoint Khusus Admin
router.post('/', verifyToken, isAdmin, itemController.createItem);
router.get('/logs', verifyToken, isAdmin, itemController.getInventoryLogs); // Pindah ke atas agar aman

// [+] TAMBAHAN BARU
router.put('/:id', verifyToken, isAdmin, itemController.updateItem);
router.delete('/:id', verifyToken, isAdmin, itemController.deleteItem);

module.exports = router;