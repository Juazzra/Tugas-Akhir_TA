const http = require('http');

async function runUploadLimitTest() {
  console.log('=== PENGUJIAN SK-03: PEMBATASAN UKURAN UPLOAD BUKTI ===');
  console.log('Membuat dummy payload (Base64) sebesar ~6 MB...');

  // 1 karakter = 1 byte. Kita buat string sepanjang 6,000,000 karakter
  const hugeString = 'a'.repeat(6000000); 
  
  const payload = JSON.stringify({
    barcode: 'DUMMY123',
    nama_barang: 'Test Upload Besar',
    jenis: 'Test',
    stok_aktual: 10,
    foto_base64: `data:image/jpeg;base64,${hugeString}`
  });

  const payloadSizeMB = (Buffer.byteLength(payload) / (1024 * 1024)).toFixed(2);
  console.log(`Payload siap. Ukuran total request: ${payloadSizeMB} MB`);
  console.log('Mengirim POST request ke http://localhost:3000/api/items ...\n');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Status Code Respon : ${res.statusCode}`);
      console.log(`Pesan Respon       : ${res.statusMessage}`);
      console.log(`Isi Respon         : ${data || '(kosong)'}\n`);

      if (res.statusCode === 413) {
        console.log('✅ Status: LULUS (Server menolak dengan error 413 Payload Too Large)');
      } else {
        console.log(`❌ Status: GAGAL (Server merespons dengan ${res.statusCode} alih-alih 413)`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`Gagal melakukan request: ${e.message}`);
    if (e.code === 'ECONNRESET') {
        console.log('\n✅ Status: LULUS (Koneksi diputus otomatis oleh server karena ukuran terlalu besar - ECONNRESET juga menandakan penolakan payload)');
    }
  });

  req.write(payload);
  req.end();
}

runUploadLimitTest();
