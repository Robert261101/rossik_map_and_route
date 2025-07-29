// src/Login.js
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import RossikLogo from '../VektorLogo_Rossik_rot.gif'; 


export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const spriteUrl = `${process.env.PUBLIC_URL}/show-password-icon.png`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
    } else {
      localStorage.setItem('token', data.session.access_token);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 via-white to-gray-300 dark:from-gray-800 dark:via-gray-900 dark:to-black transition-colors">
      <div className="fixed top-0 right-0 px-6 py-5">
        <img
          src={RossikLogo}
          alt="Rossik Logo"
          className="h-16 object-contain"
        />
      </div>

      <div className="w-full max-w-md bg-white/90 dark:bg-gray-800/80 backdrop-blur-md shadow-xl rounded-2xl px-8 py-10">
        <h2 className="text-5xl font-bold text-center mb-6 text-gray-800 dark:text-white">Login</h2>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <input
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <span
                role="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(show => !show)}
                className="absolute top-1/2 right-3 w-6 h-6 bg-no-repeat bg-[length:48px_24px] cursor-pointer select-none"
                style={{
                  backgroundImage: `url("${spriteUrl}")`,
                  backgroundPosition: showPassword ? '-24px 0' : '0 0',
                  transform: 'translateY(-50%)'
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-100 border border-red-300 rounded p-2 text-center">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-between items-center mb-10">
            <button
                type="button"
                className="text-blue-600 underline text-sm font-medium  "
                onClick={() => navigate('/forgot-password')}
            >
                Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
