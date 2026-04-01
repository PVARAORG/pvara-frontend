import React, { useState, useEffect } from 'react';
import apiClient from './api/client';

export default function SettingsPanel({ settings: initialSettings, onUpdateSettings, onTestEmail }) {
  const [activeTab, setActiveTab] = useState('email');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [emailConfig, setEmailConfig] = useState({
    provider: 'gmail',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'PVARA Recruitment',
    enabled: true,
  });

  const [emailTemplates, setEmailTemplates] = useState({
    applicationReceived: {
      subject: 'Application Received - {jobTitle}',
      body: 'Dear {candidateName},\n\nThank you for applying to {jobTitle}. We have received your application and will review it shortly. You will be notified of the next steps.\n\nBest regards,\nPVARA Recruitment Team'
    },
    shortlisted: {
      subject: 'Congratulations! You\'ve been shortlisted',
      body: 'Dear {candidateName},\n\nGreat news! You have been shortlisted for the {jobTitle} position. Our team will contact you soon to schedule an interview.\n\nBest regards,\nPVARA Recruitment Team'
    },
    testInvitation: {
      subject: 'Assessment Test - {jobTitle}',
      body: 'Dear {candidateName},\n\nYou have been invited to complete an assessment test for {jobTitle}. Please access the test using the link below within 48 hours.\n\nTest Link: {testLink}\n\nBest regards,\nPVARA Recruitment Team'
    },
    interviewScheduled: {
      subject: 'Interview Scheduled - {jobTitle}',
      body: 'Dear {candidateName},\n\nYour interview for {jobTitle} has been scheduled.\n\nDate: {date}\nTime: {time}\nLocation: {location}\n\nPlease confirm your availability.\n\nBest regards,\nPVARA Recruitment Team'
    },
    offerExtended: {
      subject: 'Job Offer - {jobTitle}',
      body: 'Dear {candidateName},\n\nCongratulations! We are pleased to extend a job offer for {jobTitle}.\n\nSalary: {salary}\nStart Date: {startDate}\n\nPlease review the attached offer letter and respond within 7 days.\n\nBest regards,\nPVARA Recruitment Team'
    },
    rejection: {
      subject: 'Application Status Update',
      body: 'Dear {candidateName},\n\nThank you for your interest in {jobTitle}. After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our requirements.\n\nWe encourage you to apply for future openings that match your profile.\n\nBest regards,\nPVARA Recruitment Team'
    }
  });

  const [editingTemplate, setEditingTemplate] = useState(null);

  const [scoringConfig, setScoringConfig] = useState({
    education: 40,
    experience: 40,
    interview: 20,
  });

  const [systemConfig, setSystemConfig] = useState({
    autoEmailOnSubmit: true,
    autoEmailOnStatusChange: true,
    requireApprovalForOffers: true,
    allowCandidateWithdrawal: true,
  });

  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // User management state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'viewer',
    phone: '',
    department: '',
    otpEnabled: false,
  });
  const [addUserError, setAddUserError] = useState(null);
  const [addingUser, setAddingUser] = useState(false);

  // Fetch settings from backend on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/settings/');
        if (response.data?.success && response.data?.settings) {
          const s = response.data.settings;

          // Update email config
          if (s.email) {
            setEmailConfig({
              provider: s.email.provider || 'gmail',
              smtpHost: s.email.smtpHost || 'smtp.gmail.com',
              smtpPort: s.email.smtpPort || '587',
              smtpUser: s.email.smtpUser || '',
              smtpPassword: s.email.smtpPassword || '',
              fromEmail: s.email.fromEmail || '',
              fromName: s.email.fromName || 'PVARA Recruitment',
              enabled: s.email.enabled !== false,
            });
          }

          // Update email templates - ensure proper null safety
          if (s.emailTemplates) {
            setEmailTemplates(prev => {
              const merged = { ...prev };
              // Only merge non-null templates with valid subject/body
              Object.keys(s.emailTemplates).forEach(key => {
                const template = s.emailTemplates[key];
                if (template && (template.subject || template.body)) {
                  merged[key] = {
                    subject: template.subject || prev[key]?.subject || '',
                    body: template.body || prev[key]?.body || ''
                  };
                }
              });
              return merged;
            });
          }

          // Update scoring config
          if (s.scoring) {
            setScoringConfig({
              education: s.scoring.education || 40,
              experience: s.scoring.experience || 40,
              interview: s.scoring.interview || 20,
            });
          }

          // Update system config
          if (s.system) {
            setSystemConfig({
              autoEmailOnSubmit: s.system.autoEmailOnSubmit !== false,
              autoEmailOnStatusChange: s.system.autoEmailOnStatusChange !== false,
              requireApprovalForOffers: s.system.requireApprovalForOffers !== false,
              allowCandidateWithdrawal: s.system.allowCandidateWithdrawal !== false,
            });
          }
        }
        setError(null);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setError('Failed to load settings. Using defaults.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/email/', {
        provider: emailConfig.provider,
        smtpHost: emailConfig.smtpHost,
        smtpPort: emailConfig.smtpPort,
        smtpUser: emailConfig.smtpUser,
        smtpPassword: emailConfig.smtpPassword,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
        enabled: emailConfig.enabled,
      });
      onUpdateSettings?.({ email: emailConfig });
    } catch (err) {
      console.error('Failed to save email settings:', err);
      setError('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveScoringSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/scoring/', scoringConfig);
      onUpdateSettings?.({ scoring: scoringConfig });
    } catch (err) {
      console.error('Failed to save scoring settings:', err);
      setError('Failed to save scoring settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    setSaving(true);
    try {
      await apiClient.put('/settings/system/', systemConfig);
      onUpdateSettings?.({ system: systemConfig });
    } catch (err) {
      console.error('Failed to save system settings:', err);
      setError('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplates = async () => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await apiClient.put(`/settings/email-templates/${editingTemplate}/`, emailTemplates[editingTemplate]);
      }
      onUpdateSettings?.({ emailTemplates });
      setEditingTemplate(null);
    } catch (err) {
      console.error('Failed to save template:', err);
      setError('Failed to save email template');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) return;
    setTesting(true);
    try {
      await apiClient.post('/email/test/', { email: testEmailAddress });
      onTestEmail?.(testEmailAddress);
    } catch (err) {
      console.error('Failed to send test email:', err);
      setError('Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  // Fetch users from backend
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiClient.get('/users/');
      if (response.data?.success && response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch users when users tab is active
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  // Handle add user
  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddUserError(null);
    setAddingUser(true);
    try {
      const response = await apiClient.post('/users/', addUserForm);
      if (response.data?.success) {
        // Reset form and close modal
        setAddUserForm({
          username: '',
          email: '',
          password: '',
          fullName: '',
          role: 'viewer',
          phone: '',
          department: '',
          otpEnabled: false,
        });
        setShowAddUserModal(false);
        // Refresh users list
        fetchUsers();
      }
    } catch (err) {
      console.error('Failed to add user:', err);
      setAddUserError(err.response?.data?.detail?.message || err.response?.data?.message || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId, userRole) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    console.log('Deleting user with ID:', userId);

    try {
      const response = await apiClient.delete(`/users/${userId}/`);
      console.log('Delete response:', response);
      // Refresh users list
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.detail?.message || err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'hr': return 'bg-green-100 text-green-700';
      case 'recruiter': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get avatar color
  const getAvatarColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-600';
      case 'hr': return 'bg-green-600';
      case 'recruiter': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const tabs = [
    { id: 'email', name: '📧 Email Settings', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'templates', name: '📝 Email Templates', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'users', name: '👥 User Management', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'scoring', name: '🎯 Scoring Weights', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { id: 'system', name: '⚙️ System Settings', icon: 'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading settings...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <span className="text-red-600">⚠️</span>
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Settings</h1>
        <p className="text-gray-600">Configure email, scoring, and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium transition-all flex items-center gap-2 border-b-2 ${activeTab === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Email Settings Tab */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {/* Email Service Status */}
          <div className={`glass-card p-6 rounded-lg border-l-4 ${emailConfig.enabled ? 'border-green-500' : 'border-yellow-500'}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-1 ${emailConfig.enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                {emailConfig.enabled ? '✅' : '⚠️'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Email Service {emailConfig.enabled ? 'Enabled' : 'Disabled'}
                </h3>
                <p className="text-sm text-gray-600">
                  {emailConfig.enabled
                    ? 'Automatic emails will be sent to candidates for applications, status updates, interviews, and offers.'
                    : 'Email service is currently disabled. Enable it to send automatic notifications.'}
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailConfig.enabled}
                  onChange={(e) => setEmailConfig({ ...emailConfig, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Email Provider Selection */}
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Provider</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { value: 'gmail', name: 'Gmail', icon: '📧', desc: 'Easy setup with Gmail' },
                { value: 'sendgrid', name: 'SendGrid', icon: '🚀', desc: 'Professional email service' },
                { value: 'custom', name: 'Custom SMTP', icon: '⚙️', desc: 'Any SMTP server' },
              ].map(provider => (
                <button
                  key={provider.value}
                  onClick={() => setEmailConfig({ ...emailConfig, provider: provider.value })}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${emailConfig.provider === provider.value
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  <div className="text-2xl mb-2">{provider.icon}</div>
                  <div className="font-semibold text-gray-900">{provider.name}</div>
                  <div className="text-sm text-gray-600">{provider.desc}</div>
                </button>
              ))}
            </div>

            {/* SMTP Configuration */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={emailConfig.smtpHost}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={emailConfig.smtpPort}
                    onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
                    placeholder="587"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Username / Email
                </label>
                <input
                  type="email"
                  value={emailConfig.smtpUser}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMTP Password / App Password
                </label>
                <input
                  type="password"
                  value={emailConfig.smtpPassword}
                  onChange={(e) => setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })}
                  placeholder="••••••••••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {emailConfig.provider === 'gmail' && (
                  <p className="mt-2 text-sm text-blue-600">
                    💡 Get Gmail App Password: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">myaccount.google.com/apppasswords</a>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={emailConfig.fromEmail}
                    onChange={(e) => setEmailConfig({ ...emailConfig, fromEmail: e.target.value })}
                    placeholder="recruitment@pvara.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={emailConfig.fromName}
                    onChange={(e) => setEmailConfig({ ...emailConfig, fromName: e.target.value })}
                    placeholder="PVARA Recruitment"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Test Email */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3">Test Email Configuration</h4>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="your-email@example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={testing || !testEmailAddress}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {testing ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveEmailSettings}
                disabled={saving}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? 'Saving...' : 'Save Email Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Settings Tab */}
      {activeTab === 'scoring' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Screening Score Weights</h3>
            <p className="text-sm text-gray-600 mb-6">
              Configure how different factors contribute to the overall candidate score. Total must equal 100%.
            </p>

            <div className="space-y-6">
              {/* Education Weight */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Education Weight</label>
                  <span className="text-sm font-semibold text-blue-600">{scoringConfig.education}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.education}
                  onChange={(e) => setScoringConfig({ ...scoringConfig, education: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-gray-500 mt-1">Weight given to educational qualifications and certifications</p>
              </div>

              {/* Experience Weight */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Experience Weight</label>
                  <span className="text-sm font-semibold text-purple-600">{scoringConfig.experience}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.experience}
                  onChange={(e) => setScoringConfig({ ...scoringConfig, experience: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <p className="text-xs text-gray-500 mt-1">Weight given to years of experience and past roles</p>
              </div>

              {/* Interview Weight */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Interview Weight</label>
                  <span className="text-sm font-semibold text-green-600">{scoringConfig.interview}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={scoringConfig.interview}
                  onChange={(e) => setScoringConfig({ ...scoringConfig, interview: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <p className="text-xs text-gray-500 mt-1">Weight given to interview performance scores</p>
              </div>

              {/* Total Indicator */}
              <div className={`p-4 rounded-lg ${scoringConfig.education + scoringConfig.experience + scoringConfig.interview === 100 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Total Weight:</span>
                  <span className={`text-lg font-bold ${scoringConfig.education + scoringConfig.experience + scoringConfig.interview === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    {scoringConfig.education + scoringConfig.experience + scoringConfig.interview}%
                  </span>
                </div>
                {scoringConfig.education + scoringConfig.experience + scoringConfig.interview !== 100 && (
                  <p className="text-sm text-red-600 mt-2">⚠️ Total must equal 100%</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveScoringSettings}
                disabled={saving || (scoringConfig.education + scoringConfig.experience + scoringConfig.interview !== 100)}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? 'Saving...' : 'Save Scoring Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h3>
            <p className="text-sm text-gray-600 mb-6">
              Customize email templates sent to candidates during different stages of recruitment.
              Available variables: {'{candidateName}'}, {'{jobTitle}'}, {'{date}'}, {'{time}'}, {'{location}'}, {'{salary}'}, {'{startDate}'}, {'{testLink}'}
            </p>

            <div className="space-y-4">
              {/* Application Received Template */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Application Received</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent when candidate submits application</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Auto-sent</span>
                    <button
                      onClick={() => setEditingTemplate('applicationReceived')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {editingTemplate === 'applicationReceived' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailTemplates.applicationReceived.subject}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          applicationReceived: { ...emailTemplates.applicationReceived, subject: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={emailTemplates.applicationReceived.body}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          applicationReceived: { ...emailTemplates.applicationReceived, body: e.target.value }
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplates}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Subject:</strong> {emailTemplates.applicationReceived.subject}<br />
                    <strong>Body:</strong> {emailTemplates.applicationReceived?.body?.substring(0, 100) || 'No body configured'}...
                  </div>
                )}
              </div>

              {/* Shortlisted Template */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Application Shortlisted</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent when candidate is shortlisted after screening</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Auto-sent</span>
                    <button
                      onClick={() => setEditingTemplate('shortlisted')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {editingTemplate === 'shortlisted' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailTemplates.shortlisted.subject}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          shortlisted: { ...emailTemplates.shortlisted, subject: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={emailTemplates.shortlisted.body}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          shortlisted: { ...emailTemplates.shortlisted, body: e.target.value }
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplates}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Subject:</strong> {emailTemplates.shortlisted.subject}<br />
                    <strong>Body:</strong> {emailTemplates.shortlisted?.body?.substring(0, 100) || 'No body configured'}...
                  </div>
                )}
              </div>

              {/* Test Invitation Template */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Test Invitation</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent when test is assigned to candidate</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Auto-sent</span>
                    <button
                      onClick={() => setEditingTemplate('testInvitation')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {editingTemplate === 'testInvitation' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailTemplates.testInvitation.subject}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          testInvitation: { ...emailTemplates.testInvitation, subject: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={emailTemplates.testInvitation.body}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          testInvitation: { ...emailTemplates.testInvitation, body: e.target.value }
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplates}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Subject:</strong> {emailTemplates.testInvitation.subject}<br />
                    <strong>Body:</strong> {emailTemplates.testInvitation?.body?.substring(0, 100) || 'No body configured'}...
                  </div>
                )}
              </div>

              {/* Interview Scheduled Template */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Interview Scheduled</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent when interview is scheduled with candidate</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Auto-sent</span>
                    <button
                      onClick={() => setEditingTemplate('interviewScheduled')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {editingTemplate === 'interviewScheduled' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailTemplates.interviewScheduled.subject}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          interviewScheduled: { ...emailTemplates.interviewScheduled, subject: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={emailTemplates.interviewScheduled.body}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          interviewScheduled: { ...emailTemplates.interviewScheduled, body: e.target.value }
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplates}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Subject:</strong> {emailTemplates.interviewScheduled.subject}<br />
                    <strong>Body:</strong> {emailTemplates.interviewScheduled?.body?.substring(0, 100) || 'No body configured'}...
                  </div>
                )}
              </div>

              {/* Offer Extended Template */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Job Offer Extended</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent when job offer is extended to candidate</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Auto-sent</span>
                    <button
                      onClick={() => setEditingTemplate('offerExtended')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {editingTemplate === 'offerExtended' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailTemplates.offerExtended.subject}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          offerExtended: { ...emailTemplates.offerExtended, subject: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={emailTemplates.offerExtended.body}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          offerExtended: { ...emailTemplates.offerExtended, body: e.target.value }
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplates}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Subject:</strong> {emailTemplates.offerExtended.subject}<br />
                    <strong>Body:</strong> {emailTemplates.offerExtended?.body?.substring(0, 100) || 'No body configured'}...
                  </div>
                )}
              </div>

              {/* Rejection Template */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">Application Rejection</h4>
                    <p className="text-xs text-gray-500 mt-1">Sent when candidate is not selected</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Auto-sent</span>
                    <button
                      onClick={() => setEditingTemplate('rejection')}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                {editingTemplate === 'rejection' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={emailTemplates.rejection.subject}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          rejection: { ...emailTemplates.rejection, subject: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <textarea
                        value={emailTemplates.rejection.body}
                        onChange={(e) => setEmailTemplates({
                          ...emailTemplates,
                          rejection: { ...emailTemplates.rejection, body: e.target.value }
                        })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplates}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Template
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <strong>Subject:</strong> {emailTemplates.rejection.subject}<br />
                    <strong>Body:</strong> {emailTemplates.rejection?.body?.substring(0, 100) || 'No body configured'}...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600 mt-1">Manage HR, recruiters, and system users</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add User
              </button>
            </div>

            {/* User List */}
            <div className="space-y-3">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading users...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No users found. Click "Add User" to create one.
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${getAvatarColor(user.role)} text-white rounded-full flex items-center justify-center font-semibold`}>
                        {user.fullName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{user.fullName || user.username}</h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 ${getRoleBadgeColor(user.role)} text-sm rounded-full font-medium capitalize`}>
                        {user.role}
                      </span>
                      <span className={`text-xs ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {(user.role === 'admin' || user.role === 'hr') && (
                        <span className={`text-xs px-2 py-0.5 rounded ${user.otpEnabled ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                          {user.otpEnabled ? '🔐 OTP' : '🔓 No OTP'}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteUser(user.id || user._id, user.role)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete user"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Role Information */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Role Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <strong className="text-red-700">Admin</strong>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>✓ Full system access</li>
                    <li>✓ User management</li>
                    <li>✓ Settings control</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-700">HR Manager</strong>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>✓ Review applications</li>
                    <li>✓ Manage interviews</li>
                    <li>✓ Analytics access</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-700">Recruiter</strong>
                  <ul className="mt-2 space-y-1 text-gray-600">
                    <li>✓ View applications</li>
                    <li>✓ Schedule interviews</li>
                    <li>✓ Add notes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                    <button
                      onClick={() => {
                        setShowAddUserModal(false);
                        setAddUserError(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleAddUser} className="p-6 space-y-4">
                  {addUserError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      {addUserError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={addUserForm.username}
                      onChange={(e) => setAddUserForm({ ...addUserForm, username: e.target.value })}
                      placeholder="johndoe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={addUserForm.email}
                      onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={addUserForm.password}
                      onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={addUserForm.fullName}
                      onChange={(e) => setAddUserForm({ ...addUserForm, fullName: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      required
                      value={addUserForm.role}
                      onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="hr">HR Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={addUserForm.phone}
                      onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                      placeholder="+92-300-1234567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={addUserForm.department}
                      onChange={(e) => setAddUserForm({ ...addUserForm, department: e.target.value })}
                      placeholder="Human Resources"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* OTP Toggle - Only show for admin/hr roles */}
                  {(addUserForm.role === 'admin' || addUserForm.role === 'hr') && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-purple-800">🔐 Require Email OTP on Login</label>
                        <p className="text-xs text-purple-600 mt-0.5">Send verification code to email when this user logs in</p>
                      </div>
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addUserForm.otpEnabled}
                          onChange={(e) => setAddUserForm({ ...addUserForm, otpEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUserModal(false);
                        setAddUserError(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingUser}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {addingUser ? 'Creating...' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Settings</h3>

            <div className="space-y-4">
              {/* Auto Email on Submit */}
              <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Auto-send Application Confirmation</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically send confirmation email when candidate submits application
                  </p>
                </div>
                <label className="flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={systemConfig.autoEmailOnSubmit}
                    onChange={(e) => setSystemConfig({ ...systemConfig, autoEmailOnSubmit: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Auto Email on Status Change */}
              <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Auto-send Status Updates</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically email candidates when their application status changes
                  </p>
                </div>
                <label className="flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={systemConfig.autoEmailOnStatusChange}
                    onChange={(e) => setSystemConfig({ ...systemConfig, autoEmailOnStatusChange: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Require Approval for Offers */}
              <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Require Approval for Job Offers</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Job offers must be approved by admin before being sent to candidates
                  </p>
                </div>
                <label className="flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={systemConfig.requireApprovalForOffers}
                    onChange={(e) => setSystemConfig({ ...systemConfig, requireApprovalForOffers: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Allow Candidate Withdrawal */}
              <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Allow Candidate Withdrawal</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Candidates can withdraw their application from their portal
                  </p>
                </div>
                <label className="flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={systemConfig.allowCandidateWithdrawal}
                    onChange={(e) => setSystemConfig({ ...systemConfig, allowCandidateWithdrawal: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveSystemSettings}
                disabled={saving}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? 'Saving...' : 'Save System Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
