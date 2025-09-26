import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import RossikLogo from '../VektorLogo_Rossik_rot.gif';

export default function ResetPasswordPage() {
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [sessionValid, setSessionValid] = useState(false);
  const navigate = useNavigate();

  const spriteUrl = `${process.env.PUBLIC_URL}/show-password-icon.png`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) setErrorMsg('Invalid or expired link.');
      else setSessionValid(true);
    });
  }, []);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setOkMsg('');
    if (newPwd !== confirmPwd) {
      setErrorMsg("Passwords don't match");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) {
      setErrorMsg(error.message || 'Failed to update password.');
    } else {
      setOkMsg('✅ Password updated. Redirecting to login…');
      setTimeout(() => navigate('/login'), 900);
    }
  };

  const canSubmit = sessionValid && newPwd.length > 0 && confirmPwd.length > 0 && newPwd === confirmPwd;

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
          Set New Password
        </h2>

        {okMsg && (
          <div className="mb-4 text-sm text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-800 rounded p-2 text-center">
            {okMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 text-sm text-red-700 dark:text-red-200 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 rounded p-2 text-center">
            {errorMsg}
          </div>
        )}

        {sessionValid ? (
          <form onSubmit={handleSetPassword} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="
                    w-full px-4 py-2 pr-10 rounded-lg
                    border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-700
                    text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-red-600
                  "
                />
                <span
                  role="button"
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute top-1/2 right-3 w-6 h-6 bg-no-repeat bg-[length:48px_24px] cursor-pointer select-none"
                  style={{
                    backgroundImage: `url("${spriteUrl}")`,
                    backgroundPosition: showNew ? '-24px 0' : '0 0',
                    transform: 'translateY(-50%)',
                  }}
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="
                    w-full px-4 py-2 pr-10 rounded-lg
                    border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-700
                    text-gray-900 dark:text-white
                    placeholder-gray-400 dark:placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-red-600
                  "
                />
                <span
                  role="button"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute top-1/2 right-3 w-6 h-6 bg-no-repeat bg-[length:48px_24px] cursor-pointer select-none"
                  style={{
                    backgroundImage: `url("${spriteUrl}")`,
                    backgroundPosition: showConfirm ? '-24px 0' : '0 0',
                    transform: 'translateY(-50%)',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="
                w-full py-2 px-4 rounded-lg font-semibold shadow transition
                bg-red-600 hover:bg-red-700 text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-red-400/60
              "
            >
              Change Password
            </button>
          </form>
        ) : (
          <p className="text-center text-gray-600 dark:text-gray-300">
            Please click the link in your email to set a new password.
          </p>
        )}
      </div>
    </div>
  );
}
