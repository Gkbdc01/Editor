import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Setup Redis Connection
const connection = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
});

// Create the Queue
export const submissionQueue = new Queue('judge-queue', { connection });

// Export connection for worker process
export { connection };