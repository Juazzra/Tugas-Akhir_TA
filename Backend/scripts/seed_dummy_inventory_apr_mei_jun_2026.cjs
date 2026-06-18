require("dotenv").config();
const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: String(process.env.DB_SSL).toLowerCase() === "true"
    ? { rejectUnauthorized: false }
    : false,
});

const MONTHS = [
  { month: 4, name: "April" },
  { month: 5, name: "Mei" },
  { month: 6, name: "Juni" },
];

const IN_PER_MONTH = 30;
const OUT_PER_MONTH = 30;
const DUMMY_REASON = "DUMMY_TESTING_EXPORT_CSV_APR_JUN_2026";
const DUMMY_BATCH_ID = crypto.randomUUID();

const pickupOptions = [
  "ambil_sendiri",
  "admin_departemen",
  "admin_hrga",
];

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDateInMonth(year, month) {
  const day = Math.floor(Math.random() * 28) + 1;
  const hour = Math.floor(Math.random() * 9) + 8;
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
}

function randomQty(min = 1, max = 5) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const adminResult = await client.query(`
      SELECT id, nama
      FROM users
      WHERE role = 'admin' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      throw new Error("Tidak ada akun admin aktif. Buat ADMIN001 dulu.");
    }

    const admin = adminResult.rows[0];

    const itemsResult = await client.query(`
      SELECT id, nama_barang
      FROM items
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 50
    `);

    const usersResult = await client.query(`
      SELECT id, nama
      FROM users
      WHERE role = 'karyawan' AND is_active = true
      ORDER BY created_at DESC
      LIMIT 100
    `);

    if (itemsResult.rows.length === 0) {
      throw new Error("Tidak ada barang aktif untuk dummy transaksi.");
    }

    if (usersResult.rows.length === 0) {
      throw new Error("Tidak ada karyawan aktif untuk dummy transaksi.");
    }

    const items = itemsResult.rows;
    const users = usersResult.rows;

    let totalIn = 0;
    let totalOut = 0;

    for (const monthInfo of MONTHS) {
      for (let i = 0; i < IN_PER_MONTH; i++) {
        const item = randomItem(items);
        const qty = randomQty(1, 10);
        const createdAt = randomDateInMonth(2026, monthInfo.month);

        await client.query(
          `
          INSERT INTO inventory_logs
            (item_id, user_id, tipe_transaksi, qty, referensi_id, created_at)
          VALUES
            ($1, $2, 'IN', $3, $4, $5)
          `,
          [item.id, admin.id, qty, DUMMY_BATCH_ID, createdAt]
        );

        totalIn++;
      }

      for (let i = 0; i < OUT_PER_MONTH; i++) {
        const item = randomItem(items);
        const user = randomItem(users);
        const qty = randomQty(1, 3);
        const createdAt = randomDateInMonth(2026, monthInfo.month);
        const pengambilanOleh = randomItem(pickupOptions);

        const requestResult = await client.query(
          `
          INSERT INTO request_header
            (user_id, tgl_pengambilan, status, created_at, updated_at, pengambilan_oleh)
          VALUES
            ($1, $2::date, 'completed', $3, $3, $4)
          RETURNING id
          `,
          [user.id, createdAt, createdAt, pengambilanOleh]
        );

        const requestId = requestResult.rows[0].id;

        await client.query(
          `
          INSERT INTO request_detail
            (request_id, item_id, jumlah, alasan, is_scanned, created_at)
          VALUES
            ($1, $2, $3, $4, true, $5)
          `,
          [requestId, item.id, qty, DUMMY_REASON, createdAt]
        );

        await client.query(
          `
          INSERT INTO inventory_logs
            (item_id, user_id, tipe_transaksi, qty, referensi_id, created_at)
          VALUES
            ($1, $2, 'OUT', $3, $4, $5)
          `,
          [item.id, admin.id, qty, requestId, createdAt]
        );

        totalOut++;
      }
    }

    await client.query("COMMIT");

    console.log("Dummy transaksi berhasil dibuat.");
    console.log(`Batch ID IN dummy : ${DUMMY_BATCH_ID}`);
    console.log(`Dummy reason OUT  : ${DUMMY_REASON}`);
    console.log(`Total IN          : ${totalIn}`);
    console.log(`Total OUT         : ${totalOut}`);
    console.log(`Total logs        : ${totalIn + totalOut}`);
    console.log("Periode           : April, Mei, Juni 2026");
    console.log("Catatan           : stok_aktual tidak diubah.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Gagal membuat dummy transaksi:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
