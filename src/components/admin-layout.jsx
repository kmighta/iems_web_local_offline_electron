import { useState, useEffect } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import AdminSidebar from "./admin-sidebar"
import AdminHeader from "./admin-header"
import Sidebar from "./sidebar"
import Header from "./header"
import Footer from "./footer"
import ScrollToTop from "./scroll-to-top"
import useOrganizationStore from "@/store/organizationStore"
import { useWebSocket } from "../hooks/useWebSocket"

export default function AdminLayout({ currentUser, userRole, onLogout, onStoreSelect, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState(null)
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { storeId } = useParams()
  
  
  // Organization store에서 selectedOrganization 설정
  const { setSelectedOrganization } = useOrganizationStore()

  // 웹소켓 연결 (사업장 관련 페이지에서만)
  useWebSocket()

  // 사업장 모니터링 페이지인지 확인
  const isStoreMonitoring = location.pathname.includes('/admin/stores/') && location.pathname.includes('/monitoring')

  // 사업장 관련 페이지인지 확인 (모든 사업장 기능 포함)
  const isStorePage = location.pathname.includes('/admin/stores/') && storeId

  // storeId로부터 사업장 정보 가져오기
  useEffect(() => {
    const fetchStoreInfo = async () => {
      if (storeId && isStorePage) {
        setLoading(true)
        try {
          const { getOrganization } = await import("@/api/organization")
          const storeData = await getOrganization(storeId)
          setSelectedStore(storeData)
          // Organization store에도 설정 (웹소켓 연결을 위해)
          setSelectedOrganization(storeData)
        } catch (error) {
          console.error("사업장 정보를 가져오는데 실패했습니다:", error)
          // 에러 시 기본 정보로 설정
          const defaultStoreData = {
            id: storeId,
            name: "사업장",
            status: "정상",
            address: "사업장 주소"
          }
          setSelectedStore(defaultStoreData)
          setSelectedOrganization(defaultStoreData)
        } finally {
          setLoading(false)
        }
      } else if (location.state?.store) {
        // location state에 사업장 정보가 있으면 사용
        setSelectedStore(location.state.store)
        setSelectedOrganization(location.state.store)
      } else {
        setSelectedStore(null)
        setSelectedOrganization(null)
      }
    }

    fetchStoreInfo()
  }, [storeId, isStorePage, location.state?.store])

  const getActiveMenu = () => {
    const path = location.pathname
    if (path === "/admin" || path === "/admin/dashboard") return "홈"
    if (path === "/admin/stores") return "사업장관리"
    if (path === "/admin/users") return "회원관리"
    if (path === "/admin/notifications") return "알림관리"
    if (path === "/admin/notices") return "공지사항"
    if (path === "/admin/inquiries") return "1:1 문의"
    if (path === "/admin/iemu") return "iEMU 관리"
    
    // 사업장 관련 경로들
    if (path.includes('/admin/stores/')) {
      if (path.includes('/monitoring')) return "모니터링"
      if (path.includes('/settings')) return "환경설정"
      if (path.includes('/peak-demand')) return "최대수요현황"
      if (path.includes('/usage-report')) return "사용량보고서"
      if (path.includes('/events')) return "이벤트"
      if (path.includes('/schedule')) return "시간/휴일설정"
      if (path.includes('/devices')) return "연동장치"
      if (path.includes('/notices')) return "공지사항"
      if (path.includes('/inquiries')) return "1:1 문의"
    }
    
    return "홈"
  }

  const activeMenu = getActiveMenu()

  // 사업장 목록으로 돌아가기
  const handleBackToStores = () => {
    navigate('/admin/stores')
  }

  if (isStorePage) {
    // 로딩 중일 때 표시
    if (loading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-900 dark:to-slate-800/50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-300">사업장 정보를 불러오는 중...</p>
          </div>
        </div>
      )
    }

    // 사업장 관련 페이지일 때는 일반 사용자용 레이아웃 사용
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-900 dark:to-slate-800/50">
        <ScrollToTop />
        
        {/* Desktop Sidebar - 일반 사용자용 고정 */}
        <div className="hidden lg:block fixed left-0 top-0 h-full w-70 z-40 shadow-sm dark:shadow-slate-800/50">
          <Sidebar setSidebarOpen={setSidebarOpen} isAdminView={true} storeId={storeId} onBackToStores={handleBackToStores} userRole={userRole} />
        </div>

        {/* Mobile Sidebar - 일반 사용자용 */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 dark:bg-slate-900/95 dark:border-slate-700/50">
            <Sidebar setSidebarOpen={setSidebarOpen} isAdminView={true} storeId={storeId} onBackToStores={handleBackToStores} userRole={userRole} />
          </SheetContent>
        </Sheet>

        {/* Main Content - 사이드바 너비만큼 마진 */}
        <div className="lg:ml-70 flex flex-col min-h-screen">
          <Header
            activeMenu={activeMenu}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            currentUser={currentUser}
            onLogout={onLogout}
            selectedStore={selectedStore}
            onBackToStores={handleBackToStores}
            userRole={userRole}
            isAdminView={true}
          />
          <main className={`flex-1 pt-0`}>
            {children}
          </main>
          <Footer />
        </div>
      </div>
    )
  }

  // 일반 관리자 페이지일 때는 기존 레이아웃 사용
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900/95">
      <ScrollToTop />
      
      {/* Desktop Sidebar - 관리자용 고정 */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-70 z-40 shadow-sm dark:shadow-slate-800/50">
        <AdminSidebar setSidebarOpen={setSidebarOpen} userRole={userRole} />
      </div>

      {/* Mobile Sidebar - 관리자용 */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 dark:bg-slate-900/95 dark:border-slate-700/50">
          <AdminSidebar setSidebarOpen={setSidebarOpen} userRole={userRole} />
        </SheetContent>
      </Sheet>

      {/* Main panel - 사이드바 너비만큼 마진 */}
      <div className="lg:ml-70 flex flex-col min-h-screen">
        <AdminHeader
          activeMenu={activeMenu}
          currentUser={currentUser}
          onLogout={onLogout}
          setSidebarOpen={setSidebarOpen}
          sidebarOpen={sidebarOpen}
        />
        <main className="flex-1 pt-0">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}
