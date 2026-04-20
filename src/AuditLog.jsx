import React, { useState, useEffect, useMemo } from "react";

const API_URL = process.env.REACT_APP_API_URL || "https://backend.pvara.team";

const ACTION_COLORS = {
  "create-job": "bg-green-100 text-green-800",
  "update-job": "bg-blue-100 text-blue-800",
  "delete-job": "bg-red-100 text-red-800",
  "create-user": "bg-green-100 text-green-800",
  "update-user": "bg-blue-100 text-blue-800",
  "delete-user": "bg-red-100 text-red-800",
  "update-application-status": "bg-purple-100 text-purple-800",
  "update-content-page": "bg-blue-100 text-blue-800",
  "update-system-settings": "bg-orange-100 text-orange-800",
  "seed-content-pages": "bg-gray-100 text-gray-800",
  "update-screening-criteria": "bg-orange-100 text-orange-800",
};

function formatTime(ts) {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return ts;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actions, setActions] = useState([]);
  const limit = 100;

  // Load users for ID → username mapping
  useEffect(() => {
    async function loadUsers() {
      try {
        const resp = await fetch(`${API_URL}/api/users/`, { headers: getAuthHeaders() });
        if (!resp.ok) return;
        const data = await resp.json();
        const map = {};
        (data.users || []).forEach((u) => {
          map[u.id || u._id] = u.username || u.fullName || u.email || u.id;
        });
        setUsers(map);
      } catch (e) {
        // non-blocking
      }
    }
    loadUsers();
  }, []);

  // Load actions list once
  useEffect(() => {
    async function loadActions() {
      try {
        const resp = await fetch(`${API_URL}/api/audit/actions/list`, { headers: getAuthHeaders() });
        if (!resp.ok) return;
        const data = await resp.json();
        setActions(data.actions || []);
      } catch (e) {}
    }
    loadActions();
  }, []);

  // Load logs whenever filters/page change
  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (actionFilter) params.set("action", actionFilter);
        if (userFilter) params.set("userId", userFilter);
        const resp = await fetch(`${API_URL}/api/audit/?${params.toString()}`, { headers: getAuthHeaders() });
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            setError("Not authorized to view audit logs. Please re-login.");
          } else {
            setError(`Failed to load audit logs (${resp.status})`);
          }
          setLogs([]);
          return;
        }
        const data = await resp.json();
        setLogs(data.logs || []);
        setTotalLogs(data.total || 0);
        setTotalPages(data.pages || 1);
      } catch (e) {
        setError(`Network error: ${e.message}`);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [page, actionFilter, userFilter]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter((l) => {
      const username = users[l.user] || l.user || "";
      return (
        (l.action || "").toLowerCase().includes(s) ||
        username.toLowerCase().includes(s) ||
        (l.ipAddress || "").toLowerCase().includes(s) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(s)
      );
    });
  }, [logs, search, users]);

  function exportCSV() {
    const headers = ["Timestamp", "User", "Action", "IP Address", "Details", "User Agent"];
    const rows = filteredLogs.map((l) => [
      l.timestamp || "",
      users[l.user] || l.user || "",
      l.action || "",
      l.ipAddress || "",
      JSON.stringify(l.details || {}),
      l.userAgent || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-bold text-2xl text-gray-800">Audit Log</h2>
          <p className="text-sm text-gray-500 mt-1">Complete trail of admin and HR actions on this portal</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={filteredLogs.length === 0}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl shadow-sm border text-center">
          <div className="text-2xl font-bold text-gray-800">{totalLogs}</div>
          <div className="text-xs text-gray-500">Total Audit Entries</div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border text-center">
          <div className="text-2xl font-bold text-blue-600">{Object.keys(users).length}</div>
          <div className="text-xs text-gray-500">Tracked Users</div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border text-center">
          <div className="text-2xl font-bold text-purple-600">{actions.length}</div>
          <div className="text-xs text-gray-500">Action Types</div>
        </div>
        <div className="bg-white p-3 rounded-xl shadow-sm border text-center">
          <div className="text-2xl font-bold text-green-600">{filteredLogs.length}</div>
          <div className="text-xs text-gray-500">Showing on Page</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex gap-3 items-center flex-wrap">
          <input
            type="text"
            placeholder="Search action, user, IP, details..."
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Users</option>
            {Object.entries(users).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          {(actionFilter || userFilter || search) && (
            <button
              onClick={() => {
                setActionFilter("");
                setUserFilter("");
                setSearch("");
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
          <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin mb-3"></div>
          <div>Loading audit trail...</div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs">
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">Timestamp</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">User</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">Action</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">IP Address</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-400">
                      No audit entries found
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id || log._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className="font-medium text-gray-800">{users[log.user] || `(${String(log.user).slice(0, 8)}…)`}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 font-mono">{log.ipAddress || "-"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 max-w-md">
                        <pre className="font-mono text-[10px] whitespace-pre-wrap break-all bg-gray-50 p-1.5 rounded">
                          {JSON.stringify(log.details || {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t px-4 py-3 flex justify-between items-center bg-gray-50">
              <div className="text-xs text-gray-500">
                Page {page} of {totalPages} ({totalLogs} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLog;
