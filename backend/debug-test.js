import http from 'http';

const API_URL = 'http://localhost:3000/api';

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

console.log('Testing Backend Endpoints...\n');

// Test health
console.log('1. Testing /api/health:');
let res = await httpGet(`${API_URL}/health`);
console.log(`   Status: ${res.status}`);
console.log(`   Body: ${res.body}\n`);

// Test questions
console.log('2. Testing /api/submissions/questions:');
res = await httpGet(`${API_URL}/submissions/questions`);
console.log(`   Status: ${res.status}`);
console.log(`   Body: ${res.body}\n`);

// Test single question
console.log('3. Testing /api/submissions/questions/1:');
res = await httpGet(`${API_URL}/submissions/questions/1`);
console.log(`   Status: ${res.status}`);
console.log(`   Body: ${res.body}\n`);
