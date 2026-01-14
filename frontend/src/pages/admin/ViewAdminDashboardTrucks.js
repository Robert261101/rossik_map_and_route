import React from "react";
import { supabase } from "../../lib/supabase";

export default function ViewAdminDashboardTrucks({ trucks, onClose, onRefresh }) {
  const euroKm = (t) => (t?.euroPerKm ?? t?.euro_per_km ?? null);
  const priceDay = (t) => (t?.pricePerDay ?? t?.price_per_day ?? null);

  const hasPricePerDay = (trucks || []).some((t) => priceDay(t) != null);


  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const promptNumber = (label, current, { emptyMeans = null } = {}) => {
    const raw = prompt(label, current != null ? String(current) : "");
    if (raw === null) return { cancelled: true };

    const input = raw.trim().replace(",", ".");
    if (input === "") {
      return { cancelled: false, value: emptyMeans };
    }

    const n = Number(input);
    if (!Number.isFinite(n)) return { cancelled: false, invalid: true };
    return { cancelled: false, value: n };
  };

  const handleEditTruck = async (truck) => {
    // 1) Plate
    const plateRaw = prompt("Plate number:", truck.plate ?? "");
    if (plateRaw === null) return; // cancelled
    const newPlate = plateRaw.trim();
    if (!newPlate) return alert("Plate can't be empty.");

    // 2) Euro/km
    const euroRes = promptNumber(
      "Euro/km (leave empty to keep current):",
      euroKm(truck),
      { emptyMeans: "__KEEP__" }
    );
    if (euroRes.cancelled) return;
    if (euroRes.invalid) return alert("Invalid Euro/km.");

    // 3) Price/day
    const dayRes = promptNumber(
      "Price/day (leave empty to clear):",
      priceDay(truck),
      { emptyMeans: null } // empty clears
    );
    if (dayRes.cancelled) return;
    if (dayRes.invalid) return alert("Invalid Price/day.");

    const payload = {
      plate: newPlate,
      price_per_day: dayRes.value,
    };

    // keep euro_per_km if left empty
    if (euroRes.value !== "__KEEP__") {
      payload.euro_per_km = euroRes.value;
    }

    const { error } = await supabase
      .from("trucks")
      .update(payload)
      .eq("id", truck.id);

    if (error) alert("Update failed: " + error.message);
    else onRefresh();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
                <th className="p-2 border-b">Euro/km</th>
                {hasPricePerDay && <th className="p-2 border-b">Price/Day</th>}
                <th className="p-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(trucks || []).map((t) => (
                <tr
                  key={t.id}
                  className="odd:bg-gray-100 even:bg-white dark:odd:bg-gray-700 dark:even:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                >
                  <td className="p-2">{t.plate}</td>

                  <td className="p-2">
                    {typeof euroKm(t) === "number" ? euroKm(t).toFixed(2) : "—"}
                  </td>

                  {hasPricePerDay && (
                    <td className="p-2">
                      {typeof priceDay(t) === "number" ? priceDay(t).toFixed(2) : "—"}
                    </td>
                  )}

                  <td className="p-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEditTruck(t)}
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!trucks || trucks.length === 0) && (
                <tr>
                  <td className="p-4 text-center text-sm text-gray-500 dark:text-gray-300" colSpan={hasPricePerDay ? 4 : 3}>
                    No trucks found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
