import React from "react";

/**
 * Candidate's view of their own applications (read-only)
 * Filters by CNIC to show all applications regardless of email used
 */
const MyCandidateApplications = ({ applications, candidateProfile, jobs }) => {
  // Filter to show only this candidate's applications (by CNIC)
  const myApplications = (applications || []).filter(
    app => app.applicant?.cnic === candidateProfile?.cnic
  );
  
  // Get unique emails used across applications
  const emailsUsed = [...new Set(myApplications.map(app => app.applicant?.email).filter(Boolean))];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Candidate Profile Header */}
      {candidateProfile && (
        <div className="bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{candidateProfile.name}</h2>
              <div className="space-y-1 text-green-50">
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {candidateProfile.phone}
                </p>
                <p className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  CNIC: {candidateProfile.cnic}
                </p>
                {emailsUsed.length > 0 && (
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {emailsUsed.join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{myApplications.length}</div>
              <div className="text-sm text-green-100">Total Applications</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">My Applications</h2>
        <p className="text-gray-600">All your applications across different job positions</p>
      </div>

      {myApplications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Applications Yet</h3>
          <p className="text-gray-500 mb-6">You haven't submitted any applications. Browse open positions and apply!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myApplications.map((app) => {
            const job = (jobs || []).find(j => j.id === app.jobId);
            return (
            <div key={app.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {job ? job.title : `Job #${app.jobId?.substring(0, 8)}`}
                  </h3>
                  {job && (
                    <p className="text-sm text-gray-600 mt-1">{job.department} • {job.employmentType}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Applied on {new Date(app.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} using {app.applicant.email}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    app.status === 'offer' ? 'bg-green-100 text-green-700' :
                    app.status === 'interview' || app.status === 'phone-interview' ? 'bg-blue-100 text-blue-700' :
                    app.status === 'screening' ? 'bg-yellow-100 text-yellow-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {app.status === 'phone-interview' ? 'Phone Interview' : 
                     app.status === 'interview' ? 'Interview' :
                     app.status === 'screening' ? 'Under Review' :
                     app.status === 'offer' ? 'Offer Extended' :
                     app.status === 'rejected' ? 'Not Selected' :
                     'Submitted'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Applicant Name</p>
                  <p className="font-medium text-gray-800">{app.applicant?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="font-medium text-gray-800">{app.applicant?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Education</p>
                  <p className="font-medium text-gray-800">{app.applicant?.degree || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Experience</p>
                  <p className="font-medium text-gray-800">{app.applicant?.experienceYears || 0} years</p>
                </div>
              </div>

              {app.aiScore && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500">AI Compatibility Score</p>
                      <div className="flex items-center gap-2">
                        <div className={`text-2xl font-bold ${
                          app.aiScore >= 75 ? 'text-green-600' : 
                          app.aiScore >= 60 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {app.aiScore}
                        </div>
                        <div className="text-xs text-gray-500">/ 100</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {app.status === 'interview' || app.status === 'phone-interview' ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Next Steps</p>
                      <p className="text-xs text-blue-700 mt-1">Our team will contact you soon to schedule your interview. Please check your email regularly.</p>
                    </div>
                  </div>
                </div>
              ) : app.status === 'offer' ? (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Congratulations!</p>
                      <p className="text-xs text-green-700 mt-1">You've received an offer. Check your email for details and next steps.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default MyCandidateApplications;
