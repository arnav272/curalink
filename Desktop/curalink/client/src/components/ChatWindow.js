import React, { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import { useChat } from '../hooks/useChat';

const SUGGESTIONS = [
  'Latest treatment options',
  'Clinical trials near me',
  'Recent research breakthroughs',
  'Side effects of common treatments',
];

const ChatWindow = ({ patientContext, sessionId, onReset }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { messages, isLoading, error, sendMessage, cancelRequest } = useChat(sessionId, patientContext);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  }, [input, isLoading, sendMessage]);

  const handleSuggestion = useCallback((text) => {
    if (isLoading) return;
    // Inject disease AND location context into suggestion
    const location = patientContext.location ? ` in ${patientContext.location}` : '';
    sendMessage(`${text} for ${patientContext.disease}${location}`);
  }, [isLoading, sendMessage, patientContext]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <div className="navbar-logo-icon">⚕</div>
          <span className="navbar-logo-text">CuralinkAI</span>
          <span className="navbar-tagline">Medical Research Assistant</span>
        </div>
        <div className="navbar-right">
          <span className="navbar-pill">🧬 {patientContext.disease}</span>
          {patientContext.location && (
            <span className="navbar-pill">📍 {patientContext.location}</span>
          )}
          <button className="navbar-btn" onClick={onReset}>New Session</button>
        </div>
      </nav>

      {/* Body */}
      <div className="main-layout">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Messages */}
          <div className="messages-area">
            {messages.length === 0 && (
              <div className="welcome-screen">
                <div className="welcome-icon">🔬</div>
                <h2 className="welcome-title">
                  Hello{patientContext.name ? `, ${patientContext.name}` : ''}!
                </h2>
                <p className="welcome-sub">
                  I'm your AI research companion for{' '}
                  <strong style={{ color: '#a5b4fc' }}>{patientContext.disease}</strong>
                  {patientContext.location && (
                    <> · finding trials near <strong style={{ color: '#a5b4fc' }}>{patientContext.location}</strong></>
                  )}.
                  Ask about treatments, clinical trials, or recent studies.
                </p>
                <div className="welcome-chips">
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} className="welcome-chip" onClick={() => handleSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {isLoading && <SkeletonLoader />}
            {error && <div className="error-bar">{error}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Persistent suggestions — always visible after first message */}
          {messages.length > 0 && (
            <div className="suggestions-bar">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-pill"
                  onClick={() => handleSuggestion(s)}
                  disabled={isLoading}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="input-area">
            <div className="input-row">
              <textarea
                className="chat-textarea"
                placeholder={`Ask about ${patientContext.disease}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              {isLoading ? (
                <button className="cancel-btn" onClick={cancelRequest} title="Cancel request">✕</button>
              ) : (
                <button className="send-btn" onClick={handleSend} disabled={!input.trim()}>➤</button>
              )}
            </div>
            <p className="input-hint">Enter to send · Shift+Enter for new line</p>
          </div>

        </div>
      </div>
    </div>
  );
};

// Skeleton with live API status indicators
const SkeletonLoader = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p + 1), 1200);
    return () => clearInterval(t);
  }, []);

  const apis = [
    { name: 'PubMed',            done: tick >= 1 },
    { name: 'OpenAlex',          done: tick >= 2 },
    { name: 'ClinicalTrials.gov',done: tick >= 3 },
  ];

  return (
    <div className="skeleton-wrap">
      <div className="msg-avatar">⚕</div>
      <div className="skeleton-cards">
        {/* API status row */}
        <div className="skeleton-api-status">
          {apis.map(api => (
            <div key={api.name} className="api-status-item">
              <span>{api.done ? '✅' : '⟳'}</span>
              <span style={{ color: api.done ? '#10b981' : '#4b5563' }}>{api.name}</span>
            </div>
          ))}
        </div>
        {/* Skeleton cards */}
        {[
          [45, 80, 60],
          [35, 90, 70, 50],
          [40, 75, 55],
          [50, 65],
        ].map((widths, i) => (
          <div className="skeleton-card" key={i}>
            {widths.map((w, j) => (
              <div
                key={j}
                className="skeleton-line"
                style={{
                  width: `${w}%`,
                  animationDelay: `${(i * 0.15 + j * 0.1)}s`,
                  marginBottom: j === widths.length - 1 ? 0 : 11,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatWindow;