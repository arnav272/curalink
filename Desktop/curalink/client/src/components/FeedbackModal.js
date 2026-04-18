import React, { useState } from 'react';

const FeedbackModal = ({ onClose, lastQuery }) => {
  const [rating, setRating]   = useState(null);
  const [text,   setText]     = useState('');
  const [query,  setQuery]    = useState(lastQuery);
  const [done,   setDone]     = useState(false);

  const submit = () => {
    console.log('Feedback:', { rating, text, query, ts: new Date() });
    setDone(true);
    setTimeout(onClose, 1600);
  };

  const RATINGS = ['😞','😐','🙂','🤩'];

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box">
        {done ? (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ fontSize:40, marginBottom:14 }}>✓</div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>Thank you for your feedback</div>
          </div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:5 }}>
              <div className="modal-title">Help improve Curalink</div>
              <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'var(--text-muted)', lineHeight:1 }}>×</button>
            </div>
            <p className="modal-sub">Your feedback helps us build better research tools</p>

            <label className="modal-label">Was this response helpful?</label>
            <div className="emoji-row">
              {RATINGS.map((e,i)=>(
                <button key={i} className={`emoji-btn${rating===i?' active':''}`} onClick={()=>setRating(i)}>{e}</button>
              ))}
            </div>

            <label className="modal-label">What could be better?</label>
            <textarea className="modal-ta" rows={3} placeholder="Optional feedback..." value={text} onChange={e=>setText(e.target.value)} />

            <label className="modal-label">Query researched</label>
            <input
              style={{ width:'100%', background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8, padding:'9px 12px', marginBottom:18, fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-primary)', outline:'none' }}
              value={query} onChange={e=>setQuery(e.target.value)}
            />

            <div className="modal-foot">
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={submit}>Submit</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;