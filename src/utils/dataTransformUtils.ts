/**
 * 데이터 변환 유틸리티
 */
import {
  HourlyData,
  QuarterData,
  HourlyReportData,
  MonthlyReportData,
  YearlyReportData,
} from '@/types/api';
import {
  ChartDataPoint,
  TableDataRow,
  ActiveTab,
  GraphUnit,
  ViewType,
  ControlData,
  SummaryData,
  DataTransformOptions,
} from '@/types/report';

/**
 * W(와트) → kW(킬로와트) 변환
 */
export const convertWToKw = (value: number, digits: number = 3): number => {
  return Math.round((value / 1000) * Math.pow(10, digits)) / Math.pow(10, digits);
};

/**
 * 시간 형식 변환 (hour 1-24 → "HH:MM")
 */
export const convertHourToTimeString = (hour: number): string => {
  const displayHour = hour === 24 ? 0 : hour; // 24시 → 0시로 변환
  return `${String(displayHour).padStart(2, '0')}:00`;
};

/**
 * 15분 단위 시간 형식 변환
 */
export const convertQuarterToTimeString = (quarter: number, baseHour: number): string => {
  const minute = quarter * 15;
  const hour = baseHour === 24 ? 0 : baseHour; // 24시 → 0시로 변환
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/**
 * ISO 시간 문자열에서 시간만 추출
 */
export const extractTimeFromIso = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '00:00';
  }
};

/**
 * 탭별 데이터 키 매핑
 */
export const getDataKeyForTab = (activeTab: ActiveTab): string => {
  switch (activeTab) {
    case '전력 사용량':
      return 'usage';
    case '전력 피크':
      return 'peak';
    case '최대부하':
      return 'maxLoad';
    case '감축량':
      return 'reduction';
    case '제어현황':
      return 'ctrlCount';
    default:
      return 'usage';
  }
};

/**
 * 시간별 데이터를 차트 데이터로 변환
 */
export const transformHourlyDataToChart = (
  hourData: HourlyData[],
  yesterdayData: HourlyData[] = [],
  prevMonthData: HourlyData[] = [],
  activeTab: ActiveTab,
  options: DataTransformOptions = {}
): ChartDataPoint[] => {
  const { convertWToKw: shouldConvert = true } = options;

  return hourData.map((item, index) => {
    const time = convertHourToTimeString(item.hour);
    const prevDay = yesterdayData[index];
    const prevMonth = prevMonthData[index];

    // 피크 값들 처리 (최대값 계산)
    const peaks = [item.peak1, item.peak2, item.peak3, item.peak4].filter(p => p > 0);
    const maxPeak = peaks.length > 0 ? Math.max(...peaks) : 0;

    const baseData: ChartDataPoint = {
      time,
      usage: shouldConvert ? convertWToKw(item.usage) : item.usage,
      peak: shouldConvert ? convertWToKw(maxPeak) : maxPeak,
      maxLoad: shouldConvert ? convertWToKw(item.maxLoad) : item.maxLoad,
      controlCount: item.totalCtrlCount,
      ctrlCount: item.totalCtrlCount,
      reduction: item.reduction,
      prevDay: getValueForTab(prevDay, activeTab, shouldConvert),
      prevMonth: getValueForTab(prevMonth, activeTab, shouldConvert),
    };

    return baseData;
  });
};

/**
 * 15분별 데이터를 차트 데이터로 변환
 */
