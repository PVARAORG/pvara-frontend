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
  }

  function validateJobForm(form) {
    const errs = [];
    if (!form.title || !form.title.trim()) errs.push("Title required");
    if (!form.department || !form.department.trim()) errs.push("Department required");
    const openingsNum = form.openings === "" ? null : Number(form.openings);
    if (openingsNum !== null && openingsNum <= 0) errs.push("Openings must be > 0");
    const salaryMinNum = form.salary?.min === "" ? null : Number(form.salary?.min);
    const salaryMaxNum = form.salary?.max === "" ? null : Number(form.salary?.max);
    if (salaryMinNum !== null && salaryMaxNum !== null && salaryMinNum > salaryMaxNum) errs.push("Salary min must be <= max");
    // Age bracket validation
    const minAge = form.ageBracket?.minAge === "" ? null : Number(form.ageBracket?.minAge);
    const maxAge = form.ageBracket?.maxAge === "" ? null : Number(form.ageBracket?.maxAge);
    if (minAge !== null && (minAge < 18 || minAge > 65)) errs.push("Min age must be 18-65");
    if (maxAge !== null && (maxAge < 18 || maxAge > 65)) errs.push("Max age must be 18-65");
    if (minAge !== null && maxAge !== null && minAge > maxAge) errs.push("Min age must be <= max age");
    return errs;
  }
  const jobErrs = validateJobForm(localForm);

  function handleSubmit(e) {
    e.preventDefault();
    if (editingJobId) {
      onEdit({ ...localForm, id: editingJobId });
      resetForm();
      return;
    }
    onCreate({ ...localForm, id: `job-${Date.now()}` });
    resetForm();
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input 
          value={localForm.title} 
          onChange={(e) => handleLocalChange('title', e.target.value)} 
          placeholder="Title" 
          className="border p-2 rounded w-full" 
          autoComplete="off"
        />
        <input 
          value={localForm.department} 
          onChange={(e) => handleLocalChange('department', e.target.value)} 
          placeholder="Department" 
          className="border p-2 rounded w-full" 
          autoComplete="off"
        />
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
          <input type="number" value={localForm.openings ?? ""} onChange={(e) => handleLocalChange('openings', e.target.value)} placeholder="Openings" className="border p-2 rounded w-full" />
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
          <input type="number" value={localForm.salary?.min ?? ""} onChange={(e) => handleLocalSalaryChange('min', e.target.value)} placeholder="Salary Min" className="border p-2 rounded w-full" />
          <input type="number" value={localForm.salary?.max ?? ""} onChange={(e) => handleLocalSalaryChange('max', e.target.value)} placeholder="Salary Max" className="border p-2 rounded w-full" />
        </div>
        {/* Age Bracket (Optional) */}
        <div className="grid grid-cols-2 gap-2">
          <input 
            type="number" 
            value={localForm.ageBracket?.minAge ?? ""} 
            onChange={(e) => handleAgeBracketChange('minAge', e.target.value)} 
            placeholder="Min Age (Optional)" 
            min="18" 
            max="65"
            className="border p-2 rounded w-full" 
          />
          <input 
            type="number" 
            value={localForm.ageBracket?.maxAge ?? ""} 
            onChange={(e) => handleAgeBracketChange('maxAge', e.target.value)} 
            placeholder="Max Age (Optional)" 
            min="18" 
            max="65"
            className="border p-2 rounded w-full" 
          />
        </div>
        {jobErrs.length > 0 && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {jobErrs.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}
        <div className="flex gap-2">
            <button className="px-3 py-2 bg-green-700 text-white rounded disabled:opacity-50" disabled={jobErrs.length > 0}>{editingJobId ? 'Update Job' : 'Create Job'}</button>
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
    </div>
  );
};

export default JobList;

