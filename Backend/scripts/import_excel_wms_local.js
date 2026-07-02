require("dotenv").config();
const path = require("path");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const EXCEL_PATH = path.join(__dirname, "..", "Database_Barang_Karyawan.xlsx");
const LIMIT = 50;
const DEFAULT_PIN = "123456";
const dryRun = process.argv.includes("--dry");

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const cleaned = clean(value).replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parseItems(workbook) {
  const sheet = workbook.Sheets["List Barang GA"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  const items = [];
  let currentJenis = "Lainnya";

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];

    const no = row[0];
    const namaBarang = clean(row[1]);

    if (clean(no) && !namaBarang && Number.isNaN(Number(clean(no)))) {
      currentJenis = clean(no);
      continue;
    }

    const noNumber = toNumber(no);
    if (!noNumber || !namaBarang) continue;

    const stokMax = toNumber(row[4]);
    const stokSafety = toNumber(row[3]);
    const stokMin = toNumber(row[2]);

    const stokAktual = Math.max(0, Math.round(stokMax ?? stokSafety ?? stokMin ?? 0));
    const barcode = `IMP-BRG-${String(noNumber).padStart(4, "0")}`;

    items.push({
      barcode,
      nama_barang: namaBarang,
      jenis: currentJenis,
      stok_aktual: stokAktual,
    });

    if (items.length >= LIMIT) break;
  }

  return items;
}

function parseUsers(workbook) {
  const sheet = workbook.Sheets["List Karyawan"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  const users = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];

    const nama = clean(row[1]);
    const nik = clean(row[2]);
    const department = clean(row[3]);

    if (!nama || !nik) continue;

    users.push({
      nik,
      nama,
      department,
      tipe_karyawan: "tetap",
      role: "karyawan",
    });

    if (users.length >= LIMIT) break;
  }

  return users;
}

const departmentAliases = {
  "PPC": "PPIC",
  "PE & TOOL MTC": "PE & Tool Maintenance",
  "QUALITY CONTROL": "Quality Assurance",
};

async function getOrCreateDepartmentId(client, departmentName) {
  if (!departmentName) return null;

  const upperName = departmentName.toUpperCase();
  const finalName = departmentAliases[upperName] || departmentName;

  const result = await client.query(
    `
    INSERT INTO departments (nama_dept)
    VALUES ($1)
    ON CONFLICT (nama_dept)
    DO UPDATE SET nama_dept = EXCLUDED.nama_dept
    RETURNING id
    `,
    [finalName]
  );

  return result.rows[0].id;
}

async function main() {
  const workbook = XLSX.readFile(EXCEL_PATH);

  const items = parseItems(workbook);
  const users = parseUsers(workbook);

  console.log("Preview import:");
  console.log(`- Barang ditemukan   : ${items.length}`);
  console.log(`- Karyawan ditemukan : ${users.length}`);
  console.log("");
  console.log("Contoh 5 barang:");
  console.table(items.slice(0, 5));
  console.log("Contoh 5 karyawan:");
  console.table(users.slice(0, 5));

  if (dryRun) {
    console.log("");
    console.log("Mode preview selesai. Belum ada data yang dimasukkan ke database.");
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: String(process.env.DB_SSL).toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : false,
  });

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const item of items) {
      await client.query(
        `
        INSERT INTO items (barcode, nama_barang, jenis, stok_aktual, is_active)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (barcode)
        DO UPDATE SET
          nama_barang = EXCLUDED.nama_barang,
          jenis = EXCLUDED.jenis,
          stok_aktual = EXCLUDED.stok_aktual,
          updated_at = CURRENT_TIMESTAMP,
          is_active = true
        `,
        [item.barcode, item.nama_barang, item.jenis, item.stok_aktual]
      );
    }

    const hashedPin = await bcrypt.hash(DEFAULT_PIN, 10);

    for (const user of users) {
      const departmentId = await getOrCreateDepartmentId(client, user.department);

      await client.query(
        `
        INSERT INTO users (nik, pin, nama, departemen_id, tipe_karyawan, role, is_active)
        VALUES ($1, $2, $3, $4, 'tetap', 'karyawan', true)
        ON CONFLICT (nik)
        DO UPDATE SET
          pin = EXCLUDED.pin,
          nama = EXCLUDED.nama,
          departemen_id = EXCLUDED.departemen_id,
          tipe_karyawan = 'tetap',
          role = 'karyawan',
          is_active = true
        `,
        [user.nik, hashedPin, user.nama, departmentId]
      );
    }

    await client.query("COMMIT");

    console.log("");
    console.log("Import berhasil.");
    console.log(`Barang masuk   : ${items.length}`);
    console.log(`Karyawan masuk : ${users.length}`);
    console.log(`PIN default    : ${DEFAULT_PIN}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import gagal:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
