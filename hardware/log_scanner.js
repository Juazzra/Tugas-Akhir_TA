const delay = ms => new Promise(res => setTimeout(res, ms));

async function simulasiScanner() {
    console.log("[SYSTEM] Memulai inisialisasi SPI dan UART...");
    await delay(500);
    console.log("[SYSTEM] Sensor RC522 & GM65 Siap.");
    console.log("[SYSTEM] Mode OUT Aktif. Menunggu scan validasi nota...");
    await delay(2500);

    console.log("[RFID] Tag UID terdeteksi: 04 6A 2B 92");
    console.log("[WIFI] Terhubung ke Hotspot Lokal");
    console.log("[HTTP] Mengirim POST request ke peladen database...");

    await delay(812);

    console.log("[HTTP] POST /api/scan_out - Response Code: 200 OK");
    console.log("[INFO] Validasi sukses. Pemotongan stok otomatis dijalankan.");
    console.log("[INFO] Waktu pemrosesan total: 812 ms");
    console.log("--------------------------------------------------");
}

simulasiScanner();