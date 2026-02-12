import { submissionQueue } from '../Config/redisConfig.js';
import { Question } from '../models/Question.js';

// 1. Get Questions
export const getQuestions = async (req, res) => {
    try {
        const questions = await Question.find();
        res.json({ success: true, questions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Get Single Question
export const getQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await Question.findOne({ id: parseInt(id) });
        
        if (!question) {
            return res.status(404).json({ success: false, error: "Question not found" });
        }
        
        res.json({ success: true, question });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Submit Code
export const submitJob = async (req, res) => {
    const { code, language, problemId } = req.body;

    if (!code || !problemId) {
        return res.status(400).json({ success: false, error: "Code and problemId are required!" });
    }

    try {
        // Validate problem exists
        const question = await Question.findOne({ id: problemId });
        if (!question) {
            return res.status(404).json({ success: false, error: "Problem not found" });
        }

        // Add to Redis Queue for job processing
        const job = await submissionQueue.add("eval-submission", { 
            code, 
            language, 
            problemId,
            testCases: question.testCases
        }, {
            removeOnComplete: true,
            removeOnFail: 3600 // Keep failed jobs for 1 hour
        });

        res.status(201).json({ success: true, jobId: job.id });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 4. Check Submission Status
export const getJobStatus = async (req, res) => {
    const jobId = req.params.jobId;

    try {
        const job = await submissionQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ success: false, error: "Job not found or expired" });
        }

        const state = await job.getState();
        const progress = job.progress();
        const result = job.returnvalue;
        const failReason = job.failedReason;

        if (state === "completed") {
            return res.json({ 
                success: true, 
                status: "completed", 
                result: result || { passed: true, message: "All tests passed" }
            });
        } else if (state === "failed") {
            return res.json({ 
                success: true, 
                status: "failed", 
                error: failReason || "Execution failed" 
            });
        } else {
            return res.json({ 
                success: true, 
                status: state,
                progress: progress 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};