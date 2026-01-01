import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import logo from "./logo.png";
import "./index.css";
import { ToastProvider, useToast } from "./ToastContext";
import { AuthProvider, useAuth } from "./AuthContext";
import JobList from "./JobList";
import CandidateList from "./CandidateList";
import MyCandidateApplications from "./MyCandidateApplications";
import CandidateLogin from "./CandidateLogin";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import InterviewRubric from "./InterviewRubric";
import AuditLog from "./AuditLog";
import ApplicationForm from "./ApplicationForm";
import ShortlistPanel from "./ShortlistPanel";
import Toasts from "./Toasts";
import { batchEvaluateApplications } from "./aiScreening";
import LoginInline from "./LoginInline"; // Import validated LoginInline component
import apiClient from "./api/client";
import TestManagement from "./TestManagement";
import { OfferManagementPanel, InterviewSchedulingPanel } from "./AdvancedFeaturesUI";

// ---------- Storage utilities ----------
const STORAGE_KEY = "pvara_v3";
function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch (e) { }
}
function loadState() {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    return r ? JSON.parse(r) : null;
  } catch (e) {
    return null;
  }
}
function arrayToCSV(rows) {
  return rows.map((r) => r.map((c) => '"' + ("" + c).replace(/"/g, '""') + '"').join(",")).join("\n");
}

// ---------- Small UI primitives ----------
function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded w-96 p-4">
        <div className="font-semibold">{title}</div>
        <div className="mt-2 text-sm whitespace-pre-wrap">{message}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-3 py-1 bg-green-700 text-white rounded">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// Success Modal - Centered on screen for important success messages
function SuccessModal({ open, title, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-96 p-6 text-center animate-bounce-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-xl font-bold text-gray-900 mb-2">{title}</div>
        <div className="text-gray-600 mb-6">{message}</div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// Candidate Profile Modal
function CandidateProfileModal({ open, candidate, onClose, jobs }) {
  const [cvExists, setCvExists] = React.useState(null); // null = loading, true/false = result
  const [cvUrl, setCvUrl] = React.useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || "https://pvara-backend.fortanixor.com";

  // Check if CV exists when modal opens
  React.useEffect(() => {
    if (!open || !candidate?.applicant?.cnic) {
      setCvExists(null);
      setCvUrl(null);
      return;
    }

    const cnic = candidate.applicant.cnic;
    // Sanitize CNIC (remove dashes to match saved filename format)
    const cleanCnic = cnic.replace(/-/g, '');

    // Get job title and sanitize it to match backend naming convention
    const job = (jobs || []).find(j => j.id === candidate.jobId);
    if (!job) {
      setCvExists(false);
      setCvUrl(null);
      return;
    }
    const jobTitle = job.title;
    // Sanitize: remove special chars, replace spaces with underscores, lowercase
    const cleanJobTitle = jobTitle
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();

    // Try both .pdf and .docx extensions
    const extensions = ['.pdf', '.docx', '.doc'];

    const checkCvExists = async () => {
      setCvExists(null);

      for (const ext of extensions) {
        // Format: cnic_jobtitle.ext
        const url = `${apiUrl}/uploads/${cleanCnic}_${cleanJobTitle}${ext}`;
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            setCvExists(true);
            setCvUrl(url);
            return;
          }
        } catch (e) {
          // Continue to next extension
        }
      }
      setCvExists(false);
      setCvUrl(null);
    };

    checkCvExists();
  }, [open, candidate, apiUrl, jobs]);

  if (!open || !candidate) return null;
  const c = candidate;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{c.applicant?.name || c.name}</h2>
              <span className={`px-2 py-1 text-xs rounded-full font-semibold ${c.status === 'offer' ? 'bg-green-100 text-green-700' :
                c.status === 'interview' || c.status === 'phone-interview' ? 'bg-blue-100 text-blue-700' :
                  c.status === 'screening' ? 'bg-yellow-100 text-yellow-700' :
                    c.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                }`}>
                {c.status || 'Submitted'}
              </span>
            </div>
            <p className="text-gray-500 mt-1">{c.applicant?.email || c.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Basic Info & Documents */}
          <div className="space-y-6">
            <section>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Personal Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500">Phone</dt><dd className="col-span-2 font-medium">{c.applicant?.phone || '-'}</dd></div>
                <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500">CNIC</dt><dd className="col-span-2 font-medium">{c.applicant?.cnic || '-'}</dd></div>
                <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500">Address</dt><dd className="col-span-2 font-medium">{c.applicant?.address || '-'}</dd></div>
                <div className="grid grid-cols-3 gap-2"><dt className="text-gray-500">LinkedIn</dt><dd className="col-span-2 font-medium text-blue-600 truncate">{c.applicant?.linkedin || '-'}</dd></div>
              </div>
            </section>

            {/* Documents Section - CV Lookup by CNIC */}
            <section>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Documents
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {cvExists === null ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking for CV...
                  </div>
                ) : cvExists && cvUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                      <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">CV / Resume</div>
                        <div className="text-xs text-gray-500">{c.applicant?.cnic?.replace(/-/g, '')}.pdf</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={cvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-center text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View CV
                      </a>
                      <a
                        href={cvUrl}
                        download
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-center text-sm font-medium hover:bg-gray-50 transition flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Download
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    No CV uploaded for this candidate
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: AI & Qualifications */}
          <div className="space-y-6">
            {c.aiScore && (
              <section className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-lg border border-purple-100">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  AI Evaluation
                </h3>
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <span className={`text-4xl font-bold ${c.aiScore >= 75 ? 'text-green-600' : c.aiScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{c.aiScore}</span>
                    <span className="text-xs text-gray-500 uppercase font-semibold mt-1">Score</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 italic bg-white/50 p-2 rounded border border-purple-100">
                      "{c.aiRecommendation}"
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                Qualifications & Experience
              </h3>
              <div className="space-y-3">
                <div className="border rounded-lg p-3">
                  <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Education</span>
                  <div className="font-medium text-gray-900">{c.applicant?.degree || 'No Degree specified'}</div>
                </div>
                <div className="border rounded-lg p-3">
                  <span className="block text-xs text-gray-500 uppercase font-semibold mb-1">Experience</span>
                  <div className="font-medium text-gray-900">{c.applicant?.experienceYears || 0} Years</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Test Data Generator ----------
function generateTestApplications(jobs, baseTime = Date.now()) {
  const firstNames = ["Ahmed", "Fatima", "Ali", "Ayesha", "Hassan", "Zainab", "Usman", "Mariam", "Bilal", "Sana", "Imran", "Nida", "Faisal", "Hira", "Kamran", "Saad", "Aisha", "Omar", "Rabia", "Tariq"];
  const lastNames = ["Khan", "Ahmed", "Ali", "Hassan", "Hussain", "Shah", "Malik", "Rehman", "Iqbal", "Butt", "Siddiqui", "Rizvi", "Farooq", "Aziz", "Raza", "Jamil", "Nadeem", "Karim", "Younis", "Saleem"];
  const degrees = [
    "Bachelor in Computer Science",
    "Master in Finance",
    "Bachelor in Business Administration",
    "Master in Economics",
    "Bachelor in Engineering",
    "Master in Law",
    "Bachelor in Statistics",
    "PhD in Mathematics",
    "Master in Computer Science",
    "Bachelor in Finance",
    "Master in Cybersecurity",
    "Bachelor in Accounting"
  ];
  const cities = ["Islamabad", "Karachi", "Lahore", "Rawalpindi", "Faisalabad", "Peshawar", "Multan"];

  const applications = [];
  const statuses = ["submitted", "screening", "phone-interview", "interview", "offer", "rejected"];

  // Create 3-5 applications per job (all 20 jobs, not just 8)
  jobs.forEach((job, jobIdx) => {
    const numApps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numApps; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@email.com`;

      applications.push({
        id: `app-${baseTime}-${jobIdx}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        jobId: job.id,
        applicant: {
          name: `${firstName} ${lastName}`,
          email: email,
          cnic: `${35000 + Math.floor(Math.random() * 9999)}-${1000000 + Math.floor(Math.random() * 9999999)}-${Math.floor(Math.random() * 10)}`,
          phone: `+92-30${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 9000000) + 1000000}`,
          degree: degrees[Math.floor(Math.random() * degrees.length)],
          experienceYears: Math.floor(Math.random() * 15) + 3,
          address: `${Math.floor(Math.random() * 200) + 1} Street ${Math.floor(Math.random() * 50)}, ${cities[Math.floor(Math.random() * cities.length)]}`,
          linkedin: Math.random() > 0.3 ? `linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}` : "",
        },
        resumeUrl: `resume_${firstName}_${lastName}.pdf`,
        coverLetterUrl: Math.random() > 0.4 ? `cover_${firstName}_${lastName}.pdf` : undefined,
        status: statuses[Math.min(Math.floor(Math.random() * statuses.length), 5)],
        aiScore: Math.floor(Math.random() * 40) + 60,
        createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        notes: [],
      });
    }
  });

  return applications;
}

// ---------- Default state ----------
function defaultState() {
  const jobs = [
    {
      id: "job-1733450000001",
      title: "Director General - Virtual Assets Oversight",
      department: "Executive Leadership",
      grade: "DG",
      createdAt: "2025-12-05T09:00:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 15, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Lead the national Virtual Assets Regulatory Authority (PVARA), setting strategy for licensing, supervision, and enforcement across VASPs, exchanges, and custodians.",
      locations: ["Islamabad"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 900000, max: 1200000 },
      status: "open",
    },
    {
      id: "job-1733450000002",
      title: "Director - Licensing & Authorizations",
      department: "Licensing",
      grade: "Director",
      createdAt: "2025-12-04T15:30:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 12, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Own end-to-end authorization of virtual asset service providers (VASPs), including fit-and-proper assessments, capital adequacy, and travel-rule readiness.",
      locations: ["Islamabad"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 650000, max: 850000 },
      status: "open",
    },
    {
      id: "job-1733450000003",
      title: "Director - Supervision & Compliance",
      department: "Supervision",
      grade: "Director",
      createdAt: "2025-12-04T12:10:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 12, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Lead ongoing supervision of VASPs, exchanges, custodians, and wallet providers with on-site/remote inspections and risk-based monitoring.",
      locations: ["Islamabad", "Karachi"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 620000, max: 820000 },
      status: "open",
    },
    {
      id: "job-1733450000004",
      title: "Director - Enforcement & Investigations",
      department: "Enforcement",
      grade: "Director",
      createdAt: "2025-12-03T18:40:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 12, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Oversee complex investigations, sanctions, and remediation for AML/CFT breaches, market abuse, and consumer protection violations in virtual assets.",
      locations: ["Islamabad"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 650000, max: 850000 },
      status: "open",
    },
    {
      id: "job-1733450000005",
      title: "Director - Policy & Standards (Virtual Assets)",
      department: "Policy",
      grade: "Director",
      createdAt: "2025-12-03T10:15:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 10, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Shape national policy for virtual assets, align with FATF travel rule, IOSCO recommendations, and develop prudential/market conduct standards.",
      locations: ["Islamabad"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 580000, max: 780000 },
      status: "open",
    },
    {
      id: "job-1733450000006",
      title: "Director - Technology & Cybersecurity",
      department: "Technology",
      grade: "Director",
      createdAt: "2025-12-02T14:00:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 10, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Set cybersecurity baseline for VASPs, penetration testing standards, key management, cold/warm wallet controls, and incident reporting protocols.",
      locations: ["Karachi", "Islamabad"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 600000, max: 800000 },
      status: "open",
    },
    {
      id: "job-1733450000007",
      title: "Deputy Director - Licensing (Exchanges & Custodians)",
      department: "Licensing",
      grade: "Deputy Director",
      createdAt: "2025-12-02T09:20:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 8, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Lead evaluations of exchange and custodian license applications, focusing on custody controls, segregation of client assets, and solvency.",
      locations: ["Islamabad"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 380000, max: 520000 },
      status: "open",
    },
    {
      id: "job-1733450000008",
      title: "Deputy Director - Supervision (VASP Monitoring)",
      department: "Supervision",
      grade: "Deputy Director",
      createdAt: "2025-12-01T17:10:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 8, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Perform risk-based supervision, thematic reviews, and remediation tracking for licensed VASPs across Pakistan.",
      locations: ["Karachi", "Lahore"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 360000, max: 500000 },
      status: "open",
    },
    {
      id: "job-1733450000009",
      title: "Deputy Director - Enforcement (Digital Forensics)",
      department: "Enforcement",
      grade: "Deputy Director",
      createdAt: "2025-12-01T11:00:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 8, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Lead blockchain forensic investigations, seizure protocols, evidence preservation, and coordination with FIUs and law enforcement.",
      locations: ["Islamabad", "Karachi"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 380000, max: 520000 },
      status: "open",
    },
    {
      id: "job-1733450000010",
      title: "Deputy Director - Policy (Travel Rule & FATF Alignment)",
      department: "Policy",
      grade: "Deputy Director",
      createdAt: "2025-11-30T16:40:00.000Z",
      fields: {
        degreeRequired: { value: "Master", mandatory: true },
        minExperience: { value: 7, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Draft and socialize travel rule guidance, sanction-screening requirements, and cross-border information sharing standards.",
      locations: ["Islamabad"],
      openings: 1,
      employmentType: "Full-time",
      salary: { min: 340000, max: 480000 },
      status: "open",
    },
    {
      id: "job-1733450000011",
      title: "Assistant Director - Licensing (Retail VASP)",
      department: "Licensing",
      grade: "Assistant Director",
      createdAt: "2025-11-30T10:25:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 5, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Review retail VASP applications, client asset safeguarding plans, outsourcing arrangements, and operational resilience.",
      locations: ["Islamabad", "Karachi"],
      openings: 3,
      employmentType: "Full-time",
      salary: { min: 240000, max: 360000 },
      status: "open",
    },
    {
      id: "job-1733450000012",
      title: "Assistant Director - Supervision (Exchange Operations)",
      department: "Supervision",
      grade: "Assistant Director",
      createdAt: "2025-11-29T14:00:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 5, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Monitor exchange uptime, liquidity, market integrity controls, proof-of-reserves attestations, and incident reporting.",
      locations: ["Karachi", "Lahore"],
      openings: 3,
      employmentType: "Full-time",
      salary: { min: 230000, max: 340000 },
      status: "open",
    },
    {
      id: "job-1733450000013",
      title: "Assistant Director - Enforcement (Blockchain Forensics)",
      department: "Enforcement",
      grade: "Assistant Director",
      createdAt: "2025-11-28T19:00:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 4, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Conduct tracing of illicit flows, wallet clustering, and chain analytics to support enforcement actions and SAR escalation.",
      locations: ["Islamabad", "Karachi"],
      openings: 3,
      employmentType: "Full-time",
      salary: { min: 220000, max: 320000 },
      status: "open",
    },
    {
      id: "job-1733450000014",
      title: "Assistant Director - Policy (Stablecoins & Tokenization)",
      department: "Policy",
      grade: "Assistant Director",
      createdAt: "2025-11-28T09:30:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 4, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Develop guardrails for stablecoins, tokenized assets, disclosure standards, and consumer protection around virtual asset offerings.",
      locations: ["Islamabad"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 210000, max: 320000 },
      status: "open",
    },
    {
      id: "job-1733450000015",
      title: "Senior Analyst - Blockchain Forensics",
      department: "Enforcement",
      grade: "Scale-8",
      createdAt: "2025-11-27T15:00:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 4, mandatory: true },
        uploads: { value: { cv: true, coverLetter: false }, mandatory: true },
      },
      description: "Execute investigations using chain analytics tools (Chainalysis/ELLIPTIC), trace ransomware flows, and support cross-border cooperation.",
      locations: ["Karachi", "Islamabad"],
      openings: 3,
      employmentType: "Full-time",
      salary: { min: 180000, max: 260000 },
      status: "open",
    },
    {
      id: "job-1733450000016",
      title: "Senior Analyst - Market Surveillance (Crypto)",
      department: "Supervision",
      grade: "Scale-8",
      createdAt: "2025-11-27T09:30:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 4, mandatory: true },
        uploads: { value: { cv: true, coverLetter: false }, mandatory: true },
      },
      description: "Monitor trade surveillance alerts, wash trading patterns, spoofing/layering, and suspicious volume movements across exchanges.",
      locations: ["Karachi"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 170000, max: 250000 },
      status: "open",
    },
    {
      id: "job-1733450000017",
      title: "Senior Legal Counsel - Virtual Assets",
      department: "Legal",
      grade: "Scale-9",
      createdAt: "2025-11-26T16:15:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 8, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Draft regulatory instruments, enforcement orders, and licensing conditions; advise on cross-border cooperation and data sharing agreements.",
      locations: ["Islamabad"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 320000, max: 460000 },
      status: "open",
    },
    {
      id: "job-1733450000018",
      title: "Senior Risk Officer - VASP Oversight",
      department: "Risk",
      grade: "Scale-8",
      createdAt: "2025-11-26T10:00:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 6, mandatory: true },
        uploads: { value: { cv: true, coverLetter: false }, mandatory: true },
      },
      description: "Perform ICAAP reviews for VASPs, stress testing of liquidity/market risk, and validate risk-control self assessments.",
      locations: ["Islamabad", "Lahore"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 190000, max: 280000 },
      status: "open",
    },
    {
      id: "job-1733450000019",
      title: "Lead Cloud Security Architect (RegTech)",
      department: "Technology",
      grade: "Scale-9",
      createdAt: "2025-11-25T17:45:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 8, mandatory: true },
        uploads: { value: { cv: true, coverLetter: true }, mandatory: true },
      },
      description: "Design secure cloud reference architectures for supervisory tech, SIEM/SOAR pipelines, and zero-trust access for regulator tooling.",
      locations: ["Karachi", "Islamabad"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 300000, max: 430000 },
      status: "open",
    },
    {
      id: "job-legacy-sse",
      title: "Senior Software Engineer",
      department: "Engineering",
      grade: "SSE",
      createdAt: "2024-01-01T00:00:00.000Z",
      fields: {
        degreeRequired: { value: "Bachelor", mandatory: true },
        minExperience: { value: 5, mandatory: true },
        uploads: { value: { cv: true, coverLetter: false }, mandatory: true },
      },
      description: "Build and maintain core platform services for the recruitment portal, ensuring reliability and performance.",
      locations: ["Islamabad", "Remote"],
      openings: 2,
      employmentType: "Full-time",
      salary: { min: 220000, max: 380000 },
      status: "open",
    },
  ];

  // Generate test applications for demo
  const testApplications = generateTestApplications(jobs);

  return {
    jobs,
    applications: testApplications,
    candidates: [], // Array of candidate profiles keyed by CNIC
    shortlists: [],
    audit: [],
    settings: { scoring: { education: 40, experience: 40, interview: 20 } }
  };
}

// ---------- App ----------
const emptyJobForm = {
  title: "",
  department: "",
  grade: "",
  description: "",
  locations: [],
  openings: "1",
  employmentType: "Full-time",
  salary: { min: "", max: "" },
  fields: {},
};

// Job Button Component for HR Review Panel (separate component to use hooks properly)
function JobButton({ job, stats, isSelected, onSelectJob }) {
  return (
    <button
      onClick={() => onSelectJob(job.id)}
      className={`w-full text-left p-3 rounded-lg border-2 transition ${isSelected
        ? 'border-green-700 bg-green-50'
        : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
        }`}
    >
      <div className="font-semibold text-sm text-gray-800 mb-1">{job.title}</div>
      <div className="text-xs text-gray-500 mb-2">{job.department}</div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-green-700">{stats.total}</span>
        <div className="flex gap-1">
          {stats.submitted > 0 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {stats.submitted} new
            </span>
          )}
          {stats.interview > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
              {stats.interview} int
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// Two-Panel HR Review with Job Selection
function HRReviewPanel({ jobs, applications, onStatusChange, onAIEvaluate, onBulkAction, onAddNote, onExport, selectedJobId, onSelectJob, onSelectCandidate }) {
  // Use the first job if none selected
  const currentJobId = selectedJobId || jobs[0]?.id || null;

  // Auto-select first job on mount if none selected
  React.useEffect(() => {
    if (!selectedJobId && jobs[0]?.id) {
      onSelectJob(jobs[0].id);
    }
  }, []);

  const selectedJob = jobs.find(j => j.id === currentJobId);
  const filteredApplications = applications.filter(app => app.jobId === currentJobId);

  // Calculate stats per job
  const jobStats = jobs.map(job => {
    const jobApps = applications.filter(app => app.jobId === job.id);
    return {
      jobId: job.id,
      total: jobApps.length,
      submitted: jobApps.filter(a => a.status === 'submitted').length,
      screening: jobApps.filter(a => a.status === 'screening').length,
      interview: jobApps.filter(a => a.status === 'interview' || a.status === 'phone-interview').length,
      rejected: jobApps.filter(a => a.status === 'rejected').length,
      offer: jobApps.filter(a => a.status === 'offer').length,
    };
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Left Panel - Job List */}
      <div className="w-80 flex-shrink-0 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Open Positions</h2>
        <div className="space-y-2">
          {jobs.map(job => {
            const stats = jobStats.find(s => s.jobId === job.id);
            const isSelected = currentJobId === job.id;
            return (
              <JobButton
                key={job.id}
                job={job}
                stats={stats}
                isSelected={isSelected}
                onSelectJob={onSelectJob}
              />
            );
          })}
        </div>
      </div>

      {/* Right Panel - Applications for Selected Job */}
      <div className="flex-1 bg-white rounded-lg shadow-lg p-6 overflow-y-auto">
        {selectedJob ? (
          <>
            {/* Job Header */}
            <div className="mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedJob.title}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {selectedJob.department}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {selectedJob.employmentType}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {filteredApplications.length} applicant{filteredApplications.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Applications List */}
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium">No applications yet for this position</p>
              </div>
            ) : (
              <CandidateList
                candidates={filteredApplications}
                onStatusChange={onStatusChange}
                onAIEvaluate={() => onAIEvaluate()}
                onBulkAction={onBulkAction}
                onAddNote={onAddNote}
                onExport={onExport}
                onSelectCandidate={onSelectCandidate}
              />
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Select a job position to view applications
          </div>
        )}
      </div>
    </div>
  );
}

function PvaraPhase2() {
  const [state, setState] = useState(() => loadState() || defaultState());
  useEffect(() => saveState(state), [state]);

  const auth = useAuth();
  const user = auth?.user ?? null;
  const { addToast } = useToast();

  // Candidate session (CNIC-based login)
  const [candidateSession, setCandidateSession] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Handle candidate login (CNIC + phone/email verification)
  const handleCandidateLogin = useCallback((credentials) => {
    const { cnic, phone, email } = credentials;

    // Find candidate profile by CNIC
    const candidate = (state.candidates || []).find(c => c.cnic === cnic);

    if (!candidate) {
      addToast("No applications found with this CNIC. Please apply first.", { type: "error" });
      return;
    }

    // Verify phone or email
    const verificationValue = phone || email;
    const verificationField = phone ? 'phone' : 'email';

    if (verificationField === 'phone' && candidate.phone !== verificationValue) {
      addToast("Phone number does not match our records.", { type: "error" });
      return;
    }

    if (verificationField === 'email' && !candidate.emails.includes(verificationValue)) {
      addToast("Email does not match our records.", { type: "error" });
      return;
    }

    // Login successful
    setCandidateSession(candidate);
    setView("my-apps");
    addToast(`Welcome back, ${candidate.name}!`, { type: "success" });
  }, [state.candidates, addToast]);

  // Generate test applications
  const handleGenerateTestData = useCallback(() => {
    const testApps = generateTestApplications(state.jobs);
    setState(prev => ({
      ...prev,
      applications: [...prev.applications, ...testApps]
    }));
    addToast(`Generated ${testApps.length} test applications`, "success");
  }, [state.jobs, addToast]);

  // AI Batch Evaluation
  const handleAIEvaluation = useCallback(() => {
    const unevaluatedCount = state.applications.filter(
      app => app.status === 'submitted' || !app.aiScore
    ).length;

    if (unevaluatedCount === 0) {
      addToast("All applications already evaluated", "info");
      return;
    }

    const evaluatedApps = batchEvaluateApplications(state.applications, state.jobs);
    setState(prev => ({
      ...prev,
      applications: evaluatedApps,
      audit: [
        ...prev.audit,
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: user?.username || 'system',
          action: 'AI_BATCH_EVALUATION',
          details: `Evaluated ${unevaluatedCount} applications using AI`,
        }
      ]
    }));
    setSuccessModal({ open: true, title: "AI Evaluation Complete!", message: `Successfully evaluated ${unevaluatedCount} application(s).` });
  }, [state.applications, state.jobs, user, addToast]);

  const [view, setView] = useState("jobs");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [editingJobId, setEditingJobId] = useState(null);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [appForm, setAppForm] = useState({
    jobId: (state.jobs && state.jobs[0]) ? state.jobs[0].id : "",
    name: "",
    email: "",
    cnic: "",
    phone: "",
    degree: "",
    experienceYears: "",
    address: "",
    linkedin: "",
  });
  const fileRef = useRef(null);
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });
  const [drawer, setDrawer] = useState({ open: false, app: null });
  const [hrSearch, setHrSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [selectedApps, setSelectedApps] = useState([]);
  const [selectedJobForAI, setSelectedJobForAI] = useState(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [selectedJobForHR, setSelectedJobForHR] = useState(null);
  const [successModal, setSuccessModal] = useState({ open: false, title: "", message: "" });
  const handleSelectJobForAI = useCallback((value) => setSelectedJobForAI(value), []);

  // Memoized handlers to prevent input focus loss
  // eslint-disable-next-line no-unused-vars
  const handleAppFormChange = useCallback((field, value) => {
    setAppForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleJobFormChange = useCallback((field, value) => {
    setJobForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSalaryChange = useCallback((field, value) => {
    setJobForm((prev) => ({ ...prev, salary: { ...prev.salary, [field]: value } }));
  }, []);

  const handleHrSearchChange = useCallback((value) => {
    setHrSearch(value);
  }, []);

  const handleJobSearchChange = useCallback((value) => {
    setJobSearch(value);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const createJob = useCallback((jobData) => {
    // Handle both event (from form) and job object (from JobList component)
    if (jobData && typeof jobData.preventDefault === 'function') {
      jobData.preventDefault();
    }

    // If jobData is a job object (from JobList), use it directly
    if (jobData && jobData.title && !jobData.preventDefault) {
      const j = { ...jobData, createdAt: jobData.createdAt || new Date().toISOString() };
      setState((s) => ({ ...s, jobs: [j, ...(s.jobs || [])] }));
      audit("create-job", { jobId: j.id, title: j.title });
      setSuccessModal({ open: true, title: "Job Created Successfully!", message: `"${j.title}" has been added to the job listings.` });
      return;
    }

    // Original form-based logic
    if (editingJobId) {
      const updated = { ...normalizeJobFormForSave(jobForm), id: editingJobId };
      setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === editingJobId ? updated : j)) }));
      audit("update-job", { jobId: editingJobId, title: updated.title });
      setSuccessModal({ open: true, title: "Job Updated Successfully!", message: `"${updated.title}" has been updated.` });
      setEditingJobId(null);
      setJobForm(emptyJobForm);
      return;
    }

    const j = { ...normalizeJobFormForSave(jobForm), id: `job-${Date.now()}`, createdAt: new Date().toISOString(), status: 'open' };
    setState((s) => ({ ...s, jobs: [j, ...(s.jobs || [])] }));
    audit("create-job", { jobId: j.id, title: j.title });
    setJobForm(emptyJobForm);
    setSuccessModal({ open: true, title: "Job Created Successfully!", message: `"${j.title}" has been added to the job listings.` });
  }, [editingJobId, jobForm, addToast, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const audit = useCallback((action, details) => {
    // CORRECTED: use a template literal so JS parses it
    const rec = { id: `au-${Date.now()}`, action, details, ts: new Date().toISOString(), user: user?.username || "anon" };
    setState((s) => ({ ...s, audit: [rec, ...(s.audit || [])] }));
  }, [user]);

  function normalizeJobFormForSave(form) {
    const openingsNum = form.openings === "" ? null : Number(form.openings);
    const salaryMinNum = form.salary?.min === "" ? null : Number(form.salary?.min);
    const salaryMaxNum = form.salary?.max === "" ? null : Number(form.salary?.max);
    return {
      ...form,
      openings: openingsNum ?? 1,
      salary: {
        min: salaryMinNum ?? 0,
        max: salaryMaxNum ?? 0,
      },
    };
  }

  const updateJob = useCallback((jobData) => {
    if (jobData && jobData.id) {
      setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === jobData.id ? jobData : j)) }));
      audit("update-job", { jobId: jobData.id, title: jobData.title });
      setSuccessModal({ open: true, title: "Job Updated!", message: `Job has been updated successfully.` });
      setEditingJobId(null);
      setJobForm(emptyJobForm);
    }
  }, [addToast, state]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteJob = useCallback((jobId) => {
    setState((s) => ({ ...s, jobs: (s.jobs || []).filter((j) => j.id !== jobId) }));
    audit("delete-job", { jobId });
    addToast("Job deleted", { type: "info" });
  }, [addToast, state]); // eslint-disable-line react-hooks/exhaustive-deps

  function submitApplication(formData) {
    // Handle both event (from internal form) and form data (from ApplicationForm component)
    if (formData && typeof formData.preventDefault === 'function') {
      formData.preventDefault();
      formData = null; // Use appForm state instead
    }

    let applicantData = formData || appForm;

    // Transform ApplicationForm data structure if needed
    if (applicantData.firstName || applicantData.education) {
      const primaryEducation = applicantData.education?.[0] || {};
      const primaryEmployment = applicantData.employment?.[0] || {};

      applicantData = {
        jobId: applicantData.jobId,
        name: `${applicantData.firstName || ''} ${applicantData.lastName || ''}`.trim() || applicantData.name,
        email: applicantData.email,
        cnic: applicantData.cnic || 'N/A',
        phone: applicantData.phone,
        degree: primaryEducation.degree || applicantData.degree || 'Not specified',
        experienceYears: applicantData.experienceYears ||
          (primaryEmployment.startYear ? new Date().getFullYear() - parseInt(primaryEmployment.startYear) : 0),
        address: applicantData.streetAddress1 || applicantData.address || `${applicantData.city}, ${applicantData.state}`.trim(),
        linkedin: applicantData.portfolioLink || applicantData.linkedin || '',
        // Keep CV data - THIS IS CRITICAL
        cvFile: applicantData.cvFile,
        cvUrl: applicantData.cvUrl,
        cv: applicantData.cv,
        // Keep additional data
        education: applicantData.education,
        employment: applicantData.employment,
        skills: applicantData.skills,
        languages: applicantData.languages,
        coverLetter: applicantData.coverLetter,
      };
    }

    const job = (state.jobs || []).find((j) => j.id === applicantData.jobId);
    if (!job) {
      addToast("Select job", { type: "error" });
      return;
    }

    const errs = [];
    const jf = job.fields || {};
    if (jf.degreeRequired?.mandatory && !applicantData.degree) errs.push("Degree required");
    if (jf.minExperience?.mandatory && !(Number(applicantData.experienceYears) >= Number(jf.minExperience.value))) errs.push("Min experience not met");
    const files = fileRef.current?.files ? Array.from(fileRef.current.files) : [];
    // Check for CV: file input OR cvFile object OR cvUrl (from AI extraction upload) OR cv field
    const hasCvFile = files.some((f) => /\.pdf$|\.docx?$|\.doc$/i.test(f.name)) || applicantData.cvFile;
    const hasCvUrl = applicantData.cvUrl || applicantData.cv;
    if (jf.uploads?.value?.cv && !hasCvFile && !hasCvUrl) errs.push("CV required");

    if (errs.length) {
      setConfirm({
        open: true,
        title: "Validation",
        message: errs.join("\n") + "\nSubmit anyway?",
        onConfirm: () => {
          finalizeApplication(job, files, true, applicantData);
          setConfirm({ open: false, title: "", message: "", onConfirm: null });
        },
      });
      return;
    }

    finalizeApplication(job, files, false, applicantData);
  }

  function finalizeApplication(job, files, manual, applicantData) {
    const data = applicantData || appForm;
    const filesNames = (files || []).map((f) => f.name);

    // Check if candidate profile exists by CNIC
    const cnic = data.cnic || 'N/A';
    let candidate = (state.candidates || []).find(c => c.cnic === cnic);

    // Check for duplicate application to same job
    if (candidate) {
      const existingApp = (state.applications || []).find(
        app => app.applicant.cnic === cnic && app.jobId === job.id
      );
      if (existingApp) {
        addToast(`You have already applied to ${job.title}`, { type: "warning" });
        return;
      }
    }

    const app = {
      id: `app-${Date.now()}`,
      jobId: job.id,
      applicant: { ...data },
      files: filesNames,
      status: manual ? "manual-review" : "submitted",
      createdAt: new Date().toISOString(),
      screeningErrors: manual ? ["failed mandatory checks"] : [],
    };

    // Create or update candidate profile
    if (!candidate) {
      candidate = {
        cnic: cnic,
        name: data.name,
        phone: data.phone,
        primaryEmail: data.email,
        emails: [data.email],
        applications: [app.id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, candidates: [...(s.candidates || []), candidate] }));
    } else {
      // Update existing candidate profile
      setState((s) => ({
        ...s,
        candidates: (s.candidates || []).map(c => {
          if (c.cnic === cnic) {
            return {
              ...c,
              // Update name and phone if changed
              name: data.name,
              phone: data.phone,
              // Add new email if different
              emails: c.emails.includes(data.email) ? c.emails : [...c.emails, data.email],
              // Link application
              applications: [...c.applications, app.id],
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        })
      }));
    }
    setState((s) => ({ ...s, applications: [app, ...(s.applications || [])] }));
    audit("submit-app", { appId: app.id, jobId: job.id, status: app.status });
    setAppForm({ jobId: state.jobs[0]?.id || "", name: "", email: "", cnic: "", phone: "", degree: "", experienceYears: "", address: "", linkedin: "" });
    if (fileRef.current) fileRef.current.value = null;
    setSuccessModal({ open: true, title: "Application Submitted!", message: `Your application for "${job.title}" has been submitted successfully.` });

    // Redirect to My Applications page after 1 second
    setTimeout(() => {
      setView("my-apps");
    }, 1500);

    // Send confirmation email
    const emailData = {
      to: data.email,
      templateType: "APPLICATION_RECEIVED",
      data: {
        candidateName: data.name,
        jobTitle: job.title,
      },
    };

    const apiUrl = process.env.REACT_APP_API_URL || "https://pvara-backend.fortanixor.com";
    fetch(`${apiUrl}/api/email/send-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          console.log(`📧 Confirmation email sent to ${data.email}`);
        } else {
          console.log("📧 Email service unavailable (backend not running)");
        }
      })
      .catch((err) => {
        console.log("📧 Email service unavailable:", err.message);
      });
  }

  // Simple job form validator (inline validations)
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

  // Change application status (shortlist, interview, reject, hired, etc.)
  // Sequential workflow: submitted → hr-review → screening → testing → interview → offer → hired/rejected
  const WORKFLOW_STAGES = [
    'submitted', 'hr-review', 'screening', 'ai-reviewed', 'shortlisted',
    'testing', 'testing-complete', 'interview', 'interview-complete', 'offer', 'hired'
  ];

  function canTransitionTo(currentStatus, targetStatus) {
    // Rejection is always allowed
    if (targetStatus === 'rejected') return true;

    // Get indices
    const currentIndex = WORKFLOW_STAGES.indexOf(currentStatus);
    const targetIndex = WORKFLOW_STAGES.indexOf(targetStatus);

    // If either status is not in the workflow, allow (for backwards compatibility)
    if (currentIndex === -1 || targetIndex === -1) return true;

    // Allow moving forward by at most 2 stages (to allow some flexibility)
    // or allow moving backwards (for corrections)
    return targetIndex <= currentIndex + 2;
  }

  function changeApplicationStatus(appId, status, note) {
    // Get current application to validate transition
    const currentApp = (state.applications || []).find(a => a.id === appId);
    if (currentApp && !canTransitionTo(currentApp.status, status)) {
      addToast(`Cannot skip stages! Current: ${currentApp.status}. Complete previous stages first.`, { type: 'error' });
      return;
    }

    setState((s) => {
      const apps = (s.applications || []).map((a) => (a.id === appId ? { ...a, status, screeningErrors: status === 'rejected' ? [note || 'Rejected by reviewer'] : (a.screeningErrors || []) } : a));
      return { ...s, applications: apps };
    });
    audit("change-app-status", { appId, status, note });
    setSuccessModal({ open: true, title: "Status Updated!", message: `Application status changed to "${status}".` });
    setDrawer((d) => (d.open && d.app && d.app.id === appId ? { ...d, app: { ...d.app, status } } : d));

    // Send status update email
    const app = (state.applications || []).find((a) => a.id === appId);
    if (app && app.applicant && app.applicant.email) {
      const emailTemplates = {
        shortlisted: "APPLICATION_SHORTLISTED",
        interviewed: "INTERVIEW_SCHEDULED",
        rejected: "REJECTION",
      };

      const templateType = emailTemplates[status];
      if (templateType) {
        const job = (state.jobs || []).find((j) => j.id === app.jobId);
        const emailData = {
          to: app.applicant.email,
          templateType,
          data: {
            candidateName: app.applicant.name,
            jobTitle: job?.title || "Position",
          },
        };

        const apiUrl = process.env.REACT_APP_API_URL || "https://pvara-backend.fortanixor.com";
        fetch(`${apiUrl}/api/email/send-template`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailData),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              console.log(`📧 Status email sent to ${app.applicant.email}`);
            }
          })
          .catch((err) => console.log("📧 Email unavailable:", err.message));
      }
    }
  }

  // Bulk action handler
  const handleBulkAction = useCallback((selectedIds, action) => {
    setState((s) => ({
      ...s,
      applications: (s.applications || []).map(app =>
        selectedIds.includes(app.id) ? { ...app, status: action } : app
      )
    }));
    audit("bulk-action", { selectedIds, action, count: selectedIds.length });
    setSuccessModal({ open: true, title: "Bulk Action Complete!", message: `${selectedIds.length} candidate(s) moved to "${action}".` });
  }, [addToast, audit]);

  // Add note to application
  const handleAddNote = useCallback((candidateId, noteText) => {
    const note = {
      id: `note-${Date.now()}`,
      text: noteText,
      author: user?.name || user?.username || 'Unknown',
      timestamp: new Date().toISOString()
    };

    setState((s) => ({
      ...s,
      applications: (s.applications || []).map(app =>
        app.id === candidateId
          ? { ...app, notes: [...(app.notes || []), note] }
          : app
      )
    }));
    audit("add-note", { candidateId, noteText: noteText.substring(0, 50) });
    setSuccessModal({ open: true, title: "Note Added!", message: "Your note has been saved successfully." });
  }, [addToast, user, audit]);

  // Export candidates to CSV
  const handleExport = useCallback((candidatesToExport) => {
    const headers = [
      'Name', 'Email', 'CNIC', 'Phone', 'Degree', 'Experience (Years)',
      'Status', 'AI Score', 'AI Recommendation', 'Applied Date', 'Notes Count'
    ];

    const rows = candidatesToExport.map(c => [
      c.applicant?.name || c.name || '',
      c.applicant?.email || c.email || '',
      c.applicant?.cnic || '',
      c.applicant?.phone || '',
      c.applicant?.degree || c.degree || '',
      c.applicant?.experienceYears || c.experienceYears || '',
      c.status || 'submitted',
      c.aiScore || '',
      c.aiRecommendation || '',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '',
      c.notes?.length || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidates-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    addToast(`Exported ${candidatesToExport.length} candidate(s)`, { type: "success" });
  }, [addToast]);

  // openDrawer accepts either an application object or an id and always resolves latest state
  function openDrawer(appOrId) {
    const app = typeof appOrId === 'string' ? (state.applications || []).find((x) => x.id === appOrId) : appOrId;
    setDrawer({ open: true, app });
  }
  function closeDrawer() {
    setDrawer({ open: false, app: null });
  }

  // Handle interview evaluation submission with AI score calculation
  function submitInterviewEvaluation(evaluation) {
    const candidate = state.applications.find(a => a.id === evaluation.candidateId);
    if (!candidate) return;

    // Calculate interview score (1-10 weighted average)
    const interviewScore = Object.values(evaluation.scores).reduce((a, b) => a + b) / Object.keys(evaluation.scores).length;

    setState((s) => {
      const apps = (s.applications || []).map((a) =>
        a.id === evaluation.candidateId
          ? {
            ...a,
            interviewScore: Math.round(interviewScore * 10),
            interviewNotes: evaluation.notes,
            interviewedAt: evaluation.timestamp,
            evaluationScores: evaluation.scores,
          }
          : a
      );
      return { ...s, applications: apps };
    });

    audit("submit-evaluation", { appId: evaluation.candidateId, score: Math.round(interviewScore * 10) });
    addToast("Interview evaluation saved", { type: "success" });
    closeDrawer();
  }

  function toggleSelectApp(appId) {
    setSelectedApps((s) => (s.includes(appId) ? s.filter((x) => x !== appId) : [...s, appId]));
  }

  function createShortlist(jobId, applicantIds) {
    const scoring = state.settings.scoring;
    const selected = (state.applications || []).filter((a) => applicantIds.includes(a.id));
    const scored = selected.map((a) => {
      const eduMatch = a.applicant.degree ? 1 : 0;
      const expScore = Math.min((Number(a.applicant.experienceYears) || 0) / 10, 1);
      const interviewScore = (a.interviewScore || 0) / 10;
      const total = eduMatch * scoring.education + expScore * scoring.experience + interviewScore * scoring.interview;
      return { ...a, score: Math.round(total) };
    });
    const sorted = scored.sort((a, b) => b.score - a.score);
    const sl = { id: `sl-${Date.now()}`, jobId, items: sorted.map((s) => ({ applicantId: s.id, score: s.score })), createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, shortlists: [sl, ...(s.shortlists || [])] }));
    audit("create-shortlist", { shortlistId: sl.id, count: sl.items.length });
  }

  // eslint-disable-next-line no-unused-vars
  function exportShortlistCSV(slId) {
    const sl = state.shortlists.find((s) => s.id === slId);
    if (!sl) return addToast("Shortlist not found", { type: "error" });
    const rows = [["Name", "Email", "Score"]];
    sl.items.forEach((i) => {
      const a = state.applications.find((x) => x.id === i.applicantId);
      rows.push([a.applicant.name, a.applicant.email, i.score]);
    });
    const csv = arrayToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortlist-${slId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- UI components ----------
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function Sidebar() {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 glass-button text-gray-800 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Overlay for mobile */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`fixed lg:static w-72 glass-sidebar text-gray-800 min-h-screen p-6 flex flex-col z-40 transition-transform duration-300 shadow-2xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex items-center gap-3 mb-8">
            <img src={logo} alt="PVARA" className="h-10" />
            <div>
              <div className="font-display font-bold text-2xl text-green-700">PVARA</div>
              <div className="text-xs text-gray-600 font-medium tracking-wide">RECRUITMENT</div>
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {/* Public Candidate Portal - Always Visible */}
            <div className="text-xs uppercase font-semibold text-gray-500 px-3 py-2 mb-1">For Candidates</div>
            <button onClick={() => { setView("jobs"); setMobileMenuOpen(false); setSelectedJobId(null); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "jobs" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              Browse Jobs
            </button>
            <button onClick={() => { setView("apply"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "apply" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              Apply Now
            </button>
            <button onClick={() => { setView("candidate-login"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "candidate-login" || view === "my-apps" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg>
              Track My Applications
            </button>

            {/* Staff Portal - Only for logged-in HR/Admin */}
            {user && (
              <>
                <div className="border-t border-gray-300/50 mt-4 pt-4 mb-2">
                  <div className="text-xs uppercase font-semibold text-gray-500 px-3 py-1">Staff Portal</div>
                </div>
                <button onClick={() => { setView("dashboard"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "dashboard" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
                  Dashboard
                </button>
              </>
            )}
            {auth.hasRole('admin') && (
              <button onClick={() => { setView("admin"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "admin" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                Admin
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("hr"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "hr" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                HR Review
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("ai-screening"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "ai-screening" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
                AI Screening
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("test-management"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "test-management" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                Test Management
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("interview-management"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "interview-management" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Interview Management
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("offer-management"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "offer-management" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                Offer Management
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("analytics"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "analytics" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                Analytics
              </button>
            )}
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("shortlists"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "shortlists" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2" /></svg>
                Shortlists
              </button>
            )}
            {auth.hasRole(['hr', 'admin']) && (
              <button onClick={() => { setView("audit"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "audit" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h6" /><path d="M9 11h6" /><path d="M9 15h4" /></svg>
                Audit Log
              </button>
            )}

          </nav>

          <div className="mt-4 text-xs text-gray-700">
            {user ? (
              <div className="mt-auto glass-card p-4 rounded-lg">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <strong>{user.name}</strong>
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  Role: <span className="font-semibold text-green-700">{user.role}</span>
                </div>
                <button
                  onClick={() => {
                    auth.logout();
                    setView("dashboard");
                  }}
                  className="text-xs px-3 py-1.5 glass-button rounded-lg hover:shadow-md transition-all font-medium flex items-center gap-2 w-full justify-center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                  Logout
                </button>
              </div>
            ) : (
              <div className="mt-auto">
                <LoginInline
                  onLogin={async (cred) => {
                    const res = await auth.login(cred);
                    if (!res.ok) addToast(res.message || "Login failed", { type: 'error' });
                    else setView("dashboard");
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  function Header({ title }) {
    return (
      <div className="bg-white p-4 rounded shadow-sm mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-green-800">{title}</h2>
            <div className="text-sm text-gray-500">Enterprise Recruitment Portal</div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input placeholder="Search applications..." value={hrSearch} onChange={(e) => handleHrSearchChange(e.target.value)} className="border p-2 rounded w-full sm:w-64" />
            <div className="text-sm text-gray-600 whitespace-nowrap">{(state.applications || []).length} applications</div>
          </div>
        </div>
      </div>
    );
  }

  // DashboardView removed - now handled by AnalyticsDashboard component

  // ApplyView removed - now handled by ApplicationForm component

  const JobFormComponent = memo(({ jobForm, editingJobId, validateJobForm, handleJobFormChange, handleSalaryChange, createJob, setJobForm, setEditingJobId }) => {
    // Use local state to track input values independently
    const [localForm, setLocalForm] = useState(jobForm);

    // Sync local state when jobForm prop changes (e.g., when editing)
    useEffect(() => {
      setLocalForm(jobForm);
    }, [editingJobId, jobForm]);

    const handleLocalChange = useCallback((field, value) => {
      setLocalForm(prev => ({ ...prev, [field]: value }));
      // Also update parent state for validation
      handleJobFormChange(field, value);
    }, [handleJobFormChange]);

    const handleLocalSalaryChange = useCallback((field, value) => {
      setLocalForm(prev => ({ ...prev, salary: { ...prev.salary, [field]: value } }));
      handleSalaryChange(field, value);
    }, [handleSalaryChange]);

    const jobErrs = validateJobForm(localForm);
    return (
      <form onSubmit={createJob} className="space-y-2">
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
            onClick={() => {
              setLocalForm(emptyJobForm);
              setJobForm(emptyJobForm);
            }}
            className="px-3 py-2 border rounded"
          >
            Reset
          </button>
          {editingJobId && (
            <button
              type="button"
              onClick={() => {
                setEditingJobId(null);
                setLocalForm(emptyJobForm);
                setJobForm(emptyJobForm);
              }}
              className="px-3 py-2 border rounded text-sm"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    );
  });
  JobFormComponent.displayName = 'JobFormComponent';

  const ApplicationFormComponent = memo(({ appForm, setAppForm, submitApplication, fileRef, state, handleAppFormChange }) => {
    // Use local state to track input values independently
    const [localForm, setLocalForm] = useState(appForm);

    useEffect(() => {
      setLocalForm(appForm);
    }, [appForm]);

    const handleLocalChange = useCallback((field, value) => {
      setLocalForm(prev => ({ ...prev, [field]: value }));
      handleAppFormChange(field, value);
    }, [handleAppFormChange]);

    return (
      <form onSubmit={submitApplication} className="space-y-3">
        <select value={localForm.jobId} onChange={(e) => handleLocalChange('jobId', e.target.value)} className="border p-2 rounded w-full text-sm md:text-base">
          {(state.jobs || []).map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} — {j.department}
            </option>
          ))}
        </select>

        <input className="border p-2 rounded w-full text-sm md:text-base" placeholder="Full name" value={localForm.name} onChange={(e) => handleLocalChange('name', e.target.value)} required />
        <input className="border p-2 rounded w-full text-sm md:text-base" placeholder="Email" type="email" value={localForm.email} onChange={(e) => handleLocalChange('email', e.target.value)} required />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={localForm.cnic} onChange={(e) => handleLocalChange('cnic', e.target.value)} placeholder="CNIC" className="border p-2 rounded w-full" />
          <input value={localForm.phone} onChange={(e) => handleLocalChange('phone', e.target.value)} placeholder="Phone" className="border p-2 rounded w-full" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input value={localForm.degree} onChange={(e) => handleLocalChange('degree', e.target.value)} placeholder="Degree" className="border p-2 rounded w-full" />
          <input value={localForm.experienceYears} onChange={(e) => handleLocalChange('experienceYears', e.target.value)} placeholder="Years" type="number" className="border p-2 rounded w-full" />
        </div>

        <input value={localForm.linkedin} onChange={(e) => handleLocalChange('linkedin', e.target.value)} placeholder="LinkedIn profile (optional)" className="border p-2 rounded w-full" />
        <textarea value={localForm.address} onChange={(e) => handleLocalChange('address', e.target.value)} placeholder="Address" className="border p-2 rounded w-full" />

        <div>
          <label className="block mb-1">Upload (CV / other)</label>
          <input ref={fileRef} type="file" multiple />
        </div>

        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-green-700 text-white rounded">
            Submit
          </button>
          <button
            type="button"
            onClick={() => {
              setLocalForm({
                jobId: (state.jobs && state.jobs[0]) ? state.jobs[0].id : "",
                name: "",
                email: "",
                cnic: "",
                phone: "",
                degree: "",
                experienceYears: "",
                address: "",
                linkedin: "",
              });
              setAppForm({
                jobId: (state.jobs && state.jobs[0]) ? state.jobs[0].id : "",
                name: "",
                email: "",
                cnic: "",
                phone: "",
                degree: "",
                experienceYears: "",
                address: "",
                linkedin: "",
              });
              if (fileRef.current) fileRef.current.value = null;
            }}
            className="px-3 py-2 border rounded"
          >
            Reset
          </button>
        </div>
      </form>
    );
  });
  ApplicationFormComponent.displayName = 'ApplicationFormComponent';

  // eslint-disable-next-line no-unused-vars
  function CandidateView() {
    // In a demo without real user accounts, show all applications
    // In production, filter by user.email or user.id
    const myApplications = (state.applications || []);

    const getJobTitle = (jobId) => {
      const job = (state.jobs || []).find((j) => j.id === jobId);
      return job ? job.title : "Unknown Position";
    };

    const getStatusColor = (status) => {
      const colors = {
        "submitted": "bg-blue-50 text-blue-700 border-blue-200",
        "manual-review": "bg-yellow-50 text-yellow-700 border-yellow-200",
        "screening": "bg-purple-50 text-purple-700 border-purple-200",
        "interviewed": "bg-orange-50 text-orange-700 border-orange-200",
        "shortlisted": "bg-green-50 text-green-700 border-green-200",
        "hired": "bg-emerald-50 text-emerald-700 border-emerald-200",
        "rejected": "bg-red-50 text-red-700 border-red-200",
      };
      return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
    };

    return (
      <div>
        <Header title="My Applications" />
        <div className="bg-white p-4 rounded shadow">
          {myApplications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">No applications yet</div>
              <button
                onClick={() => setView("apply")}
                className="px-4 py-2 bg-green-700 text-white rounded"
              >
                Apply Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Total Applications: <strong>{myApplications.length}</strong>
              </div>
              {myApplications.map((app) => (
                <div key={app.id} className="border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-lg mb-2">
                        {getJobTitle(app.jobId)}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        <div>
                          <strong>Applicant:</strong> {app.applicant.name}
                        </div>
                        <div>
                          <strong>Email:</strong> {app.applicant.email}
                        </div>
                        <div>
                          <strong>Applied:</strong> {new Date(app.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Application ID:</strong> {app.id}
                        </div>
                        {app.screeningErrors && app.screeningErrors.length > 0 && (
                          <div className="mt-2">
                            <strong className="text-red-600">Issues:</strong>
                            <ul className="list-disc list-inside text-red-600">
                              {app.screeningErrors.map((err, i) => (
                                <li key={i} className="text-xs">{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded border text-sm font-medium whitespace-nowrap ml-4 ${getStatusColor(app.status)}`}>
                      {app.status.replace(/-/g, " ").toUpperCase()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // eslint-disable-next-line no-unused-vars
  function AdminView() {
    if (!user || user.role !== "admin") return <div>Access denied</div>;
    return (
      <div>
        <Header title="Admin - Create Job" />
        <div className="bg-white p-4 rounded shadow">
          <JobFormComponent
            jobForm={jobForm}
            editingJobId={editingJobId}
            validateJobForm={validateJobForm}
            handleJobFormChange={handleJobFormChange}
            handleSalaryChange={handleSalaryChange}
            createJob={createJob}
            setJobForm={setJobForm}
            setEditingJobId={setEditingJobId}
          />

          <div className="mt-4">
            <h4 className="font-semibold">Existing Jobs</h4>
            {(state.jobs || []).map((j) => (
              <div key={j.id} className="border p-2 rounded mt-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{j.title}</div>
                    <div className="text-xs text-gray-500">{j.department}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs">{new Date(j.createdAt).toLocaleDateString()}</div>
                    <button
                      onClick={() => {
                        setJobForm({
                          ...j,
                          openings: j.openings !== undefined && j.openings !== null ? String(j.openings) : "",
                          salary: {
                            min: j.salary?.min !== undefined && j.salary?.min !== null ? String(j.salary.min) : "",
                            max: j.salary?.max !== undefined && j.salary?.max !== null ? String(j.salary.max) : "",
                          },
                        });
                        setEditingJobId(j.id);
                        window.scrollTo?.(0, 0);
                      }}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteJob(j.id)} className="px-2 py-1 border rounded text-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line no-unused-vars
  function HRView() {
    if (!user || (user.role !== "hr" && user.role !== "admin" && user.role !== "recruiter")) return <div>Access denied</div>;
    const apps = (state.applications || []).filter((a) =>
      (a.applicant.name || "").toLowerCase().includes(hrSearch.toLowerCase()) ||
      (a.applicant.email || "").toLowerCase().includes(hrSearch.toLowerCase())
    );

    return (
      <div>
        <Header title="HR Review" />
        <div className="bg-white p-4 rounded shadow">
          {apps.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {hrSearch ? `No applications match "${hrSearch}"` : "No applications yet"}
              </div>
              {!hrSearch && (state.applications || []).length > 0 && (
                <div className="text-xs text-gray-400 mt-2">
                  Total in system: {(state.applications || []).length}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((a) => (
                <div key={a.id} className="p-3 border rounded bg-gray-50 hover:shadow transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{a.applicant.name}</div>
                      <div className="text-xs text-gray-500">{a.applicant.email}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        Applied: {new Date(a.createdAt).toLocaleDateString()} | Status: <span className="font-medium">{a.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button onClick={() => openDrawer(a)} className="px-2 py-1 border rounded text-sm hover:bg-gray-100">
                        View
                      </button>
                      <button
                        onClick={() => toggleSelectApp(a.id)}
                        className={`px-2 py-1 rounded text-sm ${selectedApps.includes(a.id) ? 'bg-green-700 text-white border-green-700' : 'border'}`}
                      >
                        {selectedApps.includes(a.id) ? "✓ Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 flex gap-2 pt-3 border-t">
                <button
                  onClick={() => {
                    if (!selectedApps.length) {
                      addToast("Select applicants first", { type: 'error' });
                      return;
                    }
                    const jobId = state.applications.find((x) => x.id === selectedApps[0])?.jobId;
                    createShortlist(jobId, selectedApps);
                    setSelectedApps([]);
                    addToast("Shortlist created", { type: 'success' });
                  }}
                  className="px-3 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50"
                  disabled={selectedApps.length === 0}
                >
                  Create Shortlist ({selectedApps.length} selected)
                </button>
                <button
                  onClick={() => setSelectedApps([])}
                  className="px-3 py-2 border rounded hover:bg-gray-100"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ShortlistsView removed - now handled by ShortlistPanel component

  // AuditView removed - now handled by AuditLog component

  // AIScreeningView removed - now handled by InterviewRubric component

  // AnalyticsView removed - now handled by AnalyticsDashboard component

  // Advanced Features View Functions
  // Advanced Features View Functions removed (undefined components)

  // Public Job Board View
  function JobBoardView() {
    const [currentPage, setCurrentPage] = React.useState(1);
    const jobsPerPage = 6;

    const openJobs = (state.jobs || []).filter((j) => j.status === "open");
    const normalizedSearch = jobSearch.trim().toLowerCase();

    const visibleJobs = React.useMemo(() => {
      if (!normalizedSearch) return openJobs;
      return openJobs.filter((j) => {
        const haystack = [
          j.title,
          j.department,
          Array.isArray(j.locations) ? j.locations.join(" ") : "",
          j.description,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
    }, [openJobs, normalizedSearch]);

    // Reset to page 1 when search changes
    React.useEffect(() => {
      setCurrentPage(1);
    }, [normalizedSearch]);

    const totalPages = Math.ceil(visibleJobs.length / jobsPerPage);
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    const paginatedJobs = visibleJobs.slice(startIndex, endIndex);

    const handleJobSearchSubmit = useCallback((e) => {
      if (e?.preventDefault) e.preventDefault();
    }, []);

    if (selectedJobId) {
      const job = openJobs.find((j) => j.id === selectedJobId);
      if (!job) {
        setSelectedJobId(null);
        return null;
      }

      return (
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setSelectedJobId(null)}
            className="mb-6 flex items-center gap-2 glass-button px-4 py-2 rounded-lg text-gray-800 hover:text-green-700 font-medium hover:shadow-md transition-all"
          >
            ← Back to All Jobs
          </button>

          <div className="glass-strong rounded-xl shadow-2xl overflow-hidden">
            {/* Job Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-8">
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <div className="flex flex-wrap gap-4 text-green-100">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                  {job.department}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                  {job.locations.join(', ')}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                  {job.employmentType}
                </span>
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                  ₨{job.salary.min.toLocaleString()} - ₨{job.salary.max.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Job Details */}
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-3">About the Role</h2>
                <p className="text-gray-700 leading-relaxed">{job.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 glass-card rounded-lg">
                  <h3 className="font-semibold text-green-700 mb-2">📍 Location</h3>
                  <p className="text-gray-700">{job.locations.join(', ')}</p>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <h3 className="font-semibold text-blue-700 mb-2">👥 Openings</h3>
                  <p className="text-gray-700">{job.openings} position{job.openings > 1 ? 's' : ''} available</p>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <h3 className="font-semibold text-purple-700 mb-2">💼 Employment Type</h3>
                  <p className="text-gray-700">{job.employmentType}</p>
                </div>
                <div className="p-4 glass-card rounded-lg">
                  <h3 className="font-semibold text-orange-700 mb-2">🎓 Requirements</h3>
                  <p className="text-gray-700">
                    {job.fields?.degreeRequired?.value && `${job.fields.degreeRequired.value} degree`}
                    {job.fields?.minExperience?.value && `, ${job.fields.minExperience.value}+ years exp`}
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t">
                <button
                  onClick={() => {
                    setView('apply');
                    setAppForm(prev => ({ ...prev, jobId: job.id }));
                  }}
                  className="w-full md:w-auto px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg transition shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Apply for this Position →
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="font-display text-6xl font-bold text-gray-800 mb-3">Join Our Team</h1>
          <p className="text-xl text-gray-700 mb-6">Explore exciting opportunities and grow your career with PVARA</p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4">
            <form onSubmit={handleJobSearchSubmit} className="glass-card rounded-xl shadow-lg p-1 flex items-center">
              <svg className="w-5 h-5 text-gray-500 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search jobs by title, department, or location..."
                className="flex-1 px-4 py-3 bg-transparent border-none outline-none text-gray-800 placeholder-gray-500"
                value={jobSearch}
                onChange={(e) => handleJobSearchChange(e.target.value)}
                aria-label="Search jobs"
              />
              <button type="submit" className="glass-button px-6 py-2 rounded-lg font-medium text-gray-800 hover:text-green-700 transition mr-1">
                Search
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="glass-button inline-block px-4 py-2 rounded-full text-sm font-medium text-gray-800">
              {visibleJobs.length} open position{visibleJobs.length !== 1 ? 's' : ''} available
            </div>
          </div>
        </div>

        {visibleJobs.length === 0 ? (
          <div className="glass-card rounded-lg shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Open Positions</h3>
            <p className="text-gray-500">{normalizedSearch ? `No roles match "${jobSearch}"` : "Check back soon for new opportunities!"}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6">
              {paginatedJobs.map(job => (
                <div
                  key={job.id}
                  className="glass-card rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border-2 border-white/30 hover:border-green-400 cursor-pointer"
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 mb-2 hover:text-green-700 transition">
                          {job.title}
                        </h2>
                        <div className="flex flex-wrap gap-3 mb-3">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                            {job.department}
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                            {job.locations.join(', ')}
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                            {job.employmentType}
                          </span>
                        </div>
                        <p className="text-gray-600 line-clamp-2 mb-3">{job.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>💰 ₨{job.salary.min.toLocaleString()} - ₨{job.salary.max.toLocaleString()}</span>
                          <span>👥 {job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJobId(job.id);
                          }}
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition whitespace-nowrap"
                        >
                          View Details →
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJobForApply(job.id);
                            setView('apply');
                          }}
                          className="px-6 py-2 border-2 border-green-600 text-green-600 rounded-lg hover:bg-green-50 font-medium transition whitespace-nowrap"
                        >
                          Quick Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="glass-button px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition"
                >
                  ← Previous
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === page
                          ? 'bg-green-700 text-white shadow-lg'
                          : 'glass-button hover:shadow-md'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="glass-button px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }



  // Two-Panel HR Review with Job Selection


  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen p-4 md:p-6 lg:ml-0 pt-16 lg:pt-6">
        <div className="flex-1">
          {/* Modularized views for maintainability */}
          {view === "jobs" && <JobBoardView />}
          {view === "dashboard" && <AnalyticsDashboard state={state} onGenerateTestData={handleGenerateTestData} />}
          {view === "apply" && <ApplicationForm onSubmit={submitApplication} jobs={state.jobs} selectedJobId={selectedJobForApply} />}
          {(view === "candidate-login" || view === "my-apps") && !candidateSession && (
            <CandidateLogin
              onLogin={handleCandidateLogin}
              onCancel={() => setView("jobs")}
            />
          )}
          {view === "my-apps" && candidateSession && (
            <MyCandidateApplications
              applications={state.applications}
              candidateProfile={candidateSession}
              jobs={state.jobs}
            />
          )}
          {view === "admin" && <JobList jobs={state.jobs} onCreate={createJob} onEdit={updateJob} onDelete={deleteJob} />}
          {view === "hr" && (
            <HRReviewPanel
              jobs={state.jobs}
              applications={state.applications}
              onStatusChange={changeApplicationStatus}
              onAIEvaluate={handleAIEvaluation}
              onBulkAction={handleBulkAction}
              onAddNote={handleAddNote}
              onExport={handleExport}
              selectedJobId={selectedJobForHR}
              onSelectJob={setSelectedJobForHR}
              onSelectCandidate={setSelectedCandidate}
            />
          )}
          {view === "ai-screening" && <InterviewRubric rubric={state.rubric} onEvaluate={handleAIEvaluation} jobs={state.jobs} applications={state.applications} selectedJobForAI={selectedJobForAI} handleSelectJobForAI={handleSelectJobForAI} />}
          {view === "test-management" && (
            <TestManagement
              applications={(state.applications || []).filter(app =>
                ['ai-reviewed', 'screening', 'shortlisted', 'testing', 'testing-complete'].includes(app.status)
              )}
              jobs={state.jobs}
              onUpdateApplication={(appId, updates) => {
                setState(s => ({
                  ...s,
                  applications: (s.applications || []).map(app =>
                    app.id === appId ? { ...app, ...updates } : app
                  )
                }));
              }}
              onMoveToInterview={(appId) => {
                changeApplicationStatus(appId, 'interview');
              }}
              onRefreshApplications={() => { }}
            />
          )}
          {view === "interview-management" && (
            <div>
              <div className="bg-white p-4 rounded shadow-sm mb-4">
                <h2 className="text-xl md:text-2xl font-semibold text-green-800">Interview Management</h2>
                <p className="text-sm text-gray-500">Schedule and manage candidate interviews</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <InterviewSchedulingPanel />
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-semibold mb-3">📋 Candidates Ready for Interview</h3>
                  <div className="space-y-2">
                    {(state.applications || [])
                      .filter(app => ['testing-complete', 'interview'].includes(app.status))
                      .map(app => (
                        <div key={app.id} className="p-3 border rounded hover:shadow transition">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{app.applicant?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{app.applicant?.email}</div>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${app.status === 'interview' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                {app.status.replace('-', ' ')}
                              </span>
                              {app.status === 'interview' && (
                                <button
                                  onClick={() => changeApplicationStatus(app.id, 'interview-complete')}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Complete
                                </button>
                              )}
                              {app.status === 'interview-complete' && (
                                <button
                                  onClick={() => changeApplicationStatus(app.id, 'offer')}
                                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                  Move to Offer
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {(state.applications || []).filter(app => ['testing-complete', 'interview'].includes(app.status)).length === 0 && (
                      <div className="text-center py-8 text-gray-500">No candidates ready for interview</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === "offer-management" && (
            <div>
              <div className="bg-white p-4 rounded shadow-sm mb-4">
                <h2 className="text-xl md:text-2xl font-semibold text-green-800">Offer Management</h2>
                <p className="text-sm text-gray-500">Generate and track job offers</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OfferManagementPanel applications={state.applications} />
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-semibold mb-3">🎯 Candidates Ready for Offer</h3>
                  <div className="space-y-2">
                    {(state.applications || [])
                      .filter(app => ['interview-complete', 'offer'].includes(app.status))
                      .map(app => (
                        <div key={app.id} className="p-3 border rounded hover:shadow transition">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{app.applicant?.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{app.applicant?.email}</div>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 text-xs rounded ${app.status === 'offer' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                                {app.status.replace('-', ' ')}
                              </span>
                              {app.status === 'offer' && (
                                <>
                                  <button
                                    onClick={() => changeApplicationStatus(app.id, 'hired')}
                                    className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                  >
                                    Hire
                                  </button>
                                  <button
                                    onClick={() => changeApplicationStatus(app.id, 'rejected', 'Offer declined')}
                                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    {(state.applications || []).filter(app => ['interview-complete', 'offer'].includes(app.status)).length === 0 && (
                      <div className="text-center py-8 text-gray-500">No candidates ready for offer</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {view === "analytics" && <AnalyticsDashboard state={state} onGenerateTestData={handleGenerateTestData} />}
          {view === "shortlists" && <ShortlistPanel shortlist={state.shortlists} onUpdate={createShortlist} />}
          {view === "audit" && <AuditLog auditRecords={state.audit} />}
        </div>

        {/* Toast notifications */}
        <Toasts toasts={state.toasts} />

        {/* Footer */}
        <footer className="mt-16 glass-card rounded-xl p-8 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand Section */}
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <img src={logo} alt="Careers" className="h-8" />
                  <span className="font-display text-2xl font-bold text-green-700">Careers</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Enterprise Recruitment Portal powered by AI. Streamline your hiring process with intelligent candidate screening and analytics.
                </p>
                <div className="flex gap-4">
                  <button type="button" className="text-gray-600 hover:text-green-700 transition" aria-label="Visit Facebook">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </button>
                  <button type="button" className="text-gray-600 hover:text-green-700 transition" aria-label="Visit Twitter">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                  </button>
                  <button type="button" className="text-gray-600 hover:text-green-700 transition" aria-label="Visit LinkedIn">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </button>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Quick Links</h3>
                <ul className="space-y-2 text-sm">
                  <li><button type="button" onClick={() => setView("jobs")} className="text-gray-600 hover:text-green-700 transition">Browse Jobs</button></li>
                  <li><button type="button" onClick={() => setView("dashboard")} className="text-gray-600 hover:text-green-700 transition">About Us</button></li>
                  <li><button type="button" onClick={() => setView("jobs")} className="text-gray-600 hover:text-green-700 transition">Careers</button></li>
                  <li><button type="button" onClick={() => setView("apply")} className="text-gray-600 hover:text-green-700 transition">Apply Now</button></li>
                </ul>
              </div>

              {/* Support */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-4">Support</h3>
                <ul className="space-y-2 text-sm">
                  <li><button type="button" onClick={() => setView("dashboard")} className="text-gray-600 hover:text-green-700 transition">Help Center</button></li>
                  <li><button type="button" onClick={() => addToast("Privacy Policy page coming soon", { type: "info" })} className="text-gray-600 hover:text-green-700 transition">Privacy Policy</button></li>
                  <li><button type="button" onClick={() => addToast("Terms of Service page coming soon", { type: "info" })} className="text-gray-600 hover:text-green-700 transition">Terms of Service</button></li>
                  <li><button type="button" onClick={() => setView("dashboard")} className="text-gray-600 hover:text-green-700 transition">FAQ</button></li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-300/50 mt-8 pt-6 text-center">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} PVARA. All rights reserved. | Powered by AI Technology
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-96 glass-strong shadow-2xl transform transition-transform ${drawer.open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-4 glass-card flex justify-between items-center">
          <div className="font-semibold">Application Details</div>
          <button onClick={closeDrawer} className="px-2 py-1 border rounded">
            Close
          </button>
        </div>
        <div className="p-4 overflow-auto h-full flex flex-col">
          {drawer.app ? (
            <div className="flex-1">
              <div className="font-semibold text-lg">{drawer.app.applicant.name}</div>
              <div className="text-sm text-gray-500">Applied: {new Date(drawer.app.createdAt).toLocaleString()}</div>
              <div className="mt-2 text-sm"><span className="font-semibold">Status:</span> <span className="text-blue-600">{drawer.app.status || "submitted"}</span></div>
              <div className="mt-2">Email: {drawer.app.applicant.email}</div>
              <div>Phone: {drawer.app.applicant.phone}</div>
              <div>Degree: {drawer.app.applicant.degree}</div>
              <div>Experience: {drawer.app.applicant.experienceYears}</div>
              <div className="mt-2 text-xs text-red-600">Screening: {drawer.app.screeningErrors?.length ? drawer.app.screeningErrors.join(", ") : "Passed"}</div>
              <div className="mt-3">
                <div className="font-semibold mb-2">Files</div>
                {drawer.app.files?.length ? drawer.app.files.map((f, i) => <div key={i} className="text-sm text-blue-600">{f}</div>) : <div className="text-sm text-gray-500">No files</div>}
              </div>
              {auth.hasRole(['hr', 'admin', 'recruiter']) && (
                <div className="mt-4 border-t pt-4">
                  <div className="font-semibold mb-2 text-sm">Actions</div>
                  <div className="space-y-2">
                    {(() => {
                      // Funnel-aware status options: only show valid next steps
                      const currentStatus = drawer.app.status || 'submitted';
                      const getNextActions = (status) => {
                        switch (status) {
                          case 'submitted': return ['screening', 'rejected'];
                          case 'screening': return ['phone-interview', 'rejected'];
                          case 'phone-interview': return ['interview', 'rejected'];
                          case 'interview': return ['offer', 'rejected'];
                          case 'offer': return ['hired', 'rejected'];
                          case 'hired':
                          case 'rejected':
                          default: return [];
                        }
                      };
                      const nextActions = getNextActions(currentStatus);

                      const buttonConfig = {
                        'screening': { label: 'Screen', className: 'bg-yellow-50 hover:bg-yellow-100' },
                        'phone-interview': { label: 'Phone Interview', className: 'bg-blue-50 hover:bg-blue-100' },
                        'interview': { label: 'In-Person Interview', className: 'bg-blue-50 hover:bg-blue-100' },
                        'offer': { label: 'Send Offer', className: 'bg-green-50 hover:bg-green-100' },
                        'hired': { label: 'Mark as Hired', className: 'bg-emerald-50 hover:bg-emerald-100' },
                        'rejected': { label: 'Reject', className: 'bg-red-50 hover:bg-red-100' },
                      };

                      if (nextActions.length === 0) {
                        return <div className="text-sm text-gray-500 italic">No further actions available (terminal status)</div>;
                      }

                      return nextActions.map(action => {
                        const config = buttonConfig[action];
                        const note = action === 'rejected' ? 'Does not meet criteria' : '';
                        return (
                          <button
                            key={action}
                            onClick={() => changeApplicationStatus(drawer.app.id, action, note)}
                            className={`w-full px-2 py-1 border rounded text-sm ${config.className}`}
                          >
                            {config.label}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-gray-500">No application selected</div>
          )}
        </div>
      </div>

      {/* Interview Evaluation Modal */}
      {/* TODO: Add InterviewEvaluationForm modal integration here when available */}

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={() => {
          confirm.onConfirm && confirm.onConfirm();
          setConfirm({ open: false, title: "", message: "", onConfirm: null });
        }}
        onCancel={() => setConfirm({ open: false, title: "", message: "", onConfirm: null })}
      />

      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, title: "", message: "" })}
      />

      {/* Candidate Profile Modal */}
      <CandidateProfileModal
        open={!!selectedCandidate}
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        jobs={state.jobs}
      />
    </div>
  );
}

// Wrap with AuthProvider and ToastProvider for standalone mounting
export default function PvaraPhase2Wrapper() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PvaraPhase2 />
      </ToastProvider>
    </AuthProvider>
  );
}