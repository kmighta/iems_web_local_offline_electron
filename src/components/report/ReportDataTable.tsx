/**
 * 보고서 데이터 테이블 컴포넌트
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActiveTab, GraphUnit, ViewType } from "@/types/report";
import { HourlyReportData, MonthlyReportData, YearlyReportData } from "@/types/api";
import useSettingsStore from '@/store/settingsStore';
import useRefetchControlStore from '@/store/refetchControlStore';

interface ReportDataTableProps {
  reportData?: HourlyReportData | MonthlyReportData | YearlyReportData;
  loading: boolean;
  activeTab: ActiveTab;
  graphUnit: GraphUnit;
  viewType?: ViewType; // 월/년 테이블 표시 제어용
  onReachNextSlot?: () => void; // 다음 오버레이 슬롯으로 이동 시 refetch 트리거
  onRefetchData?: () => Promise<void>; // 데이터 refetch 함수
}

// HH:MM:SS → MM:SS 포맷 변환 (이미지와 동일하게 분:초만 노출)
const formatTime = (hhmmss?: string) => {
  if (!hhmmss) return '-';
  //if (hhmmss === '00:00:00') return '-';

  try {
    const [h, m, s] = hhmmss.split(':').map((v) => parseInt(v, 10));
    const totalSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  } catch {
    return '-';
  }
};
const formatTime2 = (hhmmss?: string) => {
  if (!hhmmss) return '-';
  if (hhmmss === '00:00:00') return '-';
  try {
    const [h, m, s] = hhmmss.split(':').map((v) => parseInt(v, 10));
    const totalSeconds = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
    const mm = Math.floor(totalSeconds / 60);
    const ss = totalSeconds % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  } catch {
    return '-';
  }
};

// 총 합계 전용: HH:MM:SS 표기. 입력이 MM:SS 또는 00:MM:SS이면 시간대(hourFallback)로 시를 보완
const toHHMMSS = (time?: string, hourFallback?: number) => {
  if (!time) return '-';
  if (time === '00:00:00') return '-';
  try {
    const parts = time
      .split(':')
      .map((v) => parseInt(v, 10))
      .filter((n) => !Number.isNaN(n));
    if (parts.length === 3) {
      let [h, m, s] = parts;
      if (h === 0 && typeof hourFallback === 'number') {
        h = hourFallback;
      }
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    if (parts.length === 2) {
      const [m, s] = parts;
      const h = typeof hourFallback === 'number' ? hourFallback : 0;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return '-';
  } catch {
    return '-';
  }
};

const ReportDataTable: React.FC<ReportDataTableProps> = ({ 
  reportData, 
  loading, 
  activeTab, 
  graphUnit,
  viewType = '일별 보기',
  onReachNextSlot,
  onRefetchData
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500 dark:text-gray-300">테이블 데이터를 불러오는 중...</div>
      </div>
    );
  }

  // 월별 테이블
  if (viewType === '월별 보기') {
    return <MonthlyDataTable reportData={reportData as MonthlyReportData} activeTab={activeTab} />;
  }

  // 연별 테이블
  if (viewType === '년별 보기') {
    return <YearlyDataTable reportData={reportData as YearlyReportData} activeTab={activeTab} />;
  }

  // 15분 단위 데이터 처리
  if (viewType === '일별 보기' && graphUnit === "quarter") {
    return <QuarterDataTable reportData={reportData as HourlyReportData} activeTab={activeTab} onReachNextSlot={onReachNextSlot} onRefetchData={onRefetchData} />;
  }

  // 1시간 단위 데이터 처리
  return <HourlyDataTable reportData={reportData as HourlyReportData} activeTab={activeTab} onReachNextSlot={onReachNextSlot} onRefetchData={onRefetchData} />;
};

/**
 * 1시간 단위 데이터 테이블
 */
