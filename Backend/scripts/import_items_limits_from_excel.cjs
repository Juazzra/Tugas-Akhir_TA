require("dotenv").config();
const path = require("path");
const XLSX = require("xlsx");
const { Pool } = require("pg");

const EXCEL_PATH = path.join(__dirname, "..", "Database_Barang_Karyawan.xlsx");
const LIMIT = 50;

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

    const stokMin = toNumber(row[2]);
    const stokSafety = toNumber(row[3]);
    const stokMax = toNumber(row[4]);
    const rataKebutuhanBulanan = toNumber(row[5]);
    const hargaPerUnit = toNumber(row[6]);

    items.push({
      barcode: `IMP-BRG-${String(noNumber).padStart(4, "0")}`,
      nama_barang: namaBarang,
      jenis: currentJenis,
      stok_aktual: Math.max(0, Math.round(stokMax || stokSafety || stokMin || 0)),
      stok_min: Math.max(0, Math.round(stokMin)),
      stok_safety: Math.max(0, Math.round(stokSafety)),
      stok_max: Math.max(0, Math.round(stokMax)),
      rata_kebutuhan_bulanan: Math.max(0, Math.round(rataKebutuhanBulanan)),
      harga_per_unit: Math.max(0, hargaPerUnit),
    });

    if (items.length >= LIMIT) break;
  }

  return items;
}

async function main() {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const items = parseItems(workbook);

  console.log(`Barang yang akan diupdate: ${items.length}`);
  console.table(items.slice(0, 10));

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
          stok_min,
          stok_safety,
          stok_max,
          rata_kebutuhan_bulanan,
          harga_per_unit,
          is_active
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
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

    await client.query("COMMIT");

    console.log("");
    console.log("Update stok min/safety/max dari Excel berhasil.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update gagal:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
