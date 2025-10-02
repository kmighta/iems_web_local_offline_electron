import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 보고서 탭 상태 관리 store
export const useReportTabStore = create(
  persist(
    (set, get) => ({
      // 현재 활성 탭
      activeTab: "전력 사용량",
      
      // 뷰 타입 (일별/월별/년별)
      viewType: "일별 보기",
      
      // 그래프 단위 (hour/quarter)
      graphUnit: "hour",
      
      // 선택된 날짜 (일별) - 항상 최신 날짜로 초기화
      get selectedDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}년 ${month}월 ${day}일`;
      },
      
      // 선택된 월 (월별) - 항상 최신 월로 초기화
      get selectedMonth() {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        return `${year}년 ${month}월`;
      },
      
      // 선택된 년도 (년별) - 항상 최신 년도로 초기화
      get selectedYear() {
        const currentDate = new Date();
        return `${currentDate.getFullYear()}년`;
      },
      
      // 보이는 시리즈 상태
      visibleSeries: {
        main: true,
        prev: true,
        compare: true,
      },
      
      // 액션들
      setActiveTab: (tab) => set({ activeTab: tab }),
      setViewType: (viewType) => set({ viewType }),
      setGraphUnit: (unit) => set({ graphUnit: unit }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      setSelectedYear: (year) => set({ selectedYear: year }),
      setVisibleSeries: (series) => set({ visibleSeries: series }),
      
      // 모든 상태 초기화
      resetAll: () => set({
        activeTab: "전력 사용량",
        viewType: "일별 보기",
        graphUnit: "hour",
        visibleSeries: {
          main: true,
          prev: true,
          compare: true,
        },
      }),
    }),
    {
      name: 'report-tab-storage', // localStorage 키
      // 특정 필드만 persist (날짜는 제외)
      partialize: (state) => ({
        activeTab: state.activeTab,
        viewType: state.viewType,
        graphUnit: state.graphUnit,
        visibleSeries: state.visibleSeries,
      }),
    }
  )
);
