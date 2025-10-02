import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ClipboardList,
  Search,
  Clock,
  User,
  Mail,
  Monitor,
  Loader2,
  AlertTriangle,
  Users
} from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import Pagination from "./pagination"
import { getAllUserLoginReport, getUserLoginReport } from "@/api/loginLog"

export default function LoginLogPage() {
  const [loginLogs, setLoginLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [availableUsers, setAvailableUsers] = useState([])

  const fetchAllLoginLogs = useCallback(async (page = 0, size = 20, userId = null) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getAllUserLoginReport(userId, page, size)
      
      if (response.resultCode === 200 && response.data) {
        setLoginLogs(response.data.content || [])
        setTotalPages(response.data.totalPages || 0)
        setTotalItems(response.data.totalElements || 0)
        
        // 사용자 목록 업데이트 (중복 제거)
        const users = response.data.content?.map(log => ({
          userId: log.userId,
          userName: log.userName,
          email: log.email
        })) || []
        
        const uniqueUsers = users.filter((user, index, self) => 
          index === self.findIndex(u => u.userId === user.userId)
        )
        
        setAvailableUsers(prev => {
          const combined = [...prev, ...uniqueUsers]
          return combined.filter((user, index, self) => 
            index === self.findIndex(u => u.userId === user.userId)
          )
        })
      } else {
        setError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다")
      console.error("로그인 로그 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUserLoginLogs = useCallback(async (userId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await getUserLoginReport(userId)
      
      if (response.resultCode === 200 && response.data) {
        setLoginLogs(response.data.content || [])
        setTotalPages(response.data.totalPages || 0)
        setTotalItems(response.data.totalElements || 0)
      } else {
        setError(response.resultMessage || "데이터를 불러오는데 실패했습니다")
      }
    } catch (err) {
      setError("서버 연결에 실패했습니다")
      console.error("사용자 로그인 로그 조회 오류:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedUserId && selectedUserId !== "all") {
      fetchUserLoginLogs(selectedUserId)
    } else {
      fetchAllLoginLogs(currentPage - 1, pageSize, null)
    }
  }, [currentPage, pageSize, selectedUserId, fetchAllLoginLogs, fetchUserLoginLogs])

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (size) => {
    setPageSize(parseInt(size))
    setCurrentPage(1)
  }

  const handleUserChange = (userId) => {
    setCurrentPage(1)
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
      second: '2-digit'
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

  const filteredData = loginLogs.filter(log => 
    log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getBrowserName(log.userAgent)?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderEmptyState = (message) => (
    <div className="text-center py-12 text-muted-foreground">
      <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium">{message}</h3>
    </div>
  )

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      <div className="md:flex items-center space-x-3 mb-4 hidden">
        <ClipboardList className="h-6 w-6 text-blue-600" />
        <p className="font-bold text-[28px] text-gray-900">로그인 로그</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="사용자명, 이메일, 브라우저로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-white"
            />
          </div>
        </div>
        <div className="flex gap-2 bg-white">
          <Select value={selectedUserId || "all"} onValueChange={handleUserChange}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="사용자 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 사용자</SelectItem>
              {availableUsers.map((user) => (
                <SelectItem key={user.userId} value={user.userId}>
                  {user.userName} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-full md:w-24">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>로그인 로그 현황</span>
                </div>
                <Badge variant="secondary">{totalItems}건의 로그</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[800px]">
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
                    {filteredData.length > 0 ? filteredData.map((log, index) => (
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
                            variant={log.isRevoked ? "destructive" : "default"}
                            className={!log.isRevoked ? "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400" : ""}
                          >
                            {log.isRevoked ? "만료됨" : "활성"}
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
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex justify-center pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
