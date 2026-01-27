import React, { useState } from "react";
import { generateAnalytics, generateHiringReport, reportToCSV, autoSelectCandidates } from "./aiScreening";

/**
 * Analytics Dashboard Component
 * Shows charts, metrics, and hiring funnel
 */
export function AnalyticsDashboard({ state, onGenerateTestData }) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const analytics = generateAnalytics(state);
  const report = generateHiringReport(state);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
      </div>

      {/* Recruitment Pipeline Workflow Visualization */}
      <div className="bg-gradient-to-r from-orange-50 to-blue-50 p-6 rounded-xl shadow-md border border-orange-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Recruitment Pipeline Workflow
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
          {[
            { name: 'HR Review', icon: '👥', color: 'bg-blue-500', count: (state.applications || []).filter(a => ['submitted', 'hr-review'].includes(a.status)).length },
            { name: 'AI Screening', icon: '🤖', color: 'bg-purple-500', count: (state.applications || []).filter(a => ['screening', 'ai-reviewed', 'shortlisted'].includes(a.status)).length },
            { name: 'Interview', icon: '🎤', color: 'bg-orange-500', count: (state.applications || []).filter(a => ['interview', 'interview-complete'].includes(a.status)).length },
            { name: 'Offer', icon: '📄', color: 'bg-orange-500', count: (state.applications || []).filter(a => ['offer'].includes(a.status)).length },
          ].map((stage, index, arr) => (
            <div key={stage.name} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`${stage.color} text-white rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-2xl shadow-lg`}>
                  {stage.icon}
                </div>
                <div className="text-xs md:text-sm font-semibold text-gray-700 mt-2 text-center">{stage.name}</div>
                <div className="text-xs text-gray-500 font-bold">{stage.count} candidates</div>
              </div>
              {index < arr.length - 1 && (
                <div className="flex items-center mx-1 md:mx-3 text-gray-400">
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
          ))}
          {/* Final States */}
          <div className="flex items-center mx-1 md:mx-3 text-gray-400">
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex gap-2">
              <div className="bg-emerald-600 text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-lg shadow-lg">✓</div>
              <div className="bg-red-500 text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-lg shadow-lg">✗</div>
            </div>
            <div className="text-xs md:text-sm font-semibold text-gray-700 mt-2 text-center">Final Decision</div>
            <div className="text-xs text-gray-500">
              <span className="text-emerald-600 font-bold">{(state.applications || []).filter(a => a.status === 'hired').length}</span> /
              <span className="text-red-500 font-bold"> {(state.applications || []).filter(a => a.status === 'rejected').length}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-gray-500 italic">
          Sequential workflow enforced — candidates must complete each stage before advancing
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
        {["overview", "funnel", "jobs", "recommendations"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 whitespace-nowrap transition-colors ${selectedTab === tab
              ? "border-orange-600 text-orange-700 bg-orange-50/50"
              : "border-transparent text-gray-500 hover:text-orange-600 hover:bg-gray-50"
              }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === "overview" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hiring Metrics</h3>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Total Applications"
              value={analytics.totalApplications}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
            />
            <MetricCard
              label="Screened"
              value={analytics.screenedApplications}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <MetricCard
              label="Interviewed"
              value={analytics.interviewApplications}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            />
            <MetricCard
              label="Offers"
              value={analytics.offeredApplications}
              icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>}
            />
          </div>

          {/* Conversion Rates */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h4 className="font-semibold mb-4 text-gray-800">Conversion Rates</h4>
            <div className="space-y-2">
              <ProgressBar
                label="App → Interview"
                value={analytics.conversionRates.applicationToInterview}
              />
              <ProgressBar
                label="Screening → Interview"
                value={analytics.conversionRates.screeningToInterview}
              />
              <ProgressBar
                label="App → Offer"
                value={analytics.conversionRates.applicationToOffer}
              />
            </div>
          </div>

          {/* Time to Hire */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h4 className="font-semibold mb-4 text-gray-800">Time to Hire</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-700">
                  {analytics.timeToHireStats.average}
                </div>
                <div className="text-xs text-gray-500">Average (days)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {analytics.timeToHireStats.min}
                </div>
                <div className="text-xs text-gray-500">Min (days)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-700">
                  {analytics.timeToHireStats.max}
                </div>
                <div className="text-xs text-gray-500">Max (days)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Funnel Tab */}
      {selectedTab === "funnel" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Hiring Funnel</h3>
          {analytics.hiringFunnel.applications > 0 ? (
            <FunnelChart funnel={analytics.hiringFunnel} />
          ) : (
            <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">No Application Data</h4>
              <p className="text-gray-500 text-sm">The hiring funnel will appear here once candidates start applying to your open positions.</p>
            </div>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {selectedTab === "jobs" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Job Performance</h3>
          <div className="space-y-3">
            {analytics.jobPerformance.map((job) => (
              <div key={job.jobId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="font-semibold text-gray-800">{job.title}</div>
                <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <div className="font-bold text-gray-800">{job.totalApplications}</div>
                    <div className="text-xs text-gray-500">Applications</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded-lg">
                    <div className="font-bold text-orange-600">{job.offers}</div>
                    <div className="text-xs text-gray-500">Offers</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="font-bold text-blue-600">{job.averageScore}/100</div>
                    <div className="text-xs text-gray-500">Avg Score</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {selectedTab === "recommendations" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Insights & Recommendations</h3>
          {report.recommendations.length > 0 ? (
            <div className="space-y-3">
              {report.recommendations.map((rec, i) => (
                <div key={i} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 text-sm flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  </div>
                  <span className="text-gray-700">{rec}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <p className="text-gray-500">No recommendations at this time.</p>
            </div>
          )}

          {/* Export Report */}
          <button
            onClick={() => exportReport(report)}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-emerald-600 text-white rounded-xl hover:from-orange-700 hover:to-emerald-700 font-medium shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Report (CSV)
          </button>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
      <div className="flex justify-center text-orange-600 mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
}

function ProgressBar({ label, value }) {
  const cappedValue = Math.min(Math.max(value, 0), 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-gray-800">{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-orange-500 to-emerald-500 h-2.5 rounded-full transition-all"
          style={{ width: `${cappedValue}%` }}
        ></div>
      </div>
    </div>
  );
}

function FunnelChart({ funnel }) {
  const total = funnel.applications || 1;
  const stages = [
    { label: "Applications", value: funnel.applications, color: "bg-blue-500" },
    { label: "Screened", value: funnel.screened, color: "bg-yellow-500" },
    { label: "Interviewed", value: funnel.interviewed, color: "bg-purple-500" },
    { label: "Offers", value: funnel.offers, color: "bg-orange-500" },
  ];

  return (
    <div className="space-y-4">
      {stages.map((stage, i) => {
        const percentage = (stage.value / total) * 100;
        return (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-semibold">{stage.label}</span>
              <span>
                {stage.value} ({Math.round(percentage)}%)
              </span>
            </div>
            <div className={`${stage.color} h-8 rounded text-white flex items-center px-3 font-semibold`}
              style={{ width: `${percentage}%` }}>
              {stage.value > 0 && stage.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function exportReport(report) {
  const csv = reportToCSV(report);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hiring-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * AI Screening Component
 * Shows AI-scored candidates with auto-selection recommendations
 */
export function AIScreeningPanel({ candidates, jobRequirements, onSelectCandidates }) {
  const [threshold, setThreshold] = useState(75);
  const [selectedForReview, setSelectedForReview] = useState(new Set());

  const scoredCandidates = autoSelectCandidates(candidates, jobRequirements, threshold);

  return (
    <div className="space-y-4 bg-white p-4 rounded shadow">
      <div className="flex items-center gap-2">
        <svg className="w-6 h-6 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-semibold">AI Candidate Screening</h3>
      </div>

      {/* Threshold Slider */}
      <div className="flex items-center gap-4">
        <label className="font-semibold">Selection Threshold:</label>
        <input
          type="range"
          min="50"
          max="100"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="flex-1"
        />
        <span className="text-lg font-bold text-orange-700">{threshold}</span>
      </div>

      {/* Scored Candidates */}
      <div className="space-y-3">
        {scoredCandidates.map((candidate) => (
          <div
            key={candidate.id}
            className={`p-3 rounded border-l-4 ${candidate.autoSelected
              ? "border-l-orange-700 bg-orange-50"
              : candidate.aiScore >= 60
                ? "border-l-yellow-700 bg-yellow-50"
                : "border-l-red-700 bg-red-50"
              }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-semibold">{candidate.applicant.name}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {candidate.applicant.email}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-700">
                  {candidate.aiScore}
                </div>
                <div className="text-xs text-gray-600">AI Score</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(candidate.scoreBreakdown).map(([key, value]) => (
                <div key={key} className="bg-white p-2 rounded">
                  <div className="text-gray-600">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="font-bold">{Math.round(value)}/100</div>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div className="mt-2 text-sm font-semibold">{candidate.recommendation}</div>

            {/* Selection */}
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedForReview.has(candidate.id)}
                  onChange={(e) => {
                    const newSelected = new Set(selectedForReview);
                    if (e.target.checked) {
                      newSelected.add(candidate.id);
                    } else {
                      newSelected.delete(candidate.id);
                    }
                    setSelectedForReview(newSelected);
                  }}
                  className="cursor-pointer"
                />
                <span>Select for Review</span>
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      {selectedForReview.size > 0 && (
        <button
          onClick={() => onSelectCandidates && onSelectCandidates(Array.from(selectedForReview))}
          className="w-full px-4 py-2 bg-orange-700 text-white rounded hover:bg-orange-800 font-semibold flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Create Shortlist from {selectedForReview.size} Selected
        </button>
      )}
    </div>
  );
}

/**
 * Interview Evaluation Form Component
 */
export function InterviewEvaluationForm({ candidate, onSubmit, onCancel }) {
  const [scores, setScores] = useState({
    technical: 5,
    communication: 5,
    experience: 5,
    cultureFit: 5,
  });
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    onSubmit({
      candidateId: candidate.id,
      scores,
      notes,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold">Interview Evaluation: {candidate.applicant.name}</h3>

      {/* Scoring Rubric */}
      <div className="space-y-4">
        {Object.entries(scores).map(([key, value]) => (
          <div key={key}>
            <label className="block font-semibold mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => setScores({ ...scores, [key]: num })}
                  className={`w-8 h-8 rounded border ${value === num
                    ? "bg-orange-700 text-white border-orange-700"
                    : "border-gray-300 hover:border-orange-700"
                    }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {value < 4 ? 'Needs improvement' : value < 7 ? 'Good' : 'Excellent'}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <label className="block font-semibold mb-2">Evaluation Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add interview feedback and observations..."
          className="w-full border rounded p-2 text-sm"
          rows="4"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-orange-700 text-white rounded hover:bg-orange-800"
        >
          Save Evaluation
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
