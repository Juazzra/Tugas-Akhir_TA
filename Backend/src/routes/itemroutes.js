const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemcontroller');
const { verifyToken, isAdmin } = require('../middleware/authmiddleware');

// Endpoint yang bisa diakses Admin & Karyawan
router.get('/', verifyToken, itemController.getAllItems);

// --- [TABAHAN BARU UNTUK FITUR RESTOCK IN] ---
// Harus ditaruh SEBELUM rute GET /:id supaya kata "restock-queue" gak dikira ID!
router.get('/restock/queue', verifyToken, isAdmin, itemController.getRestockQueue);
router.post('/restock/approve', verifyToken, isAdmin, itemController.approveRestock);
router.post('/restock/reject', verifyToken, isAdmin, itemController.rejectRestock);
// ----------------------------------------------

router.get('/logs', verifyToken, isAdmin, itemController.getInventoryLogs);
router.get('/:id', verifyToken, itemController.getItemById);

// Endpoint Khusus Admin
router.post('/', verifyToken, isAdmin, itemController.createItem);
router.put('/:id', verifyToken, isAdmin, itemController.updateItem);
router.delete('/:id', verifyToken, isAdmin, itemController.deleteItem);

module.exports = router;