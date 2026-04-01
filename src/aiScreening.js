/**
 * AI-Powered Candidate Screening & Evaluation Engine
 * Provides algorithms for candidate scoring, auto-selection, and analytics
 * 
 * Now supports per-job screening criteria for customized evaluation
 */

// Default scoring weights (used when job has no custom criteria)
const DEFAULT_SCORING_WEIGHTS = {
  educationMatch: 0.20,
  experienceMatch: 0.25,
  skillsMatch: 0.35,
  certificationsMatch: 0.10,
  cultureAlignment: 0.10,
};

// Default thresholds
const DEFAULT_THRESHOLDS = {
  autoShortlist: 75,
  autoReject: 40,
};

/**
 * Get scoring weights from job's screening criteria or use defaults
 */
function getWeightsFromCriteria(screeningCriteria) {
  if (!screeningCriteria) return DEFAULT_SCORING_WEIGHTS;
  
  const total = (screeningCriteria.weightEducation || 20) +
                (screeningCriteria.weightExperience || 25) +
                (screeningCriteria.weightSkills || 35) +
                (screeningCriteria.weightCertifications || 10) +
                (screeningCriteria.weightCultureFit || 10);
  
  // Normalize to ensure total = 1.0
  const normalizer = total > 0 ? total / 100 : 1;
  
  return {
    educationMatch: (screeningCriteria.weightEducation || 20) / 100 / normalizer,
    experienceMatch: (screeningCriteria.weightExperience || 25) / 100 / normalizer,
    skillsMatch: (screeningCriteria.weightSkills || 35) / 100 / normalizer,
    certificationsMatch: (screeningCriteria.weightCertifications || 10) / 100 / normalizer,
    cultureAlignment: (screeningCriteria.weightCultureFit || 10) / 100 / normalizer,
  };
}

/**
 * Get thresholds from job's screening criteria or use defaults
 */
function getThresholdsFromCriteria(screeningCriteria) {
  if (!screeningCriteria) return DEFAULT_THRESHOLDS;
  
  return {
    autoShortlist: screeningCriteria.autoShortlistThreshold ?? 75,
    autoReject: screeningCriteria.autoRejectThreshold ?? 40,
  };
}

/**
 * Calculate AI Score for a candidate against job requirements
 * Now uses job's screeningCriteria for custom weights and requirements
 * Returns score (0-100) and breakdown by category
 */
export function calculateCandidateScore(candidate, job) {
  // Extract screening criteria from job (support both old and new structure)
  const screeningCriteria = job?.screeningCriteria || job?.screening_criteria || null;
  const jobRequirements = job?.fields || job || {};
  
  // Get weights from job criteria or use defaults
  const weights = getWeightsFromCriteria(screeningCriteria);
  
  const scores = {
    educationMatch: scoreEducation(candidate, jobRequirements, screeningCriteria),
    experienceMatch: scoreExperience(candidate, jobRequirements, screeningCriteria),
    skillsMatch: scoreSkills(candidate, jobRequirements, screeningCriteria),
    certificationsMatch: scoreCertifications(candidate, jobRequirements, screeningCriteria),
    cultureAlignment: scoreCultureFit(candidate),
  };

  const totalScore = Object.entries(scores).reduce((sum, [key, value]) => {
    return sum + (value * (weights[key] || 0));
  }, 0);

  return {
    totalScore: Math.round(totalScore),
    breakdown: scores,
    weights: weights,
    thresholds: getThresholdsFromCriteria(screeningCriteria),
    screeningMode: screeningCriteria?.screeningMode || 'semi-auto',
  };
}

