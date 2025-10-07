import { create } from 'zustand';

type AIStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AIState {
    status: AIStatus;
    progress: number;
    setStatus: (status: AIStatus) => void;
    setProgress: (progress: number) => void;
}

export const useAIStore = create<AIState>((set) => ({
    status: 'idle',
    progress: 0,
    setStatus: (status) => set({ status }),
    setProgress: (progress) => set({ progress }),
}));

// Quick Capture Modal Store
interface QuickCaptureState {
    isOpen: boolean;
    open: () => void;
    close: () => void;
}

export const useQuickCaptureStore = create<QuickCaptureState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}));

// Dashboard State Store for three-pane layout
interface DashboardState {
    activeFolderId: string | null;
    activeNoteId: string | null;
    setActiveFolderId: (folderId: string | null) => void;
    setActiveNoteId: (noteId: string | null) => void;
    resetSelection: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
    activeFolderId: null,
    activeNoteId: null,
    setActiveFolderId: (folderId) => set({ activeFolderId: folderId, activeNoteId: null }), // Reset note when folder changes
    setActiveNoteId: (noteId) => set({ activeNoteId: noteId }),
    resetSelection: () => set({ activeFolderId: null, activeNoteId: null }),
}));
