import { create } from 'zustand';

interface ShareEntryTransitionState {
  isEntryTransitionActive: boolean;
  beginEntryTransition: () => void;
  endEntryTransition: () => void;
}

export const useShareEntryTransitionStore = create<ShareEntryTransitionState>((set) => ({
  isEntryTransitionActive: false,
  beginEntryTransition: () => set({ isEntryTransitionActive: true }),
  endEntryTransition: () => set({ isEntryTransitionActive: false }),
}));

