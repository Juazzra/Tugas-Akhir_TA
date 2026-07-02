require("dotenv").config();
const path = require("path");
const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const EXCEL_PATH = path.join(__dirname, "..", "Database_Barang_Karyawan.xlsx");
const DEFAULT_PIN = "123456";
const dryRun = process.argv.includes("--dry");

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const cleaned = clean(value).replace(/[^\d.-]/g, "");
  if (!cleaned) return 0;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }

  return [...duplicates];
}

function parseItems(workbook) {
  const sheet = workbook.Sheets["List Barang GA"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  const items = [];
  let currentJenis = "Lainnya";

  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];

    const jenisCell = clean(row[0]);
    const namaBarang = clean(row[1]);

    if (jenisCell && !namaBarang) {
      currentJenis = jenisCell;
      continue;
    }

    if (!namaBarang || namaBarang.toUpperCase() === "BARANG") continue;

    const jenis = jenisCell || currentJenis || "Lainnya";
    const stokMin = toNumber(row[2]);
    const stokSafety = toNumber(row[3]);
    const stokMax = toNumber(row[4]);
    const rataKebutuhanBulanan = toNumber(row[5]);
    const hargaPerUnit = toNumber(row[6]);

    const nomor = items.length + 1;

    items.push({
      barcode: `IMP-BRG-${String(nomor).padStart(4, "0")}`,
      nama_barang: namaBarang,
      jenis,
      stok_aktual: Math.max(0, Math.round(stokMax || stokSafety || stokMin || 0)),
      stok_min: Math.max(0, Math.round(stokMin)),
      stok_safety: Math.max(0, Math.round(stokSafety)),
      stok_max: Math.max(0, Math.round(stokMax)),
      rata_kebutuhan_bulanan: Math.max(0, Math.round(rataKebutuhanBulanan)),
      harga_per_unit: Math.max(0, hargaPerUnit),
    });
  }

  return items;
}

function parseUsers(workbook) {
  const sheet = workbook.Sheets["List Karyawan"];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  const users = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const nama = clean(row[1]);
    const nik = clean(row[2]);
    const department = clean(row[3]);

    if (!nama || !nik) continue;
    if (nik.toUpperCase() === "NIK") continue;
    if (nama.toUpperCase().includes("FULL NAME")) continue;

    users.push({
      nik,
      nama,
      department,
      tipe_karyawan: "tetap",
      role: "karyawan",
    });
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

  const duplicateBarcodes = findDuplicates(items.map((item) => item.barcode));
  const duplicateNiks = findDuplicates(users.map((user) => user.nik));

  console.log("Preview import semua data:");
  console.log(`- Total barang Excel    : ${items.length}`);
  console.log(`- Total karyawan Excel  : ${users.length}`);
  console.log(`- Duplikat barcode      : ${duplicateBarcodes.length}`);
  console.log(`- Duplikat NIK          : ${duplicateNiks.length}`);
  if (duplicateNiks.length > 0) {
    console.log("  NIK duplikat:", duplicateNiks.join(", "));
  }

  console.log("");
  console.log("Contoh 10 barang:");
  console.table(items.slice(0, 10));

  console.log("");
  console.log("Contoh 10 karyawan:");
  console.table(users.slice(0, 10));

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
        INSERT INTO items (
          barcode,
          nama_barang,
          jenis,
          stok_aktual,
          foto_barang,
          stok_min,
          stok_safety,
          stok_max,
          rata_kebutuhan_bulanan,
          harga_per_unit,
          is_active
        )
        VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,true)
        ON CONFLICT (barcode)
        DO UPDATE SET
          nama_barang = EXCLUDED.nama_barang,
          jenis = EXCLUDED.jenis,
          stok_aktual = EXCLUDED.stok_aktual,
          stok_min = EXCLUDED.stok_min,
          stok_safety = EXCLUDED.stok_safety,
          stok_max = EXCLUDED.stok_max,
          rata_kebutuhan_bulanan = EXCLUDED.rata_kebutuhan_bulanan,
          harga_per_unit = EXCLUDED.harga_per_unit,
          updated_at = CURRENT_TIMESTAMP,
          is_active = true
        `,
        [
          item.barcode,
          item.nama_barang,
          item.jenis,
          item.stok_aktual,
          item.stok_min,
          item.stok_safety,
          item.stok_max,
          item.rata_kebutuhan_bulanan,
          item.harga_per_unit,
        ]
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
    console.log("Import semua data berhasil.");
    console.log(`Barang diproses   : ${items.length}`);
    console.log(`Karyawan diproses : ${users.length}`);
    console.log(`PIN default       : ${DEFAULT_PIN}`);
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
