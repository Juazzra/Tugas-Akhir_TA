const multer = require('multer');

// Gunakan memoryStorage agar file tidak tersimpan di lokal PC
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Hanya boleh mengunggah file gambar!'), false);
    }
};

const uploadBukti = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Batas 5MB
});

module.exports = { uploadBukti };