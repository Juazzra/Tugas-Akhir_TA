const http = require('http');

const endpoints = [
  { path: '/api/items', name: 'GET /api/items' },
  { path: '/api/requests', name: 'GET /api/requests' }
];

const PORT = 3000;
const ITERATIONS = 10;

async function measureLatency(endpoint) {
  let totalLatency = 0;
  console.log(`\nMenguji endpoint: ${endpoint.name} (${ITERATIONS}x)`);
  
  for (let i = 1; i <= ITERATIONS; i++) {
    const start = process.hrtime();
    
    await new Promise((resolve, reject) => {
      http.get({
        hostname: 'localhost',
        port: PORT,
        path: endpoint.path,
        headers: {
          // Tambahkan header authorization jika API membutuhkan token
          // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
        }
      }, (res) => {
        res.on('data', () => {}); // Consume data
        res.on('end', () => resolve());
      }).on('error', (err) => reject(err));
    });

    const diff = process.hrtime(start);
    const latencyMs = (diff[0] * 1000) + (diff[1] / 1000000);
    totalLatency += latencyMs;
    console.log(`Request ${i}: ${latencyMs.toFixed(2)} ms`);
  }

  const avgLatency = totalLatency / ITERATIONS;
  console.log(`\n✅ Rata-rata Latensi ${endpoint.name}: ${avgLatency.toFixed(2)} ms`);
  
  if (avgLatency < 200) {
    console.log(`🎯 Status: LULUS (Target < 200 ms terpenuhi)`);
  } else {
    console.log(`❌ Status: GAGAL (Target < 200 ms tidak terpenuhi)`);
  }
}

async function runTests() {
  console.log('=== MEMULAI PENGUJIAN WAKTU RESPON API (LATENCY) ===');
  for (const endpoint of endpoints) {
    try {
      await measureLatency(endpoint);
    } catch (error) {
      console.error(`\nGagal mengakses ${endpoint.name}: ${error.message}`);
      console.log('Pastikan server backend (Node.js) sedang berjalan di port 3000!');
    }
  }
}

runTests();
