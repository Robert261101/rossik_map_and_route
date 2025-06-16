import React from 'react';

export default function ViewAdminDashboardTrucks({ trucks, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        {/* Buton închidere */}
        <button
            onClick={onClose}
            className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white-700 hover:text-white hover:bg-red-700 hover:scale-150 hover:border-white/10 transition-all duration-300 shadow-lg"
            aria-label="Close modal"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
          Truck List
        </h2>
        <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
            <thead className="text-sm uppercase text-gray-900 dark:text-gray-300">
                <tr>
                    <th>Plate Number</th>
                    <th>Team</th>
                    {/*<th>Cotație</th>*/}
                </tr>
            </thead>
            <tbody>
                {trucks.map(truck => (
                <tr key={truck.id} className="odd:bg-gray-100 even:bg-white border-b dark:odd:bg-gray-700 dark:even:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <td className="p-2">{truck.plate}</td>
                    <td className="p-2">{truck.team_name || '—'}</td>
                    {/*<td className="p-2 italic text-gray-400">-</td> {/* Placeholder pentru viitor */}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
