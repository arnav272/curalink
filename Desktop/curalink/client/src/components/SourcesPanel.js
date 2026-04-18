import React, { useState, useMemo } from 'react';

const COLORS = {
  'PubMed':             { color:'#ef4444', bg:'#fee2e2' },
  'OpenAlex':           { color:'#3b82f6', bg:'#dbeafe' },
  'ClinicalTrials.gov': { color:'#0d9488', bg:'#ccfbf1' },
};

const getRelevance = (score) => {
  if (score == null) return null;
  if (score >= 60) return { label:'High relevance', color:'#0d9488', bg:'#ccfbf1' };
  if (score >= 30) return { label:'Moderate',       color:'#f59e0b', bg:'#fef3c7' };
  return               { label:'Low relevance',   color:'#94a3b8', bg:'#f1f5f9' };
};

const SourcesPanel = ({ sources }) => {
  const [filter,   setFilter]   = useState('All');
  const [sort,     setSort]     = useState('relevance');
  const [expanded, setExpanded] = useState({});

  const platforms = ['All', ...new Set(sources.map(s=>s.platform))];

  const filtered = useMemo(()=>{
    let list = filter==='All' ? sources : sources.filter(s=>s.platform===filter);
    if (sort==='year')     list = [...list].sort((a,b)=>Number(b.year||0)-Number(a.year||0));
    if (sort==='platform') list = [...list].sort((a,b)=>a.platform.localeCompare(b.platform));
    return list;
  },[sources,filter,sort]);

  return (
    <div className="sources-panel">
      <div className="sp-hdr">
        <div className="sp-title-row">
          <span className="sp-label">Supporting Literature</span>
          <span className="sp-count">{filtered.length}</span>
        </div>
        <select className="sp-sort" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="relevance">Relevance</option>
          <option value="year">Newest first</option>
          <option value="platform">Platform</option>
        </select>
      </div>

      <div className="sp-filters">
        {platforms.map(p=>(
          <button key={p} className={`sp-chip${filter===p?' active':''}`} onClick={()=>setFilter(p)}>
            {p}{p!=='All'&&<span style={{opacity:0.6}}> ({sources.filter(s=>s.platform===p).length})</span>}
          </button>
        ))}
      </div>

      <div className="sp-cards">
        {filtered.map((source,i)=>{
          const orig   = sources.indexOf(source);
          const colors = COLORS[source.platform]||{color:'#0d9488',bg:'#ccfbf1'};
          const rel    = getRelevance(source.score);
          return (
            <div key={i} className="sc-item" style={{ borderLeftColor:colors.color }}>
              <div className="sc-meta">
                <span className="sc-badge" style={{ background:colors.bg, color:colors.color }}>{source.platform}</span>
                <span className="sc-year">{source.year}</span>
                {rel && <span className="sc-rel" style={{ background:rel.bg, color:rel.color }}>{rel.label}</span>}
                {source.recruitingStatus&&source.platform==='ClinicalTrials.gov'&&(
                  <span className="sc-rel" style={{ background:source.recruitingStatus==='RECRUITING'?'#ccfbf1':'#f1f5f9', color:source.recruitingStatus==='RECRUITING'?'#0d9488':'#94a3b8' }}>
                    {source.recruitingStatus}
                  </span>
                )}
                <span className="sc-num">[{orig+1}]</span>
              </div>
              <p className="sc-title" onClick={()=>source.url&&window.open(source.url,'_blank')}>{source.title}</p>
              {source.authors&&source.authors!=='N/A'&&<p className="sc-authors">{source.authors}</p>}
              {source.platform==='ClinicalTrials.gov'&&source.location&&source.location!=='Location not specified'&&(
                <p className="sc-authors">{source.location}</p>
              )}
              {expanded[i]&&<p className="sc-abstract">{source.snippet}</p>}
              <div className="sc-actions">
                <button className="sc-btn" onClick={()=>setExpanded(p=>({...p,[i]:!p[i]}))}>
                  {expanded[i]?'Hide abstract ▲':'Show abstract ▼'}
                </button>
                {source.url&&<a href={source.url} target="_blank" rel="noopener noreferrer" className="sc-link">Open source ↗</a>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SourcesPanel;