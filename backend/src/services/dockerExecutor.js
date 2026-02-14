import { spawn } from 'child_process';
import tar from 'tar-stream';
import { poolManager } from './containerPool.js';

// ---------------------------------------------------------
// 1. LANGUAGE CONFIGURATIONS & COMMANDS
// ---------------------------------------------------------
const config = {
    javascript: {
        filename: 'solution.js',
        compileCmd: null,
        runCmd: ['node', '/tmp/solution.js']
    },
    python: {
        filename: 'solution.py',
        compileCmd: null,
        runCmd: ['python3', '/tmp/solution.py']
    },
    cpp: {
        filename: 'solution.cpp',
        // Compile to a binary named 'a.out' in the /tmp folder
        compileCmd: ['g++', '-O2', '/tmp/solution.cpp', '-o', '/tmp/a.out'],
        runCmd: ['/tmp/a.out']
    },
    java: {
        filename: 'Main.java', // Java code MUST have a 'public class Main'
        compileCmd: ['javac', '/tmp/Main.java'],
        runCmd: ['java', '-cp', '/tmp', 'Main']
    }
};

// ---------------------------------------------------------
// 2. MAIN EXECUTION ENGINE
// ---------------------------------------------------------
export const executeInDocker = async (language, code, testCases, onProgress) => {
    const results = [];
    const langConfig = config[language];
    
    // 1. Grab pre-warmed container
    const { name: containerName, instance: container } = await poolManager.acquireContainer(language);

    try {
        // 2. Inject code securely into the /tmp RAM-disk
        const pack = tar.pack();
        pack.entry({ name: langConfig.filename }, code);
        pack.finalize();
        await container.putArchive(pack, { path: '/tmp' });

        // 3. ⚙️ COMPILATION PHASE (For C++ and Java)
        if (langConfig.compileCmd) {
            const compileResult = await runDockerCommand(containerName, langConfig.compileCmd, null, 5000);
            
            if (compileResult.exitCode !== 0) {
                return [{ 
                    passed: false, 
                    error: `Compilation Error:\n${compileResult.error || compileResult.output}` 
                }];
            }
        }

        // 4. 🏃‍♂️ EXECUTION PHASE (Fail-Fast Test Cases)
        for (let i = 0; i < testCases.length; i++) {
            const currentTest = testCases[i];
            
            // Run the code and pipe the input via standard input
            const executionResult = await runDockerCommand(containerName, langConfig.runCmd, currentTest.input, 2000);
            
            const actualOutput = executionResult.output.trim();
            const expectedOutput = currentTest.output.trim();
            
            // Check for timeouts or runtime errors
            if (executionResult.error) {
                results.push({ testNumber: i + 1, passed: false, input: currentTest.input, expected: expectedOutput, output: actualOutput, error: executionResult.error });
                break; // FAIL-FAST
            }

            const passed = (actualOutput === expectedOutput);
            results.push({ testNumber: i + 1, passed, input: currentTest.input, expected: expectedOutput, output: actualOutput, error: null });

            if (!passed) break; // FAIL-FAST

            if (onProgress) await onProgress(((i + 1) / testCases.length) * 100);
        }

        return results;

    } catch (error) {
        throw new Error(`Execution Failed: ${error.message}`);
    } finally {
        // 5. GUARANTEED DEMOLITION
        await poolManager.demolishContainer(container);
    }
};

// ---------------------------------------------------------
// 3. UNIVERSAL DOCKER COMMAND RUNNER (Compile & Execute)
// ---------------------------------------------------------
const runDockerCommand = (containerName, cmdArray, inputData = null, timeoutMs = 2000) => {
    return new Promise((resolve) => {
        // Build the docker exec command
        const execArgs = ['exec', '-i', containerName, ...cmdArray];
        const process = spawn('docker', execArgs);
        
        let outputData = '';
        let errorData = '';

        process.stdout.on('data', (data) => { outputData += data.toString(); });
        process.stderr.on('data', (data) => { errorData += data.toString(); });

        // Kill switch for Infinite Loops
        const timeoutId = setTimeout(() => {
            process.kill();
            resolve({ output: '', error: 'Time Limit Exceeded', exitCode: 124 });
        }, timeoutMs);

        process.on('close', (code) => {
            clearTimeout(timeoutId);
            resolve({ output: outputData, error: errorData, exitCode: code });
        });

        // If we have input data (test cases), pipe it to stdin
        if (inputData !== null) {
            process.stdin.write(inputData + '\n');
            process.stdin.end();
        }
    });
};

export const generateResultsSummary = (results) => {
    // If it failed at compilation, results array only has 1 item with an error
    if (results.length === 1 && results[0].error && results[0].error.includes('Compilation Error')) {
        return { status: 'compilation_error', passed: 0, failed: 1, totalTests: 0, percentage: "0.00", details: results };
    }

    const passedTests = results.filter(r => r.passed).length;
    const totalTestsRun = results.length;
    
    return {
        status: passedTests === totalTestsRun && totalTestsRun > 0 ? 'accepted' : 'rejected',
        passed: passedTests,
        failed: totalTestsRun - passedTests,
        totalTests: totalTestsRun, 
        percentage: totalTestsRun > 0 ? ((passedTests / totalTestsRun) * 100).toFixed(2) : "0.00",
        details: results
    };
};