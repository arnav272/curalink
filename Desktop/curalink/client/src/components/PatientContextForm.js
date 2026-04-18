import React, { useState } from 'react';

const PatientContextForm = ({ onSubmit, onBack, theme, toggleTheme }) => {
  const [form,   setForm]   = useState({ name: '', disease: '', location: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.disease.trim())  e.disease  = 'Please enter a condition or disease';
    if (!form.location.trim()) e.location = 'Location helps us find relevant clinical trials';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit(form);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', fontFamily:'var(--font-sans)' }}>
      {/* Nav */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 32px', height:54, background:'var(--bg-card)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <div style={{ width:28, height:28, borderRadius:7, background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color:'white', fontWeight:800 }}>C</div>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.03em' }}>Curalink<span style={{ color:'var(--teal)' }}>AI</span></span>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <div className="pill-toggle" onClick={toggleTheme}>
            <div className={`pill-opt${theme === 'light' ? ' active' : ''}`}>Light</div>
            <div className={`pill-opt${theme === 'dark'  ? ' active' : ''}`}>Dark</div>
          </div>
          {onBack && <button className="btn btn-ghost btn-sm" onClick={onBack}>← Home</button>}
        </div>
      </nav>

      {/* Form */}
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
        <div style={{ width:'100%', maxWidth:460, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:'40px 36px', boxShadow:'var(--shadow-lg)' }}>
          <div style={{ textAlign:'center', marginBottom:32 }}>
            <div style={{ fontFamily:'var(--font-serif)', fontSize:24, fontWeight:600, color:'var(--text-primary)', marginBottom:8, letterSpacing:'-0.02em' }}>Set your research context</div>
            <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.6 }}>We use this to personalize results and find relevant clinical trials</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <Field label="Your name" placeholder="Optional" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            <Field label="Disease or condition" placeholder="e.g. Parkinson's disease, lung cancer" value={form.disease} onChange={v => { setForm({...form,disease:v}); if(errors.disease) setErrors({...errors,disease:''}); }} error={errors.disease} required />
            <Field label="Your location" placeholder="e.g. Toronto, Canada" value={form.location} onChange={v => { setForm({...form,location:v}); if(errors.location) setErrors({...errors,location:''}); }} error={errors.location} required hint="Used to find relevant clinical trials" />
            <button type="submit" className="btn btn-primary" style={{ marginTop:8, justifyContent:'center', fontSize:15 }}>
              Start Research Session
            </button>
          </form>

          <p style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', marginTop:24 }}>
            For research purposes only · Not a substitute for medical advice
          </p>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, placeholder, value, onChange, error, required, hint }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    <label style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', display:'flex', gap:4, alignItems:'center', textTransform:'uppercase', letterSpacing:'0.05em' }}>
      {label}
      {!required && <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:400, textTransform:'none' }}>(optional)</span>}
    </label>
    <input
      style={{ background:'var(--bg-secondary)', border:`1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius:8, padding:'11px 14px', color:'var(--text-primary)', fontSize:15, outline:'none', fontFamily:'var(--font-sans)', width:'100%', transition:'border-color 0.15s' }}
      placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={e => { if(!error) e.target.style.borderColor='var(--teal)'; }}
      onBlur={e =>  { if(!error) e.target.style.borderColor='var(--border)'; }}
    />
    {hint  && !error && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{hint}</span>}
    {error && <span style={{ fontSize:12, color:'var(--red)' }}>{error}</span>}
  </div>
);

export default PatientContextForm;