function scoreEducation(candidate, requirements, screeningCriteria) {
  // Use screening criteria's required degree if available
  const required = screeningCriteria?.requiredDegree || 
                   requirements?.education?.required || 
                   'none';
  
  if (required === 'none' || !required) return 100; // No requirement = full score
  
  const candidateDegree = (candidate.degree || candidate.education || '').toLowerCase();

  const degreeHierarchy = {
    'high school': 1,
    'diploma': 1.5,
    'associate': 1.5,
    'bachelor': 2,
    'bachelors': 2,
    'master': 3,
    'masters': 3,
    'mba': 3,
    'phd': 4,
    'doctorate': 4,
  };

  const requiredLevel = degreeHierarchy[required.toLowerCase()] || 2;
  const candidateLevel = Object.entries(degreeHierarchy).find(
    ([degree]) => candidateDegree.includes(degree.toLowerCase())
  )?.[1] || 0;

  if (candidateLevel === 0) return 20; // Unknown degree gets minimal score
  return Math.min((candidateLevel / requiredLevel) * 100, 100);
}

function scoreExperience(candidate, requirements, screeningCriteria) {
  // Use screening criteria's min experience if available
  const minRequired = screeningCriteria?.minExperienceYears ?? 
                      screeningCriteria?.minExperience ??
                      requirements?.experience?.minYears ?? 
                      0;
  const maxRequired = screeningCriteria?.maxExperienceYears ?? null;
  
  const candidateYears = Number(candidate.experienceYears) || 
                         Number(candidate.experience) || 
                         extractExperienceYears(candidate) || 
                         0;

  if (minRequired === 0) return 100; // No minimum = full score
  if (candidateYears === 0 && minRequired > 0) return 10; // No experience but required
  
  // Check if within range
  if (maxRequired && candidateYears > maxRequired) {
    // Over-qualified penalty (mild)
    return Math.max(70, 100 - ((candidateYears - maxRequired) * 5));
  }
  
  if (candidateYears >= minRequired * 1.5) return 100; // Exceeds by 50%+
  if (candidateYears >= minRequired) return 90; // Meets requirement
  
  return Math.min((candidateYears / minRequired) * 100, 100);
}

/**
 * Try to extract experience years from candidate data
 */
function extractExperienceYears(candidate) {
  // Check common fields
  if (candidate.yearsOfExperience) return Number(candidate.yearsOfExperience);
  if (candidate.workExperience) return Number(candidate.workExperience);
  
  // Try to parse from text fields
  const text = JSON.stringify(candidate).toLowerCase();
  const match = text.match(/(\d+)\s*(?:\+\s*)?(?:years?|yrs?)/);
  return match ? parseInt(match[1]) : 0;
}

function scoreSkills(candidate, requirements, screeningCriteria) {
  // Prioritize screening criteria skills
  const requiredSkills = screeningCriteria?.requiredSkills || 
                         requirements?.skills?.required || 
                         [];
  const preferredSkills = screeningCriteria?.preferredSkills || 
                          requirements?.skills?.preferred || 
                          [];
  
  if (requiredSkills.length === 0 && preferredSkills.length === 0) return 100;

  const candidateSkills = extractCandidateSkills(candidate);
  
  // Score required skills (70% weight)
  let requiredScore = 100;
  if (requiredSkills.length > 0) {
    const matchedRequired = requiredSkills.filter(skill =>
      candidateSkills.some(cs => 
        cs.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(cs)
      )
    ).length;
    requiredScore = (matchedRequired / requiredSkills.length) * 100;
  }
  
  // Score preferred skills (30% weight)
  let preferredScore = 100;
  if (preferredSkills.length > 0) {
    const matchedPreferred = preferredSkills.filter(skill =>
      candidateSkills.some(cs => 
        cs.includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(cs)
      )
    ).length;
    preferredScore = (matchedPreferred / preferredSkills.length) * 100;
  }
  
  // Combined score: required skills are more important
  return Math.round(requiredScore * 0.7 + preferredScore * 0.3);
}

/**
 * Extract skills from various candidate data formats
 */
