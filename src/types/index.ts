// Frontend types
export type Phase = 'evaluation' | 'noc-creation' | 'licensing' | 'archive';
export type ApplicationStatus = 'pending' | 'under-review' | 'approved-noc' | 'noc-created' | 'in-licensing' | 'approved-license' | 'rejected' | 'archived';
export type DocumentStatus = 'pending-review' | 'approved' | 'revision-requested' | 'archived';

export interface NOCSignatory {
  signatoryId: string;
  name: string;
  title: string;
  signatureUrl?: string;
  signatureDate?: string;
  signedAt?: Date;
  status: 'pending' | 'signed' | 'declined';
}

export interface DocumentVersion {
  versionId: string;
  versionNumber: number;
  uploadedBy: string;
  uploadedAt: Date;
  fileName: string;
  fileUrl: string;
  documentType: 'kyc' | 'aml' | 'compliance' | 'technical' | 'financial' | 'regulatory' | 'other';
  status: DocumentStatus;
  feedbacks: DocumentFeedback[];
}

export interface DocumentFeedback {
  feedbackId: string;
  givenBy: string;
  givenAt: Date;
  category: string;
  comment: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'rejected';
  resolvedAt?: Date;
  resolvedBy?: string;
  changeTrail: string[];
}

export interface ApplicationWorkflow {
  applicationId: string;
  currentPhase: Phase;
  currentStatus: ApplicationStatus;
  phases: Map<Phase, PhaseStatus>;
  timeline: WorkflowEvent[];
}

export interface PhaseStatus {
  phase: Phase;
  status: 'pending' | 'in-progress' | 'completed' | 'locked';
  startedAt?: Date;
  completedAt?: Date;
  assignedTo?: string;
  notes?: string;
}

export interface WorkflowEvent {
  eventId: string;
  timestamp: Date;
  phase: Phase;
  action: string;
  performedBy: string;
  details: string;
}
