# 💻 Spesifikasi Pengujian Software (Backend API & Frontend Dashboard)
*Dokumen Pengujian Capstone Design / Tugas Akhir*

Dokumen ini memuat daftar verifikasi pengujian perangkat lunak (software) yang mencakup **Backend Express API (Node.js)**, database **PostgreSQL**, dan **Frontend Dashboard (Vue.js 3)**.

---

## 🛠️ 1. Spesifikasi Kerja (SK) - Pengujian Teknis & Performa
*Spesifikasi Kerja (SK) mengukur performa teknis, waktu respon API, kapasitas konkurensi (load test), efisiensi bundel frontend, dan keandalan transaksi.*

### Tabel Pengujian Spesifikasi Kerja (SK)

| Kode SK | Parameter Pengujian | Metodologi Pengujian | Indikator Keberhasilan (Threshold) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SK-01** | Waktu Respon API (Latency) | Mengukur waktu respon endpoint utama (seperti GET `/api/items` dan GET `/api/requests`) pada kondisi normal menggunakan Postman atau logger server. | Waktu respon rata-rata **< 200 ms** per request. | [ ] Pas |
| **SK-02** | Ketahanan Beban Konkuren (Stress/Load Test) | Menguji server dengan mengirimkan 150 request API secara konkuren menggunakan script `load_test.js` untuk mensimulasikan beban kerja tinggi. | Sukses memproses **100% request** tanpa crash, dengan tingkat error **0.00%** dan rata-rata latensi **< 150 ms**. | [ ] Pas |
| **SK-03** | Pembatasan Ukuran Upload Bukti | Mengunggah gambar bukti transaksi via API dengan ukuran file di atas 5 MB untuk menguji pembatas kapasitas payload. | Server menolak unggahan dan mengembalikan respons error **413 Payload Too Large** atau batas limit terlampaui. | [ ] Pas |
| **SK-04** | Keamanan Kedaluwarsa Token JWT | Menguji masa berlaku token otentikasi JWT yang dihasilkan saat login. | Token kedaluwarsa setelah **24 jam (1d)** dan server menolak akses setelah waktu tersebut berlalu. | [ ] Pas |
| **SK-05** | Sinkronisasi Near Real-Time | Menguji interval waktu pemutakhiran otomatis data dashboard frontend (Dashboard, Restock Queue, Approval Requests). | Halaman frontend melakukan *auto-refresh* data dari server tepat setiap **10 detik**. | [ ] Pas |
| **SK-06** | Kecepatan Muat Awal Frontend | Mengukur waktu loading awal aplikasi web frontend saat diakses pertama kali menggunakan *Chrome DevTools (Network Tab - Lighthouse)*. | Waktu muat awal (First Contentful Paint) **< 1.8 detik** di jaringan internet standar. | [ ] Pas |
| **SK-07** | Keandalan Transaksi Database | Menguji ketahanan database PostgreSQL saat terjadi pembatalan transaksi di tengah jalan (misal, stok tidak cukup saat eksekusi handover). | Database melakukan **ROLLBACK** penuh sehingga tidak ada data parsial yang tersimpan (stok tidak terpotong dan log transaksi batal dibuat). | [ ] Pas |

---

## ⚙️ 2. Spesifikasi Fungsional (SF) - Pengujian Fitur
*Spesifikasi Fungsional (SF) memastikan seluruh fungsi kontrol hak akses, pemrosesan inventaris, manajemen serah terima barang, dan log audit berjalan sesuai dengan aturan bisnis.*

### Tabel Pengujian Spesifikasi Fungsional (SF)

| Kode SF | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SF-01** | Pengujian Pembatasan Hak Akses (Role-Based Access Control) | 1. Login menggunakan akun ber-role `karyawan`.<br>2. Coba akses halaman `/admin/dashboard` secara langsung melalui URL browser. | Sistem menolak akses, dan Router secara otomatis mengalihkan pengguna kembali ke halaman `/client/catalog`. | [ ] Pas |
| **SF-02** | Pengujian Registrasi Akun & Validasi PIN | 1. Daftarkan akun baru melalui menu Master Karyawan.<br>2. Coba input PIN berupa karakter huruf bebas atau hanya 4 angka. | Sistem menampilkan pesan validasi error bahwa PIN **wajib berupa angka dan tepat 6 digit** (status: `400 Bad Request`). | [ ] Pas |
| **SF-03** | Pengujian Pembuatan Request Keranjang (Checkout) | 1. Karyawan memilih beberapa item barang di katalog.<br>2. Karyawan menginput kuantitas, alasan, dan upload foto bukti.<br>3. Klik "Kirim Request". | Transaksi sukses, data tersimpan di tabel `request_header` (status: `pending`) dan `request_detail`, serta foto bukti sukses tersimpan. | [ ] Pas |
| **SF-04** | Pengujian Proteksi Stok Kosong pada Katalog | 1. Ubah stok barang X di database menjadi `0`.<br>2. Buka katalog karyawan di frontend. | Barang X tetap tampil di katalog namun tombol "Tambah ke Keranjang" dinonaktifkan (disabled) dengan keterangan stok habis. | [ ] Pas |
| **SF-05** | Pengujian Pencegahan Sesi Ganda Serah Terima | 1. Ubah status Request A menjadi `processing` (Sesi Mulai).<br>2. Coba mulai sesi serah terima pada Request B. | Sistem menolak dan menampilkan pesan error: `"Ada sesi serah terima lain yang sedang berjalan!"` (Sesi B gagal dibuka). | [ ] Pas |
| **SF-06** | Pengujian Pemindaian Mode OUT (Serah Terima) | 1. Buka sesi serah terima.<br>2. Kirim POST request barcode barang yang sesuai via `/api/scanner`. | Kolom barang bersangkutan pada tabel detail request di frontend berubah status menjadi **"Scanned"** secara otomatis. | [ ] Pas |
| **SF-07** | Pengujian Penyelesaian & Pemotongan Stok | 1. Setelah semua barang ter-scan di detail request, klik "Selesaikan Transaksi". | Status request berubah menjadi `completed`, stok aktual barang terpotong otomatis, dan tercatat riwayat log tipe **`OUT`**. | [ ] Pas |
| **SF-08** | Pengujian Pengelompokkan Antrean Restock (Mode IN) | 1. Kirim scan barcode barang Y sebanyak 5 kali berturut-turut pada Mode IN.<br>2. Buka menu Restock Queue di dashboard Admin. | Antrean barang masuk terkelompok secara otomatis dengan menampilkan Barcode Y, Nama Barang Y, dan jumlah masuk = **5**. | [ ] Pas |
| **SF-09** | Pengujian Persetujuan Restock & Proteksi Barang Baru | 1. Klik "Approve" pada antrean restock.<br>2. Coba approve barcode baru yang belum terdaftar di master. | Untuk barang terdaftar, stok aktual bertambah dan tercatat log **`IN`**. Untuk barang tidak terdaftar, muncul pesan error: `"Barcode tidak terdaftar!"`. | [ ] Pas |
| **SF-10** | Pengujian Log Audit & Export CSV | 1. Buka halaman Riwayat Stok (Inventory Logs) di dashboard.<br>2. Klik tombol "Export CSV". | Semua log masuk/keluar tampil rapi dan file `.csv` sukses diunduh dengan struktur kolom data yang tepat. | [ ] Pas |