export const transformQuarterDataToChart = (
  quarterData: QuarterData[],
  activeTab: ActiveTab,
  options: DataTransformOptions = {}
): ChartDataPoint[] => {
  const { convertWToKw: shouldConvert = true } = options;

  return quarterData.map((item) => {
    const time = extractTimeFromIso(item.startTime);
    
    // 전력 피크 탭인 경우 각 피크별 개별 값 매핑
    let peakValue = 0;
    if (activeTab === '전력 피크') {
      // 각 쿼터 데이터에서 해당 쿼터에 맞는 피크 값 선택
      const peak1 = item.peak1 || 0;
      const peak2 = item.peak2 || 0;
      const peak3 = item.peak3 || 0;
      const peak4 = item.peak4 || 0;
      
      // 쿼터 번호에 따라 해당 피크 값 선택
      switch (item.quarter) {
        case 0: peakValue = peak1; break; // 0분: peak1
        case 1: peakValue = peak2; break; // 15분: peak2  
        case 2: peakValue = peak3; break; // 30분: peak3
        case 3: peakValue = peak4; break; // 45분: peak4
        default: peakValue = peak1; break;
      }
    } else {
      // 다른 탭의 경우 기존 로직 유지 (최대값)
      const peaks = [item.peak1, item.peak2, item.peak3, item.peak4].filter(p => p > 0);
      peakValue = peaks.length > 0 ? Math.max(...peaks) : 0;
    }

    return {
      time,
      usage: shouldConvert ? convertWToKw(item.usage) : item.usage,
      peak: shouldConvert ? convertWToKw(peakValue) : peakValue,
      maxLoad: shouldConvert ? convertWToKw(item.maxLoad) : item.maxLoad,
      controlCount: item.ctrlCount,
      ctrlCount: item.ctrlCount,
      reduction: item.reduction,
      // 각 피크별 개별 값도 추가 (디버깅용)
      peak1: shouldConvert ? convertWToKw(item.peak1 || 0) : (item.peak1 || 0),
      peak2: shouldConvert ? convertWToKw(item.peak2 || 0) : (item.peak2 || 0),
      peak3: shouldConvert ? convertWToKw(item.peak3 || 0) : (item.peak3 || 0),
      peak4: shouldConvert ? convertWToKw(item.peak4 || 0) : (item.peak4 || 0),
    };
  });
};

/**
 * 월별 데이터를 차트 데이터로 변환
 * - month: 현재 월의 일별 데이터
 * - prevMonth: 전월 동일일 데이터 → prevDay 필드에 매핑 (라인 1)
 * - prevYear: 전년 동일월의 일별 데이터 → prevMonth 필드에 매핑 (라인 2)
 */
export const transformMonthlyDataToChart = (
  monthly: MonthlyReportData,
  activeTab: ActiveTab,
  options: DataTransformOptions = {}
): ChartDataPoint[] => {
  const { convertWToKw: shouldConvert = true } = options;

  const getMaxPeak = (vals: Array<number | undefined>): number => {
    const list = vals.filter((p): p is number => typeof p === 'number' && p > 0);
    if (list.length === 0) return 0;
    return Math.max(...list);
  };

  const toValue = (item: any): number => {
    switch (activeTab) {
      case '전력 사용량': return item?.usage ?? 0;
      case '전력 피크': {
        const peaks = [item?.peak1, item?.peak2, item?.peak3, item?.peak4].filter((p: number) => p > 0);
        const maxPeak = peaks.length > 0 ? Math.max(...peaks) : 0;
        return shouldConvert ? convertWToKw(maxPeak) : maxPeak;
      }
      case '최대부하': return shouldConvert ? convertWToKw(item?.maxLoad ?? 0) : (item?.maxLoad ?? 0);
      case '감축량': return item?.reduction ?? 0;
      case '제어현황': return item?.totalCtrlCount ?? 0;
      default: return 0;
    }
  };

  const length = monthly.month.length;
  const result: ChartDataPoint[] = [];
  for (let i = 0; i < length; i++) {
    const cur = monthly.month[i];
    const prevM = monthly.prevMonth[i];
    const prevY = monthly.prevYear[i];
    result.push({
      time: String(cur?.day ?? i + 1).padStart(2, '0'),
      usage: shouldConvert ? convertWToKw(cur?.usage ?? 0) : (cur?.usage ?? 0),
      peak: (() => {
        const max = getMaxPeak([cur?.peak1, cur?.peak2, cur?.peak3, cur?.peak4]);
        return shouldConvert ? convertWToKw(max) : max;
      })(),
      maxLoad: shouldConvert ? convertWToKw(cur?.maxLoad ?? 0) : (cur?.maxLoad ?? 0),
      reduction: cur?.reduction,
      ctrlCount: cur?.totalCtrlCount,
      prevDay: toValue(prevM),
      prevMonth: toValue(prevY),
    });
  }
  return result;
};

