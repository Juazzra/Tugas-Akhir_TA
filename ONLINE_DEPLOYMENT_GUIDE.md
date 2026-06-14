# Panduan Deployment Online & Konfigurasi Domain Kustom

Dokumen ini berisi panduan untuk membuat aplikasi WMS Anda dapat diakses secara online dari mana saja (berbeda jaringan/lewat internet) serta cara menghubungkannya dengan domain kustom pilihan Anda (contoh: `gudang.sai.co.id`).

---

## 📌 Bagian 1: Uji Coba Online Sementara (Local Tunneling)
*Metode ini sangat cocok untuk keperluan demo mendadak kepada dosen atau pengujian bersama teman tanpa perlu menyewa server.*

Kita akan menggunakan **LocalTunnel** karena 100% gratis, tanpa pendaftaran, dan sangat cepat digunakan.

### Langkah-langkah:
1. **Jalankan Aplikasi Lokal Anda:**
   - Jalankan Backend di port `3000` (`npm run dev` pada folder Backend).
   - Jalankan Frontend di port `5173` (`npm run dev` pada folder Frontend).

2. **Online-kan Backend:**
   - Buka terminal baru (Command Prompt/PowerShell), lalu ketik:
     ```bash
     npx localtunnel --port 3000
     ```
   - Terminal akan menampilkan alamat URL publik backend Anda, misalnya:
     `https://fluffy-dogs-bark.loca.lt`
   - **PENTING:** Saat pertama kali dibuka di browser, klik tombol **"Click to Continue"** agar API dapat diakses oleh frontend.

3. **Hubungkan Frontend ke Backend Online:**
   - Buka berkas `Frontend/.env` Anda.
   - Ubah parameter API URL ke alamat LocalTunnel backend tadi:
     ```ini
     VITE_API_BASE_URL=https://fluffy-dogs-bark.loca.lt/api
     ```

4. **Online-kan Frontend:**
   - Buka terminal baru lagi, lalu jalankan:
     ```bash
     npx localtunnel --port 5173
     ```
   - Terminal akan menampilkan alamat URL publik frontend Anda, misalnya:
     `https://neat-wolves-run.loca.lt`
   - Bagikan URL frontend ini ke dosen/teman Anda. Aplikasi sekarang dapat diakses secara online dari perangkat dan jaringan mana pun selama laptop Anda tetap menyala.

---

## ☁️ Bagian 2: Deployment Online Permanen (Cloud Hosting)
*Metode ini digunakan agar aplikasi online 24/7 tanpa bergantung pada laptop Anda.*

```mermaid
flowchart LR
    User([Pengguna]) -->|Akses gudang.sai.co.id| FE[Frontend: Vercel]
    FE -->|API Request| BE[Backend: Render]
    BE -->|Database Query| DB[(Database: Supabase)]
    BE -->|Local Storage/Upload| Storage[Folder static local / uploads]
```

### 1. Database Cloud (Supabase)
Karena database Anda sudah dikonfigurasi menggunakan Supabase, Anda tidak perlu mengubah apa pun. Pastikan Anda memiliki URL transaksi dari Supabase:
`DATABASE_URL=postgresql://postgres.xxx:password@aws-xxx.supabase.com:6543/postgres`