function extractCandidateSkills(candidate) {
  let skills = [];
  
  // Direct skills array
  if (Array.isArray(candidate.skills)) {
    skills = [...skills, ...candidate.skills];
  }
  
  // Skills as string
  if (typeof candidate.skills === 'string') {
    skills = [...skills, ...candidate.skills.split(/[,;]/g)];
  }
  
  // Technical skills
  if (candidate.technicalSkills) {
    if (Array.isArray(candidate.technicalSkills)) {
      skills = [...skills, ...candidate.technicalSkills];
    } else {
      skills = [...skills, ...String(candidate.technicalSkills).split(/[,;]/g)];
    }
  }
  
  // From CV/resume parsed data
  if (candidate.parsedCV?.skills) {
    skills = [...skills, ...candidate.parsedCV.skills];
  }
  
  return skills.map(s => String(s).toLowerCase().trim()).filter(Boolean);
}

function scoreCertifications(candidate, requirements, screeningCriteria) {
  const required = screeningCriteria?.requiredCertifications || 
                   requirements?.certifications?.required || 
                   [];
  
  if (required.length === 0) return 100;

  const candidateCerts = extractCandidateCertifications(candidate);
  
  const matched = required.filter(cert =>
    candidateCerts.some(cc => 
      cc.includes(cert.toLowerCase()) || 
      cert.toLowerCase().includes(cc)
    )
  ).length;

  return (matched / required.length) * 100;
}

/**
 * Extract certifications from candidate data
 */
function extractCandidateCertifications(candidate) {
  let certs = [];
  
  if (Array.isArray(candidate.certifications)) {
    certs = [...certs, ...candidate.certifications];
  }
  
  if (typeof candidate.certifications === 'string') {
    certs = [...certs, ...candidate.certifications.split(/[,;]/g)];
  }
  
  if (candidate.parsedCV?.certifications) {
    certs = [...certs, ...candidate.parsedCV.certifications];
  }
  
  return certs.map(c => String(c).toLowerCase().trim()).filter(Boolean);
}

function scoreCultureFit(candidate) {
  // Heuristic scoring based on profile completeness and communication indicators
  const indicators = [
    candidate.linkedin?.length > 0,
    candidate.portfolio?.length > 0,
    candidate.address?.length > 0,
    candidate.phone?.length > 0,
    candidate.email?.length > 0,
    candidate.coverLetter?.length > 50,
  ];
  return (indicators.filter(Boolean).length / indicators.length) * 100;
}

/**
 * Auto-select candidates based on job-specific thresholds
 * Now uses screeningCriteria from job for custom thresholds
 * Returns list of candidates with auto-selection recommendation
 */
