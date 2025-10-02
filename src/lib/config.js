// API 설정을 중앙화하는 파일
const isDevelopment = import.meta.env.DEV;

// 기본 사업장 ID 가져오기
const getDefaultOrganizationId = () => {
  return import.meta.env.VITE_DEFAULT_ORGANIZATION_ID;
};

// 사용량보고서 API URL
const getUsageApiBaseUrl = () => {
  const url = import.meta.env.VITE_USAGE_API_URL;
  console.log('VITE_USAGE_API_URL 환경변수:', url);
  if (!url) {
    console.warn('VITE_USAGE_API_URL 환경변수가 설정되지 않았습니다!');
    return 'http://175.114.130.5:8282'; // 임시 기본값
  }
  return url;
};

// 로그인용 API URL (iems2.store:8082)
const getLoginApiBaseUrl = () => {
  return import.meta.env.VITE_LOGIN_API_BASE_URL || 'http://iems.kr:8082';
};

// 일반 API URL (iems.store/api)
const getApiBaseUrl = () => {
  // return import.meta.env.VITE_API_BASE_URL || 'http://iems.store/api';
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const getWsBaseUrl = () => {
  // 환경 변수가 설정되어 있으면 사용, 없으면 기본값 사용
  const wsUrl = import.meta.env.VITE_WS_BASE_URL;
  if (wsUrl) {
    console.log('VITE_WS_BASE_URL 환경변수 사용:', wsUrl);
    return wsUrl;
  }
  console.log('VITE_WS_BASE_URL 환경변수가 설정되지 않아 기본값 사용');
  return 'http://iems.store';
};

const getWsLogBaseUrl = () => {
  return import.meta.env.VITE_WS_LOG_URL || 'http://iems.store';
};

// 개발 환경과 배포 환경에 따른 API URL 설정
export const API_CONFIG = {
  // 로그인용 API URL
  LOGIN_BASE_URL: getLoginApiBaseUrl(),
  
  // 일반 API URL
  BASE_URL: getApiBaseUrl(),
  
  // 사용량보고서 API URL
  USAGE_API_BASE_URL: getUsageApiBaseUrl(),
  
  // WebSocket URL
  WS_URL: getWsBaseUrl(),
  
  // 기본 사업장 ID
  DEFAULT_ORGANIZATION_ID: getDefaultOrganizationId(),

  // WebSocket Log URL
  WS_LOG_URL: getWsLogBaseUrl(),
  
  // API 엔드포인트들
  ENDPOINTS: {
    DEVICE_INFO: '/api/deviceinfo',
    GRAPH_DATA: '/api/deviceinfo/graph',
    REPORT_USAGE: '/api/report/usage',
    REPORT_CLOCK: '/api/report/clock',
    WS_SOCKJS: '/ws-sockjs',
    LOGIN: '/api2/auth/login',
    ORGANIZATION_LIST: '/api/organization/list'
  }
};

// 로그인 API URL 생성 헬퍼 함수
export const getLoginApiUrl = (endpoint) => {
  return `${API_CONFIG.LOGIN_BASE_URL}${endpoint}`;
};

// API URL 생성 헬퍼 함수
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// WebSocket URL 생성 헬퍼 함수
export const getWsUrl = (endpoint) => {
  return `${API_CONFIG.WS_URL}${endpoint}`;
};

// 기본 사업장 ID 가져오기 헬퍼 함수
export const getDefaultOrgId = () => {
  return API_CONFIG.DEFAULT_ORGANIZATION_ID;
};

// 사용량보고서 API URL 가져오기 헬퍼 함수
export const getUsageApiUrl = () => {
  return API_CONFIG.USAGE_API_BASE_URL;
};

// WebSocket Log URL 생성 헬퍼 함수
export const getWsLogUrl = (endpoint) => {
  return `${API_CONFIG.WS_LOG_URL}${endpoint}`;
};

/*
// 환경 정보 출력 (디버깅용)
console.log('현재 환경:', isDevelopment ? '개발' : '배포');
console.log('로그인 API BASE URL:', API_CONFIG.LOGIN_BASE_URL);
console.log('일반 API BASE URL:', API_CONFIG.BASE_URL);
console.log('WS BASE URL:', API_CONFIG.WS_URL);

// 환경 변수 사용 여부 확인
console.log('환경 변수 VITE_LOGIN_API_BASE_URL:', import.meta.env.VITE_LOGIN_API_BASE_URL || '설정되지 않음');
console.log('환경 변수 VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || '설정되지 않음');
console.log('환경 변수 VITE_WS_BASE_URL:', import.meta.env.VITE_WS_BASE_URL || '설정되지 않음'); 
*/