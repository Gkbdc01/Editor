const fs = require('fs');

let testResults = {
    passed: 0,
    failed: 0,
    totalTests: 0,
    testResults: [],
    compilationError: null
};

try {
    // Load test cases
    const testCases = JSON.parse(fs.readFileSync('/app/testCases.json', 'utf8'));
    testResults.totalTests = testCases.length;

    // Load and execute the user code
    const userCode = fs.readFileSync('/app/code.js', 'utf8');
    
    // Execute code in isolated context
    eval(userCode);

    // Run each test case
    for (const testCase of testCases) {
        try {
            const { input, expectedOutput, explanation } = testCase;
            const inputParams = parseInput(input);

            // Extract function name (first function defined)
            const functionNameMatch = userCode.match(/function\s+(\w+)/);
            const functionName = functionNameMatch ? functionNameMatch[1] : 'solution';

            // Get the function from global scope
            const userFunction = eval(functionName);

            // Execute function with test inputs
            const actualOutput = JSON.stringify(userFunction(...inputParams));
            const expectedOutputStr = JSON.stringify(JSON.parse(expectedOutput));
            
            const passed = actualOutput === expectedOutputStr;

            testResults.testResults.push({
                input,
                expectedOutput: expectedOutput,
                actualOutput: actualOutput,
                passed,
                explanation
            });

            if (passed) {
                testResults.passed++;
            } else {
                testResults.failed++;
            }
        } catch (error) {
            testResults.failed++;
            testResults.testResults.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: null,
                passed: false,
                explanation: testCase.explanation,
                error: error.message
            });
        }
    }
} catch (error) {
    testResults.compilationError = error.message;
}

// Helper to parse input string
function parseInput(input) {
    try {
        if (input.startsWith('[')) {
            return JSON.parse(input);
        }
        return input.split(',').map(s => {
            const trimmed = s.trim();
            try {
                return JSON.parse(trimmed);
            } catch {
                return trimmed;
            }
        });
    } catch {
        return [input];
    }
}

// Output results
console.log(JSON.stringify(testResults));
