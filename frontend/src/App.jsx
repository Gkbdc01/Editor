import { useEffect, useState } from 'react';
import Editor from './Components/Editor';
import QuestionPanel from './Components/QuestionPanel';
import './App.css';

// Using VITE_BACKEND_URL for Vite, fallback to localhost
const API_BACKEND_URL = 'http://20.193.153.20:3000' || 'http://localhost:3000'; 

export default function App() {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [result,setresult] = useState({});;
  
  // 1. ADDED: A loading state to track the API call
  const [isLoading, setIsLoading] = useState(true);

  // frontend/src/App.js

const handleRunCode = async (code) => {
    setIsRunning(true);
    setOutput('Submitting code to server...');

    try {
        // 1. Send code to the queue
        const submitRes = await fetch(`${API_BACKEND_URL}/api/submissions/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: currentQuestionData._id,
                language: selectedLanguage,
                code: code
            })
        });

        const submitData = await submitRes.json();

        if (!submitRes.ok) throw new Error(submitData.error);

        const jobId = submitData.jobId;
        setOutput(`Job ${jobId} added to queue. Waiting for execution...`);

        // 2. Start Polling for the result
        pollJobStatus(jobId);

    } catch (error) {
        setIsRunning(false);
        setOutput(`Submission Error: ${error.message}`);
    }
};

// --- THE POLLING FUNCTION ---
const pollJobStatus = async (jobId) => {
      try {
          // Adjust this URL to match your actual backend URL/port
          const response = await fetch(`${API_BACKEND_URL}/api/submissions/status/${jobId}`);
          const data = await response.json();

          // Catch 404s (Job expired/not found) or 500s
          if (!response.ok) {
              throw new Error(data.error || "Failed to fetch job status");
          }

          // 1. MATCHING YOUR 'completed' STATUS
          if (data.status === 'completed') {
              setIsRunning(false);
              setresult(data.result);
              // If your worker returns a JSON object, we stringify it for the output window
              const formattedResult = typeof data.result === 'object' 
                  ? JSON.stringify(data.result, null, 2) 
                  : data.result;
                  
              setOutput(`Execution Completed! ✅\n\n${formattedResult}`);
          } 
          
          // 2. MATCHING YOUR 'failed' STATUS
          else if (data.status === 'failed') {
              setIsRunning(false);
              setOutput(`Execution Failed ❌:\n\n${data.error}`);
          } 
          
          // 3. MATCHING YOUR 'waiting' OR 'active' STATUS
          else {
              // You included progress tracking! Let's display it if it exists.
              const progressText = data.progress ? ` (${data.progress}%)` : '';
              
              setOutput(`Status: ${data.status.toUpperCase()}${progressText}...`);
              
              // It's not done yet, so ask again in 1 second
              setTimeout(() => pollJobStatus(jobId), 200);
          }

      } catch (error) {
          setIsRunning(false);
          setOutput(`Polling Error: ${error.message}`);
      }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setOutput('');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setOutput('');
    }
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // 2. FIXED: Actually use the API_BACKEND_URL constant via template literals
        const response = await fetch(`${API_BACKEND_URL}/api/submissions/questions`);
        console.log('Fetching questions from:', `${API_BACKEND_URL}/api/submissions/questions`);
        
        if (!response.ok) {
           throw new Error('API not available');
        }
        
        const data = await response.json();
        
        // 3. ENHANCED: Specifically check for data.questions based on your JSON structure
        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          setQuestions(data.questions);
        }
      } catch (error) {
        console.warn('Using default questions (API unavailable).', error);
      } finally {
        // 4. ADDED: Set loading to false once the fetch completes (success or fail)
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // 5. ADDED: Early returns to handle loading and empty states securely
  if (isLoading) {
    return <div className="app-container"><h2>Loading questions...</h2></div>;
  }

  if (questions.length === 0) {
    return <div className="app-container"><h2>No questions found. Please check your Internet connection.</h2></div>;
  }

  // Now it is safe to assign this, because we know the array isn't empty
  const currentQuestionData = questions[currentQuestionIndex];

  return (
    <div className="app-container">
      <div className="split-layout">
        <div className="question-panel">
          <QuestionPanel 
            question={currentQuestionData}
            currentIndex={currentQuestionIndex}
            total={questions.length} 
            onNext={handleNextQuestion}
            onPrevious={handlePreviousQuestion}
          />
        </div>
        <div className="editor-panel">
          <Editor 
            key={currentQuestionData.id} 
            question={currentQuestionData}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onRun={handleRunCode}
            isRunning={isRunning}
            output={output}
            result={result}
          />
        </div>
      </div>
    </div>
  );
}