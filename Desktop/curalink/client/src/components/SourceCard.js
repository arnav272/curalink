import React, { useState } from 'react';

const SourceCard = ({ source, index }) => {
  const [expanded, setExpanded] = useState(false);

  const platformColor = {
    'PubMed': '#ef4444',
    'OpenAlex': '#3b82f6',
    'ClinicalTrials.gov': '#10b981',
  };

  const color = platformColor[source.platform] || '#6366f1';
  const isTrial = source.platform === 'ClinicalTrials.gov';

  return (
    <div style={{ ...styles.card, borderLeftColor: color }}>
      <div style={styles.header}>
        <span style={{ ...styles.badge, background: color + '22', color }}>
          {source.platform}
        </span>
        <span style={styles.year}>{source.year}</span>
        {isTrial && source.recruitingStatus && (
          <span style={{
            ...styles.badge,
            background: source.recruitingStatus === 'RECRUITING' ? '#10b98122' : '#94a3b822',
            color: source.recruitingStatus === 'RECRUITING' ? '#10b981' : '#94a3b8',
          }}>
            {source.recruitingStatus}
          </span>
        )}
      </div>

      <p style={styles.title}>
        <span style={styles.sourceNum}>[{index + 1}]</span> {source.title}
      </p>

      {source.authors && source.authors !== 'N/A' && (
        <p style={styles.authors}>{source.authors}</p>
      )}

      {isTrial && source.location && (
        <p style={styles.meta}>📍 {source.location}</p>
      )}
      {isTrial && source.contactInfo && source.contactInfo !== 'Contact not listed' && (
        <p style={styles.meta}>📞 {source.contactInfo}</p>
      )}

      {expanded && (
        <p style={styles.snippet}>{source.snippet}</p>
      )}

      <div style={styles.footer}>
        <button
          style={styles.toggleBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide abstract ▲' : 'Show abstract ▼'}
        </button>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.link}
          >
            View source →
          </a>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    background: '#0f1117',
    border: '1px solid #2d3148',
    borderLeft: '3px solid',
    borderRadius: '8px',
    padding: '14px',
    marginBottom: '10px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  badge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    letterSpacing: '0.03em',
  },
  year: {
    fontSize: '12px',
    color: '#64748b',
  },
  sourceNum: {
    color: '#6366f1',
    fontWeight: '700',
    marginRight: '4px',
  },
  title: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    marginBottom: '4px',
  },
  authors: {
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
  },
  meta: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '2px',
  },
  snippet: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: '1.6',
    marginTop: '10px',
    padding: '10px',
    background: '#1a1d27',
    borderRadius: '6px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '10px',
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '0',
  },
  link: {
    color: '#6366f1',
    fontSize: '12px',
    textDecoration: 'none',
  },
};

export default SourceCard;