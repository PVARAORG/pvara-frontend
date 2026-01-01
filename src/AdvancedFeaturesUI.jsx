// ========================================
// ADVANCED FEATURES UI COMPONENTS
// ========================================

import React from "react";
import {
  EmailTemplates,
  sendEmail,
  InterviewTypes,
  scheduleInterview,
  organizeByPipeline,
  applyAdvancedFilter,
  generateOfferLetter,
  exportToCSV,
  notifySlack,
  calculateMetrics,
  getCompanySettings,
  updateCompanySettings,
} from "./AdvancedFeatures";

// EMAIL NOTIFICATIONS PANEL
export function EmailNotificationsPanel({ applications }) {
  const [sent, setSent] = React.useState([]);

  const sendNotification = (candidateId, templateType) => {
    const app = applications.find((a) => a.id === candidateId);
    if (!app) return;

    const job = JSON.parse(localStorage.getItem("PVARA_STATE") || "{}").jobs?.find((j) => j.id === app.jobId);
    let template;

    switch (templateType) {
      case "received":
        template = EmailTemplates.APPLICATION_RECEIVED(app.applicant.name, job?.title);
        break;
      case "shortlisted":
        template = EmailTemplates.APPLICATION_SHORTLISTED(app.applicant.name, job?.title);
        break;
      case "rejection":
        template = EmailTemplates.REJECTION(app.applicant.name, job?.title);
        break;
      default:
        return;
    }

    const email = sendEmail(app.applicant.email, template);
    setSent([email, ...sent]);
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">📧 Email Notifications</h3>
      <div className="space-y-2 mb-3">
        {applications.slice(0, 5).map((app) => (
          <div key={app.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm">{app.applicant.name}</span>
            <div className="flex gap-1">
              <button
                onClick={() => sendNotification(app.id, "shortlisted")}
                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
              >
                Shortlist
              </button>
              <button
                onClick={() => sendNotification(app.id, "rejection")}
                className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      {sent.length > 0 && (
        <div className="text-xs text-green-600">
          ✅ {sent.length} emails sent
        </div>
      )}
    </div>
  );
}

// INTERVIEW SCHEDULING
export function InterviewSchedulingPanel() {
  const [interviews, setInterviews] = React.useState([]);
  const [formData, setFormData] = React.useState({ candidateId: "", type: "Phone Screen", date: "", notes: "" });
  const handleChange = React.useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const scheduleInterview_ = () => {
    if (!formData.candidateId || !formData.date) return;
    const interview = scheduleInterview(formData.candidateId, "", formData.type, formData.date, "", formData.notes);
    setInterviews([interview, ...interviews]);
    setFormData({ candidateId: "", type: "Phone Screen", date: "", notes: "" });
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">📅 Interview Scheduling</h3>
      <div className="space-y-2 mb-3">
        <input
          type="text"
          placeholder="Candidate ID"
          value={formData.candidateId}
          onChange={(e) => handleChange("candidateId", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <select
          value={formData.type}
          onChange={(e) => handleChange("type", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        >
          {InterviewTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => handleChange("date", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <input
          type="text"
          placeholder="Interview notes..."
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <button
          onClick={scheduleInterview_}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Schedule Interview
        </button>
      </div>
      <div className="text-xs text-gray-600">{interviews.length} interviews scheduled</div>
    </div>
  );
}

// KANBAN PIPELINE VIEW
export function KanbanPipelineView({ applications }) {
  const pipeline = organizeByPipeline(applications);
  const stages = Object.keys(pipeline);

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">📊 Candidate Pipeline</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4">
          {stages.map((stage) => (
            <div
              key={stage}
              className="min-w-64 bg-gray-50 rounded p-3 border-l-4 border-blue-500"
            >
              <div className="font-semibold text-sm mb-2 capitalize">
                {stage} ({pipeline[stage].length})
              </div>
              <div className="space-y-2">
                {pipeline[stage].slice(0, 3).map((app) => (
                  <div
                    key={app.id}
                    className="bg-white p-2 rounded border text-xs hover:shadow-md cursor-move"
                  >
                    <div className="font-semibold">{app.applicant.name}</div>
                    <div className="text-gray-600">Score: {(app.aiScore || 0).toFixed(1)}</div>
                  </div>
                ))}
                {pipeline[stage].length > 3 && (
                  <div className="text-xs text-gray-500 italic">
                    +{pipeline[stage].length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ADVANCED FILTER
export function AdvancedFilterPanel({ applications, onFilter }) {
  const [filters, setFilters] = React.useState({
    status: "",
    minScore: 0,
    maxScore: 100,
    searchText: "",
  });
  const handleFilterChange = React.useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyFilters = () => {
    const filtered = applyAdvancedFilter(applications, filters);
    onFilter(filtered);
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">🔍 Advanced Filters</h3>
      <div className="space-y-2 mb-3">
        <input
          type="text"
          placeholder="Search by name..."
          value={filters.searchText}
          onChange={(e) => handleFilterChange("searchText", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min Score"
            value={filters.minScore}
            onChange={(e) => handleFilterChange("minScore", parseInt(e.target.value) || 0)}
            className="flex-1 border p-2 rounded text-sm"
          />
          <input
            type="number"
            placeholder="Max Score"
            value={filters.maxScore}
            onChange={(e) => handleFilterChange("maxScore", parseInt(e.target.value) || 100)}
            className="flex-1 border p-2 rounded text-sm"
          />
        </div>
        <button
          onClick={applyFilters}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

// INTERVIEW FEEDBACK MODAL
export function InterviewFeedbackModal({ open, candidate, job, onSave, onClose }) {
  const [formData, setFormData] = React.useState({
    technicalSkills: 5,
    communication: 5,
    cultureFit: 5,
    problemSolving: 5,
    recommendation: 'Hire',
    notes: ''
  });

  const overallScore = ((formData.technicalSkills + formData.communication + formData.cultureFit + formData.problemSolving) / 4).toFixed(1);
  const isEligible = parseFloat(overallScore) >= 7.0 || formData.recommendation === 'Hire';

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      overall_score: parseFloat(overallScore),
      technical_skills: formData.technicalSkills,
      communication: formData.communication,
      culture_fit: formData.cultureFit,
      problem_solving: formData.problemSolving,
      recommendation: formData.recommendation,
      notes: formData.notes,
      isEligibleForOffer: isEligible,
      submittedAt: new Date().toISOString()
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Interview Feedback</h2>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500">Candidate</div>
            <div className="text-lg font-semibold">{candidate?.applicant?.name || 'Unknown'}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Technical Skills (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.technicalSkills}
                onChange={(e) => handleChange('technicalSkills', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.communication}
                onChange={(e) => handleChange('communication', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Culture Fit (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.cultureFit}
                onChange={(e) => handleChange('cultureFit', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Problem Solving (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.problemSolving}
                onChange={(e) => handleChange('problemSolving', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-medium text-gray-500">Overall Score (Calculated)</div>
            <div className="text-2xl font-bold text-green-600">{overallScore} / 10</div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
            <select
              value={formData.recommendation}
              onChange={(e) => handleChange('recommendation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="Hire">Hire</option>
              <option value="Strong Hire">Strong Hire</option>
              <option value="Maybe">Maybe</option>
              <option value="No Hire">No Hire</option>
            </select>
          </div>

          <div className={`p-3 rounded-lg mb-4 ${isEligible ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-2">
              <svg className={`w-5 h-5 ${isEligible ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`font-medium ${isEligible ? 'text-green-700' : 'text-yellow-700'}`}>Next Action</span>
            </div>
            <div className={`text-sm mt-1 flex items-center gap-1 ${isEligible ? 'text-green-600' : 'text-yellow-600'}`}>
              {isEligible ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Candidate is eligible for Offer Management (score ≥7.0 or "Hire" recommendation)
                </>
              ) : (
                <>Candidate may need further evaluation</>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Interview Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Add notes about the interview, candidate performance, concerns, or recommendations..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 h-24 resize-y"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Save Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// EXTEND OFFER MODAL
export function ExtendOfferModal({ open, candidate, job, onSave, onClose }) {
  const [formData, setFormData] = React.useState({
    salary: job?.salary ? `PKR ${job.salary.min?.toLocaleString()} - ${job.salary.max?.toLocaleString()}` : '',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    benefits: 'Health insurance, provident fund, annual leaves as per company policy',
    notes: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      salary_offered: formData.salary,
      start_date: formData.startDate,
      benefits: formData.benefits,
      notes: formData.notes,
      offer_extended_at: new Date().toISOString()
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Extend Job Offer</h2>

          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <div className="font-semibold text-gray-900">{candidate?.applicant?.name || 'Unknown'}</div>
            <div className="text-sm text-gray-600">{job?.title || 'Position'}</div>
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <span>⭐ AI Score: {candidate?.aiScore || 'N/A'}</span>
              <span>📋 Interview: {candidate?.interview_feedback?.overall_score || 'N/A'}/10</span>
              <span className="text-green-600 font-medium">✓ Qualified</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary Offer</label>
            <input
              type="text"
              value={formData.salary}
              onChange={(e) => handleChange('salary', e.target.value)}
              placeholder="PKR 120,000 - 200,000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits Package</label>
            <textarea
              value={formData.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 h-20 resize-y"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional details or conditions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 h-20 resize-y"
            />
          </div>

          <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-green-700">Final Stage - Offer Extension</span>
            </div>
            <div className="text-xs text-green-600 mt-1">
              🎉 This is the final stage of the recruitment pipeline. Once the offer is sent, the candidate can accept or reject it.
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Send Offer Letter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// OFFER MANAGEMENT
export function OfferManagementPanel({ applications }) {
  const [offers, setOffers] = React.useState([]);
  const [formData, setFormData] = React.useState({ candidateId: "", salary: "", startDate: "" });
  const handleOfferChange = React.useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const generateOffer = () => {
    if (!formData.candidateId || !formData.salary) return;
    const app = applications.find((a) => a.id === formData.candidateId);
    if (!app) return;

    const offer = generateOfferLetter(app.applicant, { title: "Position", id: "", department: "" }, formData.salary, formData.startDate);
    setOffers([offer, ...offers]);
    setFormData({ candidateId: "", salary: "", startDate: "" });
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">💼 Offer Management</h3>
      <div className="space-y-2 mb-3">
        <input
          type="text"
          placeholder="Candidate ID"
          value={formData.candidateId}
          onChange={(e) => handleOfferChange("candidateId", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <input
          type="text"
          placeholder="Salary (e.g., $80,000)"
          value={formData.salary}
          onChange={(e) => handleOfferChange("salary", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <input
          type="date"
          value={formData.startDate}
          onChange={(e) => handleOfferChange("startDate", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <button
          onClick={generateOffer}
          className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Generate Offer
        </button>
      </div>
      {offers.length > 0 && (
        <div className="text-xs text-green-600">✅ {offers.length} offers generated</div>
      )}
    </div>
  );
}

// ANALYTICS & REPORTS
export function AnalyticsReportsPanel({ applications }) {
  const [metrics, setMetrics] = React.useState(null);

  React.useEffect(() => {
    const m = calculateMetrics(applications);
    setMetrics(m);
  }, [applications]);

  const exportData = () => {
    exportToCSV(applications, "pvara-applications.csv");
    notifySlack(`📊 Report exported: ${applications.length} applications`);
  };

  if (!metrics) return <div>Loading...</div>;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">📈 Analytics & Reports</h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="p-2 bg-blue-50 rounded">
          <div className="text-xs text-gray-600">Total Applications</div>
          <div className="text-xl font-bold text-blue-600">{metrics.totalApplications}</div>
        </div>
        <div className="p-2 bg-green-50 rounded">
          <div className="text-xs text-gray-600">Hired</div>
          <div className="text-xl font-bold text-green-600">{metrics.hired}</div>
        </div>
        <div className="p-2 bg-yellow-50 rounded">
          <div className="text-xs text-gray-600">Conversion Rate</div>
          <div className="text-xl font-bold text-yellow-600">{metrics.conversionRate}%</div>
        </div>
        <div className="p-2 bg-purple-50 rounded">
          <div className="text-xs text-gray-600">Avg Time to Hire</div>
          <div className="text-xl font-bold text-purple-600">{metrics.avgTimeToHire}d</div>
        </div>
      </div>
      <button
        onClick={exportData}
        className="w-full px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
      >
        📥 Export to CSV & Slack
      </button>
    </div>
  );
}

// SETTINGS & CUSTOMIZATION
export function SettingsPanel() {
  const [settings, setSettings] = React.useState(getCompanySettings());
  const handleSettingsChange = React.useCallback((field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveSettings = () => {
    updateCompanySettings(settings);
    alert("✅ Settings saved!");
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-3">⚙️ Settings & Customization</h3>
      <div className="space-y-2 mb-3">
        <input
          type="text"
          placeholder="Company Name"
          value={settings.companyName || ""}
          onChange={(e) => handleSettingsChange("companyName", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <input
          type="color"
          value={settings.primaryColor || "#1f7e4f"}
          onChange={(e) => handleSettingsChange("primaryColor", e.target.value)}
          className="w-full border p-2 rounded text-sm"
        />
        <button
          onClick={saveSettings}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 text-sm"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}

const AdvancedFeaturesUI = {
  EmailNotificationsPanel,
  InterviewSchedulingPanel,
  KanbanPipelineView,
  AdvancedFilterPanel,
  OfferManagementPanel,
  AnalyticsReportsPanel,
  SettingsPanel,
  InterviewFeedbackModal,
  ExtendOfferModal,
};

export default AdvancedFeaturesUI;
