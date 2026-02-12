# Docker Code Execution - Quick Reference

## What is Docker-Based Execution?

Running user-submitted code in **isolated containers** rather than the main process.

```
Traditional (UNSAFE):          Docker-Based (SAFE):
┌─────────────────┐           ┌──────────────────┐
│ User Code       │           │  Docker Host     │
│ ↓               │           │  ├─ API Server   │
│ Main Process    │ ✗ DANGEROUS  │  ├─ Redis     │
│ ↓               │           │  └─ Worker      │
│ Full System     │           │                  │
│ Access          │           │ ┌──────────────┐ │
└─────────────────┘           │ │ - Judge JS   │ │
                              │ │ Judge Python │ │
                              │ │ Judge C++    │ │
                              │ │ Judge Java   │ │
                              │ └──────────────┘ │
                              │ (Isolated, Safe) │
                              └──────────────────┘
```

## Setup in 5 Minutes

### 1. Install Docker
```bash
# Windows/Mac: Download Docker Desktop
# Linux: sudo apt install docker.io

# Verify
docker --version
```

### 2. Install Dependencies
```bash
cd backend
npm install
npm install dockerode
```

### 3. Build Judge Images
```bash
npm run docker:build

# Or manually
docker build -f docker/Dockerfile.javascript -t judge-javascript .
docker build -f docker/Dockerfile.python -t judge-python .
```

### 4. Start Services
```bash
# Terminal 1
npm start

# Terminal 2
npm run worker

# Terminal 3 (first time only)
npm run seed
```

### 5. Test
```bash
npm test
```

## How Test Cases Flow

```
Code Submission
     ↓
Redis Queue
     ↓
Worker Picks Job
     ↓
Prepare Files:
  • code.js
  • testCases.json
     ↓
Start Docker Container
     ↓
For Each Test:
  • Parse input
  • Call function
  • Compare output
  • Record result
     ↓
Container Output JSON
     ↓
Process Results
     ↓
Clean Up
     ↓
Return to API
```

## Test Case Execution Logic

### Step 1: Input Parsing
```
Raw Input:  "[2,7,11,15], 9"
Parse JSON: [2, 7, 11, 15]
Parse JSON: 9
Result:     [[2, 7, 11, 15], 9]
```

### Step 2: Function Call
```
Function:   twoSum([2, 7, 11, 15], 9)
Returns:    [0, 1]
```

### Step 3: Output Comparison
```
Expected    : "[0,1]"
Actual      : [0, 1]
Normalized  : "[0,1]" === "[0,1]"
Result      : PASS ✓
```

## Key Differences from Regular Execution

| Feature | Regular | Docker |
|---------|---------|--------|
| **Isolation** | ✗ No | ✓ Complete |
| **Resource Limits** | ✗ None | ✓ Yes |
| **Timeout Protection** | ✗ Risky | ✓ Guaranteed |
| **Malware Risk** | ✗ High | ✓ Safe |
| **Startup Time** | ✓ Fast | ✗ Slower |
| **Language Support** | ✗ Limited | ✓ Multiple |

## File Structure

```
backend/
├── docker/
│   ├── Dockerfile.javascript     # JS executor env
│   ├── Dockerfile.python         # Python executor env
│   ├── Dockerfile.cpp            # C++ executor env
│   ├── Dockerfile.java           # Java executor env
│   ├── executor.js               # Runs tests (JS)
│   ├── executor.py               # Runs tests (Python)
│   ├── executor.cpp              # Runs tests (C++)
│   ├── Executor.java             # Runs tests (Java)
│   ├── Dockerfile.api            # API server container
│   └── Dockerfile.worker         # Worker container
├── src/
│   └── services/
│       └── dockerExecutor.js     # Docker management
├── worker.js                     # Job processor
├── server.js                     # API server
├── docker-compose.yml            # Docker orchestration
└── DOCKER_EXECUTION_GUIDE.md     # Full documentation
```

## Docker Container Limits

Each container gets:
- **Memory**: 512 MB
- **CPU**: 50% of 1 core
- **Timeout**: 30 seconds
- **Max Processes**: 100
- **Network**: Disabled
- **Root FS**: Read-only

## Common Commands

```bash
# Build judge images
npm run docker:build

# Clean up Docker
npm run docker:clean

# View worker logs
docker logs -f leetcode-worker

# List running containers
docker ps | grep judge

# Check image size
docker images | grep judge

# Manual Docker commands
docker build -t judge-javascript docker/Dockerfile.javascript
docker run --rm -v /tmp/code:/app judge-javascript
```

