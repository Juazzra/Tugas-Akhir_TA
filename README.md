🏗️ Road Work - Warehouse Management System (WMS)

Sistem Manajemen Pergudangan digital yang mengintegrasikan Hardware Barcode Scanner, Backend Node.js, dan Frontend Vue.js. Proyek ini merupakan bagian dari Tugas Akhir.

📁 Struktur Proyek
/Backend: Server API menggunakan Node.js, Express, dan PostgreSQL (Auth, CRUD Inventory)
/Frontend: Dashboard monitoring dan manajemen menggunakan Vue.js
/hardware: Kode program mikrokontroler (ESP32/Arduino) untuk scanner barcode
🛠️ Persiapan Backend (Node.js)
1. Prasyarat
Node.js (v18+)
PostgreSQL (v15/v16)
npm (biasanya otomatis terinstall bersama Node.js)
2. Instalasi
# Masuk ke folder backend
cd Backend

# Install dependencies
npm install
3. Konfigurasi Database
Buat database baru di pgAdmin dengan nama:
gudang_db
Jalankan file SQL:
Backend/database.sql
Tabel yang akan dibuat:
users
items
inventory_logs
4. Konfigurasi Environment (.env)

Buat file .env di dalam folder Backend:

DB_USER=postgres
DB_HOST=localhost
DB_NAME=gudang_db
DB_PASSWORD=isi_password_postgres_kamu
DB_PORT=5432

PORT=3000
JWT_SECRET=rahasia_gudang_2026
🚀 Cara Menjalankan
Menjalankan Backend
cd Backend
npm run dev

Server akan berjalan di:

http://localhost:3000
Menjalankan Frontend (Instruksi untuk Orang A)
cd Frontend
npm install
npm run dev
📡 Endpoint API Utama (Postman Ready)
Fitur	Method	Endpoint	Keterangan
Auth	POST	/api/users/register	Mendaftarkan akun admin/karyawan
Auth	POST	/api/users/login	Login & mendapatkan Token JWT
Items	GET	/api/items	Melihat semua stok barang
Items	POST	/api/items	Menambah barang baru ke master
📌 Catatan

Gunakan header berikut saat request via Postman:

Content-Type: application/json
👥 Tim Pengembang
[Nama Kamu] - Backend, Database & API Architect
[Nama Orang A] - Frontend & UI/UX Developer
[Nama Orang B] - Hardware Engineer & Firebase Integration
