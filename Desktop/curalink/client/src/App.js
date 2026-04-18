import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AssistantPage from './pages/AssistantPage';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('curalink-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('curalink-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"    element={<LandingPage   theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="/app" element={<AssistantPage theme={theme} toggleTheme={toggleTheme} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;