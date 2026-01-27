import React from "react";

// TODO: Connect to /api/interviews for interview rubric data
// Example: fetch('/api/interviews')

const InterviewRubric = ({ rubric, onEvaluate, jobs = [], applications = [], selectedJobForAI, handleSelectJobForAI }) => {
  // AI Screening logic migrated from PvaraPhase2.jsx (Argaam)
  // Include jobs that are 'open' or have no status (newly created jobs)
  const jobList = jobs.filter(j => j.status === 'open' || !j.status);
  const selectedJob = selectedJobForAI ? jobs.find(j => j.id === selectedJobForAI) : jobList[0];
  const jobApps = selectedJob
    ? applications.filter(a => a.jobId === selectedJob.id)
    : [];

  // Count unevaluated applications
  const unevaluatedCount = applications.filter(app => app.status === 'submitted' || !app.aiScore).length;

  return (
    <div>
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-orange-800">AI Screening</h2>
            <p className="text-sm text-gray-600">Batch evaluate applications using AI</p>
          </div>
          <button
            onClick={() => onEvaluate()}
            className="px-4 py-2 bg-orange-700 text-white rounded hover:bg-orange-800 disabled:opacity-50"
            disabled={unevaluatedCount === 0}
          >
            🤖 Run AI Evaluation ({unevaluatedCount} pending)
          </button>
        </div>

        <label className="block font-semibold mb-2">Select Job Position</label>
        <select
          value={selectedJobForAI || ''}
          onChange={(e) => handleSelectJobForAI(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">-- Choose a job to view applications --</option>
          {jobList.map(j => (
            <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
          ))}
        </select>
      </div>

      {/* Applications for Selected Job */}
      <div className="mt-4 bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-2">Applications for Selected Job</h3>
        {!selectedJobForAI ? (
          <div className="text-gray-500 text-center py-8">Please select a job position above</div>
        ) : jobApps.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No applications for this job.</div>
        ) : (
          <div className="space-y-2">
            {jobApps.map(app => (
              <div key={app.id} className="p-3 border rounded bg-gray-50 hover:bg-gray-100 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{app.applicant.name}</div>
                    <div className="text-xs text-gray-500">{app.applicant.email}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Status: <span className="font-medium">{app.status}</span>
                      {app.aiScore && <span className="ml-3">AI Score: <span className="font-semibold text-orange-700">{app.aiScore}</span></span>}
                    </div>
                  </div>
                  {app.aiScore ? (
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm">
                      ✓ Evaluated
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
                      ⏳ Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewRubric;
