# Panduan Menjalankan Sistem WMS Secara Lokal (PC Teman)

Panduan ini menjelaskan langkah demi langkah untuk melakukan instalasi dan konfigurasi sistem WMS (Warehouse Management System) agar dapat dijalankan sepenuhnya di komputer lokal (localhost) tanpa memerlukan koneksi internet ke Supabase Cloud.

---

## Prasyarat Sebelum Memulai
Pastikan PC Anda dan PC teman Anda telah terpasang perangkat lunak berikut:
1. **Node.js** (Rekomendasi versi LTS 18 ke atas)
2. **PostgreSQL** (Rekomendasi versi 14 ke atas)
3. **Git** (Opsional, untuk clone repo)

---

## Langkah 1: Konfigurasi Database PostgreSQL Lokal

1. **Buat Database Baru:**
   - Jalankan terminal PostgreSQL (psql) atau buka aplikasi GUI seperti **pgAdmin 4** atau **DBeaver**.
   - Buat database baru bernama `tugas_akhir_db`:
     ```sql
     CREATE DATABASE tugas_akhir_db;
     ```

2. **Import Data dan Skema:**
   - Gunakan terminal/command prompt pada folder root proyek, lalu arahkan ke folder `Backend/` dan jalankan perintah berikut untuk meng-import backup database:
     ```bash
     psql -U postgres -d tugas_akhir_db -f "dump 1.1.sql"
     ```
     *(Ganti `postgres` dengan username PostgreSQL Anda jika berbeda. Sistem akan meminta password database Anda).*
   - **Alternatif (via pgAdmin):**
     1. Klik kanan pada database `tugas_akhir_db`.
     2. Pilih **Query Tool**.
     3. Buka (Open) file `dump 1.1.sql` yang ada di folder `Backend`.
     4. Klik tombol **Run / Execute (F5)** untuk meng-import skema dan data awal.

---

## Langkah 2: Konfigurasi & Menjalankan Backend

1. **Salin File Environment:**
   - Masuk ke folder `Backend`.
   - Duplikat berkas `.env.example` dan ubah namanya menjadi `.env`.

2. **Konfigurasi Berkas `Backend/.env`:**
   - Edit berkas `.env` baru tersebut dengan konfigurasi berikut:
     ```ini
     # Koneksi Database Lokal Anda
     DATABASE_URL=postgresql://postgres:password_db_kamu@localhost:5432/tugas_akhir_db
     DB_SSL=false

     PORT=3000
     JWT_SECRET=rahasia_gudang_2026

     # Gunakan penyimpanan lokal untuk foto (Bukan Supabase Cloud)
     STORAGE_PROVIDER=local
     APP_URL=http://localhost:3000

     ESP32_API_KEY=akusukafurrysolid3x
     ```
     *(Pastikan untuk mengganti `password_db_kamu` dengan kata sandi PostgreSQL PC setempat).*

3. **Install Dependensi & Jalankan Server:**
   - Jalankan perintah berikut di terminal (berada di folder `Backend`):
     ```bash
     npm install
     ```
   - Mulai jalankan server backend dalam mode pengembangan:
     ```bash
     npm run dev
     ```
   - Server backend Anda sekarang berjalan di `http://localhost:3000`. Jika berhasil terkoneksi ke database lokal, konsol akan memunculkan tulisan:
     `Mantap! Berhasil konek ke Local PostgreSQL.`

---

## Langkah 3: Konfigurasi & Menjalankan Frontend

1. **Salin File Environment:**
   - Masuk ke folder `Frontend`.
   - Duplikat berkas `.env.example` dan ubah namanya menjadi `.env`.

2. **Konfigurasi Berkas `Frontend/.env`:**
   - Pastikan berkas `.env` mengarah ke backend lokal Anda:
     ```ini
     VITE_API_BASE_URL=http://localhost:3000/api
     ```

3. **Install Dependensi & Jalankan Dashboard Vue:**
   - Jalankan perintah berikut di terminal (berada di folder `Frontend`):
     ```bash
     npm install
     ```
   - Jalankan server development frontend:
     ```bash
     npm run dev
     ```
   - Buka browser Anda dan akses alamat yang diberikan oleh Vite (biasanya `http://localhost:5173`).

---

## Langkah 4: Kredensial Login Demo (Default)

Setelah dashboard terbuka di browser, Anda dapat menggunakan kredensial bawaan berikut untuk mendemokan sistem:

* **Akun Admin (Super Admin):**
  * **NIK:** `ADMIN001`
  * **PIN:** `123456`
  
* **Akun Staff/Karyawan:**
  * Silakan cek langsung tabel `users` di database lokal Anda atau buat akun karyawan baru melalui menu pendaftaran di Dashboard Admin.

---

## Struktur Folder Penyimpanan Foto Lokal
Ketika `STORAGE_PROVIDER=local` diaktifkan di `.env` backend, semua berkas foto yang diunggah dari web akan otomatis disimpan di folder fisik backend Anda:
`Backend/src/uploads/`

Sistem akan otomatis memisahkan berkas berdasarkan kategori:
* **Foto Barang:** disimpan di `Backend/src/uploads/Items/`
* **Foto Bukti Permintaan:** disimpan di `Backend/src/uploads/BuktiAlasan/`
* **Foto Profil Pengguna:** disimpan di `Backend/src/uploads/EmplyProfile/`

*Folder di atas akan dibuat secara otomatis oleh sistem saat pertama kali ada file yang diunggah.*
