# Architecture Diagrams

## Complete System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                            │
│  • Monaco Editor                                                    │
│  • Question Panel                                                   │
│  • Test Results Display                                            │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ REST API
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                    API SERVER (Express)                           │
│                   Port 3000                                        │
│  ┌─────────────────────────────────────────────────┐             │
│  │ Routes:                                         │             │
│  │  GET  /api/submissions/questions               │             │
│  │  GET  /api/submissions/questions/:id           │             │
│  │  POST /api/submissions/submit                  │             │
│  │  GET  /api/submissions/status/:jobId           │             │
│  └─────────────────────────────────────────────────┘             │
│  ┌─────────────────────────────────────────────────┐             │
│  │ Controllers:                                   │             │
│  │  • getQuestions()                             │             │
│  │  • getQuestion()                              │             │
│  │  • submitJob()                                │             │
│  │  • getJobStatus()                             │             │
│  └─────────────────────────────────────────────────┘             │
└────┬────────────────────────┬────────────────────────┬────────┘
     │                        │                        │
     ▼                        ▼                        ▼
┌───────────┐         ┌─────────────┐         ┌──────────────┐
│ MongoDB   │         │   Redis     │         │    Logger    │
│ Questions │         │   25 Queue  │         │   (Console)  │
│ & Schemas │         │             │         │              │
└───────────┘         └──────┬──────┘         └──────────────┘
                             │
                    ┌────────▼────────┐
                    │ Job Queue      │
                    │ judge-queue    │
                    │ (BullMQ)       │
                    │                │
                    │ • Waiting      │
                    │ • Active       │
                    │ • Completed    │
                    │ • Failed       │
                    └────────┬────────┘
                             │
                             │ BullMQ Worker
                             │ Polling
                             ▼
        ┌────────────────────────────────────────┐
        │     Judge Worker Process                │
        │  src/services/dockerExecutor.js        │
        │                                         │
        │ • Monitors Redis queue                 │
        │ • Validates language & syntax          │
        │ • Manages Docker containers            │
        │ • Processes test cases                 │
        │ • Compiles results                     │
        └────────┬────────────────────────────────┘
                 │
                 │ Creates & Manages
                 │ Docker Containers
                 │
  ┌──────────────┴──────────────┬────────────┬────────────┐
  │                             │            │            │
  ▼                             ▼            ▼            ▼
┌──────────────┐      ┌──────────────┐  ┌──────────┐  ┌──────────┐
│ Docker Image │      │ Docker Image │  │ Docker   │  │ Docker   │
│ JavaScript   │      │ Python       │  │ Image    │  │ Image    │
│              │      │              │  │ C++      │  │ Java     │
│ Cached on    │      │ Cached on    │  │ Cached   │  │ Cached   │
│ First Use    │      │ First Use    │  │ on First │  │ on First │
│              │      │              │  │ Use      │  │ Use      │
└──────────────┘      └──────────────┘  └──────────┘  └──────────┘
  │ Mounts              │ Mounts        │ Mounts    │ Mounts
  │ /tmp/code          │ /tmp/code     │ /tmp/code │ /tmp/code
  │                     │                │          │
  ▼                     ▼                ▼          ▼
┌──────────────────────────────────────────────────────────┐
│ Container Execution Environment                         │
│ (Isolated, Resource-Limited)                           │
│                                                          │
│ Mounted Volume: /app/                                   │
│  ├── code.js / code.py / code.cpp / Solution.java      │
│  ├── testCases.json                                     │
│  └── executor.js / executor.py / executor.cpp / ...    │
│                                                          │
│ Resources:                                              │
│  • Memory: 512 MB                                       │
│  • CPU: 0.5 cores (50%)                                │
│  • Timeout: 30 seconds                                  │
│  • Max Processes: 100                                   │
│  • Network: Disabled                                    │
│  • Root FS: Read-only                                   │
│                                                          │
│ Execution:                                              │
│  node executor.js / python executor.py / ./executor     │
└──────────────┬───────────────────────────────────────────┘
               │ Outputs JSON
               │
               ▼
         ┌─────────────────┐
         │ Test Results    │
         │ (JSON String)   │
         │                 │
         │ {               │
         │  passed: 3,     │
         │  failed: 0,     │
         │  testResults: [ │
         │    ...          │
         │  ]              │
         │ }               │
         └────────┬────────┘
                  │
                  │ Parse JSON
                  │ Generate Summary
                  ▼
         ┌─────────────────────────┐
         │ ProcessedResults        │
         │ Ready for API Response  │
         └─────────────────────────┘