export function autoSelectCandidates(candidates, job, customThreshold = null) {
  const screeningCriteria = job?.screeningCriteria || job?.screening_criteria || null;
  const thresholds = getThresholdsFromCriteria(screeningCriteria);
  const shortlistThreshold = customThreshold ?? thresholds.autoShortlist;
  const rejectThreshold = thresholds.autoReject;
  const screeningMode = screeningCriteria?.screeningMode || 'semi-auto';
  
  return candidates
    .map(candidate => {
      const scoreResult = calculateCandidateScore(candidate, job);
      const aiScore = scoreResult.totalScore;
      
      // Determine recommendation based on thresholds
      let recommendation, autoAction;
      if (aiScore >= shortlistThreshold) {
        recommendation = '✅ SHORTLIST - Strong match for interview';
        autoAction = screeningMode === 'auto' ? 'shortlist' : 'recommend-shortlist';
      } else if (aiScore <= rejectThreshold) {
        recommendation = '❌ REJECT - Below minimum requirements';
        autoAction = screeningMode === 'auto' ? 'reject' : 'recommend-reject';
      } else {
        recommendation = '🔍 REVIEW - Needs manual evaluation';
        autoAction = 'manual-review';
      }
      
      return {
        ...candidate,
        aiScore,
        scoreBreakdown: scoreResult.breakdown,
        weights: scoreResult.weights,
        autoSelected: aiScore >= shortlistThreshold,
        autoRejected: aiScore <= rejectThreshold,
        recommendation,
        autoAction,
        screeningMode,
        thresholds: { shortlist: shortlistThreshold, reject: rejectThreshold },
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore);
}

/**
 * Batch evaluate applications with AI and update their status
 * Now respects job-specific screening criteria and modes
 * Returns updated applications with scores and new status
 */
export function batchEvaluateApplications(applications, jobs) {
  return applications.map(app => {
    // Skip if already evaluated (has aiScore) and not in 'submitted' status
    if (app.aiScore && app.status !== 'submitted') {
      return app;
    }

    // Find the job this application is for
    const job = jobs.find(j => j.id === app.jobId);
    if (!job) return app;

    // Get screening criteria and mode
    const screeningCriteria = job.screeningCriteria || job.screening_criteria || null;
    const screeningMode = screeningCriteria?.screeningMode || 'semi-auto';
    const thresholds = getThresholdsFromCriteria(screeningCriteria);

    // Calculate AI score using job's criteria
    const scoreResult = calculateCandidateScore(app.applicant || app, job);
    const aiScore = scoreResult.totalScore;

    // Determine new status based on screening mode and thresholds
    let newStatus = app.status;
    let aiDecision = 'pending';
    
    if (app.status === 'submitted') {
      if (screeningMode === 'manual') {
        // Manual mode: don't auto-change status, just add score
        newStatus = 'screening';
        aiDecision = 'manual-review-required';
      } else if (screeningMode === 'auto') {
        // Full auto mode: automatically shortlist or reject
        if (aiScore >= thresholds.autoShortlist) {
          newStatus = 'phone-interview';
          aiDecision = 'auto-shortlisted';
        } else if (aiScore <= thresholds.autoReject) {
          newStatus = 'rejected';
          aiDecision = 'auto-rejected';
        } else {
          newStatus = 'screening';
          aiDecision = 'needs-review';
        }
      } else {
        // Semi-auto mode (default): suggest but require HR confirmation
        if (aiScore >= thresholds.autoShortlist) {
          newStatus = 'screening'; // Move to screening, not directly to interview
          aiDecision = 'recommend-shortlist';
        } else if (aiScore <= thresholds.autoReject) {
          newStatus = 'screening'; // Flag for review, don't auto-reject
          aiDecision = 'recommend-reject';
        } else {
          newStatus = 'screening';
          aiDecision = 'needs-review';
        }
      }
    }

    // Generate detailed recommendation
    let aiRecommendation;
    if (aiScore >= thresholds.autoShortlist) {
      aiRecommendation = `✅ Strong candidate (${aiScore}%) - Recommend for interview`;
    } else if (aiScore <= thresholds.autoReject) {
      aiRecommendation = `❌ Below threshold (${aiScore}%) - Does not meet requirements`;
    } else {
      aiRecommendation = `🔍 Moderate match (${aiScore}%) - Requires manual review`;
    }

    return {
      ...app,
      aiScore,
      scoreBreakdown: scoreResult.breakdown,
      weights: scoreResult.weights,
      status: newStatus,
      aiEvaluatedAt: new Date().toISOString(),
      aiDecision,
      aiRecommendation,
      screeningMode,
      thresholds: {
        shortlist: thresholds.autoShortlist,
        reject: thresholds.autoReject,
      },
    };
  });
}

/**
 * Score a single application against its job with detailed breakdown
 * Useful for displaying detailed scoring info in the UI
 */
export function scoreApplication(application, job) {
  if (!application || !job) {
    return {
      success: false,
      error: 'Missing application or job data',
    };
  }

  const candidate = application.applicant || application;
  const scoreResult = calculateCandidateScore(candidate, job);
  const screeningCriteria = job.screeningCriteria || job.screening_criteria || null;
  const thresholds = getThresholdsFromCriteria(screeningCriteria);
  
  // Generate detailed feedback
  const feedback = generateScoreFeedback(scoreResult, screeningCriteria);
  
  return {
    success: true,
    applicationId: application.id,
    jobId: job.id,
    jobTitle: job.title,
    candidateName: candidate.name || candidate.fullName || 'Unknown',
    score: scoreResult.totalScore,
    breakdown: scoreResult.breakdown,
    weights: scoreResult.weights,
    screeningMode: screeningCriteria?.screeningMode || 'semi-auto',
    thresholds,
    decision: getDecision(scoreResult.totalScore, thresholds),
    feedback,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Generate human-readable feedback based on scores
 */
function generateScoreFeedback(scoreResult, screeningCriteria) {
  const feedback = {
    strengths: [],
    improvements: [],
    summary: '',
  };
  
  const { breakdown, totalScore } = scoreResult;
  
  // Identify strengths (scores >= 80)
  if (breakdown.educationMatch >= 80) {
    feedback.strengths.push('Education qualifications exceed requirements');
  }
  if (breakdown.experienceMatch >= 80) {
    feedback.strengths.push('Strong relevant experience');
  }
  if (breakdown.skillsMatch >= 80) {
    feedback.strengths.push('Excellent skills alignment');
  }
  if (breakdown.certificationsMatch >= 80) {
    feedback.strengths.push('Has required certifications');
  }
  
  // Identify areas for improvement (scores < 60)
  if (breakdown.educationMatch < 60) {
    const reqDegree = screeningCriteria?.requiredDegree || 'required';
    feedback.improvements.push(`Education level below ${reqDegree} requirement`);
  }
  if (breakdown.experienceMatch < 60) {
    const minExp = screeningCriteria?.minExperienceYears || screeningCriteria?.minExperience || 0;
    feedback.improvements.push(`Experience below ${minExp} years minimum`);
  }
  if (breakdown.skillsMatch < 60) {
    feedback.improvements.push('Missing key required skills');
  }
  if (breakdown.certificationsMatch < 60) {
    feedback.improvements.push('Missing required certifications');
  }
  
  // Generate summary
  if (totalScore >= 75) {
    feedback.summary = 'Strong candidate who meets or exceeds job requirements. Recommended for interview.';
  } else if (totalScore >= 60) {
    feedback.summary = 'Moderate fit with some gaps. Consider for screening call to assess further.';
  } else if (totalScore >= 40) {
    feedback.summary = 'Below target qualifications. May be suitable for junior role or development program.';
  } else {
    feedback.summary = 'Does not meet minimum requirements for this position.';
  }
  
  return feedback;
}

/**
 * Get decision based on score and thresholds
 */
function getDecision(score, thresholds) {
  if (score >= thresholds.autoShortlist) {
    return {
      action: 'shortlist',
      label: 'Shortlist for Interview',
      color: 'green',
      icon: '✅',
    };
  } else if (score <= thresholds.autoReject) {
    return {
      action: 'reject',
      label: 'Below Requirements',
      color: 'red',
      icon: '❌',
    };
  } else {
    return {
      action: 'review',
      label: 'Manual Review Needed',
      color: 'yellow',
      icon: '🔍',
    };
  }
}

/**
 * Get screening summary for a job's applications
 */
export function getJobScreeningSummary(job, applications) {
  const jobApps = applications.filter(a => a.jobId === job.id);
  const screeningCriteria = job.screeningCriteria || job.screening_criteria || null;
  const thresholds = getThresholdsFromCriteria(screeningCriteria);
  
  // Score all applications
  const scored = jobApps.map(app => {
    const result = calculateCandidateScore(app.applicant || app, job);
    return {
      ...app,
      aiScore: result.totalScore,
    };
  });
  
  const shortlistable = scored.filter(a => a.aiScore >= thresholds.autoShortlist);
  const rejectable = scored.filter(a => a.aiScore <= thresholds.autoReject);
  const needsReview = scored.filter(a => 
    a.aiScore > thresholds.autoReject && a.aiScore < thresholds.autoShortlist
  );
  
  return {
    jobId: job.id,
    jobTitle: job.title,
    totalApplications: jobApps.length,
    screeningMode: screeningCriteria?.screeningMode || 'semi-auto',
    thresholds,
    summary: {
      shortlistable: shortlistable.length,
      rejectable: rejectable.length,
      needsReview: needsReview.length,
    },
    averageScore: scored.length > 0 
      ? Math.round(scored.reduce((sum, a) => sum + a.aiScore, 0) / scored.length)
      : 0,
    topCandidates: scored
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        name: a.applicant?.name || a.name || 'Unknown',
        score: a.aiScore,
      })),
    criteriaConfigured: !!screeningCriteria,
  };
}

/**
 * Generate hiring analytics and insights
 */
export function generateAnalytics(state) {
  const jobs = state.jobs || [];
  const applications = state.applications || [];
  const shortlists = state.shortlists || [];

  const analytics = {
    totalApplications: applications.length,
    submittedApplications: applications.filter(a => a.status === 'submitted').length,
    screenedApplications: applications.filter(a => a.status === 'screening').length,
    interviewApplications: applications.filter(a =>
      ['phone-interview', 'interview'].includes(a.status)
    ).length,
    offeredApplications: applications.filter(a => a.status === 'offer').length,
    rejectedApplications: applications.filter(a => a.status === 'rejected').length,
    totalJobs: jobs.length,
    openJobs: jobs.filter(j => j.status === 'open').length,
    totalShortlists: shortlists.length,

    // Conversion rates
    conversionRates: {
      applicationToInterview: applications.length > 0
        ? Math.round(
          (applications.filter(a => ['phone-interview', 'interview'].includes(a.status))
            .length / applications.length) * 100
        )
        : 0,
      applicationToOffer: applications.length > 0
        ? Math.round((applications.filter(a => a.status === 'offer').length / applications.length) * 100)
        : 0,
      screeningToInterview: applications.length > 0
        ? Math.round(
          (applications.filter(a => ['phone-interview', 'interview', 'offer'].includes(a.status)).length /
            applications.length) *
            100
        )
        : 0,
    },

    // Time to hire (in days)
    timeToHireStats: calculateTimeToHire(applications),

    // Top performing jobs
    jobPerformance: jobs.map(job => {
      const jobApps = applications.filter(a => a.jobId === job.id);
      const offers = jobApps.filter(a => a.status === 'offer');
      return {
        jobId: job.id,
        title: job.title,
        totalApplications: jobApps.length,
        offers: offers.length,
        averageScore: jobApps.length > 0
          ? Math.round(
            jobApps.reduce((sum, a) => sum + (a.aiScore || 0), 0) / jobApps.length
          )
          : 0,
      };
    }),

    // Hiring funnel
    hiringFunnel: {
      applications: applications.length,
      screened: applications.filter(a => a.status !== 'submitted').length,
      interviewed: applications.filter(a =>
        ['phone-interview', 'interview'].includes(a.status)
      ).length,
      offers: applications.filter(a => a.status === 'offer').length,
    },
  };

  return analytics;
}

function calculateTimeToHire(applications) {
  const offeredApps = applications.filter(a => a.status === 'offer' && a.createdAt);
  if (offeredApps.length === 0) {
    return { average: 0, min: 0, max: 0 };
  }

  const daysToHire = offeredApps.map(app => {
    const created = new Date(app.createdAt);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  });

  return {
    average: Math.round(daysToHire.reduce((a, b) => a + b) / daysToHire.length),
    min: Math.min(...daysToHire),
    max: Math.max(...daysToHire),
  };
}

/**
 * Generate evaluation rubric for interview scoring
 */
export const EVALUATION_RUBRIC = {
  technical: {
    label: 'Technical Skills',
    weight: 0.40,
    criteria: [
      'Relevant knowledge and expertise',
      'Problem-solving ability',
      'Technical communication clarity',
    ],
  },
  communication: {
    label: 'Communication & Collaboration',
    weight: 0.25,
    criteria: [
      'Articulate and clear expression',
      'Active listening',
      'Team collaboration mindset',
    ],
  },
  experience: {
    label: 'Relevant Experience',
    weight: 0.20,
    criteria: [
      'Project/role relevance',
      'Growth trajectory',
      'Achievement highlights',
    ],
  },
  cultureFit: {
    label: 'Culture Fit & Motivation',
    weight: 0.15,
    criteria: [
      'Alignment with company values',
      'Career goal alignment',
      'Enthusiasm and commitment',
    ],
  },
};

/**
 * Calculate interview evaluation score (1-10 per rubric, weighted)
 */
export function calculateInterviewScore(evaluationData) {
  let totalScore = 0;
  let totalWeight = 0;

  Object.entries(EVALUATION_RUBRIC).forEach(([key, rubric]) => {
    const categoryScore = evaluationData[key] || 5; // Default mid-range
    totalScore += categoryScore * rubric.weight;
    totalWeight += rubric.weight;
  });

  return Math.round((totalScore / totalWeight) * 10);
}

/**
 * Generate hiring report summary
 */
export function generateHiringReport(state) {
  const analytics = generateAnalytics(state);

  const report = {
    title: 'Hiring Pipeline Report',
    generatedAt: new Date().toISOString(),
    period: 'Current Cycle',
    executive_summary: {
      total_applications: analytics.totalApplications,
      open_positions: analytics.openJobs,
      offers_extended: analytics.offeredApplications,
      average_time_to_hire: `${analytics.timeToHireStats.average} days`,
    },
    key_metrics: {
      application_to_interview_rate: `${analytics.conversionRates.applicationToInterview}%`,
      interview_to_offer_rate: `${analytics.conversionRates.screeningToInterview}%`,
      overall_offer_rate: `${analytics.conversionRates.applicationToOffer}%`,
    },
    hiring_funnel: analytics.hiringFunnel,
    top_jobs: analytics.jobPerformance
      .sort((a, b) => b.totalApplications - a.totalApplications)
      .slice(0, 5),
    recommendations: generateRecommendations(analytics),
  };

  return report;
}

function generateRecommendations(analytics) {
  const recommendations = [];

  if (analytics.conversionRates.applicationToInterview < 10) {
    recommendations.push('⚠️ Low screening conversion rate. Review screening criteria.');
  }
  if (analytics.timeToHireStats.average > 30) {
    recommendations.push('⚠️ High time-to-hire. Consider streamlining interview process.');
  }
  if (analytics.offeredApplications === 0 && analytics.totalApplications > 10) {
    recommendations.push('⚠️ No offers yet despite high volume. Review job requirements or candidate fit.');
  }
  if (analytics.openJobs > 5) {
    recommendations.push('✓ Multiple open positions. Consider accelerated hiring.');
  }
  if (analytics.totalApplications === 0) {
    recommendations.push('📢 No applications yet. Boost job promotion.');
  }

  return recommendations;
}

/**
 * Export report data to CSV format
 */
export function reportToCSV(report) {
  const lines = [
    report.title,
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    '',
    'EXECUTIVE SUMMARY',
    Object.entries(report.executive_summary)
      .map(([k, v]) => `${k},${v}`)
      .join('\n'),
    '',
    'KEY METRICS',
    Object.entries(report.key_metrics)
      .map(([k, v]) => `${k},${v}`)
      .join('\n'),
    '',
    'HIRING FUNNEL',
    Object.entries(report.hiring_funnel)
      .map(([k, v]) => `${k},${v}`)
      .join('\n'),
  ];

  return lines.join('\n');
}
