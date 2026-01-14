import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import Header from "../../components/header";

export default function AddTruck({ user }) {
  const [plate, setPlate] = useState("");
  const [euroPerKm, setEuroPerKm] = useState(""); // '' or number
  const [pricePerDay, setPricePerDay] = useState(""); // '' or number
  const navigate = useNavigate();

  function normalizePlate(raw) {
    if (typeof raw !== "string") return "";
    const groups = raw.trim().toUpperCase().match(/[A-Z]+|\d+/g);
    return groups ? groups.join(" ") : raw.trim().toUpperCase();
  }

  // Turns '' -> fallback, otherwise parses numeric
  function parseNumberOr(raw, fallback) {
    if (raw === "" || raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }

  const handleSubmit = async () => {
    const cleanPlate = normalizePlate(plate);
    if (!cleanPlate) {
      alert("Plate is required");
      return;
    }

    const rate = parseNumberOr(euroPerKm, 0.1);
    if (!Number.isFinite(rate)) {
      alert("Euro/km must be a number");
      return;
    }

    const ppd = pricePerDay === "" ? null : parseNumberOr(pricePerDay, NaN);
    if (ppd !== null && !Number.isFinite(ppd)) {
      alert("Price/day must be a number");
      return;
    }

    const { data: { session } = {} } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/admin/trucks/add", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plate: cleanPlate,
        euro_per_km: rate,
        price_per_day: ppd,
      }),
    });

    if (res.ok) {
      alert("Truck added successfully");
      navigate("/admin");
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("Add truck failed:", res.status, text);
      alert("Error: " + text);
      return;
    }
  };

  return (
    <div
      className="
        min-h-screen transition-colors
        bg-gradient-to-br from-red-600 via-white to-gray-400 text-gray-900
        dark:from-gray-800 dark:via-gray-900 dark:to-black dark:text-gray-100
      "
    >
      <Header user={user} />

      <div
        className="
          p-6 max-w-xl mx-auto mt-10
          bg-white/80 dark:bg-gray-800/70
          border border-gray-200 dark:border-gray-700
          backdrop-blur-md rounded-xl shadow-xl
        "
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Add Truck
        </h1>

        <input
          type="text"
          value={plate}
          onChange={(e) => setPlate(e.target.value)}
          placeholder="Plate Number"
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
        />

        <input
          type="number"
          step="0.1"
          value={euroPerKm === "" ? "" : euroPerKm}
          placeholder="Euro/km (0.10 - default)"
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            const num = raw === "" ? "" : Number(raw);
            setEuroPerKm(Number.isFinite(num) ? num : "");
          }}
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
        />

        <input
          type="number"
          step="1"
          value={pricePerDay === "" ? "" : pricePerDay}
          placeholder="Price per Day (optional)"
          onChange={(e) => {
            const raw = e.target.value.replace(",", ".");
            const num = raw === "" ? "" : Number(raw);
            setPricePerDay(Number.isFinite(num) ? num : "");
          }}
          className="
            w-full p-3 mb-4 rounded
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-red-600
          "
        />

        <button
          onClick={handleSubmit}
          className="
            w-full py-3 rounded-full font-semibold shadow-md transition
            bg-gradient-to-r from-green-500 to-green-700 text-white
            hover:from-green-600 hover:to-green-800
            focus:outline-none focus:ring-2 focus:ring-green-400/60
          "
        >
          Add
        </button>
      </div>
    </div>
  );
}
