import { create } from 'zustand';

const useRefetchControlStore = create((set, get) => ({
  // 1초/2초 트리거 상태 관리
  triggeredSeconds: new Set(), // 이미 트리거된 초들
  lastTriggerTime: null, // 마지막 트리거 시간
  
  // 특정 초에 트리거했는지 확인
  hasTriggered: (second) => {
    const state = get();
    return state.triggeredSeconds.has(second);
  },
  
  // 특정 초에 트리거 등록
  setTriggered: (second) => {
    const now = Date.now();
    set((state) => ({
      triggeredSeconds: new Set([...state.triggeredSeconds, second]),
      lastTriggerTime: now
    }));
  },
  
  // 시간/쿼터 변경 시 트리거 상태 리셋
  resetTriggers: () => {
    set({
      triggeredSeconds: new Set(),
      lastTriggerTime: null
    });
  },
  
  // 특정 초의 트리거 상태 제거 (시간이 지나면)
  removeTrigger: (second) => {
    set((state) => {
      const newSet = new Set(state.triggeredSeconds);
      newSet.delete(second);
      return {
        triggeredSeconds: newSet
      };
    });
  },
  
  // 전체 상태 리셋
  reset: () => {
    set({
      triggeredSeconds: new Set(),
      lastTriggerTime: null
    });
  }
}));

export default useRefetchControlStore;
