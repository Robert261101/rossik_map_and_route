import React from "react";
import { supabase } from "../../lib/supabase";

export default function ViewAdminDashboardUsers({ users, onClose }) {
  const formatName = (email = "") => {
    if (!email || !email.includes("@")) return "Fără Nume";
    const local = email.split("@")[0];
    const parts = local.split(".");
    return parts.map((p) => p[0]?.toUpperCase() + p.slice(1)).join(" ");
  };

  const ROLE_OPTIONS = ["admin", "team_lead", "dispatcher", "transport_manager"];

  // ✅ local copy so UI can update immediately
  const [rows, setRows] = React.useState(users ?? []);
  React.useEffect(() => setRows(users ?? []), [users]);

  const [roleEdits, setRoleEdits] = React.useState(() => new Map()); // id -> role
  const [saving, setSaving] = React.useState(() => new Set()); // ids saving
  const [errorById, setErrorById] = React.useState(() => new Map()); // id -> error

  const getRole = (u) => roleEdits.get(u.id) ?? u.role;

  const onRoleChange = (id, role) => {
    setRoleEdits((prev) => {
      const next = new Map(prev);
      next.set(id, role);
      return next;
    });
    setErrorById((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const saveRole = async (u) => {
    const newRole = getRole(u);
    if (newRole === u.role) return;

    setSaving((prev) => new Set(prev).add(u.id));

    const { data, error } = await supabase
      .from("users")
      .update({ role: newRole })
      .eq("id", u.id)
      .select("id, role")
      .single();

    setSaving((prev) => {
      const next = new Set(prev);
      next.delete(u.id);
      return next;
    });

    if (error) {
      setErrorById((prev) => {
        const next = new Map(prev);
        next.set(u.id, error.message);
        return next;
      });
      return;
    }

    // ✅ update the rendered rows immediately
    setRows((prev) =>
      prev.map((row) => (row.id === u.id ? { ...row, role: data?.role ?? newRole } : row))
    );

    // clear edit entry
    setRoleEdits((prev) => {
      const next = new Map(prev);
      next.delete(u.id);
      return next;
    });
  };

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-gray-700 dark:text-white hover:text-white hover:bg-red-700 hover:scale-150 hover:border-white/10 transition-all duration-300 shadow-lg"
          aria-label="Close modal"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
          Users
        </h2>

        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="text-sm uppercase text-gray-900 dark:text-gray-300">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Team</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((user) => {
                const value = getRole(user);
                const dirty = value !== user.role;
                const isSaving = saving.has(user.id);
                const err = errorById.get(user.id);

                return (
                  <tr
                    key={user.id}
                    className="odd:bg-gray-100 even:bg-white border-b dark:odd:bg-gray-700 dark:even:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    <td className="p-2">{formatName(user.email)}</td>

                    <td className="p-2">
                      <select
                        value={value}
                        disabled={isSaving}
                        onChange={(e) => onRoleChange(user.id, e.target.value)}
                        className="
                          px-2 py-1 rounded-md border
                          bg-white dark:bg-gray-900
                          border-gray-300 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          focus:outline-none focus:ring-2 focus:ring-red-400/60
                          disabled:opacity-60
                        "
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>

                      {err ? (
                        <div className="mt-1 text-xs text-red-600 dark:text-red-300">
                          {err}
                        </div>
                      ) : null}
                    </td>

                    <td className="p-2">{user.team_name}</td>

                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveRole(user)}
                          disabled={!dirty || isSaving}
                          className="
                            px-3 py-1 rounded-lg text-sm font-semibold
                            bg-red-600 text-white hover:bg-red-700
                            disabled:opacity-40 disabled:hover:bg-red-600
                            focus:outline-none focus:ring-2 focus:ring-red-400/60
                          "
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>

                        {dirty ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => {
                              setRoleEdits((prev) => {
                                const next = new Map(prev);
                                next.delete(user.id);
                                return next;
                              });
                              setErrorById((prev) => {
                                const next = new Map(prev);
                                next.delete(user.id);
                                return next;
                              });
                            }}
                            className="
                              px-3 py-1 rounded-lg text-sm font-semibold
                              bg-gray-300 text-gray-900 hover:bg-gray-400
                              dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600
                              disabled:opacity-40
                              focus:outline-none focus:ring-2 focus:ring-gray-400
                            "
                          >
                            Revert
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}
