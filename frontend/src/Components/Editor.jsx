import { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import TestResults from './TestResults';
import '../styles/Editor.css';

const LANGUAGE_MAP = {
  javascript: { name: 'JavaScript', monaco: 'javascript' },
  python: { name: 'Python', monaco: 'python' },
  cpp: { name: 'C++', monaco: 'cpp' },
  java: { name: 'Java', monaco: 'java' },
};

export default function CodeEditor({ question, selectedLanguage, onLanguageChange, onRun, isRunning, output , result}) {
  const [code, setCode] = useState('');
  const [editorHeight, setEditorHeight] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (question && question.boilerplate && question.boilerplate[selectedLanguage]) {
      setCode(question.boilerplate[selectedLanguage]);
    } else {
      setCode('// Write your code here\n');
    }
  }, [question, selectedLanguage]);

  // Check if output is an error
  useEffect(() => {
    if (output && output.toLowerCase().includes('error')) {
      setHasError(true);
    } else if (output === '') {
      setHasError(false);
    }
  }, [output]);

    useEffect(() => {
    if (result && result.success === false && !result.testResults) {
      setHasError(true);
    } else {
      setHasError(false);
    }
  }, [result, output]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleRun = () => {
    setHasError(false);
    onRun(code);
  };

  const handleReset = () => {
    if (question && question.boilerplate && question.boilerplate[selectedLanguage]) {
      setCode(question.boilerplate[selectedLanguage]);
    }
  };

  const handleFormat = async () => {
    if (editorRef.current) {
      try {
        await editorRef.current.getAction('editor.action.formatDocument').run();
      } catch (error) {
        console.log('Format action not available');
      }
    }
  };

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newHeight = ((e.clientY - rect.top) / rect.height) * 100;

      if (newHeight > 20 && newHeight < 80) {
        setEditorHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  return (
    <div className="editor-container" ref={containerRef}>
      <div className="editor-header">
        <h2>Code Editor</h2>
        <div className="language-selector">
          <label>Language: </label>
          <select 
            value={selectedLanguage} 
            onChange={(e) => onLanguageChange(e.target.value)}
            className="language-dropdown"
          >
            {Object.entries(LANGUAGE_MAP).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name}
              </option>
            ))}
          </select>
        </div>
        <div className="button-group">
          <button 
            className="btn btn-format" 
            onClick={handleFormat}
            title="Format code"
          >
            Format
          </button>
          <button 
            className="btn btn-reset" 
            onClick={handleReset}
            title="Reset to default code"
          >
            Reset
          </button>
          <button 
            className="btn btn-run" 
            onClick={handleRun}
            disabled={isRunning}
            title="Run code"
          >
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      <div className="editor-wrapper" style={{ height: `${editorHeight}%` }}>
        <Editor
          height="100%"
          language={LANGUAGE_MAP[selectedLanguage].monaco}
          defaultValue={code}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: 'Fira Code, monospace',
            wordWrap: 'on',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>

      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
        title="Drag to resize"
      />

      {!hasError && (
        <div className="test-wrapper" style={{ height: `${100 - editorHeight}%` }}>
          <TestResults 
            testCases={question?.testCases || []}
            hasError={hasError}
            totalTests={question?.testCases?.length || 0}
            passedTests={result?.summary?.passed || 0}
            result={result}
          />
        </div>
      )}
    </div>
  );
}
