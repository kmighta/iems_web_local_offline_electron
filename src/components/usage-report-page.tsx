import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Calendar, RefreshCw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useTheme } from "./theme-provider";

// TypeScript 타입 imports
import {
  ViewType,
  GraphUnit,
  ActiveTab,
  ReportTab,
  ChartDataPoint,
  TableDataRow,
  UsageChartProps,
  VisibleSeries,
  SummaryData,
} from "@/types/report";

// API 및 훅 imports
import { useReportData } from "@/hooks/useReportApi";
import { useUsageReportExcel } from "@/hooks/useUsageReportExcel";
// useSettingsStore는 상단에서 한 번만 import
import useOrganizationStore from "@/store/organizationStore";
import { useReportTabStore } from "@/store/reportTabStore";

// 유틸리티 imports
import {
  transformHourlyDataToChart,
  transformQuarterDataToChart,
  transformMonthlyDataToChart,
  transformYearlyDataToChart,
  transformDataToTable,
  transformControlData,
  calculateSummaryData,
} from "@/utils/dataTransformUtils";

// 컴포넌트 imports
import ApiErrorNotification from './ApiErrorNotification';
import ReportDataTable from './report/ReportDataTable';
import useSettingsStore from "@/store/settingsStore";


// 차트 컴포넌트 메모이제이션 (shallow comparison으로 불필요한 리렌더링 방지)
const UsageChart = memo<UsageChartProps>(({
  chartData,
  loading,
  isLoading,
  activeTab,
  theme,
  currentTab,
  visibleSeries,
  viewType,
  graphUnit,
  effectiveGraphUnit,
  chartKey,
  getBarColor,
  getBarColor2,
  isTodaySelectedForLive,
  getCurrentTimeKey
}) => {
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-green-600"></div>
          <div className="text-gray-500 dark:text-gray-300">차트 데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <div className="text-gray-500">표시할 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="w-full h-auto overflow-x-auto overflow-y-hidden">
      <div className="min-w-[800px] h-[350px]">
        <ResponsiveContainer width="100%" height="100%" debounce={200}>
          <ComposedChart
            key={chartKey}
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#BDBDBD" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: theme === "dark" ? "#fff" : "#6b7280" }}
              axisLine={{ stroke: "#BDBDBD" }}
              // axisLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              // tickLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              tickLine={{ stroke: "#BDBDBD" }}
              tickFormatter={(value: string) => {
                if (viewType === "일별 보기" && typeof value === "string") {
                  if (value.includes(":")) {
                    if (graphUnit === "hour") {
                      return value.split(":")[0].padStart(2, "0");
                    }
                    return value;
                  }
                }
                return value;
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: theme === "dark" ? "#fff" : "#6b7280" }}
              // axisLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              axisLine={{ stroke: "#BDBDBD" }}
              // tickLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              tickLine={{ stroke: "#BDBDBD" }}
              label={{
                value: currentTab?.unit || '',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: theme === "dark" ? "#fff" : "#6b7280" }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
                color: theme === "dark" ? "#fff" : "#1f2937"
              }}
              isAnimationActive={false}
              animationDuration={0}
              formatter={(value: any, name: string) => {
                const cleanValue = typeof value === 'number' ? value.toLocaleString() : value;
                return [cleanValue, name];
              }}
              labelFormatter={(label: string) => {
                const timeLabel = viewType === "일별 보기" ? "시간" : viewType === "월별 보기" ? "일" : "월";
                return `${timeLabel}: ${label}`;
              }}
            />
            <Bar 
              dataKey={currentTab?.dataKey}
              name={currentTab?.name}
              fill={getBarColor(currentTab?.color)} 
              opacity={0.8} 
              isAnimationActive={false}
              animationDuration={0}
              hide={!visibleSeries.main}
            >
              {chartData.map((entry, index) => {
                // 실시간 데이터가 있는지 확인
                const isRealtime = isTodaySelectedForLive && 
                  (activeTab === "전력 사용량" || activeTab === "전력 피크") &&
                  entry.time === getCurrentTimeKey();
                
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={isRealtime ? getBarColor2(currentTab?.color) : getBarColor(currentTab?.color)}
                    opacity={isRealtime ? 1.0 : 0.8}
                    className={isRealtime ? 'realtime-bar' : ''}
                  />
                );
              })}
            </Bar>
            {visibleSeries.prev && (
              <Line 
                key="prevDay"
                type="monotone" 
                dataKey="prevDay"
                name="전일"
                stroke="#22c55e" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
                animationDuration={0}
              />
            )}
            {viewType !== "년별 보기" && visibleSeries.compare && (
              <Line 
                key="prevMonth"
                type="monotone" 
                dataKey="prevMonth"
                name={viewType === "일별 보기" ? "전월동일" : "전월"}
                stroke="#f97316" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
                animationDuration={0}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 성능 최적화: 주요 props만 비교하여 불필요한 리렌더링 방지
  if (
    prevProps.loading !== nextProps.loading ||
    prevProps.isLoading !== nextProps.isLoading ||
    prevProps.activeTab !== nextProps.activeTab ||
    prevProps.theme !== nextProps.theme ||
    prevProps.viewType !== nextProps.viewType ||
    prevProps.graphUnit !== nextProps.graphUnit ||
    prevProps.chartKey !== nextProps.chartKey
  ) {
    return false; // 리렌더링 필요
  }

  // visibleSeries 변경 체크
  if (JSON.stringify(prevProps.visibleSeries) !== JSON.stringify(nextProps.visibleSeries)) {
    return false;
  }

  // currentTab 변경 체크
  if (JSON.stringify(prevProps.currentTab) !== JSON.stringify(nextProps.currentTab)) {
    return false;
  }

  // chartData 길이가 다르면 리렌더링
  if (prevProps.chartData.length !== nextProps.chartData.length) {
    return false;
  }

  // chartData의 실제 변경사항만 체크 (shallow comparison)
  for (let i = 0; i < prevProps.chartData.length; i++) {
    const prev = prevProps.chartData[i];
    const next = nextProps.chartData[i];

    if (prev.time !== next.time ||
        prev.usage !== next.usage ||
        prev.peak !== next.peak ||
        prev.maxLoad !== next.maxLoad ||
        prev.reduction !== next.reduction ||
        prev.prevDay !== next.prevDay ||
        prev.prevMonth !== next.prevMonth) {
      return false; // 변경사항 있음, 리렌더링 필요
    }
  }

  return true; // 변경사항 없음, 리렌더링 스킵
});

