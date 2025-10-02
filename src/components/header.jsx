import { useState, useRef, useEffect } from "react"
import { Menu, User, ArrowLeft, ChevronDown, Settings, LogOut, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/components/theme-provider"
import { getRoleName2 } from "@/utils/userRole"

export default function Header({
  activeMenu,
  sidebarOpen,
  setSidebarOpen,
  currentUser,
  onLogout,
  selectedStore,
  onBackToStores,
  userRole,
  isAdminView = false,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
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
    setIsDropdownOpen(false)
    navigate("/profile")
  }

  const handleLogoutClick = () => {
    setIsDropdownOpen(false)
    onLogout()
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "정상":
        return "bg-green-100 text-green-800 border-green-200"
      case "주의":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "오류":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <header className="bg-white dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700/50 px-6 py-4 h-16 sm:h-20 flex items-center fixed sm:sticky top-0 z-50 flex-shrink-0 w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              {/*<Button variant="ghost" size="icon" className="lg:hidden hover:bg-gray-100 w-10 h-10 flex-shrink-0">*/}
                <Menu className="h-5 w-5 lg:hidden" />
              {/*</Button>*/}
            </SheetTrigger>
          </Sheet>

          {/* Back Button for Admin */}
          {userRole === "admin" && onBackToStores && selectedStore && !isAdminView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToStores}
              className="flex items-center gap-2 flex-shrink-0 bg-transparent dark:bg-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              상점 목록
            </Button>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                {selectedStore ? `${selectedStore.name} - ${activeMenu}` : activeMenu}
              </h2>
              {/*selectedStore && (
                <Badge className={`${getStatusColor(selectedStore.status)} px-2 py-1 text-xs flex-shrink-0`}>
                  {selectedStore.status}
                </Badge>
              )*/}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate">
              {/*{selectedStore ? selectedStore.address : "실시간 전력 모니터링 및 관리"}*/}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Dark Mode Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hover:bg-gray-100 dark:hover:bg-slate-800/60 w-10 h-10"
          >
            {theme === 'dark' ? (
              <Sun className="!h-5 !w-5" />
            ) : (
              <Moon className="!h-5 !w-5" />
            )}
          </Button>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2"></div>

          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-800/60 px-2 sm:px-3 h-10"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {currentUser || "unknown"}
                </div>
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
                  <User className="h-4 w-4" />
                  내 정보
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
