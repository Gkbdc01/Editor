# Docker-Based Code Execution Guide

## Overview

This system uses **isolated Docker containers** to safely execute user-submitted code. Each submission runs in its own containerized environment with resource limits, preventing malicious or buggy code from affecting the main system.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Submission                        │
│  Code: "function twoSum(nums, target) { ... }"             │
│  Language: javascript                                       │
│  Test Cases: [...]                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Submission Queue (Redis + BullMQ)             │
│  Stores job metadata and orchestrates execution            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Judge Worker Process                       │
│  - Monitors queue for jobs                                 │
│  - Validates language and syntax                           │
│  - Manages Docker container lifecycle                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬────────────┬────────────┐
        │                         │            │            │
        ▼                         ▼            ▼            ▼
   ┌─────────┐             ┌────────┐    ┌──────┐    ┌─────┐
   │   JS    │             │ Python │    │ C++  │    │Java │
   │ Container│             │Container│   │Container│ │Container│
   └────┬────┘             └───┬────┘    └──┬───┘    └──┬──┘
        │ Isolated            │             │            │
        │ Environment         │             │            │
        │ - /app mounted      │             │            │
        │ - testCases.json    │             │            │
        │ - Memory: 512MB     │             │            │
        │ - CPU: Limited      │             │            │
        │ - Timeout: 30s      │             │            │
        │                     │             │            │
        └─────────────────────┴─────────────┴────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
  ┌──────────┐          ┌─────────────────┐
  │ Compare  │          │  Generate JSON  │
  │ Results  │─────────→│  Summary Report │
  └──────────┘          └─────────────────┘
        │
        ▼
  ┌─────────────────┐
  │ Return Results  │
  │ to API Server   │
  └─────────────────┘
```

## How It Works

### 1. **Data Flow**

```
Submission {
  code: "function twoSum(nums, target) { ... }",
  language: "javascript",
  problemId: 1,
  testCases: [
    { input: "[2,7,11,15], 9", expectedOutput: "[0,1]" },
    { input: "[3,2,4], 6", expectedOutput: "[1,2]" }
  ]
}
    │
    ▼
Worker creates temp directory:
    /tmp/judge-1708873649000/
    ├── code.js (user code)
    ├── testCases.json (all test cases)
    └── [mounted to container as /app]
    │
    ▼
Docker Container Started:
    judge-javascript:latest
    - Mounts /tmp/judge-xxx:/app
    - Runs: node executor.js
    │
    ▼
executor.js:
    1. Load testCases.json
    2. Load code.js
    3. For each test case:
       - Parse inputs
       - Call user function
       - Compare output
    4. Output JSON results
    │
    ▼
Container Output:
{
  "passed": 2,
  "failed": 0,
  "totalTests": 2,
  "testResults": [
    {
      "input": "[2,7,11,15], 9",
      "expectedOutput": "[0,1]",
      "actualOutput": "[0,1]",
      "passed": true,
      "explanation": "Simple case"
    },
    ...
  ]
}
    │
    ▼
Results Processing:
    - Parse JSON output
    - Generate summary
    - Clean up container and files
    │
    ▼
Return to API Server ✅
```

### 2. **Test Case Execution Flow**

For each test case, the executor:

```javascript
1. Parse input
   "nums = [2,7,11,15], target = 9"
   → [2,7,11,15], 9
   
2. Extract function
   From code: "function twoSum(nums, target) { ... }"
   → functionName = "twoSum"
   
3. Call function
   result = twoSum([2,7,11,15], 9)
   → result = [0, 1]
   
4. Compare output
   expected = "[0,1]"
   actual = JSON.stringify([0, 1])
   
5. Record result
   {
     passed: true,
     input: "[2,7,11,15], 9",
     expectedOutput: "[0,1]",
     actualOutput: "[0,1]"
   }
```

### 3. **Result Comparison**

Results are compared using **strict JSON equality**:

```javascript
// Normalize both to JSON strings
const expected = JSON.stringify(JSON.parse(expectedOutput));
const actual = JSON.stringify(userFunctionResult);

