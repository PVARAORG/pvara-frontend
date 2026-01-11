import React from "react";

// TODO: Connect to /api/jobs for job CRUD operations
// Example: fetch('/api/jobs')

// Discipline options matching backend
const DISCIPLINE_OPTIONS = [
  "IT", "Finance", "Engineering", "Legal",
  "Human Resources", "Marketing", "Operations", "Other"
];

// Employment type options matching backend
const EMPLOYMENT_TYPE_OPTIONS = [
  "Permanent", "Full-time", "Part-time", "Contract", "Internship"
];

const JobList = ({ jobs, onCreate, onEdit, onDelete }) => {
  // Job form state for creating/editing jobs
  const [localForm, setLocalForm] = React.useState({
    title: "",
    discipline: "",
    department: "",
    grade: "",
    description: "",
    locations: [],
    openings: "1",
    employmentType: "Full-time",
    ageBracket: { minAge: "", maxAge: "" },
    salary: { min: "", max: "" },
    fields: {},
  });
  const [editingJobId, setEditingJobId] = React.useState(null);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [showValidationPopup, setShowValidationPopup] = React.useState(false);
  const [popupErrors, setPopupErrors] = React.useState([]);

  function handleLocalChange(field, value) {
    setLocalForm((prev) => ({ ...prev, [field]: value }));
  }
  function handleLocalSalaryChange(field, value) {
    setLocalForm((prev) => ({ ...prev, salary: { ...prev.salary, [field]: value } }));
  }
  function handleAgeBracketChange(field, value) {
    setLocalForm((prev) => ({ ...prev, ageBracket: { ...prev.ageBracket, [field]: value } }));
  }
  function resetForm() {
    setLocalForm({
      title: "",
      discipline: "",
      department: "",
      grade: "",
      description: "",
      locations: [],
      openings: "1",
      employmentType: "Full-time",
      ageBracket: { minAge: "", maxAge: "" },
      salary: { min: "", max: "" },
      fields: {},
    });
    setEditingJobId(null);
    setHasSubmitted(false);
  }

  // Validation function returns object with field-specific errors
  function getFieldErrors(form) {
    const fieldErrors = {};
    if (!form.title || !form.title.trim()) fieldErrors.title = "Title is required";
    if (!form.department || !form.department.trim()) fieldErrors.department = "Department is required";
    const openingsNum = form.openings === "" ? null : Number(form.openings);
    if (openingsNum !== null && openingsNum <= 0) fieldErrors.openings = "Openings must be greater than 0";
    const salaryMinNum = form.salary?.min === "" ? null : Number(form.salary?.min);
    const salaryMaxNum = form.salary?.max === "" ? null : Number(form.salary?.max);
    if (salaryMinNum !== null && salaryMaxNum !== null && salaryMinNum > salaryMaxNum) fieldErrors.salary = "Salary min must be less than or equal to max";
    // Age bracket validation
    const minAge = form.ageBracket?.minAge === "" ? null : Number(form.ageBracket?.minAge);
    const maxAge = form.ageBracket?.maxAge === "" ? null : Number(form.ageBracket?.maxAge);
    if (minAge !== null && (minAge < 18 || minAge > 65)) fieldErrors.minAge = "Min age must be 18-65";
    if (maxAge !== null && (maxAge < 18 || maxAge > 65)) fieldErrors.maxAge = "Max age must be 18-65";
    if (minAge !== null && maxAge !== null && minAge > maxAge) fieldErrors.ageBracket = "Min age must be less than or equal to max age";
    return fieldErrors;
  }

  const fieldErrors = hasSubmitted ? getFieldErrors(localForm) : {};
  const hasErrors = Object.keys(fieldErrors).length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    setHasSubmitted(true);

    const errors = getFieldErrors(localForm);
    if (Object.keys(errors).length > 0) {
      // Show popup with all errors
      setPopupErrors(Object.values(errors));
      setShowValidationPopup(true);
      return; // Don't submit if there are errors
    }

    if (editingJobId) {
      onEdit({ ...localForm, id: editingJobId });
      resetForm();
      return;
    }
    // Ensure locations is never empty - default to Remote
    const jobData = {
      ...localForm,
      id: `job-${Date.now()}`,
      status: 'open',
      locations: (localForm.locations && localForm.locations.length > 0) ? localForm.locations : ['Remote']
    };
    onCreate(jobData);
    resetForm();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <input
            value={localForm.title}
            onChange={(e) => handleLocalChange('title', e.target.value)}
            placeholder="Title *"
            className={`border p-2 rounded w-full ${fieldErrors.title ? 'border-red-500' : ''}`}
            autoComplete="off"
          />
          {fieldErrors.title && <p className="text-sm text-red-600 mt-1">{fieldErrors.title}</p>}
        </div>
        <div>
          <input
            value={localForm.department}
            onChange={(e) => handleLocalChange('department', e.target.value)}
            placeholder="Department *"
            className={`border p-2 rounded w-full ${fieldErrors.department ? 'border-red-500' : ''}`}
            autoComplete="off"
          />
          {fieldErrors.department && <p className="text-sm text-red-600 mt-1">{fieldErrors.department}</p>}
        </div>
        <select
          value={localForm.discipline}
          onChange={(e) => handleLocalChange('discipline', e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="">Select Discipline (Optional)</option>
          {DISCIPLINE_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <textarea
          value={localForm.description}
          onChange={(e) => handleLocalChange('description', e.target.value)}
          placeholder="Description"
          className="border p-2 rounded w-full"
          autoComplete="off"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="number"
              value={localForm.openings ?? ""}
              onChange={(e) => handleLocalChange('openings', e.target.value)}
              placeholder="Openings"
              className={`border p-2 rounded w-full ${fieldErrors.openings ? 'border-red-500' : ''}`}
            />
            {fieldErrors.openings && <p className="text-sm text-red-600 mt-1">{fieldErrors.openings}</p>}
          </div>
          <select
            value={localForm.employmentType}
            onChange={(e) => handleLocalChange('employmentType', e.target.value)}
            className="border p-2 rounded w-full"
          >
            {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={localForm.salary?.min ?? ""} onChange={(e) => handleLocalSalaryChange('min', e.target.value)} placeholder="Salary Min" className={`border p-2 rounded w-full ${fieldErrors.salary ? 'border-red-500' : ''}`} />
          <input type="number" value={localForm.salary?.max ?? ""} onChange={(e) => handleLocalSalaryChange('max', e.target.value)} placeholder="Salary Max" className={`border p-2 rounded w-full ${fieldErrors.salary ? 'border-red-500' : ''}`} />
        </div>
        {fieldErrors.salary && <p className="text-sm text-red-600">{fieldErrors.salary}</p>}
        {/* Age Bracket (Optional) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="number"
              value={localForm.ageBracket?.minAge ?? ""}
              onChange={(e) => handleAgeBracketChange('minAge', e.target.value)}
              placeholder="Min Age (Optional)"
              min="18"
              max="65"
              className={`border p-2 rounded w-full ${fieldErrors.minAge || fieldErrors.ageBracket ? 'border-red-500' : ''}`}
            />
            {fieldErrors.minAge && <p className="text-sm text-red-600 mt-1">{fieldErrors.minAge}</p>}
          </div>
          <div>
            <input
              type="number"
              value={localForm.ageBracket?.maxAge ?? ""}
              onChange={(e) => handleAgeBracketChange('maxAge', e.target.value)}
              placeholder="Max Age (Optional)"
              min="18"
              max="65"
              className={`border p-2 rounded w-full ${fieldErrors.maxAge || fieldErrors.ageBracket ? 'border-red-500' : ''}`}
            />
            {fieldErrors.maxAge && <p className="text-sm text-red-600 mt-1">{fieldErrors.maxAge}</p>}
          </div>
        </div>
        {fieldErrors.ageBracket && <p className="text-sm text-red-600">{fieldErrors.ageBracket}</p>}
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-green-700 text-white rounded">{editingJobId ? 'Update Job' : 'Create Job'}</button>
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-2 border rounded"
          >
            Reset
          </button>
          {editingJobId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 border rounded text-sm"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      <div className="mt-4">
        <h4 className="font-semibold">Existing Jobs</h4>
        {(jobs || []).map((j) => (
          <div key={j.id} className="border p-2 rounded mt-2">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold">{j.title}</div>
                <div className="text-xs text-gray-500">
                  {j.department}
                  {j.discipline && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{j.discipline}</span>}
                  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{j.employmentType}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLocalForm({
                      ...j,
                      openings: j.openings !== undefined && j.openings !== null ? String(j.openings) : "",
                      discipline: j.discipline || "",
                      employmentType: j.employmentType || "Full-time",
                      ageBracket: {
                        minAge: j.ageBracket?.minAge !== undefined && j.ageBracket?.minAge !== null ? String(j.ageBracket.minAge) : "",
                        maxAge: j.ageBracket?.maxAge !== undefined && j.ageBracket?.maxAge !== null ? String(j.ageBracket.maxAge) : "",
                      },
                      salary: {
                        min: j.salary?.min !== undefined && j.salary?.min !== null ? String(j.salary.min) : "",
                        max: j.salary?.max !== undefined && j.salary?.max !== null ? String(j.salary.max) : "",
                      },
                    });
                    setEditingJobId(j.id);
                  }}
                  className="px-2 py-1 border rounded text-sm"
                >
                  Edit
                </button>
                <button onClick={() => onDelete(j.id)} className="px-2 py-1 border rounded text-sm">
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Validation Error Popup */}
      {showValidationPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowValidationPopup(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Please Fix the Following</h3>
            </div>
            <ul className="space-y-2 mb-6">
              {popupErrors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 mt-0.5">•</span>
                  {err}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowValidationPopup(false)}
              className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobList;