/**
 * 연별 데이터를 차트 데이터로 변환
 * - year: 현재 년도의 월별 데이터
 * - prevYear: 전년도 월별 데이터 → prevMonth 필드에 매핑 (라인 2)
 */
export const transformYearlyDataToChart = (
  yearly: YearlyReportData,
  activeTab: ActiveTab,
  options: DataTransformOptions = {}
): ChartDataPoint[] => {
  const { convertWToKw: shouldConvert = true } = options;

  const getMaxPeak = (vals: Array<number | undefined>): number => {
    const list = vals.filter((p): p is number => typeof p === 'number' && p > 0);
    if (list.length === 0) return 0;
    return Math.max(...list);
  };

  const toValue = (item: any): number => {
    switch (activeTab) {
      case '전력 사용량': return item?.usage ?? 0;
      case '전력 피크': {
        const peaks = [item?.peak1, item?.peak2, item?.peak3, item?.peak4].filter((p: number) => p > 0);
        const maxPeak = peaks.length > 0 ? Math.max(...peaks) : 0;
        return shouldConvert ? convertWToKw(maxPeak) : maxPeak;
      }
      case '최대부하': return shouldConvert ? convertWToKw(item?.maxLoad ?? 0) : (item?.maxLoad ?? 0);
      case '감축량': return item?.reduction ?? 0;
      case '제어현황': return item?.totalCtrlCount ?? 0;
      default: return 0;
    }
  };

  const length = yearly.year.length;
  const result: ChartDataPoint[] = [];
  for (let i = 0; i < length; i++) {
    const cur = yearly.year[i];
    const prevY = yearly.prevYear[i];
    result.push({
      time: String(cur?.month ?? i + 1).padStart(2, '0'),
      usage: shouldConvert ? convertWToKw(cur?.usage ?? 0) : (cur?.usage ?? 0),
      peak: (() => {
        const max = getMaxPeak([cur?.peak1, cur?.peak2, cur?.peak3, cur?.peak4]);
        return shouldConvert ? convertWToKw(max) : max;
      })(),
      maxLoad: shouldConvert ? convertWToKw(cur?.maxLoad ?? 0) : (cur?.maxLoad ?? 0),
      reduction: cur?.reduction,
      ctrlCount: cur?.totalCtrlCount,
      prevMonth: toValue(prevY),
      prevDay: toValue(prevY),
    });
  }
  return result;
};

/**
 * 탭에 따른 값 추출
 */
const getValueForTab = (
  data: HourlyData | undefined,
  activeTab: ActiveTab,
  shouldConvert: boolean
): number => {
  if (!data) return 0;

  switch (activeTab) {
    case '전력 사용량':
      return shouldConvert ? convertWToKw(data.usage) : data.usage;
    case '전력 피크': {
      const peaks = [data.peak1, data.peak2, data.peak3, data.peak4].filter(p => p > 0);
      const maxPeak = peaks.length > 0 ? Math.max(...peaks) : 0;
      return shouldConvert ? convertWToKw(maxPeak) : maxPeak;
    }
    case '최대부하':
      return shouldConvert ? convertWToKw(data.maxLoad) : data.maxLoad;
    case '감축량':
      return data.reduction;
    case '제어현황':
      return data.totalCtrlCount;
    default:
      return 0;
  }
};

/**
 * 테이블 데이터 변환
 */
