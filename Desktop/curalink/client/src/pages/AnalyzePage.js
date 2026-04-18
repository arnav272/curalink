import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// ── Theme toggle (same as other pages) ───────────────────────────────────────
const ThemeToggle = ({ theme, toggleTheme }) => (
  <div className="pill-toggle" onClick={toggleTheme}>
    {['Light', 'Dark'].map(opt => {
      const active = (opt === 'Light' && theme === 'light') || (opt === 'Dark' && theme === 'dark');
      return <div key={opt} className={`pill-opt${active ? ' active' : ''}`}>{opt}</div>;
    })}
  </div>
);

// ── Parse the LLM response into structured sections ───────────────────────────
const parseAnalysis = (text) => {
  const sections = {
    abnormal:      '',
    implications:  '',
    recommendations: '',
    disclaimer:    '',
  };

  const ab  = text.match(/\*\*Abnormal Values\*\*\s*([\s\S]*?)(?=\*\*Health Implications\*\*|\*\*Implications\*\*|$)/i);
  const im  = text.match(/\*\*(?:Health )?Implications?\*\*\s*([\s\S]*?)(?=\*\*Recommendations?\*\*|$)/i);
  const rec = text.match(/\*\*Recommendations?\*\*\s*([\s\S]*?)(?=\*\*Disclaimer\*\*|$)/i);
  const dis = text.match(/\*\*Disclaimer\*\*\s*([\s\S]*?)$/i);

  if (ab)  sections.abnormal         = ab[1].trim();
  if (im)  sections.implications     = im[1].trim();
  if (rec) sections.recommendations  = rec[1].trim();
  if (dis) sections.disclaimer       = dis[1].trim();

  return sections;
};

// ── Parse abnormal value lines into structured objects ────────────────────────
const parseAbnormalLines = (text) => {
  if (!text) return [];
  const lines = text.split('\n').filter(l => l.trim().startsWith('-') || l.includes('Test Name:'));
  return lines.map(line => {
    const clean = line.replace(/^-\s*/, '');
    const parts = clean.split('|').map(p => p.trim());
    if (parts.length >= 4) {
      return {
        name:     parts[0].replace(/Test Name:/i, '').trim(),
        value:    parts[1].replace(/Your Value:/i, '').trim(),
        range:    parts[2].replace(/Normal Range:/i, '').trim(),
        severity: parts[3].replace(/Severity:/i, '').trim(),
      };
    }
    return { raw: clean };
  }).filter(Boolean);
};

// ── Severity badge colors ─────────────────────────────────────────────────────
const severityStyle = (sev = '') => {
  const s = sev.toLowerCase();
  if (s.includes('severe'))   return { background: '#fee2e2', color: '#ef4444' };
  if (s.includes('moderate')) return { background: '#fef3c7', color: '#f59e0b' };
  if (s.includes('mild'))     return { background: '#ccfbf1', color: '#0d9488' };
  return { background: 'var(--bg-hover)', color: 'var(--text-muted)' };
};

