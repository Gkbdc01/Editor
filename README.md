# LeetCode-Style Editor

A full-stack coding practice platform with a split interface showing problems on the left and a multi-language code editor on the right.

## Features

- ✅ **Database-Driven Questions**: All questions and test cases come from MongoDB
- ✅ **Multiple Language Support**: JavaScript, Python, C++, and Java
- ✅ **Language Selector**: Switch between languages with boilerplate code
- ✅ **Split Layout**: Problem statement on left, code editor on right
- ✅ **Monaco Editor**: Professional IDE-like coding experience
- ✅ **Real-time Status**: Loading and error handling
- ✅ **Test Cases**: Fetch test cases from database
- ✅ **Code Formatting**: Built-in code formatter

## Project Structure

```
d:/Editor/
├── backend/                 # Express + MongoDB API
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── controllers/    # API logic
│   │   ├── routes/         # API endpoints
│   │   └── config/         # Database config
│   ├── server.js           # Express server
│   ├── seed.js             # Database seeding script
│   └── package.json
└── frontend/               # React + Vite
    ├── src/
    │   ├── Components/     # React components
    │   ├── styles/         # CSS files
    │   ├── App.jsx         # Main app
    │   └── index.css       # Global styles
    └── package.json
```

## Setup Instructions

### Prerequisites
- Node.js 16+ 
- MongoDB (local or Atlas)
- npm or yarn

### Step 1: MongoDB Setup

**Option A: Local MongoDB**
1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```powershell
   mongod
   ```

**Option B: MongoDB Atlas (Cloud)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string
4. Update `backend/.env` with your connection string

### Step 2: Backend Setup

1. Navigate to backend directory:
   ```powershell
   cd d:\Editor\backend
   ```

2. Install dependencies (already done, but to verify):
   ```powershell
   npm install
   ```

3. Ensure `.env` file exists with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/leetcode-editor
   NODE_ENV=development
   ```

4. Seed the database with sample questions:
   ```powershell
   npm run seed
   ```

5. Start the backend server:
   ```powershell
   npm run dev
   ```
   
   Backend will run on `http://localhost:5000`

### Step 3: Frontend Setup

1. In a new terminal, navigate to frontend:
   ```powershell
   cd d:\Editor\frontend
   ```

2. Install dependencies (already done, but to verify):
   ```powershell
   npm install
   ```

3. Ensure `.env` file has:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```powershell
   npm run dev
   ```

5. Open your browser and navigate to the provided URL (usually `http://localhost:5173`)

## API Endpoints

### Questions
- `GET /api/questions` - Get all questions
- `GET /api/questions/:id` - Get specific question
- `GET /api/questions/:id/testcases` - Get test cases for a question
- `GET /api/questions/paginated?page=1&limit=10` - Get paginated questions
- `POST /api/questions` - Create new question (admin)
- `PUT /api/questions/:id` - Update question (admin)
- `DELETE /api/questions/:id` - Delete question (admin)

## Adding New Questions

You can add questions in two ways:

### Method 1: Modify seed.js (Recommended for development)

Edit `backend/seed.js` and add your questions to the `sampleQuestions` array, then run:
```powershell
npm run seed
```

### Method 2: POST API Request

```bash
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "id": 6,
    "title": "..."
    ...
  }'
```

## Supported Languages

- **JavaScript** - For browser execution
- **Python** - Backend friendly
- **C++** - Competitive programming
- **Java** - Enterprise coding

Each question includes boilerplate code for every language.

## Database Schema

### Question Model
```javascript
{
  id: Number,
  title: String,
  difficulty: String (Easy|Medium|Hard),
  description: String,
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  constraints: String,
  boilerplate: {
    javascript: String,
    python: String,
    cpp: String,
    java: String
  },
  testCases: [{
    input: String,
    output: String,
    explanation: String
  }],
  createdAt: Date
}
```

## Troubleshooting

### "Failed to fetch questions" error
- ✅ Check backend is running on port 5000
- ✅ Check MongoDB is running
- ✅ Check CORS is enabled in backend
- ✅ Verify `.env` file in both backend and frontend

### Language selector not showing
- ✅ Refresh the page
- ✅ Clear browser cache
- ✅ Check console for errors (F12 > Console)

### Code not executing
- ✅ JavaScript execution is sandboxed in browser
- ✅ Python requires a backend code execution service
- ✅ Add code execution endpoints for other languages

## Future Enhancements

- [ ] Code execution for all languages (code sandbox integration)
- [ ] User authentication & progress tracking
- [ ] Problem difficulty filter & sorting
- [ ] Solution submissions & history
- [ ] Discussion/hints system
- [ ] Custom test cases
- [ ] Leaderboard
- [ ] Problem tagging & categories

## Development

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with auto-reload
- `npm run seed` - Populate database with sample data
- `npm start` - Start production server

**Frontend:**
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## License

MIT