export const transformDataToTable = (
  data: HourlyData[] | QuarterData[],
  graphUnit: GraphUnit,
  activeTab: ActiveTab,
  options: DataTransformOptions = {}
): TableDataRow[] => {
  const { convertWToKw: shouldConvert = true } = options;

  if (graphUnit === 'quarter') {
    return (data as QuarterData[]).map((item) => ({
      time: extractTimeFromIso(item.startTime),
      ...transformQuarterItemForTable(item, activeTab, shouldConvert),
    }));
  } else {
    return (data as HourlyData[]).map((item) => ({
      time: convertHourToTimeString(item.hour),
      ...transformHourlyItemForTable(item, activeTab, shouldConvert),
    }));
  }
};

/**
 * 시간별 아이템을 테이블용으로 변환
 */
const transformHourlyItemForTable = (
  item: HourlyData,
  activeTab: ActiveTab,
  shouldConvert: boolean
): Record<string, any> => {
  const peaks = [item.peak1, item.peak2, item.peak3, item.peak4];
  
  // 전력 피크 탭인 경우 각 피크별 개별 값 매핑 (차트와 동일한 로직)
  let peakValue = 0;
  if (activeTab === '전력 피크') {
    // 시간별 데이터는 최대값 사용 (쿼터별 구분 없음)
    const peak1 = item.peak1 || 0;
    const peak2 = item.peak2 || 0;
    const peak3 = item.peak3 || 0;
    const peak4 = item.peak4 || 0;
    
    // 시간별 데이터는 모든 피크의 최대값 사용
    peakValue = Math.max(peak1, peak2, peak3, peak4);
  } else {
    // 다른 탭의 경우 기존 로직 유지 (최대값)
    peakValue = Math.max(...peaks.filter(p => p > 0));
  }
  
  return {
    usage: shouldConvert ? convertWToKw(item.usage) : item.usage,
    peak: shouldConvert ? convertWToKw(peakValue) : peakValue,
    peak1: shouldConvert ? convertWToKw(item.peak1) : item.peak1,
    peak2: shouldConvert ? convertWToKw(item.peak2) : item.peak2,
    peak3: shouldConvert ? convertWToKw(item.peak3) : item.peak3,
    peak4: shouldConvert ? convertWToKw(item.peak4) : item.peak4,
    maxLoad: shouldConvert ? convertWToKw(item.maxLoad) : item.maxLoad,
    reduction: item.reduction,
    ctrlCount: item.totalCtrlCount,
    ctrlMaxLoad: shouldConvert ? convertWToKw(item.ctrlMaxLoad) : item.ctrlMaxLoad,
    ctrlMaxLoadTime: item.ctrlMaxLoadTime,
    ctrlTime1: item.ctrlTime1,
    ctrlTime2: item.ctrlTime2,
    ctrlTime3: item.ctrlTime3,
    ctrlTime4: item.ctrlTime4,
    ctrlTime5: item.ctrlTime5,
    ctrlTime6: item.ctrlTime6,
    ctrlTime7: item.ctrlTime7,
    ctrlTime8: item.ctrlTime8,
    ctrlTime9: item.ctrlTime9,
    ctrlTime10: item.ctrlTime10,
  };
};

/**
 * 15분별 아이템을 테이블용으로 변환
 */
