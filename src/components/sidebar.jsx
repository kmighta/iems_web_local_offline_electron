import { useNavigate, useLocation } from "react-router-dom";
import { menuItems } from "../data/menu-items";
import useOrganizationStore from "@/store/organizationStore";
import { useCallback } from "react";
import { useTheme } from "./theme-provider";

export default function Sidebar({
  setSidebarOpen,
  className = "",
  isAdminView = false,
  storeId = null,
  onBackToStores,
  userRole,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearSelectedOrganization } = useOrganizationStore();
  const { theme } = useTheme();

  // 사업장 페이지인지 확인 (admin 제외한 권한도 사업장 페이지에서는 관리자 뷰 사용)
  const isStorePage = location.pathname.includes('/admin/stores/') && storeId;
  isAdminView = userRole === "admin" || userRole === "han" || 
                userRole === "admin_owner" || userRole === "admin_engineer" || userRole === "admin_user" ||
                isStorePage;

  console.log("Sidebar props:", {
    setSidebarOpen,
    className,
    isAdminView,
    storeId,
    onBackToStores,
    userRole,
  });

  // localStorage에서 실제 role 값 확인
  const storedAuth = localStorage.getItem('auth');
  let storedRole = null;
  if (storedAuth) {
    try {
      const authData = JSON.parse(storedAuth);
      storedRole = authData.role;
    } catch (e) {
      console.error('localStorage auth parsing error:', e);
    }
  }

  // organizationStore에서 사용자 정보 가져오기
  const { userId, organizationId } = useOrganizationStore();

  console.log("Sidebar filtering debug:", {
    userRole,
    isStorePage,
    isAdminView,
    currentPath: location.pathname,
    storeId
  });

  const getActiveMenu = () => {
    const path = location.pathname;
    
    // 기본 사업장 자동 접근 모드: 홈 메뉴 제거
    
    if (isAdminView) {
      if (path.includes("/monitoring")) return "모니터링";
      if (path.includes("/settings")) return "환경설정";
      if (path.includes("/peak-demand")) return "최대수요현황";
      if (path.includes("/usage-report")) return "사용량보고서";
      if (path.includes("/events")) return "이벤트";
      if (path.includes("/alarms")) return "알림현황";
      if (path.includes("/schedule")) return "시간/휴일설정";
      if (path.includes("/devices")) return "연동장치";
      if (path.includes("/user-management")) return "회원관리";
      return "모니터링"; // 기본값을 모니터링으로 변경
    }

    if (path === "/dashboard" || path === "/monitoring") return "모니터링";
    if (path === "/settings") return "환경설정";
    if (path === "/peak-demand") return "최대수요현황";
    if (path === "/usage-report") return "사용량보고서";
    if (path === "/events") return "이벤트";
    if (path === "/alarms") return "알림현황";
    if (path === "/schedule") return "시간/휴일설정";
    if (path === "/devices") return "연동장치";
    if (path === "/admin/users") return "유저관리";
    if (path === "/user-management") return "회원관리";
    return "모니터링"; // 기본값을 모니터링으로 변경
  };

  const activeMenu = getActiveMenu();

  // 권한별 메뉴 필터링 - 기본 사업장 자동 접근 모드
  const filteredMenuItems = (() => {
    if (isStorePage) {
      // 사업장 페이지에서는 사업장 전용 메뉴만 표시 (관리자 메뉴들 제외)
      const storeOnlyMenus = [
        "모니터링", 
        "환경설정", 
        "최대수요현황", 
        "사용량보고서", 
        "알림현황",
        "시간/휴일설정", 
        "내 정보",
        "회원관리",
      ];

      // 역할에 따라 회원관리 항목 가리기 (owner, admin_owner, admin만 노출)
      const roleCanSeeMember = userRole === "owner" || userRole === "admin_owner" || userRole === "admin";

      return menuItems
        .filter((item) => storeOnlyMenus.includes(item.name))
        .filter((item) => item.name !== "회원관리" || roleCanSeeMember);
    } else {
      // 사업장 페이지가 아닌 경우 모든 메뉴 비활성화 (기본 사업장 자동 접근 모드)
      console.log('사업장 외부 페이지 - 메뉴 비활성화');
      return [];
    }
  })();

  const handleMenuClick = useCallback((item) => {
    console.log('Sidebar handleMenuClick:', { 
      itemName: item.name, 
      activeMenu, 
      isAdminView, 
      storeId,
      userRole 
    });
    
    // 이미 같은 메뉴인 경우 리턴
    if (activeMenu === item.name) {
      setSidebarOpen && setSidebarOpen(false);
      return;
    }
    
    // 관리자 모드가 아닐 때만 사업장 초기화 (조직별 설정 페이지들은 제외)
    const preserveOrgPages = ["사용량보고서", "최대수요현황", "시간/휴일설정", "환경설정", "알림현황", "내 정보"];
    const userPreserveOrgPages = ["모니터링", "사용량보고서", "최대수요현황", "시간/휴일설정", "환경설정", "알림현황", "내 정보", "회원관리"];
    if (!isAdminView && !userPreserveOrgPages.includes(item.name)) {
      console.log('일반 모드에서 사업장 초기화 실행');
      clearSelectedOrganization()
    } else if (isAdminView || preserveOrgPages.includes(item.name)) {
      console.log('사업장 정보 유지 (관리자 모드 또는 조직 특화 페이지)');
    }

    // 유저관리/회원관리는 특별 처리 (관리자급 권한 필요)
    if (item.name === "유저관리" || item.name === "회원관리") {
      if (userRole === "admin" || userRole === "owner" || userRole === "admin_owner") {
        if (item.name === "회원관리" && isAdminView && storeId) {
          navigate(`/admin/stores/${storeId}/user-management`);
        } else {
          navigate(item.href);
        }
      }
      setSidebarOpen && setSidebarOpen(false);
      return;
    }

    if (isAdminView && storeId) {
      // 관리자 모드일 때는 사업장별 관리자 경로 사용
      const menuRoutes = {
        모니터링: `/admin/stores/${storeId}/monitoring`,
        환경설정: `/admin/stores/${storeId}/settings`,
        최대수요현황: `/admin/stores/${storeId}/peak-demand`,
        사용량보고서: `/admin/stores/${storeId}/usage-report`,
        이벤트: `/admin/stores/${storeId}/events`,
        알림현황: `/admin/stores/${storeId}/alarms`,
        "시간/휴일설정": `/admin/stores/${storeId}/schedule`,
        연동장치: `/admin/stores/${storeId}/devices`,
        회원관리: `/admin/stores/${storeId}/user-management`,
      };

      const route = menuRoutes[item.name];
      if (route) {
        console.log('관리자 모드 네비게이션:', route);
        navigate(route);
      }
    } else {
      // 일반 사용자 모드
      console.log('일반 사용자 모드 네비게이션:', item.href);
      navigate(item.href);
    }
    setSidebarOpen && setSidebarOpen(false);
  }, [activeMenu, userRole, isAdminView, storeId, clearSelectedOrganization, navigate, setSidebarOpen]);

  // 기본 사업장 자동 접근 모드: handleAdminPageClick 제거됨

  return (
    <div
      className={`flex flex-col h-full z-80 bg-white dark:bg-slate-900/95 border-r border-gray-200 dark:border-slate-700/50 ${className}`}
    >
      {/* Logo/Header - 고정 높이 */}
      <div className="flex items-center justify-center p-6 h-20 border-b border-gray-200 dark:border-slate-700/50 flex-shrink-0 shadow-sm dark:shadow-slate-800/50">
        <img
          src={theme === 'dark' ? "/iems_logo_w.png" : "/iEMS_logo.png"}
          alt="iEMS Logo"
          className="h-8 object-contain"
        />
      </div>

      {/* Navigation Menu - 플렉스 확장 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {/* 기본 사업장 자동 접근 모드: 홈 메뉴 제거됨 */}

          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.name;

            return (
              <li key={item.name}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 h-12 rounded-xl text-left transition-all duration-200 group ${
                    isActive
                      ? "bg-blue-50 dark:bg-slate-700/60 text-blue-700 dark:text-white shadow-sm border  border-blue-100 dark:border-slate-700"
                      : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0 ${
                      isActive
                        ? "bg-blue-100 dark:bg-green-800/30 text-blue-600 dark:text-green-400"
                        : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm truncate">
                    {item.name === "유저관리" ? "사용자 관리" : item.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Status - 고정 높이 */}
      {/* <div className="p-4 border-t border-gray-100 h-24 flex-shrink-0">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 h-full flex items-center">
          <div className="flex items-center gap-3 w-full">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50 flex-shrink-0"></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-800 truncate">시스템 정상</p>
              <p className="text-xs text-green-600 truncate">모든 장치 연결됨</p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
