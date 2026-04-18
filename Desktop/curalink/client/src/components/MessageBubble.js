import React, { useState, useEffect, useRef } from 'react';
import SourcesPanel from './SourcesPanel';

// ── Agentic status feed ───────────────────────────────────────────────────────
const STATUS_STEPS = [
  'Expanding query into 5+ medical search parameters...',
  'Fetching 200+ peer-reviewed studies across PubMed & OpenAlex...',
  'Filtering to top 8 highest-confidence sources by recency and impact...',
  'Generating evidence-backed insights with verifiable citations...',
];

export const AgenticStatusFeed = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState([0]);

  useEffect(() => {
    const timers = [];
    STATUS_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => {
        setActiveStep(i);
        setVisibleSteps(prev => [...prev, i]);
      }, i * 900));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="msg-ai-row">
      <div className="msg-ai-av">C</div>
      <div className="msg-ai-body">
        <div className="status-feed">
          <div className="status-feed-title">Analyzing research</div>
          {STATUS_STEPS.map((step, i) => {
            if (!visibleSteps.includes(i)) return null;
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div
                key={i}
                className={`status-line${isActive ? ' sl-active' : isDone ? ' sl-done' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {isDone
                  ? <span className="sl-dot-done" />
                  : isActive
                    ? <span className="sl-dot-active" />
                    : <span className="sl-dot-wait" />
                }
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── PDF export via window.print() ─────────────────────────────────────────────
const exportPDF = (message, sources, disease) => {
  const sections = parseResponse(message.content);
  const timestamp = new Date().toLocaleString();

  const srcList = (sources || []).map((s, i) => `
    <div class="pdf-src">
      <div class="pdf-src-title">[${i+1}] ${s.title || ''}</div>
      <div class="pdf-src-meta">${s.authors || ''} · ${s.year || ''} · ${s.platform || ''}</div>
      ${s.url ? `<div class="pdf-src-meta">${s.url}</div>` : ''}
    </div>
  `).join('');

  const win = window.open('', '_blank');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Curalink Research Brief — ${disease}</title>
      <style>
        body { font-family: 'Inter', -apple-system, sans-serif; font-size: 12px; color: #111; line-height: 1.65; padding: 40px 56px; max-width: 900px; margin: 0 auto; }
        .hdr { border-bottom: 2px solid #0d9488; padding-bottom: 14px; margin-bottom: 20px; }
        .hdr-title { font-size: 20px; font-weight: 700; color: #0d9488; }
        .hdr-sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #111; border-left: 3px solid #0d9488; padding-left: 8px; margin-bottom: 8px; }
        .body-text { font-size: 12px; color: #374151; line-height: 1.75; }
        .insight { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-start; }
        .ins-n { width: 18px; height: 18px; border-radius: 50%; background: #ccfbf1; color: #0d9488; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
        .ins-text { font-size: 12px; color: #374151; line-height: 1.7; }
        .src { margin-bottom: 8px; padding: 6px 10px; background: #f9f9f9; border-left: 2px solid #e5e7eb; }
        .src-title { font-weight: 600; font-size: 11px; }
        .src-meta { font-size: 10px; color: #6b7280; }
        .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
        @media print { @page { margin: 24mm 20mm; } }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div class="hdr-title">CuralinkAI — Research Brief</div>
        <div class="hdr-sub">Condition: ${disease || 'Medical Research'} &nbsp;·&nbsp; Generated: ${timestamp}</div>
      </div>

      ${sections.overview ? `
        <div class="section">
          <div class="section-title">Condition Overview</div>
          <p class="body-text">${sections.overview}</p>
        </div>` : ''}

      ${sections.insights.length > 0 ? `
        <div class="section">
          <div class="section-title">Research Insights</div>
          ${sections.insights.map((ins, i) => `
            <div class="insight">
              <div class="ins-n">${i+1}</div>
              <div class="ins-text">${ins.replace(/\[Source \d+\]/g, '').trim()}</div>
            </div>`).join('')}
        </div>` : ''}

      ${sections.summary ? `
        <div class="section">
          <div class="section-title">Summary</div>
          <p class="body-text">${sections.summary}</p>
        </div>` : ''}

      ${srcList ? `
        <div class="section">
          <div class="section-title">Supporting Literature (${(sources||[]).length} sources)</div>
          ${srcList}
        </div>` : ''}

      <div class="footer">
        For research purposes only. Not a substitute for professional medical advice. &nbsp;·&nbsp; CuralinkAI · ${timestamp}
      </div>

      <script>window.onload = () => { window.print(); };<\/script>
    </body>
    </html>
  `);
  win.document.close();
};

// ── Response parser ───────────────────────────────────────────────────────────
const parseResponse = (content) => {
  const s = { overview:'', insights:[], trialsText:'', summary:'' };
  const ov  = content.match(/##\s*Condition Overview\s*\n([\s\S]*?)(?=##|$)/i);
  if (ov)  s.overview   = ov[1].trim();
  const ins = content.match(/##\s*Research Insights\s*\n([\s\S]*?)(?=##|$)/i);
  if (ins) s.insights = ins[1].trim().split('\n').filter(l=>l.match(/^\*|\d+\./)).map(l=>l.replace(/^[\*\d\.]+\s*/,'').trim()).filter(Boolean);
  const tr  = content.match(/##\s*Clinical Trials\s*\n([\s\S]*?)(?=##|$)/i);
  if (tr)  s.trialsText = tr[1].trim();
  const sm  = content.match(/##\s*Summary\s*\n([\s\S]*?)(?=##|$)/i);
  if (sm)  s.summary    = sm[1].trim();
  return s;
};

// ── Main MessageBubble ────────────────────────────────────────────────────────
const MessageBubble = ({ message, disease }) => {
  if (message.role === 'user') {
    return (
      <div className="msg-user-row">
        <div className="msg-user-bub">{message.content}</div>
      </div>
    );
  }

  const s = parseResponse(message.content);
  const hasParsed = s.overview || s.insights.length > 0 || s.summary;

  return (
    <div className="msg-ai-row">
      <div className="msg-ai-av">C</div>
      <div className="msg-ai-body">
        {/* Export PDF button */}
        <div className="response-header">
          <button
            className="export-btn no-print"
            onClick={() => exportPDF(message, message.sources, disease || 'Medical Research')}
            title="Download as PDF"
          >
            ↓ Export PDF
          </button>
        </div>

        {hasParsed ? (
          <div className="r-cards">
            {s.overview && (
              <div className="r-card">
                <div className="r-card-hd">
                  <div className="r-card-ico ico-blue">i</div>
                  <span className="r-card-title">Condition Overview</span>
                </div>
                <div className="r-card-bd"><p>{s.overview}</p></div>
              </div>
            )}

            {s.insights.length > 0 && (
              <div className="r-card">
                <div className="r-card-hd">
                  <div className="r-card-ico ico-teal">R</div>
                  <span className="r-card-title">Research Insights</span>
                </div>
                <div className="r-card-bd">
                  <ul className="insights-list">
                    {s.insights.map((ins, i) => (
                      <li key={i} className="insight-row">
                        <span className="insight-n">{i+1}</span>
                        <span className="insight-body"
                          dangerouslySetInnerHTML={{ __html: ins.replace(
                            /\[Source (\d+)\]/g,
                            '<span style="background:var(--teal-light);color:var(--teal);border-radius:3px;padding:0 5px;font-size:11px;font-weight:700">[Source $1]</span>'
                          )}}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="r-card">
              <div className="r-card-hd">
                <div className="r-card-ico ico-teal">T</div>
                <span className="r-card-title">Clinical Trials</span>
              </div>
              <div className="r-card-bd">
                <TrialsBlock sources={message.sources} rawText={s.trialsText} />
              </div>
            </div>

            {s.summary && (
              <div className="r-card">
                <div className="r-card-hd">
                  <div className="r-card-ico ico-slate">S</div>
                  <span className="r-card-title">Summary</span>
                </div>
                <div className="r-card-bd"><p>{s.summary}</p></div>
              </div>
            )}
          </div>
        ) : (
          <div className="r-card">
            <div className="r-card-bd"><p style={{ whiteSpace:'pre-wrap' }}>{message.content}</p></div>
          </div>
        )}

        {message.sources?.length > 0 && <SourcesPanel sources={message.sources} />}
      </div>
    </div>
  );
};

// ── Trials block ──────────────────────────────────────────────────────────────
const TrialsBlock = ({ sources, rawText }) => {
  const trials = (sources||[]).filter(s=>s.platform==='ClinicalTrials.gov');
  const empty  = trials.length===0&&(!rawText||/no relevant|no active/i.test(rawText));

  if (empty) return (
    <div className="no-trials">
      No active clinical trials found in current results.<br />
      <span style={{ fontSize:12, display:'block', marginTop:6 }}>Try broadening your query or searching for a related treatment.</span>
    </div>
  );

  return (
    <>
      <div className="trials-list">
        {trials.map((t,i)=>{
          const k = t.recruitingStatus==='RECRUITING'?'g':t.recruitingStatus==='COMPLETED'?'gr':'a';
          return (
            <div key={i} className="trial-card">
              <div className="trial-hdr">
                <span className={`sdot sdot-${k}`}/>
                <span className={`s-${k==='g'?'green':k==='gr'?'grey':'amber'}`}>{t.recruitingStatus}</span>
                <span className="trial-yr">{t.year}</span>
              </div>
              <p className="trial-title">{t.title}</p>
              <div className="trial-meta">
                {t.location!=='Location not specified'&&<span>{t.location}</span>}
                {t.contactInfo!=='Contact not listed'&&<span>{t.contactInfo}</span>}
              </div>
              {t.url&&<a href={t.url} target="_blank" rel="noopener noreferrer" className="trial-link">View trial details →</a>}
            </div>
          );
        })}
      </div>
      <div className="loc-note">Showing all trials for your condition. Verify locations before applying.</div>
    </>
  );
};

export default MessageBubble;