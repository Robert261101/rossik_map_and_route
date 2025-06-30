import React from 'react';

export default function ViewAdminDashboardTrucks({ trucks, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg w-full max-w-3xl relative">
        <button onClick={onClose}
                className="absolute top-4 right-4 text-white bg-red-600 rounded-full p-2 hover:scale-110 transition">
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">Truck List</h2>
        <div className="overflow-y-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead className="uppercase text-sm">
              <tr>
                <th className="p-2 border-b">Plate Number</th>
                <th className="p-2 border-b">Team</th>
                <th className="p-2 border-b">Euro/km</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map(t => (
                <tr key={t.id}
                    className="odd:bg-gray-100 even:bg-white dark:odd:bg-gray-700 dark:even:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                  <td className="p-2">{t.plate}</td>
                  <td className="p-2">{t.team_name}</td>
                  <td className="p-2">
                    {typeof t.euroPerKm === 'number' ? t.euroPerKm.toFixed(2) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}