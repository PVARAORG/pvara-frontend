import React from "react";

// TODO: Connect to /api/shortlist for shortlist management
// Example: fetch('/api/shortlist')

const ShortlistPanel = ({ shortlist = [], onUpdate }) => {
  // Real shortlist UI migrated from PvaraPhase2.jsx
  return (
    <div>
      <h2 className="font-semibold text-xl mb-4">Shortlists</h2>
      <div className="space-y-3">
        {shortlist.length === 0 ? (
          <div className="text-gray-500">No shortlists available.</div>
        ) : (
          shortlist.map((s) => (
            <div key={s.id} className="p-3 border rounded bg-white">
              <div className="font-semibold">Shortlist ID: {s.id}</div>
              <div className="text-xs">Items: {s.items.length}</div>
              <div className="mt-2">
                <button onClick={() => {
                  if (onUpdate) onUpdate(s.id, s.items);
                }} className="px-2 py-1 border rounded">
                  Export CSV
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShortlistPanel;
