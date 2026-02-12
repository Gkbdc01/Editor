# Test Case Execution & Result Comparison - Technical Deep Dive

## Complete Execution Flow

### Phase 1: Submission Intake

```
API Request:
POST /api/submissions/submit
{
  "code": "function twoSum(nums, target) { ... }",
  "language": "javascript",
  "problemId": 1
}
             ↓
Validation Layer:
  ✓ Code not empty
  ✓ Language supported
  ✓ Problem ID valid
             ↓
Database Lookup:
  Question.findOne({ id: 1 })
  → Retrieves test cases from DB
             ↓
Create Redis Job:
  submissionQueue.add('eval-submission', {
    code: "...",
    language: "javascript",
    problemId: 1,
    testCases: [
      { input: "[2,7,11,15], 9", expectedOutput: "[0,1]", ... },
      { input: "[3,2,4], 6", expectedOutput: "[1,2]", ... },
      { input: "[3,3], 6", expectedOutput: "[0,1]", ... }
    ]
  })
             ↓
Response:
{
  "success": true,
  "jobId": "abc123"
}
```

### Phase 2: Job Processing

```
Worker polls Redis queue continuously...

Queue Trigger:
┌─────────────────────────────────┐
│ Job ID: abc123                  │
│ Status: waiting → processing    │
│ Language: javascript            │
│ TestCases: 3                    │
└─────────────────────────────────┘
             ↓
Worker Validation:
  ✓ Language in ['javascript', 'python', 'cpp', 'java']
  ✓ Code not malicious (basic checks)
  ✓ TestCases array valid
             ↓
Create Temp Directory:
  /tmp/judge-1708873649000/
             ↓
Write Files:
  code.js        ← User code
  testCases.json ← All test cases
             ↓
Build/Pull Docker Image:
  judge-javascript:latest
  (cached if exists)
             ↓
Docker Container Creation:
  docker run \
    --image judge-javascript:latest \
    --memory 512m \
    --cpus 0.5 \
    --timeout 30s \
    --volume /tmp/judge-xxx:/app \
    --env NODE_ENV=production
             ↓
Container Startup:
  → node executor.js
```

### Phase 3: Test Case Execution Inside Container

```
┌──────────────────────────────────────────────────────┐
│         Docker Container Environment                 │
│                                                      │
│  /app/                                               │
│  ├── code.js          (User submitted code)         │
│  ├── testCases.json   (Test cases)                  │
│  └── executor.js      (Test runner)                 │
│                                                      │
│  Resources:                                          │
│  • Memory: 512 MB                                    │
│  • CPU: 0.5 cores                                    │
│  • Timeout: 30 seconds                               │
│  • No network access                                 │
│  • No external file system                           │
└──────────────────────────────────────────────────────┘
             ↓
Executor Initialization:
1. Load testCases.json
   [
     {"input": "[2,7,11,15], 9", "expectedOutput": "[0,1]"},
     {"input": "[3,2,4], 6", "expectedOutput": "[1,2]"},
     {"input": "[3,3], 6", "expectedOutput": "[0,1]"}
   ]

2. Load code.js
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

3. Extract function name
   Regex: /function\s+(\w+)/
   Result: "twoSum"

4. Prepare execution environment
   namespace = {}
   eval(userCode, namespace)
   userFunction = namespace['twoSum']
```

### Phase 4: Individual Test Case Execution

