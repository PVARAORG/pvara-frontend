import { create } from 'zustand';
import { ApplicationWorkflow, Phase, ApplicationStatus, PhaseStatus, WorkflowEvent } from '../types';

interface WorkflowState {
  workflows: Map<string, ApplicationWorkflow>;
  currentApplicationId: string | null;
  currentPhase: Phase;
  
  // Workflow management
  initializeWorkflow: (applicationId: string) => void;
  getCurrentWorkflow: (applicationId: string) => ApplicationWorkflow | null;
  getPhaseStatus: (applicationId: string, phase: Phase) => PhaseStatus | null;
  
  // Phase transitions
  moveToPhase: (applicationId: string, targetPhase: Phase, performedBy: string, notes?: string) => boolean;
  updatePhaseStatus: (applicationId: string, phase: Phase, status: PhaseStatus) => void;
  
  // Event tracking
  addWorkflowEvent: (applicationId: string, event: Omit<WorkflowEvent, 'eventId'>) => void;
  getPhaseTimeline: (applicationId: string) => WorkflowEvent[];
  
  // Application status
  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => void;
}

const WORKFLOW_PHASES: Record<Phase, { order: number; locked?: boolean }> = {
  'evaluation': { order: 1, locked: false },
  'noc-creation': { order: 2, locked: false },
  'licensing': { order: 3, locked: true }, // Locked for now
  'archive': { order: 4, locked: false },
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: new Map(),
  currentApplicationId: null,
  currentPhase: 'evaluation',

  initializeWorkflow: (applicationId: string) => {
    set((state) => {
      const workflows = new Map(state.workflows);
      
      if (!workflows.has(applicationId)) {
        const workflow: ApplicationWorkflow = {
          applicationId,
          currentPhase: 'evaluation',
          currentStatus: 'pending',
          phases: new Map([
            ['evaluation', { phase: 'evaluation', status: 'pending' }],
            ['noc-creation', { phase: 'noc-creation', status: 'pending' }],
            ['licensing', { phase: 'licensing', status: 'locked' }],
            ['archive', { phase: 'archive', status: 'pending' }],
          ]),
          timeline: [],
        };
        
        workflows.set(applicationId, workflow);
      }
      
      return { workflows };
    });
  },

  getCurrentWorkflow: (applicationId: string) => {
    const state = get();
    return state.workflows.get(applicationId) || null;
  },

  getPhaseStatus: (applicationId: string, phase: Phase) => {
    const workflow = get().getCurrentWorkflow(applicationId);
    return workflow?.phases.get(phase) || null;
  },

  moveToPhase: (applicationId: string, targetPhase: Phase, performedBy: string, notes?: string) => {
    const state = get();
    const workflow = state.getCurrentWorkflow(applicationId);
    
    if (!workflow) return false;

    // Check if target phase is locked
    if (WORKFLOW_PHASES[targetPhase].locked) {
      console.warn(`Cannot move to locked phase: ${targetPhase}`);
      return false;
    }

    // Update current phase
    set((state) => {
      const workflows = new Map(state.workflows);
      const updatedWorkflow = workflows.get(applicationId);
      
      if (updatedWorkflow) {
        updatedWorkflow.currentPhase = targetPhase;
        
        // Update phase status
        const phaseStatus = updatedWorkflow.phases.get(targetPhase);
        if (phaseStatus) {
          phaseStatus.status = 'in-progress';
          phaseStatus.startedAt = new Date();
          phaseStatus.assignedTo = performedBy;
          phaseStatus.notes = notes;
        }

        // Add to timeline
        const eventId = `evt_${Date.now()}_${Math.random()}`;
        updatedWorkflow.timeline.push({
          eventId,
          timestamp: new Date(),
          phase: targetPhase,
          action: 'phase_transition',
          performedBy,
          details: `Moved to ${targetPhase} phase. ${notes || ''}`,
        });

        workflows.set(applicationId, updatedWorkflow);
      }
      
      return { workflows, currentPhase: targetPhase };
    });

    return true;
  },

  updatePhaseStatus: (applicationId: string, phase: Phase, status: PhaseStatus) => {
    set((state) => {
      const workflows = new Map(state.workflows);
      const workflow = workflows.get(applicationId);
      
      if (workflow) {
        workflow.phases.set(phase, status);
        workflows.set(applicationId, workflow);
      }
      
      return { workflows };
    });
  },

  addWorkflowEvent: (applicationId: string, event: Omit<WorkflowEvent, 'eventId'>) => {
    set((state) => {
      const workflows = new Map(state.workflows);
      const workflow = workflows.get(applicationId);
      
      if (workflow) {
        const eventId = `evt_${Date.now()}_${Math.random()}`;
        workflow.timeline.push({
          ...event,
          eventId,
        });
        workflows.set(applicationId, workflow);
      }
      
      return { workflows };
    });
  },

  getPhaseTimeline: (applicationId: string) => {
    const workflow = get().getCurrentWorkflow(applicationId);
    return workflow?.timeline || [];
  },

  updateApplicationStatus: (applicationId: string, status: ApplicationStatus) => {
    set((state) => {
      const workflows = new Map(state.workflows);
      const workflow = workflows.get(applicationId);
      
      if (workflow) {
        workflow.currentStatus = status;
        workflows.set(applicationId, workflow);
      }
      
      return { workflows };
    });
  },
}));
