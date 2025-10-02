import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertCircle,
  Search,
  X,
  Download,
  CheckCircle,
  AlertTriangle,
  Settings,
  Info,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// 간단한 페이지네이션 컴포넌트
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pages = []
    const pagesPerGroup = 5
    const currentGroup = Math.floor((currentPage - 1) / pagesPerGroup)
    const startPage = currentGroup * pagesPerGroup + 1
    const endPage = Math.min(startPage + pagesPerGroup - 1, totalPages)
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  return (
      <div className="flex items-center justify-center px-6 py-3 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-transparent dark:text-white"
          >
            {'<'}
          </Button>
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page) => (
                <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className={page === currentPage ? "bg-blue-600 hover:bg-blue-700" : "bg-transparent dark:text-white"}
                >
                  {page}
                </Button>
            ))}
          </div>
          <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-transparent dark:text-white"
          >
            {'>'}
          </Button>
        </div>
      </div>
  )
}

// 더미 이벤트 데이터
const generateEventData = () => {
  const eventTypes = [
    { type: "장치연결", category: "기타", level: "info", icon: Wifi },
    { type: "장치 연결 성공", category: "기타", level: "success", icon: CheckCircle },
    { type: "장치 연결 끊기", category: "경고", level: "warning", icon: WifiOff },
    { type: "장치 연결 끊기 성공", category: "기타", level: "info", icon: CheckCircle },
    { type: "통신 오류", category: "경고", level: "error", icon: AlertTriangle },
    { type: "전력 임계값 초과", category: "경고", level: "warning", icon: AlertTriangle },
    { type: "시스템 재시작", category: "설정", level: "info", icon: Settings },
    { type: "설정 변경", category: "설정", level: "info", icon: Settings },
    { type: "펌웨어 업데이트", category: "설정", level: "success", icon: Settings },
    { type: "데이터 백업 완료", category: "기타", level: "success", icon: CheckCircle },
    { type: "센서 오류", category: "경고", level: "error", icon: AlertTriangle },
    { type: "정전 감지", category: "경고", level: "error", icon: AlertTriangle },
    { type: "정전 복구", category: "기타", level: "success", icon: CheckCircle },
    { type: "사용자 로그인", category: "기타", level: "info", icon: Info },
    { type: "사용자 로그아웃", category: "기타", level: "info", icon: Info },
    { type: "목표전력 변경", category: "설정", level: "info", icon: Settings },
    { type: "차단그룹 활성화", category: "설정", level: "info", icon: Settings },
    { type: "차단그룹 비활성화", category: "설정", level: "info", icon: Settings },
  ]

  const devices = ["iEMU-001", "iEMU-002", "iEMU-003", "ACP-001", "DMS-001", "KHAM-001"]
  const users = ["admin", "user1", "user2", "system"]

  const events = []
  const now = new Date()

  for (let i = 0; i < 150; i++) {
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const device = devices[Math.floor(Math.random() * devices.length)]
    const user = users[Math.floor(Math.random() * users.length)]
    const timestamp = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 지난 7일간

    let description = ""
    switch (eventType.type) {
      case "장치연결":
        description = `${device} 장치 연결을 시도합니다.`
        break
      case "장치 연결 성공":
        description = `${device} 장치가 성공적으로 연결되었습니다.`
        break
      case "장치 연결 끊기":
        description = `${device} 장치 연결이 끊어졌습니다.`
        break
      case "장치 연결 끊기 성공":
        description = `${device} 장치 연결 해제가 완료되었습니다.`
        break
      case "통신 오류":
        description = `${device} 장치와의 통신에 오류가 발생했습니다.`
        break
      case "전력 임계값 초과":
        description = `현재 전력 사용량이 설정된 임계값을 초과했습니다. (${Math.floor(Math.random() * 100 + 300)}kW)`
        break
      case "시스템 재시작":
        description = `시스템이 재시작되었습니다. (사용자: ${user})`
        break
      case "설정 변경":
        description = `시스템 설정이 변경되었습니다. (사용자: ${user})`
        break
      case "펌웨어 업데이트":
        description = `${device} 펌웨어가 v2.1.${Math.floor(Math.random() * 5)}로 업데이트되었습니다.`
        break
      case "데이터 백업 완료":
        description = `일일 데이터 백업이 완료되었습니다.`
        break
      case "센서 오류":
        description = `${device} 센서에서 오류가 감지되었습니다.`
        break
      case "정전 감지":
        description = `정전이 감지되었습니다. 비상 전원으로 전환합니다.`
        break
      case "정전 복구":
        description = `정전이 복구되었습니다. 정상 전원으로 복귀합니다.`
        break
      case "사용자 로그인":
        description = `사용자 ${user}가 시스템에 로그인했습니다.`
        break
      case "사용자 로그아웃":
        description = `사용자 ${user}가 시스템에서 로그아웃했습니다.`
        break
      case "목표전력 변경":
        description = `목표전력이 ${Math.floor(Math.random() * 100 + 250)}kW로 변경되었습니다. (사용자: ${user})`
        break
      case "차단그룹 활성화":
        description = `차단그룹 G-${String(Math.floor(Math.random() * 16) + 1).padStart(2, "0")}이 활성화되었습니다.`
        break
      case "차단그룹 비활성화":
        description = `차단그룹 G-${String(Math.floor(Math.random() * 16) + 1).padStart(2, "0")}이 비활성화되었습니다.`
        break
      default:
        description = `${eventType.type} 이벤트가 발생했습니다.`
    }

    events.push({
      id: `event-${String(i + 1).padStart(3, "0")}`,
      timestamp: timestamp.toISOString(),
      type: eventType.type,
      category: eventType.category,
      level: eventType.level,
      icon: eventType.icon,
      description,
      device,
      user: eventType.type.includes("사용자") || eventType.type.includes("설정") ? user : null,
      resolved: eventType.level === "error" ? Math.random() > 0.3 : true,
    })
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export default function EventLogPage() {
  const [activeTab, setActiveTab] = useState("전체")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [dateFilter, setDateFilter] = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const itemsPerPage = 15

  const allEvents = generateEventData()

  const tabs = [
    { name: "전체", count: allEvents.length },
    { name: "경고", count: allEvents.filter((event) => event.category === "경고").length },
    { name: "설정", count: allEvents.filter((event) => event.category === "설정").length },
    { name: "기타", count: allEvents.filter((event) => event.category === "기타").length },
  ]

  const filteredEvents = allEvents.filter((event) => {
    const matchesTab = activeTab === "전체" || event.category === activeTab
    const matchesSearch =
      event.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.device.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = levelFilter === "all" || event.level === levelFilter

    let matchesDate = true
    if (dateFilter !== "all") {
      const eventDate = new Date(event.timestamp)
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))

      switch (dateFilter) {
        case "today":
          matchesDate = diffDays === 0
          break
        case "week":
          matchesDate = diffDays <= 7
          break
        case "month":
          matchesDate = diffDays <= 30
          break
      }
    }

    return matchesTab && matchesSearch && matchesLevel && matchesDate
  })

  const totalItems = filteredEvents.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentEvents = filteredEvents.slice(startIndex, endIndex)

  const getLevelConfig = (level) => {
    switch (level) {
      case "success":
        return {
          badge: "bg-green-100 text-green-700",
          dot: "bg-green-500",
        }
      case "warning":
        return {
          badge: "bg-yellow-100 text-yellow-700",
          dot: "bg-yellow-500",
        }
      case "error":
        return {
          badge: "bg-red-100 text-red-700",
          dot: "bg-red-500",
        }
      case "info":
      default:
        return {
          badge: "bg-blue-100 text-blue-700",
          dot: "bg-blue-500",
        }
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "방금 전"
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleExport = () => {
    console.log("이벤트 로그 내보내기")
  }

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">이벤트 로그</h1>
          <p className="text-gray-600 dark:text-slate-300">시스템 및 장치 연결 이벤트를 확인하고 관리하세요</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8 overflow-auto">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => {
                setActiveTab(tab.name)
                setCurrentPage(1)
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.name
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white hover:border-gray-300 dark:hover:border-slate-600"
              }`}
            >
              {tab.name}
              <span
                className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.name ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="이벤트 타입, 설명, 장치명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-10 border-gray-300 dark:border-slate-700 focus:border-gray-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-slate-500 bg-white dark:bg-slate-900"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기간</SelectItem>
              <SelectItem value="today">오늘</SelectItem>
              <SelectItem value="week">최근 7일</SelectItem>
              <SelectItem value="month">최근 30일</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-32 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 레벨</SelectItem>
              <SelectItem value="error">오류</SelectItem>
              <SelectItem value="warning">경고</SelectItem>
              <SelectItem value="success">성공</SelectItem>
              <SelectItem value="info">정보</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 bg-transparent dark:text-white">
            <Download className="h-4 w-4" />
            <p className="hidden sm:block">내보내기</p>
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {(searchTerm || dateFilter !== "all" || levelFilter !== "all") && (
        <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-300">
            필터 적용 결과: <span className="font-medium">{filteredEvents.length}개 이벤트</span>
            {filteredEvents.length > itemsPerPage && (
              <span className="ml-2 text-orange-600 dark:text-orange-400">
                (페이지 {currentPage}/{totalPages})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Events Table */}
      <Card className="border border-gray-200 dark:border-slate-700">
        <CardContent className="p-0">
          {currentEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">이벤트가 없습니다</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">현재 조건에 맞는 이벤트를 찾을 수 없습니다.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setDateFilter("all")
                  setLevelFilter("all")
                }}
                className="dark:text-white"
              >
                필터 초기화
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-slate-700">
                    <TableHead className="font-medium text-gray-700 dark:text-slate-300 w-16">상태</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-slate-300">시간</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-slate-300">이벤트 타입</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-slate-300">설명</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-slate-300">장치</TableHead>
                    <TableHead className="font-medium text-gray-700 dark:text-slate-300">사용자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentEvents.map((event) => {
                    const levelConfig = getLevelConfig(event.level)
                    const EventIcon = event.icon

                    return (
                      <TableRow key={event.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <div className={`w-3 h-3 ${levelConfig.dot} rounded-full`}></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                            <div className="text-sm">
                              <div className="font-medium text-gray-900 dark:text-white">{formatTimestamp(event.timestamp)}</div>
                              <div className="text-gray-500 dark:text-slate-400">
                                {new Date(event.timestamp).toLocaleTimeString("ko-KR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${levelConfig.badge} rounded-lg flex items-center justify-center`}>
                              <EventIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{event.type}</div>
                              <Badge className={`${levelConfig.badge} text-xs px-2 py-1 mt-1`}>{event.category}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900 dark:text-white max-w-md">{event.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-mono text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded">
                            {event.device}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.user ? (
                            <div className="text-sm text-gray-900 dark:text-white">{event.user}</div>
                          ) : (
                            <div className="text-sm text-gray-500 dark:text-slate-400">-</div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
