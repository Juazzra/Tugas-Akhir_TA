# 🏗️ Road Work - Warehouse Management System (WMS)

Sistem Manajemen Pergudangan digital yang mengintegrasikan Hardware Barcode Scanner, Backend Node.js, dan Frontend Vue.js. Proyek ini merupakan bagian dari Tugas Akhir.

---

## 📁 Struktur Proyek
- **/Backend**: Server API menggunakan Node.js, Express, dan PostgreSQL (Auth, CRUD Inventory).
- **/Frontend**: Dashboard monitoring dan manajemen menggunakan Vue.js.
- **/hardware**: Kode program mikrokontroler (ESP32/Arduino) untuk scanner barcode.

---

## 🛠️ Persiapan Backend (Node.js)

### 1. Prasyarat
- **Node.js** (v18+)
- **PostgreSQL** (v15/v16)
- **npm** (biasanya otomatis terinstall bersama Node.js)

### 2. Instalasi
```bash
# Masuk ke folder backend
cd Backend

# Install dependencies
npm install