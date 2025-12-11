// frontend/src/components/QAPanel.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function QAPanel({ item }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || !item) return;
    
    setLoading(true);
    try {
      const { data } = await axios.post('/api/qa', {
        question: question.trim(),
        recordId: item.id
      });
      setAnswer(data);
    } catch (err) {
      setAnswer({ 
        answer: 'Failed to get answer. Please try again.', 
        confidence: 'low' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const getConfidenceColor = (conf) => {
    if (conf === 'high') return '#2ecc71';
    if (conf === 'medium') return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div style={{ 
      marginTop: 24, 
      padding: 16, 
      background: '#041022', 
      borderRadius: 8,
      border: '1px solid #1e293b'
    }}>
      <h4 style={{ margin: '0 0 12px' }}>Ask Questions About This Renewal</h4>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., What's the premium amount?"
          disabled={!item || loading}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#0a1628',
            border: '1px solid #1e293b',
            color: '#e0e6ed',
            borderRadius: 4,
            fontSize: 13
          }}
        />
        <button
          onClick={handleAsk}
          disabled={!item || !question.trim() || loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#555' : '#3498db',
            border: 'none',
            color: 'white',
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: loading || !item ? 'not-allowed' : 'pointer',
            opacity: loading || !item ? 0.6 : 1
          }}
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </div>

      {/* Suggested Questions */}
      {!answer && item && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Try asking:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              'What is the premium?',
              'When does it expire?',
              'Who is the carrier?',
              'How many touchpoints?'
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => setQuestion(q)}
                style={{
                  padding: '4px 8px',
                  background: '#0a1628',
                  border: '1px solid #1e293b',
                  color: '#94a3b8',
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Answer Display */}
      {answer && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: '#0a1628',
          borderRadius: 6,
          border: '1px solid #1e293b'
        }}>
          <div style={{ 
            fontSize: 13, 
            color: '#cfe', 
            lineHeight: 1.6,
            marginBottom: 8
          }}>
            {answer.answer}
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: '#64748b'
          }}>
            <span>
              Confidence: <span style={{ 
                color: getConfidenceColor(answer.confidence),
                fontWeight: 'bold'
              }}>
                {answer.confidence?.toUpperCase()}
              </span>
            </span>
            {answer.source && (
              <span>Source: {answer.source.system}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}