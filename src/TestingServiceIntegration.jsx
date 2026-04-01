import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * TestingServiceIntegration Component
 * Demo component showing how testing services (HackerRank, Codility, etc.) integrate
 */
function TestingServiceIntegration({ applications = [], jobs = [], onUpdateApplication }) {
  const [selectedProvider, setSelectedProvider] = useState('testgorilla');
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState({});

  // Mock available tests from providers
  const mockTests = {
    testgorilla: [
      { id: 'tg_js_001', name: 'JavaScript (Coding): Intermediate', duration: 20, skills: ['JavaScript', 'ES6', 'Async/Await'] },
      { id: 'tg_react_001', name: 'React', duration: 15, skills: ['React', 'Hooks', 'State Management'] },
      { id: 'tg_node_001', name: 'Node.js', duration: 20, skills: ['Node.js', 'Express', 'REST APIs'] },
      { id: 'tg_prob_001', name: 'Problem Solving', duration: 12, skills: ['Logic', 'Critical Thinking'] }
    ],
    hackerrank: [
      { id: 'hr_fullstack_001', name: 'Full Stack Developer', duration: 90, skills: ['Frontend', 'Backend', 'Database'] },
      { id: 'hr_python_001', name: 'Python (Advanced)', duration: 60, skills: ['Python', 'Data Structures', 'Algorithms'] },
      { id: 'hr_sql_001', name: 'SQL', duration: 45, skills: ['SQL', 'Database Design', 'Queries'] }
    ],
    codility: [
      { id: 'cd_algo_001', name: 'Algorithms & Data Structures', duration: 120, skills: ['Algorithms', 'Complexity', 'Optimization'] },
      { id: 'cd_frontend_001', name: 'Frontend Developer', duration: 90, skills: ['HTML', 'CSS', 'JavaScript', 'React'] },
      { id: 'cd_devops_001', name: 'DevOps Engineer', duration: 75, skills: ['CI/CD', 'Docker', 'Kubernetes'] }
    ]
  };

  // Mock test results (simulating API response)
  const mockTestResults = {
    score: 82,
    maxScore: 100,
    percentile: 87,
    completedAt: new Date().toISOString(),
    duration: 3420, // seconds
    sections: [
      { name: 'JavaScript Fundamentals', score: 85, maxScore: 100 },
      { name: 'Problem Solving', score: 78, maxScore: 100 },
      { name: 'Code Quality', score: 84, maxScore: 100 }
    ],
    proctoringAlerts: 1,
    recommendation: 'PROCEED',
    reportUrl: 'https://testprovider.com/reports/abc123'
  };

  useEffect(() => {
    setAvailableTests(mockTests[selectedProvider] || []);
    setSelectedTest('');
  }, [selectedProvider]);

  const handleSendTest = async () => {
    if (!selectedTest || selectedCandidates.length === 0) {
      alert('Please select a test and at least one candidate');
      return;
    }

    setLoading(true);
    try {
      // Mock API call to send test
      const apiUrl = process.env.REACT_APP_API_URL || 'https://backend.recruitment.team';

      for (const candidateId of selectedCandidates) {
        const candidate = applications.find(app => app.id === candidateId);

        // In real implementation:
        // await axios.post(`${apiUrl}/api/testing/send-test`, {
        //   applicationId: candidateId,
        //   provider: selectedProvider,
        //   testId: selectedTest,
        //   candidateEmail: candidate.email,
        //   candidateName: candidate.name
        // });

        // Mock: Update application with test invite
        onUpdateApplication(candidateId, {
          status: 'test-invited',
          testing: {
            provider: selectedProvider,
            testId: selectedTest,
            invitedAt: new Date().toISOString(),
            status: 'invited'
          }
        });
      }

      alert(`Test sent to ${selectedCandidates.length} candidate(s)!`);
      setSelectedCandidates([]);
    } catch (error) {
      console.error('Failed to send test:', error);
      alert('Failed to send test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateCompletion = (applicationId) => {
    // Simulate receiving webhook from testing provider
    onUpdateApplication(applicationId, {
      status: 'test-completed',
      testing: {
        ...applications.find(app => app.id === applicationId).testing,
        ...mockTestResults,
        status: 'completed'
      }
    });

    setTestResults(prev => ({
      ...prev,
      [applicationId]: mockTestResults
    }));
  };

  const candidatesReadyForTest = applications.filter(
    app => app.status === 'screening' || app.status === 'phone-interview'
  );

  const candidatesWithPendingTest = applications.filter(
    app => app.status === 'test-invited'
  );

  const candidatesWithCompletedTest = applications.filter(
    app => app.testing?.status === 'completed'
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Testing Service Integration</h2>
          <p className="text-gray-600 mt-1">Send automated tests via external providers</p>
        </div>

        {/* Provider Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Provider:</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="testgorilla">TestGorilla</option>
            <option value="hackerrank">HackerRank</option>
            <option value="codility">Codility</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready for Test</p>
              <p className="text-2xl font-bold text-blue-700">{candidatesReadyForTest.length}</p>
            </div>
            <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Test Pending</p>
              <p className="text-2xl font-bold text-yellow-700">{candidatesWithPendingTest.length}</p>
            </div>
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Test Completed</p>
              <p className="text-2xl font-bold text-green-700">{candidatesWithCompletedTest.length}</p>
            </div>
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Send Test Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Send Test to Candidates</h3>

        {/* Test Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Test</label>
          <select
            value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a test...</option>
            {availableTests.map(test => (
              <option key={test.id} value={test.id}>
                {test.name} ({test.duration} min) - {test.skills.join(', ')}
              </option>
            ))}
          </select>
        </div>

        {/* Candidate Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Candidates ({selectedCandidates.length} selected)
          </label>
          <div className="max-h-60 overflow-y-auto border rounded-lg p-3 space-y-2">
            {candidatesReadyForTest.map(app => (
              <label key={app.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCandidates.includes(app.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCandidates([...selectedCandidates, app.id]);
                    } else {
                      setSelectedCandidates(selectedCandidates.filter(id => id !== app.id));
                    }
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{app.name}</p>
                  <p className="text-sm text-gray-600">{app.email} • {jobs.find(j => j.id === app.jobId)?.title}</p>
                </div>
              </label>
            ))}
            {candidatesReadyForTest.length === 0 && (
              <p className="text-gray-500 text-center py-4">No candidates ready for testing</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSendTest}
          disabled={loading || !selectedTest || selectedCandidates.length === 0}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Test to {selectedCandidates.length} Candidate{selectedCandidates.length !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>

      {/* Pending Tests */}
      {candidatesWithPendingTest.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tests Awaiting Completion</h3>
          <div className="space-y-3">
            {candidatesWithPendingTest.map(app => (
              <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{app.name}</p>
                  <p className="text-sm text-gray-600">{app.email}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Provider: {app.testing?.provider}</span>
                    <span>Invited: {new Date(app.testing?.invitedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSimulateCompletion(app.id)}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm font-semibold"
                >
                  Simulate Completion
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tests Results */}
      {candidatesWithCompletedTest.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Test Results</h3>
          <div className="space-y-4">
            {candidatesWithCompletedTest.map(app => {
              const results = app.testing;
              return (
                <div key={app.id} className="border rounded-xl p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{app.name}</h4>
                      <p className="text-sm text-gray-600">{app.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-blue-600">{results.score}%</div>
                      <p className="text-xs text-gray-500">Top {100 - results.percentile}%</p>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="space-y-2 mb-4">
                    {results.sections?.map((section, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{section.name}</span>
                          <span className="font-semibold">{section.score}/{section.maxScore}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${section.score / section.maxScore >= 0.8 ? 'bg-green-500' :
                              section.score / section.maxScore >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ width: `${(section.score / section.maxScore) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{Math.floor(results.duration / 60)} minutes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{new Date(results.completedAt).toLocaleString()}</span>
                    </div>
                    {results.proctoringAlerts > 0 && (
                      <div className="flex items-center gap-2 text-orange-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{results.proctoringAlerts} Alert(s)</span>
                      </div>
                    )}
                  </div>

                  {/* Recommendation Badge */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${results.recommendation === 'PROCEED' ? 'bg-green-100 text-green-700' :
                      results.recommendation === 'MAYBE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {results.recommendation}
                    </span>
                    <a
                      href={results.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                    >
                      View Full Report
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Integration Status Footer */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{selectedProvider}</span> integration active
            </span>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-semibold">
            Configure Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestingServiceIntegration;
