# Frontend Warehouse Management System

Frontend ini dibuat menggunakan Vue.js untuk mendukung sistem pengelolaan stok barang dengan akses multi-user dan sinkronisasi near real-time.

## Tech Stack
- Vue.js
- Vite
- Vue Router
- Pinia
- Axios
- Lucide Icons
- JsBarcode

## Role Pengguna
### Admin / HRGA
- Dashboard real-data
- Master Barang
- Cetak Barcode
- Barang Masuk / Restock Queue
- Master Karyawan
- Approval Request
- Serah Terima Barang
- Riwayat Stok
- Export CSV
- Profil Saya

### Karyawan
- Katalog Barang
- Keranjang Request
- Upload foto bukti
- Request Saya
- Profil Saya

## Alur Utama yang Sudah Berhasil Dites
1. Admin login menggunakan NIK dan PIN.
2. Karyawan login menggunakan NIK dan PIN.
3. Karyawan memilih barang dari katalog.
4. Karyawan mengirim request barang.
5. Request muncul di halaman Approval Request admin.
6. Admin melakukan approve.
7. Admin memulai sesi serah terima.
8. Barcode barang discan / dimasukkan.
9. Item berubah menjadi scanned.
10. Admin menyelesaikan transaksi.
11. Stok barang berkurang.
12. Inventory log OUT tercatat.
13. Scanner mode IN membuat antrean barang masuk.
14. Admin ACC restock.
15. Stok bertambah.
16. Inventory log IN tercatat.

## Fitur Sinkronisasi Near Real-Time
Beberapa halaman sudah menggunakan auto refresh setiap 10 detik:
- Dashboard Admin
- Approval Request
- Barang Masuk
- Request Saya

## Catatan
Frontend menggunakan base API dari file `.env`:

VITE_API_BASE_URL=http://localhost:3000/api
