import React from "react";
import AIScreeningConfig from "./AIScreeningConfig";

// Discipline options matching backend
const DISCIPLINE_OPTIONS = [
  "IT", "Finance", "Engineering", "Legal",
  "Human Resources", "Marketing", "Operations", "Other"
];

// Employment type options matching backend
const EMPLOYMENT_TYPE_OPTIONS = [
  "Permanent", "Full-time", "Part-time", "Contract", "Internship"
];

// Status options
const STATUS_OPTIONS = [
  { value: "open", label: "Active", color: "bg-green-100 text-green-700" },
  { value: "paused", label: "Paused", color: "bg-yellow-100 text-yellow-700" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-600" }
];

const JobList = ({ jobs, onCreate, onEdit, onDelete, onUpdateScreeningCriteria }) => {
  // Modal state
  const [showModal, setShowModal] = React.useState(false);
  const [editingJobId, setEditingJobId] = React.useState(null);

  // AI Screening Config modal state
  const [showAIConfigModal, setShowAIConfigModal] = React.useState(false);
  const [selectedJobForAI, setSelectedJobForAI] = React.useState(null);

  // Job form state
  const [localForm, setLocalForm] = React.useState({
    title: "",
    discipline: "",
    department: "",
    grade: "",
    description: "",
    locations: [],
    openings: "1",
    employmentType: "Full-time",
    status: "open",
    ageBracket: { minAge: "", maxAge: "" },
    salary: { min: "", max: "" },
    fields: {},
    education: "",
    termsAndConditions: "",
  });

  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [showValidationPopup, setShowValidationPopup] = React.useState(false);
  const [popupErrors, setPopupErrors] = React.useState([]);

  // Search/filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [departmentFilter, setDepartmentFilter] = React.useState("");

  // Get unique departments for filter
  const departments = React.useMemo(() => {
    const depts = [...new Set((jobs || []).map(j => j.department).filter(Boolean))];
    return depts.sort();
  }, [jobs]);

  // Filter jobs
  const filteredJobs = React.useMemo(() => {
    return (jobs || []).filter(job => {
      const matchesSearch = !searchQuery ||
        job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.locations || []).some(l => l.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesDepartment = !departmentFilter || job.department === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [jobs, searchQuery, departmentFilter]);

  function handleLocalChange(field, value) {
    setLocalForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLocalSalaryChange(field, value) {
    setLocalForm((prev) => ({ ...prev, salary: { ...prev.salary, [field]: value } }));
  }

  function handleAgeBracketChange(field, value) {
    setLocalForm((prev) => ({ ...prev, ageBracket: { ...prev.ageBracket, [field]: value } }));
  }

  function openAIConfigModal(job) {
    setSelectedJobForAI(job);
    setShowAIConfigModal(true);
  }

  async function handleSaveScreeningCriteria(jobId, criteria) {
    if (onUpdateScreeningCriteria) {
      await onUpdateScreeningCriteria(jobId, criteria);
    }
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
      status: "open",
      ageBracket: { minAge: "", maxAge: "" },
      salary: { min: "", max: "" },
      fields: {},
      education: "",
      termsAndConditions: "",
    });
    setEditingJobId(null);
    setHasSubmitted(false);
    setShowModal(false);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(job) {
    setLocalForm({
      ...job,
      openings: job.openings !== undefined && job.openings !== null ? String(job.openings) : "",
      discipline: job.discipline || "",
      employmentType: job.employmentType || "Full-time",
      status: job.status || "open",
      ageBracket: {
        minAge: job.ageBracket?.minAge !== undefined && job.ageBracket?.minAge !== null ? String(job.ageBracket.minAge) : "",
        maxAge: job.ageBracket?.maxAge !== undefined && job.ageBracket?.maxAge !== null ? String(job.ageBracket.maxAge) : "",
      },
      salary: {
        min: job.salary?.min !== undefined && job.salary?.min !== null ? String(job.salary.min) : "",
        max: job.salary?.max !== undefined && job.salary?.max !== null ? String(job.salary.max) : "",
      },
      education: job.education || "",
      termsAndConditions: job.termsAndConditions || "",
    });
    setEditingJobId(job.id);
    setShowModal(true);
  }

  // Validation function
  function getFieldErrors(form) {
    const fieldErrors = {};
    if (!form.title || !form.title.trim()) fieldErrors.title = "Title is required";
    if (!form.department || !form.department.trim()) fieldErrors.department = "Department is required";
    const openingsNum = form.openings === "" ? null : Number(form.openings);
    if (openingsNum !== null && openingsNum <= 0) fieldErrors.openings = "Openings must be greater than 0";
    const salaryMinNum = form.salary?.min === "" ? null : Number(form.salary?.min);
    const salaryMaxNum = form.salary?.max === "" ? null : Number(form.salary?.max);
    if (salaryMinNum !== null && salaryMaxNum !== null && salaryMinNum > salaryMaxNum) fieldErrors.salary = "Salary min must be less than or equal to max";
    const minAge = form.ageBracket?.minAge === "" ? null : Number(form.ageBracket?.minAge);
    const maxAge = form.ageBracket?.maxAge === "" ? null : Number(form.ageBracket?.maxAge);
    if (minAge !== null && (minAge < 18 || minAge > 65)) fieldErrors.minAge = "Min age must be 18-65";
    if (maxAge !== null && (maxAge < 18 || maxAge > 65)) fieldErrors.maxAge = "Max age must be 18-65";
    if (minAge !== null && maxAge !== null && minAge > maxAge) fieldErrors.ageBracket = "Min age must be less than or equal to max age";
    return fieldErrors;
  }

  const fieldErrors = hasSubmitted ? getFieldErrors(localForm) : {};

  function handleSubmit(e) {
    e.preventDefault();
    setHasSubmitted(true);

    const errors = getFieldErrors(localForm);
    if (Object.keys(errors).length > 0) {
      setPopupErrors(Object.values(errors));
      setShowValidationPopup(true);
      return;
    }

    if (editingJobId) {
      onEdit({ ...localForm, id: editingJobId });
      resetForm();
      return;
    }

    const jobData = {
      ...localForm,
      id: `job-${Date.now()}`,
      locations: (localForm.locations && localForm.locations.length > 0) ? localForm.locations : ['Remote']
    };
    onCreate(jobData);
    resetForm();
  }

  // Format salary for display
  function formatSalary(salary) {
    if (!salary || (!salary.min && !salary.max)) return null;
    const min = salary.min ? `PKR ${Number(salary.min).toLocaleString()}` : '';
    const max = salary.max ? `PKR ${Number(salary.max).toLocaleString()}` : '';
    if (min && max) return `${min} - ${max}`;
    return min || max;
  }

  // Get status badge styling
  function getStatusStyle(status) {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.color || "bg-gray-100 text-gray-600";
  }

  function getStatusLabel(status) {
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    return statusOption?.label || status;
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{(jobs || []).length}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">{(jobs || []).filter(j => j.status === 'open').length}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paused</p>
              <p className="text-2xl font-bold text-yellow-600">{(jobs || []).filter(j => j.status === 'paused').length}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Openings</p>
              <p className="text-2xl font-bold text-gray-900">{(jobs || []).reduce((sum, j) => sum + (Number(j.openings) || 0), 0)}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Create Button */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs by title, department, or location..."
                className="w-full sm:w-80 pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <button
            onClick={openCreateModal}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Job
          </button>
        </div>
      </div>

      {/* Job Cards */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No jobs found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchQuery || departmentFilter ? "Try adjusting your filters" : "Create your first job posting to get started"}
            </p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusStyle(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                        <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {job.employmentType}
                        </span>
                        {job.discipline && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                            {job.discipline}
                          </span>
                        )}
                        {job.screeningCriteria && (job.screeningCriteria.requiredSkills?.length > 0 || job.screeningCriteria.requiredDegree !== "none") && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            AI Configured
                          </span>
                        )}
                      </div>
                      {job.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {job.department}
                        </span>
                        {(job.locations && job.locations.length > 0) && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.locations.join(", ")}
                          </span>
                        )}
                        {formatSalary(job.salary) && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatSalary(job.salary)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {job.openings || 1} opening{(job.openings || 1) > 1 ? 's' : ''}
                        </span>
                        {job.education && (
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                            </svg>
                            <span className="truncate max-w-[200px]" title={job.education}>{job.education}</span>
                          </span>
                        )}
                      </div>
                      {job.termsAndConditions && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                          <span className="font-medium">📋 T&C:</span> <span className="line-clamp-1">{job.termsAndConditions}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:flex-shrink-0">
                  <button
                    onClick={() => openEditModal(job)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJobForAI(job);
                      setShowAIConfigModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-purple-200 rounded-lg text-sm font-medium text-purple-600 hover:bg-purple-50 transition"
                    title="Configure AI Screening"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    AI Config
                  </button>
                  <button
                    onClick={() => onDelete(job.id)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Job Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => resetForm()}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingJobId ? 'Edit Job Posting' : 'Create New Job Posting'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editingJobId ? 'Update the details of this job listing.' : 'Fill in the details below to create a new job listing.'}
                  </p>
                </div>
                <button
                  onClick={() => resetForm()}
                  className="p-2 hover:bg-gray-100 rounded-lg transition -m-2"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  value={localForm.title}
                  onChange={(e) => handleLocalChange('title', e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                />
                {fieldErrors.title && <p className="text-sm text-red-600 mt-1">{fieldErrors.title}</p>}
              </div>

              {/* Department and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={localForm.department}
                    onChange={(e) => handleLocalChange('department', e.target.value)}
                    placeholder="e.g., Engineering"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.department ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  {fieldErrors.department && <p className="text-sm text-red-600 mt-1">{fieldErrors.department}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location
                  </label>
                  <input
                    value={(localForm.locations || []).join(', ')}
                    onChange={(e) => handleLocalChange('locations', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="e.g., Islamabad"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm"
                  />
                </div>
              </div>

              {/* Employment Type and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Employment Type
                  </label>
                  <select
                    value={localForm.employmentType}
                    onChange={(e) => handleLocalChange('employmentType', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white"
                  >
                    {EMPLOYMENT_TYPE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={localForm.status || 'open'}
                    onChange={(e) => handleLocalChange('status', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Discipline and Openings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Discipline
                  </label>
                  <select
                    value={localForm.discipline}
                    onChange={(e) => handleLocalChange('discipline', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm bg-white"
                  >
                    <option value="">Select Discipline</option>
                    {DISCIPLINE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Openings
                  </label>
                  <input
                    type="number"
                    value={localForm.openings ?? ""}
                    onChange={(e) => handleLocalChange('openings', e.target.value)}
                    placeholder="1"
                    min="1"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.openings ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  {fieldErrors.openings && <p className="text-sm text-red-600 mt-1">{fieldErrors.openings}</p>}
                </div>
              </div>

              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Salary Range (PKR)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={localForm.salary?.min ?? ""}
                    onChange={(e) => handleLocalSalaryChange('min', e.target.value)}
                    placeholder="Min"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.salary ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <input
                    type="number"
                    value={localForm.salary?.max ?? ""}
                    onChange={(e) => handleLocalSalaryChange('max', e.target.value)}
                    placeholder="Max"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.salary ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                </div>
                {fieldErrors.salary && <p className="text-sm text-red-600 mt-1">{fieldErrors.salary}</p>}
              </div>

              {/* Age Bracket (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Age Bracket <span className="text-gray-400">(Optional)</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={localForm.ageBracket?.minAge ?? ""}
                    onChange={(e) => handleAgeBracketChange('minAge', e.target.value)}
                    placeholder="Min Age (18-65)"
                    min="18"
                    max="65"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.minAge || fieldErrors.ageBracket ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                  <input
                    type="number"
                    value={localForm.ageBracket?.maxAge ?? ""}
                    onChange={(e) => handleAgeBracketChange('maxAge', e.target.value)}
                    placeholder="Max Age (18-65)"
                    min="18"
                    max="65"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm ${fieldErrors.maxAge || fieldErrors.ageBracket ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                  />
                </div>
                {(fieldErrors.minAge || fieldErrors.maxAge || fieldErrors.ageBracket) && (
                  <p className="text-sm text-red-600 mt-1">{fieldErrors.minAge || fieldErrors.maxAge || fieldErrors.ageBracket}</p>
                )}
              </div>

              {/* Job Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Job Description
                </label>
                <textarea
                  value={localForm.description}
                  onChange={(e) => handleLocalChange('description', e.target.value)}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm resize-none"
                />
              </div>

              {/* Education Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Education Requirements <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={localForm.education}
                  onChange={(e) => handleLocalChange('education', e.target.value)}
                  placeholder="e.g., Bachelor's degree in Computer Science or related field, Master's preferred..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm resize-none"
                />
              </div>

              {/* Terms and Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Terms & Conditions <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={localForm.termsAndConditions}
                  onChange={(e) => handleLocalChange('termsAndConditions', e.target.value)}
                  placeholder="e.g., Probation period, working hours, travel requirements, bond terms..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition text-sm resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition shadow-sm"
                >
                  {editingJobId ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Validation Error Popup */}
      {showValidationPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={() => setShowValidationPopup(false)}>
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
              className="w-full px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* AI Screening Configuration Modal */}
      {showAIConfigModal && selectedJobForAI && (
        <AIScreeningConfig
          job={selectedJobForAI}
          isOpen={showAIConfigModal}
          onClose={() => {
            setShowAIConfigModal(false);
            setSelectedJobForAI(null);
          }}
          onSave={(jobId, updatedCriteria) => {
            // Update the job with new screening criteria
            if (onUpdateScreeningCriteria) {
              onUpdateScreeningCriteria(jobId, updatedCriteria);
            }
            setShowAIConfigModal(false);
            setSelectedJobForAI(null);
          }}
        />
      )}
    </div>
  );
};

export default JobList;
