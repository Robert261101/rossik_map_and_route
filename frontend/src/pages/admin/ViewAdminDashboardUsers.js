import React from 'react';

export default function ViewAdminDashboardUsers({ users, onClose }) {
  const formatName = (email = '') => {
    if (!email || !email.includes('@')) return 'Fără Nume';
    const local = email.split('@')[0];
    const parts = local.split('.');
    return parts.map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ');
  };

  React.useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    // lock scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop click closes
      }}
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-gray-700 dark:text-white hover:text-white hover:bg-red-700 hover:scale-150 hover:border-white/10 transition-all duration-300 shadow-lg"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
          Users
        </h2>

        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-sm uppercase text-gray-900 dark:text-gray-300">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Team</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr
                  key={user.id}
                  className="odd:bg-gray-100 even:bg-white border-b dark:odd:bg-gray-700 dark:even:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <td className="p-2">{formatName(user.email)}</td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2">{user.team_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
