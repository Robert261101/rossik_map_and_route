// src/ForgotPassword.js
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import RossikLogo from '../VektorLogo_Rossik_rot.gif';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('Sending reset link… ⏳');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    if (error) {
      setErrorMsg(error.message);
      setStatusMsg('');
    } else {
      setStatusMsg('✅ Check your inbox for the reset link!');
    }
  };

  return (
    <div
      className="
        min-h-screen flex items-center justify-center
        bg-gradient-to-br from-red-600 via-white to-gray-300
        dark:from-gray-800 dark:via-gray-900 dark:to-black
        transition-colors
      "
    >
      <div className="fixed top-0 right-0 px-6 py-5">
        <img src={RossikLogo} alt="Rossik Logo" className="h-16 object-contain" />
      </div>

      <div
        className="
          w-full max-w-md
          bg-white/90 dark:bg-gray-800/80
          border border-gray-200 dark:border-gray-700
          backdrop-blur-md shadow-xl rounded-2xl px-8 py-10
        "
      >
        <h2 className="text-5xl font-bold text-center mb-6 text-gray-800 dark:text-white">
          Forgot Password
        </h2>

        <form onSubmit={handleRequestReset} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="
                w-full px-4 py-2 rounded-lg
                border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-700
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-red-600
              "
            />
          </div>

          {statusMsg && (
            <div
              className="
                text-sm text-green-800 dark:text-green-200
                bg-green-100 dark:bg-green-900/40
                border border-green-300 dark:border-green-800
                rounded p-2 text-center
              "
            >
              {statusMsg}
            </div>
          )}

          {errorMsg && (
            <div
              className="
                text-sm text-red-700 dark:text-red-200
                bg-red-100 dark:bg-red-900/40
                border border-red-300 dark:border-red-800
                rounded p-2 text-center
              "
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="
              w-full py-2 px-4 rounded-lg font-semibold shadow transition
              bg-red-600 hover:bg-red-700 text-white
              focus:outline-none focus:ring-2 focus:ring-red-400/60
            "
          >
            Send Reset Link
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            Remembered it?{' '}
            <a
              href="/login"
              className="text-red-600 dark:text-red-400 hover:underline"
            >
              Back to login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
