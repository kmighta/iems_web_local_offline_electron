import { useState, useRef, useEffect } from "react"
import { Menu, User, Settings, LogOut, Bell, ChevronDown, BarChart3, Building, Users, Cpu, Shield, Megaphone, MessageSquare, House, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/router/router"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/components/theme-provider"
import { getRoleName2 } from "@/utils/userRole"

const getMenuDescription = (menuName) => {
  const descriptions = {
    홈: "시스템 전체 현황을 한눈에 확인하세요",
    사업장관리: "전체 사업장의 전력 사용 현황을 확인하고 관리하세요",
    회원관리: "시스템 사용자를 관리하고 권한을 설정하세요",
    "iEMU 관리": "iEMU 장치의 상태를 모니터링하고 관리하세요",
    "내 정보": "개인 정보 및 계정 설정을 관리하세요",
  }
  return descriptions[menuName] || "관리자 전용 시스템 관리"
}

const getMenuIcon = (menuName) => {
  const icons = {
    홈: House,
    사업장관리: Building,
    회원관리: Users,
    알림관리: Bell,
    공지사항: Megaphone,
    "1:1 문의": MessageSquare,
    "iEMU 관리": Cpu,
    "내 정보": User,
  }
  return icons[menuName] || Shield
}

export default function AdminHeader({ activeMenu, currentUser, onLogout, setSidebarOpen, sidebarOpen }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { userRole } = useAuth()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleProfileClick = () => {
    //setActiveMenu("내 정보")
    navigate("/admin/profile")
    setIsDropdownOpen(false)
  }

  const handleLogoutClick = () => {
    setIsDropdownOpen(false)
    onLogout()
  }

  const IconComponent = getMenuIcon(activeMenu)
  return (
    <header className="bg-white dark:bg-slate-900/95 border-b border-gray-200 dark:border-slate-700/50 px-4 sm:px-6 p-4 h-16 sm:h-20 flex items-center justify-between shadow-sm fixed sm:sticky w-full z-50">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile Menu Button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              {/*<Button variant="ghost" size="icon" className="lg:hidden hover:bg-gray-100 w-10 h-10 flex-shrink-0">*/}
                <Menu className="h-5 w-5 lg:hidden" />
              {/*</Button>*/}
            </SheetTrigger>
          </Sheet>

          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <IconComponent className="h-6 w-6 text-blue-600 dark:text-green-600 flex-shrink-0" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{activeMenu}</h2>
              </div>
              {/*<p className="text-sm text-gray-500 truncate">{getMenuDescription(activeMenu)}</p>*/}
            </div>
          </div>
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hover:bg-gray-100 dark:hover:bg-slate-800/60 w-10 h-10"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/*<div className="w-px h-6 bg-gray-300 mx-2"></div>*/}

          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800/60 px-3 h-10"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{currentUser || "unknown"}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{getRoleName2(userRole)}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800/90 rounded-md shadow-lg border border-gray-200 dark:border-slate-600/50 py-1 z-50">
                <button
                  onClick={handleProfileClick}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60"
                >
                  <User className="h-4 w-4" />내 정보
                </button>
                <hr className="my-1 border-gray-100 dark:border-slate-600/50" />
                <button
                  onClick={handleLogoutClick}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700/60"
                >
                  <LogOut className="h-4 w-4" />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
