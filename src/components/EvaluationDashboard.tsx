import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

interface ComplianceData {
  score: number;
  compliant: boolean;
  issues: any[];
  recommendations: string[];
}

interface RiskData {
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  riskScore: number;
  threats: any[];
}

interface EvaluationDashboardProps {
  compliance: ComplianceData;
  risk: RiskData;
  summary: string;
}

const getRiskColor = (level: string) => {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };
  return colors[level] || '#6b7280';
};

const getSeverityColor = (severity: string) => {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  };
  return colors[severity] || '#6b7280';
};

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({
  compliance,
  risk,
  summary,
}) => {
  const complianceData = [
    { name: 'Compliant', value: compliance.score, fill: '#22c55e' },
    { name: 'Non-Compliant', value: 100 - compliance.score, fill: '#ef4444' },
  ];

  const threatLikelihoodData = risk.threats.map((t, i) => ({
    threat: `Threat ${i + 1}`,
    likelihood: t.likelihood === 'high' ? 3 : t.likelihood === 'medium' ? 2 : 1,
    impact: t.impact === 'high' ? 3 : t.impact === 'medium' ? 2 : 1,
  }));

  return (
    <div className="evaluation-dashboard">
      <div className="dashboard-header">
        <h2>NOC Application Evaluation Report</h2>
        <p className="summary">{summary}</p>
      </div>

      <div className="metrics-grid">
        {/* Compliance Score */}
        <div className="metric-card">
          <h3>Compliance Score</h3>
          <div className="score-display">
            <div className="score-circle" style={{ borderColor: getRiskColor(compliance.compliant ? 'low' : 'high') }}>
              {compliance.score}%
            </div>
            <div className="score-status">
              {compliance.compliant ? (
                <>
                  <FiCheckCircle color="#22c55e" size={24} />
                  <span>Compliant</span>
                </>
              ) : (
                <>
                  <FiAlertTriangle color="#ef4444" size={24} />
                  <span>Non-Compliant</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Risk Level */}
        <div className="metric-card">
          <h3>Risk Assessment</h3>
          <div className="risk-display">
            <div className="risk-level" style={{ color: getRiskColor(risk.riskLevel) }}>
              {risk.riskLevel.toUpperCase()}
            </div>
            <div className="risk-score">
              <div className="risk-meter">
                <div
                  className="risk-fill"
                  style={{
                    width: `${risk.riskScore}%`,
                    backgroundColor: getRiskColor(risk.riskLevel),
                  }}
                />
              </div>
              <span>{risk.riskScore}/100</span>
            </div>
          </div>
        </div>

        {/* Issues Summary */}
        <div className="metric-card">
          <h3>Compliance Issues</h3>
          <div className="issues-summary">
            {compliance.issues.length > 0 ? (
              <ul>
                {compliance.issues.slice(0, 3).map((issue, idx) => (
                  <li key={idx} style={{ borderLeftColor: getSeverityColor(issue.severity) }}>
                    <span className="issue-severity">{issue.severity}</span>
                    <span className="issue-category">{issue.category}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-issues">No compliance issues found</p>
            )}
          </div>
        </div>

        {/* Threats Summary */}
        <div className="metric-card">
          <h3>Security Threats</h3>
          <div className="threats-summary">
            {risk.threats.length > 0 ? (
              <ul>
                {risk.threats.slice(0, 3).map((threat, idx) => (
                  <li key={idx}>
                    <span className="threat-type">{threat.type}</span>
                    <span className="threat-likelihood">{threat.likelihood}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-threats">No threats identified</p>
            )}
          </div>
        </div>
      </div>

      {/* Threat Analysis Chart */}
      {threatLikelihoodData.length > 0 && (
        <div className="chart-container">
          <h3>Threat Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={threatLikelihoodData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="threat" stroke="#6b7280" />
              <PolarRadiusAxis angle={90} domain={[0, 3]} stroke="#6b7280" />
              <Radar name="Likelihood" dataKey="likelihood" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
              <Radar name="Impact" dataKey="impact" stroke="#f97316" fill="#f97316" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      {compliance.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>Recommendations</h3>
          <ul className="recommendations-list">
            {compliance.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
