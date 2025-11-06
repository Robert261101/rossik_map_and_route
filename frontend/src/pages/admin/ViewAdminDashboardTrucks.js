import React from 'react';
import { supabase } from '../../lib/supabase';

export default function ViewAdminDashboardTrucks({ trucks, onClose, onRefresh }) {
  const hasPricePerDay = trucks.some(t => t.pricePerDay != null);

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

  // Handler to edit Euro/km
  const handleEdit = async (truck) => {
    const raw = prompt(
      `Enter new Euro/km for ${truck.plate}:`,
      truck.euroPerKm != null ? truck.euroPerKm : ''
    );
    if (raw === null) return; // user cancelled

    const input = raw.trim().replace(',', '.');
    const parsed = input === '' ? 0.1 : parseFloat(input);

    if (isNaN(parsed)) {
      alert('Invalid number, please enter a numeric value.');
      return;
    }
    const { error } = await supabase
      .from('trucks')
      .update({ euro_per_km: parsed })
      .eq('id', truck.id);
    if (error) {
      alert('Update failed: ' + error.message);
    } else {
      onRefresh();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop click closes
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg w-full max-w-3xl relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-gray-700 dark:text-white hover:text-white hover:bg-red-700 hover:scale-150 hover:border-white/10 transition-all duration-300 shadow-lg"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Truck List</h2>

        <div className="overflow-y-auto max-h-[70vh]">
          <table className="w-full text-left border-collapse">
            <thead className="uppercase text-sm">
              <tr>
                <th className="p-2 border-b">Plate Number</th>
                <th className="p-2 border-b">Team</th>
                <th className="p-2 border-b">Euro/km</th>
                {hasPricePerDay && <th className="p-2 border-b">Price/Day</th>}
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map(t => (
                <tr
                  key={t.id}
                  className="odd:bg-gray-100 even:bg-white dark:odd:bg-gray-700 dark:even:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <td className="p-2">{t.plate}</td>
                  <td className="p-2">{t.team_name || '—'}</td>
                  <td className="p-2">
                    {typeof t.euroPerKm === 'number' ? t.euroPerKm.toFixed(2) : '—'}
                  </td>
                  {hasPricePerDay && (
                    <td className="p-2">
                      {typeof t.pricePerDay === 'number' ? t.pricePerDay.toFixed(2) : '—'}
                    </td>
                  )}
                  <td className="p-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                    >
                      Edit
                    </button>
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
