import React from "react";
import {
  validateEmail,
  validatePhone,
  validateCNIC,
  validateURL,
  validateTextLength,
  validateAlphabetic,
  validatePostalCode,
  validateYear,
  validateRequired
} from "./utils/validationUtils";

const ApplicationForm = ({ onSubmit, jobs = [] }) => {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [form, setForm] = React.useState({
    jobId: jobs[0]?.id || "",
    // Contact Information
    firstName: "",
    lastName: "",
    preferredName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    cnic: "",
    country: "Pakistan",
    streetAddress1: "",
    streetAddress2: "",
    city: "",
    state: "",
    postalCode: "",
    // Education
    education: [{ school: "", fieldOfStudy: "", degree: "", graduated: "no", stillAttending: false }],
    // Employment
    employment: [{ employer: "", jobTitle: "", currentEmployer: false, startMonth: "", startYear: "", endMonth: "", endYear: "", description: "" }],
    // Skills
    skills: [],
    skillInput: "",
    // Languages
    languages: [{ language: "", proficiency: "Fluent" }],
    // Additional
    coverLetter: "",
    portfolioLink: "",
  });
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  const steps = [
    {
      name: "Resume",
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      name: "Profile Information",
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
    },
    {
      name: "Self-Disclosure",
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
    },
    {
      name: "Review & Submit",
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
  ];

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (touched[field] && errors[field]) {
      validateField(field, value);
    }
  }

  function handleBlur(field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, form[field]);
  }

  function validateField(field, value) {
    let validation = { isValid: true, error: null };

    switch (field) {
      case 'firstName':
      case 'lastName':
        validation = validateAlphabetic(value, true, field === 'firstName' ? 'First name' : 'Last name');
        if (validation.isValid) {
          validation = validateTextLength(value, { min: 2, max: 50, required: true, fieldName: field === 'firstName' ? 'First name' : 'Last name' });
        }
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'phone':
      case 'alternatePhone':
        validation = validatePhone(value);
        if (field === 'alternatePhone' && !value) {
          validation = { isValid: true, error: null }; // Optional
        }
        break;
      case 'cnic':
        validation = validateCNIC(value);
        break;
      case 'city':
      case 'state':
        validation = validateTextLength(value, { min: 2, max: 100, required: true, fieldName: field === 'city' ? 'City' : 'State' });
        break;
      case 'postalCode':
        validation = validatePostalCode(value, true);
        break;
      case 'coverLetter':
        validation = validateTextLength(value, { max: 2000, fieldName: 'Cover letter' });
        break;
      case 'portfolioLink':
        validation = validateURL(value, false);
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [field]: validation.error }));
    return validation.isValid;
  }

  function validateCurrentStep() {
    const stepErrors = {};
    let isValid = true;

    if (currentStep === 0) {
      // Job selection - always valid if there are jobs
      if (!form.jobId && jobs.length > 0) {
        stepErrors.jobId = 'Please select a position';
        isValid = false;
      }
    } else if (currentStep === 1) {
      // Profile Information
      const fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'cnic', 'city', 'state', 'postalCode'];
      fieldsToValidate.forEach(field => {
        const fieldIsValid = validateField(field, form[field]);
        if (!fieldIsValid) {
          isValid = false;
          setTouched((prev) => ({ ...prev, [field]: true }));
        }
      });

      // Validate education (at least first entry must be complete)
      if (form.education[0]) {
        if (!form.education[0].school || !form.education[0].fieldOfStudy || !form.education[0].degree) {
          stepErrors.education = 'Please complete at least one education entry';
          isValid = false;
        }
      }

      // Validate employment (at least first entry must be complete)
      if (form.employment[0]) {
        if (!form.employment[0].employer || !form.employment[0].jobTitle) {
          stepErrors.employment = 'Please complete at least one employment entry';
          isValid = false;
        }
      }
    } else if (currentStep === 2) {
      // Self-Disclosure (optional but validate format if provided)
      if (form.coverLetter) {
        const validation = validateTextLength(form.coverLetter, { max: 2000, fieldName: 'Cover letter' });
        if (!validation.isValid) {
          stepErrors.coverLetter = validation.error;
          isValid = false;
        }
      }
      if (form.portfolioLink) {
        const validation = validateURL(form.portfolioLink, false);
        if (!validation.isValid) {
          stepErrors.portfolioLink = validation.error;
          isValid = false;
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...stepErrors }));
    return isValid;
  }

  function handleArrayChange(arrayName, index, field, value) {
    setForm((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addArrayItem(arrayName, template) {
    setForm((prev) => ({ ...prev, [arrayName]: [...prev[arrayName], template] }));
  }

  function removeArrayItem(arrayName, index) {
    setForm((prev) => ({ ...prev, [arrayName]: prev[arrayName].filter((_, i) => i !== index) }));
  }

  function addSkill() {
    const trimmed = form.skillInput.trim();
    if (!trimmed) return;

    // Check for duplicates
    if (form.skills.includes(trimmed)) {
      setErrors((prev) => ({ ...prev, skillInput: 'Skill already added' }));
      return;
    }

    // Check max skills
    if (form.skills.length >= 50) {
      setErrors((prev) => ({ ...prev, skillInput: 'Maximum 50 skills allowed' }));
      return;
    }

    setForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed], skillInput: "" }));
    setErrors((prev) => ({ ...prev, skillInput: null }));
  }

  function removeSkill(index) {
    setForm((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  function nextStep() {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    }
  }

  function prevStep() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  // Helper function to get input className with validation states
  function getInputClassName(field) {
    const baseClasses = "w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-green-200 transition";
    if (touched[field] && errors[field]) {
      return `${baseClasses} border-red-500 focus:border-red-500`;
    } else if (touched[field] && !errors[field] && form[field]) {
      return `${baseClasses} border-green-500 focus:border-green-500`;
    }
    return `${baseClasses} border-gray-300 focus:border-green-500`;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full mb-2 flex-shrink-0 ${index <= currentStep ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}>
                  {index < currentStep ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step.icon}
                </div>
                <div className={`text-xs font-semibold text-center leading-tight mb-1 ${index <= currentStep ? "text-green-700" : "text-gray-500"}`}>
                  {step.name}
                </div>
                <div className={`text-xs font-medium ${index === currentStep ? "text-green-600" : index < currentStep ? "text-green-500" : "text-gray-400"}`}>
                  {index === currentStep ? "In Progress" : index < currentStep ? "Completed" : "Not Started"}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-shrink-0 w-8 md:w-16 lg:w-24 mt-[-30px] ${index < currentStep ? "bg-green-600" : "bg-gray-300"}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 0: Resume/Job Selection */}
        {currentStep === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Select Position
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Position Applied For *</label>
                <select
                  value={form.jobId}
                  onChange={e => handleChange('jobId', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                  required
                >
                  {jobs.length === 0 ? (
                    <option value="">No jobs available</option>
                  ) : (
                    jobs.map(j => (
                      <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                    ))
                  )}
                </select>
                {jobs.find(j => j.id === form.jobId) && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">{jobs.find(j => j.id === form.jobId).title}</h3>
                    <p className="text-sm text-blue-700">{jobs.find(j => j.id === form.jobId).description}</p>
                    <div className="mt-3 flex gap-4 text-xs text-blue-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {jobs.find(j => j.id === form.jobId).department}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {jobs.find(j => j.id === form.jobId).employmentType}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Profile Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                  <input
                    value={form.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                    onBlur={() => handleBlur('firstName')}
                    className={getInputClassName('firstName')}
                    required
                  />
                  {touched.firstName && errors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                  <input
                    value={form.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    onBlur={() => handleBlur('lastName')}
                    className={getInputClassName('lastName')}
                    required
                  />
                  {touched.lastName && errors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Name</label>
                  <input value={form.preferredName} onChange={e => handleChange('preferredName', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={getInputClassName('email')}
                    required
                  />
                  {touched.email && errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                  <input
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={getInputClassName('phone')}
                    required
                  />
                  {touched.phone && errors.phone && (
                    <p className="text-sm text-red-600 mt-1">{errors.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Alternate Phone</label>
                  <input value={form.alternatePhone} onChange={e => handleChange('alternatePhone', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CNIC (National Identity Card) *
                    <span className="text-xs text-gray-500 ml-2">Format: 12345-1234567-1</span>
                  </label>
                  <input
                    value={form.cnic}
                    onChange={e => {
                      let val = e.target.value.replace(/[^0-9]/g, '');
                      if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
                      if (val.length > 13) val = val.slice(0, 13) + '-' + val.slice(13);
                      if (val.length > 15) val = val.slice(0, 15);
                      handleChange('cnic', val);
                    }}
                    onBlur={() => handleBlur('cnic')}
                    placeholder="12345-1234567-1"
                    pattern="[0-9]{5}-[0-9]{7}-[0-9]{1}"
                    maxLength="15"
                    className={`${getInputClassName('cnic')} font-mono`}
                    required
                  />
                  {touched.cnic && errors.cnic ? (
                    <p className="text-sm text-red-600 mt-1">{errors.cnic}</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">Your CNIC helps us identify your profile and link all your applications</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Country/Region *</label>
                    <input value={form.country} onChange={e => handleChange('country', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address 1</label>
                    <input value={form.streetAddress1} onChange={e => handleChange('streetAddress1', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address 2</label>
                    <input value={form.streetAddress2} onChange={e => handleChange('streetAddress2', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">City/Town *</label>
                      <input
                        value={form.city}
                        onChange={e => handleChange('city', e.target.value)}
                        onBlur={() => handleBlur('city')}
                        className={getInputClassName('city')}
                        required
                      />
                      {touched.city && errors.city && (
                        <p className="text-sm text-red-600 mt-1">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">State/Province *</label>
                      <input
                        value={form.state}
                        onChange={e => handleChange('state', e.target.value)}
                        onBlur={() => handleBlur('state')}
                        className={getInputClassName('state')}
                        required
                      />
                      {touched.state && errors.state && (
                        <p className="text-sm text-red-600 mt-1">{errors.state}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Zip/Postal Code *</label>
                      <input
                        value={form.postalCode}
                        onChange={e => handleChange('postalCode', e.target.value)}
                        onBlur={() => handleBlur('postalCode')}
                        className={getInputClassName('postalCode')}
                        required
                      />
                      {touched.postalCode && errors.postalCode && (
                        <p className="text-sm text-red-600 mt-1">{errors.postalCode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Education Summary */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
                Education Summary
              </h2>
              {form.education.map((edu, index) => (
                <div key={index} className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Education {index + 1}</h3>
                    {form.education.length > 1 && (
                      <button type="button" onClick={() => removeArrayItem('education', index)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">School/Institution *</label>
                      <input value={edu.school} onChange={e => handleArrayChange('education', index, 'school', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Field of Study *</label>
                      <input value={edu.fieldOfStudy} onChange={e => handleArrayChange('education', index, 'fieldOfStudy', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Degree *</label>
                      <select value={edu.degree} onChange={e => handleArrayChange('education', index, 'degree', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" required>
                        <option value="">Select Degree</option>
                        <option value="High School">High School</option>
                        <option value="Associate's">Associate's Degree</option>
                        <option value="Bachelor's">Bachelor's Degree</option>
                        <option value="Master's">Master's Degree</option>
                        <option value="Doctorate">Doctorate</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-4 mt-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={edu.stillAttending} onChange={e => handleArrayChange('education', index, 'stillAttending', e.target.checked)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                        <span className="text-sm font-medium text-gray-700">Still Attending</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('education', { school: "", fieldOfStudy: "", degree: "", graduated: "no", stillAttending: false })} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition">
                + Add Education
              </button>
            </div>

            {/* Employment Summary */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Employment Summary
              </h2>
              {form.employment.map((emp, index) => (
                <div key={index} className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-700">Employment {index + 1}</h3>
                    {form.employment.length > 1 && (
                      <button type="button" onClick={() => removeArrayItem('employment', index)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Employer *</label>
                        <input value={emp.employer} onChange={e => handleArrayChange('employment', index, 'employer', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title *</label>
                        <input value={emp.jobTitle} onChange={e => handleArrayChange('employment', index, 'jobTitle', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" required />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={emp.currentEmployer} onChange={e => handleArrayChange('employment', index, 'currentEmployer', e.target.checked)} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                      <span className="text-sm font-medium text-gray-700">Current Employer</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Month</label>
                        <select value={emp.startMonth} onChange={e => handleArrayChange('employment', index, 'startMonth', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition">
                          <option value="">Month</option>
                          {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year</label>
                        <input type="number" value={emp.startYear} onChange={e => handleArrayChange('employment', index, 'startYear', e.target.value)} placeholder="YYYY" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                      </div>
                      {!emp.currentEmployer && (
                        <>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">End Month</label>
                            <select value={emp.endMonth} onChange={e => handleArrayChange('employment', index, 'endMonth', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition">
                              <option value="">Month</option>
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">End Year</label>
                            <input type="number" value={emp.endYear} onChange={e => handleArrayChange('employment', index, 'endYear', e.target.value)} placeholder="YYYY" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                          </div>
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
                      <textarea value={emp.description} onChange={e => handleArrayChange('employment', index, 'description', e.target.value)} rows="3" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('employment', { employer: "", jobTitle: "", currentEmployer: false, startMonth: "", startYear: "", endMonth: "", endYear: "", description: "" })} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition">
                + Add Employment
              </button>
            </div>

            {/* Skills */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Skills
              </h2>
              <div className="flex gap-2 mb-4">
                <input
                  value={form.skillInput}
                  onChange={e => {
                    handleChange('skillInput', e.target.value);
                    if (errors.skillInput) {
                      setErrors(prev => ({ ...prev, skillInput: null }));
                    }
                  }}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
                />
                <button type="button" onClick={addSkill} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition">
                  Add
                </button>
              </div>
              {errors.skillInput && (
                <p className="text-sm text-red-600 mb-2">{errors.skillInput}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {form.skills.map((skill, index) => (
                  <span key={index} className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {skill}
                    <button type="button" onClick={() => removeSkill(index)} className="text-green-600 hover:text-green-800 font-bold">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Languages Spoken
              </h2>
              {form.languages.map((lang, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200 flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                      <input value={lang.language} onChange={e => handleArrayChange('languages', index, 'language', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Proficiency</label>
                      <select value={lang.proficiency} onChange={e => handleArrayChange('languages', index, 'proficiency', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 transition">
                        <option value="Basic">Basic</option>
                        <option value="Conversational">Conversational</option>
                        <option value="Fluent">Fluent</option>
                        <option value="Native">Native</option>
                      </select>
                    </div>
                  </div>
                  {form.languages.length > 1 && (
                    <button type="button" onClick={() => removeArrayItem('languages', index)} className="text-red-600 hover:text-red-800 text-sm font-medium">
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addArrayItem('languages', { language: "", proficiency: "Fluent" })} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition">
                + Add Language
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Self-Disclosure */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Self-Disclosure (Optional)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Letter</label>
                <textarea
                  value={form.coverLetter}
                  onChange={e => handleChange('coverLetter', e.target.value)}
                  onBlur={() => handleBlur('coverLetter')}
                  rows="6"
                  placeholder="Why are you interested in this position?"
                  className={getInputClassName('coverLetter')}
                  maxLength="2000"
                />
                <div className="flex justify-between items-center mt-1">
                  {touched.coverLetter && errors.coverLetter ? (
                    <p className="text-sm text-red-600">{errors.coverLetter}</p>
                  ) : (
                    <span></span>
                  )}
                  <p className="text-xs text-gray-500">{form.coverLetter.length}/2000 characters</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Portfolio Link</label>
                <input
                  type="url"
                  value={form.portfolioLink}
                  onChange={e => handleChange('portfolioLink', e.target.value)}
                  onBlur={() => handleBlur('portfolioLink')}
                  placeholder="https://..."
                  className={getInputClassName('portfolioLink')}
                />
                {touched.portfolioLink && errors.portfolioLink && (
                  <p className="text-sm text-red-600 mt-1">{errors.portfolioLink}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <svg className="w-7 h-7 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Review Your Application
            </h2>
            <div className="space-y-6">
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <h3 className="font-bold text-lg text-green-900 mb-4">Position</h3>
                <p className="text-green-700">{jobs.find(j => j.id === form.jobId)?.title}</p>
              </div>
              <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="font-bold text-lg text-blue-900 mb-4">Contact</h3>
                <p className="text-blue-700">{form.firstName} {form.lastName}</p>
                <p className="text-blue-600 text-sm">{form.email} • {form.phone}</p>
              </div>
              <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <h3 className="font-bold text-lg text-purple-900 mb-4">Education</h3>
                {form.education.map((edu, i) => (
                  <p key={i} className="text-purple-700 text-sm mb-1">• {edu.degree} in {edu.fieldOfStudy} from {edu.school}</p>
                ))}
              </div>
              <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <h3 className="font-bold text-lg text-orange-900 mb-4">Experience</h3>
                {form.employment.map((emp, i) => (
                  <p key={i} className="text-orange-700 text-sm mb-1">• {emp.jobTitle} at {emp.employer}</p>
                ))}
              </div>
              {form.skills.length > 0 && (
                <div className="p-6 bg-pink-50 border-2 border-pink-200 rounded-lg">
                  <h3 className="font-bold text-lg text-pink-900 mb-4">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-pink-200 text-pink-800 rounded-full text-xs">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <div className="text-sm text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          {currentStep < steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Submit Application
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ApplicationForm;
