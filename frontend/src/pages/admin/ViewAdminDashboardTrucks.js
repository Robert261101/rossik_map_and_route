// src/pages/admin/ViewAdminDashboardTrucks.js
import React from 'react';
import { supabase } from '../../lib/supabase';

export default function ViewAdminDashboardTrucks({ trucks, onClose, onRefresh }) {
  // Handler to edit Euro/km
  const handleEdit = async (truck) => {
    const raw = prompt(
      `Enter new Euro/km for ${truck.plate}:`,
      truck.euroPerKm != null ? truck.euroPerKm : ''
    );
    if (raw === null) return; // user cancelled
    const parsed = parseFloat(raw.trim().replace(',', '.'));
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
      // Refresh the truck list in the parent
      onRefresh();
    }
  };

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
                  <td className="p-2">{t.team_name || '—'}</td>
                  <td className="p-2">
                    {typeof t.euroPerKm === 'number' ? t.euroPerKm.toFixed(2) : '—'}
                  </td>
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