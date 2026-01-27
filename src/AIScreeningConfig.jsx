import React from "react";

// Default screening criteria
const DEFAULT_SCREENING_CRITERIA = {
    requiredSkills: [],
    preferredSkills: [],
    requiredDegree: "none",
    minExperienceYears: 0,
    maxExperienceYears: null,
    requiredCertifications: [],
    weightEducation: 20,
    weightExperience: 25,
    weightSkills: 35,
    weightCertifications: 10,
    weightCultureFit: 10,
    autoShortlistThreshold: 75,
    autoRejectThreshold: 40,
    screeningMode: "semi-auto"
};

// Degree options
const DEGREE_OPTIONS = [
    { value: "none", label: "No Requirement" },
    { value: "high school", label: "High School" },
    { value: "diploma", label: "Diploma" },
    { value: "bachelor", label: "Bachelor's Degree" },
    { value: "master", label: "Master's Degree" },
    { value: "phd", label: "PhD / Doctorate" },
];

/**
 * AI Screening Configuration Modal
 * Allows HR to configure AI screening criteria for a specific job AFTER publishing
 */
const AIScreeningConfig = ({ job, isOpen, onClose, onSave }) => {
    const [criteria, setCriteria] = React.useState({ ...DEFAULT_SCREENING_CRITERIA });
    const [skillInput, setSkillInput] = React.useState("");
    const [prefSkillInput, setPrefSkillInput] = React.useState("");
    const [certInput, setCertInput] = React.useState("");
    const [isSaving, setIsSaving] = React.useState(false);

    // Load existing criteria when job changes
    React.useEffect(() => {
        if (job?.screeningCriteria) {
            setCriteria({ ...DEFAULT_SCREENING_CRITERIA, ...job.screeningCriteria });
        } else {
            setCriteria({ ...DEFAULT_SCREENING_CRITERIA });
        }
    }, [job]);

    if (!isOpen || !job) return null;

    function handleChange(field, value) {
        setCriteria(prev => ({ ...prev, [field]: value }));
    }

    function addToList(field, value, setInput) {
        if (!value.trim()) return;
        const current = criteria[field] || [];
        if (!current.includes(value.trim())) {
            handleChange(field, [...current, value.trim()]);
        }
        setInput("");
    }

    function removeFromList(field, item) {
        const current = criteria[field] || [];
        handleChange(field, current.filter(s => s !== item));
    }

    async function handleSave() {
        setIsSaving(true);
        try {
            await onSave(job.id, criteria);
            onClose();
        } catch (err) {
            console.error("Failed to save screening criteria:", err);
        } finally {
            setIsSaving(false);
        }
    }

    const totalWeight = (criteria.weightEducation || 0) +
        (criteria.weightExperience || 0) +
        (criteria.weightSkills || 0) +
        (criteria.weightCertifications || 0);

    const isConfigured = job?.screeningCriteria &&
        (job.screeningCriteria.requiredSkills?.length > 0 ||
            job.screeningCriteria.requiredDegree !== "none");

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-600 to-green-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                AI Screening Configuration
                            </h2>
                            <p className="text-green-100 text-sm mt-1">Configure AI criteria for: {job.title}</p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white transition">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-800">
                                <strong>How it works:</strong> The AI will score each applicant based on the criteria you set below.
                                Candidates meeting the shortlist threshold will be automatically recommended for interviews.
                            </div>
                        </div>
                    </div>

                    {/* Required Skills */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Required Skills
                            <span className="font-normal text-gray-500 ml-2">Must-have skills for this role</span>
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={skillInput}
                                onChange={(e) => setSkillInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('requiredSkills', skillInput, setSkillInput))}
                                placeholder="e.g., Python, React, Project Management"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <button
                                type="button"
                                onClick={() => addToList('requiredSkills', skillInput, setSkillInput)}
                                className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                            {(criteria.requiredSkills || []).map((skill, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-full">
                                    {skill}
                                    <button type="button" onClick={() => removeFromList('requiredSkills', skill)} className="hover:text-green-900 font-bold">×</button>
                                </span>
                            ))}
                            {(criteria.requiredSkills || []).length === 0 && (
                                <span className="text-gray-400 text-sm italic">No required skills added yet</span>
                            )}
                        </div>
                    </div>

                    {/* Preferred Skills */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Preferred Skills
                            <span className="font-normal text-gray-500 ml-2">Nice-to-have skills</span>
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={prefSkillInput}
                                onChange={(e) => setPrefSkillInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('preferredSkills', prefSkillInput, setPrefSkillInput))}
                                placeholder="e.g., AWS, Docker, Agile"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                type="button"
                                onClick={() => addToList('preferredSkills', prefSkillInput, setPrefSkillInput)}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                            {(criteria.preferredSkills || []).map((skill, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full">
                                    {skill}
                                    <button type="button" onClick={() => removeFromList('preferredSkills', skill)} className="hover:text-blue-900 font-bold">×</button>
                                </span>
                            ))}
                            {(criteria.preferredSkills || []).length === 0 && (
                                <span className="text-gray-400 text-sm italic">No preferred skills added yet</span>
                            )}
                        </div>
                    </div>

                    {/* Required Certifications */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Required Certifications
                            <span className="font-normal text-gray-500 ml-2">Professional certifications</span>
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={certInput}
                                onChange={(e) => setCertInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToList('requiredCertifications', certInput, setCertInput))}
                                placeholder="e.g., PMP, AWS Certified, CPA"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            <button
                                type="button"
                                onClick={() => addToList('requiredCertifications', certInput, setCertInput)}
                                className="px-4 py-2.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                            {(criteria.requiredCertifications || []).map((cert, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-800 text-sm rounded-full">
                                    {cert}
                                    <button type="button" onClick={() => removeFromList('requiredCertifications', cert)} className="hover:text-purple-900 font-bold">×</button>
                                </span>
                            ))}
                            {(criteria.requiredCertifications || []).length === 0 && (
                                <span className="text-gray-400 text-sm italic">No certifications required</span>
                            )}
                        </div>
                    </div>

                    {/* Education & Experience */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Minimum Education</label>
                            <select
                                value={criteria.requiredDegree || 'none'}
                                onChange={(e) => handleChange('requiredDegree', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                            >
                                {DEGREE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">Minimum Experience (Years)</label>
                            <input
                                type="number"
                                min="0"
                                max="30"
                                value={criteria.minExperienceYears ?? 0}
                                onChange={(e) => handleChange('minExperienceYears', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                        </div>
                    </div>

                    {/* Score Weights */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-800 mb-3">
                            Score Weights
                            <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${totalWeight === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                Total: {totalWeight}%
                            </span>
                        </label>
                        <div className="space-y-3">
                            {[
                                { key: 'weightEducation', label: 'Education', color: 'blue' },
                                { key: 'weightExperience', label: 'Experience', color: 'green' },
                                { key: 'weightSkills', label: 'Skills Match', color: 'purple' },
                                { key: 'weightCertifications', label: 'Certifications', color: 'orange' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-3">
                                    <span className="text-sm text-gray-700 w-28">{label}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={criteria[key] ?? 25}
                                        onChange={(e) => handleChange(key, parseInt(e.target.value))}
                                        className="flex-1 h-2 accent-green-600"
                                    />
                                    <span className="text-sm font-semibold text-gray-800 w-12 text-right">{criteria[key] ?? 25}%</span>
                                </div>
                            ))}
                        </div>
                        {totalWeight !== 100 && (
                            <p className="text-xs text-red-600 mt-2">⚠️ Weights should total 100% for accurate scoring</p>
                        )}
                    </div>

                    {/* Thresholds */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-xl p-4">
                            <label className="block text-sm font-semibold text-green-800 mb-2">
                                Auto-Shortlist Threshold
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="50"
                                    max="100"
                                    value={criteria.autoShortlistThreshold ?? 75}
                                    onChange={(e) => handleChange('autoShortlistThreshold', parseInt(e.target.value))}
                                    className="flex-1 h-2 accent-green-600"
                                />
                                <span className="text-lg font-bold text-green-700">≥{criteria.autoShortlistThreshold ?? 75}%</span>
                            </div>
                            <p className="text-xs text-green-600 mt-2">Candidates above this score are recommended for interviews</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4">
                            <label className="block text-sm font-semibold text-red-800 mb-2">
                                Auto-Reject Threshold
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={criteria.autoRejectThreshold ?? 40}
                                    onChange={(e) => handleChange('autoRejectThreshold', parseInt(e.target.value))}
                                    className="flex-1 h-2 accent-red-600"
                                />
                                <span className="text-lg font-bold text-red-700">≤{criteria.autoRejectThreshold ?? 40}%</span>
                            </div>
                            <p className="text-xs text-red-600 mt-2">Candidates below this score are flagged as not meeting requirements</p>
                        </div>
                    </div>

                    {/* Screening Mode */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-3">Screening Mode</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: 'manual', label: 'Manual', desc: 'AI scores only, you decide everything', icon: '👤' },
                                { value: 'semi-auto', label: 'Semi-Auto', desc: 'AI recommends, you approve', icon: '🤝' },
                                { value: 'auto', label: 'Full Auto', desc: 'AI auto-shortlists & rejects', icon: '🤖' },
                            ].map(mode => (
                                <label
                                    key={mode.value}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition text-center ${criteria.screeningMode === mode.value
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="screeningMode"
                                        value={mode.value}
                                        checked={criteria.screeningMode === mode.value}
                                        onChange={(e) => handleChange('screeningMode', e.target.value)}
                                        className="sr-only"
                                    />
                                    <div className="text-2xl mb-1">{mode.icon}</div>
                                    <div className="text-sm font-semibold text-gray-900">{mode.label}</div>
                                    <div className="text-xs text-gray-500 mt-1">{mode.desc}</div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIScreeningConfig;
