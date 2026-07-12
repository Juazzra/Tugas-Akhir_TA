# 📋 Spesifikasi Pengujian Hardware (ESP32 Barcode & RFID Scanner)
*Dokumen Pengujian Capstone Design / Tugas Akhir*

Dokumen ini memuat daftar verifikasi pengujian sistem perangkat keras (hardware) yang mengintegrasikan mikrokontroler **ESP32**, pembaca RFID **MFRC522**, Barcode Scanner **GM65 (UART)**, LCD **I2C 16x2**, dan **WiFiManager**.

---

## 🛠️ 1. Spesifikasi Kerja (SK) - Pengujian Teknis & Performa
*Spesifikasi Kerja (SK) mengukur performa teknis, parameter elektrikal, jangkauan, waktu respon, dan keandalan sistem hardware.*

### Tabel Pengujian Spesifikasi Kerja (SK)

| Kode SK | Parameter Pengujian | Metodologi Pengujian | Indikator Keberhasilan (Threshold) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SK-01** | Tegangan Operasional Sistem | Mengukur output tegangan regulator (VCC) pada ESP32, RFID, dan LCD menggunakan Multimeter Digital. | Tegangan stabil pada **3.3V ± 0.1V** (untuk ESP32 & RFID) dan **5.0V ± 0.2V** (untuk LCD). | [ ] Pas |
| **SK-02** | Konsumsi Arus Listrik | Mengukur konsumsi arus listrik rangkaian menggunakan amperemeter saat kondisi *idle* dan saat transmisi data (HTTP POST). | Arus saat *idle*: **< 120 mA**.<br>Arus saat transmisi (WiFi aktif): **< 280 mA**. | [ ] Pas |
| **SK-03** | Jarak Baca RFID Reader | Menguji jarak maksimum pembacaan kartu/tag RFID (MFRC522) dengan mendekatkan kartu secara perlahan. | Tag RFID terbaca dengan sukses pada jarak **0 cm hingga minimal 3.0 cm**. | [ ] Pas |
| **SK-04** | Jangkauan Sudut Baca RFID | Menguji sensitivitas pembacaan RFID berdasarkan kemiringan sudut kartu (0°, 45°, dan 90° dari permukaan antena). | Tag RFID tetap dapat terbaca pada sudut kemiringan **0° hingga 45°**. | [ ] Pas |
| **SK-05** | Latensi Pengiriman Data | Mengukur selisih waktu sejak barcode/RFID di-scan hingga respons HTTP diterima dan ditampilkan di LCD (mengukur waktu eksekusi fungsi `kirimKeBackend`). | Waktu respon rata-rata **< 1.5 detik** pada kondisi jaringan lokal stabil. | [ ] Pas |
| **SK-06** | Keandalan Scan Serial (UART) | Melakukan pemindaian barcode sebanyak 50 kali berturut-turut pada label kode 128 untuk menguji integritas data karakter serial. | Tingkat keberhasilan pembacaan data utuh dan tidak korup sebesar **100% (50/50 sukses)**. | [ ] Pas |
| **SK-07** | Waktu *Recovery* Watchdog RFID| Memutus jalur SPI RFID sementara untuk memicu Watchdog, lalu mengukur waktu pemulihan hingga modul RFID dapat membaca kartu kembali. | Sistem dapat memulihkan koneksi RFID secara otomatis dalam waktu **< 3 detik** setelah gangguan diatasi. | [ ] Pas |
| **SK-08** | Retensi Memori Permanen | Mengubah IP Address server melalui portal web, mematikan daya ESP32 selama 1 menit, menyalakannya kembali, dan memverifikasi IP yang tersimpan. | IP Address baru tetap tersimpan pada memori Flash ESP32 (menggunakan *Preferences.h*) dan tidak kembali ke *default*. | [ ] Pas |

---

## ⚙️ 2. Spesifikasi Fungsional (SF) - Pengujian Fitur
*Spesifikasi Fungsional (SF) memastikan semua fitur masukan, keluaran, logika kontrol, dan protokol komunikasi berjalan sesuai dengan rancangan sistem.*

### Tabel Pengujian Spesifikasi Fungsional (SF)

| Kode SF | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan (Expected Result) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SF-01** | Pengujian Portal Akses WiFi (*Captive Portal*) | 1. Tekan tombol WiFi reset tahan selama 3 detik.<br>2. Cari AP bernama `"Gudang_Setup"` dari ponsel.<br>3. Hubungkan ponsel ke AP tersebut. | Portal konfigurasi WiFi (*WiFiManager*) otomatis terbuka di ponsel dan menampilkan daftar SSID serta kolom input parameter IP Server. | [ ] Pas |
| **SF-02** | Pengujian Pemindaian RFID | Tempelkan kartu RFID yang sudah terdaftar pada sensor MFRC522. | Modul RFID membaca UID kartu secara utuh, men-convert ke format Hex, dan mengirimkannya ke Backend. | [ ] Pas |
| **SF-03** | Pengujian Pemindaian Barcode | Arahkan barcode scanner serial (GM65) ke label barcode fisik dan picu pemindaian. | Scanner membaca kode, membersihkan karakter non-printable (\r\n), dan mengirimkannya ke Backend. | [ ] Pas |
| **SF-04** | Pengujian Pergantian Mode Fisik (Tombol Mode) | Tekan tombol Mode (Pin 5) sekali saat alat dalam kondisi *Ready*. | Mode sistem berpindah secara bergantian antara **IN** dan **OUT**. LCD menampilkan status mode baru secara real-time. | [ ] Pas |
| **SF-05** | Pengujian Reset WiFi Mandiri | Tekan dan tahan tombol Reset WiFi (Pin 6) selama 3 detik. | LCD menampilkan hitung mundur reset. Setelah 3 detik, setelan WiFi dihapus dan ESP32 melakukan *restart* otomatis untuk membuka AP baru. | [ ] Pas |
| **SF-06** | Pengujian Sinkronisasi Layar LCD | Kirim data scan ke backend dan tunggu respons balik JSON dari server. | Layar LCD I2C berhasil menampilkan pesan dinamis dari server sesuai kunci `lcd_line_1` dan `lcd_line_2` (misal: "Scan Berhasil!"). | [ ] Pas |
| **SF-07** | Pengujian Keamanan Jabat Tangan (*API Key Handshake*) | Lakukan scan saat header `x-api-key` di ESP32 tidak cocok dengan berkas `.env` server. | Server menolak data scan, dan LCD menampilkan pesan error: `"AKSES DITOLAK! UNAUTHORIZED"`. | [ ] Pas |
| **SF-08** | Pengujian Penanganan Server Offline | Putuskan koneksi server backend (matikan server), lalu lakukan scan barcode dari alat. | LCD menampilkan pesan kesalahan koneksi server: `"Error Server!"` diikuti dengan kode error HTTP (misalnya `-1` atau `-11`). | [ ] Pas |
