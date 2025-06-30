// src/ResetPassword.js
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import RossikLogo from '../VektorLogo_Rossik_rot.gif'

export default function ResetPasswordPage() {
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [sessionValid, setSessionValid] = useState(false)
  const navigate = useNavigate()

  // sprite in /public
  const spriteUrl = `${process.env.PUBLIC_URL}/show-password-icon-privacy-icon-abstract-eye-black-icons-isolated-white-background_781227-401.jpg`

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) setErrorMsg('Invalid or expired link.')
      else setSessionValid(true)
    })
  }, [])

  const handleSetPassword = async e => {
    e.preventDefault()
    setErrorMsg('')
    if (newPwd !== confirmPwd) {
      setErrorMsg("Passwords don't match")
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPwd })
    if (error) setErrorMsg(error.message)
    else navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gradient-to-br from-red-600 via-white to-gray-300
                    dark:from-gray-800 dark:via-gray-900 dark:to-black
                    transition-colors">
      <div className="fixed top-0 right-0 px-6 py-5">
        <img src={RossikLogo} alt="Rossik Logo" className="h-16 object-contain" />
      </div>
      <div className="w-full max-w-md bg-white/90 dark:bg-gray-800/80
                      backdrop-blur-md shadow-xl rounded-2xl px-8 py-10">
        <h2 className="text-5xl font-bold text-center mb-6
                       text-gray-800 dark:text-white">
          Set New Password
        </h2>

        {errorMsg && (
          <div className="text-sm text-red-600 bg-red-100
                          border border-red-300 rounded p-2 text-center mb-4">
            {errorMsg}
          </div>
        )}

        {sessionValid ? (
          <form onSubmit={handleSetPassword} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium mb-1
                                text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300
                             dark:border-gray-600 rounded-lg bg-white
                             dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <span
                  role="button"
                  aria-label={showNew ? 'Hide new password' : 'Show new password'}
                  onClick={() => setShowNew(s => !s)}
                  className="absolute top-1/2 right-3 w-6 h-6 bg-no-repeat
                             bg-[length:48px_24px] cursor-pointer select-none"
                  style={{
                    backgroundImage: `url("${spriteUrl}")`,
                    backgroundPosition: showNew ? '-24px 0' : '0 0',
                    transform: 'translateY(-50%)'
                  }}
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium mb-1
                                text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300
                             dark:border-gray-600 rounded-lg bg-white
                             dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <span
                  role="button"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute top-1/2 right-3 w-6 h-6 bg-no-repeat
                             bg-[length:48px_24px] cursor-pointer select-none"
                  style={{
                    backgroundImage: `url("${spriteUrl}")`,
                    backgroundPosition: showConfirm ? '-24px 0' : '0 0',
                    transform: 'translateY(-50%)'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700
                         text-white font-semibold rounded-lg shadow transition"
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
  )
}