```
FOR EACH TEST CASE:

┌─ Test Case 1 ────────────────────────────────────────┐
│                                                       │
│ INPUT PARSING:                                        │
│   Raw Input: "[2,7,11,15], 9"                        │
│   ↓                                                    │
│   1. Check if starts with '[' → YES                  │
│   2. JSON.parse("[2,7,11,15]") → [2, 7, 11, 15]     │
│   3. JSON.parse("9") → 9                             │
│   ↓                                                    │
│   Parsed Inputs: [[2, 7, 11, 15], 9]                │
│                                                       │
│ FUNCTION EXECUTION:                                   │
│   Call: twoSum([2, 7, 11, 15], 9)                    │
│   ↓                                                    │
│   i = 0, j = 1:                                      │
│     nums[0] + nums[1] = 2 + 7 = 9 ✓ MATCH           │
│   ↓                                                    │
│   Return: [0, 1]                                      │
│                                                       │
│ OUTPUT COMPARISON:                                    │
│   Expected: "[0,1]" (from database)                  │
│   Actual: [0, 1] (from function)                     │
│                                                       │
│   Normalization:                                      │
│     Expected → JSON.stringify(JSON.parse("[0,1]"))   │
│             → JSON.stringify([0, 1])                 │
│             → "[0,1]"                                │
│                                                       │
│     Actual → JSON.stringify([0, 1])                  │
│            → "[0,1]"                                 │
│                                                       │
│   Comparison: "[0,1]" === "[0,1]" ✓ PASS            │
│                                                       │
│ RESULT RECORDED:                                      │
│   {                                                    │
│     "input": "[2,7,11,15], 9",                       │
│     "expectedOutput": "[0,1]",                        │
│     "actualOutput": "[0,1]",                          │
│     "passed": true,                                   │
│     "explanation": "Simple case"                      │
│   }                                                    │
│                                                       │
└───────────────────────────────────────────────────────┘

┌─ Test Case 2 ────────────────────────────────────────┐
│                                                       │
│ INPUT: "[3,2,4], 6"                                  │
│ PARSED: [[3, 2, 4], 6]                               │
│                                                       │
│ EXECUTION:                                            │
│   twoSum([3, 2, 4], 6)                               │
│   i = 0, j = 1: 3 + 2 = 5 ✗                          │
│   i = 0, j = 2: 3 + 4 = 7 ✗                          │
│   i = 1, j = 2: 2 + 4 = 6 ✓ MATCH                    │
│   Return: [1, 2]                                      │
│                                                       │
│ COMPARISON: "[1,2]" === "[1,2]" ✓ PASS              │
│                                                       │
│ RESULT: { passed: true, ... }                         │
│                                                       │
└───────────────────────────────────────────────────────┘

┌─ Test Case 3 ────────────────────────────────────────┐
│                                                       │
│ INPUT: "[3,3], 6"                                    │
│ PARSED: [[3, 3], 6]                                  │
│                                                       │
│ EXECUTION:                                            │
│   twoSum([3, 3], 6)                                  │
│   i = 0, j = 1: 3 + 3 = 6 ✓ MATCH                    │
│   Return: [0, 1]                                      │
│                                                       │
│ COMPARISON: "[0,1]" === "[0,1]" ✓ PASS              │
│                                                       │
│ RESULT: { passed: true, ... }                         │
│                                                       │
└───────────────────────────────────────────────────────┘

FINAL RESULTS:
{
  "passed": 3,
  "failed": 0,
  "totalTests": 3,
  "compilationError": null,
  "testResults": [
    { input: "[2,7,11,15], 9", actualOutput: "[0,1]", passed: true },
    { input: "[3,2,4], 6", actualOutput: "[1,2]", passed: true },
    { input: "[3,3], 6", actualOutput: "[0,1]", passed: true }
  ]
}
```

### Phase 5: Result Processing & Cleanup

```
Container Execution Complete:
  stdout: JSON.stringify(results)
  exit code: 0
             ↓
Capture Output:
  logs.toString('utf8') → JSON string
             ↓
Parse JSON Results:
  JSON.parse(output) → Object
             ↓
Generate Summary:
  {
    status: "accepted",
    passed: 3,
    failed: 0,
    percentage: "100.00",
    details: [
      { status: "PASS", ... },
      { status: "PASS", ... },
      { status: "PASS", ... }
    ]
  }
             ↓
Container Cleanup:
  container.remove()
             ↓
File Cleanup:
  rm -rf /tmp/judge-xxx
             ↓
Update Job Status in Redis:
  job.returnvalue = { passed: 3, failed: 0, ... }
  job.status = "completed"
```

## Comparison Algorithm Details

### 1. Input Parsing

```javascript
function parseInput(input) {
  // Input: "[2,7,11,15], 9"
  
  try {
    // Check if array
    if (input.startsWith('[')) {
      return JSON.parse(input);  // → [2, 7, 11, 15]
    }
    
    // Otherwise, split by comma
    return input.split(',').map(s => {
      const trimmed = s.trim();
      try {
        return JSON.parse(trimmed);  // Try parsing as JSON
      } catch {
        return trimmed;              // Return as string if fails
      }
    });
  } catch {
    return [input];  // Fallback: return as single item
  }
  
  // Supports:
  // "[1,2,3]" → [1, 2, 3]
  // "5, hello, 3.14" → [5, "hello", 3.14]
  // "[{a: 1}]" → [{a: 1}]
}
```

### 2. Output Normalization

```javascript
// For comparison, both sides normalized to JSON strings

const expected = "[0,1]";
const actualArray = [0, 1];

// Normalize expected
const expectedNormalized = JSON.stringify(JSON.parse(expected));
// → "[0,1]"

// Normalize actual
const actualNormalized = JSON.stringify(actualArray);
// → "[0,1]"

// Compare
passed = expectedNormalized === actualNormalized;
// → true
```

