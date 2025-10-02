import axios from "axios";
import { setAxiosToken } from "./axios_util";
import useOrganizationStore from "@/store/organizationStore";

// 네비게이션 콜백 저장
let navigationCallback = null;

export const setNavigationCallback = (callback) => {
  navigationCallback = callback;
};

function deriveTarget(apiUrl) {
  if (!apiUrl) return null;
  try {
    const u = new URL(apiUrl);
    // 포트 없으면 프로토콜 기본포트 사용
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    return `${u.hostname}:${port}`;
  } catch {
    // 혹시 '175.114.130.5:8082' 처럼 올 수도 있음
    return apiUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

// 동적 API URL을 사용하는 axios 인스턴스 생성 함수
export const createDynamicAxios = (baseURL = '/api', id = null) => {
  /*
  const instance = axios.create({
    baseURL: baseURL || 'https://iems.store/api',
    // baseURL: baseURL || '/api',
    headers: {
      "Content-Type": "application/json",
    }
  });
  */
  // 1) target(host:port) 결정
  //const fallbackHost = "175.114.130.5";
  //const fallbackPort = "8082";
  // const target = deriveTarget(baseURL) || `${fallbackHost}:${fallbackPort}`;
  const target = deriveTarget(baseURL);

  // 2) 브릿지 전용 인스턴스
  //    baseURL는 '/api-bridge' 로 고정하고,
  //    target은 query param으로 항상 붙입니다.
  var instance;
  if (baseURL !== '/api') {
    instance = axios.create({
      baseURL: "/api-bridge",                 // ☆ 여기 뒤에 API 경로가 붙습니다 (예: /deviceinfo/...)
      params: { target },                     // ☆ target=host:port (인코딩 금지)
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });}
  else {
    // 웹소켓 사용시
    instance = axios.create({
      // baseURL: `${import.meta.env.VITE_PROXY_WEBSOCKET_URL}/api/socket-proxy/${id}/api`,
      baseURL: `${import.meta.env.VITE_USAGE_API_URL}/api`,
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 현재 auth token 복사
  const currentAuth = axios.defaults.headers["Authorization"];
  if (currentAuth) {
    instance.defaults.headers["Authorization"] = currentAuth;
  }

  // refresh 요청 중복 방지
  let isRefreshing = false;
  let failedQueue = [];

  const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    failedQueue = [];
  };

  // 활동 시간 업데이트 함수
  const updateLastActivity = () => {
      try {
          const savedAuth = localStorage.getItem('auth');
          if (savedAuth) {
              const authData = JSON.parse(savedAuth);
              if (authData.user) { // 로그인 상태인 경우에만
                  authData.lastActivityTime = Date.now();
                  localStorage.setItem('auth', JSON.stringify(authData));
              }
          }
      } catch (error) {
          console.error('Dynamic API 활동 시간 업데이트 실패:', error);
      }
  };

  // 응답 인터셉터는 기본 axios와 동일하게 설정
  instance.interceptors.response.use(
    (response) => {
      // API 요청 성공 시 활동 시간 업데이트
      updateLastActivity();
      return response;
    },
    (error) => {
      const originalRequest = error.config;
      
      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          // 이미 refresh 중이면 대기열에 추가
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then(token => {
            originalRequest.headers.Authorization = token;
            return instance.request(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        const rememberMe = localStorage.getItem("rememberMe");
        
        if (rememberMe) {
          isRefreshing = true;
          
          return axios.post("/auth/refresh").then((res) => {
            if (res.status === 200) {
              const newToken = res.headers.authorization;
              setAxiosToken(newToken);
              // 동적 인스턴스도 토큰 업데이트
              instance.defaults.headers["Authorization"] = newToken;
              processQueue(null, newToken);
              
              // 원래 요청 재시도
              originalRequest.headers["Authorization"] = newToken;
              return instance.request(originalRequest);
            }
          }).catch((refreshError) => {
            processQueue(refreshError, null);
            localStorage.removeItem("auth");
            localStorage.removeItem("rememberMe");
            
            // React Router를 통한 네비게이션
            if (navigationCallback) {
              navigationCallback("/login");
            } else {
              // 폴백으로 window.location 사용
              window.location.href = "/";
            }
            return Promise.reject(refreshError);
          }).finally(() => {
            isRefreshing = false;
          });
        } else {
          localStorage.removeItem("auth");
          localStorage.removeItem("rememberMe");
          
          // React Router를 통한 네비게이션
          if (navigationCallback) {
            navigationCallback("/login");
          } else {
            // 폴백으로 window.location 사용
            window.location.href = "/";
          }
        }
      } else if (error.response?.status === 401) {
        // 로그인되지 않은 상태에서 401 발생 시
        if (navigationCallback) {
          navigationCallback("/login");
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// 사업장별 API URL을 사용하는 axios 인스턴스 생성
export const getOrganizationAxios = () => {
  const { getCurrentApiUrl, selectedOrganization } = useOrganizationStore.getState();
  
  // selectedOrganization이 있으면 해당 조직의 ID를 사용, 없으면 기본값 사용
  const organizationId = selectedOrganization?.id || "default";
  
  return createDynamicAxios(getCurrentApiUrl(), organizationId);
};

export default createDynamicAxios;
