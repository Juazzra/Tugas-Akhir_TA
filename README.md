# 🏗️ Road Work - Warehouse Management System (WMS)

Sistem Manajemen Pergudangan digital yang mengintegrasikan **Hardware Barcode Scanner**, **Backend Node.js**, dan **Frontend Vue.js**. Proyek ini merupakan bagian dari tugas akhir untuk mengotomatisasi pencatatan stok barang secara *real-time*.

---

## 📁 Struktur Proyek

* **`/Backend`**: Server API menggunakan Node.js, Express, dan PostgreSQL (Auth, CRUD Inventory).
* **`/Frontend`**: Dashboard monitoring dan manajemen menggunakan Vue.js.
* **`/hardware`**: Kode program mikrokontroler (ESP32/Arduino) untuk scanner barcode.

---

## 🛠️ Persiapan Backend (Node.js)

### 1. Prasyarat
Pastikan kamu sudah menginstal perangkat lunak berikut:
* **Node.js** (v18 ke atas)
* **PostgreSQL** (v15 atau v16)
* **npm** (otomatis terpasang bersama Node.js)

### 2. Instalasi
Buka terminal dan jalankan perintah berikut:
```bash
# Masuk ke folder backend
cd Backend

# Install dependencies yang dibutuhkan
npm install
```

### 3. Konfigurasi Database
#### 1. Buka pgAdmin atau terminal PostgreSQL.
#### 2. Buat database baru dengan nama: gudang_db.
#### 3. Impor atau jalankan file SQL yang berada di: Backend/database.sql.
#### 4. Pastikan tabel berikut berhasil terbuat: users, items, dan inventory_logs.

### 4. Konfigurasi Environment (.env)
Buat file baru bernama .env di dalam folder Backend dan sesuaikan isinya:
```code
DB_USER=postgres
DB_HOST=localhost
DB_NAME=gudang_db
DB_PASSWORD=isi_password_postgres_kamu
DB_PORT=5432

PORT=3000
JWT_SECRET=rahasia_gudang_2026
```

## 🚀 Cara Menjalankan
Menjalankan Backend
```bash
cd Backend
npm run dev
```
Menjalankan Frontend
```bash
cd Frontend
npm install
npm run dev
```
## 📡 Endpoint API Utama
## 📌 API Documentation

| Fitur | Method | Endpoint              | Keterangan                              |
|------|--------|----------------------|----------------------------------------|
| Auth | POST   | /api/users/register  | Mendaftarkan akun admin/karyawan       |
| Auth | POST   | /api/users/login     | Login & mendapatkan Token JWT          |
| Items| GET    | /api/items           | Melihat semua daftar stok barang       |
| Items| POST   | /api/items           | Menambah barang baru ke master         |

📌 Catatan: Gunakan header Content-Type: application/json saat melakukan request via Postman.

## 👥 Tim Pengembang
Juandra Alghifary (1103220165) - Backend, Database & API Architect

Fadhillah Putra Ibnulani (110322130)) - Frontend & UI/UX Developer

Muhammad Sabian Aziz (1103223236) - Hardware Engineer & Firebase Integration
