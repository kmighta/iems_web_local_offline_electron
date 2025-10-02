import { create } from 'zustand';

const useConnectionModalStore = create((set, get) => ({
  // 모달 상태
  isModalOpen: false,
  isRefreshing: false,
  refreshAttempted: false,
  refreshFailureCount: 0, // 새로고침 실패 횟수
  lastRefreshTime: null, // 마지막 새로고침 시도 시간
  
  // 모달 열기
  openModal: () => set({ 
    isModalOpen: true,
    refreshAttempted: false,
    refreshFailureCount: 0 // 모달 열 때 실패 횟수 리셋
  }),
  
  // 모달 닫기
  closeModal: () => set({ 
    isModalOpen: false,
    isRefreshing: false,
    refreshAttempted: false,
    refreshFailureCount: 0 // 모달 닫을 때 실패 횟수 리셋
  }),
  
  // 새로고침 시작
  startRefresh: () => set({ 
    isRefreshing: true,
    refreshAttempted: true,
    lastRefreshTime: Date.now()
  }),
  
  // 새로고침 완료
  finishRefresh: () => set({ 
    isRefreshing: false,
    refreshFailureCount: 0 // 성공 시 실패 횟수 리셋
  }),
  
  // 새로고침 실패
  failRefresh: () => set((state) => ({ 
    isRefreshing: false,
    refreshFailureCount: state.refreshFailureCount + 1
  })),
  
  // 상태 리셋
  reset: () => set({
    isModalOpen: false,
    isRefreshing: false,
    refreshAttempted: false,
    refreshFailureCount: 0,
    lastRefreshTime: null
  })
}));

export default useConnectionModalStore;
