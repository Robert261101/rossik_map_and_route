import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import MainPage from './MainPage';
import HistoryPage from './HistoryPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. setează token-ul în supabase client
  useEffect(() => {
    const token = sessionStorage.getItem('sb_token');
    if (token) {
      supabase.auth.setAuth(token);
    }
  }, []);

  // 2. ascultă schimbări de auth & aduce user curent
  useEffect(() => {
    // curent la reload
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // pe viitor, dacă fresh login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Routes>
        
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/"
          element={user ? <MainPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={user ? <HistoryPage /> : <Navigate to="/login" />}
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