const HourlyDataTable: React.FC<{ reportData?: HourlyReportData; activeTab: ActiveTab; onReachNextSlot?: () => void; onRefetchData?: () => Promise<void> }> = ({ 
  reportData, 
  activeTab,
  onReachNextSlot,
  onRefetchData
}) => {
  const { deviceInfo } = useSettingsStore();
  const { hasTriggered, setTriggered, resetTriggers } = useRefetchControlStore();
  
  // 현재 피크셀 상태를 저장하기 위한 ref
  const lastPeakCellRef = useRef<string | null>(null);
  // 날짜 불일치로 인한 1회 refetch 제어
  const didRefetchOnDateMismatchRef = useRef<boolean>(false);

  // PLC 시간 기준으로 보고서 날짜가 오늘인지 판단
  const isReportDateToday = (() => {
    try {
      const target = reportData?.targetDate;
      if (!target) return false;
      
      // PLC 시간 기준으로 오늘 날짜 판단
      const plcTimeStr = deviceInfo?.plc_time || deviceInfo?.plcTime;
      if (!plcTimeStr) return false;
      
      const plcDate = new Date(plcTimeStr);
      // 로컬 시간대 기준으로 날짜 추출 (UTC 변환 방지)
      const year = plcDate.getFullYear();
      const month = String(plcDate.getMonth() + 1).padStart(2, '0');
      const day = String(plcDate.getDate()).padStart(2, '0');
      const plcDateStr = `${year}-${month}-${day}`;
      return target === plcDateStr;
    } catch {
      return false;
    }
  })();

  // 실시간 정보 (당일 + 다음날 00:00까지 표시)
  const realtime = useMemo(() => {
    try {
      const plcTimeStr = deviceInfo?.plc_time || deviceInfo?.plcTime;
      const plcDate = plcTimeStr ? new Date(plcTimeStr) : null;
      
      // PLC 시간 기준으로 실시간 활성화 판단
      // PLC 시간이 유효하고 오늘 날짜인 경우에만 실시간 활성화
      const isRealtimeActive = plcDate !== null && isReportDateToday;
      const hour = plcDate ? plcDate.getHours() : null;
      const demandTime = Number(deviceInfo?.demand_time ?? deviceInfo?.demandTime ?? 0);

      const peak1 = Number(deviceInfo?.peak1 || 0);
      const peak2 = Number(deviceInfo?.peak2 || 0);
      const peak3 = Number(deviceInfo?.peak3 || 0);
      const peak4 = Number(deviceInfo?.peak4 || 0);
      // peak4plus가 없을 경우 peakplus로도 수용 (웹소켓 필드 편차 대응)
      const peak4plus = Number((deviceInfo as any)?.peak4plus ?? (deviceInfo as any)?.peakplus ?? 0);
      const usageKwh = Math.round(((Number(deviceInfo?.usage || 0) / 1000)) * 1000) / 1000;

      // 최대부하 실시간 값 (W → kW) 및 시간(16진수 MMSS → MM:SS)
      const ctrlMaxLoadW = Number((deviceInfo as any)?.ctrl_max_load ?? (deviceInfo as any)?.ctrlMaxLoad ?? 0);
      const ctrlMaxLoadKw = Math.round(((ctrlMaxLoadW / 1000)) * 1000) / 1000;
      const ctrlMaxLoadTimeRaw = (deviceInfo as any)?.ctrl_max_load_time ?? (deviceInfo as any)?.ctrlMaxLoadTime;
      const ctrlMaxLoadTimeLabel = (() => {
        if (ctrlMaxLoadTimeRaw === undefined || ctrlMaxLoadTimeRaw === null || ctrlMaxLoadTimeRaw === '') return '-';
        const numeric = Number(ctrlMaxLoadTimeRaw);
        if (Number.isNaN(numeric)) return '-';

        const hex = numeric.toString(16).toUpperCase().padStart(4, '0'); // MMSS
        const mmHex = hex.slice(0, 2);
        const ssHex = hex.slice(2, 4);

        const mm = parseInt(mmHex, 16);
        const ss = parseInt(ssHex, 16);

        if (Number.isNaN(mm) || Number.isNaN(ss)) return '-';
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      })();

      // 진행 피크 판단: 1차 기준은 웹소켓 peak_position 사용, 없으면 기존 규칙 사용
      let activePeak: 1 | 2 | 3 | 4 | null = null;
      const peakPosition = Number((deviceInfo as any)?.peak_position ?? (deviceInfo as any)?.peakPosition ?? 0);
      if (peakPosition >= 1 && peakPosition <= 4) {
        activePeak = peakPosition as 1 | 2 | 3 | 4;
      } else {
        const has1 = peak1 > 0, has2 = peak2 > 0, has3 = peak3 > 0, has4 = peak4 > 0;
        if (has1 && !has2 && !has3 && !has4) activePeak = 1;
        else if (has1 && has2 && !has3 && !has4) activePeak = 2;
        else if (has1 && has2 && has3 && !has4) activePeak = 3;
        else if (has1 && has2 && has3 && has4) activePeak = 4;
      }

      return { isToday: isRealtimeActive, hour, demandTime, activePeak, peak1, peak2, peak3, peak4, peak4plus, usageKwh, ctrlMaxLoadKw, ctrlMaxLoadTimeLabel };
    } catch {
      return { isToday: false, hour: null, demandTime: 0, activePeak: null, peak1: 0, peak2: 0, peak3: 0, peak4: 0, peak4plus: 0, usageKwh: 0, ctrlMaxLoadKw: 0, ctrlMaxLoadTimeLabel: '-' };
    }
  }, [deviceInfo]);

  // 23:45 → 00:00 날짜 전환 시, PLC 날짜와 report 날짜가 불일치하면 1회 refetch
  useEffect(() => {
    try {
      if (!onRefetchData) return;
      const target = reportData?.targetDate;
      const plcTimeStr = deviceInfo?.plc_time || deviceInfo?.plcTime;
      if (!target || !plcTimeStr) return;

      const plcDate = new Date(plcTimeStr);
      const y = plcDate.getFullYear();
      const m = String(plcDate.getMonth() + 1).padStart(2, '0');
      const d = String(plcDate.getDate()).padStart(2, '0');
      const plcDateStr = `${y}-${m}-${d}`;

      const isMismatch = target !== plcDateStr;
      if (isMismatch && !didRefetchOnDateMismatchRef.current) {
        didRefetchOnDateMismatchRef.current = true;
        onRefetchData();
      }

      if (!isMismatch) {
        // 날짜가 다시 일치하면 다음 전환을 위해 초기화
        didRefetchOnDateMismatchRef.current = false;
      }
    } catch {}
  }, [reportData?.targetDate, deviceInfo?.plc_time, deviceInfo?.plcTime, onRefetchData]);

  const renderOverlay = (valueText: string, showDemandTime: boolean, peakLabel?: string) => {
    // peak4plus가 1일 때는 초와 피크 라벨 숨기기
    const hideTimeAndPeak = realtime.peak4plus === 1;
    
    return (
      <span className="inline-block ml-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 animate-pulse">
        {valueText}
        {showDemandTime && !hideTimeAndPeak ? ` (${realtime.demandTime}초)` : ''}
        {peakLabel && !hideTimeAndPeak ? (
          <span className="ml-2 text-[10px] font-medium text-green-700 dark:text-green-200 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
            Peak {peakLabel}
          </span>
        ) : null}
      </span>
    );
  };

  // 다음 오버레이 슬롯으로 이동 감지 (시 변경)
  const prevSlotRef = useRef<number | null>(null);
  const prevDemandTimeRef = useRef<number | null>(null);
  const prevPeak4PlusRef = useRef<number | null>(null);
  
  // 피크셀 상태 변경 감지 및 새로고침
  useEffect(() => {
    if (!realtime.isToday) return;
    
    const currentPeakCell = realtime.activePeak ? `peak${realtime.activePeak}` : 'none';
    
    // 이전 피크셀과 다르고, 이전 값이 존재하는 경우 (초기 로드 제외)
    if (lastPeakCellRef.current !== null && lastPeakCellRef.current !== currentPeakCell) {
       console.log('피크셀 변경 감지:', { 
         from: lastPeakCellRef.current, 
         to: currentPeakCell,
         timestamp: new Date().toISOString()
       });
       
       // 데이터 refetch
       // window.location.reload();
    }
    
    // 현재 피크셀 상태 저장
    lastPeakCellRef.current = currentPeakCell;
  }, [realtime.activePeak, realtime.isToday]);
  useEffect(() => {
    if (!isReportDateToday || !realtime.isToday || realtime.hour === null) return;
    
    const currentSlot = realtime.hour;
    const currentDemandTime = realtime.demandTime;
    const currentPeak4Plus = realtime.peak4plus;
    
    // 1. 시간 변경 감지
    if (prevSlotRef.current !== null && prevSlotRef.current !== currentSlot) {
      // 시간이 변경되면 트리거 초기화
      resetTriggers();
      onReachNextSlot && onReachNextSlot();
    }
    
    // 2. 수요시간이 900초 넘어갈 때 새로고침
    if (prevDemandTimeRef.current !== null && 
        prevDemandTimeRef.current <= 900 && 
        currentDemandTime > 900) {
      console.log('수요시간 900초 초과 감지, 새로고침:', { prev: prevDemandTimeRef.current, current: currentDemandTime });
      onReachNextSlot && onReachNextSlot();
    }
    
    // 3. peak4plus가 1에서 0으로 변경될 때 한 번만 새로고침
    if (prevPeak4PlusRef.current === 1 && currentPeak4Plus === 0) {
      console.log('peak4plus 1→0 변경 감지, 새로고침:', { prev: prevPeak4PlusRef.current, current: currentPeak4Plus });
      onReachNextSlot && onReachNextSlot();
    }
    
    // 4. (요청) 1초/2초에서는 새로고침하지 않음
    
    // 상태 업데이트
    prevSlotRef.current = currentSlot;
    prevDemandTimeRef.current = currentDemandTime;
    prevPeak4PlusRef.current = currentPeak4Plus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtime.hour, realtime.demandTime, realtime.peak4plus, realtime.isToday, isReportDateToday]);
  // 0~23시까지 모든 시간대 생성
  const createHourlyTableData = () => {
    const fullData = [];
    const hourlyData = reportData?.hour || [];
    
    for (let hour = 0; hour < 24; hour++) {
      const timeString = `${String(hour).padStart(2, '0')}:00`;
      
      // 해당 시간의 데이터 찾기
      const foundData = hourlyData.find((item: any) => item.hour === hour);
      
      if (foundData) {
        const maxPeak = Math.max(
          foundData.peak1 || 0, 
          foundData.peak2 || 0, 
          foundData.peak3 || 0, 
          foundData.peak4 || 0
        );
        
        const row = {
          time: timeString,
          usage: foundData.usage > 0 ? Number((foundData.usage / 1000).toFixed(3)).toLocaleString() : '-',
          peak: maxPeak > 0 ? Number((maxPeak / 1000).toFixed(3)).toLocaleString() : '-',
          peak1: foundData.peak1 > 0 ? Number((foundData.peak1 / 1000).toFixed(3)).toLocaleString() : '-',
          peak2: foundData.peak2 > 0 ? Number((foundData.peak2 / 1000).toFixed(3)).toLocaleString() : '-',
          peak3: foundData.peak3 > 0 ? Number((foundData.peak3 / 1000).toFixed(3)).toLocaleString() : '-',
          peak4: foundData.peak4 > 0 ? Number((foundData.peak4 / 1000).toFixed(3)).toLocaleString() : '-',
          maxLoad: foundData.maxLoad > 0 ? Number((foundData.maxLoad / 1000).toFixed(3)).toLocaleString() : '-',
          reduction: foundData.reduction && foundData.reduction > 0 ? Number(foundData.reduction.toFixed(1)).toLocaleString() : '-',
          ctrlCount: foundData.totalCtrlCount ? foundData.totalCtrlCount.toLocaleString() : '-',
          ctrlMaxLoadTime: foundData.ctrlMaxLoadTime,
          // 제어시간 매핑 (HH:MM:SS 원본 유지; 표기 시 formatTime으로 변환)
          ctrlTime1: foundData.ctrlTime1,
          ctrlTime2: foundData.ctrlTime2,
          ctrlTime3: foundData.ctrlTime3,
          ctrlTime4: foundData.ctrlTime4,
          ctrlTime5: foundData.ctrlTime5,
          ctrlTime6: foundData.ctrlTime6,
          ctrlTime7: foundData.ctrlTime7,
          ctrlTime8: foundData.ctrlTime8,
          ctrlTime9: foundData.ctrlTime9,
          ctrlTime10: foundData.ctrlTime10,
          // 그룹별 감축량 매핑 (0.0일 때 - 표시)
          group1Reduction: foundData.group1Reduction && foundData.group1Reduction > 0 ? Number(foundData.group1Reduction.toFixed(1)).toLocaleString() : '-',
          group2Reduction: foundData.group2Reduction && foundData.group2Reduction > 0 ? Number(foundData.group2Reduction.toFixed(1)).toLocaleString() : '-',
          group3Reduction: foundData.group3Reduction && foundData.group3Reduction > 0 ? Number(foundData.group3Reduction.toFixed(1)).toLocaleString() : '-',
          group4Reduction: foundData.group4Reduction && foundData.group4Reduction > 0 ? Number(foundData.group4Reduction.toFixed(1)).toLocaleString() : '-',
          group5Reduction: foundData.group5Reduction && foundData.group5Reduction > 0 ? Number(foundData.group5Reduction.toFixed(1)).toLocaleString() : '-',
          group6Reduction: foundData.group6Reduction && foundData.group6Reduction > 0 ? Number(foundData.group6Reduction.toFixed(1)).toLocaleString() : '-',
          group7Reduction: foundData.group7Reduction && foundData.group7Reduction > 0 ? Number(foundData.group7Reduction.toFixed(1)).toLocaleString() : '-',
          group8Reduction: foundData.group8Reduction && foundData.group8Reduction > 0 ? Number(foundData.group8Reduction.toFixed(1)).toLocaleString() : '-',
          group9Reduction: foundData.group9Reduction && foundData.group9Reduction > 0 ? Number(foundData.group9Reduction.toFixed(1)).toLocaleString() : '-',
          group10Reduction: foundData.group10Reduction && foundData.group10Reduction > 0 ? Number(foundData.group10Reduction.toFixed(1)).toLocaleString() : '-',
        };
        fullData.push(row);
      } else {
        // 데이터가 없는 시간대는 모두 dash로 표시
        fullData.push({
          time: timeString,
          usage: '-',
          peak: '-',
          peak1: '-',
          peak2: '-',
          peak3: '-',
          peak4: '-',
          maxLoad: '-',
          reduction: '-',
          ctrlCount: '-',
          ctrlMaxLoadTime: undefined,
          ctrlTime1: undefined,
          ctrlTime2: undefined,
          ctrlTime3: undefined,
          ctrlTime4: undefined,
          ctrlTime5: undefined,
          ctrlTime6: undefined,
          ctrlTime7: undefined,
          ctrlTime8: undefined,
          ctrlTime9: undefined,
          ctrlTime10: undefined,
        });
      }
    }
    
    return fullData;
  };

  // 총 합계 계산
  const calculateTotals = () => {
    const hourlyData = reportData?.hour || [];
    
    const totalUsage = hourlyData.reduce((sum: number, item: any) => sum + (item.usage / 1000 || 0), 0);
    const totalReduction = hourlyData.reduce((sum: number, item: any) => sum + (item.reduction || 0), 0);
    const totalCtrlCount = hourlyData.reduce((sum: number, item: any) => sum + (item.totalCtrlCount || 0), 0);
    
    // 전력피크의 경우 일별 최대 피크값
    const allPeaks = hourlyData.flatMap((item: any) => [
      item.peak1 || 0, 
      item.peak2 || 0, 
      item.peak3 || 0, 
      item.peak4 || 0
    ]).filter(peak => peak > 0);
    
    const maxPeak = allPeaks.length > 0 ? Math.max(...allPeaks) / 1000 : 0;

    const peak1Max = Math.max(0, ...(hourlyData.map((i: any) => i.peak1 || 0))) / 1000;
    const peak2Max = Math.max(0, ...(hourlyData.map((i: any) => i.peak2 || 0))) / 1000;
    const peak3Max = Math.max(0, ...(hourlyData.map((i: any) => i.peak3 || 0))) / 1000;
    const peak4Max = Math.max(0, ...(hourlyData.map((i: any) => i.peak4 || 0))) / 1000;
    
    const maxLoad = hourlyData.length > 0
      ? Math.max(...hourlyData.map((item: any) => item.maxLoad || 0)) / 1000
      : 0;

    // 최대부하 시간 계산 (최대 부하량에 해당하는 시간 찾기)
    let maxLoadTimeFormatted = '-';
    if (hourlyData.length > 0) {
      const maxLoadItem = hourlyData.reduce((max: any, item: any) => {
        const currentMaxLoad = item.maxLoad || 0;
        const maxMaxLoad = max.maxLoad || 0;
        return currentMaxLoad > maxMaxLoad ? item : max;
      });
      
      if (maxLoadItem.ctrlMaxLoadTime && maxLoadItem.ctrlMaxLoadTime !== '-') {
        const hourFallback = typeof maxLoadItem.hour === 'number' ? maxLoadItem.hour : undefined;
        maxLoadTimeFormatted = toHHMMSS(maxLoadItem.ctrlMaxLoadTime, hourFallback);
      }
    }

    return {
      totalUsage: totalUsage > 0 ? Number(totalUsage.toFixed(3)).toLocaleString() : '-',
      totalReduction: Number(totalReduction.toFixed(1)).toLocaleString(),
      totalCtrlCount: totalCtrlCount.toLocaleString(),
      maxPeak: maxPeak > 0 ? Number(maxPeak.toFixed(3)).toLocaleString() : '-',
      maxLoad: maxLoad > 0 ? Number(maxLoad.toFixed(3)).toLocaleString() : '-',
      maxLoadTime: maxLoadTimeFormatted,
      peak1Max: peak1Max > 0 ? Number(peak1Max.toFixed(3)).toLocaleString() : '-',
      peak2Max: peak2Max > 0 ? Number(peak2Max.toFixed(3)).toLocaleString() : '-',
      peak3Max: peak3Max > 0 ? Number(peak3Max.toFixed(3)).toLocaleString() : '-',
      peak4Max: peak4Max > 0 ? Number(peak4Max.toFixed(3)).toLocaleString() : '-',
    };
  };

  const tableData = createHourlyTableData();
  const totals = calculateTotals();

  // 전력피크 특별 처리
  if (activeTab === "전력 피크") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
        {/*<div className="mb-4">*/}
        {/*  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">*/}
        {/*    <p className="text-sm text-green-700 dark:text-green-300">*/}
        {/*      <strong>전력피크:</strong> 0시부터 23시까지 피크1~4 개별 표시*/}
        {/*    </p>*/}
        {/*  </div>*/}
        {/*</div>*/}
        <Table style={{ minWidth: '800px', width: '100%', tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>피크1 (kW)</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>피크2 (kW)</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>피크3 (kW)</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>피크4 (kW)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, index) => {
              const isCurrentHour = realtime.isToday && realtime.hour !== null && row.time.startsWith(String(realtime.hour).padStart(2, '0'));
              return (
                <TableRow key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                  <TableCell className="text-center font-medium" style={{ width: '80px', minWidth: '80px' }}>{row.time}</TableCell>
                  {([1,2,3,4] as const).map((n) => {
                    const peakValue = Number((realtime as any)[`peak${n}`] ?? 0);
                    const showSeconds = true; // 전력 피크 탭에서도 수요시간 표시
                    const text = peakValue > 0 ? Number((peakValue/1000).toFixed(3)).toLocaleString() : '-';
                    const cellContent = isCurrentHour ? text : (row as any)[`peak${n}`];
                    const shouldOverlay = isCurrentHour && realtime.activePeak === n && peakValue > 0;
                    return (
                      <TableCell key={n} className="text-center">
                        {shouldOverlay ? renderOverlay(text, showSeconds) : cellContent}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
            {/* 합계 행: 피크1~4 각각의 최대값 표시 */}
            <TableRow className="bg-blue-50 dark:bg-blue-900/30 font-semibold border-t-2 border-blue-200 dark:border-blue-800">
              <TableCell className="text-center font-bold">일별 최대피크</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{totals.peak1Max} kW</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{totals.peak2Max} kW</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{totals.peak3Max} kW</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{totals.peak4Max} kW</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
        {/*  총 24시간 데이터 (0시 ~ 23시) • 데이터 개수: {reportData?.hour?.length || 0}*/}
        {/*</div>*/}
      </div>
    );
  }

  // 감축량 특별 처리 (시간, 총감축량, 1~10그룹 감축량)
  if (activeTab === "감축량") {
    const reductionRows = tableData.map((row: any) => ({
      time: row.time.replace(":00", "시"),
      totalReduction: row.reduction === '0.0' || row.reduction === 0 ? '-' : row.reduction,
      group1: row.group1Reduction === '0.0' || row.group1Reduction === 0 ? '-' : (row.group1Reduction || '-'),
      group2: row.group2Reduction === '0.0' || row.group2Reduction === 0 ? '-' : (row.group2Reduction || '-'),
      group3: row.group3Reduction === '0.0' || row.group3Reduction === 0 ? '-' : (row.group3Reduction || '-'),
      group4: row.group4Reduction === '0.0' || row.group4Reduction === 0 ? '-' : (row.group4Reduction || '-'),
      group5: row.group5Reduction === '0.0' || row.group5Reduction === 0 ? '-' : (row.group5Reduction || '-'),
      group6: row.group6Reduction === '0.0' || row.group6Reduction === 0 ? '-' : (row.group6Reduction || '-'),
      group7: row.group7Reduction === '0.0' || row.group7Reduction === 0 ? '-' : (row.group7Reduction || '-'),
      group8: row.group8Reduction === '0.0' || row.group8Reduction === 0 ? '-' : (row.group8Reduction || '-'),
      group9: row.group9Reduction === '0.0' || row.group9Reduction === 0 ? '-' : (row.group9Reduction || '-'),
      group10: row.group10Reduction === '0.0' || row.group10Reduction === 0 ? '-' : (row.group10Reduction || '-'),
    }));

    const totalReduction = (reportData?.hour || []).reduce((sum: number, item: any) => sum + (item.reduction || 0), 0);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
        <Table style={{ minWidth: '800px', width: '100%', tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>총감축량</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>1그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>2그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>3그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>4그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>5그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>6그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>7그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>8그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>9그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>10그룹</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reductionRows.map((r, index) => (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                <TableCell className="text-center font-medium">{r.time}</TableCell>
                <TableCell className="text-center">{r.totalReduction}</TableCell>
                <TableCell className="text-center">{r.group1}</TableCell>
                <TableCell className="text-center">{r.group2}</TableCell>
                <TableCell className="text-center">{r.group3}</TableCell>
                <TableCell className="text-center">{r.group4}</TableCell>
                <TableCell className="text-center">{r.group5}</TableCell>
                <TableCell className="text-center">{r.group6}</TableCell>
                <TableCell className="text-center">{r.group7}</TableCell>
                <TableCell className="text-center">{r.group8}</TableCell>
                <TableCell className="text-center">{r.group9}</TableCell>
                <TableCell className="text-center">{r.group10}</TableCell>
              </TableRow>
            ))}
            {/* 합계 행: 총감축량만 표기 */}
            <TableRow className="bg-blue-50 dark:bg-blue-900/30 font-semibold border-t-2 border-blue-200 dark:border-blue-800">
              <TableCell className="text-center font-bold">총 감축량</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{Number(totalReduction.toFixed(1)).toLocaleString()} kWh</TableCell>
              <TableCell className="text-center" colSpan={10}>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
        {/*  총 24시간 데이터 (0시 ~ 23시)*/}
        {/*</div>*/}
      </div>
    );
  }

  // 제어현황 특별 처리 (시간, 제어횟수, 1~10제어 시간)
  if (activeTab === "제어현황") {
    const controlRows = tableData.map((row: any) => ({
      time: row.time.replace(":00", "시"),
      ctrlCount: typeof row.ctrlCount === 'number' ? row.ctrlCount : (row.ctrlCount || '-'),
      // HH:MM:SS → MM:SS 표시
      t1: formatTime2(row.ctrlTime1),
      t2: formatTime2(row.ctrlTime2),
      t3: formatTime2(row.ctrlTime3),
      t4: formatTime2(row.ctrlTime4),
      t5: formatTime2(row.ctrlTime5),
      t6: formatTime2(row.ctrlTime6),
      t7: formatTime2(row.ctrlTime7),
      t8: formatTime2(row.ctrlTime8),
      t9: formatTime2(row.ctrlTime9),
      t10: formatTime2(row.ctrlTime10),
    }));

    const totalCtrlCount = (reportData?.hour || []).reduce((sum: number, item: any) => sum + (item.totalCtrlCount || 0), 0);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
        <Table style={{ minWidth: '800px', width: '100%', tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>제어횟수</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>1제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>2제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>3제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>4제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>5제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>6제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>7제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>8제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>9제어</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>10제어</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controlRows.map((r, index) => (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                <TableCell className="text-center font-medium">{r.time}</TableCell>
                <TableCell className="text-center">{r.ctrlCount}</TableCell>
                <TableCell className="text-center">{r.t1}</TableCell>
                <TableCell className="text-center">{r.t2}</TableCell>
                <TableCell className="text-center">{r.t3}</TableCell>
                <TableCell className="text-center">{r.t4}</TableCell>
                <TableCell className="text-center">{r.t5}</TableCell>
                <TableCell className="text-center">{r.t6}</TableCell>
                <TableCell className="text-center">{r.t7}</TableCell>
                <TableCell className="text-center">{r.t8}</TableCell>
                <TableCell className="text-center">{r.t9}</TableCell>
                <TableCell className="text-center">{r.t10}</TableCell>
              </TableRow>
            ))}
            {/* 합계 행: 제어횟수 총합만 표기 */}
            <TableRow className="bg-blue-50 dark:bg-blue-900/30 font-semibold border-t-2 border-blue-200 dark:border-blue-800">
              <TableCell className="text-center font-bold">총 제어횟수</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{totalCtrlCount.toLocaleString()}</TableCell>
              <TableCell className="text-center" colSpan={10}>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
        {/*  총 24시간 데이터 (0시 ~ 23시)*/}
        {/*</div>*/}
      </div>
    );
  }

  // 일반 탭 처리 (전력 피크, 감축량, 제어현황은 위에서 특별 처리됨)
  const getUnit = () => {
    switch (activeTab) {
      case '전력 사용량': return 'kWh';
      case '최대부하': return 'kW';
      default: return 'kWh';
    }
  };

  const getValueColumn = (row: any) => {
    switch (activeTab) {
      case '전력 사용량': return row.usage;
      case '최대부하': return row.maxLoad;
      default: return row.usage;
    }
  };

  const getLoadTimeColumn = (row: any) => {
    switch (activeTab) {
      case '최대부하': return (row.maxLoad ?? 0) > 0 ? formatTime(row.ctrlMaxLoadTime) : '-';
      default: return '-';
    }
  };

  const getTotalValue = () => {
    switch (activeTab) {
      case '전력 사용량': {
        // 실시간 데이터가 있으면 합계에 반영
        if (isReportDateToday && realtime.isToday && realtime.hour !== null) {
          const hourlyData = reportData?.hour || [];
          const baseTotal = hourlyData.reduce((sum: number, item: any) => sum + (item.usage / 1000 || 0), 0);
          // 현재 시간의 기존 값을 빼고 실시간 값을 더함
          const currentHourData = hourlyData.find((item: any) => item.hour === realtime.hour);
          const currentHourUsage = currentHourData ? currentHourData.usage / 1000 : 0;
          const realtimeTotal = baseTotal - currentHourUsage + realtime.usageKwh;
          return `${Number(realtimeTotal.toFixed(3)).toLocaleString()} kWh`;
        }
        return `${totals.totalUsage} kWh`;
      }
      case '전력 피크' as ActiveTab: return `${totals.maxPeak} kW (최대)`;
      case '최대부하': return `${totals.maxLoad} kW (최대)`;
      default: return `${totals.totalUsage} kWh`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
      {/*{isReportDateToday && (*/}
      {/*  <div className="mb-4">*/}
      {/*    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">*/}
      {/*      <p className="text-sm text-green-700 dark:text-green-300">*/}
      {/*        <strong>실시간 데이터:</strong> 0시부터 23시까지 전체 시간대 표시*/}
      {/*      </p>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*)}*/}
      <Table style={{ minWidth: '400px', width: '100%', tableLayout: 'fixed' }}>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
            <TableHead className="text-center font-semibold" style={{ width: '120px', minWidth: '120px' }}>{activeTab} ({getUnit()})</TableHead>
            {activeTab === '최대부하' && (
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>부하시간</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row, index) => {
            // 실시간 데이터는 항상 '현재 시간' 행에 표시
            let isCurrentHour = false;
            if (isReportDateToday && realtime.isToday && realtime.hour !== null) {
              const currentHour = String(realtime.hour).padStart(2, '0');
              isCurrentHour = row.time.startsWith(currentHour);
            }
            
            return (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                <TableCell className="text-center font-medium" style={{ width: '80px', minWidth: '80px' }}>{row.time}</TableCell>
                <TableCell className="text-center" style={{ width: '120px', minWidth: '120px' }}>
                {activeTab === '전력 사용량' && isCurrentHour
                  ? renderOverlay(`${Number(realtime.usageKwh.toFixed(3)).toLocaleString()}`, true, realtime.activePeak ? String(realtime.activePeak) : undefined)
                  : activeTab === '최대부하' && isCurrentHour && (realtime.ctrlMaxLoadKw || 0) > 0
                    ? `${Number(realtime.ctrlMaxLoadKw.toFixed(3)).toLocaleString()}`
                    : getValueColumn(row)}
                </TableCell>
                {activeTab === '최대부하' && (
                  <TableCell className="text-center" style={{ width: '100px', minWidth: '100px' }}>{isCurrentHour && realtime.ctrlMaxLoadTimeLabel !== '-' ? realtime.ctrlMaxLoadTimeLabel : getLoadTimeColumn(row)}</TableCell>
                )}
              </TableRow>
            );
          })}
          {/* 합계 행 */}
          <TableRow className="bg-blue-50 dark:bg-blue-900/30 font-semibold border-t-2 border-blue-200 dark:border-blue-800">
            <TableCell className="text-center font-bold" style={{ width: '80px', minWidth: '80px' }}>총 합계</TableCell>
            <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300" style={{ width: '120px', minWidth: '120px' }}>
              {getTotalValue()}
            </TableCell>
            {activeTab === '최대부하' && (
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300" style={{ width: '100px', minWidth: '100px' }}>
                {totals.maxLoadTime}
              </TableCell>
            )}
          </TableRow>
        </TableBody>
      </Table>
      {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
      {/*  총 24시간 데이터 (0시 ~ 23시) • 데이터 개수: {reportData?.hour?.length || 0}*/}
      {/*</div>*/}
    </div>
  );
};

/**
 * 15분 단위 데이터 테이블
 */
const QuarterDataTable: React.FC<{ reportData?: HourlyReportData; activeTab: ActiveTab; onReachNextSlot?: () => void; onRefetchData?: () => Promise<void> }> = ({ 
  reportData, 
  activeTab,
  onReachNextSlot,
  onRefetchData
}) => {
  const { deviceInfo } = useSettingsStore();
  const { hasTriggered, setTriggered, resetTriggers } = useRefetchControlStore();
  
  // 현재 피크셀 상태를 저장하기 위한 ref
  const lastPeakCellRef = useRef<string | null>(null);
  // 날짜 불일치로 인한 1회 refetch 제어
  const didRefetchOnDateMismatchRef = useRef<boolean>(false);
  
  const isReportDateToday = (() => {
    try {
      const target = reportData?.targetDate;
      if (!target) return false;
      
      // PLC 시간 기준으로 오늘 날짜 판단
      const plcTimeStr = deviceInfo?.plc_time || deviceInfo?.plcTime;
      if (!plcTimeStr) return false;
      
      const plcDate = new Date(plcTimeStr);
      // 로컬 시간대 기준으로 날짜 추출 (UTC 변환 방지)
      const year = plcDate.getFullYear();
      const month = String(plcDate.getMonth() + 1).padStart(2, '0');
      const day = String(plcDate.getDate()).padStart(2, '0');
      const plcDateStr = `${year}-${month}-${day}`;
      console.log("QuarterDataTable isReportDateToday 체크:", { 
        target, 
        plcTimeStr, 
        plcDate: plcDate.toString(), 
        plcDateStr, 
        match: target === plcDateStr 
      });
      return target === plcDateStr;
    } catch {
      return false;
    }
  })();
  const rt = useMemo(() => {
    try {
      const plcTimeStr = deviceInfo?.plc_time || deviceInfo?.plcTime;
      const plcDate = plcTimeStr ? new Date(plcTimeStr) : null;
      
      // PLC 시간 기준으로 실시간 활성화 판단
      // PLC 시간이 유효하고 오늘 날짜인 경우에만 실시간 활성화
      const isRealtimeActive = plcDate !== null && isReportDateToday;
      const hour = plcDate ? plcDate.getHours() : null;
      const minute = plcDate ? plcDate.getMinutes() : null;
      const quarter = minute !== null ? Math.floor(minute / 15) : null;
      const demandTime = Number(deviceInfo?.demand_time ?? deviceInfo?.demandTime ?? 0);
      const usageKwh = Math.round(((Number(deviceInfo?.usage || 0) / 1000)) * 1000) / 1000;
      const p = { p1: Number(deviceInfo?.peak1||0), p2: Number(deviceInfo?.peak2||0), p3: Number(deviceInfo?.peak3||0), p4: Number(deviceInfo?.peak4||0), p4plus: Number((deviceInfo as any)?.peak4plus ?? (deviceInfo as any)?.peakplus ?? 0) };
      // 최대부하 실시간 값 (W → kW) 및 시간(16진수 MMSS → MM:SS)
      const ctrlMaxLoadW = Number((deviceInfo as any)?.ctrl_max_load ?? (deviceInfo as any)?.ctrlMaxLoad ?? 0);
      const ctrlMaxLoadKw = Math.round(((ctrlMaxLoadW / 1000)) * 1000) / 1000;
      const ctrlMaxLoadTimeRaw = (deviceInfo as any)?.ctrl_max_load_time ?? (deviceInfo as any)?.ctrlMaxLoadTime;
      const ctrlMaxLoadTimeLabel = (() => {
        if (ctrlMaxLoadTimeRaw === undefined || ctrlMaxLoadTimeRaw === null || ctrlMaxLoadTimeRaw === '') return '-';
        const numeric = Number(ctrlMaxLoadTimeRaw);
        if (Number.isNaN(numeric)) return '-';

        const hex = numeric.toString(16).toUpperCase().padStart(4, '0'); // MMSS
        const mmHex = hex.slice(0, 2);
        const ssHex = hex.slice(2, 4);

        const mm = parseInt(mmHex, 16);
        const ss = parseInt(ssHex, 16);

        if (Number.isNaN(mm) || Number.isNaN(ss)) return '-';
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
      })();
      // 진행 피크 판단: 1차 기준은 웹소켓 peak_position 사용, 없으면 기존 규칙 사용
      let activePeak: 1|2|3|4|null = null; 
      const peakPosition = Number((deviceInfo as any)?.peak_position ?? (deviceInfo as any)?.peakPosition ?? 0);
      if (peakPosition >= 1 && peakPosition <= 4) {
        activePeak = peakPosition as 1|2|3|4;
      } else {
        const h1=p.p1>0,h2=p.p2>0,h3=p.p3>0,h4=p.p4>0;
        if (h1&&!h2&&!h3&&!h4) activePeak=1; else if (h1&&h2&&!h3&&!h4) activePeak=2; else if (h1&&h2&&h3&&!h4) activePeak=3; else if (h1&&h2&&h3&&h4) activePeak=4;
      }
      return { isToday: isRealtimeActive, hour, quarter, demandTime, usageKwh, p, activePeak, ctrlMaxLoadKw, ctrlMaxLoadTimeLabel };
    } catch { return { isToday:false, hour:null, quarter:null, demandTime:0, usageKwh:0, p:{p1:0,p2:0,p3:0,p4:0,p4plus:0}, activePeak:null }; }
  }, [deviceInfo]);

  // 23:45 → 00:00 날짜 전환 시, PLC 날짜와 report 날짜가 불일치하면 1회 refetch
  useEffect(() => {
    try {
      if (!onRefetchData) return;
      const target = reportData?.targetDate;
      const plcTimeStr = deviceInfo?.plc_time || deviceInfo?.plcTime;
      if (!target || !plcTimeStr) return;

      const plcDate = new Date(plcTimeStr);
      const y = plcDate.getFullYear();
      const m = String(plcDate.getMonth() + 1).padStart(2, '0');
      const d = String(plcDate.getDate()).padStart(2, '0');
      const plcDateStr = `${y}-${m}-${d}`;

      const isMismatch = target !== plcDateStr;
      if (isMismatch && !didRefetchOnDateMismatchRef.current) {
        didRefetchOnDateMismatchRef.current = true;
        onRefetchData();
      }

      if (!isMismatch) {
        // 날짜가 다시 일치하면 다음 전환을 위해 초기화
        didRefetchOnDateMismatchRef.current = false;
      }
    } catch {}
  }, [reportData?.targetDate, deviceInfo?.plc_time, deviceInfo?.plcTime, onRefetchData]);
  
  // 피크셀 상태 변경 감지 및 새로고침
  useEffect(() => {
    if (!rt.isToday) return;
    
    const currentPeakCell = rt.activePeak ? `peak${rt.activePeak}` : 'none';
    
    // 이전 피크셀과 다르고, 이전 값이 존재하는 경우 (초기 로드 제외)
    if (lastPeakCellRef.current !== null && lastPeakCellRef.current !== currentPeakCell) {
       console.log('QuarterDataTable 피크셀 변경 감지:', { 
         from: lastPeakCellRef.current, 
         to: currentPeakCell,
         timestamp: new Date().toISOString()
       });
       
       // 데이터 refetch
       if (onRefetchData) {
         onRefetchData();
       }
    }
    
    // 현재 피크셀 상태 저장
    lastPeakCellRef.current = currentPeakCell;
  }, [rt.activePeak, rt.isToday]);

  const overlay = (text: string, showTime: boolean, peakLabel?: string) => {
    // peak4plus가 1일 때는 초와 피크 라벨 숨기기
    const hideTimeAndPeak = rt.p.p4plus === 1;
    
    return (
      <span className="inline-block ml-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 animate-pulse">
        {text}{showTime && !hideTimeAndPeak ? ` (${rt.demandTime}초)` : ''}
        {peakLabel && !hideTimeAndPeak ? (
          <span className="ml-2 text-[10px] font-medium text-green-700 dark:text-green-200 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded border border-green-200 dark:border-green-800">
            Peak {peakLabel}
          </span>
        ) : null}
      </span>
    );
  };

  // 다음 오버레이 슬롯(쿼터) 이동 감지
  const prevSlotRef = useRef<string | null>(null);
  const prevDemandTimeRef = useRef<number | null>(null);
  const prevPeak4PlusRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isReportDateToday || !rt.isToday || rt.hour === null || rt.quarter === null) return;
    
    const currentSlot = `${rt.hour}-${rt.quarter}`;
    const currentDemandTime = rt.demandTime;
    const currentPeak4Plus = rt.p.p4plus;
    
    // 1. 쿼터 변경 감지
    if (prevSlotRef.current !== null && prevSlotRef.current !== currentSlot) {
      // 쿼터가 변경되면 트리거 초기화
      resetTriggers();
      onReachNextSlot && onReachNextSlot();
    }
    
    // 2. 수요시간이 900초 넘어갈 때 새로고침
    if (prevDemandTimeRef.current !== null && 
        prevDemandTimeRef.current <= 900 && 
        currentDemandTime > 900) {
      console.log('수요시간 900초 초과 감지, 새로고침:', { prev: prevDemandTimeRef.current, current: currentDemandTime });
      onReachNextSlot && onReachNextSlot();
    }
    
    // 3. peak4plus가 1에서 0으로 변경될 때 한 번만 새로고침
    if (prevPeak4PlusRef.current === 1 && currentPeak4Plus === 0) {
      console.log('peak4plus 1→0 변경 감지, 새로고침:', { prev: prevPeak4PlusRef.current, current: currentPeak4Plus });
      onReachNextSlot && onReachNextSlot();
    }
    
    // 4. 1초/2초에서 각각 한 번만 리페치 (상태관리로 중복 방지)
    if ((currentDemandTime === 1 || currentDemandTime === 2) && !hasTriggered(currentDemandTime)) {
      setTriggered(currentDemandTime);
      console.log(`${currentDemandTime}초 감지, 새로고침:`, currentDemandTime);
      onReachNextSlot && onReachNextSlot();
    }
    
    // 상태 업데이트
    prevSlotRef.current = currentSlot;
    prevDemandTimeRef.current = currentDemandTime;
    prevPeak4PlusRef.current = currentPeak4Plus;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.hour, rt.quarter, rt.demandTime, rt.p.p4plus, rt.isToday, isReportDateToday]);
  // 15분 단위 데이터 생성 (quarter 0,1,2,3 → 00:00, 00:15, 00:30, 00:45)
  const createQuarterTableData = () => {
    const fullData = [];
    const quarterData = reportData?.quarter || [];
    
    // 24시간 * 4분기 = 96개 데이터
    for (let hour = 0; hour < 24; hour++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const minute = quarter * 15;
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        
        // quarter 데이터에서 해당 시간 찾기
        const foundData = quarterData.find((item: any) => {
          if (item.startTime) {
            const itemDate = new Date(item.startTime);
            return itemDate.getHours() === hour && Math.floor(itemDate.getMinutes() / 15) === quarter;
          }
          return false;
        });
        
        if (foundData) {
          // 전력 피크 탭인 경우 쿼터별 개별 피크 값 선택
          let peakValue = 0;
          if (activeTab === '전력 피크') {
            // 쿼터 번호에 따라 해당 피크 값 선택
            switch (foundData.quarter) {
              case 0: peakValue = foundData.peak1 || 0; break; // 0분: peak1
              case 1: peakValue = foundData.peak2 || 0; break; // 15분: peak2  
              case 2: peakValue = foundData.peak3 || 0; break; // 30분: peak3
              case 3: peakValue = foundData.peak4 || 0; break; // 45분: peak4
              default: peakValue = foundData.peak1 || 0; break;
            }
          } else {
            // 다른 탭의 경우 최대값 사용
            peakValue = Math.max(
              foundData.peak1 || 0, 
              foundData.peak2 || 0, 
              foundData.peak3 || 0, 
              foundData.peak4 || 0
            );
          }
          
          const row = {
            time: timeString,
            usage: foundData.usage > 0 ? Number((foundData.usage / 1000).toFixed(3)).toLocaleString() : '-',
            peak: peakValue > 0 ? Number((peakValue / 1000).toFixed(3)).toLocaleString() : '-',
            maxLoad: foundData.maxLoad > 0 ? Number((foundData.maxLoad / 1000).toFixed(3)).toLocaleString() : '-',
            reduction: foundData.reduction && foundData.reduction > 0 ? Number(foundData.reduction.toFixed(1)).toLocaleString() : '-',
            ctrlCount: foundData.ctrlCount ? foundData.ctrlCount.toLocaleString() : '-',
            ctrlMaxLoadTime: foundData.ctrlMaxLoadTime,
            // Quarter 응답 스펙: ctrlTime 단일 필드 (확장 가능성 대비 기본 매핑)
            ctrlTime1: (foundData as any).ctrlTime1 || (foundData as any).ctrlTime || undefined,
            ctrlTime2: undefined,
            ctrlTime3: undefined,
            ctrlTime4: undefined,
            ctrlTime5: undefined,
            ctrlTime6: undefined,
            ctrlTime7: undefined,
            ctrlTime8: undefined,
            ctrlTime9: undefined,
            ctrlTime10: undefined,
            // 그룹별 감축량 매핑 (0.0일 때 - 표시)
            group1Reduction: foundData.group1Reduction && foundData.group1Reduction > 0 ? Number(foundData.group1Reduction.toFixed(1)).toLocaleString() : '-',
            group2Reduction: foundData.group2Reduction && foundData.group2Reduction > 0 ? Number(foundData.group2Reduction.toFixed(1)).toLocaleString() : '-',
            group3Reduction: foundData.group3Reduction && foundData.group3Reduction > 0 ? Number(foundData.group3Reduction.toFixed(1)).toLocaleString() : '-',
            group4Reduction: foundData.group4Reduction && foundData.group4Reduction > 0 ? Number(foundData.group4Reduction.toFixed(1)).toLocaleString() : '-',
            group5Reduction: foundData.group5Reduction && foundData.group5Reduction > 0 ? Number(foundData.group5Reduction.toFixed(1)).toLocaleString() : '-',
            group6Reduction: foundData.group6Reduction && foundData.group6Reduction > 0 ? Number(foundData.group6Reduction.toFixed(1)).toLocaleString() : '-',
            group7Reduction: foundData.group7Reduction && foundData.group7Reduction > 0 ? Number(foundData.group7Reduction.toFixed(1)).toLocaleString() : '-',
            group8Reduction: foundData.group8Reduction && foundData.group8Reduction > 0 ? Number(foundData.group8Reduction.toFixed(1)).toLocaleString() : '-',
            group9Reduction: foundData.group9Reduction && foundData.group9Reduction > 0 ? Number(foundData.group9Reduction.toFixed(1)).toLocaleString() : '-',
            group10Reduction: foundData.group10Reduction && foundData.group10Reduction > 0 ? Number(foundData.group10Reduction.toFixed(1)).toLocaleString() : '-',
          };
          fullData.push(row);
        } else {
          // 데이터가 없는 시간대는 모두 dash로 표시
          fullData.push({
            time: timeString,
            usage: '-',
            peak: '-',
            maxLoad: '-',
            reduction: '-',
            ctrlCount: '-',
            ctrlMaxLoadTime: undefined,
            ctrlTime1: undefined,
            ctrlTime2: undefined,
            ctrlTime3: undefined,
            ctrlTime4: undefined,
            ctrlTime5: undefined,
            ctrlTime6: undefined,
            ctrlTime7: undefined,
            ctrlTime8: undefined,
            ctrlTime9: undefined,
            ctrlTime10: undefined,
          });
        }
      }
    }
    
    return fullData;
  };

  // 15분 단위 총 합계 계산...
  const calculateQuarterTotals = () => {
    const quarterData = reportData?.quarter || [];
    
    const totalUsage = quarterData.reduce((sum: number, item: any) => sum + (item.usage / 1000 || 0), 0);
    const totalReduction = quarterData.reduce((sum: number, item: any) => sum + (item.reduction || 0), 0);
    const totalCtrlCount = quarterData.reduce((sum: number, item: any) => sum + (item.ctrlCount || 0), 0);
    
    const allPeaks = quarterData.flatMap((item: any) => [
      item.peak1 || 0, 
      item.peak2 || 0, 
      item.peak3 || 0, 
      item.peak4 || 0
    ]).filter(peak => peak > 0);
    
    const maxPeak = allPeaks.length > 0 ? Math.max(...allPeaks) / 1000 : 0;
    
    const maxLoad = quarterData.length > 0
      ? Math.max(...quarterData.map((item: any) => item.maxLoad || 0)) / 1000
      : 0;

    // 최대부하 시간 계산 (최대 부하량에 해당하는 시간 찾기)
    let maxLoadTimeFormatted = '-';
    if (quarterData.length > 0) {
      const maxLoadItem = quarterData.reduce((max: any, item: any) => {
        const currentMaxLoad = item.maxLoad || 0;
        const maxMaxLoad = max.maxLoad || 0;
        return currentMaxLoad > maxMaxLoad ? item : max;
      });
      
      if (maxLoadItem.ctrlMaxLoadTime && maxLoadItem.ctrlMaxLoadTime !== '-') {
        const hourFallback = (() => {
          if (maxLoadItem.startTime) {
            const d = new Date(maxLoadItem.startTime);
            if (!Number.isNaN(d.getTime())) return d.getHours();
          }
          return undefined;
        })();
        maxLoadTimeFormatted = toHHMMSS(maxLoadItem.ctrlMaxLoadTime, hourFallback);
      }
    }

    return {
      totalUsage: totalUsage > 0 ? Number(totalUsage.toFixed(3)).toLocaleString() : '-',
      totalReduction: Number(totalReduction.toFixed(1)).toLocaleString(),
      totalCtrlCount: totalCtrlCount.toLocaleString(),
      maxPeak: maxPeak > 0 ? Number(maxPeak.toFixed(3)).toLocaleString() : '-',
      maxLoad: maxLoad > 0 ? Number(maxLoad.toFixed(3)).toLocaleString() : '-',
      maxLoadTime: maxLoadTimeFormatted
    };
  };

  const tableData = createQuarterTableData();
  const totals = calculateQuarterTotals();

  // 감축량 특별 처리 (15분별)
  if (activeTab === "감축량") {
    const reductionRows = tableData.map((row: any) => ({
      time: row.time,
      totalReduction: row.reduction === '0.0' || row.reduction === 0 ? '-' : row.reduction,
      group1: row.group1Reduction === '0.0' || row.group1Reduction === 0 ? '-' : (row.group1Reduction || '-'),
      group2: row.group2Reduction === '0.0' || row.group2Reduction === 0 ? '-' : (row.group2Reduction || '-'),
      group3: row.group3Reduction === '0.0' || row.group3Reduction === 0 ? '-' : (row.group3Reduction || '-'),
      group4: row.group4Reduction === '0.0' || row.group4Reduction === 0 ? '-' : (row.group4Reduction || '-'),
      group5: row.group5Reduction === '0.0' || row.group5Reduction === 0 ? '-' : (row.group5Reduction || '-'),
      group6: row.group6Reduction === '0.0' || row.group6Reduction === 0 ? '-' : (row.group6Reduction || '-'),
      group7: row.group7Reduction === '0.0' || row.group7Reduction === 0 ? '-' : (row.group7Reduction || '-'),
      group8: row.group8Reduction === '0.0' || row.group8Reduction === 0 ? '-' : (row.group8Reduction || '-'),
      group9: row.group9Reduction === '0.0' || row.group9Reduction === 0 ? '-' : (row.group9Reduction || '-'),
      group10: row.group10Reduction === '0.0' || row.group10Reduction === 0 ? '-' : (row.group10Reduction || '-'),
    }));

    const totalReduction = (reportData?.quarter || []).reduce((sum: number, item: any) => sum + (item.reduction || 0), 0);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
        <div className="mb-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <strong>15분 단위 감축량 데이터:</strong> 00:00부터 23:45까지 15분 간격 표시
            </p>
          </div>
        </div>
        <Table style={{ minWidth: '800px', width: '100%', tableLayout: 'fixed' }}>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>총감축량</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>1그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>2그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>3그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>4그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>5그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>6그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>7그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>8그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>9그룹</TableHead>
              <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>10그룹</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reductionRows.map((r, index) => (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                <TableCell className="text-center font-medium">{r.time}</TableCell>
                <TableCell className="text-center">{r.totalReduction}</TableCell>
                <TableCell className="text-center">{r.group1}</TableCell>
                <TableCell className="text-center">{r.group2}</TableCell>
                <TableCell className="text-center">{r.group3}</TableCell>
                <TableCell className="text-center">{r.group4}</TableCell>
                <TableCell className="text-center">{r.group5}</TableCell>
                <TableCell className="text-center">{r.group6}</TableCell>
                <TableCell className="text-center">{r.group7}</TableCell>
                <TableCell className="text-center">{r.group8}</TableCell>
                <TableCell className="text-center">{r.group9}</TableCell>
                <TableCell className="text-center">{r.group10}</TableCell>
              </TableRow>
            ))}
            {/* 합계 행: 총감축량만 표기 */}
            <TableRow className="bg-blue-50 dark:bg-blue-900/30 font-semibold border-t-2 border-blue-200 dark:border-blue-800">
              <TableCell className="text-center font-bold">총 감축량</TableCell>
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">{Number(totalReduction.toFixed(1)).toLocaleString()} kWh</TableCell>
              <TableCell className="text-center" colSpan={10}>-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
        {/*  총 96개 데이터 (15분 간격) • 실제 데이터 개수: {reportData?.quarter?.length || 0}*/}
        {/*</div>*/}
      </div>
    );
  }

  const getUnit = () => {
    switch (activeTab) {
      case '전력 사용량': return 'kWh';
      case '전력 피크' as ActiveTab: return 'kW';
      case '최대부하': return 'kW';
      default: return 'kWh';
    }
  };

  const getValueColumn = (row: any) => {
    switch (activeTab) {
      case '전력 사용량': return row.usage;
      case '전력 피크' as ActiveTab: return row.peak;
      case '최대부하': return row.maxLoad;
      default: return row.usage;
    }
  };

  const getLoadTimeColumn = (row: any) => {
    switch (activeTab) {
      case '최대부하': return (row.maxLoad ?? 0) > 0 ? formatTime(row.ctrlMaxLoadTime) : '-';
      default: return '-';
    }
  };

  const getTotalValue = () => {
    switch (activeTab) {
      case '전력 사용량': {
        // 실시간 데이터가 있으면 합계에 반영 (QuarterDataTable용)
        if (isReportDateToday && rt.isToday && rt.hour !== null && rt.quarter !== null) {
          const quarterData = reportData?.quarter || [];
          const baseTotal = quarterData.reduce((sum: number, item: any) => sum + (item.usage / 1000 || 0), 0);
          // 현재 쿼터의 기존 값을 빼고 실시간 값을 더함
          const currentQuarterData = quarterData.find((item: any) => 
            item.hour === rt.hour && item.quarter === rt.quarter
          );
          const currentQuarterUsage = currentQuarterData ? currentQuarterData.usage / 1000 : 0;
          const realtimeTotal = baseTotal - currentQuarterUsage + rt.usageKwh;
          return `${Number(realtimeTotal.toFixed(3)).toLocaleString()} kWh`;
        }
        return `${totals.totalUsage} kWh`;
      }
      case '최대부하': return `${totals.maxLoad} kW (최대)`;
      default: return `${totals.totalUsage} kWh`;
    }
  };

  // (삭제) 전력피크 15분 전용 테이블: 기존 단일 컬럼 표기 규칙을 일반 렌더링으로 통합

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
      {/*<div className="mb-4">*/}
      {/*  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">*/}
      {/*    <p className="text-sm text-purple-700 dark:text-purple-300">*/}
      {/*      <strong>15분 단위 데이터:</strong> 00:00부터 23:45까지 15분 간격 표시*/}
      {/*    </p>*/}
      {/*  </div>*/}
      {/*</div>*/}
      <Table style={{ minWidth: '400px', width: '100%', tableLayout: 'fixed' }}>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
            <TableHead className="text-center font-semibold" style={{ width: '120px', minWidth: '120px' }}>{activeTab} ({getUnit()})</TableHead>
            {activeTab === '최대부하' && (
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>부하시간</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row, index) => {
            // 현재 슬롯 판별
            let isCurrentSlot = false;
            if (isReportDateToday && rt.isToday && rt.hour !== null && rt.quarter !== null) {
              const currentTime = `${String(rt.hour).padStart(2,'0')}:${String(rt.quarter*15).padStart(2,'0')}`;
              isCurrentSlot = row.time === currentTime;
            }

            // 0/15/30/45 → 1..4 피크번호 계산
            const minute = parseInt((row.time.split(':')[1] || '0'), 10);
            const quarterIndex = Number.isFinite(minute) ? Math.floor(minute / 15) : 0; // 0..3
            const peakNumber = (quarterIndex + 1) as 1|2|3|4;

            // 실시간 피크 텍스트 (kW)
            const pMap: Record<1|2|3|4, number> = { 1: rt.p.p1, 2: rt.p.p2, 3: rt.p.p3, 4: rt.p.p4 } as const;
            const peakW = pMap[peakNumber] || 0;
            const peakKwText = peakW > 0 ? Number((peakW/1000).toFixed(3)).toLocaleString() : '-';
            const overlayOn = isCurrentSlot && rt.activePeak === peakNumber && peakW > 0;

            const valueCell = (() => {
              if (activeTab === '전력 피크' && isCurrentSlot) {
                return overlayOn ? overlay(peakKwText, true) : peakKwText;
              }
              if (activeTab === '최대부하' && isCurrentSlot && (rt.ctrlMaxLoadKw || 0) > 0) {
                return `${Number((rt.ctrlMaxLoadKw || 0).toFixed(3)).toLocaleString()}`;
              }
              return getValueColumn(row);
            })();

            return (
              <TableRow key={index} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
                <TableCell className="text-center font-medium" style={{ width: '80px', minWidth: '80px' }}>{row.time}</TableCell>
                <TableCell className="text-center" style={{ width: '120px', minWidth: '120px' }}>{valueCell}</TableCell>
                {activeTab === '최대부하' && (
                  <TableCell className="text-center" style={{ width: '100px', minWidth: '100px' }}>{getLoadTimeColumn(row)}</TableCell>
                )}
              </TableRow>
            );
          })}
          {/* 합계 행 */}
          <TableRow className="bg-blue-50 dark:bg-blue-900/30 font-semibold border-t-2 border-blue-200 dark:border-blue-800">
            <TableCell className="text-center font-bold" style={{ width: '80px', minWidth: '80px' }}>총 합계</TableCell>
            <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300" style={{ width: '120px', minWidth: '120px' }}>
              {getTotalValue()}
            </TableCell>
            {activeTab === '최대부하' && (
              <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300" style={{ width: '100px', minWidth: '100px' }}>
                {totals.maxLoadTime}
              </TableCell>
            )}
          </TableRow>
        </TableBody>
      </Table>
      {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
      {/*  총 96개 데이터 (15분 간격) • 실제 데이터 개수: {reportData?.quarter?.length || 0}*/}
      {/*</div>*/}
    </div>
  );
};

