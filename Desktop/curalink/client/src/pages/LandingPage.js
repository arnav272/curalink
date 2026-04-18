import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FeedbackModal from '../components/FeedbackModal';

const CHIPS = [
  'Latest treatments for lung cancer',
  'Clinical trials for diabetes',
  "Alzheimer's disease research",
  'Side effects of immunotherapy',
];

const FAQ_DATA = [
  { q: 'What sources does Curalink use?', a: 'Curalink queries three authoritative databases simultaneously: PubMed (35M+ biomedical papers), OpenAlex (200M+ research works), and ClinicalTrials.gov (545K+ clinical studies). All are publicly available academic databases.' },
  { q: 'How accurate is the information?', a: 'Every claim is backed by a cited source. Our LLM is strictly instructed to only use retrieved sources — if evidence is insufficient, it explicitly says so rather than generating a general answer.' },
  { q: 'Is this a substitute for medical advice?', a: 'No. Curalink is a research tool for exploring medical literature. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.' },
  { q: 'How recent is the data?', a: "Our ranking algorithm prioritizes papers from 2023–2026 with recency scoring. PubMed and OpenAlex are continuously updated, so you'll see the latest published research." },
  { q: 'Can I see the original sources?', a: 'Yes. Every response includes a Supporting Literature panel with clickable cards linking directly to the original paper on PubMed, OpenAlex, or ClinicalTrials.gov.' },
];

const extractDisease = (q) => {
  const patterns = [
    /(?:for|of|about)\s+(.+?)(?:\s+(?:near|in|treatment|research|trial)|$)/i,
    /(?:treatments?|trials?|research|studies)\s+(?:for\s+)?(.+?)(?:\s+(?:near|in)|$)/i,
  ];
  for (const p of patterns) {
    const m = q.match(p);
    if (m?.[1]?.length > 2) return m[1].trim();
  }
  return q.trim();
};

// AirDrop-style pill toggle
const ThemeToggle = ({ theme, toggleTheme }) => (
  <div className="pill-toggle" onClick={toggleTheme}>
    {['Light','Dark'].map(opt => {
      const active = (opt==='Light'&&theme==='light')||(opt==='Dark'&&theme==='dark');
      return <div key={opt} className={`pill-opt${active?' active':''}`}>{opt}</div>;
    })}
  </div>
);

