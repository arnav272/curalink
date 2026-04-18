import { useState, useCallback } from 'react';

const KEY = 'curalink-sessions';
const MAX = 8;

const ago = (ts) => {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const useRecentSearches = () => {
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  });

  // Only call for the VERY FIRST query of a session — never for follow-ups
  const registerSession = useCallback((sessionId, firstQuery, disease, location) => {
    setSessions(prev => {
      if (prev.find(s => s.sessionId === sessionId)) return prev; // already registered
      const entry = { sessionId, firstQuery, disease, location, timestamp: Date.now() };
      const updated = [entry, ...prev].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  return {
    sessions: sessions.map(s => ({ ...s, timeAgo: ago(s.timestamp) })),
    registerSession,
    clearSessions,
  };
};