# 🏗️ Road Work - Warehouse Management System (WMS)

Sistem Manajemen Pergudangan digital terintegrasi yang menghubungkan **Hardware Barcode Scanner (ESP32)**, **Backend API Server (Node.js)**, dan **Frontend Dashboard (Vue.js 3)** secara *real-time*. Sistem ini dirancang untuk pencatatan dan pengelolaan stok inventaris gudang secara akurat guna meminimalisasi selisih stok fisik.

---

## 📁 Struktur Proyek

* **`/Backend`**: Server API menggunakan Node.js, Express, dan PostgreSQL (otentikasi, otorisasi JWT, CRUD inventori, pencatatan log transaksi, dan upload foto bukti ke Supabase/Lokal).
* **`/Frontend`**: Dashboard administrasi dan portal karyawan menggunakan Vue.js 3, Pinia, dan Vite.
* **`/hardware`**: Kode firmware Arduino/C++ untuk mikrokontroler ESP32 yang terhubung ke modul RFID RC522 dan Barcode Scanner serial (GM65).

---

## 🛠️ Persiapan Database PostgreSQL

1. **Buat Database Baru:**
   * Buka psql, pgAdmin, atau DBeaver.
   * Buat database baru bernama `gudang_db` (atau sesuaikan dengan konfigurasi `.env` Anda):
     ```sql
     CREATE DATABASE gudang_db;
     ```
2. **Impor Skema & Data Awal:**
   * Masuk ke folder `/Backend` dan impor file `dump 1.1.sql` (atau `database.sql`):
     ```bash
     psql -U postgres -d gudang_db -f "dump 1.1.sql"
     ```
3. **Daftar Tabel Database:**
   Pastikan tabel-tabel berikut berhasil dibuat:
   * `users` - Menyimpan kredensial dan peran (Admin & Karyawan).
   * `departments` - Data departemen/divisi karyawan.
   * `items` - Katalog barang master dengan batas stok kendali.
   * `request_header` - Data nota pengajuan pengambilan barang.
   * `request_detail` - Rincian barang di dalam nota request.
   * `scanner_queue` - Log antrean scan fisik perangkat ESP32 (Mode IN & OUT).
   * `inventory_logs` - Riwayat lengkap audit keluar-masuk stok barang.

---

## 📡 Konfigurasi & Cara Menjalankan

### 1. Menjalankan Backend (Node.js)
1. Buka folder `Backend`.
2. Salin file `.env.example` menjadi `.env` lalu sesuaikan isinya:
   ```ini
   DATABASE_URL=postgresql://postgres:password_kamu@localhost:5432/gudang_db
   DB_SSL=false

   PORT=3000
   JWT_SECRET=rahasia_gudang_2026

   STORAGE_PROVIDER=local
   APP_URL=http://localhost:3000

   ESP32_API_KEY=akusukafurrysolid3x
   ```
3. Pasang dependensi dan jalankan server:
   ```bash
   npm install
   # Jalankan migrasi kolom stok kontrol tambahan
   node migrate.js
   # Buat akun Super Admin bawaan jika database kosong (NIK: ADMIN001 | PIN: 123456)
   node seedAdmin.js
   # Mulai server dalam mode pengembangan
   npm run dev
   ```

### 2. Menjalankan Frontend (Vue.js)
1. Buka folder `Frontend`.
2. Salin file `.env.example` menjadi `.env` dan pastikan base URL mengarah ke backend lokal Anda:
   ```ini
   VITE_API_BASE_URL=http://localhost:3000/api
   ```
3. Pasang dependensi dan jalankan dashboard:
   ```bash
   npm install
   npm run dev
   ```
   Akses dashboard melalui alamat default Vite: `http://localhost:5173`.

---

## 📡 Dokumentasi Endpoint API

Semua endpoint dilindungi oleh otentikasi JWT kecuali rute publik/login dan jembatan hardware scanner.

### 🔐 1. Endpoint Autentikasi & Akun (`/api/users`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/users/login` | Publik | Autentikasi user via NIK & PIN untuk mendapat token JWT |
| **POST** | `/api/users/register` | Admin | Registrasi akun Admin/Karyawan baru |
| **GET** | `/api/users` | Admin | Mengambil daftar semua akun pengguna |
| **PUT** | `/api/users/:id` | Admin | Memperbarui departemen, tipe, role, atau leader karyawan |
| **PUT** | `/api/users/:id/reset-pin`| Admin | Reset PIN karyawan kembali ke default `123456` |
| **DELETE**| `/api/users/:id` | Admin | Soft/Hard delete akun karyawan |
| **GET** | `/api/users/me` | Logged In | Mengambil profil pengguna yang sedang masuk |
| **PUT** | `/api/users/me` | Logged In | Mengupdate nama leader pada profil sendiri |
| **PUT** | `/api/users/me/change-pin`| Logged In | Ganti PIN akun secara mandiri |
| **POST** | `/api/users/me/photo` | Logged In | Upload/update foto profil pengguna (Base64) |

### 📦 2. Endpoint Master Barang (`/api/items`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/items` | Logged In | Melihat daftar katalog barang (pencarian & paginasi) |
| **GET** | `/api/items/:id` | Logged In | Detail informasi satu barang spesifik |
| **POST** | `/api/items` | Admin | Menambah barang baru ke master (+ upload foto) |
| **PUT** | `/api/items/:id` | Admin | Update informasi barang (+ foto) |
| **DELETE**| `/api/items/:id` | Admin | Soft delete barang (set is_active = false) |
| **GET** | `/api/items/restock/queue` | Admin | Melihat antrean barang masuk pending (Mode IN) |
| **POST** | `/api/items/restock/approve`| Admin | Konfirmasi penambahan stok dari antrean Mode IN |
| **POST** | `/api/items/restock/reject` | Admin | Tolak / hapus data barcode dari antrean Mode IN |

### 📋 3. Endpoint Permintaan Barang (`/api/requests`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/requests` | Karyawan | Membuat nota request baru (checkout keranjang) |
| **GET** | `/api/requests/me` | Karyawan | Riwayat pengajuan request pribadi karyawan |
| **GET** | `/api/requests` | Admin | Melihat daftar semua pengajuan request karyawan |
| **GET** | `/api/requests/:id/details`| Logged In | Detail barang di dalam satu nota request |
| **PUT** | `/api/requests/:id/status` | Admin | Mengubah status request (`approved`/`rejected`/`pending`) |
| **PUT** | `/api/requests/:id/start-process` | Admin | Membuka gerbang serah terima barang (Status: `processing`) |
| **POST** | `/api/requests/:id/complete` | Admin | Selesaikan serah terima, potong stok aktual, buat log OUT |
| **PUT** | `/api/requests/scan-verify`| Logged In | Verifikasi manual scan barang via UI admin |

### 📡 4. Endpoint Jembatan Scanner & Log (`/api/scanner` & `/api/inventory-logs`)
| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/scanner` | Hardware | Menerima kode RFID/Barcode & Mode (IN/OUT) dari ESP32 |
| **GET** | `/api/inventory-logs` | Admin | Audit trail data penambahan & pengeluaran stok |

---

## 👥 Tim Pengembang

* **Juandra Alghifary (1103220165)** - Backend, Database & API Architect
* **Fadhillah Putra Ibnulani (110322130)** - Frontend & UI/UX Developer
* **Muhammad Sabian Aziz (1103223236)** - Hardware Engineer
