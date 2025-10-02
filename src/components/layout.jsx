import { useState } from "react"
import { useLocation } from "react-router-dom"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import Sidebar from "./sidebar"
import Header from "./header"
import Footer from "./footer"
import ScrollToTop from "./scroll-to-top"

export default function Layout({ currentUser, onLogout, selectedStore, onBackToStores, userRole, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  

  const getActiveMenu = () => {
    const path = location.pathname
    if (path === "/dashboard" || path === "/monitoring") return "모니터링"
    if (path === "/settings") return "환경설정"
    if (path === "/peak-demand") return "최대수요현황"
    if (path === "/usage-report") return "사용량보고서"
    if (path === "/events") return "이벤트"
    if (path === "/schedule") return "시간/휴일설정"
    if (path === "/devices") return "연동장치"
    return "모니터링"
  }

  const activeMenu = getActiveMenu()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-900 dark:to-slate-800/50">
      <ScrollToTop />
      
      {/* Desktop Sidebar - 고정 */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-70 z-40 shadow-sm dark:shadow-slate-800/50">
        <Sidebar setSidebarOpen={setSidebarOpen} userRole={userRole} />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 dark:bg-slate-900/95 dark:border-slate-700/50">
          <Sidebar setSidebarOpen={setSidebarOpen} userRole={userRole} />
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
          onBackToStores={onBackToStores}
          userRole={userRole}
        />
        <main className={`flex-1 pt-0`}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}
