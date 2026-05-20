const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Endpoint Publik
router.post('/login', userController.login);

// ==========================================
// AREA KARYAWAN (Butuh Token Login Biasa)
// ==========================================
// Rute /me WAJIB ditaruh di atas rute /:id
router.get('/me', verifyToken, userController.getMyProfile);
router.put('/me', verifyToken, userController.updateMyProfile);
router.put('/me/change-pin', verifyToken, userController.changeMyPin);
router.post('/me/photo', verifyToken, userController.uploadFotoProfil);
// ==========================================
// AREA TERTUTUP (Khusus Admin)
// ==========================================
router.post('/register', verifyToken, isAdmin, userController.register);
router.get('/', verifyToken, isAdmin, userController.getAllUsers);
router.put('/:id', verifyToken, isAdmin, userController.updateUserByAdmin);
router.put('/:id/reset-pin', verifyToken, isAdmin, userController.resetPinByAdmin);
router.put('/:id', verifyToken, isAdmin, userController.updateUserByAdmin);

// Endpoint Delete (Bisa query ?type=hard atau ?type=soft)
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);

module.exports = router;