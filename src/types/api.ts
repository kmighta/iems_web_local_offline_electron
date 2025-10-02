/**
 * API 공통 응답 구조
 */
export interface ApiResponse<T> {
  resultCode: number;
  resultMessage: string;
  data: T;
}

/**
 * API 요청 파라미터 타입들
 */
export interface HourlyReportParams {
  serialNumber: string;
  date: string; // YYYY-MM-DD 형식
}

export interface MonthlyReportParams {
  serialNumber: string;
  year: number;
  month: number;
}

export interface YearlyReportParams {
  serialNumber: string;
  year: number;
}

/**
 * 시간별 데이터 구조 (hour 배열)
 */
export interface HourlyData {
  hour: number; // 1-24 (1이 0시)
  totalCtrlCount: number; // 제어개수
  peak1: number; // 피크1 (W 단위)
  peak2: number; // 피크2 (W 단위)
  peak3: number; // 피크3 (W 단위)
  peak4: number; // 피크4 (W 단위)
  maxLoad: number; // 최대부하 (W 단위)
  usage: number; // 전력사용량 (kWh)
  reduction: number; // 감축량 (kWh)
  ctrlMaxLoad: number; // 제어 최대부하 (W 단위)
  ctrlMaxLoadTime: string; // 최대부하 시간 "HH:MM:SS"
  ctrlTime1?: string; // 제어시간1 "HH:MM:SS"
  ctrlTime2?: string; // 제어시간2 "HH:MM:SS"
  ctrlTime3?: string; // 제어시간3 "HH:MM:SS"
  ctrlTime4?: string; // 제어시간4 "HH:MM:SS"
  ctrlTime5?: string; // 제어시간5 "HH:MM:SS"
  ctrlTime6?: string; // 제어시간6 "HH:MM:SS"
  ctrlTime7?: string; // 제어시간7 "HH:MM:SS"
  ctrlTime8?: string; // 제어시간8 "HH:MM:SS"
  ctrlTime9?: string; // 제어시간9 "HH:MM:SS"
  ctrlTime10?: string; // 제어시간10 "HH:MM:SS"
  // 그룹별 감축량 (1~10그룹)
  group1Reduction?: number; // 그룹1 감축량 (kWh)
  group2Reduction?: number; // 그룹2 감축량 (kWh)
  group3Reduction?: number; // 그룹3 감축량 (kWh)
  group4Reduction?: number; // 그룹4 감축량 (kWh)
  group5Reduction?: number; // 그룹5 감축량 (kWh)
  group6Reduction?: number; // 그룹6 감축량 (kWh)
  group7Reduction?: number; // 그룹7 감축량 (kWh)
  group8Reduction?: number; // 그룹8 감축량 (kWh)
  group9Reduction?: number; // 그룹9 감축량 (kWh)
  group10Reduction?: number; // 그룹10 감축량 (kWh)
}

/**
 * 15분별 데이터 구조 (quarter 배열)
 */
export interface QuarterData {
  quarter: number; // 0-3 (15분 구간)
  startTime: string; // ISO 8601 형식
  endTime: string; // ISO 8601 형식
  peak1: number; // 피크1 (W 단위)
  peak2: number; // 피크2 (W 단위)
  peak3: number; // 피크3 (W 단위)
  peak4: number; // 피크4 (W 단위)
  maxLoad: number; // 최대부하 (W 단위)
  usage: number; // 전력사용량 (kWh)
  reduction: number; // 감축량 (kWh)
  ctrlCount: number; // 제어개수
  ctrlMaxLoadTime?: string; // 최대부하 시간 "HH:MM:SS"
  ctrlTime?: string; // 제어시간 "HH:MM:SS"
  // 그룹별 감축량 (1~10그룹)
  group1Reduction?: number; // 그룹1 감축량 (kWh)
  group2Reduction?: number; // 그룹2 감축량 (kWh)
  group3Reduction?: number; // 그룹3 감축량 (kWh)
  group4Reduction?: number; // 그룹4 감축량 (kWh)
  group5Reduction?: number; // 그룹5 감축량 (kWh)
  group6Reduction?: number; // 그룹6 감축량 (kWh)
  group7Reduction?: number; // 그룹7 감축량 (kWh)
  group8Reduction?: number; // 그룹8 감축량 (kWh)
  group9Reduction?: number; // 그룹9 감축량 (kWh)
  group10Reduction?: number; // 그룹10 감축량 (kWh)
}

/**
 * 일별 보고서 응답 데이터
 */
export interface HourlyReportData {
  targetDate: string; // YYYY-MM-DD
  hour: HourlyData[]; // 24개 시간별 데이터
  quarter: QuarterData[]; // 96개 15분별 데이터
  yesterday: HourlyData[]; // 전일 동일일 데이터 (이전: prevMonth)
  prevMonth: HourlyData[]; // 전월 동일일 데이터 (이전: prevYear)
}

/**
 * 월별 보고서 데이터
 */
export interface MonthlyDayData {
  day: number; // 1~31
  totalCtrlCount: number;
  peak1: number;
  peak2: number;
  peak3: number;
  peak4: number;
  maxLoad: number; // W
  usage: number; // kWh
  reduction: number; // kWh
  ctrlMaxLoad: number; // W
  ctrlMaxLoadTime: string; // HH:MM:SS
  ctrlTime1?: string;
  ctrlTime2?: string;
  ctrlTime3?: string;
  ctrlTime4?: string;
  ctrlTime5?: string;
  ctrlTime6?: string;
  ctrlTime7?: string;
  ctrlTime8?: string;
  ctrlTime9?: string;
  ctrlTime10?: string;
}

export interface MonthlyReportData {
  targetYear: number;
  targetMonth: number;
  month: MonthlyDayData[];
  prevMonth: MonthlyDayData[];
  prevYear: MonthlyDayData[];
}

export interface YearlyReportData {
  targetYear: number;
  year: YearlyMonthData[];
  prevYear: YearlyMonthData[];
}

export interface YearlyMonthData {
  month: number; // 1~12
  totalCtrlCount: number;
  peak1: number;
  peak2: number;
  peak3: number;
  peak4: number;
  maxLoad: number; // W
  usage: number; // kWh
  reduction: number; // kWh
  ctrlMaxLoad: number; // W
  ctrlMaxLoadTime: string; // HH:MM:SS
  ctrlTime1?: string;
  ctrlTime2?: string;
  ctrlTime3?: string;
  ctrlTime4?: string;
  ctrlTime5?: string;
  ctrlTime6?: string;
  ctrlTime7?: string;
  ctrlTime8?: string;
  ctrlTime9?: string;
  ctrlTime10?: string;
}

/**
 * API 응답 타입들
 */
export type HourlyReportResponse = ApiResponse<HourlyReportData>;
export type MonthlyReportResponse = ApiResponse<MonthlyReportData>;
export type YearlyReportResponse = ApiResponse<YearlyReportData>;