const transformQuarterItemForTable = (
  item: QuarterData,
  activeTab: ActiveTab,
  shouldConvert: boolean
): Record<string, any> => {
  const peaks = [item.peak1, item.peak2, item.peak3, item.peak4];
  
  // 전력 피크 탭인 경우 각 피크별 개별 값 매핑 (차트와 동일한 로직)
  let peakValue = 0;
  if (activeTab === '전력 피크') {
    // 각 쿼터 데이터에서 해당 쿼터에 맞는 피크 값 선택
    const peak1 = item.peak1 || 0;
    const peak2 = item.peak2 || 0;
    const peak3 = item.peak3 || 0;
    const peak4 = item.peak4 || 0;
    
    // 쿼터 번호에 따라 해당 피크 값 선택
    switch (item.quarter) {
      case 0: peakValue = peak1; break; // 0분: peak1
      case 1: peakValue = peak2; break; // 15분: peak2  
      case 2: peakValue = peak3; break; // 30분: peak3
      case 3: peakValue = peak4; break; // 45분: peak4
      default: peakValue = peak1; break;
    }
  } else {
    // 다른 탭의 경우 기존 로직 유지 (최대값)
    peakValue = Math.max(...peaks.filter(p => p > 0));
  }
  
  return {
    usage: shouldConvert ? convertWToKw(item.usage) : item.usage,
    peak: shouldConvert ? convertWToKw(peakValue) : peakValue,
    peak1: shouldConvert ? convertWToKw(item.peak1) : item.peak1,
    peak2: shouldConvert ? convertWToKw(item.peak2) : item.peak2,
    peak3: shouldConvert ? convertWToKw(item.peak3) : item.peak3,
    peak4: shouldConvert ? convertWToKw(item.peak4) : item.peak4,
    maxLoad: shouldConvert ? convertWToKw(item.maxLoad) : item.maxLoad,
    reduction: item.reduction,
    ctrlCount: item.ctrlCount,
    ctrlTime: item.ctrlTime,
  };
};

/**
 * 제어 데이터 변환
 */
export const transformControlData = (data: HourlyReportData): ControlData => {
  // 총 제어시간 계산 (모든 시간의 제어시간 합계)
  let totalSeconds = 0;
  let totalCount = 0;

  data.hour.forEach(item => {
    totalCount += item.totalCtrlCount;
    
    // 제어시간들을 초로 변환하여 합계
    [
      item.ctrlTime1, item.ctrlTime2, item.ctrlTime3, item.ctrlTime4, item.ctrlTime5,
      item.ctrlTime6, item.ctrlTime7, item.ctrlTime8, item.ctrlTime9, item.ctrlTime10
    ].forEach(timeStr => {
      if (timeStr) {
        totalSeconds += convertTimeStringToSeconds(timeStr);
      }
    });
  });

  const totalCtrlTime = convertSecondsToTimeString(totalSeconds);

  return {
    totalCtrlTime,
    totalControlCount: totalCount,
  };
};

/**
 * 시간 문자열을 초로 변환
 */
const convertTimeStringToSeconds = (timeStr: string): number => {
  try {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  } catch {
    return 0;
  }
};

/**
 * 초를 시간 문자열로 변환
 */
const convertSecondsToTimeString = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * 합계 데이터 계산
 */
export const calculateSummaryData = (
  data: HourlyReportData,
  viewType: ViewType,
  activeTab: ActiveTab
): SummaryData => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _viewType = viewType; // 사용하지 않지만 API 일관성을 위해 유지
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  const _activeTab = activeTab; // 사용하지 않지만 API 일관성을 위해 유지
  const hourData = data.hour;
  
  const totalUsage = hourData.reduce((sum, item) => sum + item.usage, 0);
  const totalControlCount = hourData.reduce((sum, item) => sum + item.totalCtrlCount, 0);
  const totalReduction = hourData.reduce((sum, item) => sum + item.reduction, 0);
  
  // 평균 피크 계산
  const peakValues = hourData.flatMap(item => 
    [item.peak1, item.peak2, item.peak3, item.peak4].filter(p => p > 0)
  );
  const averagePeak = peakValues.length > 0 
    ? convertWToKw(peakValues.reduce((sum, peak) => sum + peak, 0) / peakValues.length)
    : 0;
  
  // 최대부하 계산
  const maxLoadValues = hourData.map(item => item.maxLoad).filter(load => load > 0);
  const maxLoad = maxLoadValues.length > 0 
    ? convertWToKw(Math.max(...maxLoadValues))
    : 0;

  return {
    totalControlCount,
    totalUsage,
    averagePeak,
    maxLoad,
    totalReduction,
  };
};
