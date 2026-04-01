// ========================================
// ADVANCED FEATURES MODULE FOR PVARA
// ========================================
// Includes: Email, Scheduling, Messaging, Filtering, Kanban, Feedback, Offers, Integrations, Reports, Settings

// 1. EMAIL NOTIFICATIONS
export const EmailTemplates = {
  APPLICATION_RECEIVED: (candidateName, jobTitle) => ({
    subject: `Application Received - ${jobTitle}`,
    body: `Dear ${candidateName},\n\nThank you for applying to ${jobTitle} at PVARA.\n\nWe have received your application and will review it shortly. You will be notified of the next steps.\n\nBest regards,\nPVARA Recruitment Team`,
  }),
  APPLICATION_SHORTLISTED: (candidateName, jobTitle) => ({
    subject: `Congratulations! You've been shortlisted for ${jobTitle}`,
    body: `Dear ${candidateName},\n\nGreat news! You have been shortlisted for the ${jobTitle} position.\n\nOur team will contact you soon to schedule an interview.\n\nBest regards,\nPVARA Recruitment Team`,
  }),
  INTERVIEW_SCHEDULED: (candidateName, jobTitle, date, time, interviewType) => ({
    subject: `Interview Scheduled - ${jobTitle}`,
    body: `Dear ${candidateName},\n\nYour ${interviewType} interview for ${jobTitle} is scheduled on ${date} at ${time}.\n\nPlease confirm your availability.\n\nBest regards,\nPVARA Recruitment Team`,
  }),
  OFFER_EXTENDED: (candidateName, jobTitle, salary) => ({
    subject: `Job Offer - ${jobTitle}`,
    body: `Dear ${candidateName},\n\nWe are excited to offer you the position of ${jobTitle} with a salary of ${salary}.\n\nPlease review the attached offer letter and let us know your decision.\n\nBest regards,\nPVARA Recruitment Team`,
  }),
  REJECTION: (candidateName, jobTitle) => ({
    subject: `Application Status - ${jobTitle}`,
    body: `Dear ${candidateName},\n\nThank you for your interest in the ${jobTitle} position. After careful consideration, we have decided to move forward with other candidates.\n\nBest of luck in your future endeavors!\n\nBest regards,\nPVARA Recruitment Team`,
  }),

};

export function sendEmail(to, template) {
  // Simulated email sending - in production, use SendGrid, AWS SES, etc.
  const emailLog = JSON.parse(localStorage.getItem("PVARA_EMAILS") || "[]");
  const email = {
    id: `email-${Date.now()}`,
    to,
    subject: template.subject,
    body: template.body,
    sentAt: new Date().toISOString(),
    status: "sent",
  };
  emailLog.push(email);
  localStorage.setItem("PVARA_EMAILS", JSON.stringify(emailLog));
  console.log(`📧 Email sent to ${to}: ${template.subject}`);
  return email;

}
// 2. INTERVIEW SCHEDULING
export const InterviewTypes = ["Phone Screen", "Video Interview", "In-Person", "Group Discussion", "Technical Round"];

export function scheduleInterview(candidateId, jobId, type, date, time, notes = "") {
  const interview = {
    id: `interview-${Date.now()}`,
    candidateId,
    jobId,
    type,
    date,
    time,
    notes,
    status: "scheduled",
    createdAt: new Date().toISOString(),
    feedbackScores: {}, // For multiple interviewers
  };
  return interview;
}

export function generateAvailabilitySlots(date, duration = 30) {
  // Generate 30-min slots throughout the day
  const slots = [];
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  for (let i = 0; i < 16; i++) {
    const slotStart = new Date(start);
    slotStart.setMinutes(start.getMinutes() + i * duration);
    slots.push({
      time: slotStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      available: true,
    });
  }
  return slots;
}

// 3. CANDIDATE COMMUNICATION
export function addMessage(fromId, toId, content, messageType = "feedback") {
  return {
    id: `msg-${Date.now()}`,
    fromId,
    toId,
    content,
    type: messageType, // 'feedback', 'note', 'question'
    createdAt: new Date().toISOString(),
    isRead: false,
  };
}

