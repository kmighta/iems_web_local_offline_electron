/**
 * 보고서 API 커스텀 훅
 */
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import axios, { AxiosInstance } from 'axios';
import useOrganizationStore from '@/store/organizationStore';
import { getUsageApiUrl } from '@/lib/config';
import {
  HourlyReportParams,
  MonthlyReportParams, 
  YearlyReportParams,
  HourlyReportResponse,
  MonthlyReportResponse,
  YearlyReportResponse,
  HourlyReportData,
  MonthlyReportData,
  YearlyReportData,
} from '@/types/api';
import { AppError } from '@/types/error';

/**
 * 사용량보고서 전용 API 클라이언트 (고정 주소 사용)
 */
const createReportApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getUsageApiUrl(),
    timeout: 30000, // 30초
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 요청 인터셉터 - 토큰 추가
  client.interceptors.request.use(
    (config) => {
      console.log(`🚀 Report API 요청: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        params: config.params,
        baseURL: config.baseURL
      });
      
      // axios_util.js 방식으로 토큰 가져오기
      const getAuthToken = (): string | null => {
        // 1. axios defaults에서 확인
        const axiosToken = axios.defaults.headers?.['Authorization'];
        if (axiosToken && typeof axiosToken === 'string') {
          return axiosToken;
        }
        
        // 2. localStorage에서 auth 정보 확인
        try {
          const savedAuth = localStorage.getItem('auth');
          if (savedAuth) {
            const authData = JSON.parse(savedAuth);
            if (authData.token) {
              return authData.token;
            }
          }
        } catch (error) {
          console.warn('[Report API] localStorage auth 파싱 실패:', error);
        }
        
        return localStorage.getItem('authToken') || localStorage.getItem('access_token');
      };
      
      const token = getAuthToken();
      if (token) {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        config.headers.Authorization = authHeader;
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  client.interceptors.response.use(
    (response) => {
      console.log(`✅ Report API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
      return response;
    },
    (error) => {
      console.error(`❌ Report API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        fullUrl: `${error.config?.baseURL}${error.config?.url}`
      });
      
      // 연결 오류 특별 처리
      if (error.code === 'ERR_NETWORK' || error.message.includes('ERR_CONNECTION_REFUSED')) {
        console.error('🚨 서버 연결 실패:', {
          serverUrl: `${error.config?.baseURL}${error.config?.url}`,
          possibleCauses: [
            '1. 서버가 실행되지 않음',
            '2. 잘못된 포트 번호',
            '3. 방화벽 차단',
            '4. CORS 정책 문제',
            '5. 환경변수 미설정'
          ]
        });
      }
      
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * 사용량보고서 전용 API 클라이언트 인스턴스
 */
const reportApiClient = createReportApiClient();

/**
 * Query Keys
 */
export const REPORT_QUERY_KEYS = {
  hourly: (params: HourlyReportParams) => ['report', 'hourly', params] as const,
  monthly: (params: MonthlyReportParams) => ['report', 'monthly', params] as const,
  yearly: (params: YearlyReportParams) => ['report', 'yearly', params] as const,
} as const;

/**
 * React Query 기본 설정
 */
const QUERY_CONFIG = {
  staleTime: 20 * 60 * 1000, // 5분
  gcTime: 20 * 60 * 1000, // 15분 (구 cacheTime)
  refetchInterval: false, // 자동 리펫치 비활성화 (수동으로 필요할 때만)
  retry: 2,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 10000),
} as const;

/**
 * API 호출 함수들
 */
const reportApiFunctions = {
  /**
   * 시간별 구조화된 데이터 조회
   */
  async getHourlyReport(params: HourlyReportParams): Promise<HourlyReportResponse> {
    const response = await reportApiClient.get<HourlyReportResponse>('/api/report-new/hourly', {
      params
    });
    return response.data;
  },

  /**
   * 월별 집계 데이터 조회
   */
  async getMonthlyReport(params: MonthlyReportParams): Promise<MonthlyReportResponse> {
    const response = await reportApiClient.get<MonthlyReportResponse>('/api/report-new/monthly', {
      params
    });
    return response.data;
  },

  /**
   * 연별 집계 데이터 조회
   */
  async getYearlyReport(params: YearlyReportParams): Promise<YearlyReportResponse> {
    const response = await reportApiClient.get<YearlyReportResponse>('/api/report-new/yearly', {
      params
    });
    return response.data;
  },
};

/**
 * 시간별 보고서 데이터 훅
 */
export function useHourlyReport(
  params: Omit<HourlyReportParams, 'serialNumber'>, // serialNumber는 store에서 가져옴
  enabled: boolean = true
): UseQueryResult<HourlyReportData, AppError> {
  const { selectedOrganization } = useOrganizationStore();
  
  // organizationStore에서 plcSerial 가져오기 (serialNumber 대신)
  const serialNumber = selectedOrganization?.plcSerial || '';
  
  const fullParams: HourlyReportParams = {
    ...params,
    serialNumber,
  };

  return useQuery({
    queryKey: REPORT_QUERY_KEYS.hourly(fullParams),
    queryFn: async () => {
      const response = await reportApiFunctions.getHourlyReport(fullParams);
      return response.data;
    },
    enabled: enabled && !!serialNumber && !!params.date,
    ...QUERY_CONFIG,
  });
}

/**
 * 월별 보고서 데이터 훅
 */
export function useMonthlyReport(
  params: Omit<MonthlyReportParams, 'serialNumber'>, // serialNumber는 store에서 가져옴
  enabled: boolean = true
): UseQueryResult<MonthlyReportData, AppError> {
  const { selectedOrganization } = useOrganizationStore();
  
  // organizationStore에서 plcSerial 가져오기 (serialNumber 대신)
  const serialNumber = selectedOrganization?.plcSerial || '';
  
  const fullParams: MonthlyReportParams = {
    ...params,
    serialNumber,
  };

  return useQuery({
    queryKey: REPORT_QUERY_KEYS.monthly(fullParams),
    queryFn: async () => {
      const response = await reportApiFunctions.getMonthlyReport(fullParams);
      return response.data;
    },
    enabled: enabled && !!serialNumber && !!params.year && !!params.month,
    ...QUERY_CONFIG,
  });
}

/**
 * 연별 보고서 데이터 훅
 */
export function useYearlyReport(
  params: Omit<YearlyReportParams, 'serialNumber'>, // serialNumber는 store에서 가져옴
  enabled: boolean = true
): UseQueryResult<YearlyReportData, AppError> {
  const { selectedOrganization } = useOrganizationStore();
  
  // organizationStore에서 plcSerial 가져오기 (serialNumber 대신)
  const serialNumber = selectedOrganization?.plcSerial || '';
  
  const fullParams: YearlyReportParams = {
    ...params,
    serialNumber,
  };

  return useQuery({
    queryKey: REPORT_QUERY_KEYS.yearly(fullParams),
    queryFn: async () => {
      const response = await reportApiFunctions.getYearlyReport(fullParams);
      return response.data;
    },
    enabled: enabled && !!serialNumber && !!params.year,
    ...QUERY_CONFIG,
  });
}

/**
 * 보고서 데이터 통합 관리 훅
 */
export function useReportData(
  viewType: 'daily' | 'monthly' | 'yearly',
  date?: string,
  year?: number,
  month?: number
) {
  const queryClient = useQueryClient();

  // 일별 데이터
  const hourlyQuery = useHourlyReport(
    { date: date || '' },
    viewType === 'daily' && !!date
  );

  // 월별 데이터
  const monthlyQuery = useMonthlyReport(
    { year: year || 0, month: month || 0 },
    viewType === 'monthly' && !!year && !!month
  );

  // 연별 데이터
  const yearlyQuery = useYearlyReport(
    { year: year || 0 },
    viewType === 'yearly' && !!year
  );

  /**
   * 모든 캐시 무효화
   */
  const invalidateAllQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['report'],
    });
  };

  /**
   * 특정 타입 캐시 무효화
   */
  const invalidateQuery = async (type: 'hourly' | 'monthly' | 'yearly') => {
    await queryClient.invalidateQueries({
      queryKey: ['report', type],
    });
  };

  /**
   * 데이터 새로고침
   */
  const refetchCurrentData = async () => {
    switch (viewType) {
      case 'daily':
        return await hourlyQuery.refetch();
      case 'monthly':
        return await monthlyQuery.refetch();
      case 'yearly':
        return await yearlyQuery.refetch();
    }
  };

  // 현재 활성화된 쿼리 반환
  const getCurrentQuery = () => {
    switch (viewType) {
      case 'daily':
        return hourlyQuery;
      case 'monthly':
        return monthlyQuery;
      case 'yearly':
        return yearlyQuery;
      default:
        return hourlyQuery;
    }
  };

  const currentQuery = getCurrentQuery();

  return {
    // 개별 쿼리들
    hourlyQuery,
    monthlyQuery,
    yearlyQuery,

    // 현재 활성 쿼리
    data: currentQuery.data,
    isLoading: currentQuery.isLoading,
    isFetching: currentQuery.isFetching,
    error: currentQuery.error,
    isError: currentQuery.isError,

    // 유틸리티 함수들
    invalidateAllQueries,
    invalidateQuery,
    refetchCurrentData,
  };
}

/**
 * 에러 상태 관리 훅
 */
export function useReportErrors() {
  const queryClient = useQueryClient();

  /**
   * 모든 에러 초기화
   */
  const clearAllErrors = () => {
    queryClient.removeQueries({
      queryKey: ['report'],
      type: 'inactive',
    });
  };

  /**
   * 실패한 쿼리 재시도
   */
  const retryFailedQueries = async () => {
    await queryClient.refetchQueries({
      queryKey: ['report'],
      type: 'active',
      stale: true,
    });
  };

  return {
    clearAllErrors,
    retryFailedQueries,
  };
}