// Scroll reveal hook
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const LandingPage = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [query,        setQuery]        = useState('');
  const [openFaq,      setOpenFaq]      = useState(null);
  const [scrolled,     setScrolled]     = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const faqRef      = useRef(null);
  const feedbackRef = useRef(null);
  const footerRef   = useRef(null);

  useReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const goToApp = useCallback((q) => {
    const text = (q || query).trim();
    if (text) {
      sessionStorage.setItem('cl-query', text);
      sessionStorage.setItem('cl-disease', extractDisease(text));
    }
    navigate('/app');
  }, [query, navigate]);

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="landing" style={{ minHeight:'100vh', height:'auto', overflow:'visible' }}>
      {/* Navbar */}
      <nav className={`landing-nav${scrolled?' scrolled':''}`}>
        <div style={{ display:'flex', alignItems:'center' }}>
          <a href="/" className="nav-brand">
            <div className="nav-logo">C</div>
            <span className="nav-name">Curalink<span>AI</span></span>
          </a>
          <div className="nav-links">
            <button className="nav-link" onClick={() => scrollTo(faqRef)}>FAQs</button>
            <button className="nav-link" onClick={() => scrollTo(feedbackRef)}>Feedback</button>
            <button className="nav-link" onClick={() => scrollTo(footerRef)}>About</button>
          </div>
        </div>
        <div className="nav-right">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          <button className="btn btn-primary btn-sm" onClick={() => goToApp()}>Get Started</button>
        </div>
      </nav>

      {/* Hero — fade in on load */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow reveal visible" style={{ transitionDelay:'0s' }}>
            <span className="hero-pulse" />
            PubMed · OpenAlex · ClinicalTrials.gov
          </div>
          <h1 className="hero-title reveal visible" style={{ transitionDelay:'0.1s' }}>
            <em>Instant evidence</em> from<br />medical literature
          </h1>
          <p className="hero-sub reveal visible" style={{ transitionDelay:'0.2s' }}>
            Ask any medical research question. Get structured, citation-backed answers
            from 200M+ papers and 545K+ clinical trials — no hallucinations.
          </p>

          {/* Search — goes directly to /app, no popup */}
          <div className="hero-search-wrap reveal visible" style={{ transitionDelay:'0.3s' }}>
            <div className="hero-search-box">
              <textarea
                className="hero-search-ta"
                placeholder="Ask about treatments, clinical trials, or recent research..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                rows={2}
                onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); goToApp(); } }}
              />
              <div className="hero-search-foot">
                <span className="hero-search-hint">Press Enter — no account required</span>
                <button className="btn btn-primary btn-sm" onClick={() => goToApp()}>Search literature</button>
              </div>
            </div>
          </div>

          <div className="hero-chips reveal visible" style={{ transitionDelay:'0.4s' }}>
            {CHIPS.map((c,i) => <button key={i} className="hero-chip" onClick={() => goToApp(c)}>{c}</button>)}
          </div>

          <div className="trust-row reveal visible" style={{ transitionDelay:'0.5s' }}>
            <div className="trust-item"><span className="trust-dot" />Zero hallucinations</div>
            <div className="trust-item"><span className="trust-dot" />Real-time data</div>
            <div className="trust-item"><span className="trust-dot" />Inline citations</div>
            <div className="trust-item"><span className="trust-dot" />Open-source LLM</div>
          </div>
        </div>
      </section>

      {/* Data Sources — staggered card reveals */}
      <section className="section sources-section">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">Data Sources</span>
            <h2 className="section-title">Built on authoritative databases</h2>
            <p className="section-sub">All publicly available academic databases — no paywalls, no proprietary data</p>
          </div>
          <div className="sources-grid">
            {[
              { cls:'pm', name:'PubMed', desc:'The gold standard for biomedical literature. Maintained by the National Library of Medicine, covering peer-reviewed journals, clinical studies, and systematic reviews.', why:"The most trusted source for evidence-based medicine — if it's published, it's here.", stat:'35M+ papers', statBg:'#fee2e2', statColor:'#ef4444', delay:'reveal-d1' },
              { cls:'oa', name:'OpenAlex', desc:'A comprehensive open catalog of scholarly works. Covers journals, books, datasets, and preprints across all scientific disciplines with rich metadata.', why:'The widest net for finding relevant research across all disciplines.', stat:'200M+ works', statBg:'#dbeafe', statColor:'#3b82f6', delay:'reveal-d2' },
              { cls:'ct', name:'ClinicalTrials.gov', desc:"The world's largest registry of clinical studies. Find ongoing and completed trials, eligibility criteria, locations, and study coordinator contacts.", why:'Discover real-world studies you may be eligible to participate in.', stat:'545K+ trials', statBg:'#ccfbf1', statColor:'#0d9488', delay:'reveal-d3' },
            ].map((s,i) => (
              <div key={i} className={`source-feat ${s.cls} reveal ${s.delay}`}>
                <div className="sf-name">{s.name}</div>
                <div className="sf-desc">{s.desc}</div>
                <div className="sf-why">{s.why}</div>
                <span className="sf-stat" style={{ background:s.statBg, color:s.statColor }}>{s.stat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">How it works</span>
            <h2 className="section-title">From question to evidence in seconds</h2>
            <p className="section-sub">Three steps — ask, search, synthesize</p>
          </div>
          <div className="steps-row">
            {[
              { n:1, d:'reveal-d1', title:'Ask your question', desc:'Type any medical research question — about a condition, treatment, drug, or trial. Include your location to find geographically relevant studies.' },
              { n:2, d:'reveal-d2', title:'Parallel search',   desc:'We simultaneously query PubMed, OpenAlex, and ClinicalTrials.gov — retrieving 50–300 candidates, ranked by relevance, recency, and credibility.' },
              { n:3, d:'reveal-d3', title:'Structured evidence',desc:'Our AI synthesizes the top results with inline citations. Every claim links to its source. If evidence is insufficient, it says so explicitly.' },
            ].map(s => (
              <div key={s.n} className={`step-item reveal ${s.d}`}>
                <div className="step-circle">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">Why Curalink</span>
            <h2 className="section-title">Built for serious research</h2>
            <p className="section-sub">Everything you need to explore medical literature with confidence</p>
          </div>
          <div className="features-grid">
            {[
              { d:'reveal-d1', check:'Guaranteed',    name:'Zero Hallucinations',   desc:"Uses only retrieved sources. If evidence is insufficient, it says so — never fabricates." },
              { d:'reveal-d2', check:'Always fresh',  name:'Real-time Data',        desc:'Live API queries. Recency scoring prioritizes 2024–2026 publications automatically.' },
              { d:'reveal-d3', check:'Three sources', name:'Multi-Source Fusion',   desc:'PubMed, OpenAlex, and ClinicalTrials.gov queried in parallel and intelligently merged.' },
              { d:'reveal-d4', check:'Every claim',   name:'Inline Citations',      desc:'Click any [Source N] to expand the abstract and jump to the original paper.' },
              { d:'reveal-d5', check:'Follow-up ready', name:'Conversation Memory', desc:'Remembers disease context across the conversation for deep follow-up research.' },
              { d:'reveal-d6', check:'Trial discovery', name:'Clinical Trial Search',desc:'Find ongoing and completed trials with eligibility criteria and coordinator contacts.' },
            ].map((f,i) => (
              <div key={i} className={`feat-item reveal ${f.d}`}>
                <span className="feat-check">✓ {f.check}</span>
                <div className="feat-name">{f.name}</div>
                <p className="feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example mockup */}
      <section className="section">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">Example output</span>
            <h2 className="section-title">What a response looks like</h2>
            <p className="section-sub">Structured sections with numbered insights and clickable citations</p>
          </div>
          <div className="mockup-wrap reveal">
            <div className="mockup-bar">
              <div className="m-dot" style={{background:'#ef4444'}} /><div className="m-dot" style={{background:'#f59e0b'}} /><div className="m-dot" style={{background:'#10b981'}} />
              <span className="m-label">CuralinkAI — Lung Cancer Research</span>
            </div>
            <div className="mockup-body">
              <div className="m-sec">
                <div className="m-sec-title">Condition Overview</div>
                <p className="m-p">Lung cancer is the leading cause of cancer-related mortality globally. Recent advances in neoadjuvant immunotherapy have significantly improved surgical outcomes for early-stage patients.</p>
              </div>
              <div className="m-sec">
                <div className="m-sec-title">Research Insights</div>
                {[['Neoadjuvant immunotherapy','has demonstrated improved surgical resectability and long-term survival for early-stage NSCLC.',1],['Perioperative immunotherapy programs','combining neoadjuvant and adjuvant phases show reduced recurrence rates.',2],['Spatial omics technologies','introduce novel approaches to analyzing tumor heterogeneity and drug resistance.',3]].map(([b,r,n])=>(
                  <div key={n} className="m-row"><div className="m-n">{n}</div><p className="m-t"><strong>{b}</strong> {r} <span className="m-cite">[Source {n}]</span></p></div>
                ))}
              </div>
              <div className="m-sec">
                <div className="m-sec-title">Clinical Trials</div>
                <div style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:8,padding:'12px 14px',display:'flex',gap:10,alignItems:'flex-start'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:'#10b981',flexShrink:0,marginTop:4}}/>
                  <div>
                    <div style={{fontSize:12,color:'#10b981',fontWeight:600,marginBottom:4}}>RECRUITING · 2025</div>
                    <div style={{fontSize:13,color:'var(--text-primary)'}}>Phase II Trial: Neoadjuvant Pembrolizumab in Resectable NSCLC</div>
                    <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>Boston, USA · Dr. Sarah Chen, MD</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" ref={faqRef} id="faq">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">FAQ</span>
            <h2 className="section-title">Common questions</h2>
          </div>
          <div className="faq-list reveal">
            {FAQ_DATA.map((item,i)=>(
              <div key={i} className="faq-item">
                <button className="faq-btn" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                  <span>{item.q}</span>
                  <span className={`faq-chevron${openFaq===i?' open':''}`}>▾</span>
                </button>
                {openFaq===i&&<div className="faq-ans">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feedback section — button opens modal directly, no login popup */}
      <section className="section" ref={feedbackRef} id="feedback" style={{background:'var(--bg-secondary)',borderTop:'1px solid var(--border)'}}>
        <div className="container">
          <div className="section-header reveal" style={{marginBottom:0}}>
            <span className="section-kicker">Feedback</span>
            <h2 className="section-title">Help us improve</h2>
            <p className="section-sub" style={{marginBottom:32}}>Share your thoughts on Curalink directly — no account required.</p>
            {/* Opens feedback modal on landing page, no navigation */}
            <button className="btn btn-primary" onClick={() => setShowFeedback(true)}>
              Share feedback
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-sec reveal">
        <div className="container" style={{textAlign:'center'}}>
          <h2 className="cta-title">Start researching now</h2>
          <p className="cta-sub">Free to use · No account required · Open-source LLM</p>
          <button className="cta-btn" onClick={() => goToApp()}>Open Research Assistant</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer" ref={footerRef} id="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-logo">C</div>
            <span className="footer-name">CuralinkAI</span>
          </div>
          <p className="footer-disc">For research purposes only. Not a substitute for professional medical advice, diagnosis, or treatment.</p>
          <div className="footer-links">
            <button className="footer-link" onClick={() => scrollTo(faqRef)}>FAQs</button>
            <button className="footer-link" onClick={() => goToApp()}>Assistant</button>
            <a href="#" className="footer-link">Privacy</a>
          </div>
          <span className="footer-copy">© 2026 CuralinkAI</span>
        </div>
      </footer>

      {/* Feedback modal — renders on landing page, no /app needed */}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} lastQuery="" />}
    </div>
  );
};

export default LandingPage;