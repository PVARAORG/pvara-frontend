import React from "react";

// TODO: Connect to /api/audit for audit log data
// Example: fetch('/api/audit')

const AuditLog = ({ auditRecords = [] }) => {
  // Real audit log UI migrated from PvaraPhase2.jsx
  const rows = auditRecords.slice(0, 200);
  function exportAudit() {
    const csvRows = [["id", "action", "details", "ts", "user"]];
    auditRecords.forEach((r) => csvRows.push([r.id, r.action, JSON.stringify(r.details || {}), r.ts, r.user]));
    const csv = rows.map((r) => r.map((c) => '"' + ("" + c).replace(/"/g, '""') + '"').join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    // Optionally show a toast here
  }

  return (
    <div>
      <h2 className="font-semibold text-xl mb-4">Audit Log</h2>
      <div className="bg-white p-4 rounded shadow space-y-2">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">Showing {rows.length} recent entries</div>
          <div>
            <button onClick={exportAudit} className="px-3 py-1 border rounded">Export CSV</button>
          </div>
        </div>
        <div className="max-h-96 overflow-auto">
          {rows.map((r) => (
            <div key={r.id} className="border-b py-2">
              <div className="text-sm font-semibold">{r.action}</div>
              <div className="text-xs text-gray-500">{new Date(r.ts).toLocaleString()} — {r.user}</div>
              <div className="text-xs mt-1 whitespace-pre-wrap">{JSON.stringify(r.details)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
