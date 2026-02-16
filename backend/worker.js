import { Worker } from 'bullmq';
import { connection } from './src/Config/redisConfig.js';
import { executeInDocker, generateResultsSummary } from './src/services/dockerExecutor.js';
import { poolManager } from './src/services/containerPool.js'; // Ensure path is correct
import dotenv from 'dotenv';

dotenv.config();

// Wrap in an async function to allow 'await' during initialization
async function start() {
    try {
        // 🔥 Warm up the engine first
        await poolManager.initialize();

        const worker = new Worker(
            'judge-queue',
            async (job) => {
                const { code, language, problemId, testCases } = job.data;
                
                console.log(`\n📦 Processing job ${job.id} for problem ${problemId}`);
                console.log(`🐳 Language: ${language}`);

                try {
                    const supportedLanguages = ['javascript', 'python', 'cpp', 'java'];
                    if (!supportedLanguages.includes(language)) {
                        throw new Error(`Unsupported language: ${language}`);
                    }

                    // Pass the progress callback to the executor
                    const testResults = await executeInDocker(
                        language, 
                        code, 
                        testCases, 
                        async (progress) => {
                           await job.updateProgress(Math.floor(progress));
                        }
                    );

                    const summary = generateResultsSummary(testResults);
                    console.log(`✅ Job ${job.id} completed: ${summary.status}`);

                    return { success: true, testResults, summary };

                } catch (error) {
                    console.error(`❌ Job ${job.id} failed:`, error.message);
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
                concurrency: 5, 
                settings: {
                    retryProcessDelay: 5000,
                    lockDuration: 30000
                }
            }
        );

        worker.on('completed', (job) => console.log(`✅ Job ${job.id} state: COMPLETED`));
        worker.on('failed', (job, err) => console.error(`❌ Job ${job.id} state: FAILED - ${err.message}`));

        console.log('\n🚀 Docker-based Judge Worker Started');
        console.log('⏳ Listening for jobs on judge-queue (Max 5 parallel)...\n');

    } catch (fatalError) {
        console.error("💀 Failed to initialize worker pools:", fatalError);
        process.exit(1);
    }
}

start();