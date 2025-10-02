import { useAuth } from "@/router/router";
import axios from "axios";

// 네비게이션 콜백 저장
let navigationCallback = null;
let lastRedirectTime = 0;
const REDIRECT_COOLDOWN = 1000; // 1초 쿨다운

export const setNavigationCallback = (callback) => {
  navigationCallback = callback;
};

const redirectToLogin = () => {
    const now = Date.now();
    if (now - lastRedirectTime < REDIRECT_COOLDOWN) {
        console.log("Redirect cooldown active, skipping redirect");
        return;
    }
    
    lastRedirectTime = now;
    console.log("Redirecting to login");
    
    if (navigationCallback) {
        navigationCallback("/login");
    } else {
        window.location.href = "/login";
    }
};

axios.defaults.baseURL = "/api";
axios.defaults.headers = {
  "Content-Type": "application/json",
};
var isLogin = false;

// 토큰 갱신용 별도 axios 인스턴스
const refreshAxios = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // 쿠키 포함
});

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
        console.error('API 활동 시간 업데이트 실패:', error);
    }
};

axios.interceptors.response.use(
    (response) => {
        // API 요청 성공 시 활동 시간 업데이트
        updateLastActivity();
        return response;
    },
    (error) => {
        console.log("Axios error intercepted:", {
            status: error.response?.status,
            url: error.config?.url,
            isLogin,
            hasAuthHeader: !!error.config?.headers?.Authorization
        });
        
        const originalRequest = error.config;
        
        if (error.response && error.response.status === 401 && isLogin && !originalRequest._retry) {
            console.log("401 error detected, attempting token refresh...");
            const rememberMe = localStorage.getItem("rememberMe");
            
            if (isRefreshing) {
                // 이미 refresh 중이면 대기열에 추가
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = token;
                    return axios.request(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }
            
            originalRequest._retry = true;
            
            if (rememberMe) {
                isRefreshing = true;
                console.log("Attempting to refresh token...");
                
                // 별도 인스턴스로 토큰 갱신 요청
                return refreshAxios.post("/auth/refresh").then((res) => {
                    if (res.status === 200) {
                        const newToken = res.headers.authorization;
                        console.log("Token refreshed successfully");
                        setAxiosToken(newToken);
                        processQueue(null, newToken);
                        
                        // 원래 요청 재시도 - refreshAxios로 재시도하여 인터셉터 중복 방지
                        originalRequest.headers.Authorization = newToken;
                        return refreshAxios.request(originalRequest);
                    }
                }).catch((refreshError) => {
                    console.log("Token refresh failed:", refreshError);
                    processQueue(refreshError, null);
                    localStorage.removeItem("auth");
                    localStorage.removeItem("rememberMe");
                    removeAxiosToken();
                    isLogin = false;

                    redirectToLogin();
                    return Promise.reject(refreshError);
                }).finally(() => {
                    isRefreshing = false;
                });
            } else {
                console.log("No rememberMe token, redirecting to login");
                localStorage.removeItem("auth");
                localStorage.removeItem("rememberMe");
                removeAxiosToken();
                isLogin = false;

                redirectToLogin();
            }
        } else if (error.response && error.response.status === 401 && !isLogin) {
            // 로그인되지 않은 상태에서 401 발생 시
            console.log("401 error but not logged in, redirecting to login");
            redirectToLogin();
        }
        return Promise.reject(error);
    }
);

export const setAxiosToken = (token) => {
    console.log("Setting axios token:", token ? "Token provided" : "No token");
    if (token) {
        axios.defaults.headers["Authorization"] = token;
        isLogin = true;
    } else {
        delete axios.defaults.headers["Authorization"];
        isLogin = false;
    }
}

export const removeAxiosToken = () => {
    console.log("Removing axios token");
    delete axios.defaults.headers["Authorization"];
    isLogin = false;
}

export const getAxiosToken = () => {
    return axios.defaults.headers["Authorization"];
}

export const isAxiosLoggedIn = () => {
    return isLogin && !!axios.defaults.headers["Authorization"];
}

export default axios;