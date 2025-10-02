import { createBrowserRouter, Navigate, useNavigate, Link, useParams, useLocation } from 'react-router-dom';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import useOrganizationStore from '../store/organizationStore';
import { setNavigationCallback as setAxiosNavigationCallback } from '../api/axios_util';
import { setNavigationCallback as setDynamicAxiosNavigationCallback } from '../api/dynamic_axios';
import { setAxiosToken, removeAxiosToken } from '../api/axios_util';
import { getOrganization } from '../api/organization';
import { useWebSocket } from '../hooks/useWebSocket';
import { useLogWebSocket } from '../hooks/useLogWebSocket';

// 사업장 관련 페이지 경로들 정의 (웹소켓이 연결되는 페이지들)
const ORGANIZATION_PAGES = [
  '/monitoring',
  '/usage-report',
  '/settings',
  '/devices',
  '/schedule',
  '/peak-demand',
];

// 관리자의 특정 사업장 페이지 패턴 (/admin/stores/:storeId/...)
const ADMIN_ORGANIZATION_PAGE_PATTERN = /^\/admin\/stores\/[^\/]+\//;

// 레이아웃 컴포넌트
import Layout from '../components/layout';
import AdminLayout from '../components/admin-layout';
import LoginPage from '../components/login-page';

// 관리자 전용 페이지
import AdminDashboardPage from '../components/admin-dashboard-page';
import UserManagementPage from '../components/user-management-page';
import StoresListPage from '../components/stores-management-page';
import IemuManagementPage from '../components/iemu-management-page';
import EventLogPage from '../components/event-log-page';
import ProfilePage from '../components/profile-page';
import NotificationPage from '../components/notification-page';
import AlarmPage from '../components/alarm-page';

// 일반 사용자 페이지
import MonitoringPage from '../components/monitoring-page';
import SettingsPage from '../components/settings-page';
import DevicesPage from '../components/devices-page';
import SchedulePage from '../components/schedule-page';
import PeakDemandPage from '../components/peak-demand-page';
import UsageReportPage from '@/components/usage-report-page';

// 인증 컨텍스트 생성
export const AuthContext = createContext();

// throttle 함수 구현
const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

// 로그 웹소켓 연결을 위한 컴포넌트
const LogWebSocketConnector = () => {
  useLogWebSocket();
  return null;
};

// 인증 프로바이더 컴포넌트
export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // 인증 로딩 상태 추가
  const [loginTime, setLoginTime] = useState(null); // 로그인 시간 추가
  const [lastActivityTime, setLastActivityTime] = useState(null); // 마지막 활동 시간 추가
  const { setUserId: setStoreUserId } = useOrganizationStore();

  useEffect(() => {
    // 로컬 스토리지에서 인증 정보 복원
    const restoreAuth = async () => {
      try {
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          const { user, role, store, token, userId: savedUserId, userData, loginTime: savedLoginTime, lastActivityTime: savedLastActivityTime } = JSON.parse(savedAuth);
          
          // 활동 시간 기준으로 세션 만료 체크 (6시간 = 21600000ms)
          const currentTime = Date.now();
          const loginTimeMs = savedLoginTime || currentTime;
          const lastActivityTimeMs = savedLastActivityTime || loginTimeMs;
          const sixHours = 6 * 60 * 60 * 1000; // 6시간을 밀리초로 변환
          
          // 마지막 활동 시간으로부터 6시간 경과 체크
          if (currentTime - lastActivityTimeMs > sixHours) {
            // 6시간 경과 시 세션 만료 처리
            console.log("사용자 활동 기준 세션이 만료되었습니다 (6시간 경과)");
            localStorage.removeItem('auth');
            localStorage.removeItem("rememberMe");
            
            // 만료 알림을 위한 플래그 설정
            localStorage.setItem('sessionExpired', 'true');
            setIsAuthLoading(false);
            return;
          }
          
          console.log("Auth restore - role from localStorage:", role);
          setCurrentUser(user);
          setUserRole(role);
          console.log("Auth restore - userRole set to:", role);
          setSelectedStore(store);
          setToken(token);
          setUserId(savedUserId);
          setLoginTime(loginTimeMs);
          setLastActivityTime(lastActivityTimeMs);
          setStoreUserId(savedUserId); // Zustand에 저장
          
          // 사용자 정보가 있으면 organizationStore에 저장
          if (userData) {
            const { setUserInfo } = useOrganizationStore.getState();
            setUserInfo(userData);
          }
          
          console.log("Restoring auth with token:", token ? "Token exists" : "No token");
          setAxiosToken(token);
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('인증 정보 복원 실패:', error);
        localStorage.removeItem('auth');
      } finally {
        setIsAuthLoading(false); // 인증 로딩 완료
      }
    };

    restoreAuth();
  }, []);

  const login = (username, role, token = null, store = null, userId = null, userData = null) => {
    const currentTime = Date.now();
    
    console.log("Login function - role parameter:", role);
    setCurrentUser(username);
    setUserRole(role);
    console.log("Login function - userRole set to:", role);
    setSelectedStore(store);
    setToken(token);
    setUserId(userId);
    setLoginTime(currentTime);
    setLastActivityTime(currentTime); // 로그인 시 활동 시간도 설정
    setStoreUserId(userId); // Zustand에 저장
    
    // 사용자 정보가 있으면 organizationStore에 저장
    if (userData) {
      const { setUserInfo } = useOrganizationStore.getState();
      setUserInfo(userData);
    }
    
    console.log("Login with token:", token ? "Token provided" : "No token");
    setAxiosToken(token);
    setIsLoggedIn(true);
    
    // 로컬 스토리지에 인증 정보 저장 (로그인 시간 및 활동 시간 포함)
    localStorage.setItem('auth', JSON.stringify({
      user: username,
      role: role,
      store: store,
      token: token,
      userId: userId,
      userData: userData,
      loginTime: currentTime,
      lastActivityTime: currentTime
    }));
  };

  const logout = () => {
    console.log("AuthProvider: Logging out user");
    
    // 웹소켓 연결 해제
    const { disconnectWebSocketOnLeave } = useOrganizationStore.getState();
    if (disconnectWebSocketOnLeave) {
      console.log("로그아웃으로 인한 웹소켓 연결 해제");
      disconnectWebSocketOnLeave();
    }
    
    // 로그 웹소켓 연결 해제 (useLogWebSocket에서 자동으로 처리됨)
    
    setCurrentUser(null);
    setUserRole(null);
    setSelectedStore(null);
    setToken(null);
    setUserId(null);
    setStoreUserId(null); // Zustand에서도 초기화
    
    // organizationStore에서 사용자 정보 초기화
    const { clearUserInfo } = useOrganizationStore.getState();
    clearUserInfo();
    
    removeAxiosToken();
    setIsLoggedIn(false);
    localStorage.removeItem('auth');
    localStorage.removeItem("rememberMe");
  };

  // 토큰 상태 동기화를 위한 함수
  const checkAuthStatus = () => {
    const savedAuth = localStorage.getItem('auth');
    if (!savedAuth && isLoggedIn) {
      console.log("AuthProvider: Auth removed from localStorage, logging out");
      logout();
    }
  };

  // 사용자 활동 감지 및 세션 연장 함수
  const updateLastActivity = () => {
    if (isLoggedIn) {
      const currentTime = Date.now();
      setLastActivityTime(currentTime);
      
      // localStorage 업데이트
      try {
        const savedAuth = localStorage.getItem('auth');
        if (savedAuth) {
          const authData = JSON.parse(savedAuth);
          authData.lastActivityTime = currentTime;
          localStorage.setItem('auth', JSON.stringify(authData));
        }
      } catch (error) {
        console.error('활동 시간 업데이트 실패:', error);
      }
    }
  };

  // 사용자 활동 감지를 위한 이벤트 리스너 등록
  useEffect(() => {
    if (!isLoggedIn) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const throttledUpdateActivity = throttle(updateLastActivity, 30000); // 30초마다 한 번만 업데이트

    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true);
      });
    };
  }, [isLoggedIn]);

  // 주기적으로 토큰 상태 및 세션 만료 체크
  useEffect(() => {
    const checkSessionExpiry = () => {
      if (isLoggedIn && lastActivityTime) {
        const currentTime = Date.now();
        const sixHours = 6 * 60 * 60 * 1000; // 6시간을 밀리초로 변환
        
        // 마지막 활동 시간으로부터 6시간 경과 체크
        if (currentTime - lastActivityTime > sixHours) {
          console.log("사용자 비활성으로 인한 세션 만료, 자동 로그아웃 처리");
          
          // 만료 알림을 위한 플래그 설정
          localStorage.setItem('sessionExpired', 'true');
          logout();
          return;
        }
      }
      
      // 기존 토큰 상태 체크
      checkAuthStatus();
    };
    
    const interval = setInterval(checkSessionExpiry, 60000); // 1분마다 체크
    return () => clearInterval(interval);
  }, [isLoggedIn, lastActivityTime]);

  const value = {
    isLoggedIn,
    user: currentUser, // user 필드 추가 (useLogWebSocket에서 사용)
    currentUser,
    userRole,
    selectedStore,
    login,
    logout,
    setSelectedStore,
    token,
    userId,
    isAuthLoading // 인증 로딩 상태 추가
  };

  // 인증 로딩 중일 때는 로딩 스피너 표시
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {/* 로그인한 사용자에 대해 로그 웹소켓 연결 */}
      {isLoggedIn && <LogWebSocketConnector />}
      {children}
    </AuthContext.Provider>
  );
};

// 인증 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 페이지 변경 감지 및 웹소켓 해제 컴포넌트
const PageChangeDetector = ({ children }) => {
  const location = useLocation();
  const { resetMonitoringOnLeave } = useOrganizationStore();
  const prevLocationRef = useRef(null);

  // 사업장 관련 페이지인지 확인하는 함수
  const isOrganizationPage = (path) => {
    // 일반 사용자 사업장 페이지들
    const isUserOrgPage = ORGANIZATION_PAGES.some(orgPath => path.startsWith(orgPath));
    // 관리자 특정 사업장 페이지들 (/admin/stores/:storeId/...)
    const isAdminOrgPage = ADMIN_ORGANIZATION_PAGE_PATTERN.test(path);

    return isUserOrgPage || isAdminOrgPage;
  };

  // 웹소켓 연결은 AdminLayout에서 관리

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current;

    // 이전 경로가 있고, 사업장 페이지에서 다른 페이지로 이동한 경우
    if (prevPath && prevPath !== currentPath) {
      const wasPrevOrganizationPage = isOrganizationPage(prevPath);
      const isCurrentOrganizationPage = isOrganizationPage(currentPath);

      if (wasPrevOrganizationPage && !isCurrentOrganizationPage) {
        console.log('사업장 페이지에서 다른 페이지로 이동, 모니터링 상태만 초기화 (웹소켓 재시도 유지):', { prevPath, currentPath });
        resetMonitoringOnLeave();
      }
    }

    // 현재 경로를 이전 경로로 저장
    prevLocationRef.current = currentPath;
  }, [location.pathname, resetMonitoringOnLeave]);

  return children;
};

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    console.log("ProtectedRoute: Not authenticated, redirecting to login from:", location.pathname);
    // 무한 루프 방지: 이미 로그인 페이지라면 그냥 렌더링
    if (location.pathname === '/login') {
      return children;
    }
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// 관리자 전용 라우트 컴포넌트 - 기본 사업장 자동 접근 모드
const AdminRoute = ({ children }) => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();
  const useOrganizationStore = (() => {
    try {
      return require('@/store/organizationStore').default;
    } catch {
      return null;
    }
  })();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // 토큰이 있는 상태에서 관리자 페이지 접근 시 기본 사업장으로 리다이렉트
  const { selectedOrganization } = useOrganizationStore ? useOrganizationStore.getState() : { selectedOrganization: null };
  
  if (selectedOrganization) {
    console.log('관리자 페이지 접근 차단 - 기본 사업장으로 리다이렉트:', selectedOrganization.id);
    return <Navigate to={`/admin/stores/${selectedOrganization.id}/monitoring`} replace />;
  }

  // 사업장 정보가 없으면 기본 사업장 ID로 강제 이동
  const { getDefaultOrgId } = (() => {
    try {
      return require('@/lib/config');
    } catch {
      return { getDefaultOrgId: () => '7ebd6c75-6917-4f7e-9087-71ddede2a13c' };
    }
  })();
  
  const defaultOrgId = getDefaultOrgId();
  console.log('사업장 정보 없음 - 기본 사업장으로 강제 리다이렉트:', defaultOrgId);
  return <Navigate to={`/admin/stores/${defaultOrgId}/monitoring`} replace />;
};

