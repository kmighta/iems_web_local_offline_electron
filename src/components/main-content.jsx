import { Activity, Zap, Gauge, Wifi } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import StatusCard from "./status-card"
import MonitoringPage from "./monitoring-page"
import PeakDemandPage from "./peak-demand-page"
import UsageReportPage from "./usage-report-page"
import EventLogPage from "./event-log-page"
import DevicesPage from "./devices-page"
import SchedulePage from "./schedule-page"
import SettingsPage from "./settings-page"

export default function MainContent({ activeMenu, selectedStore, onBackToStores, userRole }) {
  // 모니터링 메뉴일 때는 전용 페이지 표시
  if (activeMenu === "모니터링") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <MonitoringPage selectedStore={selectedStore} onBack={onBackToStores} userRole={userRole} />
        </div>
      </main>
    )
  }

  // 최대수요현황 메뉴일 때는 전용 페이지 표시
  if (activeMenu === "최대수요현황") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <PeakDemandPage />
        </div>
      </main>
    )
  }

  // 사용량보고서 메뉴일 때는 전용 페이지 표시
  if (activeMenu === "사용량보고서") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <UsageReportPage />
        </div>
      </main>
    )
  }

  // 이벤트 메뉴일 때는 전용 페이지 표시
  if (activeMenu === "이벤트") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <EventLogPage />
        </div>
      </main>
    )
  }

  // 연동장치 메뉴일 때는 전용 페이지 표시
  if (activeMenu === "연동장치") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <DevicesPage />
        </div>
      </main>
    )
  }

  // 시간/휴일설정 메뉴일 때는 전용 페이지 표시
  if (activeMenu === "시간/휴일설정") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <SchedulePage />
        </div>
      </main>
    )
  }

  // 환경설정 메뉴일 때는 전용 페이지 표시 추가
  if (activeMenu === "환경설정") {
    return (
      <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
        <div className="max-w-7xl mx-auto p-6">
          <SettingsPage />
        </div>
      </main>
    )
  }

  // 기존 코드 (다른 메뉴들)
  const statusData = [
    {
      value: selectedStore?.currentPower || "24.5kW",
      label: "현재 사용량",
      icon: Zap,
      color: "blue",
      trend: "up",
      trendValue: "2.3%",
    },
    {
      value: selectedStore?.efficiency || "98.2%",
      label: "시스템 효율",
      icon: Gauge,
      color: "green",
      trend: "up",
      trendValue: "0.8%",
    },
    {
      value: selectedStore?.devices?.toString() || "12",
      label: "연결된 장치",
      icon: Wifi,
      color: "orange",
      trend: "up",
      trendValue: "1개",
    },
  ]

  const recentActivities = [
    { time: "10:30", action: "시스템 정상 점검 완료", status: "success" },
    { time: "09:15", action: "장치 #3 연결 확인", status: "info" },
    { time: "08:45", action: "일일 리포트 생성", status: "success" },
  ]

  const systemInfo = [
    { label: "운영 시간", value: "24시간 7일" },
    { label: "마지막 업데이트", value: selectedStore?.lastUpdate || "방금 전" },
    { label: "시스템 버전", value: "v2.1.0" },
  ]

  return (
    <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Status Cards - 반응형 그리드 개선 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {statusData.map((status, index) => (
              <StatusCard
                key={index}
                value={status.value}
                label={status.label}
                icon={status.icon}
                color={status.color}
                trend={status.trend}
                trendValue={status.trendValue}
              />
            ))}
          </div>

          {/* Main Dashboard Card - 반응형 개선 */}
          <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/80 dark:backdrop-blur-sm backdrop-blur-sm rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex-shrink-0">
                    <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white truncate">
                      {selectedStore ? `${selectedStore.name} ${activeMenu}` : `${activeMenu} 홈`}
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-slate-300 truncate">
                      실시간 {activeMenu.toLowerCase()} 정보 및 관리
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">실시간 업데이트</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 sm:h-96 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-slate-800 dark:to-slate-700/50 rounded-2xl border border-gray-200 dark:border-slate-600/50">
                <div className="text-center space-y-4 p-6 sm:p-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                    <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{activeMenu} 모듈</h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-slate-300">상세 기능이 구현될 예정입니다</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">실시간 데이터 시각화 및 제어 기능</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info Cards - 반응형 그리드 개선 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* 최근 활동 카드 */}
            <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/80 dark:backdrop-blur-sm backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-gray-900 dark:text-white">최근 활동</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 h-40 sm:h-48 overflow-y-auto">
                  {recentActivities.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          item.status === "success" ? "bg-green-500" : "bg-blue-500"
                        }`}
                      ></div>
                      <span className="text-xs text-gray-500 dark:text-slate-400 font-mono w-10 sm:w-12 flex-shrink-0">{item.time}</span>
                      <span className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 flex-1 truncate">{item.action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 시스템 정보 카드 */}
            <Card className="border-0 shadow-sm bg-white/70 dark:bg-slate-800/80 dark:backdrop-blur-sm backdrop-blur-sm rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-base text-gray-900 dark:text-white">시스템 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 h-40 sm:h-48 flex flex-col justify-center">
                  {systemInfo.map((info, index) => (
                    <div key={index} className="flex justify-between items-center py-2">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">{info.label}</span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{info.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
