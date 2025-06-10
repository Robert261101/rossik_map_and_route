// src/Login.js
import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setErrorMsg('')  // resetăm mesajul de eroare înainte
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorMsg(error.message)
    } else {
      localStorage.setItem('token', data.session.access_token);
      navigate('/')  // onAuthStateChange din App.js îți va actualiza user
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h2 className="text-2xl font-semibold text-center mb-6">Log in to Rossik</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-500"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-500"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {errorMsg && (
            <p className="text-red-500 text-sm text-center">{errorMsg}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}



















// // src/Login.js
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { supabase } from '../lib/supabase';

// export default function Login({ setUser }) {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [errorMsg, setErrorMsg] = useState('');
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setErrorMsg('');

//     const { data, error } = await supabase.auth.signInWithPassword({ email, password });

//     if (error) {
//       setErrorMsg(error.message);
//       return;
//     }

//     sessionStorage.setItem('token', data.session.access_token);
//     setUser(data.user);
//     navigate('/');

//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//       <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
//         <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">
//           Login to Rossik
//         </h2>
//         <form onSubmit={handleLogin} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Email</label>
//             <input
//               className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-500"
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Password</label>
//             <input
//               className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-500"
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//           </div>
//           {errorMsg && (
//             <p className="text-red-500 text-sm text-center">{errorMsg}</p>
//           )}
//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
//           >
//             Login
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

















// // Login.js
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { supabase } from './lib/supabase';

// export default function Login({ setUser }) {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [errorMsg, setErrorMsg] = useState('');
//   const navigate = useNavigate();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await fetch('http://localhost:4000/api/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, password }),
//       });

//       if (!res.ok) throw new Error((await res.json()).message || 'Login failed');
//       const data = await res.json();

//       // 1. Salvează tokenul în sessionStorage
//       sessionStorage.setItem('token', data.token);

//       // 2. Decodează JWT și extrage user info
//       const payload = JSON.parse(atob(data.token.split('.')[1]));
//       setUser({ username: payload.username, role: payload.role });

//       // 3. Redirecționează la pagina principală
//       navigate('/');

//     } catch (err) {
//       setErrorMsg(err.message);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 flex items-center justify-center">
//       <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
//         <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">Log in to Rossik</h2>
//         <form onSubmit={handleLogin} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Username</label>
//             <input
//               className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-500"
//               type="text"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               required
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Password</label>
//             <input
//               className="w-full border p-2 rounded focus:outline-none focus:ring focus:border-blue-500"
//               type="password"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//           </div>
//           {errorMsg && (
//             <p className="text-red-500 text-sm text-center">{errorMsg}</p>
//           )}
//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
//           >
//             Login
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }
