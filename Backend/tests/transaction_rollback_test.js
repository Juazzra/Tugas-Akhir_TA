const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gudang_db',
});

async function runTransactionTest() {
  console.log('=== PENGUJIAN SK-07: KEANDALAN TRANSAKSI DATABASE (ROLLBACK) ===');
  
  const client = await pool.connect();
  
  let targetItem = null;
  let initialStock = 0;
  let countBefore = 0;

  try {
    // 1. Cek stok awal item dengan ID 1 (pastikan item ini ada di database)
    const itemCheck = await client.query('SELECT stok_aktual, nama_barang FROM items LIMIT 1');
    if (itemCheck.rows.length === 0) {
      throw new Error('Tidak ada barang di tabel items untuk diuji.');
    }
    
    targetItem = itemCheck.rows[0];
    initialStock = targetItem.stok_aktual;
    console.log(`\nBarang target     : ${targetItem.nama_barang}`);
    console.log(`Stok awal         : ${initialStock}`);

    console.log('\n[Memulai Transaksi...] (BEGIN)');
    await client.query('BEGIN');

    // 2. Simulasi pencatatan log (seolah-olah transaksi berhasil di tahap awal)
    console.log('-> Insert log transaksi palsu ke tabel inventory_logs...');
    
    // Hitung jumlah log awal untuk perbandingan
    const logBefore = await client.query('SELECT COUNT(*) FROM inventory_logs');
    countBefore = parseInt(logBefore.rows[0].count);

    await client.query(`
      INSERT INTO inventory_logs (item_id, user_id, tipe_transaksi, qty)
      VALUES (
        (SELECT id FROM items LIMIT 1), 
        (SELECT id FROM users WHERE role = 'Admin' LIMIT 1), 
        'OUT', 1000
      )
    `);

    // 3. Simulasi potong stok melebihi jumlah (memicu error CHECK stok_aktual >= 0)
    console.log(`-> Memotong stok sebanyak 10,000 unit (melebihi stok yang ada)...`);
    await client.query(`
      UPDATE items 
      SET stok_aktual = stok_aktual - 10000 
      WHERE nama_barang = $1
    `, [targetItem.nama_barang]);

    // Jika sampai ke baris ini, berarti tidak terjadi error (Constraint Check gagal bekerja)
    await client.query('COMMIT');
    console.log('❌ Status: GAGAL (Transaksi berhasil padahal stok tidak cukup)');

  } catch (error) {
    console.log(`\n[Terjadi Error Database!]`);
    console.log(`Pesan Error       : ${error.message}`);
    
    console.log('\n[Membatalkan Transaksi...] (ROLLBACK)');
    await client.query('ROLLBACK');

    // 4. Verifikasi Data (Memastikan ROLLBACK berhasil)
    console.log('\nMemverifikasi Integritas Database...');
    const verifyStock = await client.query('SELECT stok_aktual FROM items WHERE nama_barang = $1', [targetItem.nama_barang]);
    const currentStock = verifyStock.rows[0].stok_aktual;
    
    const verifyLog = await client.query("SELECT COUNT(*) FROM inventory_logs");
    const logCountAfter = parseInt(verifyLog.rows[0].count);

    console.log(`Stok akhir         : ${currentStock} (Harusnya sama dengan stok awal: ${initialStock})`);
    console.log(`Jumlah log akhir   : ${logCountAfter} (Harusnya sama dengan awal: ${countBefore})`);

    if (currentStock === initialStock && logCountAfter === countBefore) {
      console.log('\n✅ Status: LULUS (Database berhasil melakukan ROLLBACK penuh. Tidak ada data parsial yang tersimpan)');
    } else {
      console.log('\n❌ Status: GAGAL (Terdapat kebocoran data / ROLLBACK tidak sempurna)');
    }

  } finally {
    client.release();
    pool.end();
  }
}

runTransactionTest();
