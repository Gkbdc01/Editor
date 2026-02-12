import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

// Test utilities
const log = (title, msg) => console.log(`\n📝 ${title}: ${msg}`);
const success = (msg) => console.log(`✅ ${msg}`);
const error = (msg) => console.log(`❌ ${msg}`);

async function runTests() {
    try {
        log('Test Suite', 'Starting API tests...\n');

        // Test 1: Health check
        log('Test 1', 'Health check');
        try {
            const healthRes = await axios.get('http://localhost:3000/api/health');
            success(`Server is running: ${healthRes.data.status}`);
        } catch (err) {
            error(`Health check failed: ${err.message}`);
            error('Make sure the server is running with: npm start');
            return;
        }

        // Test 2: Get all questions
        log('Test 2', 'Fetch all questions');
        try {
            const questionsRes = await axios.get(`${API_BASE}/submissions/questions`);
            success(`Retrieved ${questionsRes.data.questions.length} questions`);
            if (questionsRes.data.questions.length > 0) {
                success(`Sample: ${questionsRes.data.questions[0].title}`);
            }
        } catch (err) {
            error(`Failed to fetch questions: ${err.response?.data?.error || err.message}`);
        }

        // Test 3: Get single question
        log('Test 3', 'Fetch single question by ID');
        try {
            const questionRes = await axios.get(`${API_BASE}/submissions/questions/1`);
            success(`Retrieved question: ${questionRes.data.question.title}`);
            success(`Difficulty: ${questionRes.data.question.difficulty}`);
            success(`Test cases count: ${questionRes.data.question.testCases.length}`);
        } catch (err) {
            error(`Failed to fetch question: ${err.response?.data?.error || err.message}`);
        }

        // Test 4: Submit code for evaluation
        log('Test 4', 'Submit JavaScript code for evaluation');
        try {
            const submissionRes = await axios.post(`${API_BASE}/submissions/submit`, {
                code: `
                    function twoSum(nums, target) {
                        for (let i = 0; i < nums.length; i++) {
                            for (let j = i + 1; j < nums.length; j++) {
                                if (nums[i] + nums[j] === target) {
                                    return [i, j];
                                }
                            }
                        }
                        return [];
                    }
                `,
                language: 'javascript',
                problemId: 1
            });
            const jobId = submissionRes.data.jobId;
            success(`Code submitted. Job ID: ${jobId}`);

            // Test 5: Check job status
            log('Test 5', 'Check submission status');
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 500));
                const statusRes = await axios.get(`${API_BASE}/submissions/status/${jobId}`);
                const status = statusRes.data.status;
                log(`Status Check ${i + 1}`, `Job status: ${status}`);

                if (status === 'completed' || status === 'failed') {
                    if (statusRes.data.result) {
                        log('Result', JSON.stringify(statusRes.data.result, null, 2));
                    }
                    if (statusRes.data.error) {
                        error(`Job error: ${statusRes.data.error}`);
                    }
                    break;
                }
            }
        } catch (err) {
            error(`Failed to submit code: ${err.response?.data?.error || err.message}`);
        }

        // Test 6: Error handling - missing code
        log('Test 6', 'Error handling - missing code');
        try {
            await axios.post(`${API_BASE}/submissions/submit`, {
                language: 'javascript',
                problemId: 1
            });
            error('Should have returned 400 error');
        } catch (err) {
            if (err.response?.status === 400) {
                success(`Correctly returned 400: ${err.response.data.error}`);
            } else {
                error(`Unexpected error: ${err.message}`);
            }
        }

        // Test 7: Error handling - invalid problem ID
        log('Test 7', 'Error handling - invalid problem ID');
        try {
            await axios.post(`${API_BASE}/submissions/submit`, {
                code: 'console.log("test");',
                language: 'javascript',
                problemId: 99999
            });
            error('Should have returned error for invalid problem');
        } catch (err) {
            if (err.response?.status === 404) {
                success(`Correctly returned 404: ${err.response.data.error}`);
            } else {
                success(`Correctly handled invalid problem: ${err.response?.data?.error}`);
            }
        }

        log('Test Suite', 'All tests completed! ✅');

    } catch (err) {
        error(`Unexpected error: ${err.message}`);
    }
}

runTests();