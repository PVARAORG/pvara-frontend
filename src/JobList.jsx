import React from "react";

// TODO: Connect to /api/jobs for job CRUD operations
// Example: fetch('/api/jobs')

const JobList = ({ jobs, onCreate, onEdit, onDelete }) => {
  // Job form state for creating/editing jobs
  const [localForm, setLocalForm] = React.useState({
    title: "",
    department: "",
    grade: "",
    description: "",
    locations: [],
    openings: "1",
    employmentType: "Full-time",
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
  function resetForm() {
    setLocalForm({
      title: "",
      department: "",
      grade: "",
      description: "",
      locations: [],
      openings: "1",
      employmentType: "Full-time",
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
        <textarea 
          value={localForm.description} 
          onChange={(e) => handleLocalChange('description', e.target.value)} 
          placeholder="Description" 
          className="border p-2 rounded w-full" 
          autoComplete="off"
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={localForm.openings ?? ""} onChange={(e) => handleLocalChange('openings', e.target.value)} placeholder="Openings" className="border p-2 rounded w-full" />
          <input value={localForm.employmentType} onChange={(e) => handleLocalChange('employmentType', e.target.value)} placeholder="Employment Type" className="border p-2 rounded w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={localForm.salary?.min ?? ""} onChange={(e) => handleLocalSalaryChange('min', e.target.value)} placeholder="Salary Min" className="border p-2 rounded w-full" />
          <input type="number" value={localForm.salary?.max ?? ""} onChange={(e) => handleLocalSalaryChange('max', e.target.value)} placeholder="Salary Max" className="border p-2 rounded w-full" />
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
                <div className="text-xs text-gray-500">{j.department}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLocalForm({
                      ...j,
                      openings: j.openings !== undefined && j.openings !== null ? String(j.openings) : "",
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
