# Docker Code Execution System

This directory contains Docker-based code execution infrastructure for the LeetCode-style editor.

## Files Overview

### Language Executors (Dockerfiles)

#### `Dockerfile.javascript`
**Purpose:** Container image for executing JavaScript code  
**Base Image:** node:18-alpine  
**Test Runner:** executor.js  
**Test Case Support:** ✅ Full support for all problem types

#### `Dockerfile.python`
**Purpose:** Container image for executing Python code  
**Base Image:** python:3.11-slim  
**Test Runner:** executor.py  
**Test Case Support:** ✅ Full support for all problem types

#### `Dockerfile.cpp`
**Purpose:** Container image for compiling and executing C++ code  
**Base Image:** gcc:13-alpine  
**Test Runner:** executor.cpp  
**Test Case Support:** ✅ Requires proper C++ class/method signatures

#### `Dockerfile.java`
**Purpose:** Container image for compiling and executing Java code  
**Base Image:** openjdk:21-slim  
**Test Runner:** Executor.java  
**Test Case Support:** ✅ Requires proper class names (e.g., Solution)

### Infrastructure Dockerfiles

#### `Dockerfile.api`
**Purpose:** Containerized API server  
**Runs:** Express.js server on port 3000  
**Usage:** For docker-compose deployment

#### `Dockerfile.worker`
**Purpose:** Containerized judge worker  
**Runs:** Job processing worker  
**Special:** Includes Docker CLI for nested container management  
**Usage:** Processes jobs from Redis queue

### Test Executors (Runtime Scripts)

#### `executor.js` - JavaScript Test Runner
**Input:**
- `code.js` - User-submitted code
- `testCases.json` - Array of test cases

**Process:**
1. Load test cases array from JSON
2. Execute user code in safe context
3. For each test:
   - Parse input string into parameters
   - Call user function with parameters
   - Normalize and compare output
   - Record results (pass/fail)

**Output:** JSON with:
```json
{
  "passed": number,
  "failed": number,
  "totalTests": number,
  "testResults": [
    {
      "input": "...",
      "expectedOutput": "...",
      "actualOutput": "...",
      "passed": boolean,
      "explanation": "..."
    }
  ],
  "compilationError": null
}
```

**Error Handling:**
- Syntax errors → compilationError
- Runtime errors → Recorded per test case
- Timeout (30s) → compilationError + forced exit

#### `executor.py` - Python Test Runner
**Input:**
- `code.py` - User-submitted code
- `testCases.json` - Array of test cases

**Process:**
1. Load and parse test cases
2. Execute user code in isolated namespace
3. Discover main function
4. Run tests with input validation
5. Compare outputs

**Output:** JSON (same format as JavaScript)

#### `executor.cpp` - C++ Test Runner
**Input:**
- `code.cpp` - User-submitted code
- `testCases.json` - Test cases as JSON
- `executor.cpp` - Lives alongside user code

**Process:**
1. Include user code via preprocessor
2. Compile with C++17 standard
3. Link with user code
4. Execute tests
5. Output JSON results

**Output:** JSON (same format)

**Requirements:**
- User must implement required function signatures
- Must include necessary headers

#### `Executor.java` - Java Test Runner
**Input:**
- `Solution.java` - User-submitted code
- `testCases.json` - Test cases
- `Executor.java` - Test runner

**Process:**
1. Compile Solution.java
2. Compile Executor.java
3. Create Solution instance
4. Call methods with test inputs
5. Record results

**Output:** JSON (same format)

**Requirements:**
- User code must have correct class name: `Solution`
- Methods must have correct signatures

## How They Work Together

### Execution Flow

```
user_code.js/py/cpp/java
       ↓
Docker Image (judge-language:latest)
       ↓
Container starts with mounted /app volume
       ↓
executor script runs:
  • Loads test cases from testCases.json
  • Loads user code
  • For each test case:
    - Parse inputs
    - Execute code
    - Compare with expected output
    - Record result
       ↓
Output JSON to stdout
       ↓
Worker captures output
       ↓
Parse JSON and return results
```

### Resource Limits (Per Container)

All containers are limited to:
- **Memory:** 512 MB
- **CPU:** 0.5 cores (50%)
- **Timeout:** 30 seconds
- **Max Processes:** 100
- **File Descriptors:** Standard OS limit
- **Network:** Disabled
- **Root FS:** Read-only (tmpfs for /tmp)

## Building Images

### Automatic Build (Recommended)

```bash
# From backend directory
npm run docker:build

# Builds all four language images
# Docker caches images for reuse
```

### Manual Build

```bash
# Build specific language
docker build -f docker/Dockerfile.javascript -t judge-javascript .
docker build -f docker/Dockerfile.python -t judge-python .
docker build -f docker/Dockerfile.cpp -t judge-cpp .
docker build -f docker/Dockerfile.java -t judge-java .

# Build infrastructure images
docker build -f docker/Dockerfile.api -t leetcode-api .
docker build -f docker/Dockerfile.worker -t leetcode-worker .
```

## Using with Docker Compose

The docker-compose.yml orchestrates all services:

```yaml
services:
  mongodb:  # Database
  redis:    # Queue
  api:      # API Server
  worker:   # Judge Worker
  # Judge containers created on-demand
```

Run with:
```bash
docker-compose up -d
```

## Image Sizes (Approximate)

