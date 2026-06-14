require("dotenv").config();
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: String(process.env.DB_SSL).toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : false,
  });

  const pin = await bcrypt.hash("123456", 10);

  const deptResult = await pool.query(
    "SELECT id FROM departments WHERE nama_dept = $1 LIMIT 1",
    ["HRGA"]
  );

  const deptId = deptResult.rows[0]?.id || null;

  await pool.query(
    `
    INSERT INTO users (nik, pin, nama, departemen_id, tipe_karyawan, role, is_active)
    VALUES ($1, $2, $3, $4, 'tetap', 'admin', true)
    ON CONFLICT (nik)
    DO UPDATE SET
      pin = EXCLUDED.pin,
      nama = EXCLUDED.nama,
      departemen_id = EXCLUDED.departemen_id,
      tipe_karyawan = 'tetap',
      role = 'admin',
      is_active = true
    `,
    ["ADMIN001", pin, "Admin Local", deptId]
  );

  console.log("Admin lokal siap: ADMIN001 / 123456");

  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
