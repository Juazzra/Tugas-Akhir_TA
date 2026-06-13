const pool = require('./src/config/db');

const migrate = async () => {
  try {
    console.log('Starting migration...');
    const sql = `
      ALTER TABLE public.items 
      ADD COLUMN IF NOT EXISTS stok_min integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stok_safety integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS stok_max integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rata_kebutuhan_bulanan integer DEFAULT 0,
      ADD COLUMN IF NOT EXISTS harga_per_unit numeric(15, 2) DEFAULT 0.00;
    `;
    await pool.query(sql);
    console.log('Migration successfully completed!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
