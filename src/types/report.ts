/**
 * 보고서 관련 컴포넌트 타입들
 */

/**
 * 탭 정의
 */
export interface ReportTab {
  name: string;
  color: string;
  unit: string;
  dataKey: string;
  isTableOnly?: boolean;
}

/**
 * 뷰 타입
 */
export type ViewType = "일별 보기" | "월별 보기" | "년별 보기";

/**
 * 그래프 단위
 */
export type GraphUnit = "hour" | "quarter";

/**
 * 활성 탭 이름
 */
export type ActiveTab = "전력 사용량" | "전력 피크" | "최대부하" | "감축량" | "제어현황";

/**
 * 차트 데이터 포인트 (차트 렌더링용)
 */
export interface ChartDataPoint {
  time: string; // "HH:MM" 형식
  usage?: number; // kWh
  peak?: number; // kW (변환된 값)
  maxLoad?: number; // kW (변환된 값)
  controlCount?: number; // 제어개수
  ctrlCount?: number; // 제어현황용
  reduction?: number; // 감축량
  prevDay?: number; // 전일 비교 데이터
  prevMonth?: number; // 전월 비교 데이터
  prevYear?: number; // 전년 비교 데이터
  isRealTime?: boolean; // 실시간 데이터 여부
  isTempData?: boolean; // 임시 데이터 여부
  // 각 피크별 개별 값 (디버깅용)
  peak1?: number; // kW (변환된 값)
  peak2?: number; // kW (변환된 값)
  peak3?: number; // kW (변환된 값)
  peak4?: number; // kW (변환된 값)
}

/**
 * 테이블 데이터 행 (테이블 렌더링용)
 */
export interface TableDataRow {
  time: string; // "HH:MM" 형식
  [key: string]: string | number | boolean | undefined; // 동적 컬럼 지원
}

/**
 * 테이블 헤더 정의
 */
export interface TableHeader {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
}

/**
 * 합계 데이터
 */
export interface SummaryData {
  totalControlCount?: number; // 총 제어횟수
  totalUsage?: number; // 총 사용량
  averagePeak?: number; // 평균 피크
  maxLoad?: number; // 최대부하
  totalReduction?: number; // 총 감축량
}

/**
 * 제어 데이터 (제어현황 탭용)
 */
export interface ControlData {
  totalCtrlTime?: string; // 총 제어시간 "HH:MM:SS"
  totalControlCount?: number; // 총 제어횟수
  ctrlDetails?: ControlDetail[]; // 제어 상세 정보
}

/**
 * 제어 상세 정보
 */
export interface ControlDetail {
  ctrlNumber: number; // 제어 번호 (1, 2, 3, 4...)
  ctrlTime: string; // 제어시간 "HH:MM:SS"
  isActive: boolean; // 활성 상태
}

/**
 * 범례 표시 상태
 */
export interface VisibleSeries {
  main: boolean; // 메인 데이터
  prev: boolean; // 전일/전월/전년 데이터
  compare: boolean; // 비교 데이터
}

/**
 * 데이터 변환 옵션
 */
export interface DataTransformOptions {
  convertWToKw?: boolean; // W → kW 변환 여부
  roundDigits?: number; // 반올림 자릿수
  includeRealTime?: boolean; // 실시간 데이터 포함 여부
}

/**
 * 로딩 상태 타입
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: Date;
}

/**
 * 프롭 타입들 (컴포넌트용)
 */
export interface UsageReportPageProps {
  // 필요시 추가
}

export interface UsageChartProps {
  chartData: ChartDataPoint[];
  loading: boolean;
  isLoading: boolean;
  activeTab: ActiveTab;
  theme: string;
  currentTab: ReportTab | undefined;
  visibleSeries: VisibleSeries;
  viewType: ViewType;
  graphUnit: GraphUnit;
  effectiveGraphUnit: GraphUnit;
  chartKey: number;
  getBarColor: (color?: string) => string;
  getBarColor2: (color?: string) => string;
  isTodaySelectedForLive: boolean;
  getCurrentTimeKey: () => string;
}

export interface DummyDataTableProps {
  tableHeaders: TableHeader[];
  tableData: TableDataRow[];
  loading: boolean;
  activeTab: ActiveTab;
}
