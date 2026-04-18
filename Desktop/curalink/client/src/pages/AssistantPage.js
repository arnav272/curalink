import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientContextForm from '../components/PatientContextForm';
import MessageBubble, { AgenticStatusFeed } from '../components/MessageBubble';
import FeedbackModal from '../components/FeedbackModal';
import { useChat } from '../hooks/useChat';
import { useRecentSearches } from '../hooks/useRecentSearches';

const SUGGESTIONS = [
  { label: 'Latest treatment options',          sub: 'Current therapies and emerging treatments' },
  { label: 'Clinical trials near me',           sub: 'Active recruiting studies for your condition' },
  { label: 'Recent research breakthroughs',     sub: 'High-impact studies from 2024–2026' },
  { label: 'Side effects of common treatments', sub: 'Evidence-based safety profiles' },
];

const ThemeToggle = ({ theme, toggleTheme }) => (
  <div className="pill-toggle" onClick={toggleTheme}>
    {['Light','Dark'].map(opt => {
      const active = (opt==='Light'&&theme==='light')||(opt==='Dark'&&theme==='dark');
      return <div key={opt} className={`pill-opt${active?' active':''}`}>{opt}</div>;
    })}
  </div>
);

const AssistantPage = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const makeSessionId = () => `session-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;

  const [patientContext, setPatientContext] = useState(null);
  const [sessionId,      setSessionId]      = useState(() => makeSessionId());
  const [showFeedback,   setShowFeedback]   = useState(false);
  const [input,          setInput]          = useState('');
  const [confirmSwitch,  setConfirmSwitch]  = useState(null);
  const [isFirstQuery,   setIsFirstQuery]   = useState(true);

  const messagesEndRef = useRef(null);
  const registeredRef  = useRef(false);

  const { messages, isLoading, error, sendMessage, cancelRequest, setMessages } =
    useChat(sessionId, patientContext);
  const { sessions, registerSession, clearSessions } = useRecentSearches();

  // Handle pre-filled query from landing page
  useEffect(() => {
    const q = sessionStorage.getItem('cl-query');
    const d = sessionStorage.getItem('cl-disease');
    if (q && d) {
      sessionStorage.removeItem('cl-query');
      sessionStorage.removeItem('cl-disease');
      setPatientContext({ name: '', disease: d, location: '' });
      sessionStorage.setItem('cl-pending-query', q);
    }
  }, []);

  useEffect(() => {
    const pending = sessionStorage.getItem('cl-pending-query');
    if (pending && patientContext && isFirstQuery) {
      sessionStorage.removeItem('cl-pending-query');
      setTimeout(() => fireFirstQuery(pending), 80);
    }
  }, [patientContext]); // eslint-disable-line

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fireFirstQuery = useCallback((text) => {
    if (!text.trim() || !patientContext) return;
    if (!registeredRef.current) {
      registeredRef.current = true;
      registerSession(sessionId, text.trim(), patientContext.disease, patientContext.location);
    }
    setIsFirstQuery(false);
    sendMessage(text.trim());
    setInput('');
  }, [patientContext, sessionId, registerSession, sendMessage]);

  const handleSend = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading || !patientContext) return;
    if (isFirstQuery) { fireFirstQuery(msg); }
    else { sendMessage(msg); setInput(''); }
  }, [input, isLoading, patientContext, isFirstQuery, fireFirstQuery, sendMessage]);

  const handleSuggestion = useCallback((label) => {
    if (!patientContext || isLoading) return;
    const q = `${label} for ${patientContext.disease}`;
    if (isFirstQuery) { fireFirstQuery(q); } else { sendMessage(q); }
  }, [patientContext, isLoading, isFirstQuery, fireFirstQuery, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSessionClick = useCallback((session) => {
    if (messages.length > 0) { setConfirmSwitch(session); }
    else { switchToSession(session); }
  }, [messages.length]);

  const switchToSession = useCallback(async (session) => {
    setConfirmSwitch(null);
    setMessages([]);
    setIsFirstQuery(true);
    registeredRef.current = true;
    const newCtx = { name: patientContext?.name || '', disease: session.disease, location: session.location || '' };
    setPatientContext(newCtx);
    setSessionId(session.sessionId);
    setTimeout(async () => {
      try {
        const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const res  = await fetch(`${API_BASE}/api/chat/history/${session.sessionId}`);
        const data = await res.json();
        if (data.messages?.length > 0) {
          setMessages(data.messages.map((m, i) => ({ id:i, role:m.role, content:m.content, sources:m.sources||[], timestamp:m.timestamp })));
          setIsFirstQuery(false);
        }
      } catch (e) { console.error('History load error:', e); }
    }, 60);
  }, [patientContext, setMessages]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setIsFirstQuery(true);
    registeredRef.current = false;
    setSessionId(makeSessionId());
    setPatientContext(null);
  }, [setMessages]);

  if (!patientContext) {
    return (
      <PatientContextForm
        theme={theme} toggleTheme={toggleTheme}
        onSubmit={ctx => { setPatientContext(ctx); registeredRef.current = false; setIsFirstQuery(true); }}
        onBack={() => navigate('/')}
      />
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="assistant-page">
      {/* Navbar */}
      <nav className="app-navbar">
        <div className="app-nav-left">
          <a href="/" className="navbar-brand">
            <div className="nav-logo">C</div>
            <span className="nav-name">Curalink<span style={{color:'var(--teal)'}}>AI</span></span>
          </a>
          <div className="nav-divider" />
          <div className="nav-pills">
            <span className="nav-pill">{patientContext.disease}</span>
            {patientContext.location && <span className="nav-pill">{patientContext.location}</span>}
          </div>
        </div>
        <div className="app-nav-right">
          <button className="btn btn-ghost btn-sm no-print" onClick={() => setShowFeedback(true)}>Feedback</button>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button className="btn btn-ghost btn-sm no-print" onClick={startNewSession}>New</button>
        </div>
      </nav>

      <div className="assistant-body">
        {/* Sidebar — auto-hides on tablet/mobile via CSS */}
        <aside className="sidebar">
          <div className="sb-section">
            <div className="sb-ctx-disease">{patientContext.disease}</div>
            {patientContext.location && <div className="sb-ctx-loc">{patientContext.location}</div>}
          </div>
          {sessions.length > 0 && (
            <>
              <div style={{ padding:'12px 14px 6px', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Past searches</div>
              <div className="sb-recents">
                {sessions.map((s, i) => (
                  <button key={i} className="sb-item" onClick={() => handleSessionClick(s)} disabled={isLoading}
                    style={{ borderLeftColor: s.sessionId===sessionId ? 'var(--teal)' : 'transparent' }}>
                    <span className="sb-item-q">{s.disease}</span>
                    <span className="sb-item-t">{s.firstQuery.slice(0,38)}{s.firstQuery.length>38?'…':''}</span>
                    <span className="sb-item-t">{s.timeAgo}</span>
                  </button>
                ))}
                <button className="sb-clear" onClick={clearSessions}>Clear history</button>
              </div>
            </>
          )}
        </aside>

        {/* Chat */}
        <main className="chat-main">
          <div className="chat-scroll">
            {!hasMessages ? (
              <div className="welcome-wrap">
                <div className="welcome-center">
                  <div className="welcome-mark">◎</div>
                  <h2 className="welcome-title">
                    {patientContext.name ? `Hello, ${patientContext.name}` : 'How can I help with your research?'}
                  </h2>
                  <p className="welcome-sub">
                    Research companion for <strong>{patientContext.disease}</strong>
                    {patientContext.location && <> · {patientContext.location}</>}.
                  </p>
                  <div className="welcome-badges">
                    <span className="welcome-badge">{patientContext.disease}</span>
                    {patientContext.location && <span className="welcome-badge">{patientContext.location}</span>}
                  </div>
                  <div className="sugg-grid">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} className="sugg-card" onClick={() => handleSuggestion(s.label)} disabled={isLoading}>
                        <span className="sugg-label">{s.label}</span>
                        <span className="sugg-sub">{s.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  disease={patientContext.disease}
                />
              ))
            )}

            {/* Agentic status feed — shows while loading */}
            {isLoading && <AgenticStatusFeed />}
            {error && <div className="error-toast">{error}</div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Persistent suggestions */}
          {hasMessages && (
            <div className="persist-bar no-print">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="persist-chip" onClick={() => handleSuggestion(s.label)} disabled={isLoading}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Input — pinned via flex, not position:fixed */}
          <div className="input-area no-print">
            <div className="input-box">
              <textarea
                className="input-ta"
                placeholder={`Ask about ${patientContext.disease}...`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
              <div className="input-foot">
                <span className="input-hint">Enter to send · Shift+Enter for new line</span>
                <div className="input-acts">
                  {isLoading
                    ? <button className="cancel-btn" onClick={cancelRequest}>✕</button>
                    : <button className="btn btn-primary btn-sm" onClick={() => handleSend()} disabled={!input.trim()} style={{ opacity: input.trim()?1:0.5 }}>Research</button>
                  }
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirm session switch */}
      {confirmSwitch && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-title">Switch to a different search?</div>
            <p className="confirm-sub">
              You're currently researching <strong>{patientContext.disease}</strong>. Switching will open the previous conversation about <strong>{confirmSwitch.disease}</strong> — nothing will be mixed.
            </p>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:18, fontStyle:'italic' }}>"{confirmSwitch.firstQuery}"</p>
            <div className="confirm-btns">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmSwitch(null)}>Stay here</button>
              <button className="btn btn-primary btn-sm" onClick={() => switchToSession(confirmSwitch)}>Switch</button>
            </div>
          </div>
        </div>
      )}

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          lastQuery={messages.filter(m=>m.role==='user').slice(-1)[0]?.content || ''}
        />
      )}
    </div>
  );
};

export default AssistantPage;