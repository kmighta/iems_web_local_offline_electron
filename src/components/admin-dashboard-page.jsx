import { useState } from "react"
import axios from "axios"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  Store,
  Cpu,
  Clock,
  Users,
  Building,
  Bell,
  MessageSquare,
  Megaphone,
  Eye,
  Reply,
  User,
  Mail,
  Phone,
} from "lucide-react"

// inquiry API import 추가


// 대시보드 데이터 가져오기 함수
const fetchDashboardData = async () => {
  const response = await axios.get('/dashboard/status')
  
  if (response.data.resultCode === 200) {
    return response.data.data
  } else {
    throw new Error(response.data.resultMessage || '데이터 조회 실패')
  }
}

export default function AdminDashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today")
  
  // 모달 상태 추가
  const [isNoticeDetailModalOpen, setIsNoticeDetailModalOpen] = useState(false)
  const [isInquiryDetailModalOpen, setIsInquiryDetailModalOpen] = useState(false)
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [selectedInquiry, setSelectedInquiry] = useState(null)

  // 답변 폼 데이터 추가
  const [answerData, setAnswerData] = useState({
    answer: "",
    answeredBy: "관리자"
  })

  // TanStack Query로 데이터 가져오기
  const { 
    data: dashboardData = {
      notice: [],
      inquiry: [],
      notiList: [],
      inquiryCount: 0,
      totalMember: 0,
      noticeCount: 0,
      noticeBoardCount: 0,
      orgCount: 0
    }, 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['dashboardStatus'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5분 동안 fresh 상태
    gcTime: 10 * 60 * 1000, // 10분 동안 캐시 유지
    refetchOnWindowFocus: true, // 윈도우 포커스 시 자동 새로고침 비활성화
    refetchInterval: 2 * 60 * 1000, // 자동 새로고침 비활성화 (기존: 2분마다)
    retry: 3, // 실패 시 3번 재시도
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
  })

  // 알림 통계 계산
  const totalNotifications = (dashboardData.notiList || []).reduce((sum, org) => sum + (org.totalNotifications || 0), 0)
  
  // 비활성 사업장 계산 (사업장 관리 페이지의 오류 카운트 로직과 동일하게)
  const inactiveOrganizations = (dashboardData.notiList || []).filter(org => org.connect === false).length
  const activeOrganizations = (dashboardData.orgCount || 0) - inactiveOrganizations

  const getStatusIcon = (status) => {
    switch (status) {
      case "정상":
        return CheckCircle
      case "주의":
        return AlertTriangle
      case "오류":
        return AlertTriangle
      default:
        return Activity
    }
  }

  // 공지사항 상세보기 핸들러
  const handleNoticeDetail = (notice) => {
    setSelectedNotice(notice)
    setIsNoticeDetailModalOpen(true)
  }

  // 1:1문의 상세보기 핸들러 (API 호출로 변경)
  const handleInquiryDetail = async (inquiry) => {
    try {
      const response = await getInquiryById(inquiry.id)
      if (response.resultCode === 200) {
        setSelectedInquiry(response.data)
        setIsInquiryDetailModalOpen(true)
      }
    } catch (error) {
      console.error("문의 상세 조회 오류:", error)
    }
  }

  // 답변 모달 열기
  const handleAnswerClick = (inquiry) => {
    setSelectedInquiry(inquiry)
    setIsAnswerModalOpen(true)
  }

  // 문의 답변 처리
  const handleAnswerInquiry = async () => {
    try {
      const response = await answerInquiry(selectedInquiry.id, answerData)
      if (response.resultCode === 200) {
        setIsAnswerModalOpen(false)
        setAnswerData({
          answer: "",
          answeredBy: "관리자"
        })
        // 데이터 새로고침
        refetch()
        // 상세 모달이 열려있다면 새로고침
        if (isInquiryDetailModalOpen) {
          handleInquiryDetail(selectedInquiry)
        }
      }
    } catch (error) {
      console.error("문의 답변 오류:", error)
    }
  }

  // 문의 상태 렌더링
  const renderInquiryStatus = (status) => {
    const statusConfig = {
      PENDING: { label: "대기중", color: "bg-yellow-100 text-yellow-800" },
      ANSWERED: { label: "답변완료", color: "bg-green-100 text-green-800" },
      CLOSED: { label: "취소", color: "bg-red-100 text-red-800" }
    }
    const config = statusConfig[status] || statusConfig.PENDING
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  // 날짜 포맷팅 함수
  const formatDateTime = (dateTime) => {
    if (!dateTime) return "-"
    
    try {
      const utcDate = new Date(dateTime)
      const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
      
      return kstDate.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('날짜 변환 오류:', error)
      return dateTime
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">데이터를 불러오는 중...</div>
        </div>
      </div>
    )
  }

  if (error) {
    const errorMessage = error.response 
      ? `서버 오류: ${error.response.status} - ${error.response.data?.resultMessage || error.message}`
      : error.request
      ? '서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.'
      : error.message || '알 수 없는 오류가 발생했습니다.'
      
    return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-lg text-red-600 mb-4">데이터 불러오기 실패</div>
          <div className="text-sm text-gray-600 mb-4">{errorMessage}</div>
          <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700 text-white">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
          {/* 사업장관리 */}
          <Link to="/admin/stores">
            <Card className="bg-white/70 dark:bg-slate-800/70 border-1 shadow-sm rounded-2xl !gap-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-blue-700 dark:text-blue-400">사업장관리</CardTitle>
                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Building className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.orgCount || 0}</div>
                <div className="text-base font-medium text-gray-600 dark:text-slate-300">총 사업장</div>
                <div className="flex gap-4 mt-2 text-[13px]">
                  <span className="text-[13px] text-green-600 dark:text-green-400">활성: {activeOrganizations}</span>
                  <span className="text-[13px] text-orange-600 dark:text-orange-400">비활성: {inactiveOrganizations}</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 1:1문의 */}
          <Link to="/admin/inquiries">
            <Card className="bg-white/70 dark:bg-slate-800/70 border-1 shadow-sm rounded-2xl !gap-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-indigo-700 dark:text-indigo-400">1:1문의</CardTitle>
                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-indigo-700 dark:text-indigo-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.inquiryCount || 0}</div>
                <div className="text-base font-medium text-gray-600 dark:text-slate-300">총 문의</div>
                <div className="flex gap-4 mt-2 text-[13px]">
                  <span className="text-[13px] text-orange-600 dark:text-orange-400">대기: {dashboardData.inquiryPendingCount || 0}</span>
                  <span className="text-[13px] text-green-600 dark:text-green-400">완료: {dashboardData.inquiryAnsweredCount || 0}</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 회원관리 */}
          <Link to="/admin/users">
            <Card className="bg-white/70 dark:bg-slate-800/70 border-1 shadow-sm rounded-2xl !gap-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-green-700 dark:text-green-400">회원관리</CardTitle>
                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-700 dark:text-green-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.totalMember || 0}</div>
                <div className="text-base font-medium text-gray-600 dark:text-slate-300">총 회원</div>
                <div className="flex gap-4 mt-2 text-[13px]">
                  <span className="text-[13px] text-green-600 dark:text-green-400">활성: {dashboardData.totalMember || 0}</span>
                  <span className="text-[13px] text-gray-600 dark:text-slate-400">비활성: 0</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 알림관리 */}
          <Link to="/admin/notifications">
            <Card className="bg-white/70 dark:bg-slate-800/70 border-1 shadow-sm rounded-2xl !gap-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-orange-700 dark:text-orange-400">알림관리</CardTitle>
                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Bell className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalNotifications}</div>
                <div className="text-base font-medium text-gray-600 dark:text-slate-300">총 알림</div>
                <div className="flex gap-4 mt-2 text-[13px]">
                  <span className="text-[13px] text-blue-600 dark:text-blue-400">사업장: {(dashboardData.notiList || []).length}개</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 공지사항 */}
          <Link to="/admin/notices">
            <Card className="bg-white/70 dark:bg-slate-800/70 border-1 shadow-sm rounded-2xl !gap-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-purple-700 dark:text-purple-400">공지사항</CardTitle>
                  <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <Megaphone className="h-6 w-6 text-purple-700 dark:text-purple-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardData.noticeBoardCount || 0}</div>
                <div className="text-base font-medium text-gray-600 dark:text-slate-300">총 공지사항</div>
                <div className="flex gap-4 mt-2 text-[13px]">
                  <span className="text-[13px] text-green-600 dark:text-green-400">게시됨: {dashboardData.noticeBoardCount || 0}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <Card className="border-1 border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-900 dark:text-white">사업장 에러 알림</CardTitle>
              <Link to="/admin/stores">
                <Button variant="outline" size="sm" className="text-xs bg-transparent dark:text-white">
                  <Eye className="h-3 w-3 mr-1" />
                  전체보기
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 max-h-[600px] overflow-y-auto">
              {(dashboardData.notiList || []).map((org, index) => {
                // 최신 알림 정렬 (내림차순)
                const sortedAll = [...(org.notifications || [])].sort((a, b) => {
                  const ta = new Date(a.createdAt).getTime();
                  const tb = new Date(b.createdAt).getTime();
                  return tb - ta;
                });

                // 해제/복구 타입 존재 여부
                const has2 = sortedAll.some(n => n.type === 2); // 통신해결 → 3만 해제
                const has7 = sortedAll.some(n => n.type === 7); // 오류해제 → 4/5/6 해제

                // 에러 활성화 규칙 적용 (3은 2가 있으면 제외, 4/5/6은 7이 있으면 제외)
                const activeErrors = sortedAll.filter(n => (
                  (n.type === 3 && !has2) ||
                  ((n.type === 4 || n.type === 5 || n.type === 6) && !has7)
                ));

                // 남은 활성 에러 중 가장 최신 선택
                let latestNotification = activeErrors[0] || null;

                // 활성 에러가 없고, org.error/connect 플래그로 보조 판단
                if (!latestNotification && ((org?.error === true) || (org?.connect === false))) {
                  // 두 해제(2,7)가 모두 존재하면 표기 안 함
                  if (has2 && has7) return null;

                  const log = org.deviceLog || null;
                  latestNotification = log ? {
                    type: [3,4,5,6].includes(log.type) ? log.type : 3,
                    createdAt: log.createdAt,
                    log: log.log || '장치 오류가 감지되었습니다.',
                  } : {
                    type: 3,
                    createdAt: new Date().toISOString(),
                    log: '장치 오류가 감지되었습니다.',
                  };
                }

                if (!latestNotification) return null;

                const getSeverity = (type) => {
                  switch (type) {
                    case 3: return "critical"; // 연결 끊어짐
                    case 4: return "critical"; // 심각한 오류
                    case 5: return "warning";  // 경고 오류
                    case 6: return "warning";  // 기타 경고성 오류
                    default: return "critical";
                  }
                };

                const getTypeText = (type) => {
                  switch (type) {
                    case 3: return "연결 끊어짐";
                    case 4: return "심각한 오류";
                    case 5: return "경고";
                    case 6: return "경고";
                    default: return "오류";
                  }
                };

                const severity = getSeverity(latestNotification.type);
                const timeAgo = new Date(latestNotification.createdAt).toLocaleString('ko-KR');

                return (
                    <Link key={index} to={`/admin/stores/${org.id}/monitoring`}>
                      <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900 dark:border-1 rounded-lg min-h-[94px] w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50">
                        <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                                severity === "critical"
                                    ? "bg-red-500"
                                    : severity === "warning"
                                        ? "bg-yellow-500"
                                        : "bg-blue-500"
                            }`}
                        ></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</span>
                            <Badge
                                className={`text-xs px-2 py-0.5 ${
                                    severity === "critical"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                        : severity === "warning"
                                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                }`}
                            >
                              {getTypeText(latestNotification.type)}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-700 dark:text-slate-300 mb-2">{latestNotification.log}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo}
                          </div>
                        </div>
                      </div>
                    </Link>
                )
              }).filter(Boolean)}
            </div>
          </CardContent>
        </Card>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 사업장별 알림 로그 */}
          {/*<Card className="border-1 border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 shadow-sm">*/}
          {/*  <CardHeader>*/}
          {/*    <div className="flex items-center justify-between">*/}
          {/*      <CardTitle className="text-lg text-gray-900 dark:text-white">사업장 에러 알림</CardTitle>*/}
          {/*      <Link to="/admin/stores">*/}
          {/*        <Button variant="outline" size="sm" className="text-xs bg-transparent dark:text-white">*/}
          {/*          <Eye className="h-3 w-3 mr-1" />*/}
          {/*          전체보기*/}
          {/*        </Button>*/}
          {/*      </Link>*/}
          {/*    </div>*/}
          {/*  </CardHeader>*/}
          {/*  <CardContent>*/}
          {/*    <div className="space-y-3">*/}
          {/*      {dashboardData.notiList.slice(0, 5).map((org, index) => {*/}
          {/*        // type이 3, 4, 5인 에러 알림만 필터링*/}
          {/*        const errorNotifications = org.notifications?.filter(notification => */}
          {/*          [3, 4, 5].includes(notification.type)*/}
          {/*        ) || [];*/}
          {/*        */}
          {/*        const latestNotification = errorNotifications[0]; // 최신 에러 알림*/}
          {/*        if (!latestNotification) return null;*/}
          {/*        */}
          {/*        const getSeverity = (type) => {*/}
          {/*          switch (type) {*/}
          {/*            case 3: return "critical"; // 연결 끊어짐*/}
          {/*            case 4: return "critical"; // 심각한 오류*/}
          {/*            case 5: return "warning";  // 경고 오류*/}
          {/*            default: return "critical";*/}
          {/*          }*/}
          {/*        };*/}
          {/*        */}
          {/*        const getTypeText = (type) => {*/}
          {/*          switch (type) {*/}
          {/*            case 3: return "연결 끊어짐";*/}
          {/*            case 4: return "심각한 오류";*/}
          {/*            case 5: return "경고";*/}
          {/*            default: return "오류";*/}
          {/*          }*/}
          {/*        };*/}
          {/*        */}
          {/*        const severity = getSeverity(latestNotification.type);*/}
          {/*        const timeAgo = new Date(latestNotification.createdAt).toLocaleString('ko-KR');*/}
          {/*        */}
          {/*        return (*/}
          {/*          <Link key={index} to={`/admin/stores/${org.id}/monitoring`}>*/}
          {/*            <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-900 dark:border-1 rounded-lg min-h-[94px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50">*/}
          {/*              <div*/}
          {/*                  className={`w-2 h-2 rounded-full mt-2 ${*/}
          {/*                      severity === "critical"*/}
          {/*                          ? "bg-red-500"*/}
          {/*                          : severity === "warning"*/}
          {/*                              ? "bg-yellow-500"*/}
          {/*                              : "bg-blue-500"*/}
          {/*                  }`}*/}
          {/*              ></div>*/}
          {/*              <div className="flex-1">*/}
          {/*                <div className="flex items-center gap-2 mb-1">*/}
          {/*                  <span className="text-sm font-medium text-gray-900 dark:text-white">{org.name}</span>*/}
          {/*                  <Badge*/}
          {/*                      className={`text-xs px-2 py-0.5 ${*/}
          {/*                          severity === "critical"*/}
          {/*                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"*/}
          {/*                              : severity === "warning"*/}
          {/*                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"*/}
          {/*                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"*/}
          {/*                      }`}*/}
          {/*                  >*/}
          {/*                    {getTypeText(latestNotification.type)}*/}
          {/*                  </Badge>*/}
          {/*                </div>*/}
          {/*                <div className="text-sm text-gray-700 dark:text-slate-300 mb-2">{latestNotification.log}</div>*/}
          {/*                <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">*/}
          {/*                  <Clock className="h-3 w-3" />*/}
          {/*                  {timeAgo}*/}
          {/*                </div>*/}
          {/*              </div>*/}
          {/*            </div>*/}
          {/*          </Link>*/}
          {/*        )*/}
          {/*      }).filter(Boolean)}*/}
          {/*    </div>*/}
          {/*  </CardContent>*/}
          {/*</Card>*/}

          {/* 1:1 문의 현황 */}
          <Card className="border-1 border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900 dark:text-white">1:1 문의 현황</CardTitle>
                <Link to="/admin/inquiries">
                  <Button variant="outline" size="sm" className="text-xs bg-transparent dark:text-white">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    답변하기
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(dashboardData.inquiry || []).slice(0, 5).map((inquiry, index) => {
                  const getStatusText = (status) => {
                    switch (status) {
                      case 'PENDING': return '답변 대기';
                      case 'ANSWERED': return '답변 완료';
                      case 'RESOLVED': return '해결 완료';
                      default: return '답변 대기';
                    }
                  };

                  const getStatusColor = (status) => {
                    switch (status) {
                      case 'PENDING': return 'bg-orange-100 text-orange-700';
                      case 'ANSWERED': return 'bg-blue-100 text-blue-700';
                      case 'RESOLVED': return 'bg-green-100 text-green-700';
                      default: return 'bg-orange-100 text-orange-700';
                    }
                  };

                  return (
                      <div key={inquiry.id} className="p-3 bg-gray-50 dark:bg-slate-900 dark:border-1 rounded-lg h-[94px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50" onClick={() => handleInquiryDetail(inquiry)}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{inquiry.title}</h4>
                            <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">문의자: {inquiry.authorName || '익명'}</p>
                          </div>
                          <Badge className="text-xs px-2 py-0.5 ml-2 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                            보통
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                          <span>{new Date(inquiry.createdAt).toLocaleString('ko-KR')}</span>
                          <Badge className={`px-2 py-0.5 ${getStatusColor(inquiry.status)}`}>
                            {getStatusText(inquiry.status)}
                          </Badge>
                        </div>
                      </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 최근 공지사항 */}
          <Card className="border-1 border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-gray-900 dark:text-white">최근 공지사항</CardTitle>
                <Link to="/admin/notices">
                  <Button variant="outline" size="sm" className="text-xs bg-transparent dark:text-white">
                    <Megaphone className="h-3 w-3 mr-1" />
                    관리
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(dashboardData.notice || []).slice(0, 5).map((notice, index) => {
                  return (
                    <div key={notice.id} className="p-3 bg-gray-50 dark:bg-slate-900 dark:border-1 rounded-lg h-[94px] cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50" onClick={() => handleNoticeDetail(notice)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{notice.title}</h4>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 truncate">{notice.content}</p>
                        </div>
                        <Badge className="text-xs px-2 py-0.5 ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          게시됨
                        </Badge>

                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR')}</span>
                        <span>조회 {notice.viewCount || 0}회</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 공지사항 상세보기 모달 */}
        <Dialog open={isNoticeDetailModalOpen} onOpenChange={setIsNoticeDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <span>{selectedNotice?.title}</span>
              </DialogTitle>
            </DialogHeader>
            {selectedNotice && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Badge className="bg-green-100 text-green-800">게시됨</Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>{selectedNotice.viewCount || 0}회 조회</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">등록일:</span>
                    <span className="ml-2">{formatDateTime(selectedNotice.createdAt)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">수정일:</span>
                    <span className="ml-2">{formatDateTime(selectedNotice.updatedAt)}</span>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap">{selectedNotice.content}</div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 1:1문의 상세보기 모달 */}
        <Dialog open={isInquiryDetailModalOpen} onOpenChange={setIsInquiryDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedInquiry?.title}</DialogTitle>
            </DialogHeader>
            {selectedInquiry && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {renderInquiryStatus(selectedInquiry.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">작성자:</span>
                    <span className="ml-2">{selectedInquiry.authorName}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">이메일:</span>
                    <span className="ml-2">{selectedInquiry.authorEmail}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">연락처:</span>
                    <span className="ml-2">{selectedInquiry.authorPhone || "-"}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">등록일:</span>
                    <span className="ml-2">{formatDateTime(selectedInquiry.createdAt)}</span>
                  </div>
                  {selectedInquiry.answeredAt && (
                    <>
                      <div>
                        <span className="font-medium text-muted-foreground">답변자:</span>
                        <span className="ml-2">{selectedInquiry.answeredBy}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">답변일:</span>
                        <span className="ml-2">{formatDateTime(selectedInquiry.answeredAt)}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-2">문의 내용</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="whitespace-pre-wrap">{selectedInquiry.content}</div>
                  </div>
                </div>

                {selectedInquiry.answer && (
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-2">답변 내용</h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="whitespace-pre-wrap">{selectedInquiry.answer}</div>
                    </div>
                  </div>
                )}

                {selectedInquiry.status === 'PENDING' && (
                  <div className="flex justify-end">
                    <Button onClick={() => {
                      setIsInquiryDetailModalOpen(false)
                      handleAnswerClick(selectedInquiry)
                    }}>
                      <Reply className="h-4 w-4 mr-2" />
                      답변하기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 답변 모달 */}
        <Dialog open={isAnswerModalOpen} onOpenChange={setIsAnswerModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>문의 답변</DialogTitle>
            </DialogHeader>
            {selectedInquiry && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-medium mb-2">{selectedInquiry.title}</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedInquiry.content}
                  </p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    작성자: {selectedInquiry.authorName} ({selectedInquiry.authorEmail})
                  </div>
                </div>
                <div>
                  <Label htmlFor="answer">답변 내용</Label>
                  <Textarea
                    id="answer"
                    value={answerData.answer}
                    onChange={(e) => setAnswerData({ ...answerData, answer: e.target.value })}
                    placeholder="답변 내용을 입력하세요"
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="answeredBy">답변자</Label>
                  <Input
                    id="answeredBy"
                    value={answerData.answeredBy}
                    onChange={(e) => setAnswerData({ ...answerData, answeredBy: e.target.value })}
                    placeholder="답변자명을 입력하세요"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAnswerModalOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleAnswerInquiry}>
                    답변 등록
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  )
}