### 2. Backend Server (Render.com / Railway.app)
Render adalah platform gratis/murah yang sangat bagus untuk menjalankan backend Node.js.
- **Langkah Deploy di Render:**
  1. Hubungkan akun GitHub Anda ke [Render.com](https://render.com).
  2. Buat **Web Service** baru dan pilih repositori proyek Anda.
  3. Setel root direktori proyek ke `Backend`.
  4. Masukkan perintah build: `npm install` dan perintah start: `node index.js`.
  5. Masukkan **Environment Variables** di dashboard Render:
     - `DATABASE_URL` = *(URL Supabase Anda)*
     - `DB_SSL` = `true` *(Wajib true karena Supabase di cloud memerlukan SSL)*
     - `STORAGE_PROVIDER` = `local` *(Foto disimpan di server Render)*
     - `APP_URL` = *(Alamat URL backend Anda setelah dideploy di Render)*
     - `JWT_SECRET` = `rahasia_gudang_kamu`
     - `ESP32_API_KEY` = `akusukafurrysolid3x`
  6. Render akan memproses deployment dan memberi Anda URL publik backend, misalnya: `https://wms-backend-sai.onrender.com`.

### 3. Frontend Dashboard (Vercel.com)
Vercel adalah platform gratis terbaik untuk men-deploy aplikasi Vue.js.
- **Langkah Deploy di Vercel:**
  1. Masuk ke [Vercel.com](https://vercel.com) menggunakan akun GitHub Anda.
  2. Klik **Add New Project**, pilih repositori proyek Anda.
  3. Setel root direktori proyek ke `Frontend`.
  4. Pada bagian **Environment Variables**, tambahkan:
     - `VITE_API_BASE_URL` = `https://wms-backend-sai.onrender.com/api` *(Ganti dengan URL backend Render Anda)*
  5. Klik **Deploy**. Vercel akan otomatis mem-build aplikasi Anda dan memberikan alamat domain gratis, misalnya: `https://wms-sai.vercel.app`.

---

## 🌐 Bagian 3: Konfigurasi Domain Kustom (Custom Domain)
*Langkah ini menjelaskan cara mengubah alamat bawaan penyedia hosting (seperti `.vercel.app` atau `.onrender.com`) menjadi domain resmi seperti `gudang.sai.co.id`.*

### Prasyarat:
Anda harus sudah membeli domain utama (misal: `sai.co.id` atau `sai-group.com`) dari registrar domain seperti Niagahoster, Domainesia, GoDaddy, dll.

### 1. Pemetaan Subdomain di DNS Manager
Masuk ke panel kontrol tempat Anda membeli domain (DNS Management), lalu tambahkan data berikut:

| Jenis Rekod (Type) | Nama Host (Name/Subdomain) | Nilai / Tujuan (Value/Target) | Fungsi |
| :--- | :--- | :--- | :--- |
| **CNAME** | `gudang` | `cname.vercel-dns.com` | Mengarahkan `gudang.sai.co.id` ke Frontend Vercel |
| **CNAME** | `api.gudang` | `wms-backend-sai.onrender.com` | Mengarahkan `api.gudang.sai.co.id` ke Backend Render |

> [!NOTE]
> Proses pemetaan DNS ini memerlukan waktu penyebaran (*propagation*) sekitar 10 menit hingga maksimal 24 jam sebelum domain baru dapat aktif sepenuhnya.

### 2. Hubungkan Domain di Dashboard Hosting

#### A. Pada Dashboard Vercel (Frontend):
1. Masuk ke proyek Frontend Anda di Vercel.
2. Pergi ke menu **Settings** > **Domains**.
3. Masukkan domain kustom Anda: `gudang.sai.co.id` lalu klik **Add**.
4. Vercel akan secara otomatis memeriksa DNS Anda dan membuatkan sertifikat SSL gratis (HTTPS) untuk domain tersebut.

#### B. Pada Dashboard Render (Backend):
1. Masuk ke proyek Backend Anda di Render.
2. Pergi ke menu **Settings** > scroll ke bawah ke bagian **Custom Domains**.
3. Klik **Add Custom Domain** dan masukkan `api.gudang.sai.co.id`.
4. Ikuti instruksi verifikasi yang diberikan oleh Render.

### 3. Update Terakhir Environment Variables
Setelah kedua domain kustom aktif dan terbit sertifikat SSL-nya (HTTPS), perbarui nilai env di masing-masing dashboard:

- **Di Vercel (Frontend Env):**
  ```ini
  VITE_API_BASE_URL=https://api.gudang.sai.co.id/api
  ```
- **Di Render (Backend Env):**
  ```ini
  APP_URL=https://api.gudang.sai.co.id
  ```
- Lakukan re-deploy (deploy ulang) proyek di Vercel dan Render agar konfigurasi baru ini aktif.