// Compare
passed = (expected === actual);
```

This ensures:
- ✅ Same values in same order
- ✅ Type-safe comparison (no coercion)
- ✅ Array/object structure matching
- ✅ Handles nested structures

## Docker Isolation

### Resource Limits

Each container is isolated with strict limits:

```yaml
Memory:        512 MB (soft limit)
CPU:           50% (1 CPU out of 2)
Processes:     100 max
File Descriptors: Standard limit
Timeout:       30 seconds
```

### Security Features

1. **Read-Only Root Filesystem** - Code can't modify OS
2. **No Network Access** - Isolated from network
3. **No Host Interaction** - Can't access host system
4. **Temporary Storage Only** - All files cleaned up after
5. **Process Isolation** - Can't launch system processes

### Error Handling

```
Possible Errors & Recovery:

1. Compilation Error
   └─ Caught during container startup
   └─ Returns compilationError message
   
2. Runtime Error
   └─ Caught in try-catch during execution
   └─ Records error in test result
   
3. Timeout (30s)
   └─ Container forcefully stopped
   └─ Returns timeout error
   
4. Out of Memory
   └─ Container killed by Docker
   └─ Returns OOM error
   
5. Invalid Input Parsing
   └─ Caught and recorded per test case
   └─ Continues with remaining tests
```

## Setup Instructions

### Prerequisites

- Docker & Docker Daemon running
- Node.js 18+
- npm
- Administrator access (for docker socket)

### Installation

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Add dockerode to package.json
npm install dockerode

# 3. Ensure Docker daemon is running
docker ps  # Should list containers without error

# 4. Build judge images (optional - auto-builds on first use)
docker build -f docker/Dockerfile.javascript -t judge-javascript .
docker build -f docker/Dockerfile.python -t judge-python .
docker build -f docker/Dockerfile.cpp -t judge-cpp .
docker build -f docker/Dockerfile.java -t judge-java .
```

### Running with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Manual Setup

```bash
# Terminal 1: Start API Server
npm start
# Output: ✅ API Server running on http://localhost:3000

# Terminal 2: Start Worker
npm run worker
# Output: 🚀 Docker-based Judge Worker Started

# Terminal 3: Seed database
npm run seed

# Terminal 4: Run tests
npm test
```

## Usage Example

### JavaScript Submission

```bash
curl -X POST http://localhost:3000/api/submissions/submit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function twoSum(nums, target) { for(let i=0;i<nums.length;i++) { for(let j=i+1;j<nums.length;j++) { if(nums[i]+nums[j]===target) return [i,j]; } } return []; }",
    "language": "javascript",
    "problemId": 1
  }'

# Response:
# { "success": true, "jobId": "12345" }
```

### Check Status

```bash
curl http://localhost:3000/api/submissions/status/12345

# Response while processing:
# { "success": true, "status": "active", "progress": 0 }

# Response when complete:
# {
#   "success": true,
#   "status": "completed",
#   "result": {
#     "passed": 3,
#     "failed": 0,
#     "totalTests": 3,
#     "testResults": [
#       {
#         "status": "PASS",
#         "input": "[2,7,11,15], 9",
#         "expected": "[0,1]",
#         "actual": "[0,1]"
#       },
#       ...
#     ],
#     "summary": {
#       "status": "accepted",
#       "percentage": "100.00"
#     }
#   }
# }
```

## Supported Languages

### JavaScript ✅ Fully Supported
- Runtime: Node.js 18
- Executor: docker/executor.js
- Features: Full ES6 support

### Python ✅ Fully Supported
- Runtime: Python 3.11
- Executor: docker/executor.py
- Features: Standard library + common packages

### C++ ⚠️ Requires Compiler
- Compiler: GCC 13
- Executor: docker/executor.cpp
- Notes: Standard C++17 support

### Java ✅ Available
- Runtime: OpenJDK 21
- Executor: docker/Executor.java
- Requirements: Proper class naming

## Monitoring & Debugging

### View Worker Logs

