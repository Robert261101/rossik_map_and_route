// frontend/src/HistoryPage.js
import React from 'react';

export default function HistoryPage({ user }) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">History Page</h2>
      <p>Welcome, {user?.username || 'guest'}. Here you'll see your saved routes history.</p>
      {/* aici vei pune în viitor tabelul cu istoricul curselor */}
    </div>
  );
}