// 사용자 전용 라우트 컴포넌트 - 기본 사업장 자동 접근 모드
const UserRoute = ({ children }) => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();
  const useOrganizationStore = (() => {
    try {
      return require('@/store/organizationStore').default;
    } catch {
      return null;
    }
  })();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== "user" && userRole !== "engineer" && userRole !== "owner" && 
      userRole !== "admin_owner" && userRole !== "admin_engineer" && userRole !== "admin_user") {
    alert('회원전용 페이지 입니다.');
    return <Navigate to="/login" replace />;
  }

  // 토큰이 있는 상태에서 사용자 페이지 직접 접근 시 기본 사업장으로 리다이렉트
  const { selectedOrganization } = useOrganizationStore ? useOrganizationStore.getState() : { selectedOrganization: null };
  
  if (selectedOrganization) {
    console.log('사용자 페이지 직접 접근 차단 - 기본 사업장으로 리다이렉트:', selectedOrganization.id);
    return <Navigate to={`/admin/stores/${selectedOrganization.id}/monitoring`} replace />;
  }

  // 사업장 정보가 없으면 기본 사업장 ID로 강제 이동
  const { getDefaultOrgId } = (() => {
    try {
      return require('@/lib/config');
    } catch {
      return { getDefaultOrgId: () => '7ebd6c75-6917-4f7e-9087-71ddede2a13c' };
    }
  })();
  
  const defaultOrgId = getDefaultOrgId();
  console.log('사용자 페이지 접근 - 기본 사업장으로 강제 리다이렉트:', defaultOrgId);
  return <Navigate to={`/admin/stores/${defaultOrgId}/monitoring`} replace />;
};

// 사용자 관리 전용 라우트 컴포넌트 - 기본 사업장 자동 접근 모드
const UserManagementRoute = ({ children }) => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();
  const useOrganizationStore = (() => {
    try {
      return require('@/store/organizationStore').default;
    } catch {
      return null;
    }
  })();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== "admin" && userRole !== "owner" && 
      userRole !== "admin_owner" && userRole !== "admin_engineer" && userRole !== "admin_user") {
    alert('관리자 권한이 필요합니다.');
    return <Navigate to="/login" replace />;
  }

  // 토큰이 있는 상태에서 관리자 전용 페이지 접근 시 기본 사업장으로 리다이렉트
  const { selectedOrganization } = useOrganizationStore ? useOrganizationStore.getState() : { selectedOrganization: null };
  
  if (selectedOrganization) {
    console.log('관리자 전용 페이지 접근 차단 - 기본 사업장으로 리다이렉트:', selectedOrganization.id);
    return <Navigate to={`/admin/stores/${selectedOrganization.id}/monitoring`} replace />;
  }

  // 사업장 정보가 없으면 기본 사업장 ID로 강제 이동
  const { getDefaultOrgId } = (() => {
    try {
      return require('@/lib/config');
    } catch {
      return { getDefaultOrgId: () => '7ebd6c75-6917-4f7e-9087-71ddede2a13c' };
    }
  })();
  
  const defaultOrgId = getDefaultOrgId();
  console.log('관리자 전용 페이지 접근 - 기본 사업장으로 강제 리다이렉트:', defaultOrgId);
  return <Navigate to={`/admin/stores/${defaultOrgId}/monitoring`} replace />;
};

// 모든 사용자 접근 가능 라우트 컴포넌트 (로그인만 필요)
const AllUserRoute = ({ children }) => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // 로그인만 되어 있으면 모든 권한 접근 가능
  return children;
};

// Owner 전용 라우트 컴포넌트 - 기본 사업장 자동 접근 모드
const OwnerRoute = ({ children }) => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();
  const location = useLocation();
  const useOrganizationStore = (() => {
    try {
      return require('@/store/organizationStore').default;
    } catch {
      return null;
    }
  })();

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== "owner" && userRole !== "admin_owner" && userRole !== "admin") {
    alert('해당 페이지는 owner, admin_owner, admin 권한만 접근 가능합니다.');
    // 토큰이 있는 상태에서 권한 없으면 기본 사업장으로 리다이렉트
    const { getDefaultOrgId } = (() => {
      try {
        return require('@/lib/config');
      } catch {
        return { getDefaultOrgId: () => '7ebd6c75-6917-4f7e-9087-71ddede2a13c' };
      }
    })();
    
    const defaultOrgId = getDefaultOrgId();
    return <Navigate to={`/admin/stores/${defaultOrgId}/monitoring`} replace />;
  }

  // 회원관리 페이지는 리다이렉트 예외로 두고 그대로 렌더링
  if (location.pathname === '/user-management') {
    return children;
  }

  // 그 외 OwnerRoute 적용 페이지에 대해서만 기존 리다이렉트 로직 유지 (필요 시)
  const { selectedOrganization } = useOrganizationStore ? useOrganizationStore.getState() : { selectedOrganization: null };
  if (selectedOrganization) {
    console.log('Owner 페이지 접근 차단 - 기본 사업장으로 리다이렉트:', selectedOrganization.id);
    return <Navigate to={`/admin/stores/${selectedOrganization.id}/monitoring`} replace />;
  }

  const { getDefaultOrgId } = (() => {
    try {
      return require('@/lib/config');
    } catch {
      return { getDefaultOrgId: () => '7ebd6c75-6917-4f7e-9087-71ddede2a13c' };
    }
  })();
  const defaultOrgId = getDefaultOrgId();
  console.log('Owner 페이지 접근 - 기본 사업장으로 강제 리다이렉트:', defaultOrgId);
  return <Navigate to={`/admin/stores/${defaultOrgId}/monitoring`} replace />;
};

// 프로필 페이지 레이아웃 래퍼 (권한에 따라 적절한 레이아웃 선택)
const ProfileLayoutWrapper = ({ children }) => {
  const { currentUser, userRole, logout, setSelectedStore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { setSelectedOrganization, selectedOrganization } = useOrganizationStore();
  
  useEffect(() => {
    // axios 유틸에 네비게이션 콜백 설정
    setAxiosNavigationCallback(navigate);
    setDynamicAxiosNavigationCallback(navigate);
  }, [navigate]);

  // admin, han, 새로운 관리자 역할들은 AdminLayout 사용
  if (userRole === "admin" || userRole === "han" || 
      userRole === "admin_owner" || userRole === "admin_engineer" || userRole === "admin_user") {
    return (
      <PageChangeDetector>
        <StoreSync>
          <AdminLayout
            currentUser={currentUser}
            userRole={userRole}
            onLogout={logout}
          >
            {children}
          </AdminLayout>
        </StoreSync>
      </PageChangeDetector>
    );
  }

  // 나머지 권한은 UserLayout 사용
  return (
    <PageChangeDetector>
      <StoreSync>
        <Layout
          currentUser={currentUser}
          userRole={userRole}
          selectedStore={selectedOrganization}
          onLogout={logout}
        >
          {children}
        </Layout>
      </StoreSync>
    </PageChangeDetector>
  );
};

// 사용자 관리 레이아웃 래퍼 (admin은 AdminLayout, owner는 UserLayout)
const UserManagementLayoutWrapper = ({ children }) => {
  const { currentUser, userRole, logout, setSelectedStore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { setSelectedOrganization, selectedOrganization } = useOrganizationStore();
  
  useEffect(() => {
    // axios 유틸에 네비게이션 콜백 설정
    setAxiosNavigationCallback(navigate);
    setDynamicAxiosNavigationCallback(navigate);
  }, [navigate]);

  // URL에서 storeId가 있으면 해당 사업장 정보 유지
  useEffect(() => {
    const storeId = params.storeId;
    console.log('=== UserManagementLayoutWrapper 사업장 정보 설정 ===', {
      storeId,
      selectedOrganization,
      currentPath: location.pathname
    });
    
    if (storeId && (!selectedOrganization || selectedOrganization.id !== storeId)) {
      // API에서 사업장 정보 가져오기
      const fetchOrganization = async () => {
        try {
          // 먼저 localStorage에서 확인
          const lastSelectedOrg = localStorage.getItem('lastSelectedOrganization');
          if (lastSelectedOrg) {
            const orgData = JSON.parse(lastSelectedOrg);
            if (orgData.id === storeId) {
              console.log('localStorage에서 사업장 정보 복원:', orgData);
              setSelectedOrganization(orgData);
              return;
            }
          }
          
          // localStorage에 없으면 API 호출
          console.log('API에서 사업장 정보 가져오기:', storeId);
          const orgData = await getOrganization(storeId);
          console.log('API에서 가져온 사업장 정보:', orgData);
          setSelectedOrganization(orgData);
        } catch (error) {
          console.error('사업장 정보 로드 실패:', error);
          // API 실패 시 localStorage에서 복원 시도
          const lastSelectedOrg = localStorage.getItem('lastSelectedOrganization');
          if (lastSelectedOrg) {
            try {
              const orgData = JSON.parse(lastSelectedOrg);
              if (orgData.id === storeId) {
                console.log('API 실패 후 localStorage에서 사업장 정보 복원:', orgData);
                setSelectedOrganization(orgData);
              }
            } catch (parseError) {
              console.error('localStorage 사업장 정보 복원 실패:', parseError);
            }
          }
        }
      };

      fetchOrganization();
    }
  }, [params.storeId]); // selectedOrganization과 setSelectedOrganization을 의존성에서 제거하여 무한 루프 방지
  
  // 사업장 관련 페이지에서는 모든 사용자에게 AdminLayout 사용
  return (
    <StoreSync>
      <AdminLayout 
        currentUser={currentUser}
        userRole={userRole}
        onLogout={logout}
        onStoreSelect={setSelectedStore}
      >
        {children}
      </AdminLayout>
    </StoreSync>
  );
};

// 스토어 동기화 컴포넌트
const StoreSync = ({ children }) => {
  const [isHydrated, setIsHydrated] = useState(false);
  const isLoading = useOrganizationStore((state) => state.isLoading);

  useEffect(() => {
    // Zustand persist가 완료될 때까지 대기
    const unsubscribe = useOrganizationStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // 이미 hydrated 상태인 경우
    if (useOrganizationStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return unsubscribe;
  }, []);

  if (!isHydrated || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return children;
};

// 관리자 레이아웃 래퍼
const AdminLayoutWrapper = ({ children }) => {
  const { currentUser, userRole, logout, setSelectedStore } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const { setSelectedOrganization, selectedOrganization } = useOrganizationStore();
  
  useEffect(() => {
    // axios 유틸에 네비게이션 콜백 설정
    setAxiosNavigationCallback(navigate);
    setDynamicAxiosNavigationCallback(navigate);
  }, [navigate]);

  // URL에서 storeId가 있으면 해당 사업장 정보 유지
  useEffect(() => {
    const storeId = params.storeId;
    if (storeId && (!selectedOrganization || selectedOrganization.id !== storeId)) {
      // API에서 사업장 정보 가져오기
      const fetchOrganization = async () => {
        try {
          // 먼저 localStorage에서 확인
          const lastSelectedOrg = localStorage.getItem('lastSelectedOrganization');
          if (lastSelectedOrg) {
            const orgData = JSON.parse(lastSelectedOrg);
            if (orgData.id === storeId) {
              setSelectedOrganization(orgData);
              return;
            }
          }
          
          // localStorage에 없으면 API 호출
          const orgData = await getOrganization(storeId);
          setSelectedOrganization(orgData);
        } catch (error) {
          console.error('사업장 정보 로드 실패:', error);
          // API 실패 시 localStorage에서 복원 시도
          const lastSelectedOrg = localStorage.getItem('lastSelectedOrganization');
          if (lastSelectedOrg) {
            try {
              const orgData = JSON.parse(lastSelectedOrg);
              if (orgData.id === storeId) {
                setSelectedOrganization(orgData);
              }
            } catch (parseError) {
              console.error('localStorage 사업장 정보 복원 실패:', parseError);
            }
          }
        }
      };

      fetchOrganization();
    }
  }, [params.storeId]); // selectedOrganization과 setSelectedOrganization을 의존성에서 제거하여 무한 루프 방지
  
  return (
    <PageChangeDetector>
      <StoreSync>
        <AdminLayout
          currentUser={currentUser}
          userRole={userRole}
          onLogout={logout}
          onStoreSelect={setSelectedStore}
        >
          {children}
        </AdminLayout>
      </StoreSync>
    </PageChangeDetector>
  );
};

// 일반 사용자 레이아웃 래퍼
const UserLayoutWrapper = ({ children }) => {
  const { currentUser, userRole, selectedStore, logout } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // axios 유틸에 네비게이션 콜백 설정
    setAxiosNavigationCallback(navigate);
    setDynamicAxiosNavigationCallback(navigate);
  }, [navigate]);
  
  return (
    <PageChangeDetector>
      <StoreSync>
        <Layout
          currentUser={currentUser}
          userRole={userRole}
          selectedStore={selectedStore}
          onLogout={logout}
        >
          {children}
        </Layout>
      </StoreSync>
    </PageChangeDetector>
  );
};

// 루트 경로 리다이렉션 컴포넌트
const RootRedirect = () => {
  const { isLoggedIn, userRole, isAuthLoading } = useAuth();
  const useOrganizationStore = (() => {
    try {
      return require('@/store/organizationStore').default;
    } catch {
      return null;
    }
  })();
  
  // 인증 로딩 중이면 로딩 스피너 표시
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  // 선택된 사업장이 있으면 해당 사업장으로, 없으면 기본 페이지로 리다이렉트
  const { selectedOrganization } = useOrganizationStore ? useOrganizationStore.getState() : { selectedOrganization: null };
  
  if (selectedOrganization) {
    // 사업장이 선택되어 있으면 해당 사업장 모니터링 페이지로 이동
    console.log('기본 사업장이 설정되어 있음, 자동 이동:', selectedOrganization);
    return <Navigate to={`/admin/stores/${selectedOrganization.id}/monitoring`} replace />;
  }
  
  // 기본 사업장 자동 접근 모드: 사업장 정보가 없으면 로그인으로 리다이렉트
  console.log('기본 사업장 정보 없음 - 로그인으로 리다이렉트하여 사업장 설정');
  return <Navigate to="/login" replace />;
};

// 로그인 페이지 래퍼
const LoginWrapper = () => {
  const { login, isLoggedIn, userRole, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // axios 유틸에 네비게이션 콜백 설정
    setAxiosNavigationCallback(navigate);
    setDynamicAxiosNavigationCallback(navigate);
  }, [navigate]);

  // 현재 로그인 페이지에 있고 이미 로그인된 상태라면 리다이렉트
  if (isLoggedIn) {
    const from = location.state?.from;
    console.log("Already logged in, redirecting from login page. From:", from);
    
    // 선택된 사업장이 있으면 해당 사업장으로 이동
    const { selectedOrganization, setSelectedOrganization } = useOrganizationStore ? useOrganizationStore.getState() : { selectedOrganization: null, setSelectedOrganization: null };
    
    if (selectedOrganization) {
      console.log('이미 로그인되어 있고 기본 사업장이 설정됨, 자동 이동:', selectedOrganization);
      return <Navigate to={`/admin/stores/${selectedOrganization.id}/monitoring`} replace />;
    }
    
    // 기본 사업장 정보가 없으면 다시 가져오기 시도
    if (!isLoading && setSelectedOrganization && token) {
      setIsLoading(true);
      
      const fetchDefaultOrganization = async () => {
        try {
          const { getDefaultOrgId } = (() => {
            try {
              return require('@/lib/config');
            } catch {
              return { getDefaultOrgId: () => '7ebd6c75-6917-4f7e-9087-71ddede2a13c' };
            }
          })();
          
          const { getOrganization } = await import("@/api/organization");
          const { setAxiosToken } = await import("@/api/axios_util");
          setAxiosToken(token);
          
          const defaultOrgId = getDefaultOrgId();
          console.log('기본 사업장 정보 다시 가져오기 시도:', defaultOrgId);
          
          const store = await getOrganization(defaultOrgId);
          console.log('기본 사업장 정보 로드 성공:', store);
          
          setSelectedOrganization(store);
          setIsLoading(false);
        } catch (err) {
          console.error('기본 사업장 정보 로드 실패:', err);
          setIsLoading(false);
        }
      };
      
      fetchDefaultOrganization();
    }
    
    // 로딩 중이면 로딩 스피너 표시
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }
    
    // 기본 사업장 자동 접근 모드: 사업장 정보가 없으면 로그인 재시도
    console.log('로그인되어 있지만 기본 사업장 정보 없음 - 로그인 재시도');
    return <Navigate to="/login" replace />;
  }

  return <LoginPage onLogin={login} />;
};

// 권한 없음 페이지
const UnauthorizedPage = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">403</h1>
      <p className="text-xl mb-6">접근 권한이 없습니다</p>
      <Link to="/login" className="text-blue-500 hover:underline">로그인 페이지로 이동</Link>
    </div>
  </div>
);

// 404 페이지
const NotFoundPage = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-6">페이지를 찾을 수 없습니다</p>
      <Link to="/" className="text-blue-500 hover:underline">홈으로 돌아가기</Link>
    </div>
  </div>
);

// 라우터 설정
const router = createBrowserRouter([
  // 공개 라우트
  {
    path: '/login',
    element: <LoginWrapper />
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />
  },

  // 관리자 전용 라우트
  {
    path: '/home',
    element: (
      <AdminRoute>
        <AdminLayoutWrapper>
          <AdminDashboardPage />
        </AdminLayoutWrapper>
      </AdminRoute>
    )
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayoutWrapper>
          <AdminDashboardPage />
        </AdminLayoutWrapper>
      </AdminRoute>
    )
  },
  {
    path: '/admin/users',
    element: (
      <UserManagementRoute>
        <UserManagementLayoutWrapper>
          <UserManagementPage />
        </UserManagementLayoutWrapper>
      </UserManagementRoute>
    )
  },
  {
    path: '/admin/stores',
    element: (
      <AdminRoute>
        <UserManagementLayoutWrapper>
          <StoresListPage />
        </UserManagementLayoutWrapper>
      </AdminRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/monitoring',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <MonitoringPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/settings',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <SettingsPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/peak-demand',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <PeakDemandPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/usage-report',
    loader: ({ params }) => {
      return { storeId: params.storeId };
    },
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <UsageReportPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/user-management',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <UserManagementPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/events',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <EventLogPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/alarms',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <AlarmPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/schedule',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <SchedulePage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/stores/:storeId/devices',
    element: (
      <ProtectedRoute>
        <UserManagementLayoutWrapper>
          <DevicesPage />
        </UserManagementLayoutWrapper>
      </ProtectedRoute>
    )
  },
  {
    path: '/admin/iemu',
    element: (
      <AdminRoute>
        <AdminLayoutWrapper>
          <IemuManagementPage />
        </AdminLayoutWrapper>
      </AdminRoute>
    )
  },
  {
    path: '/admin/events',
    element: (
      <AdminRoute>
        <AdminLayoutWrapper>
          <EventLogPage />
        </AdminLayoutWrapper>
      </AdminRoute>
    )
  },
  {
    path: '/admin/notifications',
    element: (
      <AdminRoute>
        <AdminLayoutWrapper>
          <NotificationPage />
        </AdminLayoutWrapper>
      </AdminRoute>
    )
  },
  {
    path: '/admin/profile',
    element: (
      <AllUserRoute>
        <ProfileLayoutWrapper>
          <ProfilePage />
        </ProfileLayoutWrapper>
      </AllUserRoute>
    )
  },

  // 일반 사용자 전용 라우트
  {
    path: '/profile',
    element: (
      <AllUserRoute>
        <ProfileLayoutWrapper>
          <ProfilePage />
        </ProfileLayoutWrapper>
      </AllUserRoute>
    )
  },
  {
    path: '/monitoring',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <MonitoringPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/usage-report',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <UsageReportPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/settings',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <SettingsPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/devices',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <DevicesPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/schedule',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <SchedulePage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/peak-demand',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <PeakDemandPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/events',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <EventLogPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/alarms',
    element: (
      <UserRoute>
        <UserLayoutWrapper>
          <AlarmPage />
        </UserLayoutWrapper>
      </UserRoute>
    )
  },
  {
    path: '/user-management',
    element: (
      <OwnerRoute>
        <UserLayoutWrapper>
          <UserManagementPage />
        </UserLayoutWrapper>
      </OwnerRoute>
    )
  },

  // 루트 경로 리다이렉션
  {
    path: '/',
    element: <RootRedirect />
  },

  // 404 페이지
  {
    path: '*',
    element: <NotFoundPage />
  }
]);

export default router;