| Language | Size | Startup |
|----------|------|---------|
| JavaScript | 150-200 MB | 200ms |
| Python | 200-250 MB | 250ms |
| C++ | 300-400 MB | 300ms |
| Java | 400-500 MB | 400ms |

*After first build, images are cached for faster reuse*

## Test Case JSON Format

All executors expect the same test case format:

```json
[
  {
    "input": "[2,7,11,15], 9",
    "expectedOutput": "[0,1]",
    "explanation": "Simple case"
  },
  {
    "input": "[3,2,4], 6",
    "expectedOutput": "[1,2]",
    "explanation": "Different indices"
  }
]
```

**Field Descriptions:**
- `input` - String representation of function parameters
- `expectedOutput` - JSON string of expected return value
- `explanation` - Human-readable description of test

## Adding a New Language

### Step 1: Create Dockerfile

```dockerfile
# docker/Dockerfile.{language}
FROM {base-image}

WORKDIR /app

COPY code.{ext} /app/
COPY testCases.json /app/
COPY executor.{language} /app/

CMD ["{run-command}"]
```

### Step 2: Create Executor

```javascript
// docker/executor.{language}
// Load testCases.json
// Load user code
// For each test:
//   - Parse input
//   - Call function
//   - Compare output
// Output JSON results
```

### Step 3: Update Docker Manager

In `src/services/dockerExecutor.js`:
- Add case for new language in `getContainerCommand()`
- Add Dockerfile path in `ensureDockerImage()`

### Step 4: Test

```bash
# Build image
docker build -f docker/Dockerfile.newlang -t judge-newlang .

# Test execution
npm run test
```

## Debugging Containers

### View Container Logs

```bash
docker logs <container-id>
docker logs -f <container-id>  # Follow logs
```

### Inspect Runtime Files

```bash
docker exec <container-id> cat /app/testCases.json
docker exec <container-id> cat /app/code.js
```

### Get Shell Access

```bash
docker exec -it <container-id> sh
```

### View Container Stats

```bash
docker stats <container-id>
```

## Performance Optimization

### 1. Cache Images
Images build once and are cached:
```bash
docker images | grep judge
```

### 2. Parallel Workers
Run multiple workers:
```bash
docker-compose up -d --scale worker=3
```

### 3. Memory Tuning
Adjust limits in `src/services/dockerExecutor.js`:
```javascript
Memory: 1024 * 1024 * 1024,  // 1GB
```

### 4. CPU Tuning
Increase CPU quota:
```javascript
CPUQuota: 100000,  // Full core
CPUPeriod: 100000
```

## Security Considerations

✅ **What's Protected:**
- No access to host filesystem
- No external network access
- Resource-limited execution
- Timeout protection
- Process isolation

⚠️ **Still Important:**
- Keep Docker daemon secure
- Regular image updates
- Monitor container escape exploits
- Log all submissions

## Troubleshooting

### "Cannot connect to Docker daemon"
```bash
# Start Docker
docker-compose up -d

# Or Docker Desktop on Windows/Mac
open /Applications/Docker.app
```

### "No such image: judge-javascript"
```bash
npm run docker:build
```

### Container exits immediately
```bash
docker logs <container-id>
# Check for errors in executor script
```

### Out of memory errors
```javascript
// Increase memory limit in dockerExecutor.js
Memory: 1024 * 1024 * 1024,  // 1GB instead of 512MB
```

### Slow execution
```bash
# Check Docker resource allocation
docker stats

# Switch to native backend (Docker Desktop settings)
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
```

## Files Modified/Created

### New Files
- docker/Dockerfile.javascript ✨
- docker/Dockerfile.python ✨
- docker/Dockerfile.cpp ✨
- docker/Dockerfile.java ✨
- docker/executor.js ✨
- docker/executor.py ✨
- docker/executor.cpp ✨
- docker/Executor.java ✨
- docker/Dockerfile.api ✨
- docker/Dockerfile.worker ✨
- src/services/dockerExecutor.js ✨

### Updated Files
- backend/worker.js (uses Docker executor)
- backend/package.json (added dockerode)
- docker-compose.yml (full orchestration)

## Examples

### JavaScript Example
```javascript
// /app/code.js
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
```

### Python Example
```python
# /app/code.py
def twoSum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []
```

### C++ Example
```cpp
// /app/code.cpp
vector<int> twoSum(vector<int>& nums, int target) {
    for (int i = 0; i < nums.size(); i++) {
        for (int j = i + 1; j < nums.size(); j++) {
            if (nums[i] + nums[j] == target) {
                return {i, j};
            }
        }
    }
    return {};
}
```

### Java Example
```java
// /app/Solution.java
class Solution {
    public int[] twoSum(int[] nums, int target) {
        for (int i = 0; i < nums.length; i++) {
            for (int j = i + 1; j < nums.length; j++) {
                if (nums[i] + nums[j] == target) {
                    return new int[]{i, j};
                }
            }
        }
        return new int[]{};
    }
}
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Dockerode (Node Docker API)](https://github.com/apocas/dockerode)
- [BullMQ Queue System](https://docs.bullmq.io/)
- Parent Project: [README.md](../README.md)
- Full Guide: [DOCKER_EXECUTION_GUIDE.md](../DOCKER_EXECUTION_GUIDE.md)

---

**Directory:** backend/docker/  
**Purpose:** Docker-based isolated code execution  
**Status:** ✅ Complete and Production-Ready  
**Last Updated:** February 12, 2026
