# LeetCode-Style Editor - Backend

Complete backend API for the LeetCode-style coding editor with MongoDB and Redis integration.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────┐
│  Frontend   │─────→│  Express API │─────→│ MongoDB  │
│  (React)    │      │  (Node.js)   │      │          │
└─────────────┘      └──────────────┘      └──────────┘
                           │
                           ↓
                     ┌────────────┐
                     │   Redis    │
                     │  BullMQ    │
                     └────────────┘
                           │
                           ↓
                     ┌────────────┐
                     │   Worker   │
                     │  Process   │
                     └────────────┘
```

## Features

✅ **API Gateway**: Express.js server with RESTful endpoints  
✅ **Database**: MongoDB for persistent data storage  
✅ **Job Queue**: BullMQ + Redis for async code evaluation  
✅ **Worker Process**: Background job processor for code execution  
✅ **Multi-Language Support**: JavaScript, Python, C++, Java  
✅ **Test Case Execution**: Automatic test validation  
✅ **Error Handling**: Comprehensive error responses  
✅ **CORS Enabled**: Cross-origin requests from frontend

## Prerequisites

- **Node.js** 16+
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud)
- **npm** or **yarn**

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/leetcode-editor

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Server
PORT=3000
NODE_ENV=development
```

**MongoDB Atlas Alternative:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/leetcode-editor?retryWrites=true&w=majority
```

### 3. Start Services

**Terminal 1 - API Server:**
```bash
npm start
```
Server runs on: `http://localhost:3000`

**Terminal 2 - Worker Process:**
```bash
npm run worker
```
Processes code evaluation jobs from the queue

**Terminal 3 - Seed Database (first time only):**
```bash
npm run seed
```
Populates MongoDB with sample questions

### 4. Run Tests

```bash
npm test
```

Tests the API endpoints and job processing

## API Endpoints

### Questions

**GET `/api/submissions/questions`**  
Get all available coding problems

Response:
```json
{
  "success": true,
  "questions": [
    {
      "id": 1,
      "title": "Two Sum",
      "difficulty": "Easy",
      "description": "...",
      "testCases": [...]
    }
  ]
}
```

**GET `/api/submissions/questions/:id`**  
Get a specific problem by ID

Response:
```json
{
  "success": true,
  "question": {
    "id": 1,
    "title": "Two Sum",
    "difficulty": "Easy",
    "boilerplate": {
      "javascript": "function twoSum(nums, target) { ... }",
      "python": "def twoSum(nums, target): ...",
      "cpp": "vector<int> twoSum(...) { ... }",
      "java": "class Solution { public int[] twoSum(...) { ... } }"
    }
  }
}
```

### Submissions

**POST `/api/submissions/submit`**  
Submit code for evaluation

Request:
```json
{
  "code": "function twoSum(nums, target) { ... }",
  "language": "javascript",
  "problemId": 1
}
```

Response:
```json
{
  "success": true,
  "jobId": "12345"
}
```

**GET `/api/submissions/status/:jobId`**  
Check submission status

Response (Pending):
```json
{
  "success": true,
  "status": "waiting",
  "progress": 0
}
```

Response (Completed):
```json
{
  "success": true,
  "status": "completed",
  "result": {
    "passed": 3,
    "failed": 0,
    "totalTests": 3,
    "testResults": [...]
  }
}
```

## Database Schema

### Question Collection

```javascript
{
  id: Number (unique),
  title: String,
  difficulty: "Easy" | "Medium" | "Hard",
  description: String,
  examples: [
    {
      input: String,
      output: String,
      explanation: String
    }
  ],
  constraints: String,
  boilerplate: {
    javascript: String,
    python: String,
    cpp: String,
    java: String
  },
  testCases: [
    {
      input: String,
      output: String,
      explanation: String
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── redisConfig.js     # Redis & BullMQ setup
│   ├── models/
│   │   └── Question.js        # MongoDB schema
│   ├── Controllers/
│   │   └── submissionController.js  # API logic
│   └── routes/
│       └── submissionRoutes.js      # Route definitions
├── server.js                  # Express app entry point
├── worker.js                  # Job processing worker
├── seed.js                    # Database seeding script
├── test.js                    # API tests
├── package.json              # Dependencies
├── .env                       # Environment variables
└── README.md                  # This file
```

## Running in Production

### Using PM2

```bash
npm install -g pm2

# Start API server
pm2 start server.js --name "api"

# Start worker
pm2 start worker.js --name "worker"

# Monitor
pm2 monit

# View logs
pm2 logs
```

### Using Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3000

CMD npm start
```

Build and run:
```bash
docker build -t leetcode-backend .
docker run -p 3000:3000 --env-file .env leetcode-backend
```

## Troubleshooting

### MongoDB Connection Issues

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- For Atlas: Verify IP whitelisting and credentials

### Redis Connection Issues

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
- Ensure Redis is running: `redis-server`
- Check Redis configuration in `.env`
- Verify Redis is accessible on localhost:6379

### Worker Not Processing Jobs

**Check:**
1. Worker process is running: `npm run worker`
2. Redis is connected
3. Queue name matches in both server and worker
4. Check worker logs for errors

### Tests Failing

```bash
npm test
```

Common issues:
- Server not running on port 3000
- Database not seeded - run `npm run seed`
- Redis not running
- Worker not running (for job processing tests)

## Language Support

### JavaScript ✅
Supported: Full execution via Node.js VM

### Python ⚠️
Status: Partial (requires Python installation)
To enable:
1. Install Python 3.x
2. Implement Python subprocess execution in `worker.js`

### C++ ⚠️
Status: Partial (requires C++ compiler)
To enable:
1. Install GCC/Clang
2. Implement compilation and execution in `worker.js`

### Java ⚠️
Status: Partial (requires JDK)
To enable:
1. Install Java JDK
2. Implement compilation and execution in `worker.js`

## Performance Optimization

### Redis Memory Management
```env
# In Redis config, set eviction policy
maxmemory-policy allkeys-lru
maxmemory 256mb
```

### Database Indexing
Ensure MongoDB has indexes on frequently queried fields:
```bash
db.questions.createIndex({ id: 1 })
db.questions.createIndex({ difficulty: 1 })
```

### API Rate Limiting
Consider adding rate limiting middleware:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);
```

## Contributing

1. Create a new branch for features
2. Test thoroughly before submitting
3. Update documentation as needed
4. Follow existing code style

## License

ISC

## Support

For issues or questions, please check:
- Server logs: `npm start`
- Worker logs: `npm run worker`
- Test output: `npm test`
- MongoDB: `mongosh` or MongoDB Compass
- Redis: `redis-cli`
