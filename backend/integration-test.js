import http from 'http';

const API_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5174';

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
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function httpPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

let testCount = 0;
let passedCount = 0;

async function test(name, fn) {
  testCount++;
  try {
    await fn();
    console.log(`✅ Test ${testCount}: ${name}`);
    passedCount++;
  } catch (error) {
    console.log(`❌ Test ${testCount}: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}


console.log('\n🌐 Full-Stack Integration Tests\n');

// Test 1: Backend Health
await test('Backend API is running', async () => {
  try {
    const res = await httpGet(`${API_URL}/health`);
    if (res.status !== 200 || res.data.status !== 'Server is running') {
      throw new Error(`Got status ${res.status}`);
    }
  } catch (e) {
    throw new Error(`Backend not responding: ${e.message}`);
  }
});

// Test 2: Frontend Dev Server
await test('Frontend dev server is running', async () => {
  try {
    const res = await httpGet(FRONTEND_URL);
    if (res.status !== 200) throw new Error(`Got status ${res.status}`);
  } catch (e) {
    throw new Error(`Frontend not responding: ${e.message}`);
  }
});

// Test 3: Backend can fetch questions
await test('Backend returns questions', async () => {
  const res = await httpGet(`${API_URL}/submissions/questions`);
  if (!res.data.questions || !Array.isArray(res.data.questions) || res.data.questions.length === 0) {
    throw new Error('No questions returned');
  }
});

// Test 4: Questions have required fields
await test('Questions have valid structure', async () => {
  const res = await httpGet(`${API_URL}/submissions/questions`);
  const question = res.data.questions[0];
  if (!question.id || !question.title || !question.description) {
    throw new Error('Missing required fields');
  }
  if (!question.boilerplate.javascript) {
    throw new Error('Missing boilerplate');
  }
  if (!Array.isArray(question.testCases)) {
    throw new Error('Missing test cases');
  }
});

// Test 5: Submit code and get job ID
await test('Can submit code for execution', async () => {
  const res = await httpPost(`${API_URL}/submissions/submit`, {
    problemId: 1,
    code: `function twoSum(nums, target) {\n  return [0, 1];\n}`,
    language: 'javascript'
  });
  if (!res.data.jobId) {
    throw new Error(`No job ID returned, status: ${res.status}`);
  }
});

// Test 6: Get single question
await test('Can fetch single question by ID', async () => {
  const res = await httpGet(`${API_URL}/submissions/questions/1`);
  const question = res.data.question;
  if (question.id !== 1 || !question.title) {
    throw new Error('Invalid question response');
  }
});

// Test 7: Error handling - missing required field
await test('Rejects invalid submission (missing code)', async () => {
  try {
    const res = await httpPost(`${API_URL}/submissions/submit`, {
      problemId: 1,
      language: 'javascript'
    });
    if (res.status !== 400) {
      throw new Error(`Should return 400, got ${res.status}`);
    }
  } catch (error) {
    if (error.message.includes('Should return')) throw error;
  }
});

// Test 8: Error handling - invalid problem ID
await test('Rejects invalid problem ID', async () => {
  try {
    const res = await httpPost(`${API_URL}/submissions/submit`, {
      problemId: 99999,
      code: 'some code',
      language: 'javascript'
    });
    if (res.status !== 404 && res.status !== 400) {
      throw new Error(`Should return 404 or 400, got ${res.status}`);
    }
  } catch (error) {
    if (error.message.includes('Should return')) throw error;
  }
});

// Test 9: Multiple languages supported
await test('Supports multiple languages', async () => {
  const languages = ['javascript', 'python', 'cpp', 'java'];
  const res = await httpGet(`${API_URL}/submissions/questions/1`);
  const question = res.data.question;
  
  for (const lang of languages) {
    if (!question.boilerplate[lang]) {
      throw new Error(`Missing ${lang} boilerplate`);
    }
  }
});

// Test 10: Database has seeded data
await test('Database contains seeded questions', async () => {
  const res = await httpGet(`${API_URL}/submissions/questions`);
  const titles = res.data.questions.map(q => q.title);
  const expectedTitles = ['Two Sum', 'Palindrome String', 'Valid Parentheses', 'Reverse String', 'Longest Substring Without Repeating Characters'];
  
  for (const title of expectedTitles) {
    if (!titles.includes(title)) {
      throw new Error(`Missing "${title}" in database`);
    }
  }
});

console.log(`\n📊 Results: ${passedCount}/${testCount} tests passed\n`);

if (passedCount === testCount) {
  console.log('🎉 All full-stack integration tests PASSED!\n');
  process.exit(0);
} else {
  console.log(`⚠️  ${testCount - passedCount} test(s) failed\n`);
  process.exit(1);
}
