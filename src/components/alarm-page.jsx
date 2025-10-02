import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bell,
  Building,
  Search,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  ClipboardList,
  User,
  Mail,
  Monitor,
  Users
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import Pagination from "./pagination"
import { getOrganizationWithNotificationsByOrganizationId } from "@/api/notification"
import { getAllUserLoginReport, getUserLoginReport, getOrganizationLoginReport, getUserLoginBaseInfo } from "@/api/loginLog"
import useOrganizationStore from "@/store/organizationStore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

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

export default function AlarmPage() {
  // 현재 사업장 정보
  const { selectedOrganization } = useOrganizationStore()
  
  // 알림 관련 상태
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // 로그인 로그 관련 상태
  const [loginLogs, setLoginLogs] = useState([])
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState(null)
  const [loginSearchTerm, setLoginSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [loginCurrentPage, setLoginCurrentPage] = useState(1)
  const [loginTotalPages, setLoginTotalPages] = useState(0)
  const [loginTotalItems, setLoginTotalItems] = useState(0)
  const [loginPageSize, setLoginPageSize] = useState(20)
  const [availableUsers, setAvailableUsers] = useState([])

  // 현재 활성 탭
  const [activeTab, setActiveTab] = useState("notifications")

  // 현재 사업장의 알림 조회
  const fetchCurrentOrganizationNotifications = useCallback(async (page = 0, size = 10) => {
    if (!selectedOrganization?.id) {
      setError("사업장 정보가 없습니다.")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await getOrganizationWithNotificationsByOrganizationId(selectedOrganization.id, page, size)
      
      if (response.resultCode === 200 && response.data) {
        setOrganization(response.data)
        setTotalPages(response.data.totalPages || 0)
        setTotalItems(response.data.totalNotifications || 0)
      } else {
        setError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다")
      console.error("현재 사업장 알림 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }, [selectedOrganization?.id])

  // 현재 사업장의 로그인 로그 조회
  const fetchCurrentOrganizationLoginLogs = useCallback(async (page = 0, size = 20) => {
    if (!selectedOrganization?.id) {
      setLoginError("사업장 정보가 없습니다.")
      setLoginLoading(false)
      return
    }

    try {
      setLoginLoading(true)
      setLoginError(null)
      const response = await getOrganizationLoginReport(selectedOrganization.id, page, size)
      
      if (response.resultCode === 200 && response.data) {
        setLoginLogs(response.data.content || [])
        setLoginTotalPages(response.data.totalPages || 0)
        setLoginTotalItems(response.data.totalElements || 0)
      } else {
        setLoginError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setLoginError("서버 연결에 실패했습니다")
      console.error("현재 사업장 로그인 로그 조회 오류:", err)
    } finally {
      setLoginLoading(false)
    }
  }, [selectedOrganization?.id])

  // 로그인 기본 정보 조회 (사용자 목록)
  const fetchLoginBaseInfo = useCallback(async () => {
    try {
      const response = await getUserLoginBaseInfo()
      
      if (response.resultCode === 200 && response.data) {
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
    }
  }, [])

  useEffect(() => {
    if (activeTab === "notifications") {
      fetchCurrentOrganizationNotifications(currentPage - 1, pageSize)
    } else if (activeTab === "login-logs") {
      // 로그인 로그 탭이 처음 활성화될 때 기본 정보 가져오기
      if (availableUsers.length === 0) {
        fetchLoginBaseInfo()
      }
      fetchCurrentOrganizationLoginLogs(loginCurrentPage - 1, loginPageSize)
    }
  }, [currentPage, pageSize, loginCurrentPage, loginPageSize, activeTab, selectedOrganization?.id])

  // 알림 관련 핸들러들
  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(parseInt(size))
    setCurrentPage(1)
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

  const filteredData = (organization?.notifications || []).filter(noti =>
    noti.log?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    noti.deviceId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredLoginData = loginLogs.filter(log => {
    const matchesSearch = log.userName?.toLowerCase().includes(loginSearchTerm.toLowerCase()) ||
      log.email?.toLowerCase().includes(loginSearchTerm.toLowerCase()) ||
      log.orgName?.toLowerCase().includes(loginSearchTerm.toLowerCase()) ||
      getBrowserName(log.userAgent)?.toLowerCase().includes(loginSearchTerm.toLowerCase())
    
    const matchesUser = !selectedUserId || selectedUserId === "all" || log.userId === selectedUserId
    
    return matchesSearch && matchesUser
  })

  const renderEmptyState = (message) => (
    <div className="text-center py-12 text-muted-foreground">
      <Bell className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium">{message}</h3>
    </div>
  )

  // 사업장 정보가 없을 때 표시
  if (!selectedOrganization) {
    return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        <div className="md:flex items-center space-x-3 mb-4 hidden">
          <Bell className="h-6 w-6 text-blue-600 dark:text-green-600" />
          <p className="font-bold text-[28px] text-gray-900 dark:text-white">알림 현황</p>
        </div>
        
        <Card className="border-destructive/50 bg-destructive/10 text-destructive-foreground">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold">사업장 정보 없음</p>
                <p className="text-sm">현재 선택된 사업장이 없습니다. 사업장을 선택한 후 다시 시도해주세요.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      <div className="md:flex items-center space-x-3 mb-4 hidden">
        <Bell className="h-6 w-6 text-blue-600 dark:text-green-600" />
        <p className="font-bold text-[28px] text-gray-900 dark:text-white">알림 현황</p>
        <Badge variant="outline" className="ml-4">
          <Building className="h-4 w-4 mr-1" />
          {selectedOrganization.name}
        </Badge>
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
                  placeholder="알림 내용, 디바이스 ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-full md:w-24 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="5">5개씩</SelectItem>
                  <SelectItem className="dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="10">10개씩</SelectItem>
                  <SelectItem className="dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="20">20개씩</SelectItem>
                  <SelectItem className="dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="50">50개씩</SelectItem>
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
            <Card className="dark:bg-slate-800/70">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-primary" />
                    <span>{selectedOrganization.name} 알림 현황</span>
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
          )}
        </TabsContent>

        <TabsContent value="login-logs" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="사용자명, 이메일, 브라우저로 검색..."
                  value={loginSearchTerm}
                  onChange={(e) => setLoginSearchTerm(e.target.value)}
                  className="pl-10 w-full bg-white"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
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
            <Card className="dark:bg-slate-800/70">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span>{selectedOrganization.name} 로그인 로그 현황</span>
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
                        <TableCell colSpan={7}>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
