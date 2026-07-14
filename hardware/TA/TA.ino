#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ==========================================
// KONFIGURASI PIN (SESUAI SKEMATIK BAB 3)
// ==========================================
#define RST_PIN         4   // Jalur RESET RFID (Kabel Hitam)
#define SS_PIN          5   // Jalur SDA/SS RFID (Kabel Hijau)
#define BTN_MODE_PIN    4   // Tombol Mode IN/OUT
#define BTN_WIFI_PIN    5   // Tombol Reset WiFi (Dipindah ke Pin 5 demi stabilitas)
#define LED_PIN         2   // LED Indikator Sederhana (Built-in)

// ==========================================
// KREDENSIAL JARINGAN & API BACKEND
// ==========================================
const char* ssid     = "Gudang_Setup"; // Sesuaikan dengan Wi-Fi Hotspot HP
const char* password = "password_hotspot"; 
const char* serverUrl = "http://192.168.50.65:3000/api/scan";
const char* apiKey    = "kunci_rahasia_iot_2026";

// ==========================================
// INISIALISASI INSTANCE MODUL
// ==========================================
MFRC522 mfrc522(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Variabel Status Sistem
bool isModeIn = true; // true = IN, false = OUT

void setup() {
  Serial.begin(115200);
  SPI.begin();
  
  // Inisialisasi Perangkat Keras
  mfrc522.PCD_Init();
  lcd.init();
  lcd.backlight();
  
  pinMode(BTN_MODE_PIN, INPUT_PULLUP);
  pinMode(BTN_WIFI_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  // Tampilan Awal LCD
  lcd.setCursor(0, 0);
  lcd.print("Menghubungkan...");
  
  // Koneksi Wi-Fi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Terhubung!");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
  delay(1500);
}

void loop() {
  // 1. Logika Cek Tombol Perubahan Mode (IN/OUT)
  if (digitalRead(BTN_MODE_PIN) == LOW) {
    delay(50); // Debouncing
    if (digitalRead(BTN_MODE_PIN) == LOW) {
      isModeIn = !isModeIn;
      lcd.clear();
      while(digitalRead(BTN_MODE_PIN) == LOW); // Tunggu tombol dilepas
    }
  }

  // Tampilan Menu Standby LCD
  lcd.setCursor(0, 0);
  lcd.print("SYSTEM READY    ");
  lcd.setCursor(0, 1);
  if (isModeIn) {
    lcd.print("MODE: IN        ");
  } else {
    lcd.print("MODE: OUT       ");
  }

  // 2. Logika Cek Pindai Barcode via Hardware Serial 2 (GM65)
  if (Serial2.available() > 0) {
    String barcodeData = Serial2.readStringUntil('\n');
    barcodeData.trim(); // Sanitasi / Data Trimming (\r\n)
    
    if (barcodeData.length() > 0) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Memproses...");
      lcd.setCursor(0, 1);
      lcd.print(barcodeData);
      
      // Kirim ke Backend Node.js
      kirimKeBackend(barcodeData, "barcode");
      delay(2000);
    }
  }

  // 3. Logika Cek Pindai RFID (MFRC522)
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    String rfidData = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      rfidData += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
      rfidData += String(mfrc522.uid.uidByte[i], HEX);
    }
    rfidData.toUpperCase();
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Memproses...");
    lcd.setCursor(0, 1);
    lcd.print(rfidData);
    
    // Kirim ke Backend Node.js
    kirimKeBackend(rfidData, "rfid");
    
    mfrc522.PICC_HaltA();
    delay(2000);
  }
}

// ==========================================
// FUNGSI HTTP POST KE SERVER NODE.JS
// ==========================================
void kirimKeBackend(String dataScan, String tipeSensor) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    
    // Set Header untuk Keamanan dan Format
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", apiKey);
    
    // Bungkus Data ke JSON Payload
    String modeString = isModeIn ? "IN" : "OUT";
    String jsonPayload = "{\"data\":\"" + dataScan + "\",\"type\":\"" + tipeSensor + "\",\"mode\":\"" + modeString + "\"}";
    
    int httpResponseCode = http.POST(jsonPayload);
    
    lcd.clear();
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Response: " + response);
      
      if (httpResponseCode == 200) {
        digitalWrite(LED_PIN, HIGH);
        lcd.setCursor(0, 0);
        lcd.print("Scan Sukses!");
        delay(500);
        digitalWrite(LED_PIN, LOW);
      } else if (httpResponseCode == 401) {
        lcd.setCursor(0, 0);
        lcd.print("AKSES DITOLAK!");
        lcd.setCursor(0, 1);
        lcd.print("UNAUTHORIZED");
      } else {
        lcd.setCursor(0, 0);
        lcd.print("Gagal Proses");
        lcd.setCursor(0, 1);
        lcd.print("Code: " + String(httpResponseCode));
      }
    } else {
      // Penanganan Jika Server Offline
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
      lcd.setCursor(0, 0);
      lcd.print("Error Server!");
      lcd.setCursor(0, 1);
      lcd.print("HTTP: " + String(httpResponseCode));
    }
    http.end();
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Koneksi Putus!");
  }
}