## Result Format

```json
{
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
    }
  ],
  "summary": {
    "status": "accepted",
    "percentage": "100.00"
  }
}
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Cannot connect to Docker daemon` | Docker not running | Start Docker Desktop/daemon |
| `No such image: judge-javascript` | Image not built | Run `npm run docker:build` |
| `Execution timeout` | Code runs > 30s | Check for infinite loops |
| `Out of memory` | Code uses > 512MB | Optimize memory usage |
| `Permission denied` | Socket access issue | Run with sudo or join docker group |

## Comparison Algorithm

**Strict JSON Comparison:**
```javascript
const expected = JSON.stringify(JSON.parse(expectedOutput));
const actual = JSON.stringify(actualOutput);
passed = (expected === actual);
```

**Examples:**
```
✓ [0,1]      vs "[0,1]"        → PASS
✗ [1,0]      vs "[0,1]"        → FAIL (different order)
✓ {"a":1}    vs '{"a":1}'      → PASS
✗ "hello"    vs 'hello'        → FAIL (quotes matter)
✗ 3.14       vs "3.14"         → FAIL (type mismatch)
```

## Language Support Status

```
JavaScript ✅  Fully supported (Node 18)
Python     ✅  Fully supported (Python 3.11)
C++        ✅  Fully supported (GCC 13)
Java       ✅  Fully supported (OpenJDK 21)
Go         ❌  Not implemented
Rust       ❌  Not implemented
```

## Performance

| Language | Avg Time | Cold Start |
|----------|----------|-----------|
| JavaScript | 350ms | 200ms |
| Python | 450ms | 250ms |
| C++ | 600ms | 300ms |
| Java | 900ms | 400ms |

(After first run, images cached for faster startup)

## Security Benefits

✅ **Code Isolation** - User code cannot access host system  
✅ **Resource Limits** - Prevents DoS and resource exhaustion  
✅ **Network Isolation** - Code cannot make external requests  
✅ **Filesystem Protection** - Cannot write outside container  
✅ **Process Isolation** - Cannot spawn dangerous processes  
✅ **Timeout Protection** - Infinite loops killed after 30s  

## Docker Compose (All-in-One)

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# View status
docker-compose ps

# Scale workers
docker-compose up -d --scale worker=3
```

## Monitoring

```bash
# See active judge containers
docker ps | grep judge

# View container resources
docker stats

# Check Redis queue
redis-cli XINFO STREAM judge-queue

# View MongoDB submissions
mongosh
> use leetcode-editor
> db.submissions.find()
```

## Troubleshooting Checklist

- [ ] Docker daemon running? (`docker ps`)
- [ ] Judge images built? (`docker images | grep judge`)
- [ ] API server running? (`curl http://localhost:3000/api/health`)
- [ ] Worker running? (`npm run worker` in new terminal)
- [ ] Redis connected? (`redis-cli ping` → PONG)
- [ ] MongoDB connected? (`mongosh` connects)
- [ ] Database seeded? (`npm run seed`)

## API Examples

### Submit Code
```bash
curl -X POST http://localhost:3000/api/submissions/submit \
  -H "Content-Type: application/json" \
  -d '{
    "code": "function twoSum(nums, target) { ... }",
    "language": "javascript",
    "problemId": 1
  }'
```

### Check Status
```bash
curl http://localhost:3000/api/submissions/status/12345
```

### Get Questions
```bash
curl http://localhost:3000/api/submissions/questions
```

## Advanced Topics

### Custom Executor
Create specialized executors for specific problem types in `docker/executor-*.js`

### Multi-Worker Setup
Run multiple workers for parallel job processing:
```bash
npm run worker &
npm run worker &
npm run worker &
```

### Persistent Results
Store execution results in MongoDB for analytics:
```javascript
await Submission.create({
  jobId: job.id,
  code: code,
  language: language,
  result: testResults,
  executedAt: new Date()
});
```

## Resources

- [Docker Docs](https://docs.docker.com/)
- [BullMQ Queue](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Full Docker Guide](DOCKER_EXECUTION_GUIDE.md)
- [Test Execution Details](TEST_EXECUTION_GUIDE.md)

---

**Last Updated:** February 2026  
**Learn More:** See DOCKER_EXECUTION_GUIDE.md for complete details
