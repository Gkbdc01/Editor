import { useState } from 'react';
import '../styles/TestResults.css';

export default function TestResults({ testCases, hasError, totalTests = 0, passedTests = 0, result = {} }) {
  const [expandedCase, setExpandedCase] = useState(null);

  if (!testCases || testCases.length === 0) {
    return (
      <div className="test-results-container">
        <h3>Test Cases</h3>
        <div className="no-tests">No test cases available</div>
      </div>
    );
  }

  // Get the specific execution result for a specific test case index
  const getExecutionData = (index) => {
    if (!result || !result.testResults) return null;
    return result.testResults[index];
  };

  const progressPercentage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="test-results-container">
      <div className="results-header">
        <div className="header-content">
          <div className="title-row">
             <h3>Test Cases</h3>
             {result?.summary && (
               <span className={`status-badge ${result.summary.status}`}>
                 {result.summary.status.toUpperCase()}
               </span>
             )}
          </div>
          <div className="progress-section">
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${progressPercentage}%`,
                    backgroundColor: progressPercentage === 100 ? '#2cbb5d' : '#ffa116' 
                  }}
                ></div>
              </div>
              <span className="progress-text">{passedTests}/{totalTests}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="test-cases-list">
        {testCases.map((testCase, index) => {
          const execution = getExecutionData(index);
          const isPassed = execution?.passed;
          const statusText = execution ? (isPassed ? "Accepted" : "Wrong Answer") : "Not Run";
          const statusClass = execution ? (isPassed ? "pass" : "fail") : "not-run";

          return (
            <div 
              key={index} 
              className={`test-case-item ${expandedCase === index ? 'expanded' : ''} ${statusClass}`}
              onClick={() => setExpandedCase(expandedCase === index ? null : index)}
            >
              <div className="test-case-header">
                <span className="test-number">Case {index + 1}</span>
                <span className={`test-status ${statusClass}`}>
                  <span className="status-indicator"></span>
                  {statusText}
                </span>
                <span className="expand-icon">
                  {expandedCase === index ? '▼' : '▶'}
                </span>
              </div>

              {expandedCase === index && (
                <div className="test-case-details">
                  <div className="detail-section">
                    <label>Input:</label>
                    <pre><code>{testCase.input}</code></pre>
                  </div>
                  
                  <div className="grid-details">
                    <div className="detail-section">
                      <label>Expected:</label>
                      <code className="expected">{testCase.output || testCase.expected}</code>
                    </div>
                    
                    {execution && (
                      <div className="detail-section">
                        <label>Actual Output:</label>
                        <code className={isPassed ? "actual-pass" : "actual-fail"}>
                          {execution.output || "No Output"}
                        </code>
                      </div>
                    )}
                  </div>

                  {execution?.error && (
                    <div className="detail-section error-msg">
                      <label>Runtime Error:</label>
                      <pre><code>{execution.error}</code></pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}