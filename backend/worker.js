import { Worker } from 'bullmq';
import { connection } from './src/Config/redisConfig.js';
import { executeInDocker, generateResultsSummary } from './src/services/dockerExecutor.js';
import dotenv from 'dotenv';

dotenv.config();

// Worker to process code submissions using Docker containers
const worker = new Worker(
  'judge-queue',
  async (job) => {
    const { code, language, problemId, testCases } = job.data;
    
    console.log(`\n📦 Processing job ${job.id} for problem ${problemId}`);
    console.log(`🐳 Language: ${language}`);
    console.log(`📋 Test cases: ${testCases.length}`);

    try {
      // Validate language
      const supportedLanguages = ['javascript', 'python', 'cpp', 'java'];
      if (!supportedLanguages.includes(language)) {
        throw new Error(`Unsupported language: ${language}. Supported: ${supportedLanguages.join(', ')}`);
      }

      // Execute code in isolated Docker container
      const testResults = await executeInDocker(language, code, testCases);

      // Generate summary
      const summary = generateResultsSummary(testResults);

      console.log(`✅ Job ${job.id} completed`);
      console.log(`   Passed: ${summary.passed}/${summary.totalTests} (${summary.percentage}%)`);

      return {
        ...testResults,
        summary
      };
    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      
      return {
        passed: 0,
        failed: testCases.length,
        totalTests: testCases.length,
        compilationError: error.message,
        testResults: [],
        summary: {
          status: 'error',
          passed: 0,
          failed: testCases.length,
          totalTests: testCases.length,
          percentage: '0.00',
          details: []
        }
      };
    }
  },
  { 
    connection,
    settings: {
      retryProcessDelay: 5000,
      lockDuration: 30000,
      lockRenewTime: 15000
    }
  }
);

// Event handlers
worker.on('completed', (job) => {
  console.log(`\n✅ Job ${job.id} completed successfully\n`);
});

worker.on('failed', (job, err) => {
  console.error(`\n❌ Job ${job.id} failed: ${err.message}\n`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...');
  await worker.close();
  process.exit(0);
});

console.log('\n🚀 Docker-based Judge Worker Started');
console.log('⏳ Listening for jobs on judge-queue...\n');
