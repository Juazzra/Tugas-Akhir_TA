const pool = require('./src/config/db.js');

async function setStockToZero() {
    try {
        const result = await pool.query(`
            UPDATE items 
            SET stok_aktual = 0 
            WHERE id = (SELECT id FROM items WHERE is_active = true LIMIT 1)
            RETURNING nama_barang, stok_aktual;
        `);
        
        if (result.rows.length > 0) {
            console.log(`Berhasil mengubah stok "${result.rows[0].nama_barang}" menjadi ${result.rows[0].stok_aktual}.`);
        } else {
            console.log('Tidak ada barang aktif di database.');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

setStockToZero();
