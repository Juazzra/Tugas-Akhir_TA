const http = require('http');

const endpoints = [
    { method: 'GET', path: '/' },
    { method: 'POST', path: '/api/requests' },
    { method: 'GET', path: '/api/items' },
    { method: 'POST', path: '/api/users/login' },
    { method: 'GET', path: '/api/users/me' },
    { method: 'GET', path: '/api/inventory-logs' }
];

function sendRequest(endpoint) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: endpoint.path,
            method: endpoint.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    path: endpoint.path,
                    method: endpoint.method,
                    status: res.statusCode
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                path: endpoint.path,
                method: endpoint.method,
                status: 'ERROR',
                error: err.message
            });
        });

        if (endpoint.method === 'POST') {
            req.write(JSON.stringify({ dummy: 'data' }));
        }
        req.end();
    });
}

async function runLoadTest() {
    console.log('=== Memulai Stress-Test Simulasi Request ===');
    console.log('Mengirim 150 request secara konkuren ke localhost:3000...');
    
    const promises = [];
    for (let i = 0; i < 150; i++) {
        const endpoint = endpoints[i % endpoints.length];
        promises.push(sendRequest(endpoint));
    }

    const results = await Promise.all(promises);
    const successCount = results.filter(r => typeof r.status === 'number').length;
    
    console.log('\n=== Hasil Stress Test ===');
    console.log(`Total Request dikirim : ${results.length}`);
    console.log(`Sukses diproses      : ${successCount}`);
    console.log('Silakan periksa log terminal backend Anda untuk melihat deretan log!');
}

runLoadTest();
