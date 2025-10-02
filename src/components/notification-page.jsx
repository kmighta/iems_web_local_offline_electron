import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  Building,
  Search,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  ChevronDown,
  Loader2,
  ClipboardList,
  User,
  Mail,
  Monitor,
  Users
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import Pagination from "./pagination"
import { getAllOrganizationsWithNotifications, getOrganizationWithNotificationsByOrganizationId } from "@/api/notification"
import { getAllUserLoginReport, getUserLoginReport, getOrganizationLoginReport, getUserLoginBaseInfo } from "@/api/loginLog"

// 알림 타입별 아이콘과 스타일 매핑
const notificationTypeConfig = {
  1: { icon: Info, className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300", label: "설정 변경" },
  2: { icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", label: "iEMU 연결 복구" },
  3: { icon: XCircle, className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", label: "iEMU 연결 끊김" },
  4: { icon: AlertTriangle, className: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300", label: "EOI 알람 발생" },
  5: { icon: AlertTriangle, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300", label: "WP 알람 발생" },
  6: { icon: AlertTriangle, className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300", label: "1,2,3차 알람 발생" },
  7: { icon: CheckCircle, className: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300", label: "1,2,3차 알람 해제" },
  8: { icon: XCircle, className: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300", label: "연결 불가" },
  // 기본값 (혹시 다른 타입이 올 경우)
  0: { icon: Info, className: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300", label: "정보" }
}

export default function NotificationPage() {
  // 알림 관련 상태
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [viewMode, setViewMode] = useState("all")
  const [singleOrganization, setSingleOrganization] = useState(null)
  const [availableOrganizations, setAvailableOrganizations] = useState([])
  const [activeAccordion, setActiveAccordion] = useState(null);

  // 로그인 로그 관련 상태
  const [loginLogs, setLoginLogs] = useState([])
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [loginSearchTerm, setLoginSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [loginCurrentPage, setLoginCurrentPage] = useState(1)
  const [loginTotalPages, setLoginTotalPages] = useState(0)
  const [loginTotalItems, setLoginTotalItems] = useState(0)
  const [loginPageSize, setLoginPageSize] = useState(20)
  const [availableUsers, setAvailableUsers] = useState([])
  const [loginViewMode, setLoginViewMode] = useState("all") // "all", "grouped"

  // 현재 활성 탭
  const [activeTab, setActiveTab] = useState("notifications")

  const fetchAllOrganizations = useCallback(async (page = 0, size = 10) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllOrganizationsWithNotifications(page, size)
      
      if (response.resultCode === 200 && response.data) {
        setOrganizations(response.data.content || [])
        setTotalPages(response.data.totalPages || 0)
        setTotalItems(response.data.totalElements || 0)
        
        const organizations = response.data.content
          ?.filter(org => org.id && org.name)
          ?.map(org => ({ id: org.id, name: org.name })) || []
        
        // 중복 방지를 위해 기존 데이터와 비교
        setAvailableOrganizations(prev => {
          const existingIds = new Set(prev.map(org => org.id));
          const newOrganizations = organizations.filter(org => !existingIds.has(org.id));
          return newOrganizations.length > 0 ? [...prev, ...newOrganizations] : prev;
        })
      } else {
        setError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다")
      console.error("조직 목록 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOrganizationByOrganizationId = useCallback(async (organizationId, page = 0, size = 10) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getOrganizationWithNotificationsByOrganizationId(organizationId, page, size)
      
      if (response.resultCode === 200 && response.data) {
        setSingleOrganization(response.data)
        setTotalPages(response.data.totalPages || 0)
        setTotalItems(response.data.totalNotifications || 0)
      } else {
        setError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다")
      console.error("PLC Serial 기준 조직 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  // 로그인 로그 관련 함수들
  const fetchAllLoginLogs = useCallback(async (page = 0, size = 20, userId = null) => {
    try {
      setLoginLoading(true)
      setLoginError(null)
      const response = await getAllUserLoginReport(userId, page, size)
      
      if (response.resultCode === 200 && response.data) {
        setLoginLogs(response.data.content || [])
        setLoginTotalPages(response.data.totalPages || 0)
        setLoginTotalItems(response.data.totalElements || 0)
      } else {
        setLoginError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setLoginError("서버 연결에 실패했습니다")
      console.error("로그인 로그 조회 오류:", err)
    } finally {
      setLoginLoading(false)
    }
  }, [])

  const fetchUserLoginLogs = useCallback(async (userId) => {
    try {
      setLoginLoading(true)
      setLoginError(null)
      const response = await getUserLoginReport(userId)
      
      if (response.resultCode === 200 && response.data) {
        setLoginLogs(response.data.content || [])
        setLoginTotalPages(response.data.totalPages || 0)
        setLoginTotalItems(response.data.totalElements || 0)
      } else {
        setLoginError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setLoginError("서버 연결에 실패했습니다")
      console.error("사용자 로그인 로그 조회 오류:", err)
    } finally {
      setLoginLoading(false)
    }
  }, [])

  // 조직별 로그인 로그 조회
  const fetchOrganizationLoginLogs = useCallback(async (orgId, page = 0, size = 20) => {
    try {
      setLoginLoading(true)
      setLoginError(null)
      const response = await getOrganizationLoginReport(orgId, page, size)
      
      if (response.resultCode === 200 && response.data) {
        setLoginLogs(response.data.content || [])
        setLoginTotalPages(response.data.totalPages || 0)
        setLoginTotalItems(response.data.totalElements || 0)
      } else {
        setLoginError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setLoginError("서버 연결에 실패했습니다")
      console.error("조직 로그인 로그 조회 오류:", err)
    } finally {
      setLoginLoading(false)
    }
  }, [])

  // 로그인 기본 정보 조회 (조직 목록, 사용자 목록)
  const fetchLoginBaseInfo = useCallback(async () => {
    try {
      const response = await getUserLoginBaseInfo()
      
      if (response.resultCode === 200 && response.data) {
        // 조직 목록 설정
        if (response.data.orgList) {
          setAvailableOrganizations(response.data.orgList.map(org => ({
            orgId: org.orgId,
            orgName: org.orgName
          })))
        }
        
        // 사용자 목록 설정
        if (response.data.userList) {
          setAvailableUsers(response.data.userList.map(user => ({
            userId: user.id,
            userName: user.name,
            email: user.email || user.name // 이메일이 없는 경우 name으로 대체
          })))
        }
      }
    } catch (err) {
      console.error("로그인 기본 정보 조회 오류:", err)
      // 기본 정보 조회 실패는 사용자에게 에러로 표시하지 않음 (선택적 기능)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "notifications") {
      if (viewMode === "all") {
        fetchAllOrganizations(currentPage - 1, pageSize)
      } else if (selectedOrganizationId) {
        fetchOrganizationByOrganizationId(selectedOrganizationId, currentPage - 1, pageSize)
      }
    } else if (activeTab === "login-logs") {
      // 로그인 로그 탭이 처음 활성화될 때 기본 정보 가져오기
      if (availableOrganizations.length === 0 && availableUsers.length === 0) {
        fetchLoginBaseInfo()
      }
      
      // 조직별 필터링
      if (selectedOrgId && selectedOrgId !== "all") {
        fetchOrganizationLoginLogs(selectedOrgId, loginCurrentPage - 1, loginPageSize)
      }
      // 사용자별 필터링
      else if (selectedUserId && selectedUserId !== "all") {
        fetchUserLoginLogs(selectedUserId)
      }
      // 전체 조회
      else {
        fetchAllLoginLogs(loginCurrentPage - 1, loginPageSize, null)
      }
    }
  }, [currentPage, pageSize, viewMode, selectedOrganizationId, 
      loginCurrentPage, loginPageSize, selectedUserId, selectedOrgId, 
      activeTab])

  // 알림 관련 핸들러들
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(parseInt(size))
    setCurrentPage(1)
  }

  const handleOrganizationIdChange = (organizationId) => {
    setCurrentPage(1)
    if (organizationId === "all") {
      setViewMode("all")
      setSelectedOrganizationId("")
      setSingleOrganization(null)
    } else {
      setViewMode("single")
      setSelectedOrganizationId(organizationId)
    }
  }

  // 로그인 로그 관련 핸들러들
  const handleLoginPageChange = (page) => {
    setLoginCurrentPage(page)
  }

  const handleLoginPageSizeChange = (size) => {
    setLoginPageSize(parseInt(size))
    setLoginCurrentPage(1)
  }

  const handleUserChange = (userId) => {
    setLoginCurrentPage(1)
    setSelectedUserId(userId)
    // 사용자를 선택하면 조직 필터 초기화
    setSelectedOrgId("")
  }

  const handleOrgChange = (orgId) => {
    setLoginCurrentPage(1)
    setSelectedOrgId(orgId)
    // 조직을 선택하면 사용자 필터 초기화
    setSelectedUserId("")
  }

  const handleLoginViewModeChange = (mode) => {
    setLoginViewMode(mode)
    setLoginCurrentPage(1)
  }

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "-"
    return new Date(dateTime).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true // 12시간 형식 + 오전/오후 표시
    })
  }

  const getBrowserName = (userAgent) => {
    if (!userAgent) return "알 수 없음"
    
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    if (userAgent.includes('Opera')) return 'Opera'
    if (userAgent.includes('CriOS')) return 'Chrome Mobile'
    
    return "기타"
  }

  const getDeviceType = (userAgent) => {
    if (!userAgent) return "알 수 없음"
    
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
      return 'Mobile'
    }
    if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      return 'Tablet'
    }
    return 'Desktop'
  }

  const renderNotificationType = (type) => {
    const config = notificationTypeConfig[type] || notificationTypeConfig[0];
    const IconComponent = config.icon;
    
    return (
      <Badge className={config.className}>
        <IconComponent className="w-3.5 h-3.5 mr-1.5" />
        {config.label}
      </Badge>
    );
  }

  const filteredData = viewMode === "all" 
    ? organizations.filter(org => 
        org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.plcSerial?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : (singleOrganization?.notifications || []).filter(noti =>
        noti.log?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        noti.deviceId?.toLowerCase().includes(searchTerm.toLowerCase())
      )

  const filteredLoginData = loginLogs.filter(log => {
    const matchesSearch = log.userName?.toLowerCase().includes(loginSearchTerm.toLowerCase()) ||
      log.email?.toLowerCase().includes(loginSearchTerm.toLowerCase()) ||
      log.orgName?.toLowerCase().includes(loginSearchTerm.toLowerCase()) ||
      getBrowserName(log.userAgent)?.toLowerCase().includes(loginSearchTerm.toLowerCase())
    
    const matchesUser = !selectedUserId || selectedUserId === "all" || log.userId === selectedUserId
    const matchesOrg = !selectedOrgId || selectedOrgId === "all" || log.orgId === selectedOrgId
    
    return matchesSearch && matchesUser && matchesOrg
  })

  // 조직별 그룹화된 데이터
  const groupedLoginData = filteredLoginData.reduce((acc, log) => {
    const orgKey = log.orgId || "unknown"
    const orgName = log.orgName || "조직 정보 없음"
    
    if (!acc[orgKey]) {
      acc[orgKey] = {
        orgId: orgKey,
        orgName: orgName,
        logs: [],
        totalLogs: 0
      }
    }
    
    acc[orgKey].logs.push(log)
    acc[orgKey].totalLogs += 1
    
    return acc
  }, {})

  const renderEmptyState = (message) => (
    <div className="text-center py-12 text-muted-foreground">
      <Bell className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium">{message}</h3>
    </div>
  )

  const OrganizationAccordion = ({ org }) => (
    <AccordionItem value={org.id} disabled={org.totalNotifications === 0}>
      <AccordionTrigger>
        <div className="flex justify-between items-center w-full pr-4">
          <div className="flex items-center space-x-4">
            <Building className="h-5 w-5 text-primary" />
            <span className="font-semibold">{org.name}</span>
            <Badge variant="outline">{org.plcSerial || "N/A"}</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="font-mono dark:bg-slate-900">{org.totalNotifications || 0} 건</Badge>
            <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDateTime(org.updatedAt)}</span>
            </div>
            <Badge variant={org.active ? "default" : "outline"} className={org.active ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" : ""}>
              {org.active ? "활성" : "비활성"}
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="p-4 bg-muted/50 rounded-lg dark:bg-slate-900">
          {org.notifications && org.notifications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>타입</TableHead>
                  <TableHead>로그 내용</TableHead>
                  <TableHead>발생 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.notifications.map(noti => (
                  <TableRow key={noti.id}>
                    <TableCell>{renderNotificationType(noti.type)}</TableCell>
                    <TableCell>{noti.log}</TableCell>
                    <TableCell>{formatDateTime(noti.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">이 조직에는 최근 알림이 없습니다.</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )

  const LoginLogsByOrganizationAccordion = ({ orgData }) => (
    <AccordionItem value={orgData.orgId}>
      <AccordionTrigger>
        <div className="flex justify-between items-center w-full pr-4">
          <div className="flex items-center space-x-4">
            <Building className="h-5 w-5 text-primary" />
            <span className="font-semibold">{orgData.orgName}</span>
            <Badge variant="outline" className="font-mono">{orgData.orgId}</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="font-mono">{orgData.totalLogs} 건</Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="p-4 bg-muted/50 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>사용자</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>로그인 시간</TableHead>
                <TableHead>마지막 사용</TableHead>
                <TableHead>브라우저</TableHead>
                <TableHead>디바이스</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgData.logs.map((log, index) => (
                <TableRow key={`${log.userId}-${log.loginTime}-${index}`} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{log.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{log.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1.5 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatDateTime(log.loginTime)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDateTime(log.lastUsedAt)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getBrowserName(log.userAgent)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1.5">
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          getDeviceType(log.userAgent) === 'Mobile' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                        }`}
                      >
                        {getDeviceType(log.userAgent)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={log.isRevoked ? "destructive" : (log.active ? "default" : "secondary")}
                      className={log.active && !log.isRevoked ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" : ""}
                    >
                      {log.isRevoked ? "만료됨" : (log.active ? "활성" : "비활성")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  )

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      <div className="md:flex items-center space-x-3 mb-4 hidden">
        <Bell className="h-6 w-6 text-blue-600 dark:text-green-600" />
        <p className="font-bold text-[28px] text-gray-900 dark:text-white">알림관리</p>
      </div>

      <Tabs defaultValue="notifications" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 dark:bg-slate-800/70">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            알림 현황
          </TabsTrigger>
          <TabsTrigger value="login-logs" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            로그인 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="조직명, PLC Serial, 알림 내용으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedOrganizationId || "all"} onValueChange={handleOrganizationIdChange}>
                <SelectTrigger className="w-full md:w-48 bg-white">
                  <SelectValue placeholder="사업장 선택" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:hover:bg-slate-900  dark:focus:bg-slate-900" value="all">전체 조직</SelectItem>
                  {availableOrganizations.map((org) => (
                    <SelectItem className="dark:hover:bg-slate-900 dark:focus:bg-slate-900" key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-full md:w-24 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:hover:bg-slate-900  dark:focus:bg-slate-900" value="5">5개씩</SelectItem>
                  <SelectItem className="dark:hover:bg-slate-900  dark:focus:bg-slate-900" value="10">10개씩</SelectItem>
                  <SelectItem className="dark:hover:bg-slate-900  dark:focus:bg-slate-900" value="20">20개씩</SelectItem>
                  <SelectItem className="dark:hover:bg-slate-900  dark:focus:bg-slate-900" value="50">50개씩</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Card className="border-destructive/50 bg-destructive/10 text-destructive-foreground">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">오류 발생</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">데이터를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {viewMode === "all" ? (
                <Card className="!gap-3 dark:bg-slate-800/70">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building className="h-5 w-5 text-primary" />
                        <span>조직별 알림 현황</span>
                      </div>
                      <Badge className="dark:bg-slate-900" variant="secondary">{totalItems}개 조직</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {filteredData.length > 0 ? (
                        <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion}>
                          {filteredData.map((org) => <OrganizationAccordion key={org.id} org={org} />)}
                        </Accordion>
                      ) : (
                        renderEmptyState("조회된 조직이 없습니다.")
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                singleOrganization && (
                  <Card className="dark:bg-slate-800/70">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Building className="h-5 w-5 text-primary" />
                          <span>{singleOrganization.name}</span>
                        </div>
                        <Badge className="dark:bg-slate-900" variant="secondary">{totalItems}건 알림</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>타입</TableHead>
                            <TableHead>디바이스 ID</TableHead>
                            <TableHead>사용자 ID</TableHead>
                            <TableHead>로그 내용</TableHead>
                            <TableHead>발생 시간</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.length > 0 ? filteredData.map((notification) => (
                            <TableRow key={notification.id} className="hover:bg-muted/50">
                              <TableCell>{renderNotificationType(notification.type)}</TableCell>
                              <TableCell>
                                {notification.deviceId ? (
                                  <Badge variant="outline" className="font-mono">{notification.deviceId}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">
                                {notification.userId || "-"}
                              </TableCell>
                              <TableCell className="max-w-md truncate">
                                {notification.log || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1.5 text-sm text-muted-foreground dark:text-white">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{formatDateTime(notification.createdAt)}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={5}>
                                {renderEmptyState("조회된 알림이 없습니다.")}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      {totalPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                      )}
                    </CardContent>
                  </Card>
                )
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="login-logs" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="사용자명, 이메일, 조직명, 브라우저로 검색..."
                  value={loginSearchTerm}
                  onChange={(e) => setLoginSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2  flex-wrap">
              <Select value={loginViewMode} onValueChange={handleLoginViewModeChange}>
                <SelectTrigger className="w-full md:w-32 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 보기</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedOrgId || "all"} onValueChange={handleOrgChange}>
                <SelectTrigger className="w-full md:w-48 bg-white">
                  <SelectValue placeholder="조직 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 조직</SelectItem>
                  {availableOrganizations.map((org) => (
                    <SelectItem key={org.orgId} value={org.orgId}>
                      {org.orgName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedUserId || "all"} onValueChange={handleUserChange}>
                <SelectTrigger className="w-full md:w-48 bg-white">
                  <SelectValue placeholder="사용자 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 사용자</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={loginPageSize.toString()} onValueChange={handleLoginPageSizeChange}>
                <SelectTrigger className="w-full md:w-24 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10개씩</SelectItem>
                  <SelectItem value="20">20개씩</SelectItem>
                  <SelectItem value="50">50개씩</SelectItem>
                  <SelectItem value="100">100개씩</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loginError && (
            <Card className="border-destructive/50 bg-destructive/10 text-destructive-foreground">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">오류 발생</p>
                    <p className="text-sm">{loginError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loginLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">데이터를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {loginViewMode === "grouped" ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building className="h-5 w-5 text-primary" />
                        <span>조직별 로그인 로그 현황</span>
                      </div>
                      <Badge variant="secondary">{Object.keys(groupedLoginData).length}개 조직</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      {Object.keys(groupedLoginData).length > 0 ? (
                        <Accordion type="single" collapsible>
                          {Object.values(groupedLoginData).map((orgData) => (
                            <LoginLogsByOrganizationAccordion key={orgData.orgId} orgData={orgData} />
                          ))}
                        </Accordion>
                      ) : (
                        renderEmptyState("조회된 조직이 없습니다.")
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="dark:bg-slate-800/70">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span>로그인 로그 현황</span>
                      </div>
                      <Badge className="dark:bg-slate-900" variant="secondary">{loginTotalItems}건의 로그</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="dark:border-slate-600">
                            <TableHead>사용자</TableHead>
                            <TableHead>이메일</TableHead>
                            <TableHead>조직</TableHead>
                            <TableHead>로그인 시간</TableHead>
                            <TableHead>마지막 사용</TableHead>
                            <TableHead>브라우저</TableHead>
                            <TableHead>디바이스</TableHead>
                            <TableHead>상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLoginData.length > 0 ? filteredLoginData.map((log, index) => (
                            <TableRow key={`${log.userId}-${log.loginTime}-${index}`} className="hover:bg-muted/50 dark:hover:bg-slate-700 dark:border-slate-600">
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{log.userName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{log.email}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Building className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{log.orgName || "조직 정보 없음"}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1.5 text-sm">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{formatDateTime(log.loginTime)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1.5 text-sm text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{formatDateTime(log.lastUsedAt)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs dark:bg-slate-900">
                                  {getBrowserName(log.userAgent)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-1.5">
                                  <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${
                                      getDeviceType(log.userAgent) === 'Mobile' 
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                    }`}
                                  >
                                    {getDeviceType(log.userAgent)}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={log.isRevoked ? "destructive" : (log.active ? "default" : "secondary")}
                                  className={log.active && !log.isRevoked ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "dark:bg-slate-900"}
                                >
                                  {log.isRevoked ? "만료됨" : (log.active ? "활성" : "비활성")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={8}>
                                {renderEmptyState("조회된 로그인 로그가 없습니다.")}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    {loginTotalPages > 1 && (
                          <Pagination
                              currentPage={loginCurrentPage}
                              totalPages={loginTotalPages}
                              onPageChange={handleLoginPageChange}
                          />
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
