import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiFileText, FiUpload, FiChevronDown, FiChevronUp, FiFolder, FiFile, FiExternalLink, FiRefreshCw, FiClock, FiCheckCircle } from 'react-icons/fi';
import { applicationsApi } from '../services/applications.api';
import '../styles/document-management.css';

interface DocumentManagementPanelProps {
  applicationId: string;
  documents?: string[];
  companyName?: string;
}

interface DocumentVersion {
  version: number;
  filename: string;
  uploadedAt: Date;
  uploadedBy: string;
  changes?: string[];
}

interface DocumentHistory {
  [key: string]: DocumentVersion[];
}

// PVARA-specific document categories
const DOCUMENT_CATEGORIES: Record<string, { label: string; color: string; icon: string; description: string }> = {
  'pvara-regulations': { 
    label: 'PVARA Ordinance & Regulations', 
    color: '#dc2626', 
    icon: '📜',
    description: 'PVARA Act, NOC Regulations, AML Guidelines'
  },
  'noc-application-forms': { 
    label: 'NOC Application Forms', 
    color: '#2563eb', 
    icon: '📋',
    description: 'Form A1, A2, A3, A5 - Official application documents'
  },
  'applicant-corporate': { 
    label: 'Applicant Corporate Documents', 
    color: '#7c3aed', 
    icon: '🏢',
    description: 'Certificate of Incorporation, Board Resolutions, MOA'
  },
  'applicant-compliance': { 
    label: 'Applicant Compliance Policies', 
    color: '#059669', 
    icon: '✅',
    description: 'AML/KYC/KYB Policies, Sanctions, MLRO Procedures'
  },
  'applicant-financial': { 
    label: 'Applicant Financial Documents', 
    color: '#d97706', 
    icon: '💰',
    description: 'Financial Statements, Projections, Audit Reports'
  },
  'applicant-technical': { 
    label: 'Applicant Technical & Risk', 
    color: '#0891b2', 
    icon: '⚙️',
    description: 'Technical Architecture, Risk Assessment, BCP'
  },
  'applicant-personnel': { 
    label: 'Key Personnel Documents', 
    color: '#be185d', 
    icon: '👤',
    description: 'Director Forms, MLRO, CFO Documentation'
  },
  'regulatory-responses': { 
    label: 'Regulatory Correspondence', 
    color: '#4b5563', 
    icon: '📨',
    description: 'SECP, SBP Comments and Responses'
  }
};

// Enhanced categorization for PVARA documents
function categorizeDocument(filename: string): string {
  const lower = filename.toLowerCase();
  
  // PVARA Ordinance & Regulations
  if (lower.includes('ordinance') || lower.includes('pvara') || lower.includes('moit') || 
      (lower.includes('aml') && lower.includes('.pdf') && !lower.includes('policy'))) {
    return 'pvara-regulations';
  }
  
  // Regulatory Responses (SECP, SBP)
  if (lower.includes('secp') || lower.includes('sbp') || lower.includes('comments on')) {
    return 'regulatory-responses';
  }
  
  // NOC Application Forms (Form A1, A2, A3, A5)
  if (lower.includes('form a1') || lower.includes('form a2') || lower.includes('form a5') || 
      lower.includes('form_a') || lower.includes('application for no objection') ||
      lower.includes('outsourcing declaration')) {
    return 'noc-application-forms';
  }
  
  // Key Personnel Documents (Form A3, individual docs)
  if (lower.includes('form a3') || lower.includes('a3 forms') || 
      lower.includes('director') || lower.includes('cfo') || lower.includes('mlro') ||
      lower.match(/chen ling|jimmy su|kaiser|richard teng|wilson|heidi|ryan|sunny|ying pok/)) {
    return 'applicant-personnel';
  }
  
  // Corporate Documents
  if (lower.includes('certificate') || lower.includes('apostille') || lower.includes('incorporation') ||
      lower.includes('board_resolution') || lower.includes('moa') || lower.includes('rom') || 
      lower.includes('robo') || lower.includes('notarial') || lower.includes('constitutive')) {
    return 'applicant-corporate';
  }
  
  // Compliance Policies
  if (lower.includes('aml') || lower.includes('kyc') || lower.includes('kyb') || 
      lower.includes('compliance') || lower.includes('sanctions') || lower.includes('edd') ||
      lower.includes('transaction monitoring') || lower.includes('record keeping') ||
      lower.includes('training policy')) {
    return 'applicant-compliance';
  }
  
  // Financial Documents
  if (lower.includes('financial') || lower.includes('statement')) {
    return 'applicant-financial';
  }
  
  // Technical & Risk Documents
  if (lower.includes('technical') || lower.includes('outsourcing') || lower.includes('bcms') || 
      lower.includes('continuity') || lower.includes('risk') || lower.includes('bcp')) {
    return 'applicant-technical';
  }
  
  return 'noc-application-forms'; // Default to application forms
}

