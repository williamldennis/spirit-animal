import { create } from 'zustand';

interface BottomSheetState {
  isAIBottomSheetVisible: boolean;
  showAIBottomSheet: () => void;
  hideAIBottomSheet: () => void;
}

export const useBottomSheet = create<BottomSheetState>((set) => ({
  isAIBottomSheetVisible: false,
  showAIBottomSheet: () => set({ isAIBottomSheetVisible: true }),
  hideAIBottomSheet: () => set({ isAIBottomSheetVisible: false }),
})); 