```bash
docker logs -f leetcode-worker

# Or in manual setup
npm run worker  # See output in terminal
```

### Check Docker Containers

```bash
# List running judge containers
docker ps | grep judge

# View container logs
docker logs judge-javascript-12345

# Inspect container
docker inspect <container-id>
```

### Redis Queue Monitoring

```bash
# Connect to Redis
redis-cli

# Monitor queue
XINFO STREAM judge-queue
XLEN judge-queue
```

### MongoDB Inspection

```bash
# Connect to MongoDB
mongosh

# View database
use leetcode-editor
db.questions.find()
```

## Performance Optimization

### 1. Pre-built Images

Build images once and reuse:

```bash
# Build all images
for lang in javascript python cpp java; do
  docker build -f docker/Dockerfile.$lang -t judge-$lang .
done

# Images cached for reuse
```

### 2. Parallel Processing

Worker processes jobs in queue automatically:

```bash
# Run multiple workers for parallel processing
npm run worker &
npm run worker &
npm run worker &

# Or via docker-compose
docker-compose up -d --scale worker=3
```

### 3. Memory Management

Configure Docker limits in docker-compose.yml:

```yaml
worker:
  environment:
    DOCKER_CONTAINER_MEMORY: 512m
```

## Troubleshooting

### Docker Daemon Not Running

```bash
# Windows (Docker Desktop)
# Start Docker Desktop application

# Linux
sudo systemctl start docker

# macOS
open /Applications/Docker.app
```

### Permission Denied on Docker Socket

```bash
# Linux: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo
sudo npm run worker
```

### Container Timeout

```bash
# Increase timeout in dockerExecutor.js
timeout: 60000  // 60 seconds

# Or set memory limits higher
Memory: 1024 * 1024 * 1024  // 1GB
```

### Failed to Pull Image

```bash
# Check Docker is running
docker ps

# Check internet connectivity
docker pull node:18-alpine

# For offline use, pre-build images
docker build -t judge-javascript docker/Dockerfile.javascript
```

## Security Considerations

⚠️ **Important: Running User Code**

1. **Always use Docker** - Never run user code directly on host
2. **Resource Limits** - Set strict memory/CPU limits
3. **Network Isolation** - Containers should have no external access
4. **Timeout Protection** - Always set execution timeout
5. **File Cleanup** - Remove temporary files after execution
6. **Read-Only Root** - Use read-only root filesystem when possible

### Example Secure Configuration

```yaml
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
  - /var/tmp
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE
```

## Advanced Configuration

### Custom Executor

Create custom executors for specific problems:

```javascript
// docker/executor-custom-twosum.js
// Specialized executor for Two Sum problem

const testCases = require('./testCases.json');
const { twoSum } = require('./code.js');

for (const test of testCases) {
  // Custom validation logic
  const [nums, target] = JSON.parse(test.input);
  const result = twoSum(nums, target);
  // ...
}
```

### Multi-Language Worker

```bash
# Run workers for specific languages
npm run worker -- --language javascript
npm run worker -- --language python
npm run worker -- --language cpp
```

## API Reference

### executeInDocker()

```javascript
import { executeInDocker } from './src/services/dockerExecutor.js';

const results = await executeInDocker('javascript', userCode, testCases);

// Returns:
{
  passed: 2,
  failed: 0,
  totalTests: 2,
  testResults: [...],
  compilationError: null
}
```

### generateResultsSummary()

```javascript
import { generateResultsSummary } from './src/services/dockerExecutor.js';

const summary = generateResultsSummary(testResults);

// Returns:
{
  status: 'accepted',    // or 'rejected' / 'error'
  passed: 2,
  failed: 0,
  percentage: '100.00',
  details: [...]
}
```

## Support & Resources

- Docker Docs: https://docs.docker.com/
- BullMQ: https://docs.bullmq.io/
- Redis: https://redis.io/
- MongoDB: https://docs.mongodb.com/

---

**Last Updated:** February 2026  
**Version:** 1.0.0 - Docker Execution System