UsageChart.displayName = 'UsageChart';

// 메인 컴포넌트
const UsageReportPage: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  
  // store에서 상태 가져오기
  const {
    activeTab,
    viewType,
    graphUnit,
    selectedDate,
    selectedMonth,
    selectedYear,
    visibleSeries,
    setActiveTab,
    setViewType,
    setGraphUnit,
    setSelectedDate,
    setSelectedMonth,
    setSelectedYear,
    setVisibleSeries,
  } = useReportTabStore();

  // 로컬 상태들 (store에 저장하지 않는 것들)
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState<Date>(today);
  const [calendarMonth, setCalendarMonth] = useState<Date>(today);
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [chartKey, setChartKey] = useState<number>(0);
  
  // 실시간 셀 이동 감지 및 API 재갱신을 위한 상태
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRealtimeSlotRef = useRef<{ hour: number; quarter: number } | null>(null);
  const lastActivePeakRef = useRef<1 | 2 | 3 | 4 | null>(null);
  // 리펫치 타깃(검사 대상) 저장: 어떤 슬롯의 어떤 피크가 비어있는지
  
  // 스토어에서 데이터 가져오기
  const settingsStore = useSettingsStore();
  const { selectedStore } = useOrganizationStore();
  
  // 보고서 페이지 진입 시 deviceInfo 캐시 초기화
  useEffect(() => {
    console.log('보고서 페이지 진입 - deviceInfo 캐시 초기화');
    settingsStore.clearDeviceInfoCache();
    settingsStore.clearLoadCutoffStatesCache();
  }, []); // 의존성 배열을 빈 배열로 변경
  
  // 선택된 날짜를 API 형식으로 변환
  const apiDate = useMemo(() => {
    const match = selectedDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  }, [selectedDate]);

  // API 데이터 훅 (serialNumber는 organizationStore에서 자동으로 가져옴)
  // useReportData: viewType에 따라 적절한 쿼리 활성화
  const viewKey = viewType === '일별 보기' ? 'daily' : viewType === '월별 보기' ? 'monthly' : 'yearly';
  const yearNum = useMemo(() => {
    const m = selectedYear.match(/(\d{4})년/);
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
  }, [selectedYear]);
  const monthInfo = useMemo(() => {
    const m = selectedMonth.match(/(\d{4})년\s*(\d{1,2})월/);
    return {
      year: m ? parseInt(m[1], 10) : new Date().getFullYear(),
      month: m ? parseInt(m[2], 10) : (new Date().getMonth() + 1),
    };
  }, [selectedMonth]);
  const {
    data: reportData,
    isLoading,
    isFetching,
    error,
    refetchCurrentData,
  } = useReportData(
    viewKey as any,
    viewKey === 'daily' ? apiDate : undefined,
    viewKey === 'monthly' ? monthInfo.year : (viewKey === 'yearly' ? yearNum : undefined),
    viewKey === 'monthly' ? monthInfo.month : undefined
  );

  // 색상 계산 함수들
  const getBarColor = useCallback((color?: string): string => {
    const colors: Record<string, string> = {
      teal: "#14b8a6",
      red: "#ef4444",
      orange: "#f97316",
      green: "#22c55e",
    };
    return colors[color || 'teal'] || "#14b8a6";
  }, []);

  const getBarColor2 = useCallback((color?: string): string => {
    const colors: Record<string, string> = {
      teal: "#B3E0DC",
      red: "#F0B7BD",
      orange: "#FFCC80",
      green: "#C8E6C9",
    };
    return colors[color || 'teal'] || "#14b8a6";
  }, []);

  // 날짜 선택 핸들러들
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setCalendarDate(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const newDate = `${year}년 ${month}월 ${day}일`;
      setSelectedDate(newDate);
      setIsCalendarOpen(false);
    }
  }, []);

  const handleMonthSelect = useCallback((date: Date | undefined) => {
    if (date) {
      setCalendarMonth(date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const newMonth = `${year}년 ${month}월`;
      setSelectedMonth(newMonth);
      setIsCalendarOpen(false);
    }
  }, []);

  const handleYearSelect = useCallback((year: string) => {
    const newYear = `${year}년`;
    setSelectedYear(newYear);
    setIsCalendarOpen(false);
  }, []);

  // 오늘로 돌아가기 함수
  const handleGoToToday = useCallback(() => {
    const today = new Date();
    
    if (viewType === "일별 보기") {
      const todayStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월 ${String(today.getDate()).padStart(2, "0")}일`;
      setSelectedDate(todayStr);
      setCalendarDate(today);
    } else if (viewType === "월별 보기") {
      const todayMonth = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, "0")}월`;
      setSelectedMonth(todayMonth);
      setCalendarMonth(today);
    } else if (viewType === "년별 보기") {
      const todayYear = `${today.getFullYear()}년`;
      setSelectedYear(todayYear);
    }
    
    setIsCalendarOpen(false);
  }, [viewType]);

  // 레전드 클릭 핸들러
  const handleLegendClick = useCallback((seriesType: keyof VisibleSeries) => {
    setVisibleSeries((prev: VisibleSeries) => ({
      ...prev,
      [seriesType]: !prev[seriesType]
    }));
  }, []);

  // 탭 정의
  const tabs: ReportTab[] = [
    { name: "전력 사용량", color: "teal", unit: "kWh", dataKey: "usage" },
    { name: "전력 피크", color: "red", unit: "kW", dataKey: "peak" },
    { name: "최대부하", color: "orange", unit: "kW", dataKey: "maxLoad" },
    { name: "감축량", color: "green", unit: "kWh", dataKey: "reduction" },
    { name: "제어현황", color: "blue", unit: "", dataKey: "ctrlCount", isTableOnly: true },
  ];

  const currentTab = tabs.find((tab) => tab.name === activeTab);
  
  // Clock 탭 여부 체크
  const isClockTab = activeTab === "최대부하" || activeTab === "제어현황";
  const effectiveGraphUnit = isClockTab ? "hour" : graphUnit;
  
  // 차트 데이터 변환 + 실시간 오버레이 반영
  const { deviceInfo } = settingsStore;

  // 실시간 데이터 캐시를 위한 ref
  const realtimeDataRef = useRef<{
    usage: number;
    peak: number;
    timestamp: number;
    hour: number;
    quarter: number;
    activePeak: 1 | 2 | 3 | 4 | null;
  } | null>(null);

  // 실시간 데이터 추출 및 캐싱
  const realtimeData = useMemo(() => {
    console.log('실시간 데이터 추출 시도:', { deviceInfo });
    
    try {
      const plcTimeStr = (deviceInfo as any)?.plc_time || (deviceInfo as any)?.plcTime;
      console.log('PLC 시간:', plcTimeStr);
      
      if (!plcTimeStr) {
        console.log('PLC 시간이 없음');
        return null;
      }

      const plcDate = new Date(plcTimeStr);
      const now = new Date();
      const isToday = now.getFullYear() === plcDate.getFullYear() &&
                      now.getMonth() === plcDate.getMonth() &&
                      now.getDate() === plcDate.getDate();
      
      console.log('오늘 날짜 확인:', { isToday, plcDate, now });
      
      if (!isToday) {
        console.log('오늘 날짜가 아님');
        return null;
      }

      const hour = plcDate.getHours();
      const minute = plcDate.getMinutes();
      const quarter = Math.floor(minute / 15);

      const usageKwh = Math.round(((Number((deviceInfo as any)?.usage || 0) / 1000)) * 1000) / 1000;
      const p1 = Number((deviceInfo as any)?.peak1 || 0);
      const p2 = Number((deviceInfo as any)?.peak2 || 0);
      const p3 = Number((deviceInfo as any)?.peak3 || 0);
      const p4 = Number((deviceInfo as any)?.peak4 || 0);
      
      console.log('피크 데이터:', { p1, p2, p3, p4, usageKwh });
      
      const has1 = p1 > 0, has2 = p2 > 0, has3 = p3 > 0, has4 = p4 > 0;
      let activePeak: 1|2|3|4|null = null;
      if (has1 && !has2 && !has3 && !has4) activePeak = 1;
      else if (has1 && has2 && !has3 && !has4) activePeak = 2;
      else if (has1 && has2 && has3 && !has4) activePeak = 3;
      else if (has1 && has2 && has3 && has4) activePeak = 4;

      const peakKw = activePeak ? Math.round(((activePeak === 1 ? p1 : activePeak === 2 ? p2 : activePeak === 3 ? p3 : p4)/1000) * 1000) / 1000 : 0;

      const result = {
        usage: usageKwh,
        peak: peakKw,
        timestamp: plcDate.getTime(),
        hour,
        quarter,
        activePeak
      };
      
      console.log('실시간 데이터 결과:', result);
      return result;
    } catch (error) {
      console.error('실시간 데이터 추출 오류:', error);
      return null;
    }
  }, [
    (deviceInfo as any)?.plc_time || (deviceInfo as any)?.plcTime,
    (deviceInfo as any)?.usage,
    (deviceInfo as any)?.peak1,
    (deviceInfo as any)?.peak2,
    (deviceInfo as any)?.peak3,
    (deviceInfo as any)?.peak4
  ]);

  // 오늘 날짜 체크 (차트/테이블 계산보다 먼저 선언)
  const isTodaySelectedForLive = useMemo(() => {
    // 월별/년별 보기에서는 실시간 오버레이 비활성화
    if (viewType !== '일별 보기') return false;
    if (!selectedDate) return false;
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
    return selectedDate === todayStr;
  }, [selectedDate, viewType]);

  // 이전 쿼터 데이터가 있는지 확인하는 함수 (피크 기준)
  const checkPreviousQuarterData = useCallback((currentSlot: { hour: number; quarter: number }, lastPeak: 1 | 2 | 3 | 4 | null) => {
    if (!reportData || !('quarter' in reportData)) {
      console.log('checkPreviousQuarterData: reportData 없음 또는 quarter 데이터 없음');
      return true; // quarter 데이터가 없으면 true 반환
    }
    
    const quarterData = (reportData as any).quarter || [];
    const targetTime = new Date();
    targetTime.setHours(currentSlot.hour, currentSlot.quarter * 15, 0, 0);
    
    // 이전 쿼터 시간 계산
    const prevTime = new Date(targetTime);
    prevTime.setMinutes(prevTime.getMinutes() - 15);
    
    console.log('checkPreviousQuarterData 디버그:', {
      currentSlot,
      lastPeak,
      targetTime: targetTime.toISOString(),
      prevTime: prevTime.toISOString(),
      quarterDataLength: quarterData.length
    });
    
    // 이전 쿼터 데이터가 있는지 확인
    const prevQuarterItem = quarterData.find((item: any) => {
      if (item.startTime) {
        const itemTime = new Date(item.startTime);
        const matches = itemTime.getHours() === prevTime.getHours() && 
               Math.floor(itemTime.getMinutes() / 15) === Math.floor(prevTime.getMinutes() / 15);
        if (matches) {
          console.log('이전 쿼터 아이템 찾음:', {
            startTime: item.startTime,
            itemTime: itemTime.toISOString(),
            peak1: item.peak1,
            peak2: item.peak2,
            peak3: item.peak3,
            peak4: item.peak4
          });
        }
        return matches;
      }
      return false;
    });
    
    // 레코드가 없으면 false (데이터 없음)
    if (!prevQuarterItem) {
      console.log('checkPreviousQuarterData: 이전 쿼터 레코드 없음');
      return false;
    }
    
    // 피크가 지정되지 않았으면 레코드 존재만으로 OK
    if (!lastPeak) {
      console.log('checkPreviousQuarterData: lastPeak 없음, 레코드 존재만으로 OK');
      return true;
    }
    
    // 이전 피크의 값이 비어있는지 확인 (0 또는 undefined)
    const peakValue = prevQuarterItem[`peak${lastPeak}`];
    const hasPeakData = peakValue && peakValue > 0;
    
    console.log('checkPreviousQuarterData 결과:', {
      lastPeak,
      peakValue,
      hasPeakData,
      result: hasPeakData
    });
    
    return hasPeakData;
  }, [reportData]);


  // API 재갱신 중단
  const stopRefetchInterval = useCallback(() => {
    if (refetchIntervalRef.current) {
      clearInterval(refetchIntervalRef.current);
      refetchIntervalRef.current = null;
    }
    setIsRefetching(false);
  }, []);

  // 기존 복잡한 리펫치 로직 제거 - ReportDataTable에서 처리
  // 실시간 데이터 상태만 업데이트
  useEffect(() => {
    if (realtimeData) {
      realtimeDataRef.current = realtimeData;
      lastActivePeakRef.current = realtimeData.activePeak ?? null;
      lastRealtimeSlotRef.current = { hour: realtimeData.hour, quarter: realtimeData.quarter };
    }
  }, [realtimeData?.timestamp, realtimeData?.hour, realtimeData?.quarter, realtimeData?.activePeak]);

  // 기본 차트 데이터 (실시간 데이터 제외)
  const baseChartData = useMemo((): ChartDataPoint[] => {
    if (!reportData) return [];
    if (viewType === '월별 보기') {
      return transformMonthlyDataToChart(reportData as any, activeTab);
    }
    if (viewType === '년별 보기') {
      return transformYearlyDataToChart(reportData as any, activeTab);
    }
    // 일별
    return graphUnit === "quarter"
      ? transformQuarterDataToChart((reportData as any).quarter, activeTab)
      : transformHourlyDataToChart((reportData as any).hour, (reportData as any).yesterday, (reportData as any).prevMonth, activeTab);
  }, [reportData, graphUnit, activeTab, viewType]);

  // 실시간 데이터로 업데이트된 차트 데이터 (최소한의 업데이트만)
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!baseChartData.length) return [];

    // 실시간 데이터 적용이 불필요한 경우 기본 데이터 반환
    if (!realtimeDataRef.current ||
        !isTodaySelectedForLive ||
        viewType !== '일별 보기' ||
        (activeTab !== "전력 사용량" && activeTab !== "전력 피크")) {
      return baseChartData;
    }

    // 실시간 데이터가 있는 경우에만 해당 인덱스만 업데이트
    const { hour, quarter, usage, peak } = realtimeDataRef.current;
    let targetKey = '';

    if (graphUnit === "hour") {
      targetKey = `${String(hour).padStart(2,'0')}:00`;
    } else {
      targetKey = `${String(hour).padStart(2,'0')}:${String(quarter*15).padStart(2,'0')}`;
    }

    const targetIdx = baseChartData.findIndex(d => d.time === targetKey);
    if (targetIdx === -1) return baseChartData;

    // 해당 인덱스만 복사하여 업데이트
    const updatedData = baseChartData.map((item, idx) => {
      if (idx === targetIdx) {
        if (activeTab === "전력 사용량") {
          // 15분 단위에서는 실시간 사용량을 (현재 피크 kW / 4) kWh로 표시
          const updatedUsage = (graphUnit === "quarter" && peak > 0)
            ? Math.round(((peak / 4)) * 1000) / 1000
            : usage;
          return { ...item, usage: updatedUsage };
        } else if (activeTab === "전력 피크" && peak > 0) {
          // 실시간 피크 데이터 업데이트 - 각 피크별로 올바른 값 매핑
          const activePeak = realtimeDataRef.current?.activePeak;
          let updatedPeak = peak;
          
          // 활성 피크에 따라 해당 피크 값 사용
          if (activePeak === 1) {
            updatedPeak = peak;
          } else if (activePeak === 2) {
            updatedPeak = peak;
          } else if (activePeak === 3) {
            updatedPeak = peak;
          } else if (activePeak === 4) {
            updatedPeak = peak;
          }
          
          return { 
            ...item, 
            peak: updatedPeak,
            // 각 피크별 개별 값도 업데이트 (디버깅용)
            peak1: activePeak === 1 ? updatedPeak : (item.peak1 || 0),
            peak2: activePeak === 2 ? updatedPeak : (item.peak2 || 0),
            peak3: activePeak === 3 ? updatedPeak : (item.peak3 || 0),
            peak4: activePeak === 4 ? updatedPeak : (item.peak4 || 0),
          };
        }
      }
      return item;
    });

    return updatedData;
  }, [baseChartData, isTodaySelectedForLive, activeTab, viewType, realtimeDataRef.current?.timestamp]);
  
  // 테이블 데이터 변환
  const tableData = useMemo((): TableDataRow[] => {
    if (!reportData) return [];
    if (viewType !== '일별 보기') return [];
    const rd: any = reportData;
    const sourceData = graphUnit === "quarter" ? rd.quarter : rd.hour;
    return transformDataToTable(sourceData, graphUnit, activeTab);
  }, [reportData, graphUnit, activeTab, viewType]);
  
  // 제어 데이터 변환
  const controlData = useMemo(() => {
    if (!reportData || viewType !== '일별 보기') return { totalCtrlTime: "00:00:00", totalControlCount: 0 };
    return transformControlData(reportData as any);
  }, [reportData, viewType]);
  
  // 합계 데이터 변환
  const summaryData = useMemo((): SummaryData => {
    if (!reportData) return {};
    if (viewType === '일별 보기') return calculateSummaryData(reportData as any, viewType, activeTab);
    // 월별/년별 요약은 화면에서 직접 계산하지 않고 표시 최소화
    return {};
  }, [reportData, viewType, activeTab]);

  // 새로고침 함수
  const handleRefresh = useCallback(async () => {
    try {
      console.log('🔄 데이터 새로고침 시작');
      await refetchCurrentData();
      console.log('✅ 데이터 새로고침 완료');
    } catch (error) {
      console.error('❌ 데이터 새로고침 실패:', error);
    }
  }, [refetchCurrentData]);

  // 선택된 날짜를 Date 객체로 변환
  const getSelectedDateAsDateObject = useCallback((): Date => {
    if (!selectedDate) return new Date();
    
    const match = selectedDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
    
    return new Date();
  }, [selectedDate]);

  // 엑셀 다운로드 훅 (유지)
  const excelHook = useUsageReportExcel(
    activeTab,
    viewType,
    deviceInfo,
    selectedStore,
    (viewType === '일별 보기' ? (reportData as any)?.hour : []) || [],
    (viewType === '일별 보기' ? (reportData as any)?.quarter : []) || [],
    (viewType === '일별 보기' ? (reportData as any)?.hour : []) || [], // clockData 대신 hour 데이터 사용
    controlData,
    graphUnit,
    getBarColor,
    currentTab,
    getSelectedDateAsDateObject,
    tableData
  );
  const { loading: excelLoading, handleExcelSave } = excelHook;

  // 테이블 헤더는 별도 컴포넌트에서 관리합니다 (불필요한 헤더 생성 로직 제거)

  // 스타일 객체들
  const currentTabColorStyle = useMemo(() => ({
    backgroundColor: getBarColor(currentTab?.color)
  }), [getBarColor, currentTab?.color]);

  const currentTabBorderStyle = useMemo(() => ({
    borderColor: getBarColor2(currentTab?.color)
  }), [getBarColor2, currentTab?.color]);

  // 현재 실시간 시간 키 생성 함수
  const getCurrentTimeKey = useCallback(() => {
    if (!realtimeDataRef.current) return '';
    const { hour, quarter } = realtimeDataRef.current;
    return graphUnit === "hour" 
      ? `${String(hour).padStart(2,'0')}:00`
      : `${String(hour).padStart(2,'0')}:${String(quarter*15).padStart(2,'0')}`;
  }, [graphUnit]);

  // (위로 이동)

  // graphUnit 변경 시 차트 리렌더링
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [graphUnit]);

  // 컴포넌트 언마운트 시 인터벌 정리
  useEffect(() => {
    return () => {
      stopRefetchInterval();
    };
  }, [stopRefetchInterval]);

  // 테스트용: 콘솔에서 delete 입력 시 현재 피크-1 데이터 삭제
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'delete') {
        if (!realtimeData || !reportData || !('quarter' in reportData)) {
          console.log('테스트: 실시간 데이터 또는 reportData가 없습니다.');
          return;
        }

        const currentPeak = realtimeData.activePeak;
        if (!currentPeak) {
          console.log('테스트: 현재 활성 피크가 없습니다.');
          return;
        }

        const prevPeak = currentPeak - 1;
        if (prevPeak < 1) {
          console.log('테스트: 이전 피크가 없습니다 (현재 피크:', currentPeak, ')');
          return;
        }

        const currentSlot = { hour: realtimeData.hour, quarter: realtimeData.quarter };
        const quarterData = (reportData as any).quarter || [];
        
        // 이전 쿼터 시간 계산
        const targetTime = new Date();
        targetTime.setHours(currentSlot.hour, currentSlot.quarter * 15, 0, 0);
        const prevTime = new Date(targetTime);
        prevTime.setMinutes(prevTime.getMinutes() - 15);

        // 이전 쿼터 아이템 찾기
        const prevQuarterItem = quarterData.find((item: any) => {
          if (item.startTime) {
            const itemTime = new Date(item.startTime);
            return itemTime.getHours() === prevTime.getHours() && 
                   Math.floor(itemTime.getMinutes() / 15) === Math.floor(prevTime.getMinutes() / 15);
          }
          return false;
        });

        if (prevQuarterItem) {
          const originalValue = prevQuarterItem[`peak${prevPeak}`];
          prevQuarterItem[`peak${prevPeak}`] = 0; // 데이터 삭제 (0으로 설정)
          
          console.log('테스트: 이전 피크 데이터 삭제 완료', {
            currentPeak,
            prevPeak,
            currentSlot,
            prevTime: prevTime.toISOString(),
            originalValue,
            newValue: 0
          });

          // 3초 후 원래 값으로 복구 (테스트용)
        } else {
          console.log('테스트: 이전 쿼터 아이템을 찾을 수 없습니다.', {
            currentSlot,
            prevTime: prevTime.toISOString()
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [realtimeData, reportData]);

  // API 재갱신 성공 시 인터벌 중단
  useEffect(() => {
    if (isRefetching && !isFetching && reportData) {
      // 새로운 데이터가 로드되었고, 이전 쿼터 데이터가 있는지 다시 확인 (피크 기준)
      const currentSlot = lastRealtimeSlotRef.current;
      const lastPeak = realtimeDataRef.current?.activePeak || null;
      if (currentSlot) {
        const hasPreviousData = checkPreviousQuarterData(currentSlot, lastPeak);
        if (hasPreviousData) {
          console.log('API 재갱신 성공, 이전 쿼터 데이터 확인됨 (피크 기준), 인터벌 중단', { lastPeak });
          stopRefetchInterval();
        }
      }
    }
  }, [isRefetching, isFetching, reportData, checkPreviousQuarterData, stopRefetchInterval]);

  // activeTab 변경 시 리펫치 중단
  useEffect(() => {
    if (activeTab !== '전력 피크') {
      stopRefetchInterval();
    }
  }, [activeTab, stopRefetchInterval]);

  // viewType 변경 시 리펫치 중단
  useEffect(() => {
    if (viewType !== '일별 보기') {
      stopRefetchInterval();
    }
  }, [viewType, stopRefetchInterval]);

  // activeTab 변경 시 차트 리렌더링
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [activeTab]);

  // 최대부하 탭에서 15분 보기를 1시간 보기로 강제 변경
  useEffect(() => {
    if (activeTab === "최대부하" && graphUnit === "quarter") {
      setGraphUnit("hour");
    }
  }, [activeTab, graphUnit]);

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      {/* 탭 메뉴 */}
      <Card className="border-0 shadow-sm bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl">
        <CardContent>
          <div className="flex flex-col gap-4 sm:gap-6 mb-6">
            {/* 탭 버튼들 */}
            <div className="overflow-x-auto py-2">
              <div className="flex gap-2 min-w-max">
                {tabs.map((tab) => (
                  <Button
                    key={tab.name}
                    variant={activeTab === tab.name ? "default" : "outline"}
                    className={`${activeTab === tab.name ? "bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700" : "bg-white hover:bg-gray-50"} px-2 lg:px-4 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0`}
                    onClick={() => setActiveTab(tab.name as ActiveTab)}
                  >
                    {tab.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* 필터와 날짜 선택 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Select value={viewType} onValueChange={(newViewType: ViewType) => {
                  setViewType(newViewType);
                }}>
                  <SelectTrigger className="w-full sm:w-32 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="일별 보기">일별 보기</SelectItem>
                    <SelectItem value="월별 보기">월별 보기</SelectItem>
                    <SelectItem value="년별 보기">년별 보기</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex dark:bg-slate-700 items-center gap-2 px-3 py-2 rounded-lg h-10 w-full sm:w-auto justify-start"
                    >
                      <Calendar className="h-4 w-4 text-gray-600 dark:bg-slate-700 dark:text-white flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-white truncate">
                        {viewType === "일별 보기" ? selectedDate : viewType === "월별 보기" ? selectedMonth : selectedYear}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    {viewType === "일별 보기" ? (
                      <div className="p-0">
                        <CalendarComponent
                          mode="single"
                          selected={calendarDate}
                          onSelect={handleDateSelect}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(23, 59, 59, 999);
                            return date > today;
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t">
                          <Button 
                            size="sm" 
                            className="w-full bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700" 
                            onClick={handleGoToToday}
                          >
                            오늘
                          </Button>
                        </div>
                      </div>
                    ) : viewType === "년별 보기" ? (
                      <div className="p-4 space-y-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">년도 선택</div>
                        <div className="flex justify-center">
                          <Select
                            value={selectedYear}
                            onValueChange={handleYearSelect}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => 2023 + i).map((year) => {
                                const currentYear = new Date().getFullYear();
                                return (
                                  <SelectItem key={year} value={`${year}년`} disabled={year > currentYear}>
                                    {year}년
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => setIsCalendarOpen(false)}>
                            확인
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700" 
                            onClick={handleGoToToday}
                          >
                            오늘
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">년월 선택</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={selectedYear}
                            onValueChange={(year) => {
                              setSelectedYear(year);
                              const month = selectedMonth.split(" ")[1];
                              const newDate = `${year} ${month}`;
                              setSelectedMonth(newDate);
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => 2023 + i).map((year) => {
                                const currentYear = new Date().getFullYear();
                                return (
                                  <SelectItem key={year} value={`${year}년`} disabled={year > currentYear}>
                                    {year}년
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Select
                            value={selectedMonth.split(" ")[1]}
                            onValueChange={(month) => {
                              const year = selectedYear;
                              const newDate = `${year} ${month}`;
                              setSelectedMonth(newDate);
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                const currentYear = new Date().getFullYear();
                                const currentMonth = new Date().getMonth() + 1;
                                const selectedYearNum = parseInt(selectedYear);
                                return (
                                  <SelectItem 
                                    key={month} 
                                    value={`${String(month).padStart(2, "0")}월`}
                                    disabled={selectedYearNum === currentYear && month > currentMonth}
                                  >
                                    {month}월
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1" onClick={() => setIsCalendarOpen(false)}>
                            확인
                          </Button>
                          <Button 
                            size="sm" 
                            className="flex-1 bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700" 
                            onClick={handleGoToToday}
                          >
                            오늘
                          </Button>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {viewType === "일별 보기" && !isClockTab && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-slate-400">시간 단위:</span>
                    <Select value={graphUnit} onValueChange={(newUnit: GraphUnit) => {
                      setGraphUnit(newUnit);
                      setChartKey(prev => prev + 1);
                    }}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarter">15분</SelectItem>
                        <SelectItem value="hour">1시간</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              )}
            </div>
          </div>

          {/* 차트 섹션 */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === "제어현황" 
                  ? (viewType === "일별 보기" ? "일일 제어현황" : viewType === "월별 보기" ? "월별 제어현황" : "년별 제어현황")
                  : viewType === "월별 보기" ? `월별 ${activeTab} (${currentTab?.unit})` : viewType === "년별 보기" ? `년별 ${activeTab} (${currentTab?.unit})` : `일일 ${activeTab} (${currentTab?.unit})`
                }
              </h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <Button 
                  size="sm" 
                  className="bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700 h-10 w-full sm:w-auto flex items-center gap-2"
                  onClick={handleRefresh}
                  disabled={isLoading || isFetching || excelLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${(isLoading || isFetching) ? 'animate-spin' : ''}`} />
                  {isLoading || isFetching ? "로딩 중..." : "새로고침"}
                </Button>
                
                <Button 
                  size="sm" 
                  className="bg-purple-500 dark:text-white hover:bg-green-700 h-10 w-full sm:w-auto"
                  onClick={() => handleExcelSave(chartRef)}
                  disabled={isLoading || isFetching || excelLoading}
                >
                  {excelLoading ? "저장 중..." : "엑셀 저장"}
                </Button>
              </div>
            </div>

            {/* 제어현황 탭일 때는 모든 보기에서 제어횟수 표시 (차트 대신 표 요약) */}
            {activeTab === "제어현황" ? (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <div className="flex justify-center">
                    <Table className="w-auto">
                      <TableBody>
                        <TableRow className="bg-green-50 border-t-2 border-green-200 hover:bg-green-100">
                          <TableCell className="font-bold text-sm text-green-800 border-r border-green-200 text-center px-8">
                            {viewType === "일별 보기" ? "일별 제어횟수" : viewType === "월별 보기" ? "월별 제어횟수" : "년별 제어횟수"}
                          </TableCell>
                          <TableCell className="text-center font-bold text-sm text-green-800 border-r border-green-200 px-8">
                            {(summaryData.totalControlCount || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                        {/* 총 제어시간은 표기하지 않음 */}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 범례 */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-white">
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('main')}>
                    <div
                      className={`w-3 h-3 rounded-full border ${visibleSeries.main ? '' : 'opacity-30 border-gray-400'}`}
                      style={currentTabColorStyle}
                    ></div>
                    <span className={visibleSeries.main ? '' : 'opacity-30'}>{activeTab}</span>
                  </div>
                  {/* 실시간 데이터 범례 */}
                  {isTodaySelectedForLive && (activeTab === "전력 피크" || activeTab === "전력 사용량") && realtimeDataRef.current && (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getBarColor2(currentTab?.color) }}></div>
                      <span className="font-medium animate-pulse" style={{ color: getBarColor2(currentTab?.color) }}>실시간</span>
                      {isRefetching && (
                        <span className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
                          (데이터 재갱신 중...)
                        </span>
                      )}
                    </div>
                  )}
                  {viewType === '월별 보기' ? (
                    <>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('prev')}>
                        <div className={`w-3 h-3 rounded-full dark:text-white bg-green-500 border ${visibleSeries.prev ? '' : 'opacity-30 border-gray-400'}`}></div>
                        <span className={visibleSeries.prev ? '' : 'opacity-30'}>전월</span>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('compare')}>
                        <div className={`w-3 h-3 rounded-full dark:text-white bg-orange-500 border ${visibleSeries.compare ? '' : 'opacity-30 border-gray-400'}`}></div>
                        <span className={visibleSeries.compare ? '' : 'opacity-30'}>
                          전년동월
                        </span>
                      </div>
                    </>
                  ) : viewType === '년별 보기' ? (
                    <>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('prev')}>
                        <div className={`w-3 h-3 rounded-full dark:text-white bg-green-500 border ${visibleSeries.prev ? '' : 'opacity-30 border-gray-400'}`}></div>
                        <span className={visibleSeries.prev ? '' : 'opacity-30'}>작년</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('prev')}>
                        <div className={`w-3 h-3 rounded-full dark:text-white bg-green-500 border ${visibleSeries.prev ? '' : 'opacity-30 border-gray-400'}`}></div>
                        <span className={visibleSeries.prev ? '' : 'opacity-30'}>전일</span>
                      </div>
                      <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('compare')}>
                        <div className={`w-3 h-3 rounded-full dark:text-white bg-orange-500 border ${visibleSeries.compare ? '' : 'opacity-30 border-gray-400'}`}></div>
                        <span className={visibleSeries.compare ? '' : 'opacity-30'}>
                          전월동일
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* 차트 */}
                <div className="h-auto sm:h-96 bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6" ref={chartRef}>
                  <UsageChart
                    chartData={chartData}
                    loading={false}
                    isLoading={isLoading || isFetching}
                    activeTab={activeTab}
                    theme={theme}
                    currentTab={currentTab}
                    visibleSeries={visibleSeries}
                    viewType={viewType}
                    graphUnit={graphUnit}
                    effectiveGraphUnit={effectiveGraphUnit}
                    chartKey={chartKey}
                    getBarColor={getBarColor}
                    getBarColor2={getBarColor2}
                    isTodaySelectedForLive={isTodaySelectedForLive}
                    getCurrentTimeKey={getCurrentTimeKey}
                  />
                </div>
              </>
            )}
            
          </div>
        </CardContent>
      </Card>

      {/* 데이터 테이블: 모든 보기에서 표시 */}
      <div className="relative">
        <ReportDataTable
          reportData={reportData as any}
          loading={isLoading || isFetching}
          activeTab={activeTab}
          graphUnit={graphUnit}
          viewType={viewType}
          onReachNextSlot={() => {
            // 다음 오버레이 슬롯(시/쿼터)이 시작되면 최신 데이터를 한 번 동기화
            if (!isLoading && !isFetching) {
              refetchCurrentData?.();
            }
          }}
        />
      </div>
      
      {/* API 에러 알림 */}
      <ApiErrorNotification />
    </div>
  );
};

export default UsageReportPage;
