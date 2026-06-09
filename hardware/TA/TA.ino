#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFiManager.h>
#include <ArduinoJson.h>
#include <Preferences.h> // Library baru untuk simpan IP permanen

// ==========================================
// KONFIGURASI PIN
// ==========================================
#define SS_PIN       10
#define MISO_PIN     11
#define MOSI_PIN     12
#define SCK_PIN      13
#define RST_PIN      14

#define RX1_PIN      18
#define TX1_PIN      17

#define BTN_MODE_PIN 5
#define BTN_WIFI_PIN 6

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Preferences preferences;

// --- VARIABEL GLOBAL DINAMIS ---
String currentMode = "IN"; 
unsigned long lastRfidWatchdog = 0; 
char serverIP[40];       // Wadah untuk IP dari WiFiManager
String serverNameURL;    // URL Utuh (Rancangan Dinamis)

void setup() {
  Serial.begin(115200);

  pinMode(BTN_MODE_PIN, INPUT_PULLUP);
  pinMode(BTN_WIFI_PIN, INPUT_PULLUP);

  Wire.begin(8, 9);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0,0);
  lcd.print("Sistem Gudang");
  lcd.setCursor(0,1);
  lcd.print("Menghubungkan...");

  // ==========================================
  // BACA MEMORI PERMANEN ESP32
  // ==========================================
  preferences.begin("gudang_app", false);
  // Ambil IP yang tersimpan. Jika kosong, pakai default 10.210.200.3
  String savedIP = preferences.getString("ip_server", "10.210.200.3");
  savedIP.toCharArray(serverIP, 40);

  // ==========================================
  // SETUP WIFIMANAGER & CUSTOM PARAMETER
  // ==========================================
  WiFiManager wm;
  
  // Buat kolom input khusus di portal HP
  WiFiManagerParameter custom_ip("server", "IP Address Laptop", serverIP, 40);
  wm.addParameter(&custom_ip);

  wm.setConnectTimeout(30); 
  if (!wm.autoConnect("Gudang_Setup")) {
    Serial.println("Gagal konek, sistem restart...");
    delay(3000);
    ESP.restart();
  }

  // ==========================================
  // SIMPAN IP BARU (JIKA DIUBAH DI PORTAL)
  // ==========================================
  if (String(serverIP) != String(custom_ip.getValue())) {
    strcpy(serverIP, custom_ip.getValue());
    preferences.putString("ip_server", serverIP);
  }

  // Rangkai URL akhir secara otomatis
  serverNameURL = "http://" + String(serverIP) + ":3000/api/scanner";

  lcd.clear();
  lcd.print("WiFi Connected!");
  Serial.println(WiFi.localIP());
  Serial.println("Target Server: " + serverNameURL);

  delay(2000); // Penstabil arus
  
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN); 
  rfid.PCD_Init();
  
  Serial1.begin(9600, SERIAL_8N1, RX1_PIN, TX1_PIN);
  Serial1.setTimeout(20); 
  
  delay(1000);
  tampilkanStatusReady();
}

