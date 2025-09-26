// src/components/RouteDetailsModal.js
import React from 'react';
import { formatNum } from '../utils/number';

export default function RouteDetailsModal({ route, days, extraCost, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* card */}
      <div
        className="
          relative w-[92vw] max-w-xl
          bg-white/90 dark:bg-neutral-900/80
          border border-gray-200 dark:border-neutral-700
          shadow-2xl rounded-2xl p-6
          text-gray-900 dark:text-gray-100
          max-h-[80vh] overflow-y-auto
        "
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="
            absolute top-4 right-4
            inline-flex items-center justify-center
            h-8 w-8 rounded-full
            text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-neutral-800
            focus:outline-none focus:ring-2 focus:ring-red-500/60
          "
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-4">Route Details</h2>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="font-semibold mb-2">Addresses</h3>
            <ol className="list-decimal list-inside space-y-1">
              {route.addresses.map((a, i) => (
                <li key={i}>{a.label}</li>
              ))}
            </ol>
          </section>

          {route.tolls?.length > 0 && (
            <section>
              <h3 className="font-semibold mb-2">All Fees</h3>
              <ul className="list-disc list-inside space-y-1 dark:text-gray-800">
                {route.tolls.map((t, i) => (
                  <li key={i}>
                    {t.name} ({t.country}): €{formatNum(t.cost)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {route.pricePerDay != null && (
            <section>
              <h3 className="font-semibold mb-2">Extra costs</h3>
              <ul className="list-disc list-inside space-y-1 dark:text-gray-800">
                <li>
                  €{formatNum(route.pricePerDay)} / day × {days} days = €
                  {formatNum(extraCost)}
                </li>
              </ul>
            </section>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-full
              bg-red-600 hover:bg-red-700
              text-white font-medium shadow
              focus:outline-none focus:ring-2 focus:ring-red-400/60
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