export function getConversation(candidateId, hrId) {
  const messages = JSON.parse(localStorage.getItem("PVARA_MESSAGES") || "[]");
  return messages.filter((m) => (m.fromId === candidateId && m.toId === hrId) || (m.fromId === hrId && m.toId === candidateId));
}

// 4. ADVANCED FILTERING
export function applyAdvancedFilter(applications, filters) {
  return applications.filter((app) => {
    if (filters.status && app.status !== filters.status) return false;
    if (filters.minScore && app.aiScore < filters.minScore) return false;
    if (filters.maxScore && app.aiScore > filters.maxScore) return false;
    if (filters.dateFrom && new Date(app.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(app.createdAt) > new Date(filters.dateTo)) return false;
    if (filters.skills?.length && !filters.skills.some((s) => app.applicant.skills?.includes(s))) return false;
    if (filters.searchText && !app.applicant.name.toLowerCase().includes(filters.searchText.toLowerCase())) return false;
    return true;
  });
}

export function saveSavedFilter(name, filterCriteria) {
  const savedFilters = JSON.parse(localStorage.getItem("PVARA_SAVED_FILTERS") || "{}");
  savedFilters[name] = filterCriteria;
  localStorage.setItem("PVARA_SAVED_FILTERS", JSON.stringify(savedFilters));
  return savedFilters;
}

// 5. KANBAN PIPELINE
export function organizeByPipeline(applications) {
  const stages = {
    "submitted": [],
    "shortlisted": [],
    "phone-screen": [],
    "interview": [],
    "offer": [],
    "accepted": [],
    "rejected": [],
  };
  applications.forEach((app) => {
    if (stages[app.status]) stages[app.status].push(app);
  });
  return stages;
}

// 6. INTERVIEW FEEDBACK & SCORING
export function submitInterviewerFeedback(interviewId, interviewerId, score, comments) {
  return {
    id: `feedback-${Date.now()}`,
    interviewId,
    interviewerId,
    score, // 1-10
    comments,
    submittedAt: new Date().toISOString(),
  };
}

export function calculateAggregateScore(feedbackArray) {
  if (feedbackArray.length === 0) return 0;
  const total = feedbackArray.reduce((sum, f) => sum + f.score, 0);
  return (total / feedbackArray.length).toFixed(1);
}

export function rankCandidatesByInterview(candidates, feedbackMap) {
  return candidates
    .map((c) => ({
      ...c,
      interviewScore: calculateAggregateScore(feedbackMap[c.id] || []),
    }))
    .sort((a, b) => b.interviewScore - a.interviewScore);
}

// 7. OFFER MANAGEMENT
export function generateOfferLetter(candidate, job, salary, startDate) {
  return {
    id: `offer-${Date.now()}`,
    candidateId: candidate.id,
    jobId: job.id,
    offerContent: `
OFFER LETTER

Dear ${candidate.name},

We are pleased to offer you the position of ${job.title} at PVARA.

Position: ${job.title}
Department: ${job.department}
Salary: ${salary} per annum
Start Date: ${startDate}

This offer is contingent upon successful background verification and reference checks.

Please confirm your acceptance or rejection by replying to this email.

Best regards,
PVARA Management
    `,
    salary,
    startDate,
    status: "pending", // pending, accepted, rejected
    createdAt: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
  };
}

export function trackOfferResponse(offerId, response) {
  // 'accepted' or 'rejected'
  return {
    offerId,
    response,
    respondedAt: new Date().toISOString(),
  };
}

// 8. INTEGRATIONS
export function exportToCSV(applications, filename = "applications.csv") {
  const headers = ["Name", "Email", "Job", "Status", "AI Score", "Applied Date"];
  const rows = applications.map((a) => [
    a.applicant.name,
    a.applicant.email,
    a.jobId,
    a.status,
    (a.aiScore || 0).toFixed(2),
    new Date(a.createdAt).toLocaleDateString(),
  ]);

  let csv = headers.join(",") + "\n";
  rows.forEach((row) => {
    csv += row.map((cell) => `"${cell}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToGoogleSheets(applications) {
  const sheetData = applications.map((a) => [
    a.applicant.name,
    a.applicant.email,
    a.applicant.phone,
    a.status,
    (a.aiScore || 0).toFixed(2),
  ]);
  // In production: Use Google Sheets API
  console.log("📊 Export to Google Sheets:", sheetData);
  return sheetData;
}

export function notifySlack(message) {
  // In production: Use Slack API
  console.log("💬 Slack Notification:", message);
  return { status: "sent", message };
}

// 9. ANALYTICS & REPORTS
export function calculateMetrics(applications, jobs, startDate = null) {
  const filtered = startDate
    ? applications.filter((a) => new Date(a.createdAt) >= new Date(startDate))
    : applications;

  const totalApplications = filtered.length;
  const shortlisted = filtered.filter((a) => ["shortlisted", "interview", "offer", "accepted"].includes(a.status)).length;
  const hired = filtered.filter((a) => a.status === "accepted").length;
  const rejected = filtered.filter((a) => a.status === "rejected").length;

  // Time to hire (from application to accepted)
  const timeToHireData = filtered
    .filter((a) => a.status === "accepted")
    .map((a) => (new Date(a.updatedAt || a.createdAt) - new Date(a.createdAt)) / (1000 * 60 * 60 * 24)) // days
    .filter((days) => days > 0);
  const avgTimeToHire = timeToHireData.length > 0 ? (timeToHireData.reduce((a, b) => a + b, 0) / timeToHireData.length).toFixed(1) : 0;

  // Cost per hire (assumed $500 per hiring process)
  const costPerHire = hired > 0 ? ((totalApplications * 100) / hired).toFixed(2) : 0;

  // Conversion rate
  const conversionRate = totalApplications > 0 ? ((hired / totalApplications) * 100).toFixed(1) : 0;

  return {
    totalApplications,
    shortlisted,
    hired,
    rejected,
    shortlistRate: ((shortlisted / totalApplications) * 100).toFixed(1),
    conversionRate,
    avgTimeToHire,
    costPerHire,
    sourceAnalytics: analyzeApplicationSources(filtered),
  };
}

export function analyzeApplicationSources(applications) {
  const sources = {};
  applications.forEach((app) => {
    const source = app.source || "direct";
    sources[source] = (sources[source] || 0) + 1;
  });
  return sources;
}

export function recruiterPerformance(applications, hireIds) {
  const performance = {};
  hireIds.forEach((id) => {
    const assigned = applications.filter((a) => a.assignedTo === id);
    const hired = assigned.filter((a) => a.status === "accepted");
    performance[id] = {
      assigned: assigned.length,
      hired: hired.length,
      conversionRate: assigned.length > 0 ? ((hired.length / assigned.length) * 100).toFixed(1) : 0,
    };
  });
  return performance;
}

// 10. SETTINGS & CUSTOMIZATION
export function getCompanySettings() {
  return JSON.parse(localStorage.getItem("PVARA_COMPANY_SETTINGS") || "{}") || {
    companyName: "PVARA",
    logo: null,
    primaryColor: "#1f7e4f",
    emailTemplate: "default",
    customFields: {},
  };
}

export function updateCompanySettings(settings) {
  localStorage.setItem("PVARA_COMPANY_SETTINGS", JSON.stringify(settings));
  return settings;
}

export function addCustomField(fieldName, fieldType, isRequired = false) {
  const settings = getCompanySettings();
  settings.customFields[fieldName] = { type: fieldType, required: isRequired };
  return updateCompanySettings(settings);
}

export function manageUsers(action, userData) {
  const users = JSON.parse(localStorage.getItem("PVARA_TEAM_USERS") || "[]");
  if (action === "add") {
    users.push({ ...userData, id: `user-${Date.now()}`, createdAt: new Date().toISOString() });
  } else if (action === "remove") {
    return users.filter((u) => u.id !== userData.id);
  } else if (action === "update") {
    return users.map((u) => (u.id === userData.id ? userData : u));
  }
  localStorage.setItem("PVARA_TEAM_USERS", JSON.stringify(users));
  return users;
}
