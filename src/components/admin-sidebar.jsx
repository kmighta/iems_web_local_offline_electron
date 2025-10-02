import { useNavigate, useLocation } from "react-router-dom"
import { adminMenuItems } from "../data/admin-menu-items"
import useOrganizationStore from "@/store/organizationStore"
import { useCallback } from "react"
import { useTheme } from "./theme-provider"

export default function AdminSidebar({ setSidebarOpen, className = "", userRole }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearSelectedOrganization } = useOrganizationStore()
  const { theme } = useTheme()

  const getActiveMenu = () => {
    const path = location.pathname
    if (path === "/home" || path === "/admin" || path === "/admin/dashboard") return "홈"
    if (path === "/admin/stores") return "사업장관리"
    if (path === "/admin/users") return "회원관리"
    if (path === "/admin/notifications") return "알림관리"
    if (path === "/admin/iemu") return "iEMU 관리"
    return "홈"
  }

  const activeMenu = getActiveMenu()

  // 권한별 메뉴 필터링
  const handleLogoClick = useCallback(() => {
    clearSelectedOrganization() // 로고 클릭 시에도 초기화
    navigate("/home");
    setSidebarOpen && setSidebarOpen(false)
  }, [clearSelectedOrganization, navigate, setSidebarOpen]);

  const handleMenuClick = useCallback((item) => {
    // 이미 같은 메뉴인 경우 리턴
    if (activeMenu === item.name) {
      setSidebarOpen && setSidebarOpen(false);
      return;
    }

    // 사업장 관리가 아닌 다른 메뉴로 이동 시 선택된 사업장 초기화
    if (item.name !== "사업장관리") {
      clearSelectedOrganization()
    }
    
    navigate(item.href);
    setSidebarOpen && setSidebarOpen(false)
  }, [activeMenu, clearSelectedOrganization, navigate, setSidebarOpen]);

  // 권한별 메뉴 필터링 - 모든 관리자 메뉴 비활성화
  const filteredMenuItems = (() => {
    // 모든 관리자 메뉴 비활성화 (기본 사업장 자동 접근 모드)
    console.log('관리자 메뉴 전체 비활성화 - 기본 사업장 자동 접근 모드');
    return [];
  })();

  return (
    <div className={`flex flex-col h-full z-80 bg-white dark:bg-slate-900/95 border-r border-gray-200 dark:border-slate-700/50 ${className}`}>
      {/* Logo/Header - 고정 높이 */}
      <button
        onClick={handleLogoClick}
        className="flex items-center justify-center p-6 h-20 border-b border-gray-100 dark:border-slate-700/50 flex-shrink-0 hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors w-full shadow-sm cursor-pointer"
      >
        <img
          src={theme === 'dark' ? "/iems_logo_w.png" : "/iEMS_logo.png"}
          alt="iEMS Logo"
          className="h-8 object-contain"
        />
      </button>

      {/* Admin Badge */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-700/50 flex-shrink-0">
        <div className="bg-blue-50 dark:bg-slate-700/60 border border-blue-200 dark:border-slate-700 rounded-xl p-3 text-center">
          <div className="text-sm font-semibold text-blue-800 dark:text-white">
            {userRole === "han" ? "한전 관리자" : 
             userRole === "admin_owner" ? "중간관리자" :
             userRole === "admin_engineer" ? "설정관리자" :
             userRole === "admin_user" ? "모니터링 관리자" :
             userRole === "owner" ? "사업장관리자" :
             "관리자 모드"}
          </div>
          {/* <div className="text-xs text-blue-600">
            {userRole === "han" ? "Store Manager" : "Administrator"}
          </div> */}
        </div>
      </div>

      {/* Navigation Menu - 플렉스 확장 */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeMenu === item.name
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleMenuClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 h-12 rounded-xl text-left transition-all duration-200 group cursor-pointer ${
                    isActive
                      ? "bg-blue-50 dark:bg-slate-700/60 text-blue-700 dark:text-white shadow-sm border border-blue-100 dark:border-slate-700"
                      : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0 ${
                      isActive ? "bg-blue-100 dark:bg-green-800/30 text-blue-600 dark:text-green-400" : "bg-gray-100 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 group-hover:bg-gray-200 dark:group-hover:bg-slate-700/60"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm truncate">{item.name}</span>
                </button>
              </li>
            )
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
              <p className="text-xs text-green-600 truncate">모든 서비스 운영 중</p>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  )
}
