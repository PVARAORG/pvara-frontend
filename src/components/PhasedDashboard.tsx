import React, { useState, useEffect } from 'react';
import { FiCheckCircle, FiLock, FiFileText, FiSettings, FiMessageSquare, FiChevronRight } from 'react-icons/fi';
import { applicationsApi, ApplicationFolder, ComprehensiveEvaluation } from '../services/applications.api';
import { useWorkflowStore } from '../store/workflow.store';
import { ApplicationDetailView } from './ApplicationDetailView';
import { NOCCreationPanel } from './NOCCreationPanel';
import { DocumentManagementPanel } from './DocumentManagementPanel';
import { AIBotPanel } from './AIBotPanel';
import '../styles/phase-dashboard.css';

interface PhasedDashboardProps {
  onLogout?: () => void;
}

type PaneView = 'list' | 'details' | 'documents' | 'noc-creation' | 'ai-bot';

export const PhasedDashboard: React.FC<PhasedDashboardProps> = ({ onLogout }) => {
  const [applications, setApplications] = useState<ApplicationFolder[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationFolder | null>(null);
  const [evaluation, setEvaluation] = useState<ComprehensiveEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [activePane, setActivePane] = useState<PaneView>('list');
  const [activeTab, setActiveTab] = useState<'noc' | 'licensing'>('noc');
  
  const { initializeWorkflow, getCurrentWorkflow, moveToPhase } = useWorkflowStore();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const result = await applicationsApi.scanApplications();
      setApplications(result.applications);
      
      // Initialize workflows for all applications
      result.applications.forEach(app => {
        initializeWorkflow(app.id);
      });
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApplication = async (app: ApplicationFolder) => {
    setSelectedApp(app);
    setActivePane('details');
    
    try {
      setEvaluating(true);
      const result = await applicationsApi.evaluateApplication(app.id);
      setEvaluation(result.evaluation);
    } catch (err) {
      console.error('Error evaluating application:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleMoveToNOC = (appId: string) => {
    const success = moveToPhase(appId, 'noc-creation', 'user', 'Moving to NOC Creation Phase');
    if (success && selectedApp?.id === appId) {
      setActivePane('noc-creation');
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'evaluation': return <FiFileText size={18} />;
      case 'noc-creation': return <FiSettings size={18} />;
      case 'licensing': return <FiLock size={18} />;
      default: return <FiCheckCircle size={18} />;
    }
  };

  const getNOCApplications = () => {
    return applications.filter(app => {
      const workflow = getCurrentWorkflow(app.id);
      return workflow?.currentPhase === 'noc-creation' || workflow?.currentPhase === 'evaluation';
    });
  };

  const getLicensingApplications = () => {
    return applications.filter(app => {
      const workflow = getCurrentWorkflow(app.id);
      return workflow?.currentPhase === 'licensing';
    });
  };

  if (loading) {
    return (
      <div className="phased-dashboard loading-state">
        <div className="loading-spinner-lg"></div>
        <p className="text-sm text-secondary">Loading applications...</p>
      </div>
    );
  }

  const nocApps = getNOCApplications();
  const licensingApps = getLicensingApplications();

  return (
    <div className="phased-dashboard">
      {/* Header */}
      <header className="dashboard-header-modern glass-dark">
        <div className="header-container">
          <div className="header-left">
            <img src="/pvara-logo.png" alt="Pvara" className="pvara-logo" />
            <div>
              <h1 className="text-2xl font-bold">Pvara No Objection Certificate + Licensing Tool</h1>
              <p className="text-xs text-secondary opacity-75">AI-Powered Application Evaluation & No Objection Certificate Issuance</p>
            </div>
          </div>
          <div className="header-actions">
            {onLogout && (
              <button onClick={onLogout} className="btn btn-secondary btn-sm">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phase Tabs */}
      <div className="phase-tabs glass-dark">
        <div className="tabs-container">
          <button
            className={`phase-tab ${activeTab === 'noc' ? 'active' : ''}`}
            onClick={() => setActiveTab('noc')}
          >
            <FiSettings size={16} />
            <span>NOC Phase</span>
            <span className="badge badge-info text-xs">{nocApps.length}</span>
          </button>
          <button
            className={`phase-tab ${activeTab === 'licensing' ? 'active' : 'locked'}`}
            onClick={() => activeTab !== 'noc' && setActiveTab('licensing')}
            disabled={true}
          >
            <FiLock size={16} />
            <span>Licensing Phase</span>
            <span className="badge badge-error text-xs">Locked</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === 'noc' ? (
          <>
            {/* NOC Applications List */}
            <div className="applications-section">
              <h2 className="section-title text-md font-semibold">Applications in Evaluation</h2>
              {nocApps.length === 0 ? (
                <div className="empty-state card-glass">
                  <FiFileText size={32} opacity={0.3} />
                  <p className="text-sm text-secondary">No applications in NOC phase</p>
                </div>
              ) : (
                <div className="applications-grid">
                  {nocApps.map((app) => {
                    const workflow = getCurrentWorkflow(app.id);
                    return (
                      <div
                        key={app.id}
                        className={`application-card-modern card-glass ${selectedApp?.id === app.id ? 'selected' : ''}`}
                        onClick={() => handleSelectApplication(app)}
                      >
                        <div className="card-header-row">
                          <div className="flex items-center gap-sm">
                            {getPhaseIcon(workflow?.currentPhase || 'evaluation')}
                            <span className={`badge ${workflow?.currentPhase === 'evaluation' ? 'badge-warning' : 'badge-info'}`}>
                              {workflow?.currentPhase === 'evaluation' ? 'In Review' : 'NOC Ready'}
                            </span>
                          </div>
                          <span className="text-xs text-tertiary">
                            {new Date(app.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold" style={{marginTop: '0.75rem'}}>
                          {app.applicationData.companyName}
                        </h3>
                        <p className="text-xs text-secondary" style={{marginTop: '0.25rem'}}>
                          {app.applicationData.appName}
                        </p>
                        <div className="card-footer-row" style={{marginTop: '0.75rem'}}>
                          <span className="text-xs text-tertiary">{app.id}</span>
                          <FiChevronRight size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="detail-panel">
              {!selectedApp ? (
                <div className="empty-detail card-glass">
                  <FiFileText size={48} opacity={0.2} />
                  <p className="text-sm text-secondary">Select an application to view details</p>
                </div>
              ) : activePane === 'details' ? (
                <div className="detail-view-wrapper">
                  <div className="detail-view-header card-glass">
                    <div>
                      <h2 className="text-lg font-bold">{selectedApp.applicationData.companyName}</h2>
                      <p className="text-xs text-secondary">{selectedApp.id}</p>
                    </div>
                    <div className="detail-actions">
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActivePane('documents')}
                      >
                        <FiFileText size={14} /> Documents
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActivePane('ai-bot')}
                      >
                        <FiMessageSquare size={14} /> Ask Bot
                      </button>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => handleMoveToNOC(selectedApp.id)}
                      >
                        Proceed to NOC
                      </button>
                    </div>
                  </div>
                  {evaluating ? (
                    <div className="evaluation-loading card-glass">
                      <div className="loading-spinner-lg"></div>
                      <p className="text-sm font-medium">Performing AI Evaluation...</p>
                    </div>
                  ) : evaluation ? (
                    <ApplicationDetailView application={selectedApp} evaluation={evaluation} />
                  ) : null}
                </div>
              ) : activePane === 'documents' ? (
                <DocumentManagementPanel applicationId={selectedApp.id} />
              ) : activePane === 'ai-bot' ? (
                <AIBotPanel applicationId={selectedApp.id} applicationName={selectedApp.applicationData.companyName} />
              ) : activePane === 'noc-creation' ? (
                <NOCCreationPanel 
                  applications={applications}
                  selectedApplication={selectedApp}
                  onSelectApplication={(app) => {
                    setSelectedApp(app);
                    handleSelectApplication(app);
                  }}
                  evaluation={evaluation ?? undefined} 
                  onBack={() => setActivePane('details')}
                  onEvaluate={async (appId) => {
                    setEvaluating(true);
                    try {
                      const result = await applicationsApi.evaluateApplication(appId);
                      setEvaluation(result.evaluation);
                    } catch (err) {
                      console.error('Error evaluating:', err);
                    } finally {
                      setEvaluating(false);
                    }
                  }}
                />
              ) : null}
            </div>
          </>
        ) : (
          /* Licensing Phase - Locked */
          <div className="licensing-locked-view">
            <div className="locked-message card-glass glass-dark">
              <FiLock size={64} />
              <h2 className="text-xl font-bold">Licensing Phase - Coming Soon</h2>
              <p className="text-sm text-secondary">
                The licensing phase will be available once all NOC documents are processed and approved.
              </p>
              <p className="text-xs text-tertiary">
                Current applications in licensing: {licensingApps.length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
