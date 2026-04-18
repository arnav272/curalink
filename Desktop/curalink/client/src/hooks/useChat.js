import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const useChat = (sessionId, patientContext) => {
  const [messages,  setMessages]  = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const cancelRef = useRef(null);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isLoading) return;

    // Append user message immediately
    setMessages(prev => [...prev, {
      id:        Date.now(),
      role:      'user',
      content:   text,
      timestamp: new Date(),
    }]);
    setIsLoading(true);
    setError(null);

    cancelRef.current = axios.CancelToken.source();

    try {
      const response = await axios.post(
        `${API_BASE}/api/chat/query`,
        { message: text, sessionId, patientContext },
        { cancelToken: cancelRef.current.token, timeout: 180000 }
      );

      setMessages(prev => [...prev, {
        id:        Date.now() + 1,
        role:      'assistant',
        content:   response.data.answer,
        sources:   response.data.sources || [],
        timestamp: new Date(),
      }]);
    } catch (err) {
      if (axios.isCancel(err)) {
        // Remove the optimistic user message
        setMessages(prev => prev.slice(0, -1));
      } else {
        setError('Failed to get response. Please try again.');
        console.error('Chat error:', err);
      }
    } finally {
      setIsLoading(false);
      cancelRef.current = null;
    }
  }, [sessionId, patientContext, isLoading]);

  const cancelRequest = useCallback(() => {
    cancelRef.current?.cancel('User cancelled');
  }, []);

  // Load history from backend for a session
  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/chat/history/${sessionId}`);
      if (res.data.messages?.length > 0) {
        setMessages(res.data.messages.map((m, i) => ({
          id:        i,
          role:      m.role,
          content:   m.content,
          sources:   m.sources || [],
          timestamp: m.timestamp,
        })));
      }
    } catch (e) {
      console.error('Load history error:', e);
    }
  }, [sessionId]);

  return { messages, isLoading, error, sendMessage, cancelRequest, loadHistory, setMessages };
};