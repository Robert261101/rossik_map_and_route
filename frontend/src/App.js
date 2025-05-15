import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import MainPage from './MainPage';
import HistoryPage from './HistoryPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // load token once on mount
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.username, role: payload.role });
      } catch {
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  if (loading) return null; // or a spinner

  return (
    <Router>
      <Routes>
        {/* 1) Public login route */}
        <Route path="/login" element={<Login setUser={setUser} />} />

        {/* 2) Protected app routes */}
        <Route
          path="/"
          element={
            user
              ? <MainPage user={user}/>
              : <Navigate to="/login" replace/>
          }
        />
        <Route
          path="/history"
          element={
            user
              ? <HistoryPage user={user}/>
              : <Navigate to="/login" replace/>
          }
        />

        {/* 3) Catch‑all: if no route matched, redirect appropriately */}
        <Route
          path="*"
          element={
            user
              ? <Navigate to="/" replace/>
              : <Navigate to="/login" replace/>
          }
        />
      </Routes>
    </Router>
  );
}
export default App;
