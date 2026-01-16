import React, { useState } from 'react';
import { FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle, FiMessageSquare, FiLogOut } from 'react-icons/fi';
import { sampleApplications, Application } from '../data/sampleApplications';
import { EvaluationDashboard } from '../components/EvaluationDashboard';
import { evaluationApi } from '../services/api';

interface ApplicationsDashboardProps {
  onLogout?: () => void;
}

export const ApplicationsDashboard: React.FC<ApplicationsDashboardProps> = ({ onLogout }) => {
  const [apps, setApps] = useState<Application[]>(sampleApplications);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showQA, setShowQA] = useState(false);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ question: string; answer: string }>>([]);
  const [showNewAppForm, setShowNewAppForm] = useState(false);
  const [newAppMeta, setNewAppMeta] = useState({ name: '', vendor: '', version: '', description: '' });
  const [newAppFiles, setNewAppFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="status-icon approved" />;
      case 'rejected':
        return <FiXCircle className="status-icon rejected" />;
      case 'under-review':
        return <FiClock className="status-icon review" />;
      default:
        return <FiAlertTriangle className="status-icon pending" />;
    }
  };

  const getStatusClass = (status: string) => {
    return `status-badge ${status}`;
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !selectedApp) return;
    
    const answer = `Based on the evaluation of ${selectedApp.appName}, ${getAIAnswer(question, selectedApp)}`;
    
    setQaHistory([...qaHistory, { question, answer }]);
    setQuestion('');
  };

  const getAIAnswer = (q: string, app: Application): string => {
    const lowerQ = q.toLowerCase();
    
    if (lowerQ.includes('risk') || lowerQ.includes('threat')) {
      return `the primary risks identified are: ${app.threats.map((t: any) => t.description).join('; ')}. The overall risk level is ${app.riskLevel.toUpperCase()}.`;
    }
    if (lowerQ.includes('compliance') || lowerQ.includes('gdpr')) {
      return `the compliance score is ${app.complianceScore}%. GDPR compliance specifically scores ${app.complianceDetails.gdprCompliance}%. ${app.issues.length > 0 ? 'Key issues include: ' + app.issues[0] : 'No major compliance issues identified.'}`;
    }
    if (lowerQ.includes('recommend') || lowerQ.includes('approve')) {
      return app.status === 'approved' 
        ? `the application has been APPROVED with conditions. Main recommendations: ${app.recommendations.slice(0, 2).join('; ')}.`
        : `the application requires improvements before approval. Critical items: ${app.recommendations.slice(0, 2).join('; ')}.`;
    }
    if (lowerQ.includes('data') || lowerQ.includes('privacy')) {
      return `the application processes: ${app.dataUsage}. Data protection score is ${app.complianceDetails.dataProtection}%. ${app.issues.filter((i: string) => i.toLowerCase().includes('data')).length > 0 ? 'There are concerns about: ' + app.issues.filter((i: string) => i.toLowerCase().includes('data'))[0] : 'Data handling appears adequate.'}`;
    }
    
    return `I can provide information about compliance scores (${app.complianceScore}%), risk assessment (${app.riskLevel}), security standards, or specific recommendations. Please ask a more specific question.`;
  };

  return (
    <div className="applications-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>📋 No Objection Certificate Application Portal</h1>
            <p className="subtitle">AI-Powered Compliance Evaluation System</p>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="logout-button">
              <FiLogOut /> Logout
            </button>
          )}
          <button onClick={() => setShowNewAppForm(true)} className="logout-button" style={{ marginLeft: 12 }}>
            + Add New Application
          </button>
        </div>
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-number">{apps.length}</span>
            <span className="stat-label">Total Applications</span>
          </div>
          <div className="stat">
            <span className="stat-number">{apps.filter((a: Application) => a.status === 'approved').length}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat">
            <span className="stat-number">{apps.filter((a: Application) => a.status === 'under-review').length}</span>
            <span className="stat-label">Under Review</span>
          </div>
        </div>
      </header>

      <div className="applications-grid">
        {apps.map((app: Application) => (
          <div 
            key={app.id} 
            className={`application-card ${selectedApp?.id === app.id ? 'selected' : ''}`}
            onClick={() => {
              setSelectedApp(app);
              setShowQA(false);
              setQaHistory([]);
            }}
          >
            <div className="card-header">
              <img src={app.companyLogo} alt={app.companyName} className="company-logo" />
              <div className="company-info">
                <h3>{app.companyName}</h3>
                <span className="app-id">{app.id}</span>
              </div>
              {getStatusIcon(app.status)}
            </div>
            
            <div className="card-body">
              <h4>{app.appName}</h4>
              <p className="version">v{app.appVersion} • {app.appVendor}</p>
              <p className="description">{app.appDescription.slice(0, 120)}...</p>
              
              <div className="capabilities">
                {app.aiCapabilities.slice(0, 2).map((cap: string, idx: number) => (
                  <span key={idx} className="capability-tag">{cap}</span>
                ))}
                {app.aiCapabilities.length > 2 && (
                  <span className="capability-tag more">+{app.aiCapabilities.length - 2} more</span>
                )}
              </div>
              
              <div className="metrics">
                <div className="metric">
                  <div className="metric-label">Compliance</div>
                  <div className={`metric-value ${app.complianceScore >= 80 ? 'good' : app.complianceScore >= 60 ? 'warning' : 'danger'}`}>
                    {app.complianceScore}%
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Risk Level</div>
                  <div className={`metric-value risk-${app.riskLevel}`}>
                    {app.riskLevel.toUpperCase()}
                  </div>
                </div>
              </div>
              
              <div className={getStatusClass(app.status)}>
                {app.status.replace('-', ' ').toUpperCase()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedApp && (
        <div className="evaluation-details">
          <div className="details-header">
            <h2>🤖 AI Evaluation Report: {selectedApp.appName}</h2>
            <button 
              className="qa-toggle"
              onClick={() => setShowQA(!showQA)}
            >
              <FiMessageSquare /> {showQA ? 'Hide Q&A' : 'Ask Questions'}
            </button>
          </div>

          <div className="ai-evaluation-summary">
            <h3>AI Analysis Summary</h3>
            <p>{selectedApp.aiEvaluation}</p>
          </div>

          <div className="evaluation-metrics">
            <h3>Detailed Evaluation Metrics</h3>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>Compliance Score</h4>
                <div className={`score ${selectedApp.complianceScore >= 80 ? 'good' : selectedApp.complianceScore >= 60 ? 'warning' : 'danger'}`}>
                  {selectedApp.complianceScore}%
                </div>
              </div>
              <div className="metric-card">
                <h4>GDPR Compliance</h4>
                <div className="score good">{selectedApp.complianceDetails.gdprCompliance}%</div>
              </div>
              <div className="metric-card">
                <h4>Security Standards</h4>
                <div className="score">{selectedApp.complianceDetails.securityStandards}%</div>
              </div>
              <div className="metric-card">
                <h4>Data Protection</h4>
                <div className="score">{selectedApp.complianceDetails.dataProtection}%</div>
              </div>
            </div>

            <div className="threats-section">
              <h4>⚠️ Identified Threats</h4>
              {selectedApp.threats.map((threat, idx) => (
                <div key={idx} className={`threat-item ${threat.severity}`}>
                  <strong>{threat.category}</strong> ({threat.severity.toUpperCase()})
                  <p>{threat.description}</p>
                </div>
              ))}
            </div>

            <div className="issues-section">
              <h4>📋 Issues Found</h4>
              <ul>
                {selectedApp.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>

            <div className="recommendations-section">
              <h4>✅ Recommendations</h4>
              <ul>
                {selectedApp.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>

          {showQA && (
            <div className="qa-section">
              <h3>💬 Ask Questions About This Application</h3>
              
              {qaHistory.length > 0 && (
                <div className="qa-history">
                  {qaHistory.map((qa, idx) => (
                    <div key={idx} className="qa-item">
                      <div className="question">
                        <strong>Q:</strong> {qa.question}
                      </div>
                      <div className="answer">
                        <strong>AI:</strong> {qa.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="qa-input">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="Ask about compliance, risks, recommendations, data privacy..."
                  className="question-input"
                />
                <button 
                  onClick={handleAskQuestion}
                  disabled={!question.trim()}
                  className="ask-button"
                >
                  Ask AI
                </button>
              </div>

              <div className="suggested-questions">
                <p>Suggested questions:</p>
                <button onClick={() => setQuestion('What are the main compliance risks?')}>
                  What are the main compliance risks?
                </button>
                <button onClick={() => setQuestion('Should this application be approved?')}>
                  Should this application be approved?
                </button>
                <button onClick={() => setQuestion('What data privacy concerns exist?')}>
                  What data privacy concerns exist?
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showNewAppForm && (
        <div className="evaluation-details" style={{ marginTop: 24 }}>
          <div className="details-header">
            <h2>➕ Add New Application</h2>
          </div>
          <div className="qa-section">
            <div className="qa-input" style={{ display: 'grid', gap: 12 }}>
              <input type="text" placeholder="Application Name" value={newAppMeta.name}
                onChange={(e) => setNewAppMeta({ ...newAppMeta, name: e.target.value })} />
              <input type="text" placeholder="Vendor" value={newAppMeta.vendor}
                onChange={(e) => setNewAppMeta({ ...newAppMeta, vendor: e.target.value })} />
              <input type="text" placeholder="Version" value={newAppMeta.version}
                onChange={(e) => setNewAppMeta({ ...newAppMeta, version: e.target.value })} />
              <input type="text" placeholder="Short Description" value={newAppMeta.description}
                onChange={(e) => setNewAppMeta({ ...newAppMeta, description: e.target.value })} />
              <input type="file" multiple onChange={(e) => setNewAppFiles(Array.from(e.target.files || []))} />
              <div>
                <button
                  className="ask-button"
                  disabled={isSubmitting || newAppFiles.length === 0 || !newAppMeta.name}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      const resp = await evaluationApi.uploadFiles(newAppFiles, {
                        name: newAppMeta.name,
                        vendor: newAppMeta.vendor,
                        version: newAppMeta.version,
                        description: newAppMeta.description,
                      });
                      const { application, evaluation } = resp.data;
                      // Map backend data to frontend Application shape
                      const newCard: Application = {
                        id: application.id,
                        companyLogo: '/logo192.png',
                        companyName: application.vendor || 'New Vendor',
                        applicationDate: new Date().toISOString().slice(0, 10),
                        appName: application.name,
                        appVersion: application.version,
                        appVendor: application.vendor,
                        appDescription: application.description,
                        aiCapabilities: ['Uploaded Docs'],
                        complianceScore: evaluation?.compliance?.score || 70,
                        riskLevel: (evaluation?.risk?.riskLevel || 'medium') as any,
                        threats: (evaluation?.risk?.threats || []).map((t: any) => ({ category: t.type, severity: (t.impact || 'medium') as any, description: t.description })),
                        issues: (evaluation?.compliance?.issues || []).map((i: any) => i.description),
                        recommendations: evaluation?.compliance?.recommendations || [],
                        aiEvaluation: evaluation?.summary || 'Evaluation complete.',
                        complianceDetails: {
                          gdprCompliance: Math.min(100, Math.max(50, evaluation?.compliance?.score || 70)),
                          securityStandards: 75,
                          dataProtection: 72,
                          aiEthics: 70,
                        },
                        dataUsage: 'Documents uploaded for review',
                        status: 'under-review',
                      };
                      setApps([newCard, ...apps]);
                      setShowNewAppForm(false);
                      setSelectedApp(newCard);
                      setNewAppFiles([]);
                    } catch (e) {
                      console.error('New application upload failed', e);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Create & Evaluate'}
                </button>
                <button className="logout-button" style={{ marginLeft: 8 }} onClick={() => setShowNewAppForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
