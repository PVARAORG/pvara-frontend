import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './ToastContext';

/**
 * TestManagement Component (with integrated Testing Services)
 * Manages the testing phase including external testing service integration
 * - Displays candidates ready for testing (job's required tests automatically assigned)
 * - Send tests via TestGorilla/external service
 * - Track test progress and completion
 * - View detailed test results
 * - Move candidates to interview stage after successful test completion
 */
function TestManagement({
  applications = [],
  jobs = [],
  onUpdateApplication,
  onMoveToInterview,
  onRefreshApplications
}) {
  const { addToast } = useToast();
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all'); // all, ready, pending, completed
  const [selectedJob, setSelectedJob] = useState('all');
  const [viewingResults, setViewingResults] = useState(null);
  const [sendingTests, setSendingTests] = useState(false);
  const [availableTests, setAvailableTests] = useState([]);
  const [testDeadlineDays, setTestDeadlineDays] = useState(3); // Default 3 days
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Fetch available tests on mount
  useEffect(() => {
    fetchAvailableTests();
  }, []);

  async function fetchAvailableTests() {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:6080';
      const response = await axios.get(`${apiUrl}/api/testing/assessments`);
      if (response.data.assessments) {
        setAvailableTests(response.data.assessments);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    }
  }

  // Helper to check if test deadline has expired
  const isTestExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // Refresh test statuses - checks with backend for any completed tests
  const handleRefreshStatuses = async () => {
    setRefreshing(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:6080';
      const pendingCandidates = applications.filter(app =>
        app.testing?.status === 'invited' || app.testing?.status === 'pending' || app.testing?.status === 'in-progress'
      );

      let updatedCount = 0;
      for (const candidate of pendingCandidates) {
        try {
          const response = await axios.get(`${apiUrl}/api/testing/results/${candidate._id || candidate.id}`);
          if (response.data.success && response.data.results) {
            updatedCount++;
          }
        } catch (err) {
          // Test not completed yet, which is expected
        }
      }

      // Refresh all applications from backend to get latest state
      if (onRefreshApplications) {
        await onRefreshApplications();
      }

      setLastRefreshed(new Date());
      if (updatedCount > 0) {
        addToast(`✅ ${updatedCount} test result(s) updated!`, { type: 'success' });
      } else {
        addToast(`ℹ️ No new test completions found`, { type: 'info' });
      }
    } catch (error) {
      console.error('Failed to refresh test statuses:', error);
      addToast('❌ Failed to refresh test statuses', { type: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  // Helper to extract jobId - handles both populated object and string
  const getJobId = (app) => {
    if (!app.jobId) return null;
    return typeof app.jobId === 'object' ? app.jobId._id : app.jobId;
  };

  // Helper to determine if test can be resent (only if expired or failed)
  const canResendTest = (candidate) => {
    if (!candidate.testing) return false;
    // Can resend if expired
    if (candidate.testing.status === 'invited' && isTestExpired(candidate.testing?.expiresAt)) {
      return true;
    }
    // Can resend if test completed but candidate needs retest (HR decision)
    if (candidate.testing.status === 'completed' && candidate.testing.needsRetest) {
      return true;
    }
    return false;
  };

  // Helper to check if test is currently active (sent but not completed/expired)
  const hasActiveTest = (candidate) => {
    if (!candidate.testing) return false;
    if (candidate.testing.status === 'invited' && !isTestExpired(candidate.testing?.expiresAt)) {
      return true;
    }
    if (candidate.testing.status === 'pending' || candidate.testing.status === 'in-progress') {
      return true;
    }
    return false;
  };

  // Filter candidates based on test status and job
  const filteredCandidates = useMemo(() => {
    let filtered = applications.filter(app => {
      // Exclude candidates who have moved beyond test phase
      const excludedStatuses = ['interview', 'phone-interview', 'offer', 'hired', 'rejected', 'withdrawn'];
      if (excludedStatuses.includes(app.status)) return false;

      // Show candidates in screening, test-invited, test-in-progress, test-completed
      const isRelevant =
        app.status === 'screening' ||
        app.status === 'test-invited' ||
        app.status === 'test-in-progress' ||
        app.status === 'test-completed';

      if (!isRelevant) return false;

      // Filter by job (handle populated jobId object)
      const appJobId = getJobId(app);
      if (selectedJob !== 'all' && appJobId !== selectedJob) return false;

      // Filter by test status
      if (filterStatus === 'ready') {
        // Show candidates ready for test: screening OR test-invited without active testing status
        return (app.status === 'screening' || app.status === 'test-invited') && !app.testing?.status;
      }
      if (filterStatus === 'pending') {
        // Only show if they have a testing object with invited/pending/in-progress status
        return app.testing?.status === 'invited' || app.testing?.status === 'pending' || app.testing?.status === 'in-progress';
      }
      if (filterStatus === 'completed') {
        return app.testing?.status === 'completed';
      }

      return true;
    });

    return filtered;
  }, [applications, selectedJob, filterStatus]);

  // Candidates that can be selected for sending tests (no active test)
  const selectableCandidates = useMemo(() => {
    return filteredCandidates.filter(c => !c.testing?.status || canResendTest(c));
  }, [filteredCandidates]);

  const handleSelectCandidate = (candidateId) => {
    const candidate = applications.find(a => (a._id || a.id) === candidateId);
    // Prevent selecting candidates with active tests
    if (candidate && hasActiveTest(candidate)) {
      addToast(`⚠️ Cannot select - candidate has an active test invitation`, { type: 'warning' });
      return;
    }
    setSelectedCandidates(prev =>
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === selectableCandidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(selectableCandidates.map(c => c._id || c.id));
    }
  };

  const handleSendTests = async () => {
    if (selectedCandidates.length === 0) return;

    setSendingTests(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Send tests for each selected candidate
      for (const candidateId of selectedCandidates) {
        const candidate = applications.find(a => (a._id || a.id) === candidateId);
        if (!candidate) continue;

        const job = jobs.find(j => (j._id || j.id) === getJobId(candidate));
        if (!job || !job.requiredTests || job.requiredTests.length === 0) {
          console.warn(`No required tests for job ${job?.title || candidate.jobId}`);
          failCount++;
          addToast(`❌ Job or required tests not found for ${candidate.applicant?.name || 'candidate'}`, { type: 'error' });
          continue;
        }

        // Send test via API
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:6080';
          const cnic = candidate.applicant?.cnic;
          const name = candidate.applicant?.name || candidate.name;

          console.log(`📤 Sending test to ${name}...`);
          console.log('📋 Candidate data:', {
            id: candidateId,
            name: name,
            cnic: cnic,
            email: candidate.applicant?.email,
            status: candidate.status
          });

          if (!cnic) {
            console.error('❌ No CNIC found for candidate');
            failCount++;
            addToast(`❌ No CNIC found for ${name}`, { type: 'error', duration: 6000 });
            continue;
          }

          const requestData = {
            cnic: cnic,
            assessmentId: job.requiredTests[0].testId,
            assessmentName: job.requiredTests[0].testName,
            deadlineDays: testDeadlineDays
          };
          console.log('📨 Request data:', requestData);

          const response = await axios.post(`${apiUrl}/api/testing/send-test`, requestData);

          console.log('Response:', response.data);

          if (response.data.success) {
            // Update application with testing status
            onUpdateApplication(candidateId, {
              testing: {
                status: 'invited',
                invitedAt: new Date().toISOString(),
                expiresAt: response.data.expiresAt || new Date(Date.now() + testDeadlineDays * 24 * 60 * 60 * 1000).toISOString(),
                requiredTests: job.requiredTests,
                completedTests: [],
                assessmentName: job.requiredTests[0].testName,
                provider: 'testgorilla'
              }
            });
            successCount++;
            addToast(`✅ Test sent to ${candidate.applicant?.name || candidate.name} via email`, { type: 'success', duration: 5000 });
          } else {
            console.error('API returned success:false', response.data);
            failCount++;
            addToast(`❌ API error for ${candidate.applicant?.name || candidate.name}: ${response.data.message || 'Unknown error'}`, { type: 'error', duration: 6000 });
          }
        } catch (error) {
          console.error(`Failed to send test to ${candidate.applicant?.name || candidate.name}:`, error);
          console.error('Error details:', error.response?.data);
          const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
          addToast(`❌ Failed to send test to ${candidate.applicant?.name || candidate.name}: ${errorMsg}`, { type: 'error', duration: 6000 });
          failCount++;
        }
      }

      // Show summary
      if (successCount > 0) {
        addToast(`🎯 Successfully sent ${successCount} test invitation${successCount > 1 ? 's' : ''} with email notifications`, { type: 'success', duration: 6000 });
        // Refresh applications from backend to get updated testing status
        if (onRefreshApplications) {
          await onRefreshApplications();
        }
      }
      if (failCount > 0) {
        addToast(`⚠️ Failed to send ${failCount} test${failCount > 1 ? 's' : ''}`, { type: 'error', duration: 5000 });
      }

      setSelectedCandidates([]);
    } finally {
      setSendingTests(false);
    }
  };

  const handleSimulateCompletion = async (candidateId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:6080';
      const response = await axios.post(`${apiUrl}/api/testing/simulate-completion/${candidateId}`);

      if (response.data.success) {
        // Refresh from backend to get the updated testing data
        if (onRefreshApplications) {
          await onRefreshApplications();
        } else {
          // Fallback to local update
          onUpdateApplication(candidateId, {
            testing: {
              ...applications.find(a => (a._id || a.id) === candidateId)?.testing,
              status: 'completed',
              completedAt: new Date().toISOString(),
              results: response.data.results
            }
          });
        }
        addToast('✅ Test completion simulated - results available', { type: 'success' });
      }
    } catch (error) {
      console.error('Failed to simulate test completion:', error);
      addToast('❌ Failed to simulate test completion', { type: 'error' });
    }
  };

  const handleMoveToInterview = (candidateId) => {
    onMoveToInterview(candidateId);
    setViewingResults(null);
  };

  // Handle reject after test
  const handleRejectCandidate = async (candidateId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:6080';
      await axios.put(`${apiUrl}/api/applications/${candidateId}/status`, { status: 'rejected' });
      onUpdateApplication(candidateId, { status: 'rejected' });
      addToast('❌ Candidate rejected', { type: 'info' });
      setViewingResults(null);
    } catch (error) {
      addToast('Failed to reject candidate', { type: 'error' });
    }
  };

  // Handle request retest
  const handleRequestRetest = (candidateId) => {
    const candidate = applications.find(a => (a._id || a.id) === candidateId);
    if (candidate) {
      // Mark for retest and reset testing status
      onUpdateApplication(candidateId, {
        testing: {
          ...candidate.testing,
          needsRetest: true,
          retestReason: 'HR requested retest',
          previousResults: candidate.testing?.results
        }
      });
      addToast('🔄 Candidate marked for retest - select and send new test', { type: 'success' });
      setViewingResults(null);
    }
  };

  // Statuses that indicate candidate has moved beyond test phase
  const excludedStatuses = ['interview', 'phone-interview', 'offer', 'hired', 'rejected', 'withdrawn'];

  const statusCounts = {
    ready: applications.filter(a =>
      !excludedStatuses.includes(a.status) &&
      (a.status === 'screening' || a.status === 'test-invited') &&
      !a.testing?.status &&
      (selectedJob === 'all' || getJobId(a) === selectedJob)
    ).length,
    pending: applications.filter(a =>
      !excludedStatuses.includes(a.status) &&
      (a.testing?.status === 'invited' || a.testing?.status === 'pending' || a.testing?.status === 'in-progress') &&
      (selectedJob === 'all' || getJobId(a) === selectedJob)
    ).length,
    completed: applications.filter(a =>
      !excludedStatuses.includes(a.status) &&
      a.testing?.status === 'completed' &&
      (selectedJob === 'all' || getJobId(a) === selectedJob)
    ).length
  };

  const getJobTitle = (jobId) => {
    // Handle populated jobId object
    const actualJobId = typeof jobId === 'object' ? jobId._id : jobId;
    const job = jobs.find(j => (j._id || j.id) === actualJobId);
    return job ? job.title : (typeof jobId === 'object' && jobId.title) ? jobId.title : 'Unknown Position';
  };

  const getTestDetails = (testId) => {
    return availableTests.find(t => t.id === testId);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Management & Tracking</h1>
            <p className="text-gray-600">Send tests, track progress, and review results</p>
          </div>
          {/* Refresh Button */}
          <button
            onClick={handleRefreshStatuses}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Checking...' : 'Check for Completions'}
          </button>
        </div>
        {lastRefreshed && (
          <p className="text-xs text-gray-500 mt-1">
            Last checked: {lastRefreshed.toLocaleTimeString()}
          </p>
        )}

        {/* Sequential Workflow Indicator */}
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-xs">1</div>
                <div className="text-xs font-medium text-gray-600 mt-1">HR Review</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 opacity-50">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold text-xs">2</div>
                <div className="text-xs font-medium text-gray-600 mt-1">AI Screening</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shadow-lg ring-4 ring-purple-200">3</div>
                <div className="text-xs font-bold text-purple-900 mt-1">Test Stage</div>
                <div className="text-xs text-purple-600 font-medium">Current</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 opacity-30">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center font-bold text-xs">4</div>
                <div className="text-xs font-medium text-gray-600 mt-1">Interview</div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className="flex flex-col items-center flex-shrink-0 opacity-30">
              <div className="w-8 h-8 rounded-full bg-green-400 text-white flex items-center justify-center font-bold text-xs">5</div>
              <div className="text-xs font-medium text-gray-600 mt-1">Offer</div>
            </div>
          </div>
          <p className="text-xs text-gray-700 mt-3 italic">
            <svg className="w-4 h-4 inline-block text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <strong> Stage 3 of 5:</strong> Tests are auto-assigned based on job requirements. Track progress and move successful candidates to interviews.
          </p>
        </div>
      </div>

      {/* Job Position Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Position</label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">All Positions</option>
          {jobs.map(job => (
            <option key={job._id || job.id} value={job._id || job.id}>
              {job.title} ({job.department})
              {job.requiredTests && job.requiredTests.length > 0 && ` - ${job.requiredTests.length} tests`}
            </option>
          ))}
        </select>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-blue-700">{statusCounts.ready}</div>
              <div className="text-sm text-blue-600">Ready to Send Tests</div>
            </div>
            <svg className="w-10 h-10 text-blue-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-700">{statusCounts.pending}</div>
              <div className="text-sm text-yellow-600">Tests Awaiting Completion</div>
            </div>
            <svg className="w-10 h-10 text-yellow-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-purple-700">{statusCounts.completed}</div>
              <div className="text-sm text-purple-600">Tests Completed</div>
            </div>
            <svg className="w-10 h-10 text-purple-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Status Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${filterStatus === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              All ({statusCounts.ready + statusCounts.pending + statusCounts.completed})
            </button>
            <button
              onClick={() => setFilterStatus('ready')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${filterStatus === 'ready'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Ready ({statusCounts.ready})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Pending ({statusCounts.pending})
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${filterStatus === 'completed'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Completed ({statusCounts.completed})
            </button>
          </div>

          {/* Deadline Selector and Bulk Send Action */}
          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Deadline:</label>
                <select
                  value={testDeadlineDays}
                  onChange={(e) => setTestDeadlineDays(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value={1}>1 Day</option>
                  <option value={2}>2 Days</option>
                  <option value={3}>3 Days</option>
                  <option value={5}>5 Days</option>
                  <option value={7}>7 Days</option>
                </select>
              </div>
              <button
                onClick={handleSendTests}
                disabled={sendingTests}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                {sendingTests ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Tests to {selectedCandidates.length} Selected
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Candidate List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Candidates ({filteredCandidates.length})
              {selectableCandidates.length > 0 && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({selectableCandidates.length} can receive tests)
                </span>
              )}
            </h3>
            {selectableCandidates.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                {selectedCandidates.length === selectableCandidates.length ? 'Deselect All' : 'Select All Ready'}
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No candidates found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            filteredCandidates.map((candidate) => {
              const job = jobs.find(j => (j._id || j.id) === getJobId(candidate));
              const requiredTests = job?.requiredTests || [];
              const isSelected = selectedCandidates.includes(candidate._id || candidate.id);
              const canSelect = !candidate.testing || canResendTest(candidate);
              const hasActive = hasActiveTest(candidate);

              return (
                <div key={candidate._id || candidate.id} className={`p-4 hover:bg-gray-50 transition ${hasActive ? 'bg-yellow-50' : ''
                  }`}>
                  <div className="flex items-start gap-4">
                    {/* Checkbox for selection (for candidates that can receive tests) */}
                    {canSelect && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectCandidate(candidate._id || candidate.id)}
                        className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                    )}
                    {/* Placeholder for alignment when checkbox not shown */}
                    {!canSelect && (
                      <div className="mt-1 w-5 h-5 flex items-center justify-center text-gray-400" title="Test already sent">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}

                    {/* Candidate Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{candidate.applicant?.name || candidate.name}</h4>
                          <p className="text-sm text-gray-600">{candidate.applicant?.email || candidate.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {getJobTitle(candidate.jobId)}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-end gap-1">
                          {!candidate.testing && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Ready to Send
                            </span>
                          )}
                          {candidate.testing?.status === 'invited' && !isTestExpired(candidate.testing?.expiresAt) && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Test Sent - Awaiting
                            </span>
                          )}
                          {candidate.testing?.status === 'invited' && isTestExpired(candidate.testing?.expiresAt) && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Expired - Resend
                            </span>
                          )}
                          {(candidate.testing?.status === 'pending' || candidate.testing?.status === 'in-progress') && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Test In Progress
                            </span>
                          )}
                          {candidate.testing?.status === 'completed' && (
                            <>
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Test Completed
                              </span>
                              {/* Show score and recommendation if available */}
                              {candidate.testing?.results && (
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${candidate.testing.results.score >= 70 ? 'bg-green-200 text-green-800' :
                                    candidate.testing.results.score >= 50 ? 'bg-yellow-200 text-yellow-800' :
                                      'bg-red-200 text-red-800'
                                  }`}>
                                  Score: {candidate.testing.results.score}%
                                </span>
                              )}
                            </>
                          )}
                          {candidate.testing?.needsRetest && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Retest Requested
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Required Tests Info */}
                      {requiredTests.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-xs font-medium text-gray-600 mb-2">Required Tests:</div>
                          <div className="flex flex-wrap gap-2">
                            {requiredTests.map((test, idx) => {
                              const testDetails = getTestDetails(test.testId);
                              return (
                                <div
                                  key={idx}
                                  className={`px-2 py-1 rounded text-xs ${test.category === 'technical' ? 'bg-blue-100 text-blue-700' :
                                      test.category === 'cognitive' ? 'bg-purple-100 text-purple-700' :
                                        test.category === 'personality' ? 'bg-pink-100 text-pink-700' :
                                          test.category === 'soft-skills' ? 'bg-green-100 text-green-700' :
                                            'bg-orange-100 text-orange-700'
                                    }`}
                                >
                                  {test.testName}
                                  {testDetails && (
                                    <span className="ml-1 opacity-75">
                                      ({testDetails.duration_minutes}min, {test.passingScore}% pass)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Testing Progress */}
                      {candidate.testing && (
                        <div className={`mt-3 p-3 rounded-lg border ${isTestExpired(candidate.testing.expiresAt) && candidate.testing.status !== 'completed'
                            ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
                            : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
                          }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-xs font-medium text-gray-700">Testing Progress</span>
                              {candidate.testing.assessmentName && (
                                <div className="text-xs text-purple-600 font-medium mt-1">
                                  📝 {candidate.testing.assessmentName}
                                </div>
                              )}
                              {candidate.testing.provider && (
                                <div className="text-xs text-gray-500 mt-1">
                                  via {candidate.testing.provider === 'testgorilla' ? 'TestGorilla' : candidate.testing.provider}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              {candidate.testing.invitedAt && (
                                <span className="text-xs text-gray-500">
                                  📧 Sent: {new Date(candidate.testing.invitedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {candidate.testing.expiresAt && candidate.testing.status !== 'completed' && (
                                <span className={`text-xs font-medium mt-1 px-2 py-1 rounded ${isTestExpired(candidate.testing.expiresAt)
                                    ? 'bg-red-100 text-red-700 font-bold'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                  {isTestExpired(candidate.testing.expiresAt) ? '⚠️ Expired: ' : '⏰ Deadline: '}
                                  {new Date(candidate.testing.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>

                          {candidate.testing.status === 'completed' && candidate.testing.results && (
                            <div className="space-y-2">
                              {/* Overall Score */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Overall Score:</span>
                                <span className="text-lg font-bold text-purple-700">
                                  {candidate.testing.results.score}%
                                </span>
                              </div>

                              {/* Section Scores */}
                              {candidate.testing.results.sections && (
                                <div className="space-y-1">
                                  {candidate.testing.results.sections.map((section, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600 w-32">{section.name}:</span>
                                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-purple-600 h-2 rounded-full"
                                          style={{ width: `${section.score}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 w-12 text-right">
                                        {section.score}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Recommendation */}
                              {candidate.testing.results.recommendation && (
                                <div className="mt-2 pt-2 border-t border-purple-200">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${candidate.testing.results.recommendation === 'STRONG_YES' ? 'bg-green-100 text-green-700' :
                                      candidate.testing.results.recommendation === 'YES' ? 'bg-blue-100 text-blue-700' :
                                        candidate.testing.results.recommendation === 'MAYBE' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-red-100 text-red-700'
                                    }`}>
                                    {candidate.testing.results.recommendation.replace('_', ' ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {/* For candidates with active tests - show demo completion button */}
                        {candidate.testing?.status === 'invited' && !isTestExpired(candidate.testing?.expiresAt) && (
                          <button
                            onClick={() => handleSimulateCompletion(candidate._id || candidate.id)}
                            className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Simulate Completion (Demo)
                          </button>
                        )}

                        {/* For expired tests - allow resend */}
                        {candidate.testing?.status === 'invited' && isTestExpired(candidate.testing?.expiresAt) && (
                          <button
                            onClick={() => {
                              // Reset testing status to allow resending
                              onUpdateApplication(candidate._id || candidate.id, { testing: null });
                              setSelectedCandidates([candidate._id || candidate.id]);
                              addToast('📝 Candidate ready for retest - click Send Tests when ready', { type: 'info' });
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Resend Test
                          </button>
                        )}

                        {/* For completed tests - decision actions */}
                        {candidate.testing?.status === 'completed' && (
                          <>
                            <button
                              onClick={() => setViewingResults(candidate)}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              View Results
                            </button>
                            {/* Show different actions based on score/recommendation */}
                            {candidate.testing.results?.score >= 50 ? (
                              <button
                                onClick={() => handleMoveToInterview(candidate._id || candidate.id)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Move to Interview
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMoveToInterview(candidate._id || candidate.id)}
                                className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition flex items-center gap-1"
                                title="Score below 50% - consider carefully"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Move to Interview (Low Score)
                              </button>
                            )}
                            <button
                              onClick={() => handleRequestRetest(candidate._id || candidate.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Request Retest
                            </button>
                            <button
                              onClick={() => handleRejectCandidate(candidate._id || candidate.id)}
                              className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject
                            </button>
                          </>
                        )}

                        {/* For retest candidates - show they're ready to select */}
                        {candidate.testing?.needsRetest && (
                          <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-sm flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Select to send new test
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Results Modal */}
      {viewingResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Test Results</h3>
                <button
                  onClick={() => setViewingResults(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h4 className="font-semibold text-lg">{viewingResults.applicant?.name || viewingResults.name}</h4>
                <p className="text-sm text-gray-600">{viewingResults.applicant?.email || viewingResults.email}</p>
                <p className="text-sm text-gray-500">{getJobTitle(viewingResults.jobId)}</p>
              </div>

              {viewingResults.testing?.results && (
                <div className="space-y-4">
                  {/* Overall Score Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 text-center border-2 border-purple-200">
                    <div className="text-4xl font-bold text-purple-700 mb-2">
                      {viewingResults.testing.results.score}%
                    </div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Percentile: {viewingResults.testing.results.percentile}th
                    </div>
                  </div>

                  {/* Section Scores */}
                  {viewingResults.testing.results.sections && (
                    <div>
                      <h5 className="font-semibold mb-3">Section Breakdown</h5>
                      <div className="space-y-3">
                        {viewingResults.testing.results.sections.map((section, idx) => (
                          <div key={idx} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{section.name}</span>
                              <span className="text-lg font-bold text-purple-700">{section.score}/100</span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-purple-600 h-3 rounded-full transition-all"
                                style={{ width: `${section.score}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time and Completion Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div>
                      <div className="text-sm text-gray-600">Time Taken</div>
                      <div className="font-semibold">{viewingResults.testing.results.timeTaken} minutes</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Completed</div>
                      <div className="font-semibold">
                        {new Date(viewingResults.testing.completedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Recommendation</div>
                    <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${viewingResults.testing.results.recommendation === 'STRONG_YES' ? 'bg-green-100 text-green-700' :
                        viewingResults.testing.results.recommendation === 'YES' ? 'bg-blue-100 text-blue-700' :
                          viewingResults.testing.results.recommendation === 'MAYBE' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                      }`}>
                      {viewingResults.testing.results.recommendation.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Decision:</strong> Based on the test results, choose how to proceed with this candidate.
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {viewingResults.testing?.results?.score >= 50 ? (
                  <button
                    onClick={() => handleMoveToInterview(viewingResults._id || viewingResults.id)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Move to Interview
                  </button>
                ) : (
                  <button
                    onClick={() => handleMoveToInterview(viewingResults._id || viewingResults.id)}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium flex items-center justify-center gap-2"
                    title="Score below 50% - proceed with caution"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Move to Interview (Low Score)
                  </button>
                )}
                <button
                  onClick={() => handleRequestRetest(viewingResults._id || viewingResults.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Request Retest
                </button>
                <button
                  onClick={() => handleRejectCandidate(viewingResults._id || viewingResults.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
                <button
                  onClick={() => setViewingResults(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestManagement;
