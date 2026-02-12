import express from 'express';
import { submitJob, getJobStatus, getQuestions, getQuestion } from '../Controllers/submissionController.js';

const router = express.Router();

// Questions endpoints
router.get('/questions', getQuestions);
router.get('/questions/:id', getQuestion);

// Submission endpoints
router.post('/submit', submitJob);
router.get('/status/:jobId', getJobStatus);

export default router;