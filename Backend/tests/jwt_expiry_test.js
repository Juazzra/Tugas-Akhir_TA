const jwt = require('jsonwebtoken');
const http = require('http');

// Secret JWT dari file .env backend Anda
const JWT_SECRET = 'rahasia_gudang_2026';

async function runJwtExpiryTest() {
  console.log('=== PENGUJIAN SK-04: KEAMANAN KEDALUWARSA TOKEN JWT ===');
  
  // 1. Buat token yang sudah kedaluwarsa (misalnya kedaluwarsa 1 jam yang lalu)
  console.log('Membuat token JWT dengan waktu kedaluwarsa di masa lalu (Expired)...');
  
  const payload = {
    id: 1,
    nik: 'TEST001',
    role: 'Karyawan'
  };

  // Set waktu expiresIn menjadi negatif atau angka nol agar langsung kedaluwarsa
  const expiredToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '-1h' });
  
  console.log('\nToken Kadaluwarsa Berhasil Dibuat:');
  console.log(expiredToken.substring(0, 50) + '...\n');
  
  console.log('Mengakses endpoint terproteksi (GET /api/users/me) menggunakan token expired tersebut...');

  // 2. Akses API menggunakan token tersebut
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/users/me',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${expiredToken}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\nStatus Code Respon : ${res.statusCode}`);
      console.log(`Isi Respon         : ${data}\n`);

      // 401 Unauthorized atau 403 Forbidden biasanya dikembalikan oleh middleware auth
      if (res.statusCode === 401 || res.statusCode === 403) {
        console.log('✅ Status: LULUS (Server menolak token yang sudah kedaluwarsa)');
      } else {
        console.log(`❌ Status: GAGAL (Server merespons dengan ${res.statusCode}, seharusnya 401/403)`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Gagal melakukan request: ${e.message}`);
    console.log('Pastikan server backend sedang berjalan (npm run dev)');
  });

  req.end();
}

// Jalankan test
runJwtExpiryTest();
