# Sistem Overview - Warehouse Management System (WMS)

## Deskripsi Singkat Proyek
**Nama Sistem:** Warehouse Management System (WMS) terintegrasi Scanner ESP32  
**Masalah yang Diselesaikan:**  
Menggantikan pencatatan stok dan serah terima barang manual dengan sistem digital yang aman, otomatis, dan minim kesalahan. Sistem ini mengamankan pengeluaran barang dengan sistem "Sesi Serah Terima" yang dikawal oleh Admin, mencegah *scanning* liar.
**Pengguna Utama:**  
1. **Admin Gudang:** Mengelola master barang, menyetujui *request*, mengawal serah terima barang keluar, mendaftarkan barang restock (masuk), dan memonitor *log* riwayat inventaris.  
2. **Karyawan / Staff:** Mengajukan *request* barang (keranjang/checkout) dengan bukti foto dan alasan pengambilan, serta melacak status *request* mereka.

---

## Tech Stack & Environment
* **Backend:** Node.js dengan framework Express.js
* **Frontend:** Vue.js 3 (Composition API) + Vite + Pinia (State Management)
* **Database:** PostgreSQL (berjalan secara lokal atau via Supabase)
* **Keamanan:** JWT (*JSON Web Token*) untuk Autentikasi User, Bcrypt untuk *hashing PIN/Password*.
* **Hardware:** Modul *Scanner Barcode* ESP32 yang terhubung ke internet dan mengirim HTTP POST *Request* ke *Backend* dilindungi oleh `x-api-key`.
* **Storage:** Local / Supabase Storage (bergantung pada konfigurasi environment).

---

## Arsitektur & Struktur Folder
Proyek ini dipisahkan menjadi *Frontend* dan *Backend* secara *decoupled*.

```text
/Tugas Akhir
│
├── Backend/                    # Logika Bisnis & API Utama
│   ├── src/
│   │   ├── config/             # Koneksi Database PostgreSQL (db.js)
│   │   ├── controllers/        # Logika utama (userController, itemcontroller, requestController, dsb)
│   │   ├── routes/             # Definisi Endpoint API (itemroutes, userRoutes, scanner.js)
│   │   ├── middleware/         # Autentikasi JWT & Role Check
│   │   └── utils/              # Helper untuk Storage (Upload foto)
│   └── database.sql            # (Opsional) Struktur awal database
│
├── Frontend/                   # Antarmuka Pengguna (UI)
│   ├── src/
│   │   ├── api/                # Konfigurasi Axios & interceptors
│   │   ├── stores/             # Pinia Store (authStore, cartStore)
│   │   ├── views/              
│   │   │   ├── admin/          # Kumpulan halaman Admin (Dashboard, Master, Restock, Request, Logs)
│   │   │   ├── client/         # Kumpulan halaman Karyawan (Katalog Belanja, Status Request)
│   │   │   └── auth/           # Halaman Login
│   │   └── components/         # (Jika ada) Komponen Vue yang digunakan ulang
│   └── .env                    # Variabel environment Vite (VITE_API_BASE_URL)
│
└── hardware/                   # Berisi kode C++/Arduino untuk modul ESP32 Scanner
```

---

## Skema Database (Inti)
Berikut adalah gambaran relasi dan skema tabel utama pada database PostgreSQL:

