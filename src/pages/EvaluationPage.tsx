import React, { useState } from 'react';
import { FiSend, FiLoader } from 'react-icons/fi';
import { evaluationApi } from '../services/api';
import { FileUpload } from '../components/FileUpload';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { EvaluationDashboard } from '../components/EvaluationDashboard';
import { Avatar } from '../components/Avatar';

export const EvaluationPage: React.FC = () => {
  const [appName, setAppName] = useState('');
  const [appVendor, setAppVendor] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');

  const handleEvaluate = async () => {
    if (!appName || !appVendor) {
      alert('Please fill in application name and vendor');
      return;
    }

    setIsLoading(true);
    try {
      const response = await evaluationApi.evaluateApplication({
        name: appName,
        vendor: appVendor,
        version: appVersion,
        description: appDescription,
        contextFiles: selectedFiles.map((f) => f.name),
      });

      setResult(response.data);
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Failed to evaluate application');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceResponse = (transcript: string) => {
    if (result?.applicationId) {
      handleVoiceCommand(transcript);
    }
  };

  const handleVoiceCommand = async (transcript: string) => {
    try {
      const response = await evaluationApi.voiceCommand(transcript, result.applicationId);
      setVoiceResponse(response.data.response);

      // Play audio response if available
      if (response.data.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${response.data.audioBase64}`);
        audio.play();
      }
    } catch (error) {
      console.error('Voice command error:', error);
    }
  };

  return (
    <div className="evaluation-page">
      <header className="page-header">
        <h1>No Objection Certificate Application Evaluator</h1>
        <p className="subtitle">AI-powered compliance and risk assessment</p>
      </header>

      <div className="main-content">
        {!result ? (
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="appName">Application Name *</label>
                <input
                  id="appName"
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="e.g., Network Monitoring Suite"
                />
              </div>

              <div className="form-group">
                <label htmlFor="appVendor">Vendor *</label>
                <input
                  id="appVendor"
                  type="text"
                  value={appVendor}
                  onChange={(e) => setAppVendor(e.target.value)}
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div className="form-group">
                <label htmlFor="appVersion">Version</label>
                <input
                  id="appVersion"
                  type="text"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  placeholder="e.g., 2.5.1"
                />
              </div>

              <div className="form-group">
                <label htmlFor="appDescription">Description</label>
                <textarea
                  id="appDescription"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Brief description of the application"
                  rows={4}
                />
              </div>
            </div>

            <div className="upload-section">
              <h3>Upload Context & Training Files</h3>
              <FileUpload onFilesSelected={setSelectedFiles} maxFiles={5} />
            </div>

            <button
              onClick={handleEvaluate}
              disabled={isLoading || !appName || !appVendor}
              className="evaluate-btn"
            >
              {isLoading ? (
                <>
                  <FiLoader className="spinner" size={20} />
                  Evaluating...
                </>
              ) : (
                <>
                  <FiSend size={20} />
                  Evaluate Application
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="result-section">
            <div className="avatar-voice-section">
              <Avatar isActive={voiceActive} />
              <VoiceAssistant
                onTranscript={handleVoiceResponse}
                onResponse={(response: string) => setVoiceResponse(response)}
                applicationId={result.applicationId}
              />
            </div>

            <EvaluationDashboard
              compliance={result.compliance}
              risk={result.risk}
              summary={result.summary}
            />

            {voiceResponse && (
              <div className="voice-response">
                <h4>Assistant Response:</h4>
                <p>{voiceResponse}</p>
              </div>
            )}

            <button onClick={() => setResult(null)} className="back-btn">
              ← Evaluate Another Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
