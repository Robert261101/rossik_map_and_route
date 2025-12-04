// src/pages/AddTeamMembers.js
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { roleForTeam } from "../../lib/roles";

export default function AddTeamMembers() {
  const { key } = useParams(); // url_key from route
  const navigate = useNavigate();

  const [team, setTeam] = useState(null); // {id, name, url_key}
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const NO_TEAM_ID = "cf70d8dc-5451-4979-a50d-c288365c77b4";

  useEffect(() => {
    const run = async () => {
      setErr("");
      console.log("[AddTeamMembers] route key:", key);

      // 1) Resolve team by url_key -> get UUID id
      const { data: teamData, error: teamErr } = await supabase
        .from("teams")
        .select("id, name, url_key")
        .eq("url_key", key)
        .single();

      console.log("[AddTeamMembers] team lookup:", { teamErr, teamData });

      if (teamErr || !teamData) {
        setTeam(null);
        setUsers([]);
        setErr("Team not found");
        return;
      }

      setTeam(teamData);

      // 2) Fetch eligible users (No Team or null)
      const { data, error } = await supabase
        .from("users")
        .select("id, username, role, team_id")
        .or(`team_id.eq."${NO_TEAM_ID}",team_id.is.null`)
        .order("username");

      console.log("[AddTeamMembers] fetchUsers:", {
        error,
        count: data?.length,
        sample: data?.slice?.(0, 5),
      });

      if (error) {
        setUsers([]);
        setErr("Failed to load users");
        return;
      }

      setUsers(data || []);
    };

    run();
  }, [key]);

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const formatName = (username) => {
    if (!username?.includes("@")) return "Fără Nume";
    return username
      .split("@")[0]
      .split(".")
      .map((p) => p[0]?.toUpperCase() + p.slice(1))
      .join(" ");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("[AddTeamMembers] submit team:", team);
    console.log("[AddTeamMembers] submit selectedUserIds:", selectedUserIds);

    if (!team?.id) {
      alert("Team not found / not loaded.");
      return;
    }

    if (selectedUserIds.length === 0) {
      alert("Selectează cel puțin un membru pentru a adăuga.");
      return;
    }

    setLoading(true);

    const newRole = roleForTeam(team.id); // or roleForTeam(team.url_key) — depends on your helper
    console.log("[AddTeamMembers] assigning role:", newRole);

    const { data: updated, error: updErr } = await supabase
      .from("users")
      .update({ team_id: team.id, role: newRole })
      .in("id", selectedUserIds)
      .select("id, username, team_id, role");

    console.log("[AddTeamMembers] update result:", { updErr, updated });

    if (updErr) {
      alert(`Update error: ${updErr.message}`);
      setLoading(false);
      return;
    }

    navigate(`/admin/teams/${team.url_key}`);
  };

  // Optional: show error state
  if (err) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="bg-white p-6 rounded-xl shadow border max-w-md w-full text-center">
          <p className="mb-4">{err}</p>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded-xl"
            onClick={() => navigate("/admin/teams")}
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="
        min-h-screen flex flex-col items-center
        bg-gradient-to-br from-red-600 via-white to-gray-400
        dark:from-gray-800 dark:via-gray-900 dark:to-black
        text-gray-800 dark:text-gray-100
        p-6
      "
    >
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        Add Team Members
      </h1>

      <form
        onSubmit={handleSubmit}
        className="
          w-full max-w-lg
          bg-white dark:bg-gray-800/90
          border border-gray-200 dark:border-gray-700
          p-6 rounded-xl shadow-lg
        "
      >
        <div
          className="
            max-h-72 overflow-y-auto mb-6
            border border-gray-200 dark:border-gray-700
            rounded-lg p-2
            bg-white dark:bg-gray-900/40
          "
        >
          {users.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              No eligible users found.
            </p>
          ) : (
            users.map((user) => (
              <label
                key={user.id}
                className="
                  flex items-center justify-between gap-3
                  px-3 py-2 rounded-md cursor-pointer
                  odd:bg-gray-100 even:bg-white
                  dark:odd:bg-gray-800 dark:even:bg-gray-900
                  hover:bg-gray-200 dark:hover:bg-gray-600
                  text-gray-900 dark:text-gray-100
                  transition
                "
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-base font-medium">
                    {formatName(user.username)}{" "}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({user.role})
                    </span>
                  </span>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="
              px-4 py-2 rounded
              bg-gray-300 hover:bg-gray-400
              text-gray-800
              dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white
              focus:outline-none focus:ring-2 focus:ring-gray-400
            "
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading || users.length === 0}
            className="
              px-6 py-2 rounded
              bg-red-600 hover:bg-red-700 text-white font-semibold
              disabled:opacity-50
              focus:outline-none focus:ring-2 focus:ring-red-400/60
            "
          >
            {loading ? "Adding..." : "Add Members"}
          </button>
        </div>
      </form>
    </div>
  );
}
