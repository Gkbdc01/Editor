import '../styles/QuestionPanel.css';

export default function QuestionPanel({ question, currentIndex, total, onNext, onPrevious }) {
  return (
    <div className="question-container">
      <div className="question-header">
        <div className="question-title">
          <h2>{question.title}</h2>
          <span className={`difficulty ${question.difficulty.toLowerCase()}`}>
            {question.difficulty}
          </span>
        </div>
        <div className="question-counter">
          {currentIndex + 1} / {total}
        </div>
      </div>

      <div className="question-content">
        <div className="section">
          <h3>Description</h3>
          <p>{question.description}</p>
        </div>

        <div className="section">
          <h3>Examples</h3>
          {question.examples.map((example, index) => (
            <div key={index} className="example">
              <div className="example-item">
                <strong>Input:</strong> <code>{example.input}</code>
              </div>
              <div className="example-item">
                <strong>Output:</strong> <code>{example.output}</code>
              </div>
              {example.explanation && (
                <div className="example-item">
                  <strong>Explanation:</strong> {example.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="section">
          <h3>Constraints</h3>
          <pre>{question.constraints}</pre>
        </div>
      </div>

      <div className="question-footer">
        <button 
          className="btn-nav" 
          onClick={onPrevious}
          disabled={currentIndex === 0}
        >
          ← Previous
        </button>
        <button 
          className="btn-nav" 
          onClick={onNext}
          disabled={currentIndex === total - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
