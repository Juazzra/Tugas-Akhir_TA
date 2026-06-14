const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Ambil konfigurasi provider penyimpanan (default: supabase)
const storageProvider = process.env.STORAGE_PROVIDER || 'supabase';

let supabaseClient = null;
if (storageProvider === 'supabase') {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    } else {
        console.warn('Peringatan: Konfigurasi Supabase tidak lengkap. Menggunakan penyimpanan lokal.');
    }
}

/**
 * Mengunggah file (dalam bentuk buffer) ke media penyimpanan yang aktif (Supabase atau Lokal)
 * @param {string} filePath - Relatif path file (contoh: 'Items/item_123.jpg')
 * @param {Buffer} buffer - Buffer data file
 * @param {string} contentType - Tipe konten (contoh: 'image/jpeg')
 * @returns {Promise<string>} URL publik akses file
 */
async function uploadFile(filePath, buffer, contentType) {
    // Bersihkan karakter slash di depan jika ada
    const cleanFilePath = filePath.replace(/^\/+/, '');

    if (storageProvider === 'supabase' && supabaseClient) {
        // Simpan ke Supabase Storage
        const { error } = await supabaseClient.storage
            .from('uploads')
            .upload(cleanFilePath, buffer, { contentType, upsert: true });

        if (error) {
            throw new Error(`Gagal mengunggah ke Supabase: ${error.message}`);
        }

        const { data } = supabaseClient.storage.from('uploads').getPublicUrl(cleanFilePath);
        return data.publicUrl;
    } else {
        // Simpan ke Folder static lokal: Backend/src/uploads/
        const absolutePath = path.join(__dirname, '../uploads', cleanFilePath);
        const directory = path.dirname(absolutePath);

        // Buat folder tujuan (termasuk subfolder) jika belum ada secara otomatis
        await fs.promises.mkdir(directory, { recursive: true });

        // Tulis file ke penyimpanan lokal
        await fs.promises.writeFile(absolutePath, buffer);

        // Buat URL publik lokal menggunakan APP_URL (default ke port 3000)
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        return `${appUrl}/uploads/${cleanFilePath}`;
    }
}

module.exports = {
    uploadFile
};
