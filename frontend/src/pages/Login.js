// src/Login.js
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

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
        <div className="flex items-center">
          <span className="font-bold text-4xl tracking-tight text-gray-800 dark:text-white">
            Rossik Route Calculation
          </span>
        </div>
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
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
            <input
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-100 border border-red-300 rounded p-2 text-center">
              {errorMsg}
            </div>
          )}

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