```

## Data Flow Sequence Diagram

```
User              API Server           Redis Queue         Docker Worker      Container
 │                   │                    │                   │                 │
 │─POST submit code─→│                    │                   │                 │
 │                   │                    │                   │                 │
 │                   │─Validate code─────→│                   │                 │
 │                   │                    │                   │                 │
 │                   │─Query DB for tests─│                   │                 │
 │                   │                    │                   │                 │
 │                   │─Add job to queue──→│                   │                 │
 │                   │                    │                   │                 │
 │←─Return jobId────│                    │                   │                 │
 │                   │                    │                   │                 │
 │─GET /status/jobId│                    │                   │                 │
 │                   │─Poll job status───→│                   │                 │
 │←─Status: waiting──│                    │                   │                 │
 │                   │                    │                   │                 │
 │                   │                    │   Pick job   ────→│                 │
 │                   │                    │                   │                 │
 │                   │                    │              Create & Start Docker──→│
 │                   │                    │                   │                 │
 │                   │                    │                   │  Mount volumes  │
 │                   │                    │                   │  Load code      │
 │                   │                    │                   │  Load testCases │
 │                   │                    │                   │                 │
 │─GET /status/jobId│                    │                   │                 │
 │                   │─Poll job status───→│                   │                 │
 │←─Status: active───│                    │                   │                 │
 │                   │                    │                   │                 │
 │                   │                    │                   │  Execute!      │
 │                   │                    │                   │           Run   │
 │                   │                    │                   │           Tests │
 │                   │                    │                   │                 │
 │                   │                    │                   │  For each test: │
 │                   │                    │                   │   • Parse input │
 │                   │                    │                   │   • Call func   │
 │                   │                    │                   │   • Compare out │
 │                   │                    │                   │   • Record res  │
 │                   │                    │                   │                 │
 │                   │                    │                   │  Output JSON───→│
 │                   │                    │                   │                 │
 │                   │                    │                   │                 │
 │-GET /status/jobId│                    │                   │                 │
 │                   │                    │                   │                 │
 │                   │  Parse output  ←──────────────────────│                 │
 │                   │  Update job    ←──────────────────────│                 │
 │                   │                    │                   │                 │
 │←─Status: complete-────────────────────────────────────────│                 │
 │  Results: {passed: 3, failed: 0}      │                   │                 │
 │                   │                    │                   │  Cleanup───────→│
 │                   │                    │                   │  Delete cont. ←─│
 │                   │                    │                   │                 │
```

## Test Case Execution Flow

```
SINGLE TEST CASE EXECUTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. INPUT PARSING
   Input String: "[2,7,11,15], 9"
        │
        ├─→ Detect JSON array ✓
        │
        ├─→ Parse first array
        │   JSON.parse("[2,7,11,15]") = [2, 7, 11, 15]
        │
        └─→ Parse target
            JSON.parse("9") = 9
   
   Result: [[2, 7, 11, 15], 9]

2. FUNCTION CALL
   twoSum([2, 7, 11, 15], 9)
        │
        ├─→ i=0, j=1: 2+7=9 ✓ MATCH
        │
        └─→ Return [0, 1]

3. OUTPUT NORMALIZATION
   Expected Output: "[0,1]"
   Actual Output: [0, 1]
        │
        ├─→ Stringify expected
        │   JSON.parse("[0,1]") = [0, 1]
        │   JSON.stringify([0, 1]) = "[0,1]"
        │
        └─→ Stringify actual
            JSON.stringify([0, 1]) = "[0,1]"

4. COMPARISON
   "[0,1]" === "[0,1]"
        │
        └─→ ✓ PASS

5. RECORD RESULT
   {
     input: "[2,7,11,15], 9",
     expectedOutput: "[0,1]",
     actualOutput: "[0,1]",
     passed: true,
     explanation: "Simple case"
   }
```

## Container Lifecycle

```
CONTAINER LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CREATION
   docker.createContainer({
     Image: "judge-javascript:latest",
     HostConfig: {
       Memory: 512 * 1024 * 1024,
       CPUQuota: 50000,
       CPUPeriod: 100000,
       Binds: ["/tmp/judge-xxx:/app"]
     }
   })
   
   Status: CREATED

2. START
   container.start()
   
   Status: RUNNING
   • Mounts /tmp/judge-xxx to /app inside container
   • Sets memory limit to 512MB
   • Limits CPU to 50%

3. EXECUTION
   executor.js starts automatically:
   • Load testCases.json
   • Load user code
   • Run tests
   • Output JSON
   
   Status: RUNNING → EXITED

4. LOG CAPTURE
   container.logs({
     stdout: true,
     stderr: true
   })
   
   Returns: JSON string with results

5. CLEANUP
   container.remove()
   
   Status: REMOVED

6. FILE CLEANUP
   fs.rmSync("/tmp/judge-xxx", { recursive: true })
   
   Status: DELETED
```

## Network Architecture (Docker Compose)

```
┌─────────────────────────────────────────────────────────┐
│              Docker Compose Network                     │
│          (leetcode-network)                             │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ MongoDB      │  │ Redis        │  │ API Server   │ │
│  │ :27017       │  │ :6379        │  │ :3000        │ │
│  │              │  │              │  │              │ │
│  │ Container    │  │ Container    │  │ Container    │ │
│  │ mongodb      │  │ redis        │  │ api          │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│       │                    │                │           │
│       └────────────────────┼────────────────┘           │
│                            │                            │
│               Docker Network Bridge                     │
│         (Service Discovery via DNS)                     │
│                            │                            │
│                      ┌─────▼──────┐                     │
│                      │ Worker      │                    │
│                      │ Container   │                    │
│                      │ worker      │                    │
│                      │             │                    │
│                      │ Connects to:│                    │
│                      │ • redis:639 │                    │
│                      │ • mongodb   │                    │
│                      └─────────────┘                    │
│                                                         │
└─────────────────────────────────────────────────────────┘

Host Computer:
┌──────────────────┐
│ Docker Daemon    │
└──────────────────┘
     │
     ├─→ http://localhost:3000  (API)
     ├─→ http://localhost:6379  (Redis)
     └─→ http://localhost:27017 (MongoDB)
```

## File System Layout

```
Backend Directory Structure:
────────────────────────────

backend/
│
├── docker/                          # Docker execution
│   ├── Dockerfile.javascript        # JS container
│   ├── Dockerfile.python            # Python container  
│   ├── Dockerfile.cpp               # C++ container
│   ├── Dockerfile.java              # Java container
│   ├── Dockerfile.api               # API server image
│   ├── Dockerfile.worker            # Worker image
│   ├── executor.js                  # JS executor
│   ├── executor.py                  # Python executor
│   ├── executor.cpp                 # C++ executor
│   └── Executor.java                # Java executor
│
├── src/                             # Source code
│   ├── config/
│   │   ├── db.js                   # MongoDB config
│   │   └── redisConfig.js          # Redis config
│   ├── models/
│   │   └── Question.js             # DB schema
│   ├── Controllers/
│   │   └── submissionController.js # Route handlers
│   ├── routes/
│   │   └── submissionRoutes.js    # API routes
│   └── services/
│       └── dockerExecutor.js       # Docker manager
│
├── server.js                        # API entry point
├── worker.js                        # Worker entry point
├── seed.js                          # DB seeding
├── test.js                          # Tests
├── package.json                     # Dependencies
├── .env.example                     # Env template
├── docker-compose.yml               # Compose config
├── README.md                        # Main docs
├── DOCKER_EXECUTION_GUIDE.md       # Docker guide
├── TEST_EXECUTION_GUIDE.md         # Test details
└── DOCKER_QUICK_REFERENCE.md       # Quick ref

Runtime Directory:
────────────────────

/tmp/
  └── judge-1708873649000/          # Per submission
      ├── code.js                   # User code
      ├── testCases.json            # Test cases
      └── [executor files]          # Mounted to /app

Docker Volumes:
───────────────

mongo_data/     ← MongoDB data persistence
redis_data/     ← Redis data persistence
```

## Error Handling Flow

```
ERROR SCENARIOS & HANDLING
═════════════════════════════

1. INVALID LANGUAGE
   ┌─────────────────────┐
   │ User submits Python │
   └──────────┬──────────┘
              │
              ▼
   ┌─────────────────────────────┐
   │ Check language in whitelist │
   │ language: 'python' ✓ valid  │
   └──────────────────────────────┘

2. SYNTAX ERROR
   ┌──────────────────────┐
   │ Docker image loads   │
   │ python executor.py   │
   │ exec(user_code)      │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ SyntaxError raised           │
   │ Caught in try-catch          │
   │ compilationError set         │
   └──────────────────────────────┘

3. RUNTIME ERROR
   ┌───────────────────────┐
   │ nums = undefined      │
   │ for i in range(len()) │
   │ TypeError             │
   └──────────┬────────────┘
              │
              ▼
   ┌─────────────────────────────┐
   │ During test execution       │
   │ Caught in try-catch         │
   │ Error recorded for that test│
   │ Continue with next test    │
   └─────────────────────────────┘

4. TIMEOUT (>30s)
   ┌───────────────────┐
   │ Infinite loop:    │
   │ while(true) {}    │
   └──────────┬────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ Docker kills container       │
   │ after 30 seconds timeout     │
   └──────────┬───────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │ compilationError:            │
   │ "Timeout (30s exceeded)"     │
   └──────────────────────────────┘

5. OUT OF MEMORY
   ┌────────────────────────┐
   │ Allocate > 512 MB      │
   │ Create huge arrays     │
   └──────────┬─────────────┘
              │
              ▼
   ┌────────────────────────────────┐
   │ Docker kills process (OOMKill) │
   │ container.wait() returns 137   │
   └──────────┬─────────────────────┘
              │
              ▼
   ┌────────────────────────────────┐
   │ compilationError:              │
   │ "Out of Memory"                │
   └────────────────────────────────┘
```

---

**Diagrams Version:** 1.0  
**Created:** February 2026  
**For More Info:** See DOCKER_EXECUTION_GUIDE.md
