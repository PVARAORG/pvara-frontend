import { create } from 'zustand';
import { DocumentVersion, DocumentFeedback, DocumentStatus } from '../types';

interface DocumentState {
  documents: Map<string, DocumentVersion[]>; // applicationId -> versions
  feedbacks: Map<string, DocumentFeedback[]>; // documentId -> feedbacks
  
  // Document management
  uploadDocument: (applicationId: string, version: Omit<DocumentVersion, 'versionId' | 'versionNumber'>) => string;
  getDocuments: (applicationId: string) => DocumentVersion[];
  getDocument: (documentId: string) => DocumentVersion | null;
  getDocumentVersions: (applicationId: string, fileName: string) => DocumentVersion[];
  
  // Feedback management
  addFeedback: (documentId: string, feedback: Omit<DocumentFeedback, 'feedbackId'>) => string;
  getFeedbacks: (documentId: string) => DocumentFeedback[];
  updateFeedbackStatus: (feedbackId: string, status: 'pending' | 'accepted' | 'rejected') => void;
  resolveFeedback: (feedbackId: string, resolvedBy: string, changeTrail: string[]) => void;
  
  // Document status
  updateDocumentStatus: (documentId: string, status: DocumentStatus) => void;
  
  // Change tracking
  getChangeHistory: (applicationId: string) => ChangeRecord[];
}

export interface ChangeRecord {
  timestamp: Date;
  documentId: string;
  fileName: string;
  category: string;
  action: 'added' | 'modified' | 'removed' | 'feedback_added' | 'feedback_resolved';
  performedBy: string;
  details: string;
}

let docIdCounter = 1;
let feedbackIdCounter = 1;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: new Map(),
  feedbacks: new Map(),

  uploadDocument: (applicationId: string, version: Omit<DocumentVersion, 'versionId' | 'versionNumber'>) => {
    const documentId = `doc_${docIdCounter++}`;
    
    set((state) => {
      const documents = new Map(state.documents);
      const appDocs = documents.get(applicationId) || [];
      
      // Get version number
      const existingVersions = appDocs.filter(d => d.fileName === version.fileName);
      const versionNumber = existingVersions.length + 1;
      
      const newVersion: DocumentVersion = {
        ...version,
        versionId: documentId,
        versionNumber,
      };
      
      documents.set(applicationId, [...appDocs, newVersion]);
      return { documents };
    });
    
    return documentId;
  },

  getDocuments: (applicationId: string) => {
    return get().documents.get(applicationId) || [];
  },

  getDocument: (documentId: string) => {
    const state = get();
    for (const docs of state.documents.values()) {
      const found = docs.find(d => d.versionId === documentId);
      if (found) return found;
    }
    return null;
  },

  getDocumentVersions: (applicationId: string, fileName: string) => {
    const documents = get().documents.get(applicationId) || [];
    return documents.filter(d => d.fileName === fileName).sort((a, b) => b.versionNumber - a.versionNumber);
  },

  addFeedback: (documentId: string, feedback: Omit<DocumentFeedback, 'feedbackId'>) => {
    const feedbackId = `fb_${feedbackIdCounter++}`;
    
    set((state) => {
      const feedbacks = new Map(state.feedbacks);
      const docFeedbacks = feedbacks.get(documentId) || [];
      
      feedbacks.set(documentId, [...docFeedbacks, {
        ...feedback,
        feedbackId,
      }]);
      
      return { feedbacks };
    });
    
    return feedbackId;
  },

  getFeedbacks: (documentId: string) => {
    return get().feedbacks.get(documentId) || [];
  },

  updateFeedbackStatus: (feedbackId: string, status: 'pending' | 'accepted' | 'rejected') => {
    set((state) => {
      const feedbacks = new Map(state.feedbacks);
      
      for (const docFeedbacks of feedbacks.values()) {
        const fb = docFeedbacks.find(f => f.feedbackId === feedbackId);
        if (fb) {
          fb.status = status;
          break;
        }
      }
      
      return { feedbacks };
    });
  },

  resolveFeedback: (feedbackId: string, resolvedBy: string, changeTrail: string[]) => {
    set((state) => {
      const feedbacks = new Map(state.feedbacks);
      
      for (const docFeedbacks of feedbacks.values()) {
        const fb = docFeedbacks.find(f => f.feedbackId === feedbackId);
        if (fb) {
          fb.resolvedAt = new Date();
          fb.resolvedBy = resolvedBy;
          fb.changeTrail = [...fb.changeTrail, ...changeTrail];
          fb.status = 'accepted';
          break;
        }
      }
      
      return { feedbacks };
    });
  },

  updateDocumentStatus: (documentId: string, status: DocumentStatus) => {
    set((state) => {
      const documents = new Map(state.documents);
      
      for (const docs of documents.values()) {
        const doc = docs.find(d => d.versionId === documentId);
        if (doc) {
          doc.status = status;
          break;
        }
      }
      
      return { documents };
    });
  },

  getChangeHistory: (applicationId: string) => {
    const documents = get().documents.get(applicationId) || [];
    const feedbacks = get().feedbacks;
    const changes: ChangeRecord[] = [];

    // Track document uploads
    documents.forEach(doc => {
      changes.push({
        timestamp: doc.uploadedAt,
        documentId: doc.versionId,
        fileName: doc.fileName,
        category: doc.documentType,
        action: doc.versionNumber === 1 ? 'added' : 'modified',
        performedBy: doc.uploadedBy,
        details: `Version ${doc.versionNumber} uploaded`,
      });
    });

    // Track feedback
    documents.forEach(doc => {
      const docFeedbacks = feedbacks.get(doc.versionId) || [];
      docFeedbacks.forEach(fb => {
        changes.push({
          timestamp: fb.givenAt,
          documentId: doc.versionId,
          fileName: doc.fileName,
          category: fb.category,
          action: fb.status === 'accepted' ? 'feedback_resolved' : 'feedback_added',
          performedBy: fb.givenBy,
          details: `${fb.severity.toUpperCase()}: ${fb.comment}`,
        });
      });
    });

    return changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  },
}));
