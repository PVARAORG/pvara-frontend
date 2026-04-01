import React from "react";

// TODO: Connect to /api/candidates for candidate data
// Example: fetch('/api/candidates')

const CandidateList = ({ candidates, onStatusChange }) => {
  return (
    <div>
      <h3 className="font-semibold mb-2">My Applications</h3>
      {(candidates || []).length === 0 ? (
        <div className="text-gray-500">No applications found.</div>
      ) : (
        <ul className="space-y-3">
          {candidates.map((c) => (
            <li key={c.id} className="bg-white p-4 rounded shadow flex flex-col gap-1">
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-gray-500">{c.email} • {c.degree} • {c.experienceYears} yrs</div>
              <div className="text-xs text-blue-700">Status: {c.status || "Submitted"}</div>
              {onStatusChange && (
                <div className="mt-2 flex gap-2">
                  <button className="px-2 py-1 bg-green-600 text-white rounded text-xs" onClick={() => onStatusChange(c.id, "Reviewed")}>Mark Reviewed</button>
                  <button className="px-2 py-1 bg-red-600 text-white rounded text-xs" onClick={() => onStatusChange(c.id, "Hold")}>Hold</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CandidateList;
