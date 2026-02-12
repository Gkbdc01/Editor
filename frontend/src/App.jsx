import { useEffect, useState } from 'react';
import Editor from './Components/Editor';
import QuestionPanel from './Components/QuestionPanel';
import './App.css';

// FIX 1: Use a safe default if env is missing (prevent undefined errors)
// Note: If using Vite, use import.meta.env.VITE_BACKEND_URL
// If using Create React App, use process.env.REACT_APP_BACKEND_URL
const API_BACKEND_URL = import.meta.env.backend_url || 'http://localhost:3001'; 

const DEFAULT_QUESTIONS = [
  {
    id: 1,
    title: 'Two Sum',
    difficulty: 'Easy',
    description: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
        explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].',
      },
    ],
    constraints: '2 <= nums.length <= 104\n-109 <= nums[i] <= 109\n-109 <= target <= 109\nOnly one valid answer exists.',
    boilerplate: {
      javascript: `function twoSum(nums, target) {
  // Write your code here
  
}`,
      python: `def twoSum(nums, target):
    # Write your code here
    pass`,
      cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    // Write your code here
    
}`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[]{};
    }
}`,
    },
    testCases: [
      { input: '[2,7,11,15], 9', output: '[0,1]', explanation: 'Simple case' },
      { input: '[3,2,4], 6', output: '[1,2]', explanation: 'Different indices' },
      { input: '[3,3], 6', output: '[0,1]', explanation: 'Duplicate values' },
    ],
  },
  {
    id: 2,
    title: 'Palindrome String',
    difficulty: 'Easy',
    description: 'Given a string s, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.',
    examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: 'true',
        explanation: 'After removing non-alphanumeric characters: "amanaplanacanalpanama" which is a palindrome.',
      },
      {
        input: 's = "race a car"',
        output: 'false',
        explanation: '"raceacar" is not a palindrome.',
      },
    ],
    constraints: '1 <= s.length <= 2 * 10^5\ns consists of printable ASCII characters.',
    boilerplate: {
      javascript: `function isPalindrome(s) {
  // Write your code here
  
}`,
      python: `def isPalindrome(s: str) -> bool:
    # Write your code here
    pass`,
      cpp: `bool isPalindrome(string s) {
    // Write your code here
    return false;
}`,
      java: `class Solution {
    public boolean isPalindrome(String s) {
        // Write your code here
        return false;
    }
}`,
    },
    testCases: [
      { input: '"A man, a plan, a canal: Panama"', output: 'true', explanation: 'Valid palindrome' },
      { input: '"race a car"', output: 'false', explanation: 'Not a palindrome' },
      { input: '""', output: 'true', explanation: 'Empty string' },
    ],
  },
  {
    id: 3,
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    description: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. An input string is valid if: 1) Open brackets must be closed by the same type of closing bracket. 2) Open brackets must be closed in the correct order.',
    examples: [
      {
        input: 's = "()"',
        output: 'true',
        explanation: 'Simple valid case.',
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
        explanation: 'All brackets are valid.',
      },
      {
        input: 's = "(]"',
        output: 'false',
        explanation: 'Wrong closing bracket.',
      },
    ],
    constraints: '1 <= s.length <= 10^4\ns[i] is a bracket character only.',
    boilerplate: {
      javascript: `function isValid(s) {
  // Write your code here
  
}`,
      python: `def isValid(s: str) -> bool:
    # Write your code here
    pass`,
      cpp: `bool isValid(string s) {
    // Write your code here
    return false;
}`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your code here
        return false;
    }
}`,
    },
    testCases: [
      { input: '"()"', output: 'true', explanation: 'Simple case' },
      { input: '"()[]{}"', output: 'true', explanation: 'Multiple types' },
      { input: '"(]"', output: 'false', explanation: 'Mismatch' },
      { input: '""', output: 'true', explanation: 'Empty string' },
    ],
  },
  {
    id: 4,
    title: 'Reverse String',
    difficulty: 'Easy',
    description: 'Write a function that reverses a string. The input string is given as an array of characters `s`. You must do this by modifying the input array in-place with O(1) extra memory.',
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
        explanation: 'Characters are reversed in place.',
      },
    ],
    constraints: '1 <= s.length <= 10^5\ns[i] is a printable ascii character.',
    boilerplate: {
      javascript: `function reverseString(s) {
  // Write your code here
  
}`,
      python: `def reverseString(s: List[str]) -> None:
    # Write your code here
    pass`,
      cpp: `void reverseString(vector<char>& s) {
    // Write your code here
}`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Write your code here
    }
}`,
    },
    testCases: [
      { input: '["h","e","l","l","o"]', output: '["o","l","l","e","h"]', explanation: 'Simple reverse' },
      { input: '["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]', explanation: 'Palindrome string' },
    ],
  },
  {
    id: 5,
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    examples: [
      {
        input: 's = "abcabcbb"',
        output: '3',
        explanation: 'The answer is "abc", with the length of 3.',
      },
    ],
    constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
    boilerplate: {
      javascript: `function lengthOfLongestSubstring(s) {
  // Write your code here
  return 0;
}`,
      python: `def lengthOfLongestSubstring(s: str) -> int:
    # Write your code here
    return 0`,
      cpp: `int lengthOfLongestSubstring(string s) {
    // Write your code here
    return 0;
}`,
      java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your code here
        return 0;
    }
}`,
    },
    testCases: [
      { input: '"abcabcbb"', output: '3', explanation: 'Longest substring is "abc"' },
      { input: '"bbbbb"', output: '1', explanation: 'Only "b"' },
      { input: '"pwwkew"', output: '3', explanation: 'Longest is "wke"' },
    ],
  },
];

export default function App() {
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleRunCode = (code) => {
    setIsRunning(true);
    if (selectedLanguage !== 'javascript') {
      setOutput('Execution is only supported for JavaScript in this demo environment.');
      setIsRunning(false);
      return;
    }

    try {
      // eslint-disable-next-line no-eval
      const result = eval(`(${code})`);
      if (typeof result === 'function') {
        setOutput(`Code syntax is valid.\nFunction loaded: ${result.name}`);
      } else {
        setOutput(`Code executed successfully: ${result}`);
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
    setIsRunning(false);
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
        // FIX 2: Use Template Literals (backticks) and the corrected constant
        const response = await fetch(`${API_BACKEND_URL}/api/questions`);
        
        if (!response.ok) {
           throw new Error('API not available');
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
        }
      } catch (error) {
        // This is normal if you haven't built the backend yet
        console.warn('Using default questions (API unavailable).');
      }
    };

    fetchQuestions();
  }, []);

  const currentQuestionData = questions[currentQuestionIndex] || DEFAULT_QUESTIONS[0];

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
          />
        </div>
      </div>
    </div>
  );
}