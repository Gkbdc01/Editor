import { useState } from 'react';
import '../styles/TestResults.css';

export default function TestResults({ testCases, hasError, totalTests = 0, passedTests = 0 }) {
  const [expandedCase, setExpandedCase] = useState(null);

  if (!testCases || testCases.length === 0) {
    return (
      <div className="test-results-container">
        <h3>Test Cases</h3>
        <div className="no-tests">No test cases available</div>
      </div>
    );
  }

  // Show only first 3 test cases
  const visibleCases = testCases.slice(0, 3);
  const progressPercentage = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  return (
    <div className="test-results-container">
      <div className="results-header">
        <div className="header-content">
          <h3>Test Cases</h3>
          <div className="progress-section">
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="progress-text">{passedTests}/{totalTests}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="test-cases-list">
        {visibleCases.map((testCase, index) => (
          <div 
            key={index} 
            className="test-case-item"
            onClick={() => setExpandedCase(expandedCase === index ? null : index)}
          >
            <div className="test-case-header">
              <span className="test-number">Test {index + 1}</span>
              <span className="test-status">
                <span className="status-indicator"></span>
                Not Run
              </span>
              <span className="expand-icon">
                {expandedCase === index ? '▼' : '▶'}
              </span>
            </div>

            {expandedCase === index && (
              <div className="test-case-details">
                <div className="detail-section">
                  <label>Input:</label>
                  <code>{testCase.input}</code>
                </div>
                <div className="detail-section">
                  <label>Expected Output:</label>
                  <code className="expected">{testCase.output}</code>
                </div>
                {testCase.explanation && (
                  <div className="detail-section">
                    <label>Explanation:</label>
                    <p>{testCase.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
