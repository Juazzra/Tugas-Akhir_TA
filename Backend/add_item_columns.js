const pool = require('./src/config/db.js');

async function updateTable() {
    try {
        await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS foto_barang TEXT');
        console.log('Column foto_barang added successfully');
        
        await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
        console.log('Column is_active added successfully');
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateTable();
