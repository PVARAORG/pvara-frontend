import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiAlertCircle, FiChevronDown, FiCalendar } from 'react-icons/fi';
import { jsPDF } from 'jspdf';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ApplicationFolder, ComprehensiveEvaluation, applicationsApi } from '../services/applications.api';
import { NOCSignatory } from '../types';
import '../styles/noc-creation.css';
import '../styles/quill-editor.css';

interface NOCCreationPanelProps {
  applications: ApplicationFolder[];
  selectedApplication?: ApplicationFolder;
  onSelectApplication: (app: ApplicationFolder) => void;
  evaluation?: ComprehensiveEvaluation;
  onBack: () => void;
  onEvaluate?: (appId: string) => void;
}

export const NOCCreationPanel: React.FC<NOCCreationPanelProps> = ({ 
  applications,
  selectedApplication: initialApplication, 
  onSelectApplication,
  evaluation: initialEvaluation, 
  onBack,
  onEvaluate
}) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationFolder | undefined>(initialApplication);
  const [evaluation, setEvaluation] = useState<ComprehensiveEvaluation | undefined>(initialEvaluation);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState(`PVARA-NOC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  
  // Auto-populate conditions from evaluation
  const [conditions, setConditions] = useState<string[]>(
    evaluation?.conditions && evaluation.conditions.length > 0 
      ? evaluation.conditions 
      : []
  );
  
  const [signatories, setSignatories] = useState<(NOCSignatory & { isAdding?: boolean, signatureImage?: string, signatureDate?: string })[]>([
    {
      signatoryId: 'sig_1',
      name: '',
      title: '',
      status: 'pending',
    },
  ]);
  const [sealImage, setSealImage] = useState<string>('');
  const [nocSubject, setNocSubject] = useState<string>('');
  const [nocAdditionalText, setNocAdditionalText] = useState<string>('');
  const [applicantAddress, setApplicantAddress] = useState<string>('');
  const [fontFamily, setFontFamily] = useState<string>('times');
  const pvaraLogoUrl = '/pvara-logo.png';

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const validatePlainBackground = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(true); // Allow if canvas context fails
          const w = 200, h = 100;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          const data = ctx.getImageData(0, 0, w, h).data;
          let meanR = 0, meanG = 0, meanB = 0;
          const pixels = w * h;
          for (let i = 0; i < data.length; i += 4) {
            meanR += data[i]; meanG += data[i+1]; meanB += data[i+2];
          }
          meanR /= pixels; meanG /= pixels; meanB /= pixels;
          let variance = 0;
          for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - meanR;
            const dg = data[i+1] - meanG;
            const db = data[i+2] - meanB;
            variance += dr*dr + dg*dg + db*db;
          }
          variance /= pixels;
          // More lenient threshold - allow variance up to 3000
          const isValid = variance < 3000;
          console.log(`Background validation: variance=${variance.toFixed(0)}, valid=${isValid}`);
          resolve(isValid);
        } catch (err) {
          console.error('Error validating background:', err);
          resolve(true); // Allow if validation fails
        }
      };
      img.onerror = () => {
        console.warn('Failed to load image for validation');
        resolve(true); // Allow if image fails to load
      };
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      
      // Clean up object URL after a short delay to ensure image loads
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    });
  };

  // Handle application selection change
  const handleSelectApplication = (app: ApplicationFolder) => {
    setSelectedApp(app);
    onSelectApplication(app);
    setEvaluation(undefined);
    setConditions([]);
    // Generate new license number for new application
    setLicenseNumber(`PVARA-NOC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`);
  };

  // Load evaluation if not provided
  useEffect(() => {
    const loadEval = async () => {
      if (selectedApp && !evaluation && !loadingEvaluation) {
        try {
          setLoadingEvaluation(true);
          const result = await applicationsApi.evaluateApplication(selectedApp.id);
          setEvaluation(result.evaluation);
          // Update conditions with evaluation data
          if (result.evaluation.conditions && result.evaluation.conditions.length > 0) {
            setConditions(result.evaluation.conditions);
          }
        } catch (err) {
          console.error('Error loading evaluation:', err);
        } finally {
          setLoadingEvaluation(false);
        }
      }
    };
    loadEval();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp]);

  const loadEvaluation = async () => {
    if (!selectedApp) return;
    
    if (onEvaluate) {
      onEvaluate(selectedApp.id);
    }
    
    try {
      setLoadingEvaluation(true);
      const result = await applicationsApi.evaluateApplication(selectedApp.id);
      setEvaluation(result.evaluation);
      // Update conditions with evaluation data
      if (result.evaluation.conditions && result.evaluation.conditions.length > 0) {
        setConditions(result.evaluation.conditions);
      }
    } catch (err) {
      console.error('Error loading evaluation:', err);
    } finally {
      setLoadingEvaluation(false);
    }
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleUpdateSignatory = (index: number, field: string, value: string) => {
    const updated = [...signatories];
    updated[index] = { ...updated[index], [field]: value };
    setSignatories(updated);
  };

  const handleRemoveSignatory = (index: number) => {
    setSignatories(signatories.filter((_, i) => i !== index));
  };

  const handleGenerateNOC = async () => {
    if (!selectedApp) {
      alert('Please select an application first');
      return;
    }
    
    console.log('🎯 Starting NOC generation...');
    console.log('📋 Signatories:', signatories.map((s, i) => ({ 
      index: i, 
      name: s.name, 
      title: s.title, 
      hasSignature: !!s.signatureImage,
      signatureSize: s.signatureImage ? `${Math.round(s.signatureImage.length / 1024)}KB` : 'none'
    })));
    console.log('🔐 Seal image:', sealImage ? `${Math.round(sealImage.length / 1024)}KB` : 'none');
    
    // Generate NOC document as PDF - Professional letterhead format
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 50;
    const rightMargin = 50;
    const topMargin = 40;
    const lineHeight = 12;
    let y = topMargin;

    // Load and cache logo for reuse on multiple pages
    let logoImg: any = null;
    let logoWidth = 0;
    let logoHeight = 0;
    
    try {
      const img = new Image();
      img.src = pvaraLogoUrl;
      await new Promise((res) => { img.onload = res; img.onerror = res; });
      
      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;
      const maxLogoWidth = 140;
      
      logoWidth = maxLogoWidth;
      logoHeight = (naturalHeight / naturalWidth) * logoWidth;
      
      if (logoHeight > 65) {
        logoHeight = 65;
        logoWidth = (naturalWidth / naturalHeight) * logoHeight;
      }
      
      logoImg = img;
    } catch {}

    // Helper function to add logo on RIGHT corner
    const addLogo = (yPos: number) => {
      if (logoImg) {
        try {
          // Position logo on RIGHT corner
          const logoX = pageWidth - rightMargin - logoWidth;
          doc.addImage(logoImg, 'PNG', logoX, yPos, logoWidth, logoHeight);
        } catch {}
      }
    };

    // Helper function to add new page if needed with logo
    const checkNewPage = (requiredSpace: number = 100) => {
      if (y + requiredSpace > pageHeight - 70) {
        doc.addPage();
        y = topMargin;
        addLogo(topMargin); // Add logo to new page
        y += logoHeight + 20;
        return true;
      }
      return false;
    };

    // Add logo to first page on RIGHT corner
    addLogo(topMargin);
    y += logoHeight + 20;
    
    // Reference Number (LEFT) and Date (RIGHT) on same line
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(11);
    
    const refText = `Ref: ${licenseNumber}`;
    const dateText = `Date: ${new Date(validFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}`;
    
    doc.text(refText, leftMargin, y);
    doc.text(dateText, pageWidth - rightMargin, y, { align: 'right' });
    y += lineHeight + 20;

    // Applicant Address (NO heading like "To,")
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(11);
    
    const companyName = selectedApp.applicationData.companyName || 'N/A';
    doc.text(companyName, leftMargin, y);
    y += lineHeight + 2;
    
    const address = applicantAddress || 
                    selectedApp.applicationData.address || 
                    selectedApp.applicationData.registeredAddress || 
                    selectedApp.applicationData.businessAddress ||
                    'Address not provided';
    const addressLines = doc.splitTextToSize(address, pageWidth - leftMargin - rightMargin - 20);
    addressLines.forEach((line: string) => {
      doc.text(line, leftMargin, y);
      y += lineHeight;
    });
    y += 20;

    // Subject with better spacing
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    const subjectLabel = 'Subject:';
    const subjectLabelWidth = doc.getTextWidth(subjectLabel);
    doc.text(subjectLabel, leftMargin, y);
    
    doc.setFont(fontFamily, 'normal');
    const subjectText = nocSubject || 'No Objection Certificate';
    const subjectLines = doc.splitTextToSize(subjectText, pageWidth - leftMargin - rightMargin - subjectLabelWidth - 10);
    doc.text(subjectLines, leftMargin + subjectLabelWidth + 8, y);
    y += Math.max(lineHeight, subjectLines.length * lineHeight) + 20;

    // Salutation
    doc.setFont(fontFamily, 'normal');
    doc.text('Dear Sir/Madam,', leftMargin, y);
    y += lineHeight + 15;

    // Main Body Text with HTML formatting support
    if (nocAdditionalText && nocAdditionalText.trim()) {
      checkNewPage(80);
      
      // Parse HTML content
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(nocAdditionalText, 'text/html');
      
      // Process HTML elements recursively
      const processNode = (node: Node, currentIndent: number = 0): void => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            const lines = doc.splitTextToSize(text, pageWidth - leftMargin - rightMargin - currentIndent);
            lines.forEach((line: string) => {
              checkNewPage(lineHeight + 8);
              doc.text(line, leftMargin + currentIndent, y);
              y += lineHeight + 1;
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();
          
          // Handle different HTML tags
          if (tagName === 'p') {
            doc.setFont(fontFamily, 'normal');
            doc.setFontSize(11);
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
            y += 8; // Paragraph spacing
          } else if (tagName === 'strong' || tagName === 'b') {
            doc.setFont(fontFamily, 'bold');
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
            doc.setFont(fontFamily, 'normal');
          } else if (tagName === 'em' || tagName === 'i') {
            doc.setFont(fontFamily, 'italic');
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
            doc.setFont(fontFamily, 'normal');
          } else if (tagName === 'u') {
            // Underline not directly supported, just render text
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
          } else if (tagName === 'ul') {
            // Unordered list
            Array.from(element.children).forEach((li) => {
              checkNewPage(lineHeight + 8);
              doc.text('•', leftMargin + currentIndent, y);
              Array.from(li.childNodes).forEach(child => processNode(child, currentIndent + 15));
            });
            y += 5;
          } else if (tagName === 'ol') {
            // Ordered list
            Array.from(element.children).forEach((li, index) => {
              checkNewPage(lineHeight + 8);
              doc.text(`${index + 1}.`, leftMargin + currentIndent, y);
              Array.from(li.childNodes).forEach(child => processNode(child, currentIndent + 20));
            });
            y += 5;
          } else if (tagName === 'li') {
            // List item (handled by ul/ol)
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
          } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
            doc.setFont(fontFamily, 'bold');
            const size = tagName === 'h1' ? 14 : tagName === 'h2' ? 13 : 12;
            doc.setFontSize(size);
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
            doc.setFont(fontFamily, 'normal');
            doc.setFontSize(11);
            y += 10;
          } else if (tagName === 'br') {
            y += lineHeight;
          } else {
            // Default: process children
            Array.from(element.childNodes).forEach(child => processNode(child, currentIndent));
          }
        }
      };
      
      // Process the body content
      Array.from(htmlDoc.body.childNodes).forEach(node => processNode(node, 0));
      y += 10;
    } else {
      // Default body text if none provided
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(11);
      const defaultBody = `This is to certify that the Pakistan Virtual Assets Regulatory Authority (PVARA) has no objection to the operations and activities of ${companyName} as per the submitted application and documentation.\n\nThis certificate is issued in accordance with the applicable regulations and laws governing virtual asset service providers in Pakistan.`;
      const bodyLines = doc.splitTextToSize(defaultBody, pageWidth - leftMargin - rightMargin);
      bodyLines.forEach((line: string) => {
        checkNewPage(lineHeight + 8);
        doc.text(line, leftMargin, y);
        y += lineHeight + 1;
      });
      y += 15;
    }

    // Validity period
    checkNewPage(60);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(11);
    const validityText = `This certificate is valid from ${new Date(validFrom).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')} to ${new Date(validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}.`;
    const validityLines = doc.splitTextToSize(validityText, pageWidth - leftMargin - rightMargin);
    validityLines.forEach((line: string) => {
      doc.text(line, leftMargin, y);
      y += lineHeight + 1;
    });
    y += 20;

    // Closing
    doc.text('Yours faithfully,', leftMargin, y);
    y += 35; // Reduced from 50

    // Signatory Section with less space
    checkNewPage(110);
    
    for (const s of signatories) {
      checkNewPage(85);
      
      // Add signature image if available
      if (s.signatureImage && s.signatureImage.startsWith('data:')) {
        try {
          doc.addImage(s.signatureImage, 'JPEG', leftMargin, y - 30, 65, 30);
        } catch (err) {
          console.error('❌ Error adding signature image:', err);
        }
      }
      
      // Signature line
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(10);
      doc.line(leftMargin, y, leftMargin + 110, y);
      y += lineHeight;
      
      // Name and Title
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(11);
      doc.text(s.name || 'Authorized Signatory', leftMargin, y);
      y += lineHeight;
      doc.setFont(fontFamily, 'italic');
      doc.setFontSize(10);
      doc.text(s.title || 'Designation', leftMargin, y);
      y += lineHeight + 3;
      
      const signatureDate = s.signatureDate ? new Date(s.signatureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      doc.setFont(fontFamily, 'normal');
      doc.text(`Date: ${signatureDate}`, leftMargin, y);
      y += 25; // Reduced from 35
    }

    // Official Seal positioned on right side
    if (sealImage && sealImage.startsWith('data:')) {
      try {
        const sealSize = 90;
        const sealX = pageWidth - rightMargin - sealSize - 10;
        const sealY = y - 140; // Adjusted for less signature space
        doc.addImage(sealImage, 'JPEG', sealX, sealY, sealSize, sealSize);
        console.log('✅ Seal added successfully');
      } catch (err) {
        console.error('❌ Error adding seal image:', err);
      }
    }

    // Footer with horizontal line
    y = pageHeight - 55;
    doc.setDrawColor(0);
    doc.setLineWidth(1);
    doc.line(leftMargin, y, pageWidth - rightMargin, y);
    y += 12;
    
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    doc.text('Pakistan Virtual Assets Regulatory Authority (PVARA)', pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.text('Evacuee Trust Complex, Agha Khan Road, F-5/1, Islamabad, Pakistan', pageWidth / 2, y, { align: 'center' });
    y += 10;
    doc.text('Tel: +92-51-1234567 | Email: info@pvara.gov.pk | Web: www.pvara.gov.pk', pageWidth / 2, y, { align: 'center' });

    doc.save(`${licenseNumber}-NOC.pdf`);
  };

  return (
    <div className="noc-creation-panel" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-xl)' }}>
      <div className="noc-header card-glass">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.35rem' }}>
            Create Notice of Compliance (NOC)
          </h2>
          <p className="text-xs" style={{ color: 'rgba(147, 197, 253, 0.85)', marginTop: '0.25rem', fontWeight: '500' }}>
            PVARA (Pakistan Virtual Assets Regulatory Authority)
          </p>
          <p className="text-xs text-secondary" style={{ marginTop: '0.15rem' }}>
            {selectedApp ? selectedApp.applicationData.companyName : 'Select an application to begin'}
          </p>
        </div>
        <button 
          onClick={onBack} 
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: '600'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Application Selector */}
      <div className="noc-section card-glass" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 className="text-sm font-semibold mb-lg" style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.05rem' }}>
          Select Application
        </h3>
        <div className="form-group">
          <label className="text-xs font-medium" style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.85rem' }}>
            Choose applicant to generate NOC for:
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedApp?.id || ''}
              onChange={(e) => {
                const app = applications.find(a => a.id === e.target.value);
                if (app) handleSelectApplication(app);
              }}
              className="text-sm"
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '0.95rem',
                appearance: 'none',
                paddingRight: '2.5rem',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select an application --</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.applicationData?.companyName || app.id} - {app.status.toUpperCase()} 
                  {app.documents ? ` (${app.documents.length} docs)` : ''}
                </option>
              ))}
            </select>
            <FiChevronDown 
              style={{ 
                position: 'absolute', 
                right: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--text-secondary)'
              }} 
            />
          </div>
        </div>

        {selectedApp && (
          <div style={{ 
            marginTop: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            gap: 'var(--space-md)',
            alignItems: 'center'
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                {selectedApp.applicationData?.companyName}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                ID: {selectedApp.id} • {selectedApp.documents?.length || 0} documents • Status: {selectedApp.status}
              </div>
            </div>
          </div>
        )}
      </div>

      {!selectedApp ? (
        <div style={{ 
          padding: 'var(--space-2xl)', 
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.2)'
        }}>
          <FiAlertCircle size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.5rem' }}>
            No Application Selected
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Please select an application from the dropdown above to create a Notice of Compliance
          </p>
        </div>
      ) : (
        <>
      {/* Evaluation Summary */}
      {loadingEvaluation ? (
        <div className="noc-section card-glass" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: 'var(--text-secondary)' }}>Loading AI evaluation data...</p>
          </div>
        </div>
      ) : evaluation ? (
        <div className="noc-section card-glass" style={{ marginBottom: 'var(--space-lg)' }}>
          <h3 className="text-sm font-semibold mb-lg">Evaluation Summary</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: 'var(--space-md)' 
          }}>
            <div style={{ 
              padding: 'var(--space-md)', 
              background: 'rgba(59, 130, 246, 0.1)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Overall Score</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'rgb(59, 130, 246)' }}>
                {evaluation.overallScore}/100
              </div>
            </div>
            <div style={{ 
              padding: 'var(--space-md)', 
              background: evaluation.riskLevel === 'low' ? 'rgba(16, 185, 129, 0.1)' : 
                         evaluation.riskLevel === 'medium' ? 'rgba(251, 191, 36, 0.1)' :
                         'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${evaluation.riskLevel === 'low' ? 'rgba(16, 185, 129, 0.3)' : 
                                   evaluation.riskLevel === 'medium' ? 'rgba(251, 191, 36, 0.3)' :
                                   'rgba(239, 68, 68, 0.3)'}`
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Risk Level</div>
              <div style={{ 
                fontSize: '0.9rem', 
                fontWeight: '700', 
                textTransform: 'uppercase',
                color: evaluation.riskLevel === 'low' ? 'rgb(16, 185, 129)' : 
                       evaluation.riskLevel === 'medium' ? 'rgb(251, 191, 36)' :
                       'rgb(239, 68, 68)'
              }}>
                {evaluation.riskLevel}
              </div>
            </div>
            <div style={{ 
              padding: 'var(--space-md)', 
              background: evaluation.recommendation === 'approve' ? 'rgba(16, 185, 129, 0.1)' : 
                         evaluation.recommendation === 'conditional-approval' ? 'rgba(59, 130, 246, 0.1)' :
                         'rgba(239, 68, 68, 0.1)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${evaluation.recommendation === 'approve' ? 'rgba(16, 185, 129, 0.3)' : 
                                   evaluation.recommendation === 'conditional-approval' ? 'rgba(59, 130, 246, 0.3)' :
                                   'rgba(239, 68, 68, 0.3)'}`
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Recommendation</div>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '700',
                color: evaluation.recommendation === 'approve' ? 'rgb(16, 185, 129)' : 
                       evaluation.recommendation === 'conditional-approval' ? 'rgb(59, 130, 246)' :
                       'rgb(239, 68, 68)'
              }}>
                {evaluation.recommendation.replace('-', ' ').toUpperCase()}
              </div>
            </div>
            <div style={{ 
              padding: 'var(--space-md)', 
              background: 'rgba(168, 85, 247, 0.1)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Model Used</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'rgb(168, 85, 247)' }}>
                {(evaluation as any).modelUsed || 'gpt-5.2'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="noc-section card-glass" style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ 
            padding: 'var(--space-lg)', 
            textAlign: 'center',
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}>
            <FiAlertCircle size={32} style={{ color: 'rgb(251, 191, 36)', marginBottom: '8px' }} />
            <p style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No evaluation data available</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              An AI evaluation is recommended before generating NOC
            </p>
            <button 
              onClick={loadEvaluation}
              className="btn btn-primary btn-sm"
              style={{ margin: '0 auto' }}
            >
              Run AI Evaluation
            </button>
          </div>
        </div>
      )}

      <div className="noc-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Basic Information */}
        <div className="noc-section card-glass">
          <h3 className="text-sm font-semibold mb-lg">Basic Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="text-xs font-medium">License Number</label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="form-group">
              <label className="text-xs font-medium">Valid From</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="text-sm date-input"
                />
                <FiCalendar className="date-icon" />
              </div>
            </div>
            <div className="form-group">
              <label className="text-xs font-medium">Valid Until</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="text-sm date-input"
                />
                <FiCalendar className="date-icon" />
              </div>
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="noc-section card-glass">
          <div className="mb-lg">
            <h3 className="text-sm font-semibold" style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.05rem' }}>
              Compliance Conditions
            </h3>
            {evaluation?.conditions && evaluation.conditions.length > 0 && (
              <p style={{ 
                fontSize: '0.8rem', 
                color: 'rgba(147, 197, 253, 0.9)', 
                marginTop: '4px',
                fontWeight: '500'
              }}>
                ✨ Auto-populated from AI evaluation ({evaluation.conditions.length} conditions)
              </p>
            )}
          </div>

          {conditions.length > 0 ? (
            <div className="conditions-list">
              {conditions.map((condition, index) => (
                <div key={index} className="condition-item">
                  <span className="condition-number">{index + 1}</span>
                  <span className="condition-text">{condition}</span>
                  <button
                    onClick={() => handleRemoveCondition(index)}
                    className="btn-remove"
                    title="Remove condition"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              padding: 'var(--space-lg)', 
              textAlign: 'center', 
              color: 'rgba(255, 255, 255, 0.7)',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed rgba(255, 255, 255, 0.2)'
            }}>
              No conditions specified. Add conditions using the input above.
            </div>
          )}
        </div>

        {/* Signatories */}
        <div className="noc-section card-glass">
          <div className="mb-lg">
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.05rem' }}>Authorized Signatories</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Upload a clear signature image: dark ink on plain white background, well-cropped, no shadows.
            </p>
          </div>

          <div className="signatories-list">
            {signatories.map((sig, index) => (
              <div key={sig.signatoryId} className="signatory-card">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="text-xs font-medium">Name</label>
                    <input
                      type="text"
                      value={sig.name}
                      onChange={(e) => handleUpdateSignatory(index, 'name', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-medium">Title/Position</label>
                    <input
                      type="text"
                      value={sig.title}
                      onChange={(e) => handleUpdateSignatory(index, 'title', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-medium">Signature Image</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        try {
                          console.log('Processing signature file:', file.name, file.type, file.size);
                          const base64 = await convertFileToBase64(file);
                          console.log('Signature uploaded:', { index, fileName: file.name, base64Length: base64.length });
                          handleUpdateSignatory(index, 'signatureImage', base64);
                        } catch (err) {
                          console.error('Error uploading signature:', err);
                          window.alert('Failed to upload signature image. Please try again.');
                        }
                      }}
                    />
                    {sig.signatureImage && (
                      <div style={{ fontSize: '0.75rem', color: 'rgb(34, 197, 94)', marginTop: '4px', fontWeight: '500' }}>
                        ✓ Signature uploaded ({Math.round(sig.signatureImage.length / 1024)}KB)
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-medium">Signature Date</label>
                    <div className="date-input-wrapper">
                      <input
                        type="date"
                        value={sig.signatureDate || ''}
                        onChange={(e) => handleUpdateSignatory(index, 'signatureDate', e.target.value)}
                        className="text-sm date-input"
                      />
                      <FiCalendar className="date-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-medium">Status</label>
                    <select 
                      value={sig.status}
                      onChange={(e) => handleUpdateSignatory(index, 'status', e.target.value)}
                      className="text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="signed">Signed</option>
                      <option value="declined">Declined</option>
                    </select>
                  </div>
                </div>
                {sig.isAdding && (
                  <button
                    onClick={() => handleRemoveSignatory(index)}
                    className="btn-remove-signatory"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Subject and Additional Notes */}
        <div className="noc-section card-glass">
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.05rem' }}>Document Details</h3>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs font-medium">Applicant Address</label>
              <textarea 
                value={applicantAddress} 
                onChange={(e) => setApplicantAddress(e.target.value)} 
                className="text-sm" 
                rows={2}
                placeholder="Enter the complete address of the applicant"
              />
            </div>
            <div className="form-group">
              <label className="text-xs font-medium">Subject</label>
              <input type="text" value={nocSubject} onChange={(e) => setNocSubject(e.target.value)} className="text-sm" />
            </div>
            <div className="form-group">
              <label className="text-xs font-medium">PDF Font Family</label>
              <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="text-sm">
                <option value="times">Times New Roman (Professional)</option>
                <option value="helvetica">Helvetica (Modern)</option>
                <option value="courier">Courier (Typewriter)</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs font-medium">Additional Text (notes)</label>
              <div style={{ backgroundColor: 'white', borderRadius: '4px', minHeight: '200px', resize: 'vertical', overflow: 'auto' }}>
                <ReactQuill 
                  theme="snow"
                  value={nocAdditionalText} 
                  onChange={setNocAdditionalText}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['clean']
                    ]
                  }}
                  style={{ height: '180px', marginBottom: '40px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Embossed / Raised 3D Seal Upload */}
        <div className="noc-section card-glass">
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(255, 255, 255, 0.95)', fontSize: '1.05rem' }}>Embossed / Raised 3D Seal</h3>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Upload a high-contrast seal image on plain background (PNG/JPEG). This will be placed on the document.
          </p>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              try {
                console.log('Processing seal file:', file.name, file.type, file.size);
                const base64 = await convertFileToBase64(file);
                console.log('Seal uploaded:', { fileName: file.name, base64Length: base64.length });
                setSealImage(base64);
              } catch (err) {
                console.error('Error uploading seal:', err);
                window.alert('Failed to upload seal image. Please try again.');
              }
            }}
          />
          {sealImage && (
            <div style={{ fontSize: '0.75rem', color: 'rgb(34, 197, 94)', marginTop: '8px', fontWeight: '500' }}>
              ✓ Seal image uploaded ({Math.round(sealImage.length / 1024)}KB)
            </div>
          )}
        </div>

        {/* Generate NOC */}
        <div className="noc-section">
          <button
            onClick={handleGenerateNOC}
            className="btn btn-primary w-full"
            style={{padding: '0.875rem', fontSize: '1rem'}}
          >
            <FiDownload size={18} /> Generate & Download NOC Document
          </button>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