void loop() {
  // 1. LOGIKA TOMBOL MODE
  if (digitalRead(BTN_MODE_PIN) == LOW) {
    delay(50);
    if (digitalRead(BTN_MODE_PIN) == LOW) {
      currentMode = (currentMode == "IN") ? "OUT" : "IN";
      lcd.clear();
      lcd.setCursor(0,0); lcd.print("MODE BERUBAH:");
      lcd.setCursor(0,1); lcd.print(currentMode == "IN" ? ">> MASUK (IN)" : ">> KELUAR (OUT)");
      delay(1200);
      tampilkanStatusReady();
      while(digitalRead(BTN_MODE_PIN) == LOW);
    }
  }

  // 2. LOGIKA TOMBOL RESET WIFI & IP
  if (digitalRead(BTN_WIFI_PIN) == LOW) {
    unsigned long pressStart = millis();
    while (digitalRead(BTN_WIFI_PIN) == LOW) {
      unsigned long durasi = (millis() - pressStart) / 1000;
      lcd.setCursor(0,0); lcd.print("Hold to Reset:  ");
      lcd.setCursor(0,1); lcd.print(String(3 - durasi) + " Detik lagi... ");
      if (millis() - pressStart >= 3000) break;
      delay(100);
    }

    if (millis() - pressStart >= 3000) {
      lcd.clear();
      lcd.setCursor(0,0); lcd.print("Clearing WiFi...");
      lcd.setCursor(0,1); lcd.print("Restarting Tool ");
      
      WiFiManager wm;
      wm.resetSettings(); // Hapus WiFi
      // Opsional: Hapus memori IP (agar benar-benar kembali ke pabrik)
      // preferences.remove("ip_server"); 
      
      delay(2000);
      ESP.restart();
    } else {
      tampilkanStatusReady();
    }
  }

  // 3. WATCHDOG RFID
  if (millis() - lastRfidWatchdog > 2000) {
    byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
    if (version == 0x00 || version == 0xFF) {
      digitalWrite(RST_PIN, LOW); delay(50);
      digitalWrite(RST_PIN, HIGH); delay(50);
      SPI.end(); delay(10);
      SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN); 
      rfid.PCD_Init(); 
    }
    lastRfidWatchdog = millis();
  }

  // 4. SCAN RFID
  if (rfid.PICC_IsNewCardPresent()) {
    if (rfid.PICC_ReadCardSerial()) {
      String uid = "";
      for (byte i = 0; i < rfid.uid.size; i++) {
        uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
        uid += String(rfid.uid.uidByte[i], HEX);
      }
      uid.toUpperCase();
      kirimKeBackend(uid, currentMode);
      rfid.PICC_HaltA();
      rfid.PCD_StopCrypto1();
    }
  }

  // 5. SCAN BARCODE
  if (Serial1.available()) {
    String barcode = Serial1.readStringUntil('\n'); 
    String cleanBarcode = "";
    for (int i = 0; i < barcode.length(); i++) {
      if (isPrintable(barcode[i])) {
        cleanBarcode += barcode[i];
      }
    }
    cleanBarcode.trim(); 
    
    if (cleanBarcode.length() > 0) {
      kirimKeBackend(cleanBarcode, currentMode);
    }
  }
}

void tampilkanStatusReady() {
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("READY - MODE:");
  lcd.setCursor(0,1);
  lcd.print(currentMode == "IN" ? "[->] MASUK" : "[<-] KELUAR");
}

void kirimKeBackend(String kode, String mode) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("Memproses...");
    lcd.setCursor(0,1); lcd.print(kode.substring(0, 16)); 

    // Menggunakan variabel dinamis serverNameURL
    http.begin(serverNameURL); 
    http.setTimeout(5000); 
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Connection", "close"); 
    
    // (Opsional) Jika kamu pakai fitur API Key dari pembahasan sebelumnya:
    // http.addHeader("x-api-key", "GudangTA_Sabian2026");

    StaticJsonDocument<200> doc;
    doc["code"] = kode;
    doc["mode"] = mode; 
    
    String jsonRequest;
    serializeJson(doc, jsonRequest);
    
    int httpResponseCode = http.POST(jsonRequest);

    if (httpResponseCode > 0) {
      String response = http.getString();
      StaticJsonDocument<512> docRes;
      DeserializationError error = deserializeJson(docRes, response);

      if (!error) {
        lcd.clear();
        lcd.setCursor(0,0); lcd.print((const char*)docRes["lcd_line_1"]);
        lcd.setCursor(0,1); lcd.print((const char*)docRes["lcd_line_2"]);
      }
    } else {
      lcd.clear();
      lcd.print("Error Server!");
      lcd.setCursor(0,1);
      lcd.print("Code: " + String(httpResponseCode));
    }
    http.end(); 
  } else {
    lcd.clear();
    lcd.print("WiFi Diskonek!");
  }
  
  delay(2500); 
  tampilkanStatusReady(); 
}