export default ReportDataTable;

/** 월별 데이터 테이블 (1~해당월 말일까지) */
const MonthlyDataTable: React.FC<{ reportData?: MonthlyReportData; activeTab: ActiveTab; }> = ({ reportData, activeTab }) => {
  const getDaysInMonth = () => {
    const year = reportData?.targetYear || new Date().getFullYear();
    const month = reportData?.targetMonth || new Date().getMonth() + 1;
    return new Date(year, month, 0).getDate();
  };

  const toUnit = () => {
    switch (activeTab) {
      case '전력 사용량': return 'kWh';
      case '최대부하': return 'kW';
      case '감축량': return 'kWh';
      case '제어현황': return '회';
      default: return '';
    }
  };

  const toValue = (item: any) => {
    if (!item) return '-';
    switch (activeTab) {
      case '전력 사용량': return item.usage > 0 ? Number((item.usage / 1000).toFixed(3)).toLocaleString() : '-';
      case '전력 피크': {
        const peaks = [item.peak1, item.peak2, item.peak3, item.peak4].filter((p: number) => p > 0);
        const max = peaks.length ? Math.max(...peaks) / 1000 : 0;
        return max > 0 ? Number(max.toFixed(3)).toLocaleString() : '-';
      }
      case '최대부하': return item.maxLoad > 0 ? Number((item.maxLoad / 1000).toFixed(3)).toLocaleString() : '-';
      case '감축량': return (item.reduction ?? 0).toLocaleString();
      case '제어현황': return item.totalCtrlCount ? item.totalCtrlCount.toLocaleString() : '-';
      default: return '-';
    }
  };

  const rows = useMemo(() => {
    const days = getDaysInMonth();
    const map = new Map<number, any>();
    (reportData?.month || []).forEach((d) => map.set(d.day, d));
    return Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const item = map.get(day);
      return {
        label: `${String(day).padStart(2, '0')}일`,
        value: toValue(item),
        ctrlMaxLoadTime: item?.ctrlMaxLoadTime
      };
    });
  }, [reportData, activeTab]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
      <Table style={{ minWidth: '400px', width: '100%', tableLayout: 'fixed' }}>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
            <TableHead className="text-center font-semibold" style={{ width: '120px', minWidth: '120px' }}>{`전력사용량`.includes(activeTab) ? `전력사용량` : activeTab} ({toUnit()})</TableHead>
            {activeTab === '최대부하' && (
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>부하시간</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
              <TableCell className="text-center font-medium" style={{ width: '80px', minWidth: '80px' }}>{r.label}</TableCell>
              <TableCell className="text-center" style={{ width: '120px', minWidth: '120px' }}>{r.value}</TableCell>
              {activeTab === '최대부하' && (
                <TableCell className="text-center" style={{ width: '100px', minWidth: '100px' }}>{(r.value ?? 0) > 0 ? formatTime(r.ctrlMaxLoadTime) : '-'}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
      {/*  {`${reportData?.targetYear || ''}년 ${reportData?.targetMonth || ''}월`} • 데이터 개수: {(reportData?.month || []).length}*/}
      {/*</div>*/}
    </div>
  );
};

/** 연별 데이터 테이블 (1~12월) */
const YearlyDataTable: React.FC<{ reportData?: YearlyReportData; activeTab: ActiveTab; }> = ({ reportData, activeTab }) => {
  const toUnit = () => {
    switch (activeTab) {
      case '전력 사용량': return 'kWh';
      case '최대부하': return 'kW';
      case '감축량': return 'kWh';
      case '제어현황': return '회';
      default: return '';
    }
  };

  const toValue = (item: any) => {
    if (!item) return '-';
    switch (activeTab) {
      case '전력 사용량': return item.usage > 0 ? Number((item.usage / 1000).toFixed(3)).toLocaleString() : '-';
      case '전력 피크': {
        const peaks = [item.peak1, item.peak2, item.peak3, item.peak4].filter((p: number) => p > 0);
        const max = peaks.length ? Math.max(...peaks) / 1000 : 0;
        return max > 0 ? Number(max.toFixed(3)).toLocaleString() : '-';
      }
      case '최대부하': return item.maxLoad > 0 ? Number((item.maxLoad / 1000).toFixed(3)).toLocaleString() : '-';
      case '감축량': return (item.reduction ?? 0).toLocaleString();
      case '제어현황': return item.totalCtrlCount ? item.totalCtrlCount.toLocaleString() : '-';
      default: return '-';
    }
  };

  const rows = useMemo(() => {
    const map = new Map<number, any>();
    (reportData?.year || []).forEach((m) => map.set(m.month, m));
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const item = map.get(month);
      return {
        label: `${String(month).padStart(2, '0')}월`,
        value: toValue(item),
        ctrlMaxLoadTime: item?.ctrlMaxLoadTime
      };
    });
  }, [reportData, activeTab]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:!pt-3 sm:p-6 overflow-x-auto" style={{ minWidth: '100%', width: '100%' }}>
      <Table style={{ minWidth: '400px', width: '100%', tableLayout: 'fixed' }}>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center font-semibold" style={{ width: '80px', minWidth: '80px' }}>시간</TableHead>
            <TableHead className="text-center font-semibold" style={{ width: '120px', minWidth: '120px' }}>{`전력사용량`.includes(activeTab) ? `전력사용량` : activeTab} ({toUnit()})</TableHead>
            {activeTab === '최대부하' && (
              <TableHead className="text-center font-semibold" style={{ width: '100px', minWidth: '100px' }}>부하시간</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : ''}>
              <TableCell className="text-center font-medium" style={{ width: '80px', minWidth: '80px' }}>{r.label}</TableCell>
              <TableCell className="text-center" style={{ width: '120px', minWidth: '120px' }}>{r.value}</TableCell>
              {activeTab === '최대부하' && (
                <TableCell className="text-center" style={{ width: '100px', minWidth: '100px' }}>{(r.value ?? 0) > 0 ? formatTime(r.ctrlMaxLoadTime) : '-'}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {/*<div className="mt-4 text-center text-sm text-gray-500">*/}
      {/*  {`${reportData?.targetYear || ''}년`} • 데이터 개수: {(reportData?.year || []).length}*/}
      {/*</div>*/}
    </div>
  );
};
