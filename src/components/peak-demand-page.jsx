import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import useSettingsStore from '@/store/settingsStore'
import useOrganizationStore from '@/store/organizationStore'
import { 
  fetchQuarterData, 
  fetchCycleData
} from '@/api/device_local'
import { 
  getDaily, 
  getDailyReport, 
  getMonthly, 
  getMonthlyReport, 
  getYearly, 
  getYearlyReport 
} from '@/api/report_dynamic'
import axios from '@/api/axios_util'
import { getOrganizationAxios } from '@/api/dynamic_axios'
import { Button } from './ui/button'
import { Calendar, Clock, RefreshCw, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getOrganization } from '@/api/organization'
import { useAuth } from "@/router/router"


export default function PeakDemandPage() {
  const [demandData, setDemandData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

   // 사업장 정보 가져오기 (monitoring-page.jsx와 동일한 로직)
   const { storeId } = useParams()
   const location = useLocation()
   const { userRole, currentUser, selectedStore: authSelectedStore } = useAuth()
 
   const getStoreInfo = () => {
     // 관리자급 역할들(admin, han, admin_owner, admin_engineer, admin_user)인 경우
     if (userRole === "admin" || userRole === "han" || 
         userRole === "admin_owner" || userRole === "admin_engineer" || userRole === "admin_user") {
       // 관리자인 경우 URL 파라미터나 location state에서 사업장 정보 가져오기
       if (location.state?.store) {
         return location.state.store
       }
       // storeId가 있으면 해당 사업장 정보 생성 (실제로는 API에서 가져와야 함)
       if (storeId) {
         return {
           id: storeId,
           name: location.state?.store?.name || "사업장",
           status: "정상",
           address: location.state?.store?.address || "사업장 주소"
         }
       }
     } else {
       // 일반 사용자인 경우 본인 사업장 정보 가져오기
       return authSelectedStore
     }
     return null
   }
 
   const selectedStore = getStoreInfo()

  // 최대수요전력 계산 함수
  const calculateMaxDemand = (data) => {
    if (!data || data.length === 0) {
      return { maxDemand: 0, timeValue: "0월 0일 00 : 00 : 00" }
    }
    
    let maxDemand = 0
    let maxDemandTime = null
    
    // 첫 번째 데이터 항목의 구조 확인
    if (data.length > 0) {
      console.log('첫 번째 데이터 항목 구조:', Object.keys(data[0]));
    }
    
    data.forEach((item, index) => {
      // 다양한 필드명으로 최대값 찾기
      const peak1 = item.peak1 || item.peak_1 || item.maxLoad || item.power || item.value || 0
      const peak2 = item.peak2 || item.peak_2 || 0
      const peak3 = item.peak3 || item.peak_3 || 0
      const peak4 = item.peak4 || item.peak_4 || 0
      
      // 피크1, 피크2, 피크3, 피크4 중 가장 큰 값 찾기
      const maxPeak = Math.max(peak1, peak2, peak3, peak4)
      
      if (maxPeak > maxDemand) {
        maxDemand = maxPeak
        maxDemandTime = new Date(item.startTime || item.time || item.timestamp || item.plcTime || new Date())
      }
    })
    
    console.log('계산 결과:', { maxDemand, timeValue: maxDemandTime ? format(maxDemandTime, "M월 d일 HH : mm : ss", { locale: ko }) : "0월 0일 00 : 00 : 00" });
    
    // 최대부하값을 1000으로 나누어 소수점 2자리까지 표현
    const normalizedMaxDemand = Math.round((maxDemand / 1000) * 1000) / 1000
    const formattedMaxDemand = parseFloat(normalizedMaxDemand.toFixed(2))
    
    return {
      maxDemand: formattedMaxDemand.toLocaleString(),
      timeValue: maxDemandTime ? format(maxDemandTime, "M월 d일 HH : mm : ss", { locale: ko }) : "0월 0일 00 : 00 : 00"
    }
  }

  // 데이터 로드 함수
  const loadDemandData = async () => {
    setIsLoading(true);
    console.log('selectedStore', selectedStore);
    
    // selectedStore가 없으면 에러 처리
    if (!selectedStore || !selectedStore.id) {
      console.error('selectedStore가 없습니다:', selectedStore);
      setIsLoading(false);
      return;
    }
    
    const org = await getOrganization(selectedStore.id);
    console.log('org', org);
    const deviceId = 0; // deviceId=0으로 고정
    
    try {
      const now = new Date()
      
      // 금일 데이터 (오늘 00:00:00 ~ 23:59:59)
      const todayStart = format(now, "yyyy-MM-dd'T'00:00:00")
      const todayEnd = format(now, "yyyy-MM-dd'T'23:59:59")
      const todayData = await fetchQuarterData(deviceId, todayStart, todayEnd)
      console.log('금일 데이터 구조 확인:', { 
        isArray: Array.isArray(todayData), 
        hasData: !!todayData.data, 
        length: todayData.length || todayData.data?.length || 0 
      });
      const todayMax = calculateMaxDemand(todayData.data || todayData)
      
      // 전일 데이터 (어제 00:00:00 ~ 23:59:59)
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStart = format(yesterday, "yyyy-MM-dd'T'00:00:00")
      const yesterdayEnd = format(yesterday, "yyyy-MM-dd'T'23:59:59")
      const yesterdayData = await fetchQuarterData(deviceId, yesterdayStart, yesterdayEnd)
      const yesterdayMax = calculateMaxDemand(yesterdayData.data || yesterdayData)
      
      // 금월 데이터 (이번달 1일 00:00:00 ~ 마지막날 23:59:59)
      const monthStart = format(now, "yyyy-MM-01'T'00:00:00")
      const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd'T'23:59:59")
      const monthData = await fetchQuarterData(deviceId, monthStart, monthEnd)
      const monthMax = calculateMaxDemand(monthData.data || monthData)
      
      // 전월 데이터 (지난달 1일 00:00:00 ~ 마지막날 23:59:59)
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthStart = format(prevMonth, "yyyy-MM-01'T'00:00:00")
      const prevMonthEnd = format(new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0), "yyyy-MM-dd'T'23:59:59")
      const prevMonthData = await fetchQuarterData(deviceId, prevMonthStart, prevMonthEnd)
      const prevMonthMax = calculateMaxDemand(prevMonthData.data || prevMonthData)
      
      // 금년 데이터 (올해 1월 1일 00:00:00 ~ 12월 31일 23:59:59)
      const yearStart = format(now, "yyyy-01-01'T'00:00:00")
      const yearEnd = format(now, "yyyy-12-31'T'23:59:59")
      const yearData = await fetchQuarterData(deviceId, yearStart, yearEnd)
      const yearMax = calculateMaxDemand(yearData.data || yearData)
      
      // 전년 데이터 (작년 1월 1일 00:00:00 ~ 12월 31일 23:59:59)
      const prevYear = new Date(now.getFullYear() - 1, 0, 1)
      const prevYearStart = format(prevYear, "yyyy-01-01'T'00:00:00")
      const prevYearEnd = format(prevYear, "yyyy-12-31'T'23:59:59")
      const prevYearData = await fetchQuarterData(deviceId, prevYearStart, prevYearEnd)
      const prevYearMax = calculateMaxDemand(prevYearData.data || prevYearData)
      
      const newDemandData = [
        {
          period: "금일최대수요전력",
          title: "Today's Peak Demand",
          peakPower: todayMax.maxDemand,
          unit: "kW",
          time: todayMax.timeValue,
          color: "blue",
          bgColor: "bg-blue-50",
          headerColor: "bg-blue-100 dark:bg-slate-200",
          textColor: "text-blue-700 dark:text-green-900",
        },
        {
          period: "금월최대수요전력",
          title: "This Month's Peak Demand",
          peakPower: monthMax.maxDemand,
          unit: "kW",
          time: monthMax.timeValue,
          color: "blue",
          bgColor: "bg-blue-50",
          headerColor: "bg-blue-100 dark:bg-slate-200",
          textColor: "text-blue-700 dark:text-green-900",
        },
        {
          period: "금년최대수요전력",
          title: "This Year's Peak Demand",
          peakPower: yearMax.maxDemand,
          unit: "kW",
          time: yearMax.timeValue,
          color: "blue",
          bgColor: "bg-blue-50",
          headerColor: "bg-blue-100 dark:bg-slate-200",
          textColor: "text-blue-700 dark:text-green-900",
        },
        {
          period: "전일최대수요전력",
          title: "Yesterday's Peak Demand",
          peakPower: yesterdayMax.maxDemand,
          unit: "kW",
          time: yesterdayMax.timeValue,
          color: "gray",
          bgColor: "bg-gray-50",
          headerColor: "bg-gray-100",
          textColor: "text-gray-700",
        },
        {
          period: "전월최대수요전력",
          title: "Last Month's Peak Demand",
          peakPower: prevMonthMax.maxDemand,
          unit: "kW",
          time: prevMonthMax.timeValue,
          color: "gray",
          bgColor: "bg-gray-50",
          headerColor: "bg-gray-100",
          textColor: "text-gray-700",
        },
        {
          period: "전년최대수요전력",
          title: "Last Year's Peak Demand",
          peakPower: prevYearMax.maxDemand,
          unit: "kW",
          time: prevYearMax.timeValue,
          color: "gray",
          bgColor: "bg-gray-50",
          headerColor: "bg-gray-100",
          textColor: "text-gray-700",
        },
      ]
      
      setDemandData(newDemandData)
    } catch (error) {
      console.error("최대수요 데이터 로드 중 오류 발생:", error)
      // 오류 발생 시 기본값으로 설정
      setDemandData([
        {
          period: "금일최대수요전력",
          title: "Today's Peak Demand",
          peakPower: "0",
          unit: "kW",
          time: "0월 0일 00 : 00 : 00",
          color: "blue",
          bgColor: "bg-blue-50",
          headerColor: "bg-blue-100 dark:bg-slate-200",
          textColor: "text-blue-700 dark:text-green-900",
        },
        {
          period: "금월최대수요전력",
          title: "This Month's Peak Demand",
          peakPower: "0",
          unit: "kW",
          time: "0월 0일 00 : 00 : 00",
          color: "blue",
          bgColor: "bg-blue-50",
          headerColor: "bg-blue-100 dark:bg-slate-200",
          textColor: "text-blue-700 dark:text-green-900",
        },
        {
          period: "금년최대수요전력",
          title: "This Year's Peak Demand",
          peakPower: "0",
          unit: "kW",
          time: "0월 0일 00 : 00 : 00",
          color: "blue",
          bgColor: "bg-blue-50",
          headerColor: "bg-blue-100 dark:bg-slate-200",
          textColor: "text-blue-700 dark:text-green-900",
        },
        {
          period: "전일최대수요전력",
          title: "Yesterday's Peak Demand",
          peakPower: "0",
          unit: "kW",
          time: "0월 0일 00 : 00 : 00",
          color: "gray",
          bgColor: "bg-gray-50",
          headerColor: "bg-gray-100",
          textColor: "text-gray-700",
        },
        {
          period: "전월최대수요전력",
          title: "Last Month's Peak Demand",
          peakPower: "0",
          unit: "kW",
          time: "0월 0일 00 : 00 : 00",
          color: "gray",
          bgColor: "bg-gray-50",
          headerColor: "bg-gray-100",
          textColor: "text-gray-700",
        },
        {
          period: "전년최대수요전력",
          title: "Last Year's Peak Demand",
          peakPower: "0",
          unit: "kW",
          time: "0월 0일 00 : 00 : 00",
          color: "gray",
          bgColor: "bg-gray-50",
          headerColor: "bg-gray-100",
          textColor: "text-gray-700",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDemandData()
  }, [])

  // 현재 최고 기록 계산 (금일, 금월, 금년 중 최대값)
  const getCurrentMaxRecord = () => {
    if (!demandData || demandData.length < 3) return "0"
    const todayMax = parseFloat(demandData[0]?.peakPower?.toString().replace(/,/g, '') || 0)
    const monthMax = parseFloat(demandData[1]?.peakPower?.toString().replace(/,/g, '') || 0)
    const yearMax = parseFloat(demandData[2]?.peakPower?.toString().replace(/,/g, '') || 0)
    const maxValue = Math.max(todayMax, monthMax, yearMax)
    return maxValue > 0 ? `${maxValue.toLocaleString()} kW` : "0 kW"
  }

  const peakDemandData = [
    {
      period: "금일최대수요전력",
      title: "Today's Peak Demand",
      peakPower: "73",
      unit: "kW",
      time: "4일 08 : 07 : 40",
      color: "blue",
      bgColor: "bg-blue-50",
      headerColor: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      period: "금월최대수요전력",
      title: "This Month's Peak Demand",
      peakPower: "73",
      unit: "kW",
      time: "2025년 3월 4일",
      color: "blue",
      bgColor: "bg-blue-50",
      headerColor: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      period: "금년최대수요전력",
      title: "This Year's Peak Demand",
      peakPower: "73",
      unit: "kW",
      time: "2025년 3월 4일",
      color: "blue",
      bgColor: "bg-blue-50",
      headerColor: "bg-blue-100",
      textColor: "text-blue-700",
    },
    {
      period: "전일최대수요전력",
      title: "Yesterday's Peak Demand",
      peakPower: "0",
      unit: "kW",
      time: "0일 00 : 00 : 00",
      color: "gray",
      bgColor: "bg-gray-50",
      headerColor: "bg-gray-100",
      textColor: "text-gray-700",
    },
    {
      period: "전월최대수요전력",
      title: "Last Month's Peak Demand",
      peakPower: "0",
      unit: "kW",
      time: "0년 0월 0일",
      color: "gray",
      bgColor: "bg-gray-50",
      headerColor: "bg-gray-100",
      textColor: "text-gray-700",
    },
    {
      period: "전년최대수요전력",
      title: "Last Year's Peak Demand",
      peakPower: "0",
      unit: "kW",
      time: "0년 0월 0일",
      color: "gray",
      bgColor: "bg-gray-50",
      headerColor: "bg-gray-100",
      textColor: "text-gray-700",
    },
  ]

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      {/* 헤더 영역 - 새로고침 버튼 추가 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">최대수요전력</h1>
        <Button
          onClick={loadDemandData}
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="bg-blue-50 dark:bg-green-600 dark:hover:bg-green-700 dark:border-green-700 dark:text-white hover:bg-blue-100 border-blue-200 text-blue-600"
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div className="text-lg font-medium text-gray-600">데이터 로딩 중...</div>
          </div>
        </div>
      ) : (
        <>
          {/* 최대수요 카드들 - 반응형 개선 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {demandData.map((data, index) => (
          <Card
            key={index}
            className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow !p-0"
          >
            {/* 헤더 */}
            <div className={`${data.headerColor} px-4 sm:px-6 py-3`}>
              <h3 className={`text-base font-medium ${data.textColor}`}>{data.period}</h3>
            </div>

            {/* 콘텐츠 */}
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 최대수요전력 - 큰 숫자로 강조 */}
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {data.peakPower}
                  <span className="text-lg text-gray-600 dark:text-white ml-1">{data.unit}</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className={`h-4 w-4 dark:!text-green-400 ${data.textColor}`} />
                  <span className="text-sm text-gray-600 dark:text-white">최대수요전력</span>
                </div>
              </div>

              {/* 구분선 */}
              <div className="border-t border-gray-200"></div>

              {/* 전력발생시간 */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className={`h-4 w-4 dark:!text-green-400 ${data.textColor}`} />
                  <span className="text-sm font-medium text-gray-700 dark:text-white">발생시간</span>
                </div>
                <div className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-700 px-2 sm:px-3 py-2 rounded-lg break-all">
                  {data.time}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 추가 정보 카드 - 반응형 개선 */}
      <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-green-600" />
            최대수요 분석
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-4 sm:p-6 bg-white/70  border-1 shadow-sm from-blue-50 to-blue-100/50 rounded-xl">
              <div className="text-3xl font-bold text-blue-600 mb-2">{getCurrentMaxRecord()}</div>
              <div className="text-sm text-blue-700 font-medium">현재 최고 기록</div>
              <div className="text-xs text-blue-600 mt-1">Today's Peak</div>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white/70 border-1 shadow-sm from-green-50 to-green-100/50 rounded-xl">
              <div className="text-3xl font-bold text-green-600 mb-2">평균</div>
              <div className="text-sm text-green-700 font-medium">월간 평균 수요</div>
              <div className="text-xs text-green-600 mt-1">Monthly Average</div>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white/70 border-1 shadow-sm from-orange-50 to-orange-100/50 rounded-xl sm:col-span-2 lg:col-span-1">
              <div className="text-3xl font-bold text-orange-600 mb-2">예측</div>
              <div className="text-sm text-orange-700 font-medium">다음 피크 예상</div>
              <div className="text-xs text-orange-600 mt-1">Next Peak Forecast</div>
            </div>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}
