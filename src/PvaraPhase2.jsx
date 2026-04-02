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
import { getApiOrigin } from "./utils/apiBase";
import TestManagement from "./TestManagement";
import SettingsPanel from "./SettingsPanel";
import SystemDashboard from "./SystemDashboard";
import ContentPage from "./pages/ContentPage";
import ContentManagementPanel from "./ContentManagementPanel";
import { OfferManagementPanel, InterviewSchedulingPanel, InterviewFeedbackModal, ExtendOfferModal } from "./AdvancedFeaturesUI";
import { ThemeProvider, useTheme } from "./ThemeContext";

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

function getApplicationTimestamp(application) {
  const rawValue = application?.updatedAt || application?.submittedAt || application?.createdAt;
  const timestamp = rawValue ? new Date(rawValue).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toExternalUrl(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function toAbsoluteUrl(baseUrl, value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/")) return `${baseUrl}${value}`;
  return `${baseUrl}/${value}`;
}

const API_ORIGIN = getApiOrigin();

function getCandidateCvReference(candidate) {
  const cvValue = candidate?.applicant?.cv || candidate?.cv || "";
  if (!cvValue || cvValue === "/uploads/default.pdf") {
    return "";
  }
  return cvValue;
}

function getCvDisplayName(candidate, resolvedUrl) {
  const cvReference = getCandidateCvReference(candidate);
  const candidateName = candidate?.applicant?.name || candidate?.name || "CV / Resume";
  const source = resolvedUrl || cvReference;

  try {
    const sanitizedSource = source.startsWith("http")
      ? source
      : source.startsWith("/")
        ? `https://placeholder.local${source}`
        : `https://placeholder.local/${source}`;
    const parsedUrl = new URL(sanitizedSource);
    const rawName = parsedUrl.pathname.split("/").pop();
    if (rawName) {
      return decodeURIComponent(rawName);
    }
  } catch (e) { }

  return `${candidateName} CV`;
}

function withCacheBust(url) {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ts=${Date.now()}`;
}

function normalizeApplicant(applicant = {}) {
  return {
    ...applicant,
    experienceYears: applicant.experienceYears ?? applicant.experience_years ?? 0,
    coverLetter: applicant.coverLetter ?? applicant.cover_letter ?? null,
    preferredName: applicant.preferredName ?? applicant.preferred_name ?? null,
    alternatePhone: applicant.alternatePhone ?? applicant.alternate_phone ?? null,
    streetAddress1: applicant.streetAddress1 ?? applicant.street_address1 ?? null,
    streetAddress2: applicant.streetAddress2 ?? applicant.street_address2 ?? null,
    postalCode: applicant.postalCode ?? applicant.postal_code ?? null,
    linkedin: applicant.linkedin ?? applicant.linkedinUrl ?? applicant.linkedin_url ?? applicant.portfolioLink ?? applicant.portfolio_link ?? null,
    xProfile: applicant.xProfile ?? applicant.x_profile ?? null,
    substackUrl: applicant.substackUrl ?? applicant.substack_url ?? null,
    portfolioLink: applicant.portfolioLink ?? applicant.portfolio_link ?? applicant.linkedin ?? null,
    education: Array.isArray(applicant.education) ? applicant.education : [],
    employment: Array.isArray(applicant.employment) ? applicant.employment : [],
    skills: Array.isArray(applicant.skills) ? applicant.skills : [],
    languages: Array.isArray(applicant.languages) ? applicant.languages : [],
  };
}

function normalizeApplicationRecord(application = {}) {
  const applicant = normalizeApplicant(application.applicant || {});
  return {
    ...application,
    id: application._id || application.id,
    jobId: application.job_id || application.jobId,
    job: application.job || null,
    jobTitle: application.jobTitle || application.job?.title || null,
    jobDepartment: application.jobDepartment || application.job?.department || null,
    jobEmploymentType: application.jobEmploymentType || application.job?.employmentType || null,
    applicant,
    status: application.status || "submitted",
    aiScore: application.ai_score ?? application.aiScore,
    aiEvaluation: application.ai_evaluation || application.aiEvaluation,
    testScores: application.test_scores || application.testScores,
    submittedAt: application.submittedAt || application.submitted_at || application.createdAt || application.created_at,
    createdAt: application.createdAt || application.created_at || application.submittedAt || application.submitted_at || new Date().toISOString(),
    updatedAt: application.updatedAt || application.updated_at || application.submittedAt || application.submitted_at || application.createdAt || application.created_at || new Date().toISOString(),
    screeningErrors: application.screeningErrors || [],
  };
}

function mergeApplications(existingApplications = [], incomingApplications = []) {
  const merged = new Map();

  [...existingApplications, ...incomingApplications]
    .map((application) => normalizeApplicationRecord(application))
    .forEach((application) => {
      if (!application.id) return;

      const previous = merged.get(application.id);
      merged.set(
        application.id,
        previous
          ? {
            ...previous,
            ...application,
            applicant: { ...(previous.applicant || {}), ...(application.applicant || {}) },
            files: application.files || previous.files || [],
            screeningErrors: application.screeningErrors || previous.screeningErrors || [],
          }
          : application
      );
    });

  return Array.from(merged.values()).sort(
    (left, right) => getApplicationTimestamp(right) - getApplicationTimestamp(left)
  );
}

function buildCandidateProfileFromApplications(applications = [], seed = {}) {
  const sortedApplications = [...applications].sort(
    (left, right) => getApplicationTimestamp(right) - getApplicationTimestamp(left)
  );
  const latestApplicant = sortedApplications[0]?.applicant || {};
  const emailSet = new Set((seed.emails || []).filter(Boolean));

  sortedApplications.forEach((application) => {
    if (application.applicant?.email) {
      emailSet.add(application.applicant.email);
    }
  });
  if (seed.primaryEmail) {
    emailSet.add(seed.primaryEmail);
  }

  const createdAtValues = sortedApplications
    .map((application) => application.createdAt || application.submittedAt)
    .filter(Boolean)
    .sort();
  const updatedAtValues = sortedApplications
    .map((application) => application.updatedAt || application.submittedAt || application.createdAt)
    .filter(Boolean)
    .sort();

  return {
    ...seed,
    cnic: seed.cnic || latestApplicant.cnic || "",
    name: latestApplicant.name || seed.name || "",
    phone: latestApplicant.phone || seed.phone || "",
    primaryEmail: seed.primaryEmail || latestApplicant.email || Array.from(emailSet)[0] || "",
    emails: Array.from(emailSet),
    applications: sortedApplications.map((application) => application.id),
    address: latestApplicant.address || seed.address || "",
    linkedin: latestApplicant.linkedin || seed.linkedin || "",
    xProfile: latestApplicant.xProfile || seed.xProfile || "",
    substackUrl: latestApplicant.substackUrl || seed.substackUrl || "",
    createdAt: seed.createdAt || createdAtValues[0] || new Date().toISOString(),
    updatedAt: updatedAtValues[updatedAtValues.length - 1] || seed.updatedAt || new Date().toISOString(),
  };
}

function upsertCandidateProfile(existingCandidates = [], candidateProfile) {
  if (!candidateProfile?.cnic) {
    return existingCandidates;
  }

  return [
    candidateProfile,
    ...existingCandidates.filter((candidate) => candidate.cnic !== candidateProfile.cnic),
  ];
}

function buildApplicantPayload(data = {}) {
  const addressParts = [
    data.streetAddress1,
    data.streetAddress2,
    [data.city, data.state, data.postalCode].filter(Boolean).join(", "),
    data.country,
  ].filter(Boolean);

  return {
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    alternatePhone: data.alternatePhone || null,
    cnic: data.cnic || "N/A",
    degree: data.degree || "Not specified",
    experienceYears: parseInt(data.experienceYears, 10) || 0,
    cv: data.cvUrl || data.cv || "/uploads/default.pdf",
    coverLetter: data.coverLetter || null,
    preferredName: data.preferredName || null,
    country: data.country || null,
    streetAddress1: data.streetAddress1 || null,
    streetAddress2: data.streetAddress2 || null,
    city: data.city || null,
    state: data.state || null,
    postalCode: data.postalCode || null,
    address: data.address || addressParts.join(", ") || null,
    linkedin: data.linkedinUrl || data.linkedin || null,
    xProfile: data.xProfile || null,
    substackUrl: data.substackUrl || null,
    portfolioLink: data.portfolioLink || null,
    education: Array.isArray(data.education)
      ? data.education.map((item) => ({
        school: item.school || "",
        fieldOfStudy: item.fieldOfStudy || "",
        degree: item.degree || "",
        graduated: item.graduated || null,
        stillAttending: !!item.stillAttending,
      }))
      : [],
    employment: Array.isArray(data.employment)
      ? data.employment.map((item) => ({
        employer: item.employer || "",
        jobTitle: item.jobTitle || "",
        currentEmployer: !!item.currentEmployer,
        startMonth: item.startMonth || "",
        startYear: item.startYear || "",
        endMonth: item.endMonth || "",
        endYear: item.endYear || "",
        description: item.description || "",
      }))
      : [],
    skills: Array.isArray(data.skills) ? data.skills.filter(Boolean) : [],
    languages: Array.isArray(data.languages)
      ? data.languages
        .filter((item) => item?.language)
        .map((item) => ({
          language: item.language,
          proficiency: item.proficiency || "Fluent",
        }))
      : [],
  };
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

  const apiUrl = API_ORIGIN;

  // Check if CV exists when modal opens
  React.useEffect(() => {
    if (!open || !candidate?.applicant?.cnic) {
      setCvExists(null);
      setCvUrl(null);
      return;
    }

    const resolveStoredCv = async (cvReference) => {
      if (!cvReference) return null;

      if (/^https?:\/\//i.test(cvReference)) {
        return cvReference;
      }

      if (cvReference.startsWith("/api/upload/cv-url/")) {
        try {
          const response = await fetch(withCacheBust(`${apiUrl}${cvReference}`));
          if (response.ok) {
            const data = await response.json();
            if (data?.success && data?.url) {
              return data.url.startsWith("http") ? data.url : `${apiUrl}${data.url}`;
            }
          }
        } catch (e) { }
        return null;
      }

      if (
        cvReference.startsWith("/uploads/") ||
        cvReference.startsWith("/api/upload/files/")
      ) {
        return toAbsoluteUrl(apiUrl, cvReference);
      }

      return null;
    };

    const cnic = candidate.applicant.cnic;
    const cleanCnic = cnic.replace(/-/g, '');

    const job = (jobs || []).find(j => j.id === candidate.jobId);
    if (!job) {
      setCvExists(false);
      setCvUrl(null);
      return;
    }
    const cleanJobTitle = job.title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();

    const extensions = ['.pdf', '.docx', '.doc'];

    const checkCvExists = async () => {
      setCvExists(null);

      const storedCvUrl = await resolveStoredCv(getCandidateCvReference(candidate));
      if (storedCvUrl) {
        setCvExists(true);
        setCvUrl(storedCvUrl);
        return;
      }

      for (const ext of extensions) {
        const filename = `${cleanCnic}_${cleanJobTitle}${ext}`;

        // Try cv-url endpoint first (works with S3)
        try {
          const response = await fetch(withCacheBust(`${apiUrl}/api/upload/cv-url/${filename}`));
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.url) {
              setCvExists(true);
              setCvUrl(data.url.startsWith('http') ? data.url : `${apiUrl}${data.url}`);
              return;
            }
          }
        } catch (e) { }

        // Fallback: try direct /uploads/ path
        try {
          const directUrl = `${apiUrl}/uploads/${filename}`;
          const response = await fetch(directUrl, { method: 'HEAD' });
          if (response.ok) {
            setCvExists(true);
            setCvUrl(directUrl);
            return;
          }
        } catch (e) { }
      }
      setCvExists(false);
      setCvUrl(null);
    };

    checkCvExists();
  }, [open, candidate, apiUrl, jobs]);

  if (!open || !candidate) return null;
  const c = candidate;
  const socialLinks = [
    { label: "LinkedIn", value: c.applicant?.linkedin || c.linkedin },
    { label: "X", value: c.applicant?.xProfile || c.xProfile },
    { label: "Substack", value: c.applicant?.substackUrl || c.substackUrl },
  ];
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
                {socialLinks.map((link) => (
                  <div key={link.label} className="grid grid-cols-3 gap-2">
                    <dt className="text-gray-500">{link.label}</dt>
                    <dd className="col-span-2 font-medium truncate">
                      {link.value ? (
                        <a
                          href={toExternalUrl(link.value)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {link.value}
                        </a>
                      ) : (
                        "-"
                      )}
                    </dd>
                  </div>
                ))}
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
                        <div className="text-xs text-gray-500">{getCvDisplayName(c, cvUrl)}</div>
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

  // Auto-select first job when jobs are available and none selected
  React.useEffect(() => {
    if (!selectedJobId && jobs.length > 0 && jobs[0]?.id) {
      onSelectJob(jobs[0].id);
    }
  }, [selectedJobId, jobs, onSelectJob]);

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
    <div className="flex gap-6 h-[calc(100vh-8rem)] mt-4">
      {/* Left Panel - Job List (hidden on smaller screens to avoid sidebar conflict) */}
      <div className="hidden xl:block w-80 xl:flex-shrink-0 bg-white rounded-lg shadow-lg p-4 overflow-y-auto">
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
        {/* Mobile/Tablet Job Selector (shows when left panel is hidden) */}
        <div className="xl:hidden mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Position</label>
          <select
            value={currentJobId || ''}
            onChange={(e) => onSelectJob(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {jobs.map(job => {
              const stats = jobStats.find(s => s.jobId === job.id);
              return (
                <option key={job.id} value={job.id}>
                  {job.title} ({stats?.total || 0} applicants)
                </option>
              );
            })}
          </select>
        </div>

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
  // Start with empty jobs/applications - will be populated from backend only
  const [state, setState] = useState(() => {
    const cached = loadState();
    return {
      ...(cached || defaultState()),
      jobs: [], // Always start empty - backend is source of truth
      applications: [], // Always start empty - backend is source of truth  
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  // Save to localStorage for offline/backup purposes
  useEffect(() => saveState(state), [state]);

  // Helper function to refresh jobs from backend
  const refreshJobs = useCallback(async () => {
    try {
      const jobsResponse = await apiClient.get('/jobs');
      const backendJobs = jobsResponse.data?.jobs || jobsResponse.data || [];
      setState(prev => ({ ...prev, jobs: backendJobs }));
      console.log(`📥 Loaded ${backendJobs.length} jobs from backend`);
      return backendJobs;
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      return [];
    }
  }, []);

  // Helper function to refresh applications from backend
  const refreshApplications = useCallback(async () => {
    try {
      const appsResponse = await apiClient.get('/applications');
      const backendApps = appsResponse.data?.applications || appsResponse.data || [];
      setState(prev => ({
        ...prev,
        applications: backendApps.map((app) => normalizeApplicationRecord(app))
      }));
      console.log(`📥 Loaded ${backendApps.length} applications from backend`);
      return backendApps;
    } catch (error) {
      console.log('📋 Applications not loaded (login required):', error.response?.status || error.message);
      return [];
    }
  }, []);

  // Fetch data from backend API on mount
  useEffect(() => {
    const fetchBackendData = async () => {
      setIsLoading(true);
      await refreshJobs();
      if (localStorage.getItem("token")) {
        await refreshApplications();
      }
      setIsLoading(false);
    };

    fetchBackendData();
  }, [refreshJobs, refreshApplications]);

  const auth = useAuth();
  const user = auth?.user ?? null;
  const { addToast } = useToast();

  useEffect(() => {
    if (user && localStorage.getItem("token")) {
      refreshApplications();
    }
  }, [user, refreshApplications]);

  // Candidate session (CNIC-based login)
  const [candidateSession, setCandidateSession] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Handle candidate login (CNIC + phone/email verification)
  const handleCandidateLogin = useCallback(async (credentials) => {
    try {
      const response = await apiClient.post('/applications/candidate-lookup', credentials);
      const candidateApplications = (response.data?.applications || []).map((application) => normalizeApplicationRecord(application));
      const candidateProfile = buildCandidateProfileFromApplications(
        candidateApplications,
        response.data?.candidate || { cnic: credentials.cnic }
      );

      setState((prev) => ({
        ...prev,
        applications: mergeApplications(prev.applications || [], candidateApplications),
        candidates: upsertCandidateProfile(prev.candidates || [], candidateProfile),
      }));
      setCandidateSession(candidateProfile);
      setView("my-apps");
      addToast(`Welcome back, ${candidateProfile.name || "Candidate"}!`, { type: "success" });
    } catch (error) {
      const message =
        error.response?.data?.detail?.message ||
        error.response?.data?.message ||
        "We could not verify your application record.";
      addToast(message, { type: "error" });
    }
  }, [addToast]);

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

  const [view, setView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'staff') return 'staff-login';
    return 'jobs';
  });
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
    xProfile: "",
    substackUrl: "",
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
  const [interviewFilter, setInterviewFilter] = useState('all');
  const [interviewJobFilter, setInterviewJobFilter] = useState('all');
  const [offerFilter, setOfferFilter] = useState('all');
  const [offerJobFilter, setOfferJobFilter] = useState('all');
  const [feedbackModalApp, setFeedbackModalApp] = useState(null);
  const [offerModalApp, setOfferModalApp] = useState(null);
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
  const createJob = useCallback(async (jobData) => {
    // Handle both event (from form) and job object (from JobList component)
    if (jobData && typeof jobData.preventDefault === 'function') {
      jobData.preventDefault();
    }

    // If jobData is a job object (from JobList), use it directly
    let newJob;
    if (jobData && jobData.title && !jobData.preventDefault) {
      console.log('📝 Creating job from JobList data:', jobData.title);
      newJob = { ...jobData, createdAt: jobData.createdAt || new Date().toISOString() };
    } else if (editingJobId) {
      // Update existing job
      console.log('📝 Updating existing job:', editingJobId);
      const updated = { ...normalizeJobFormForSave(jobForm), id: editingJobId };

      // Try to update in backend
      try {
        const response = await apiClient.put(`/jobs/${editingJobId}`, updated);
        if (response.data?.success) {
          const backendJob = response.data.job;
          setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === editingJobId ? backendJob : j)) }));
          console.log('✅ Job updated in database');
        }
      } catch (err) {
        console.error('Backend update failed, updating locally:', err);
        setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === editingJobId ? updated : j)) }));
      }

      audit("update-job", { jobId: editingJobId, title: updated.title });
      setSuccessModal({ open: true, title: "Job Updated Successfully!", message: `"${updated.title}" has been updated.` });
      setEditingJobId(null);
      setJobForm(emptyJobForm);
      return;
    } else {
      // Create new job from form
      console.log('📝 Creating job from inline form');
      newJob = { ...normalizeJobFormForSave(jobForm), id: `job-${Date.now()}`, createdAt: new Date().toISOString(), status: 'open' };
    }

    // POST new job to backend
    const jobPayload = {
      title: newJob.title,
      department: newJob.department || 'General',
      grade: newJob.grade || 'N/A',
      description: newJob.description || 'No description provided',
      locations: (Array.isArray(newJob.locations) && newJob.locations.length > 0) ? newJob.locations : ['Remote'],
      openings: parseInt(newJob.openings) || 1,
      employmentType: newJob.employmentType || 'Full-time',
      salary: {
        min: parseFloat(newJob.salary?.min) || 0,
        max: parseFloat(newJob.salary?.max) || 0,
      },
      status: newJob.status || 'open',
      screeningCriteria: newJob.screeningCriteria || null,
      education: newJob.education || null,
      termsAndConditions: newJob.termsAndConditions || null
    };

    try {
      const response = await apiClient.post('/jobs/', jobPayload);
      if (response.data?.success) {
        const backendJob = response.data.job;
        setState((s) => ({ ...s, jobs: [backendJob, ...(s.jobs || [])] }));
        console.log('✅ Job created in database:', backendJob.id);
      } else {
        throw new Error('Backend returned error');
      }
    } catch (err) {
      console.error('Backend create failed:', err.response?.data || err.message);
      console.log('Payload that failed:', JSON.stringify(jobPayload, null, 2));
      setState((s) => ({ ...s, jobs: [newJob, ...(s.jobs || [])] }));
      addToast("Job saved locally, backend sync failed", { type: "warning" });
    }

    audit("create-job", { jobId: newJob.id, title: newJob.title });
    setJobForm(emptyJobForm);
    setSuccessModal({ open: true, title: "Job Created Successfully!", message: `"${newJob.title}" has been added to the job listings.` });
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

  const updateJob = useCallback(async (jobData) => {
    if (!jobData || !jobData.id) return;

    // Prepare payload for backend
    const jobPayload = {
      title: jobData.title,
      department: jobData.department || 'General',
      grade: jobData.grade || 'N/A',
      description: jobData.description || '',
      locations: (Array.isArray(jobData.locations) && jobData.locations.length > 0) ? jobData.locations : ['Remote'],
      openings: parseInt(jobData.openings) || 1,
      employmentType: jobData.employmentType || 'Full-time',
      salary: {
        min: parseFloat(jobData.salary?.min) || 0,
        max: parseFloat(jobData.salary?.max) || 0,
      },
      status: jobData.status || 'open',
      screeningCriteria: jobData.screeningCriteria || null,
      education: jobData.education || null,
      termsAndConditions: jobData.termsAndConditions || null
    };

    try {
      const response = await apiClient.put(`/jobs/${jobData.id}`, jobPayload);
      if (response.data?.success) {
        const backendJob = response.data.job;
        setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === jobData.id ? backendJob : j)) }));
        console.log('✅ Job updated in database:', jobData.id);
        audit("update-job", { jobId: jobData.id, title: jobData.title });
        setSuccessModal({ open: true, title: "Job Updated!", message: `Job has been updated successfully.` });
      } else {
        throw new Error(response.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Backend update failed:', err.response?.data || err.message);
      addToast(err.response?.data?.detail?.message || "Failed to update job. Please try again.", { type: "error" });
    }

    setEditingJobId(null);
    setJobForm(emptyJobForm);
  }, [addToast, audit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update only the screening criteria for a job (for AI configuration)
  const updateScreeningCriteria = useCallback(async (jobId, screeningCriteria) => {
    if (!jobId) return;

    try {
      // Find the existing job to preserve other fields
      const existingJob = state.jobs.find(j => j.id === jobId);
      if (!existingJob) {
        addToast("Job not found", { type: "error" });
        return;
      }

      // Update job with new screening criteria
      const jobPayload = {
        title: existingJob.title,
        department: existingJob.department || 'General',
        grade: existingJob.grade || 'N/A',
        description: existingJob.description || '',
        locations: existingJob.locations || ['Remote'],
        openings: existingJob.openings || 1,
        employmentType: existingJob.employmentType || 'Full-time',
        salary: existingJob.salary || { min: 0, max: 0 },
        status: existingJob.status || 'open',
        screeningCriteria: screeningCriteria
      };

      const response = await apiClient.put(`/jobs/${jobId}`, jobPayload);
      if (response.data?.success) {
        const backendJob = response.data.job;
        setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === jobId ? backendJob : j)) }));
        console.log('✅ AI Screening criteria updated for job:', jobId);
        audit("update-screening-criteria", { jobId, screeningCriteria });
        addToast("AI Screening criteria saved successfully", { type: "success" });
      } else {
        throw new Error(response.data?.message || 'Update failed');
      }
    } catch (err) {
      console.error('Failed to update screening criteria:', err.response?.data || err.message);
      addToast(err.response?.data?.detail?.message || "Failed to save AI screening criteria.", { type: "error" });
    }
  }, [state.jobs, addToast, audit]);

  const deleteJob = useCallback(async (jobId) => {
    try {
      const response = await apiClient.delete(`/jobs/${jobId}`);
      if (response.data?.success) {
        // Only update local state on confirmed backend success
        setState((s) => ({ ...s, jobs: (s.jobs || []).filter((j) => j.id !== jobId) }));
        audit("delete-job", { jobId });
        addToast("Job deleted successfully", { type: "success" });
        console.log('✅ Job deleted from database:', jobId);
      } else {
        throw new Error(response.data?.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Backend delete failed:', err);
      console.error('Error response data:', err.response?.data);
      // FastAPI HTTPException returns detail as string or object with message
      const detail = err.response?.data?.detail;
      let errorMessage = "Failed to delete job.";
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (detail?.message) {
        errorMessage = detail.message;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message && err.message !== 'Delete failed') {
        errorMessage = err.message;
      }
      addToast(errorMessage, { type: "error" });
    }
  }, [addToast, audit]); // eslint-disable-line react-hooks/exhaustive-deps


  async function submitApplication(formData) {
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
      const computedAddress = [
        applicantData.streetAddress1,
        applicantData.streetAddress2,
        [applicantData.city, applicantData.state, applicantData.postalCode].filter(Boolean).join(', '),
        applicantData.country,
      ].filter(Boolean).join(', ');

      applicantData = {
        ...applicantData,
        jobId: applicantData.jobId,
        name: `${applicantData.firstName || ''} ${applicantData.lastName || ''}`.trim() || applicantData.name,
        email: applicantData.email,
        cnic: applicantData.cnic || 'N/A',
        phone: applicantData.phone,
        degree: primaryEducation.degree || applicantData.degree || 'Not specified',
        experienceYears: applicantData.experienceYears ||
          (primaryEmployment.startYear ? new Date().getFullYear() - parseInt(primaryEmployment.startYear) : 0),
        address: applicantData.address || computedAddress || `${applicantData.city || ''}, ${applicantData.state || ''}`.trim(),
        linkedin: applicantData.linkedinUrl || applicantData.linkedin || '',
        xProfile: applicantData.xProfile || '',
        substackUrl: applicantData.substackUrl || '',
      };
    }

    const job = (state.jobs || []).find((j) => j.id === applicantData.jobId);
    if (!job) {
      addToast("Select job", { type: "error" });
      return false;
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
        onConfirm: async () => {
          await finalizeApplication(job, files, true, applicantData);
          setConfirm({ open: false, title: "", message: "", onConfirm: null });
        },
      });
      return false;
    }

    return finalizeApplication(job, files, false, applicantData);
  }

  async function finalizeApplication(job, files, manual, applicantData) {
    const data = applicantData || appForm;
    const filesNames = (files || []).map((f) => f.name);
    const serializedApplicant = buildApplicantPayload(data);
    let submissionSucceeded = false;

    // Check if candidate profile exists by CNIC
    const cnic = data.cnic || 'N/A';
    const candidate = (state.candidates || []).find(c => c.cnic === cnic);

    // Check for duplicate application to same job
    if (candidate) {
      const existingApp = (state.applications || []).find(
        app => app.applicant.cnic === cnic && app.jobId === job.id
      );
      if (existingApp) {
        addToast(`You have already applied to ${job.title}`, { type: "warning" });
        return false;
      }
    }

    // Prepare application data for backend
    const applicationPayload = {
      jobId: job.id,
      applicant: serializedApplicant,
    };

    try {
      const requestConfig = data.turnstileToken
        ? { headers: { 'X-Turnstile-Token': data.turnstileToken } }
        : undefined;
      const response = await apiClient.post('/applications/', applicationPayload, requestConfig);
      const backendApp = normalizeApplicationRecord(response.data?.application || {});
      const app = {
        ...backendApp,
        jobId: backendApp.jobId || job.id,
        applicant: { ...serializedApplicant, ...(backendApp.applicant || {}) },
        files: filesNames,
        status: backendApp.status || (manual ? "manual-review" : "submitted"),
        screeningErrors: manual ? ["failed mandatory checks"] : [],
      };

      updateLocalState(app, cnic, candidate);
      console.log(`✅ Application saved to database: ${app.id || 'OK'}`);
      setSuccessModal({ open: true, title: "Application Submitted!", message: `Your application for "${job.title}" has been submitted successfully.` });
      setTimeout(() => {
        setView("my-apps");
      }, 1500);
      submissionSucceeded = true;
    } catch (err) {
      const responseMessage =
        err.response?.data?.detail?.message ||
        err.response?.data?.message ||
        err.message;

      if (err.response) {
        console.error('Application submission rejected:', err.response.data);
        addToast(responseMessage || "Unable to submit this application.", { type: "error" });
        return false;
      }

      console.error('Backend sync error:', err);
      addToast("Backend unavailable. Your application has been kept locally on this device only.", { type: "warning" });
      const app = normalizeApplicationRecord({
        id: `app-${Date.now()}`,
        jobId: job.id,
        applicant: serializedApplicant,
        files: filesNames,
        status: manual ? "manual-review" : "submitted",
        createdAt: new Date().toISOString(),
        screeningErrors: manual ? ["failed mandatory checks"] : [],
      });
      updateLocalState(app, cnic, candidate);
      setSuccessModal({ open: true, title: "Application Saved Locally", message: `We could not reach the server, but your application for "${job.title}" is still available in this browser.` });
      setTimeout(() => {
        setView("my-apps");
      }, 1500);
      submissionSucceeded = true;
    }

    // Reset form
    setAppForm({ jobId: state.jobs[0]?.id || "", name: "", email: "", cnic: "", phone: "", degree: "", experienceYears: "", address: "", linkedin: "", xProfile: "", substackUrl: "" });
    if (fileRef.current) fileRef.current.value = null;
    return submissionSucceeded;
  }

  function updateLocalState(app, cnic, existingCandidate) {
    const normalizedApp = normalizeApplicationRecord(app);
    const mergedApplications = mergeApplications(state.applications || [], [normalizedApp]);
    const candidateApplications = mergedApplications.filter(
      (application) => application.applicant?.cnic === cnic
    );
    const candidateProfile = buildCandidateProfileFromApplications(
      candidateApplications,
      existingCandidate ? { ...existingCandidate, cnic } : { cnic }
    );

    setState((currentState) => ({
      ...currentState,
      applications: mergeApplications(currentState.applications || [], [normalizedApp]),
      candidates: upsertCandidateProfile(currentState.candidates || [], candidateProfile),
    }));
    setCandidateSession(candidateProfile);
    audit("submit-app", { appId: normalizedApp.id, jobId: normalizedApp.jobId, status: normalizedApp.status });
  }

  function sendConfirmationEmail(data, job) {
    const emailData = {
      to: data.email,
      templateType: "APPLICATION_RECEIVED",
      data: {
        candidateName: data.name,
        jobTitle: job.title,
      },
    };

    const apiUrl = API_ORIGIN;
    fetch(`${apiUrl}/api/email/send-template`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    })
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          console.log(`📧 Confirmation email sent to ${data.email}`);
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

        const apiUrl = API_ORIGIN;
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

  function DarkModeToggleIcon() {
    const { dark, toggleTheme } = useTheme();
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg transition-all hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
        )}
      </button>
    );
  }

  function Sidebar() {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-2 rounded-xl shadow-lg hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700"
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
        <div className={`fixed lg:static w-72 glass-sidebar text-gray-800 h-screen lg:h-auto lg:min-h-screen flex flex-col z-40 transition-transform duration-300 shadow-2xl overflow-y-auto pt-14 px-4 pb-6 lg:pt-6 lg:px-6 lg:pb-6 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={logo} alt="PVARA" className="h-10" />
              <div>
                <div className="font-display font-bold text-2xl text-green-700">PVARA</div>
                <div className="text-xs text-gray-600 font-medium tracking-wide">RECRUITMENT</div>
              </div>
            </div>
            <DarkModeToggleIcon />
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
            {/* TODO: Re-enable when testing integration is complete
            {auth.hasRole(['hr', 'admin', 'recruiter']) && (
              <button onClick={() => { setView("test-management"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "test-management" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                Test Management
              </button>
            )}
            */}
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

            {/* ADVANCED Section */}
            {auth.hasRole(['admin']) && (
              <>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3">Advanced</span>
                </div>
                <button onClick={() => { setView("settings"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "settings" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                  Settings
                </button>
                <button onClick={() => { setView("operations"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "operations" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 13h4l3-9 4 16 3-7h4" /></svg>
                  Operations
                </button>
                <button onClick={() => { setView("content-admin"); setMobileMenuOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${view === "content-admin" ? "glass-button text-green-700 shadow-md" : "hover:glass-button"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Content Management
                </button>
              </>
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
            ) : null}
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
  function FeatureToggles({ addToast }) {
    const [toggles, setToggles] = React.useState({
      emailEnabled: true,
      captchaEnabled: false,
      aiCvParsing: true,
    });
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
      apiClient.get('/settings/').then(res => {
        const sys = res.data?.system || res.data?.settings?.system || {};
        setToggles({
          emailEnabled: sys.autoEmailOnSubmit !== false,
          captchaEnabled: sys.captchaEnabled || false,
          aiCvParsing: sys.aiCvParsing !== false,
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    }, []);

    const saveToggle = async (key, value) => {
      const updated = { ...toggles, [key]: value };
      setToggles(updated);
      setSaving(true);
      try {
        await apiClient.put('/settings/system', {
          autoEmailOnSubmit: updated.emailEnabled,
          autoEmailOnStatusChange: updated.emailEnabled,
          captchaEnabled: updated.captchaEnabled,
          aiCvParsing: updated.aiCvParsing,
        });
        addToast(`${key === 'emailEnabled' ? 'Email' : key === 'captchaEnabled' ? 'Captcha' : 'AI CV Parsing'} ${value ? 'enabled' : 'disabled'}`, { type: 'success' });
      } catch (e) {
        addToast('Failed to save setting', { type: 'error' });
        setToggles(prev => ({ ...prev, [key]: !value }));
      }
      setSaving(false);
    };

    const Toggle = ({ label, description, checked, onChange, icon }) => (
      <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-green-200 transition">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <div className="font-semibold text-gray-800 text-sm">{label}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </div>
        </div>
        <button
          onClick={() => onChange(!checked)}
          disabled={saving}
          className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'} ${saving ? 'opacity-50' : ''}`}
        >
          <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
    );

    if (loading) return <div className="p-6 text-center text-gray-400">Loading toggles...</div>;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Feature Toggles
        </h2>
        <p className="text-sm text-gray-500 mb-4">Enable or disable platform features</p>
        <div className="space-y-3">
          <Toggle
            icon="📧"
            label="Email Notifications"
            description="Send emails on application submit, status changes, OTP"
            checked={toggles.emailEnabled}
            onChange={(v) => saveToggle('emailEnabled', v)}
          />
          <Toggle
            icon="🛡️"
            label="Captcha (Turnstile)"
            description="Require human verification before CV upload"
            checked={toggles.captchaEnabled}
            onChange={(v) => saveToggle('captchaEnabled', v)}
          />
          <Toggle
            icon="🤖"
            label="AI CV Parsing (OpenAI)"
            description="Auto-extract candidate data from uploaded CVs"
            checked={toggles.aiCvParsing}
            onChange={(v) => saveToggle('aiCvParsing', v)}
          />
        </div>
      </div>
    );
  }

  function JobBoardView() {
    const [currentPage, setCurrentPage] = React.useState(1);
    const [localSearch, setLocalSearch] = React.useState(jobSearch);
    const jobsPerPage = 6;
    const searchInputRef = React.useRef(null);

    const openJobs = React.useMemo(() =>
      (state.jobs || []).filter((j) => j.status === "open"),
      [state.jobs]
    );

    // Use localSearch for filtering to prevent cursor jumping
    const visibleJobs = React.useMemo(() => {
      const normalizedSearch = localSearch.trim().toLowerCase();
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
    }, [openJobs, localSearch]);

    // Keep normalizedSearch available for display purposes
    const normalizedSearch = localSearch.trim().toLowerCase();

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

    // Skeleton loading state
    if (isLoading) {
      return (
        <div>
          {/* Hero skeleton */}
          <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-8 md:p-12 mb-8 animate-pulse">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div className="h-4 w-24 bg-white/20 rounded-full mx-auto" />
              <div className="h-10 w-96 bg-white/20 rounded-lg mx-auto" />
              <div className="h-5 w-80 bg-white/15 rounded-lg mx-auto" />
              <div className="h-12 w-full max-w-xl bg-white/10 rounded-xl mx-auto mt-6" />
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="flex justify-center gap-6 mb-8">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 w-40 animate-pulse">
                <div className="h-8 w-12 bg-gray-200 rounded mx-auto mb-2" />
                <div className="h-4 w-24 bg-gray-100 rounded mx-auto" />
              </div>
            ))}
          </div>
          {/* Job cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-20 bg-green-100 rounded-full" />
                  <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-1/2 bg-gray-100 rounded mb-4" />
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full bg-gray-100 rounded" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded" />
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="h-4 w-28 bg-gray-100 rounded" />
                  <div className="h-4 w-32 bg-gray-100 rounded" />
                </div>
                <div className="flex gap-3">
                  <div className="h-10 flex-1 bg-green-100 rounded-lg" />
                  <div className="h-10 flex-1 bg-gray-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Job Detail View
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
            className="mb-6 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-2.5 rounded-xl text-gray-700 hover:text-green-700 font-medium shadow-sm hover:shadow-md transition-all border border-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Positions
          </button>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
            {/* Job Header - Enhanced with gradient */}
            <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white p-8 md:p-10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                    {job.employmentType}
                  </span>
                  <span className="px-3 py-1 bg-emerald-500/30 backdrop-blur-sm rounded-full text-sm font-medium">
                    Open Position
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{job.title}</h1>
                <div className="flex flex-wrap gap-4 text-green-100">
                  <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                    {job.department}
                  </span>
                  <span className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                    {job.locations.join(', ')}
                  </span>
                  {/* Salary hidden */}
                </div>
              </div>
            </div>

            {/* Job Details - Enhanced */}
            <div className="p-8 md:p-10 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  About the Role
                </h2>
                <ul className="text-gray-600 leading-relaxed text-base space-y-3">
                  {(job.description || '').split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    if (trimmed.startsWith('Application Deadline:')) return null;
                    const text = trimmed.startsWith('- ') ? trimmed.substring(2) : trimmed;
                    return <li key={i} className="ml-5 list-disc">{text}</li>;
                  })}
                </ul>
              </div>

              {/* Job Info Cards */}
              <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
                <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                  <div className="text-2xl font-bold text-green-700">{job.openings || 1}</div>
                  <div className="text-xs text-gray-500 mt-1">Opening{(job.openings || 1) > 1 ? 's' : ''}</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                  <div className="text-sm font-bold text-blue-700">{job.employmentType || 'Contract'}</div>
                  <div className="text-xs text-gray-500 mt-1">Type</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                  <div className="text-sm font-bold text-amber-700">18th April 2026</div>
                  <div className="text-xs text-gray-500 mt-1">Deadline</div>
                </div>
              </div>

              {/* Education Requirements */}
              {job.education && (
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                    Education & Qualifications
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{job.education}</p>
                </div>
              )}

              {/* Terms and Conditions - hidden from public view */}

              <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setView('apply');
                    setAppForm(prev => ({ ...prev, jobId: job.id }));
                  }}
                  className="flex-1 sm:flex-none px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Apply for this Position
                </button>
                <button
                  onClick={() => setSelectedJobId(null)}
                  className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition-all flex items-center justify-center gap-2"
                >
                  View Other Positions
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Main Job Listing View - Enhanced with PVARA branding
    return (
      <div className="max-w-7xl mx-auto">
        {/* Hero Section - Compact with Pakistan Monuments */}
        <div className="relative mb-6 md:mb-10 rounded-xl md:rounded-2xl overflow-hidden mx-[-1rem] md:mx-0">
          <div className="absolute inset-0 bg-gradient-to-r from-green-800 via-green-700 to-emerald-800"></div>
          <div className="absolute inset-0 bg-[url('/pvara-hero.jpg')] bg-cover bg-center opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-green-900/80 via-transparent to-green-900/40"></div>
          <div className="relative px-4 py-6 md:px-8 md:py-10 lg:py-12 text-center text-white pt-10 md:pt-10">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full mb-4 md:mb-6">
              <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
              <span className="text-xs md:text-sm font-medium">Now Hiring</span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 leading-tight">
              Build Your Future with PVARA
            </h1>
            <p className="text-xs md:text-base lg:text-lg text-green-100 max-w-2xl mx-auto mb-4 md:mb-6 px-2">
              Join Pakistan's Virtual Assets Regulatory Authority and be part of the team shaping the future of digital finance regulation
            </p>

            {/* Enhanced Search Bar - Mobile Optimized */}
            <div className="max-w-2xl mx-auto px-2 md:px-0">
              <form onSubmit={handleJobSearchSubmit} className="bg-white/95 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
                <div className="flex items-center flex-1 px-3 md:px-4">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    className="flex-1 px-3 md:px-4 py-2.5 md:py-3 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-base md:text-lg w-full min-w-0"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    aria-label="Search jobs"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg md:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-sm md:text-base w-full sm:w-auto"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-10 max-w-md mx-auto px-1">
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl md:text-3xl font-bold text-green-600 mb-0.5 md:mb-1">{visibleJobs.reduce((sum, j) => sum + (j.openings || 1), 0)}</div>
            <div className="text-xs md:text-sm text-gray-500 font-medium">Open Positions</div>
          </div>
          <div className="bg-white rounded-lg md:rounded-xl p-3 md:p-5 shadow-sm border border-gray-100 text-center">
            <div className="text-2xl md:text-3xl font-bold text-blue-600 mb-0.5 md:mb-1">{new Set(openJobs.map(j => j.department)).size}</div>
            <div className="text-xs md:text-sm text-gray-500 font-medium">Departments</div>
          </div>
        </div>

        {/* Why Join PVARA Section - Hidden on mobile for cleaner UX */}
        <div className="hidden md:block mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Why Join PVARA?</h2>
            <p className="text-gray-500">Be part of Pakistan's digital transformation journey</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Innovation at Core</h3>
              <p className="text-gray-500 text-sm">Work on cutting-edge blockchain and virtual asset regulations that will shape the future of finance in Pakistan.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Collaborative Culture</h3>
              <p className="text-gray-500 text-sm">Join a diverse team of experts committed to consumer protection and financial stability.</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Growth Opportunities</h3>
              <p className="text-gray-500 text-sm">Advance your career with professional development, training programs, and competitive benefits.</p>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6 px-1">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-gray-800">Current Openings</h2>
            <p className="text-xs md:text-base text-gray-500">{visibleJobs.reduce((sum, j) => sum + (j.openings || 1), 0)} position{visibleJobs.reduce((sum, j) => sum + (j.openings || 1), 0) !== 1 ? 's' : ''} available</p>
          </div>
          {normalizedSearch && (
            <button
              onClick={() => { setLocalSearch(''); handleJobSearchChange(''); }}
              className="text-xs md:text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
            >
              Clear
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {visibleJobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Open Positions Found</h3>
            <p className="text-gray-500 mb-6">{normalizedSearch ? `No roles match "${localSearch}"` : "Check back soon for new opportunities!"}</p>
            {normalizedSearch && (
              <button
                onClick={() => { setLocalSearch(''); handleJobSearchChange(''); }}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition"
              >
                View All Positions
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
              {paginatedJobs.map(job => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-200 transition-all duration-300 overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedJobId(job.id)}
                >
                  {/* Colored Top Bar */}
                  <div className="h-1 md:h-1.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>

                  <div className="p-4 md:p-6">
                    <div className="flex items-start justify-between gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2">
                          <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-green-100 text-green-700 rounded text-[10px] md:text-xs font-semibold uppercase tracking-wide">
                            {job.employmentType}
                          </span>
                          <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-gray-100 text-gray-600 rounded text-[10px] md:text-xs font-medium">
                            {job.openings} opening{job.openings > 1 ? 's' : ''}
                          </span>
                        </div>
                        <h2 className="text-base md:text-xl font-bold text-gray-800 group-hover:text-green-700 transition-colors mb-0.5 md:mb-1 truncate">
                          {job.title}
                        </h2>
                        <p className="text-xs md:text-sm text-gray-500 font-medium truncate">{job.department}</p>
                      </div>
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>

                    <p className="text-gray-600 text-xs md:text-sm line-clamp-2 mb-3 md:mb-4">{job.description}</p>

                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-5 pb-3 md:pb-5 border-b border-gray-100">
                      <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm text-gray-500">
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                        <span className="truncate max-w-[100px] md:max-w-none">{job.locations.join(', ')}</span>
                      </div>
                      {/* Salary hidden */}
                      {job.education && (
                        <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm text-indigo-600">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          </svg>
                          <span className="truncate max-w-[80px] md:max-w-[120px]" title={job.education}>Education Req.</span>
                        </div>
                      )}
                      {/* T&C badge hidden */}
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJobId(job.id);
                        }}
                        className="flex-1 px-3 md:px-4 py-2 md:py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg md:rounded-xl hover:from-green-700 hover:to-emerald-700 font-medium transition-all shadow-sm hover:shadow-md text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2"
                      >
                        View
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJobForApply(job.id);
                          setView('apply');
                        }}
                        className="flex-1 px-3 md:px-4 py-2 md:py-2.5 border-2 border-green-600 text-green-600 rounded-lg md:rounded-xl hover:bg-green-50 font-medium transition-all text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2"
                      >
                        Apply
                        <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Pagination Controls - Mobile Optimized */}
            {totalPages > 1 && (
              <div className="mt-6 md:mt-10 flex justify-center items-center gap-2 md:gap-3">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 md:px-5 py-2 md:py-2.5 bg-white border border-gray-200 rounded-lg md:rounded-xl font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">Previous</span>
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                    let page;
                    if (totalPages <= 3) {
                      page = i + 1;
                    } else if (currentPage <= 2) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 1) {
                      page = totalPages - 2 + i;
                    } else {
                      page = currentPage - 1 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl font-medium transition-all text-sm md:text-base ${currentPage === page
                          ? 'bg-green-600 text-white shadow-lg'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
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
                  className="px-3 md:px-5 py-2 md:py-2.5 bg-white border border-gray-200 rounded-lg md:rounded-xl font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1 md:gap-2 text-sm md:text-base"
                >
                  <span className="hidden sm:inline">Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
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
    <div className="flex min-h-screen dark:bg-gray-900 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen p-4 md:p-6 lg:ml-0 pt-16 lg:pt-6 dark:text-gray-100">
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
          {view === "admin" && <JobList jobs={state.jobs} onCreate={createJob} onEdit={updateJob} onDelete={deleteJob} onUpdateScreeningCriteria={updateScreeningCriteria} />}
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
          {view === "interview-management" && (() => {

            const interviewCandidates = (state.applications || []).filter(app =>
              ['testing-complete', 'interview', 'interview-complete', 'phone-interview'].includes(app.status)
            );

            const filteredInterviewCandidates = interviewCandidates.filter(app => {
              if (interviewJobFilter !== 'all') {
                const appJobId = typeof app.jobId === 'object' ? app.jobId._id : app.jobId;
                if (appJobId !== interviewJobFilter) return false;
              }
              if (interviewFilter === 'pending') return ['testing-complete', 'interview', 'phone-interview'].includes(app.status);
              if (interviewFilter === 'completed') return app.status === 'interview-complete';
              return true;
            });

            const pendingCount = interviewCandidates.filter(app => ['testing-complete', 'interview', 'phone-interview'].includes(app.status)).length;
            const completedCount = interviewCandidates.filter(app => app.status === 'interview-complete').length;

            const getJobTitle = (jobId) => {
              const actualJobId = typeof jobId === 'object' ? jobId._id : jobId;
              const job = (state.jobs || []).find(j => (j._id || j.id) === actualJobId);
              return job ? job.title : (typeof jobId === 'object' && jobId.title) ? jobId.title : 'Unknown Position';
            };

            return (
              <div className="p-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Management</h1>
                  <p className="text-gray-600">Conduct interviews and provide feedback on candidates</p>

                  {/* Pipeline Progress Indicator */}
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-xs">1</div>
                          <div className="text-xs font-medium text-gray-600 mt-1">HR Review</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold text-xs">2</div>
                          <div className="text-xs font-medium text-gray-600 mt-1">AI Screening</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-lg ring-4 ring-blue-200">3</div>
                          <div className="text-xs font-bold text-blue-900 mt-1">Interview</div>
                          <div className="text-xs text-blue-600 font-medium">Current</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="flex flex-col items-center flex-shrink-0 opacity-30">
                        <div className="w-8 h-8 rounded-full bg-green-400 text-white flex items-center justify-center font-bold text-xs">4</div>
                        <div className="text-xs font-medium text-gray-600 mt-1">Offer</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mt-3 italic">
                      <svg className="w-4 h-4 inline-block text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <strong> Stage 3 of 4:</strong> Conduct interviews and provide feedback. Candidates with hire recommendation or score ≥7.0 become eligible for Offer Management.
                    </p>
                  </div>
                </div>

                {/* Position Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Position</label>
                  <select
                    value={interviewJobFilter}
                    onChange={(e) => setInterviewJobFilter(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Positions</option>
                    {(state.jobs || []).map(job => (
                      <option key={job._id || job.id} value={job._id || job.id}>{job.title}</option>
                    ))}
                  </select>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
                        <div className="text-sm text-yellow-600">Pending Feedback</div>
                        <div className="text-xs text-yellow-500">Awaiting evaluation</div>
                      </div>
                      <svg className="w-10 h-10 text-yellow-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-700">{completedCount}</div>
                        <div className="text-sm text-green-600">Completed</div>
                        <div className="text-xs text-green-500">Ready for next stage</div>
                      </div>
                      <svg className="w-10 h-10 text-green-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex gap-2">
                    <button onClick={() => setInterviewFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition ${interviewFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      All ({interviewCandidates.length})
                    </button>
                    <button onClick={() => setInterviewFilter('pending')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${interviewFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      ⏱ Pending Feedback ({pendingCount})
                    </button>
                    <button onClick={() => setInterviewFilter('completed')} className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${interviewFilter === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      ✓ Completed ({completedCount})
                    </button>
                  </div>
                </div>

                {/* Candidate Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredInterviewCandidates.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No candidates found</td></tr>
                      ) : (
                        filteredInterviewCandidates.map(app => (
                          <tr key={app.id || app._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{app.applicant?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{app.applicant?.email}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{getJobTitle(app.jobId)}</td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                {app.testing?.results?.score ? `${app.testing.results.score}%` : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-sm ${app.interview_feedback?.overall_score ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {app.interview_feedback?.overall_score || 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {app.interview_feedback?.recommendation || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {app.status !== 'interview-complete' ? (
                                <button
                                  onClick={() => setFeedbackModalApp(app)}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                >
                                  Add Feedback
                                </button>
                              ) : (
                                <button
                                  onClick={() => changeApplicationStatus(app.id || app._id, 'offer')}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
                                >
                                  Move to Offer
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          {view === "offer-management" && (() => {

            const offerCandidates = (state.applications || []).filter(app =>
              ['interview-complete', 'offer', 'hired', 'offer-rejected'].includes(app.status)
            );

            const filteredOfferCandidates = offerCandidates.filter(app => {
              if (offerJobFilter !== 'all') {
                const appJobId = typeof app.jobId === 'object' ? app.jobId._id : app.jobId;
                if (appJobId !== offerJobFilter) return false;
              }
              if (offerFilter === 'eligible') return app.status === 'interview-complete';
              if (offerFilter === 'pending') return app.status === 'offer';
              if (offerFilter === 'accepted') return app.status === 'hired';
              if (offerFilter === 'rejected') return app.status === 'offer-rejected';
              return true;
            });

            const eligibleCount = offerCandidates.filter(app => app.status === 'interview-complete').length;
            const pendingCount = offerCandidates.filter(app => app.status === 'offer').length;
            const acceptedCount = offerCandidates.filter(app => app.status === 'hired').length;
            const rejectedCount = offerCandidates.filter(app => app.status === 'offer-rejected').length;

            const getJobTitle = (jobId) => {
              const actualJobId = typeof jobId === 'object' ? jobId._id : jobId;
              const job = (state.jobs || []).find(j => (j._id || j.id) === actualJobId);
              return job ? job.title : (typeof jobId === 'object' && jobId.title) ? jobId.title : 'Unknown Position';
            };

            return (
              <div className="p-6">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Offer Management</h1>
                  <p className="text-gray-600">Extend and track job offers for successful candidates</p>

                  {/* Pipeline Progress Indicator */}
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-xs">1</div>
                          <div className="text-xs font-medium text-gray-600 mt-1">HR Review</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold text-xs">2</div>
                          <div className="text-xs font-medium text-gray-600 mt-1">AI Screening</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center font-bold text-xs">3</div>
                          <div className="text-xs font-medium text-gray-600 mt-1">Interview</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </div>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shadow-lg ring-4 ring-green-200">4</div>
                        <div className="text-xs font-bold text-green-900 mt-1">Offer Stage</div>
                        <div className="text-xs text-green-600 font-medium">Final</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700 mt-3 italic">
                      <svg className="w-4 h-4 inline-block text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <strong> Stage 4 of 4 - Final:</strong> Extend job offers to successful candidates. Track offer acceptance, rejection, or withdrawal.
                    </p>
                  </div>
                </div>

                {/* Position Filter */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Position</label>
                  <select
                    value={offerJobFilter}
                    onChange={(e) => setOfferJobFilter(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Positions</option>
                    {(state.jobs || []).map(job => (
                      <option key={job._id || job.id} value={job._id || job.id}>{job.title}</option>
                    ))}
                  </select>
                </div>

                {/* Stats Cards - 4 cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-blue-700">{eligibleCount}</div>
                        <div className="text-sm text-blue-600">Eligible</div>
                      </div>
                      <svg className="w-8 h-8 text-blue-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-yellow-700">{pendingCount}</div>
                        <div className="text-sm text-yellow-600">Pending</div>
                      </div>
                      <svg className="w-8 h-8 text-yellow-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-green-700">{acceptedCount}</div>
                        <div className="text-sm text-green-600">Accepted</div>
                      </div>
                      <svg className="w-8 h-8 text-green-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-red-700">{rejectedCount}</div>
                        <div className="text-sm text-red-600">Rejected</div>
                      </div>
                      <svg className="w-8 h-8 text-red-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setOfferFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition ${offerFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      All ({offerCandidates.length})
                    </button>
                    <button onClick={() => setOfferFilter('eligible')} className={`px-4 py-2 rounded-lg font-medium transition ${offerFilter === 'eligible' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      Eligible ({eligibleCount})
                    </button>
                    <button onClick={() => setOfferFilter('pending')} className={`px-4 py-2 rounded-lg font-medium transition ${offerFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      Pending ({pendingCount})
                    </button>
                    <button onClick={() => setOfferFilter('accepted')} className={`px-4 py-2 rounded-lg font-medium transition ${offerFilter === 'accepted' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      Accepted ({acceptedCount})
                    </button>
                    <button onClick={() => setOfferFilter('rejected')} className={`px-4 py-2 rounded-lg font-medium transition ${offerFilter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      Rejected ({rejectedCount})
                    </button>
                  </div>
                </div>

                {/* Candidate Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recommendation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Offer Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredOfferCandidates.length === 0 ? (
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No candidates found</td></tr>
                      ) : (
                        filteredOfferCandidates.map(app => (
                          <tr key={app.id || app._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{app.applicant?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{app.applicant?.email}</div>
                              <div className="text-xs text-gray-400">{app.applicant?.degree} • {app.applicant?.experienceYears || 0} yrs exp</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-700">{getJobTitle(app.jobId)}</div>
                              <div className="text-xs text-gray-500">Applied: {new Date(app.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                {app.interview_feedback?.overall_score ? `${app.interview_feedback.overall_score}/10` : 'N/A/10'}
                              </span>
                              {app.aiScore && (
                                <div className="text-xs text-gray-500 mt-1">AI: {app.aiScore}</div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">
                                {app.interview_feedback?.recommendation || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${app.status === 'hired' ? 'bg-green-100 text-green-700' :
                                app.status === 'offer' ? 'bg-yellow-100 text-yellow-700' :
                                  app.status === 'offer-rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                {app.status === 'interview-complete' ? 'No Offer' :
                                  app.status === 'hired' ? 'Accepted' :
                                    app.status === 'offer' ? 'Pending' :
                                      app.status === 'offer-rejected' ? 'Rejected' : app.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {app.status === 'interview-complete' && (
                                <button
                                  onClick={() => setOfferModalApp(app)}
                                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
                                >
                                  + Extend Offer
                                </button>
                              )}
                              {app.status === 'offer' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => changeApplicationStatus(app.id || app._id, 'hired')}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                                  >
                                    Hire
                                  </button>
                                  <button
                                    onClick={() => changeApplicationStatus(app.id || app._id, 'offer-rejected')}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                              {(app.status === 'hired' || app.status === 'offer-rejected') && (
                                <span className="text-sm text-gray-400 italic">Completed</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
          {view === "analytics" && <AnalyticsDashboard state={state} onGenerateTestData={handleGenerateTestData} />}
          {view === "shortlists" && <ShortlistPanel shortlist={state.shortlists} onUpdate={createShortlist} />}
          {view === "audit" && <AuditLog auditRecords={state.audit} />}
          {view === "settings" && (
            <div>
              {/* Feature Toggles */}
              <FeatureToggles addToast={addToast} />
              <div className="mt-6">
                <SettingsPanel
                  settings={state.settings}
                  onUpdateSettings={(newSettings) => {
                    setState(s => ({ ...s, settings: newSettings }));
                    addToast('Settings updated successfully', { type: 'success' });
                    audit('update-settings', { settingsUpdated: Object.keys(newSettings) });
                  }}
                  onTestEmail={async (testEmail) => {
                    addToast(`Test email sent to ${testEmail}`, { type: 'success' });
                  }}
                />
              </div>
            </div>
          )}
          {view === "operations" && <SystemDashboard />}
          {view === "content-admin" && <ContentManagementPanel />}
          {view === "about-us" && <ContentPage slug="about-us" onBack={() => setView("jobs")} />}
          {view === "faq" && <ContentPage slug="faq" onBack={() => setView("jobs")} />}
          {view === "privacy-policy" && <ContentPage slug="privacy-policy" onBack={() => setView("jobs")} />}
          {view === "terms-of-service" && <ContentPage slug="terms-of-service" onBack={() => setView("jobs")} />}

          {/* Staff Login - separate page at /staff */}
          {view === "staff-login" && !user && (
            <div className="max-w-md mx-auto mt-8 md:mt-16">
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10 border border-gray-100">
                <div className="text-center mb-6 md:mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                    <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-800">Staff Portal</h1>
                  <p className="text-sm text-gray-500 mt-1">Authorized personnel only</p>
                </div>
                <LoginInline
                  onLogin={async (cred) => {
                    const res = await auth.login(cred);
                    if (!res.ok) addToast(res.message || "Login failed", { type: 'error' });
                    else setView("dashboard");
                  }}
                />
              </div>
            </div>
          )}
          {view === "staff-login" && user && (() => { setView("dashboard"); return null; })()}

          {/* 404 Not Found fallback */}
          {!["jobs","dashboard","apply","candidate-login","my-apps","admin","hr","ai-screening","test-management","interview-management","offer-management","analytics","shortlists","audit","settings","operations","content-admin","about-us","faq","privacy-policy","terms-of-service","staff-login"].includes(view) && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div className="text-8xl font-bold text-green-600/20 mb-2">404</div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">Page Not Found</h1>
              <p className="text-gray-500 mb-6 max-w-md">
                The page you're looking for doesn't exist or has been moved.
              </p>
              <button
                onClick={() => setView("jobs")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" /></svg>
                Back to Jobs
              </button>
            </div>
          )}
        </div>

        {/* Toast notifications */}
        <Toasts toasts={state.toasts} />

        {/* Footer */}
        <footer className="mt-8 md:mt-16 glass-card rounded-xl p-4 md:p-8 shadow-lg">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {/* Brand Section */}
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-3 md:mb-4">
                  <img src={logo} alt="Careers" className="h-6 md:h-8" />
                  <span className="font-display text-xl md:text-2xl font-bold text-green-700">Careers</span>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 leading-relaxed">
                  Enterprise Recruitment Portal powered by AI. Streamline your hiring process with intelligent candidate screening and analytics.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://www.facebook.com/people/Pakistan-Virtual-Assets-Regulatory-Authority/61580867075371/?mibextid=wwXIfr&rdid=YpFMGLWpMwXj8ZJA&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19vK1MMWJL%2F%3Fmibextid%3DwwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-green-700 transition"
                    aria-label="Visit Facebook"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                  <a
                    href="https://x.com/pvara_gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-green-700 transition"
                    aria-label="Visit Twitter/X"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/pakistanvara"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-green-700 transition"
                    aria-label="Visit LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 md:mb-4 text-sm md:text-base">Quick Links</h3>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                  <li><button type="button" onClick={() => setView("jobs")} className="text-gray-600 hover:text-green-700 transition">Browse Jobs</button></li>
                  <li><button type="button" onClick={() => setView("apply")} className="text-gray-600 hover:text-green-700 transition">Apply Now</button></li>
                  <li><button type="button" onClick={() => setView("candidate-login")} className="text-gray-600 hover:text-green-700 transition">Track My Applications</button></li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-2 md:mb-4 text-sm md:text-base">Contact</h3>
                <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                  <li className="text-gray-600 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span>Office No. 12, Ground Floor, Evacuee Trust Complex, F-5/1, Aga Khan Road, Islamabad</span>
                  </li>
                  <li className="text-gray-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span>051-9037100</span>
                  </li>
                  <li className="text-gray-600 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>
                    <a href="https://pvara.gov.pk" target="_blank" rel="noopener noreferrer" className="hover:text-green-700 transition">pvara.gov.pk</a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-gray-300/50 mt-4 md:mt-8 pt-4 md:pt-6 text-center">
              <p className="text-[10px] md:text-sm text-gray-600 whitespace-nowrap">
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
              {drawer.app.aiScore != null && (
                <div className="mt-2 text-sm"><span className="font-semibold">AI Score:</span> <span className={drawer.app.aiScore >= 75 ? 'text-green-600 font-bold' : drawer.app.aiScore >= 50 ? 'text-yellow-600 font-bold' : 'text-red-600 font-bold'}>{drawer.app.aiScore}/100</span></div>
              )}

              {/* Contact Info */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                <div className="font-semibold text-gray-800 mb-2">Contact</div>
                <div><span className="text-gray-500">Email:</span> {drawer.app.applicant.email}</div>
                <div><span className="text-gray-500">Phone:</span> {drawer.app.applicant.phone}</div>
                {drawer.app.applicant.alternatePhone && <div><span className="text-gray-500">Alt Phone:</span> {drawer.app.applicant.alternatePhone}</div>}
                <div><span className="text-gray-500">CNIC:</span> {drawer.app.applicant.cnic}</div>
                {drawer.app.applicant.city && <div><span className="text-gray-500">Location:</span> {[drawer.app.applicant.city, drawer.app.applicant.state, drawer.app.applicant.country].filter(Boolean).join(', ')}</div>}
                {drawer.app.applicant.linkedin && <div><span className="text-gray-500">LinkedIn:</span> <a href={drawer.app.applicant.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Profile</a></div>}
              </div>

              {/* Qualifications */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-sm">
                <div className="font-semibold text-gray-800 mb-2">Qualifications</div>
                <div><span className="text-gray-500">Degree:</span> {drawer.app.applicant.degree}</div>
                <div><span className="text-gray-500">Experience:</span> {drawer.app.applicant.experienceYears} years</div>
                {drawer.app.applicant.skills?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-gray-500">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">{drawer.app.applicant.skills.map((s, i) => <span key={i} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">{s}</span>)}</div>
                  </div>
                )}
              </div>

              {/* Education */}
              {drawer.app.applicant.education?.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-semibold text-gray-800 mb-2">Education</div>
                  {drawer.app.applicant.education.map((edu, i) => (
                    <div key={i} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                      <div className="font-medium">{edu.degree} — {edu.fieldOfStudy}</div>
                      <div className="text-gray-500 text-xs">{edu.school}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Employment */}
              {drawer.app.applicant.employment?.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-semibold text-gray-800 mb-2">Employment</div>
                  {drawer.app.applicant.employment.map((emp, i) => (
                    <div key={i} className="mb-2 pb-2 border-b border-gray-200 last:border-0">
                      <div className="font-medium">{emp.jobTitle}</div>
                      <div className="text-gray-500 text-xs">{emp.employer} {emp.startYear && `(${emp.startYear}${emp.endYear ? '-' + emp.endYear : '-Present'})`}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Files */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-semibold text-gray-800 mb-2">Documents</div>
                {drawer.app.applicant.cv ? (
                  <a href={`${process.env.REACT_APP_API_URL || 'https://backend.pvara.team'}${drawer.app.applicant.cv.startsWith('/') ? '' : '/'}${drawer.app.applicant.cv}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download CV
                  </a>
                ) : <div className="text-gray-400">No CV</div>}
                {drawer.app.applicant.coverLetter ? (
                  <a href={`${process.env.REACT_APP_API_URL || 'https://backend.pvara.team'}${drawer.app.applicant.coverLetter.startsWith('/') ? '' : '/'}${drawer.app.applicant.coverLetter}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download Cover Letter
                  </a>
                ) : <div className="text-gray-400">No cover letter</div>}
              </div>

              <div className="mt-2 text-xs text-red-600">Screening: {drawer.app.screeningErrors?.length ? drawer.app.screeningErrors.join(", ") : "Passed"}</div>
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

      {/* Interview Feedback Modal */}
      <InterviewFeedbackModal
        open={!!feedbackModalApp}
        candidate={feedbackModalApp}
        job={(state.jobs || []).find(j => (j._id || j.id) === (typeof feedbackModalApp?.jobId === 'object' ? feedbackModalApp?.jobId?._id : feedbackModalApp?.jobId))}
        onClose={() => setFeedbackModalApp(null)}
        onSave={(feedback) => {
          if (feedbackModalApp) {
            const appId = feedbackModalApp.id || feedbackModalApp._id;
            setState(s => ({
              ...s,
              applications: (s.applications || []).map(app =>
                (app.id || app._id) === appId
                  ? { ...app, interview_feedback: feedback, status: 'interview-complete' }
                  : app
              )
            }));
            addToast('Interview feedback saved successfully', { type: 'success' });
          }
          setFeedbackModalApp(null);
        }}
      />

      {/* Extend Offer Modal */}
      <ExtendOfferModal
        open={!!offerModalApp}
        candidate={offerModalApp}
        job={(state.jobs || []).find(j => (j._id || j.id) === (typeof offerModalApp?.jobId === 'object' ? offerModalApp?.jobId?._id : offerModalApp?.jobId))}
        onClose={() => setOfferModalApp(null)}
        onSave={(offerDetails) => {
          if (offerModalApp) {
            const appId = offerModalApp.id || offerModalApp._id;
            setState(s => ({
              ...s,
              applications: (s.applications || []).map(app =>
                (app.id || app._id) === appId
                  ? { ...app, offer_details: offerDetails, status: 'offer' }
                  : app
              )
            }));
            addToast('Offer letter sent successfully', { type: 'success' });
          }
          setOfferModalApp(null);
        }}
      />
    </div>
  );
}

// Wrap with AuthProvider and ToastProvider for standalone mounting
export default function PvaraPhase2Wrapper() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <PvaraPhase2 />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
