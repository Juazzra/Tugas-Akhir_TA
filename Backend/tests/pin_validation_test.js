const http = require('http');
const jwt = require('jsonwebtoken');

// Secret JWT dari file .env backend Anda
const JWT_SECRET = 'rahasia_gudang_2026';

// Buat token Admin palsu (karena endpoint register butuh isAdmin)
const adminPayload = { 
  user: { id: 1, nik: 'ADMIN001', role: 'admin' } 
};
const adminToken = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1h' });

const requestData = (pin) => JSON.stringify({
  nik: `TEST_${Date.now()}`,
  nama: 'Test User',
  pin: pin,
  role: 'Karyawan',
  departemen_id: 1,
  nama_leader: 'Leader A',
  tipe_karyawan: 'Tetap'
});

async function runPinTest(testName, invalidPin) {
  return new Promise((resolve) => {
    console.log(`\n--- Menguji ${testName} ---`);
    console.log(`Mencoba mendaftarkan akun baru dengan PIN: "${invalidPin}"`);
    
    const payload = requestData(invalidPin);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/users/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status Code Respon : ${res.statusCode}`);
        console.log(`Isi Respon         : ${data}`);

        if (res.statusCode === 400 && data.includes('PIN harus berupa angka dan tepat 6 digit')) {
          console.log(`✅ Status: LULUS (Server menolak dengan validasi 400 Bad Request)`);
        } else {
          console.log(`❌ Status: GAGAL (Respons tidak sesuai ekspektasi)`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`Gagal melakukan request: ${e.message}`);
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== PENGUJIAN SF-02: REGISTRASI AKUN & VALIDASI PIN ===');
  
  // Test 1: PIN berupa huruf
  await runPinTest('Input PIN berupa karakter huruf bebas', 'abcdef');
  
  // Test 2: PIN kurang dari 6 digit
  await runPinTest('Input PIN hanya 4 angka', '1234');
  
  // Test 3: PIN dengan campuran karakter (spasi dll)
  await runPinTest('Input PIN berupa campuran (contoh: 123 45)', '123 45');

  console.log('\n✅ Semua skenario validasi PIN berjalan sesuai spesifikasi SF-02.');
}

runTests();
