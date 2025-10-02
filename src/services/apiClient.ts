/**
 * API 클라이언트 설정
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { handleApiError } from './errorManager';

/**
 * API 베이스 URL 설정 (기본값 사용, 동적 URL은 필요시 추가)
 */
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

/**
 * organizationStore에서 plcSerial 가져오기
 */
export const getPlcSerial = (): string => {
  try {
    // localStorage에서 organization-store 직접 읽기
    const storedData = localStorage.getItem('organization-store');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      const plcSerial = parsedData?.state?.selectedOrganization?.plcSerial;
      if (plcSerial) {
        console.log('[API] plcSerial 가져옴:', plcSerial);
        return plcSerial;
      }
    }
    console.warn('[API] plcSerial을 찾을 수 없습니다.');
    return '';
  } catch (error) {
    console.warn('[API] plcSerial 가져오기 실패:', error);
    return '';
  }
};

/**
 * Axios 인스턴스 생성
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000, // 30초
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 요청 인터셉터
  client.interceptors.request.use(
    (config) => {
      // 동적으로 BaseURL 업데이트
      config.baseURL = getApiBaseUrl();
      
      // axios_util.js 방식으로 토큰 가져오기
      const getAuthToken = (): string | null => {
        // 1. axios defaults에서 확인 (axios_util.js에서 설정한 토큰)
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
          console.warn('[API] localStorage auth 파싱 실패:', error);
        }
        
        // 3. 기타 토큰 저장소들 확인
        return localStorage.getItem('authToken') || 
               localStorage.getItem('access_token') ||
               sessionStorage.getItem('authToken') ||
               sessionStorage.getItem('access_token');
      };
      
      const token = getAuthToken();
      if (token) {
        // Bearer가 이미 포함되어 있는지 확인
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        config.headers.Authorization = authHeader;
        console.log('[API] 토큰 추가됨:', `${authHeader.substring(0, 20)}...`);
      } else {
        console.warn('[API] 인증 토큰이 없습니다.');
      }

      // 요청 로깅 (개발 환경)
      if (import.meta.env.DEV) {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          params: config.params,
          data: config.data,
        });
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 응답 인터셉터
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // 응답 로깅 (개발 환경)
      if (import.meta.env.DEV) {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          data: response.data,
        });
      }

      // API 응답 코드 확인
      if (response.data?.resultCode && response.data.resultCode !== 200) {
        const error = new Error(response.data.resultMessage || 'API 에러');
        (error as any).response = response;
        throw error;
      }

      return response;
    },
    (error) => {
      // 에러 로깅 (개발 환경)
      if (import.meta.env.DEV) {
        console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }

      // 에러 매니저를 통한 처리
      const appError = handleApiError(error, `${error.config?.method?.toUpperCase()} ${error.config?.url}`);
      
      return Promise.reject(appError);
    }
  );

  return client;
};

/**
 * API 클라이언트 인스턴스
 */
export const apiClient = createApiClient();

/**
 * API 요청 래퍼 함수들
 */
export class ApiService {
  /**
   * GET 요청
   */
  static async get<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await apiClient.get<T>(url, config);
      return response.data;
    } catch (error) {
      throw error; // 이미 인터셉터에서 처리됨
    }
  }

  /**
   * POST 요청
   */
  static async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await apiClient.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw error; // 이미 인터셉터에서 처리됨
    }
  }

  /**
   * PUT 요청
   */
  static async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await apiClient.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw error; // 이미 인터셉터에서 처리됨
    }
  }

  /**
   * DELETE 요청
   */
  static async delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    try {
      const response = await apiClient.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw error; // 이미 인터셉터에서 처리됨
    }
  }

  /**
   * 쿼리 파라미터를 URL에 추가하는 헬퍼 함수
   */
  static buildUrlWithParams(baseUrl: string, params: Record<string, any>): string {
    const currentBaseUrl = getApiBaseUrl();
    const url = new URL(baseUrl, currentBaseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.pathname + url.search;
  }
}

export default ApiService;