```sql
-- Tabel Departemen Karyawan
CREATE TABLE departments (
    id integer PRIMARY KEY,
    nama_dept varchar(100) NOT NULL
);

-- Tabel Pengguna (Admin & Karyawan)
CREATE TABLE users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nik varchar(20) NOT NULL UNIQUE,
    pin varchar(255) NOT NULL,
    nama varchar(100) NOT NULL,
    departemen_id integer REFERENCES departments(id),
    role varchar(20) CHECK (role IN ('admin', 'karyawan')),
    is_active boolean DEFAULT true
);

-- Tabel Master Barang
CREATE TABLE items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode varchar(100) NOT NULL UNIQUE,
    nama_barang varchar(150) NOT NULL,
    jenis varchar(50),
    stok_aktual integer DEFAULT 0 CHECK (stok_aktual >= 0),
    stok_min integer DEFAULT 0,
    foto_barang text,
    is_active boolean DEFAULT true
);

-- Tabel Antrean Scanner Hardware
CREATE TABLE scanner_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    barcode varchar(100) NOT NULL,
    mode varchar(10) CHECK (mode IN ('IN', 'OUT')),
    status varchar(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    scanned_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Header Request (Keranjang Checkout Karyawan)
CREATE TABLE request_header (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    tgl_pengambilan date NOT NULL,
    status varchar(30) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'processing', 'waiting_pickup', 'completed', 'rejected')),
    pengambilan_oleh varchar(50),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Detail Request (Item dalam Keranjang)
CREATE TABLE request_detail (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id uuid REFERENCES request_header(id) ON DELETE CASCADE,
    item_id uuid REFERENCES items(id),
    jumlah integer NOT NULL CHECK (jumlah > 0),
    alasan varchar(100),
    foto_bukti text,
    is_scanned boolean DEFAULT false
);

-- Tabel History Log Keluar/Masuk Barang
CREATE TABLE inventory_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id uuid REFERENCES items(id),
    user_id uuid REFERENCES users(id),
    tipe_transaksi varchar(10) CHECK (tipe_transaksi IN ('IN', 'OUT')),
    qty integer NOT NULL CHECK (qty > 0),
    referensi_id uuid, -- Merujuk ke request_header(id) jika tipe_transaksi OUT
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);
```

---

## Alur Utama (Core Flow)

### 1. Alur Masuk Barang (Restock - Mode IN)
* **Scan Fisik:** Admin mengubah *scanner hardware* ke Mode "IN" dan men-scan *barcode* fisik barang dari *supplier*.
* **Masuk Antrean (Queue):** *Hardware* mengirim HTTP POST ke `/api/scanner`. Sistem mencatatnya di `scanner_queue` sebagai *PENDING*. Jika barang belum ada di master, *scanner* tetap menerima, namun Admin tidak akan bisa menyetujuinya di Web sebelum mendaftarkannya terlebih dahulu.
* **Approval & Eksekusi:** Di Web (Menu Restock), Admin memasukkan kuantitas (QTY) dan menekan "Approve". Sistem memperbarui `stok_aktual` pada tabel `items`, lalu membuat catatan `IN` di tabel `inventory_logs`.

### 2. Alur Keluar Barang (Pengajuan & Serah Terima - Mode OUT)
* **Pembuatan Request (Staff):** Karyawan memilih barang di katalog, memasukkan ke keranjang, melampirkan alasan (serta foto jika alasan rusak/hilang), lalu mengirim (status `request_header` menjadi *pending*).
* **Persetujuan (Admin):** Admin mengecek detail barang, jika setuju Admin klik *Approve* (status menjadi *approved*).
* **Sesi Serah Terima Terkunci (Admin):** Saat Karyawan datang mengambil, Admin mengklik "Mulai Serah Terima". Status berubah jadi *processing* (mengunci *database* agar *scanner* bisa membaca *request* ini).
* **Scan Fisik (Mode OUT):** Admin men-scan *barcode* fisik barang yang diserahkan. Backend memvalidasi apakah barang tersebut ada dalam `request_detail` dengan `is_scanned = false`.
* **Centang Otomatis:** Jika *barcode* valid, UI Web yang terbuka otomatis tercentang hijau (`is_scanned` = true).
* **Selesai (Completed):** Setelah semua barang diserahkan, Admin menekan "Selesaikan Serah Terima". Sistem mencatat `pengambilan_oleh`, memotong `stok_aktual`, mencetak log transaksi `OUT` di `inventory_logs`, dan mengubah status *request* menjadi *completed*.
