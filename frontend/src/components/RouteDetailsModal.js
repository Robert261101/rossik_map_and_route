// src/components/RouteDetailsModal.js
import React from 'react';
import { formatNum } from '../utils/number';

export default function RouteDetailsModal({ route, days, extraCost, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        <h2 className="text-xl font-semibold mb-4">Route Details</h2>

        <div className="space-y-3 text-sm">
          <div>
            <strong>Addresses:</strong>
            <ol className="list-decimal list-inside">
              {route.addresses.map((a,i) => (
                <li key={i}>{a.label}</li>
              ))}
            </ol>
          </div>

          {route.tolls?.length > 0 && (
            <div>
              <strong>All Fees:</strong>
              <ul className="list-disc list-inside">
                {route.tolls.map((t,i) => (
                  <li key={i}>
                    {t.name} ({t.country}): €{formatNum(t.cost)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {route.pricePerDay != null && (
            <div>
              <strong>Extra costs:</strong>
              <ul className="list-disc list-inside">
                <li>
                  €{formatNum(route.pricePerDay)} /day × {days} days = €{formatNum(extraCost)}
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
