import { Worker } from 'bullmq';
import { connection } from './src/Config/redisConfig.js';
import { executeInDocker, generateResultsSummary } from './src/services/dockerExecutor.js';
import dotenv from 'dotenv';

dotenv.config();

const worker = new Worker(
  'judge-queue',
  async (job) => {
    const { code, language, problemId, testCases } = job.data;
    
    console.log(`\n📦 Processing job ${job.id} for problem ${problemId}`);
    console.log(`🐳 Language: ${language}`);
    console.log(`📋 Test cases: ${testCases.length}`);

    try {
      // 1. Validate language
      const supportedLanguages = ['javascript', 'python', 'cpp', 'java'];
      if (!supportedLanguages.includes(language)) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // 2. Execute code with Real-Time Progress Updates
      // We pass a callback to update the progress in Redis while the tests run
      const testResults = await executeInDocker(
        language, 
        code, 
        testCases, 
        async (progress) => {
           await job.updateProgress(Math.floor(progress));
        }
      );

      // 3. Generate structured summary
      const summary = generateResultsSummary(testResults);

      console.log(`✅ Job ${job.id} completed: ${summary.status}`);

      // 4. Return a clean, structured object
      return {
        success: true,
        testResults, // Array of each test case result
        summary      // The status (accepted/rejected) and stats
      };

    } catch (error) {
      console.error(`❌ Job ${job.id} failed:`, error.message);
      
      // Return a consistent error structure for the frontend
      return {
        success: false,
        status: 'error',
        error: error.message,
        passed: 0,
        totalTests: testCases?.length || 0,
      };
    }
  },
  { 
    connection,
    // 🛡️ THE SHIELD: Limits how many Docker containers can run at once
    concurrency: 5, 
    settings: {
      retryProcessDelay: 5000,
      lockDuration: 30000,
      lockRenewTime: 15000
    }
  }
);

// --- Event Handlers ---
worker.on('completed', (job) => {
  console.log(`\n✅ Job ${job.id} state: COMPLETED\n`);
});

worker.on('failed', (job, err) => {
  console.error(`\n❌ Job ${job.id} state: FAILED - ${err.message}\n`);
});

// Cleanly close the worker on server shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker gracefully...');
  await worker.close();
  process.exit(0);
});

console.log('\n🚀 Docker-based Judge Worker Started');
console.log('⏳ Listening for jobs on judge-queue (Max 5 parallel)...\n');