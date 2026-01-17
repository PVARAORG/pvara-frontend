import { create } from 'zustand';

interface EvaluationState {
  applicationId: string | null;
  isEvaluating: boolean;
  voiceActive: boolean;
  currentTranscript: string;
  setApplicationId: (id: string) => void;
  setEvaluating: (evaluating: boolean) => void;
  setVoiceActive: (active: boolean) => void;
  setTranscript: (transcript: string) => void;
  reset: () => void;
}

export const useEvaluationStore = create<EvaluationState>((set) => ({
  applicationId: null,
  isEvaluating: false,
  voiceActive: false,
  currentTranscript: '',
  setApplicationId: (id) => set({ applicationId: id }),
  setEvaluating: (evaluating) => set({ isEvaluating: evaluating }),
  setVoiceActive: (active) => set({ voiceActive: active }),
  setTranscript: (transcript) => set({ currentTranscript: transcript }),
  reset: () => set({
    applicationId: null,
    isEvaluating: false,
    voiceActive: false,
    currentTranscript: '',
  }),
}));
