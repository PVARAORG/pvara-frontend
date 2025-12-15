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
    locations: "",
    openings: "1",
    employmentType: "Full-time",
    salary: { min: "", max: "" },
    fields: {},
  });
  const [editingJobId, setEditingJobId] = React.useState(null);
<<<<<<< Updated upstream
=======
  const [availableTests, setAvailableTests] = React.useState([]);
  const [loadingTests, setLoadingTests] = React.useState(false);
  const [showTestSelector, setShowTestSelector] = React.useState(false);

  // Fetch available tests on component mount
  React.useEffect(() => {
    fetchAvailableTests();
  }, []);

  async function fetchAvailableTests() {
    setLoadingTests(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:6080';
      const response = await axios.get(`${apiUrl}/api/testing/assessments`);
      if (response.data.assessments) {
        setAvailableTests(response.data.assessments);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoadingTests(false);
    }
  }
>>>>>>> Stashed changes

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
      locations: "",
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
    if (!form.grade || !form.grade.trim()) errs.push("Grade required");
    if (!form.description || !form.description.trim()) errs.push("Description required");
    // Locations: parse comma-separated string into array
    const locationsArr = typeof form.locations === 'string'
      ? form.locations.split(',').map(l => l.trim()).filter(Boolean)
      : (form.locations || []);
    if (locationsArr.length === 0) errs.push("At least one location required");
    const openingsNum = form.openings === "" ? null : Number(form.openings);
    if (openingsNum === null || openingsNum <= 0) errs.push("Openings must be > 0");
    // Salary validation
    const salaryMinNum = form.salary?.min === "" ? null : Number(form.salary?.min);
    const salaryMaxNum = form.salary?.max === "" ? null : Number(form.salary?.max);
    if (salaryMinNum === null) errs.push("Salary minimum required");
    if (salaryMaxNum === null) errs.push("Salary maximum required");
    if (salaryMinNum !== null && salaryMaxNum !== null && salaryMinNum > salaryMaxNum) errs.push("Salary min must be <= max");
    return errs;
  }
  const jobErrs = validateJobForm(localForm);

  function handleSubmit(e) {
    e.preventDefault();
    // Convert form values to proper types for backend
    const locationsArr = typeof localForm.locations === 'string'
      ? localForm.locations.split(',').map(l => l.trim()).filter(Boolean)
      : (localForm.locations || []);
    const jobData = {
      title: localForm.title.trim(),
      department: localForm.department.trim(),
      grade: localForm.grade.trim(),
      description: localForm.description.trim(),
      locations: locationsArr,
      openings: Number(localForm.openings) || 1,
      employmentType: localForm.employmentType,
      salary: {
        min: Number(localForm.salary?.min) || 0,
        max: Number(localForm.salary?.max) || 0,
      },
      fields: localForm.fields || {},
      requiredTests: localForm.requiredTests || [],
    };
    if (editingJobId) {
      onEdit({ ...jobData, id: editingJobId });
      resetForm();
      return;
    }
    onCreate({ ...jobData, id: `job-${Date.now()}` });
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
        <div className="grid grid-cols-2 gap-2">
          <input
            value={localForm.grade}
            onChange={(e) => handleLocalChange('grade', e.target.value)}
            placeholder="Grade (e.g., Senior, Junior)"
            className="border p-2 rounded w-full"
            autoComplete="off"
          />
          <input
            value={localForm.locations}
            onChange={(e) => handleLocalChange('locations', e.target.value)}
            placeholder="Locations (comma-separated)"
            className="border p-2 rounded w-full"
            autoComplete="off"
          />
        </div>
        <textarea
          value={localForm.description}
          onChange={(e) => handleLocalChange('description', e.target.value)}
          placeholder="Description"
          className="border p-2 rounded w-full"
          autoComplete="off"
        />
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={localForm.openings ?? ""} onChange={(e) => handleLocalChange('openings', e.target.value)} placeholder="Openings" className="border p-2 rounded w-full" min="1" />
          <input value={localForm.employmentType} onChange={(e) => handleLocalChange('employmentType', e.target.value)} placeholder="Employment Type" className="border p-2 rounded w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" value={localForm.salary?.min ?? ""} onChange={(e) => handleLocalSalaryChange('min', e.target.value)} placeholder="Salary Min" className="border p-2 rounded w-full" min="0" />
          <input type="number" value={localForm.salary?.max ?? ""} onChange={(e) => handleLocalSalaryChange('max', e.target.value)} placeholder="Salary Max" className="border p-2 rounded w-full" min="0" />
        </div>
<<<<<<< Updated upstream
=======

        {/* Required Tests Section */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-700">Required Tests</h4>
            <button
              type="button"
              onClick={() => setShowTestSelector(!showTestSelector)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              {showTestSelector ? 'Hide Tests' : 'Add Tests'}
            </button>
          </div>

          {/* Selected Tests */}
          {localForm.requiredTests.length > 0 ? (
            <div className="space-y-2 mb-3">
              {localForm.requiredTests.map((test) => (
                <div key={test.testId} className="bg-white border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{test.testName}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${test.category === 'technical' ? 'bg-blue-100 text-blue-700' :
                          test.category === 'cognitive' ? 'bg-purple-100 text-purple-700' :
                            test.category === 'personality' ? 'bg-pink-100 text-pink-700' :
                              test.category === 'soft-skills' ? 'bg-green-100 text-green-700' :
                                'bg-orange-100 text-orange-700'
                          }`}>
                          {test.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={test.mandatory}
                            onChange={(e) => updateTestConfig(test.testId, 'mandatory', e.target.checked)}
                          />
                          Mandatory
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <span>Pass Score:</span>
                          <input
                            type="number"
                            value={test.passingScore}
                            onChange={(e) => updateTestConfig(test.testId, 'passingScore', parseInt(e.target.value))}
                            min="0"
                            max="100"
                            className="border rounded px-2 py-0.5 w-16"
                          />
                          <span>%</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTest(test.testId)}
                      className="text-red-600 hover:text-red-800 ml-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-3">No tests selected. Click "Add Tests" to choose assessments.</p>
          )}

          {/* Test Selector */}
          {showTestSelector && (
            <div className="border rounded bg-white p-3 max-h-96 overflow-y-auto">
              {loadingTests ? (
                <p className="text-sm text-gray-500">Loading tests...</p>
              ) : (
                Object.keys(testsByCategory).map((category) => (
                  <div key={category} className="mb-4">
                    <h5 className="font-semibold text-sm text-gray-700 mb-2 capitalize flex items-center gap-2">
                      {category === 'technical' && '💻'}
                      {category === 'cognitive' && '🧠'}
                      {category === 'personality' && '🎭'}
                      {category === 'soft-skills' && '🤝'}
                      {category === 'regulatory' && '📋'}
                      {category}
                    </h5>
                    <div className="space-y-1">
                      {testsByCategory[category].map((test) => {
                        const isSelected = localForm.requiredTests.some(t => t.testId === test.id);
                        return (
                          <button
                            key={test.id}
                            type="button"
                            onClick={() => !isSelected && addTest(test)}
                            disabled={isSelected}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition-all ${isSelected
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'hover:bg-blue-50 border hover:border-blue-300'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium">{test.name}</div>
                                <div className="text-xs text-gray-500">{test.duration_minutes} min • {test.questions_count} questions</div>
                              </div>
                              {isSelected && (
                                <span className="text-green-600 text-xs">✓ Selected</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
                <div className="text-xs text-gray-500">{j.department}</div>
=======
                <div className="text-xs text-gray-500">{j.department} • {j.grade}</div>
                {j.requiredTests && j.requiredTests.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-600 mb-1">Required Tests:</div>
                    <div className="flex flex-wrap gap-1">
                      {j.requiredTests.map((test, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 rounded text-xs ${test.category === 'technical' ? 'bg-blue-100 text-blue-700' :
                            test.category === 'cognitive' ? 'bg-purple-100 text-purple-700' :
                              test.category === 'personality' ? 'bg-pink-100 text-pink-700' :
                                test.category === 'soft-skills' ? 'bg-green-100 text-green-700' :
                                  'bg-orange-100 text-orange-700'
                            }`}
                        >
                          {test.testName} ({test.passingScore}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
>>>>>>> Stashed changes
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLocalForm({
                      ...j,
                      locations: Array.isArray(j.locations) ? j.locations.join(', ') : (j.locations || ''),
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