// ── File text extraction (client-side, no server dependency) ──────────────────
const extractTextFromFile = async (file) => {
  if (file.type === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // For PDF and images: extract what we can via FileReader
  // Real OCR would need a library like tesseract.js — for hackathon we
  // read the file as data URL and send instructions to the LLM
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        // We'll send the base64 representation and tell the LLM it's a PDF
        // For production you'd use pdf.js or a server-side parser
        resolve(`[PDF FILE: ${file.name}]\nNote: PDF text extraction requires manual copy-paste or a server-side parser. Please paste the lab report text in the additional context field for best results, or use a text-based file.`);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  if (file.type.startsWith('image/')) {
    return `[IMAGE FILE: ${file.name}]\nNote: Image OCR extraction is not available in this browser-based version. For best results, please manually type or paste the key lab values in the "Additional Context" field below, including test names, your values, and any reference ranges shown on the report.`;
  }

  throw new Error('Unsupported file type. Please use PDF, PNG, JPG, or TXT files.');
};

// ═══ MAIN COMPONENT ═══════════════════════════════════════════════════════════
const AnalyzePage = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();

  const [file,          setFile]          = useState(null);
  const [dragOver,      setDragOver]      = useState(false);
  const [context,       setContext]       = useState('');
  const [pastedText,    setPastedText]    = useState('');
  const [isAnalyzing,   setIsAnalyzing]   = useState(false);
  const [analysis,      setAnalysis]      = useState(null);
  const [error,         setError]         = useState('');
  const [inputMode,     setInputMode]     = useState('file'); // 'file' | 'paste'
  const [statusStep,    setStatusStep]    = useState(0);

  const fileInputRef = useRef(null);

  const STATUS_STEPS = [
    'Reading lab report...',
    'Identifying test values and ranges...',
    'Analyzing abnormalities...',
    'Generating health insights and recommendations...',
  ];

  const handleFile = useCallback((f) => {
    if (!f) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
    if (!allowed.includes(f.type)) {
      setError('Unsupported format. Please upload PDF, PNG, JPG, or TXT files.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    setFile(f);
    setError('');
    setAnalysis(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleAnalyze = async () => {
    setError('');
    setAnalysis(null);
    setStatusStep(0);

    let reportText = '';

    if (inputMode === 'paste') {
      if (!pastedText.trim() || pastedText.trim().length < 20) {
        setError('Please paste some lab report text before analyzing.');
        return;
      }
      reportText = pastedText.trim();
    } else {
      if (!file) {
        setError('Please upload a lab report file or switch to text paste mode.');
        return;
      }
      try {
        reportText = await extractTextFromFile(file);
      } catch (err) {
        setError(`Could not read file: ${err.message}`);
        return;
      }
    }

    setIsAnalyzing(true);

    // Progress indicator — advances every ~2s while waiting
    const stepTimer = setInterval(() => {
      setStatusStep(prev => Math.min(prev + 1, STATUS_STEPS.length - 1));
    }, 2200);

    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          reportText,
          context: context.trim() || '',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed. Please try again.');
      }

      setAnalysis(parseAnalysis(data.analysis));
      setStatusStep(STATUS_STEPS.length - 1);

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      clearInterval(stepTimer);
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setAnalysis(null);
    setError('');
    setPastedText('');
    setContext('');
    setStatusStep(0);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 56, background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div className="nav-logo">C</div>
            <span className="nav-name">Curalink<span style={{ color: 'var(--teal)' }}>AI</span></span>
          </a>
          <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Lab Report Analyzer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>← Home</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app')}>Research Assistant</button>
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </nav>

      {/* Page content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--teal-light)', color: 'var(--teal-dark)',
            border: '1px solid var(--teal-mid)', borderRadius: 20,
            padding: '5px 14px', fontSize: 11, fontWeight: 700,
            marginBottom: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', animation: 'pulse 2s infinite', flexShrink: 0 }} />
            AI-Powered Analysis
          </div>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 4vw, 42px)',
            color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 14,
          }}>
            Lab Report Analyzer
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 520, margin: '0 auto' }}>
            Upload your medical lab report and get a comprehensive AI analysis — abnormal values, health implications, and actionable recommendations.
          </p>
        </div>

        {/* Input mode tabs */}
        <div style={{
          display: 'flex', background: 'var(--bg-secondary)', borderRadius: 10,
          padding: 4, gap: 4, marginBottom: 24,
        }}>
          {[
            { key: 'file',  label: 'Upload File' },
            { key: 'paste', label: 'Paste Text'  },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setInputMode(tab.key); setError(''); }}
              style={{
                flex: 1, padding: '9px 16px', borderRadius: 8,
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                background: inputMode === tab.key ? 'var(--bg-card)' : 'transparent',
                color:      inputMode === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow:  inputMode === tab.key ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.18s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Upload area or paste area */}
        {inputMode === 'file' ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--teal)' : file ? 'var(--teal)' : 'var(--border)'}`,
              borderRadius: 16, padding: '48px 32px', textAlign: 'center',
              cursor: 'pointer', marginBottom: 20, transition: 'all 0.2s ease',
              background: dragOver ? 'var(--teal-light)' : file ? 'var(--teal-light)' : 'var(--bg-card)',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files[0])}
            />
            {file ? (
              <>
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {file.type === 'application/pdf' ? '📄' : file.type.startsWith('image/') ? '🖼' : '📝'}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--teal)', marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 36, marginBottom: 14, opacity: 0.4 }}>⬆</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Drop your lab report here or click to upload
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Supports PDF, PNG, JPG · Max 10MB
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <textarea
              style={{
                width: '100%', minHeight: 200,
                background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                borderRadius: 12, padding: '16px 18px',
                fontFamily: 'var(--font-sans)', fontSize: 14,
                color: 'var(--text-primary)', resize: 'vertical',
                outline: 'none', lineHeight: 1.6,
                transition: 'border-color 0.18s',
              }}
              placeholder="Paste your lab report text here...&#10;&#10;Example:&#10;Hemoglobin: 9.2 g/dL (Normal: 12.0-17.5)&#10;WBC: 11,500 /μL (Normal: 4,500-11,000)&#10;Glucose: 126 mg/dL (Normal: 70-99)"
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              onFocus={e => { e.target.style.borderColor = 'var(--teal)'; }}
              onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Copy text from your digital lab report or manually type key values with their reference ranges.
            </p>
          </div>
        )}

        {/* Additional context */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'block', marginBottom: 8,
          }}>
            Additional Context (optional)
          </label>
          <textarea
            style={{
              width: '100%', minHeight: 90,
              background: 'var(--bg-card)', border: '1.5px solid var(--border)',
              borderRadius: 10, padding: '12px 16px',
              fontFamily: 'var(--font-sans)', fontSize: 14,
              color: 'var(--text-primary)', resize: 'vertical',
              outline: 'none', lineHeight: 1.6,
              transition: 'border-color 0.18s',
            }}
            placeholder="Age: 45, Symptoms: fatigue, frequent urination. History: Type 2 diabetes. Current medications: Metformin 500mg..."
            value={context}
            onChange={e => setContext(e.target.value)}
            onFocus={e => { e.target.style.borderColor = 'var(--teal)'; }}
            onBlur={e =>  { e.target.style.borderColor = 'var(--border)'; }}
          />
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Helps the AI provide more personalized insights. Include age, symptoms, medical history, or current medications.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'var(--red-light)', border: '1px solid var(--red)',
            borderRadius: 10, padding: '12px 16px',
            color: 'var(--red)', fontSize: 14, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          style={{
            width: '100%', justifyContent: 'center', fontSize: 15,
            padding: '14px', borderRadius: 12, marginBottom: 12,
            opacity: isAnalyzing ? 0.7 : 1,
          }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Lab Report'}
        </button>

        {analysis && !isAnalyzing && (
          <button
            onClick={handleReset}
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: 14, padding: '10px' }}
          >
            Analyze Another Report
          </button>
        )}

        {/* Loading status feed */}
        {isAnalyzing && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 22px', marginTop: 24,
            boxShadow: 'var(--shadow-card)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Analyzing report
            </div>
            {STATUS_STEPS.map((step, i) => {
              const isDone   = i < statusStep;
              const isActive = i === statusStep;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13, marginBottom: 10,
                  color: isDone ? 'var(--green)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'color 0.3s',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: isDone ? 'var(--green)' : isActive ? 'var(--teal)' : 'var(--border)',
                    animation: isActive ? 'statusPulse 1s ease-in-out infinite' : 'none',
                  }} />
                  {step}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {analysis && !isAnalyzing && (
          <div style={{ marginTop: 36 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <h2 style={{
                fontFamily: 'var(--font-serif)', fontSize: 22,
                color: 'var(--text-primary)', letterSpacing: '-0.01em',
              }}>
                Analysis Results
              </h2>
              <button
                onClick={() => window.print()}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12 }}
              >
                Print / Save PDF
              </button>
            </div>

            {/* Abnormal Values */}
            <ResultCard
              icon="A"
              iconStyle={{ background: '#ef4444' }}
              title="Abnormal Values"
            >
              {(() => {
                const lines = parseAbnormalLines(analysis.abnormal);
                if (!lines.length) {
                  return <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{analysis.abnormal || 'No abnormal values identified.'}</p>;
                }
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {lines.map((line, i) => line.raw ? (
                      <p key={i} style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{line.raw}</p>
                    ) : (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: 10, background: 'var(--bg-secondary)',
                        borderRadius: 8, padding: '10px 14px', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Test</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{line.name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Your Value</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>{line.value}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Normal Range</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{line.range}</div>
                        </div>
                        <span style={{
                          ...severityStyle(line.severity),
                          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5,
                          whiteSpace: 'nowrap',
                        }}>
                          {line.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </ResultCard>

            {/* Health Implications */}
            <ResultCard
              icon="H"
              iconStyle={{ background: '#3b82f6' }}
              title="Health Implications"
            >
              <FormattedText text={analysis.implications} />
            </ResultCard>

            {/* Recommendations */}
            <ResultCard
              icon="R"
              iconStyle={{ background: '#0d9488' }}
              title="Recommendations"
            >
              <FormattedText text={analysis.recommendations} />
            </ResultCard>

            {/* Disclaimer */}
            <div style={{
              background: 'var(--amber-light)', border: '1px solid var(--amber)',
              borderRadius: 12, padding: '16px 18px', marginTop: 10,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Medical Disclaimer
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                {analysis.disclaimer || 'This is an AI-generated analysis for informational purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making any medical decisions.'}
              </p>
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────
const ResultCard = ({ icon, iconStyle, title, children }) => (
  <div style={{
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 14, overflow: 'hidden',
    boxShadow: 'var(--shadow-card)', marginBottom: 12,
  }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '13px 18px', borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: 'white',
        ...iconStyle,
      }}>{icon}</div>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
    </div>
    <div style={{ padding: '16px 18px' }}>{children}</div>
  </div>
);

const FormattedText = ({ text }) => {
  if (!text) return <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No information available.</p>;

  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {lines.map((line, i) => {
        const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./);
        const clean = line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '');
        return isBullet ? (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, marginTop: 7 }} />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{clean}</span>
          </div>
        ) : (
          <p key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{line}</p>
        );
      })}
    </div>
  );
};

export default AnalyzePage;