// Build folder tree from document paths
interface FolderNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: FolderNode[];
  category?: string;
}

function buildDocumentTree(documents: string[]): FolderNode {
  const root: FolderNode = { name: 'Documents', path: '', isFolder: true, children: [] };
  
  documents.forEach(docPath => {
    const parts = docPath.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const existing = current.children.find(c => c.name === part);
      
      if (existing) {
        current = existing;
      } else {
        const newNode: FolderNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          isFolder: !isLast,
          children: [],
          category: isLast ? categorizeDocument(part) : undefined
        };
        current.children.push(newNode);
        current = newNode;
      }
    });
  });
  
  return root;
}

export const DocumentManagementPanel: React.FC<DocumentManagementPanelProps> = ({ applicationId, documents: propDocuments, companyName }) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [realDocuments, setRealDocuments] = useState<string[]>(propDocuments || []);
  const [viewMode, setViewMode] = useState<'tree' | 'category'>('category');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [documentHistory, setDocumentHistory] = useState<DocumentHistory>({});
  const [docLibrary, setDocLibrary] = useState<any>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Log company name for debugging
  console.log('DocumentManagementPanel for:', companyName);

  // Fetch document library from API (OpenAI categorized documents)
  useEffect(() => {
    const fetchDocLibrary = async () => {
      try {
        setLoadingLibrary(true);
        const response = await fetch('http://localhost:3001/api/applications/documents/library');
        const data = await response.json();
        if (data.success) {
          setDocLibrary(data.documentLibrary);
        }
      } catch (err) {
        console.error('Error fetching document library:', err);
      } finally {
        setLoadingLibrary(false);
      }
    };
    fetchDocLibrary();
  }, []);

  // Fetch documents from API if not provided
  useEffect(() => {
    if (!propDocuments) {
      applicationsApi.getApplication(applicationId).then(result => {
        if (result.success && result.application.documents) {
          setRealDocuments(result.application.documents);
        }
      }).catch(console.error);
    }
  }, [applicationId, propDocuments]);

  // Initialize document history (mock data for demo)
  useEffect(() => {
    const history: DocumentHistory = {};
    realDocuments.forEach(doc => {
      history[doc] = [{
        version: 1,
        filename: doc.split('/').pop() || doc,
        uploadedAt: new Date('2025-12-09'),
        uploadedBy: 'Initial Submission'
      }];
    });
    setDocumentHistory(history);
  }, [realDocuments]);

  // Build document tree
  const documentTree = useMemo(() => buildDocumentTree(realDocuments), [realDocuments]);
  
  // Group documents by category
  const documentsByCategory = useMemo(() => {
    const groups: Record<string, string[]> = {};
    realDocuments.forEach(doc => {
      const filename = doc.split('/').pop() || doc;
      const category = categorizeDocument(filename);
      if (!groups[category]) groups[category] = [];
      groups[category].push(doc);
    });
    return groups;
  }, [realDocuments]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Open document (simulated - in real app would open actual file)
  const handleOpenDocument = (docPath: string) => {
    // In production, this would call backend to serve the file
    const filename = docPath.split('/').pop() || docPath;
    alert(`Opening document: ${filename}\n\nIn production, this would open the actual file from:\napplications/${applicationId.includes('001') ? 'APP-001-HTX-Global' : 'APP-002-Binance'}/documents/${docPath}`);
  };

  // Replace document
  const handleReplaceDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFile) return;
    
    // Track changes (in real app, would compare document contents)
    const changes = [
      'Document replaced with new version',
      `New file: ${file.name}`,
      `Size: ${(file.size / 1024).toFixed(1)} KB`,
      `Uploaded: ${new Date().toLocaleString()}`
    ];
    
    // Update history
    const currentHistory = documentHistory[selectedFile] || [];
    const newVersion: DocumentVersion = {
      version: currentHistory.length + 1,
      filename: file.name,
      uploadedAt: new Date(),
      uploadedBy: 'Current User',
      changes
    };
    
    setDocumentHistory(prev => ({
      ...prev,
      [selectedFile]: [...(prev[selectedFile] || []), newVersion]
    }));
    
    setShowReplaceModal(false);
    alert(`Document "${selectedFile.split('/').pop()}" replaced with "${file.name}"\n\nVersion ${newVersion.version} created with change trail.`);
  };

  const handleUploadDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // In a real app, you'd upload to server and refresh the list
    console.log('Uploading file:', file.name);

    setShowUploadForm(false);
  };

  return (
    <div className="document-management-panel">
      {/* Header */}
      <div className="doc-header card-glass">
        <div>
          <h2 className="text-lg font-bold">Document Repository</h2>
          <p className="text-xs text-secondary">{realDocuments.length} documents | AI-Categorized with OpenAI gpt-5.2</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <div className="view-toggle" style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '4px' }}>
            <button
              onClick={() => setViewMode('category')}
              className={`btn btn-sm ${viewMode === 'category' ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              By Category
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`btn btn-sm ${viewMode === 'tree' ? 'btn-primary' : ''}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              By Folder
            </button>
          </div>
          <button
            onClick={() => setShowUploadForm(true)}
            className="btn btn-primary btn-sm"
          >
            <FiUpload size={14} /> Upload
          </button>
        </div>
      </div>

      {/* OpenAI Categorized Documents Section */}
      {docLibrary && companyName && (
        <div className="ai-categorized-docs card-glass" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-md)', borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem' }}>✨ OpenAI Categorized Documents</h3>
            <p style={{ fontSize: '0.8rem', color: '#999' }}>Documents analyzed and categorized by OpenAI gpt-5.2 (with full content analysis)</p>
          </div>
          
          {loadingLibrary ? (
            <p style={{ fontSize: '0.8rem', color: '#999' }}>Loading AI categories...</p>
          ) : docLibrary[companyName] ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-sm)' }}>
              {Object.entries(docLibrary[companyName]).map(([pvaraCategory, docs]: [string, any]) => {
                const count = Array.isArray(docs) ? docs.length : 0;
                if (count === 0) return null;
                
                const categoryLabels: Record<string, string> = {
                  'ordinance': '📜 Ordinance',
                  'regulations': '📋 Regulations',
                  'application-form': '📝 Application Forms',
                  'submitted-application': '✅ Submitted Applications',
                  'supporting-document': '📎 Supporting Documents'
                };
                
                return (
                  <div key={pvaraCategory} style={{ padding: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                      {categoryLabels[pvaraCategory] || pvaraCategory}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#4ade80' }}>
                      {count} document{count !== 1 ? 's' : ''}
                    </div>
                    {Array.isArray(docs) && docs.slice(0, 2).map((doc: any, idx: number) => (
                      <div key={idx} style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        • {doc.name}
                      </div>
                    ))}
                    {count > 2 && <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>+ {count - 2} more</div>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: '#999' }}>No AI categorized documents found for this applicant</p>
          )}
        </div>
      )}
      {showUploadForm && (
        <div className="upload-form card-glass">
          <input
            type="file"
            onChange={handleUploadDocument}
            className="text-sm"
            accept=".pdf,.docx,.xlsx,.jpg,.png"
          />
          <button onClick={() => setShowUploadForm(false)} className="btn btn-secondary btn-sm">
            Cancel
          </button>
        </div>
      )}

      <div className="doc-content" style={{ display: 'flex', gap: 'var(--space-lg)' }}>
        {/* Organized Documents List */}
        <div className="doc-list-section" style={{ flex: 1, minWidth: 0 }}>
          {realDocuments.length === 0 ? (
            <div className="empty-state card-glass">
              <FiFileText size={24} opacity={0.3} />
              <p className="text-xs text-secondary">No documents found in application folder</p>
            </div>
          ) : viewMode === 'category' ? (
            /* Category View */
            <div className="documents-categories" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {Object.entries(DOCUMENT_CATEGORIES).map(([catKey, catInfo]) => {
                const docs = documentsByCategory[catKey] || [];
                if (docs.length === 0) return null;
                
                const isExpanded = expandedFolders.has(catKey);
                
                return (
                  <div key={catKey} className="category-section card-glass" style={{ padding: 'var(--space-md)', borderLeft: `4px solid ${catInfo.color}` }}>
                    <div 
                      className="category-header" 
                      onClick={() => toggleFolder(catKey)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 'var(--space-sm)', 
                        cursor: 'pointer',
                        marginBottom: isExpanded ? 'var(--space-sm)' : 0
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{catInfo.icon}</span>
                      <span style={{ fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>{catInfo.label}</span>
                      <span className="badge" style={{ background: catInfo.color, color: 'white', fontSize: '0.7rem' }}>
                        {docs.length}
                      </span>
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                    
                    {isExpanded && (
                      <div className="category-files" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'var(--space-sm)' }}>
                        {docs.map((docPath, idx) => {
                          const fileName = docPath.split('/').pop() || docPath;
                          const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                          const isSelected = selectedFile === docPath;
                          
                          return (
                            <div 
                              key={idx}
                              onClick={() => setSelectedFile(docPath)}
                              className={`file-item ${isSelected ? 'selected' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                padding: '8px 12px',
                                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent'
                              }}
                            >
                              <FiFile size={14} style={{ color: catInfo.color, flexShrink: 0 }} />
                              <span style={{ 
                                fontSize: '0.8rem', 
                                color: 'var(--text-primary)', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap',
                                flex: 1
                              }}>
                                {fileName}
                              </span>
                              <span className="badge" style={{ 
                                fontSize: '0.65rem', 
                                padding: '2px 6px',
                                background: fileExt === 'pdf' ? '#ef4444' : fileExt === 'docx' ? '#3b82f6' : fileExt === 'xlsx' ? '#10b981' : '#6b7280',
                                color: 'white',
                                borderRadius: '4px',
                                textTransform: 'uppercase'
                              }}>
                                {fileExt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Tree View */
            <div className="documents-tree card-glass" style={{ padding: 'var(--space-md)' }}>
              {renderFolderTree(documentTree.children, 0)}
            </div>
          )}
        </div>

        {/* File Details Panel */}
        {selectedFile && (
          <div className="doc-details-section" style={{ width: '350px', flexShrink: 0 }}>
            <div className="doc-section card-glass" style={{ padding: 'var(--space-md)' }}>
              <h3 className="text-sm font-semibold" style={{ marginBottom: 'var(--space-md)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 'var(--space-sm)' }}>
                File Details
              </h3>
              <div className="doc-info-details" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div className="info-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>File Name</span>
                  <span className="value" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                    {selectedFile.split('/').pop()}
                  </span>
                </div>
                {selectedFile.includes('/') && (
                  <div className="info-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Path</span>
                    <span className="value" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedFile}</span>
                  </div>
                )}
                <div className="info-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Category</span>
                  <span className="value" style={{ fontSize: '0.85rem' }}>
                    {DOCUMENT_CATEGORIES[categorizeDocument(selectedFile)]?.label || 'Other'}
                  </span>
                </div>
                <div className="info-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Format</span>
                  <span className="badge" style={{ 
                    fontSize: '0.7rem',
                    padding: '4px 8px',
                    background: selectedFile.endsWith('.pdf') ? '#ef4444' : selectedFile.endsWith('.docx') ? '#3b82f6' : '#10b981',
                    color: 'white',
                    borderRadius: '4px',
                    width: 'fit-content',
                    textTransform: 'uppercase'
                  }}>
                    {selectedFile.split('.').pop()}
                  </span>
                </div>

                {/* Version Info */}
                <div className="info-row" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'var(--space-sm)' }}>
                  <span className="label" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Version</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge" style={{ background: '#10b981', color: 'white', fontSize: '0.7rem', padding: '2px 8px' }}>
                      v{documentHistory[selectedFile]?.length || 1}
                    </span>
                    {(documentHistory[selectedFile]?.length || 1) > 1 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        <FiClock size={12} style={{ marginRight: '4px' }} />
                        {documentHistory[selectedFile].length} versions
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                  <button
                    onClick={() => handleOpenDocument(selectedFile)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <FiExternalLink size={14} /> Open
                  </button>
                  <button
                    onClick={() => setShowReplaceModal(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <FiRefreshCw size={14} /> Replace
                  </button>
                </div>
              </div>
            </div>

            {/* Version History Card */}
            {documentHistory[selectedFile] && documentHistory[selectedFile].length > 1 && (
              <div className="doc-section card-glass" style={{ padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                <h4 className="text-xs font-semibold" style={{ marginBottom: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiClock size={14} /> Change Trail
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflow: 'auto' }}>
                  {[...documentHistory[selectedFile]].reverse().map((ver, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '8px', 
                        background: idx === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '6px',
                        borderLeft: idx === 0 ? '3px solid #3b82f6' : '3px solid transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Version {ver.version}</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                          {ver.uploadedAt.toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        By: {ver.uploadedBy}
                      </p>
                      {ver.changes && ver.changes.length > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                          {ver.changes.map((change, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginTop: '2px' }}>
                              <FiCheckCircle size={10} style={{ color: '#10b981', marginTop: '2px' }} />
                              <span>{change}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Replace Document Modal */}
      {showReplaceModal && selectedFile && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowReplaceModal(false)}
        >
          <div 
            className="card-glass"
            style={{ 
              padding: 'var(--space-xl)', 
              maxWidth: '500px', 
              width: '90%',
              background: 'var(--bg-secondary)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiRefreshCw /> Replace Document
            </h3>
            <div style={{ 
              padding: 'var(--space-md)', 
              background: 'rgba(251, 191, 36, 0.1)', 
              borderRadius: '8px',
              borderLeft: '4px solid #fbbf24',
              marginBottom: 'var(--space-md)'
            }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                Replacing: {selectedFile.split('/').pop()}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Current version: v{documentHistory[selectedFile]?.length || 1}
              </p>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              Upload a new version of this document. The previous version will be preserved in the change trail.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleReplaceDocument}
              accept=".pdf,.docx,.xlsx"
              style={{ display: 'none' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button 
                className="btn btn-primary"
                onClick={() => fileInputRef.current?.click()}
                style={{ flex: 1 }}
              >
                <FiUpload size={16} /> Select New File
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowReplaceModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  // Helper function to render folder tree recursively
  function renderFolderTree(nodes: FolderNode[], depth: number): React.ReactNode {
    return nodes.map((node, idx) => {
      if (node.isFolder) {
        const isExpanded = expandedFolders.has(node.path);
        return (
          <div key={idx} style={{ marginLeft: depth * 16 }}>
            <div 
              onClick={() => toggleFolder(node.path)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 8px',
                cursor: 'pointer',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.05)'
              }}
            >
              {isExpanded ? <FiFolder size={14} style={{ color: '#fbbf24' }} /> : <FiFolder size={14} style={{ color: '#fbbf24' }} />}
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{node.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                {node.children.length}
              </span>
            </div>
            {isExpanded && renderFolderTree(node.children, depth + 1)}
          </div>
        );
      } else {
        const catInfo = DOCUMENT_CATEGORIES[node.category || 'other'];
        const isSelected = selectedFile === node.path;
        const fileExt = node.name.split('.').pop()?.toLowerCase() || '';
        
        return (
          <div 
            key={idx}
            onClick={() => setSelectedFile(node.path)}
            style={{ 
              marginLeft: depth * 16,
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 8px',
              cursor: 'pointer',
              borderRadius: '4px',
              background: isSelected ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent'
            }}
          >
            <FiFile size={14} style={{ color: catInfo.color }} />
            <span style={{ fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.name}
            </span>
            <span style={{ 
              fontSize: '0.6rem', 
              padding: '2px 5px',
              background: fileExt === 'pdf' ? '#ef4444' : fileExt === 'docx' ? '#3b82f6' : '#10b981',
              color: 'white',
              borderRadius: '3px',
              textTransform: 'uppercase'
            }}>
              {fileExt}
            </span>
          </div>
        );
      }
    });
  }
};