### 3. Comparison Logic

```javascript
// STRICT COMPARISON - Type and structure matter

✓ [0, 1]      === "[0,1]"           (PASS)
✗ [0, 1]      === "0, 1"            (FAIL)
✗ [1, 0]      === "[0,1]"           (FAIL)
✗ [0, 1, 1]   === "[0,1]"           (FAIL)
✓ {"a": 1}    === '{"a":1}'         (PASS)
✗ {a: 1}      === '{"a":1}'         (FAIL - missing quotes)
✓ "hello"     === '"hello"'         (PASS)
✗ 'hello'     === '"hello"'         (FAIL - single quotes)
```

### 4. Error Cases

```javascript
// Case: Wrong output
Input: "[2,7,11,15], 9"
Expected: "[0,1]"
Actual (buggy): "[1,0]"  // Swapped indices

Comparison:
  expected → JSON.stringify(JSON.parse("[0,1]")) → "[0,1]"
  actual → JSON.stringify([1, 0]) → "[1,0]"
  "[0,1]" === "[1,0]" → false

Result: { passed: false, error: null }

// Case: Runtime error
Input: "[2,7,11,15], 9"
Expected: "[0,1]"
Error: TypeError: Cannot read property 'length' of undefined

Comparison: 
  Caught in try-catch
  Error recorded in result

Result: {
  passed: false,
  error: "TypeError: Cannot read property 'length' of undefined",
  input: "[2,7,11,15], 9"
}

// Case: Timeout
Input: [any]
Error: Code runs > 30 seconds

Result:
  Container killed
  {
    passed: false,
    error: "Execution timeout (30s exceeded)"
  }
```

## Summary Report Generation

```javascript
function generateResultsSummary(testResults) {
  const { passed, failed, totalTests, testResults: results } = testResults;

  return {
    // Overall status
    status: failed === 0 ? 'accepted' : 'rejected',
    
    // Statistics
    passed,
    failed,
    totalTests,
    percentage: ((passed / totalTests) * 100).toFixed(2),
    
    // Detailed results
    details: results.map(r => ({
      status: r.passed ? 'PASS' : 'FAIL',
      input: r.input,
      expected: r.expectedOutput,
      actual: r.actualOutput,
      error: r.error || null
    }))
  };
}

// Example output:
{
  "status": "accepted",
  "passed": 3,
  "failed": 0,
  "totalTests": 3,
  "percentage": "100.00",
  "details": [
    {
      "status": "PASS",
      "input": "[2,7,11,15], 9",
      "expected": "[0,1]",
      "actual": "[0,1]"
    },
    // ...
  ]
}
```

## Performance Metrics

```
Time Breakdown (per submission):

1. API Validation          :  ~2ms
2. Redis Queue Add         :  ~5ms
3. Worker Pickup           :  ~50ms (depending on queue)
4. File Preparation        :  ~10ms
5. Docker Image Build      :  ~100ms (cached: ~0ms)
6. Container Startup       :  ~200ms
7. Code Execution (avg)    :  ~50-500ms
8. Result Processing       :  ~10ms
9. File Cleanup            :  ~20ms
10. Redis Job Complete     :  ~5ms
   ─────────────────────────────────
   TOTAL                   :  300-800ms

JavaScript:  350ms average
Python:      450ms average
C++:         500-800ms average
Java:        800ms-1s average
```

## Database Schema - Test Cases

```javascript
Question {
  id: Number,
  testCases: [
    {
      input: String,           // "[2,7,11,15], 9"
      expectedOutput: String,  // "[0,1]"
      explanation: String      // "Because nums[0] + nums[1] == 9..."
    }
  ]
}
```

## API Response Format

```javascript
// Submission Status Response
{
  "success": true,
  "status": "completed",
  "result": {
    "passed": 3,
    "failed": 0,
    "totalTests": 3,
    "compilationError": null,
    "testResults": [
      {
        "input": "[2,7,11,15], 9",
        "expectedOutput": "[0,1]",
        "actualOutput": "[0,1]",
        "passed": true,
        "explanation": "Simple case"
      },
      // ... more test results
    ],
    "summary": {
      "status": "accepted",
      "passed": 3,
      "failed": 0,
      "percentage": "100.00",
      "details": [...]
    }
  }
}
```

---

**Key Points:**

✅ Type-safe comparison using JSON serialization  
✅ Isolated Docker environments prevent interference  
✅ Resource limits prevent DoS attacks  
✅ Comprehensive error handling and reporting  
✅ Fast execution with container caching  
✅ Automatic cleanup prevents disk space issues  
