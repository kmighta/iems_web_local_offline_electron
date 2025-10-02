import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Plus, Settings, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
// TODO: Using proper import path for schedule API - 동적 axios 사용
import { 
  getCustomerPowerInfo, 
  updateCustomerPowerInfo, 
  getHolidaySetting, 
  saveHolidaySetting, 
  getSeasonSetting, 
  saveSeasonSetting 
} from "../api/schedule_dynamic"
import { useAuth } from "@/router/router"
import TargetPowerModal from './TargetPowerModal';
import { getTargetPowerSetting } from "../api/schedule_dynamic";
import { useToast } from "../hooks/use-toast";

export default function SchedulePage() {
  // TODO: Updated state variables to match API structure
  const [powerClassification, setPowerClassification] = useState("교육전력(갑)")
  const [voltageType, setVoltageType] = useState("고압A")
  const [selection, setSelection] = useState("선택1")

  // TODO: Loading and editing states
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // 계량기 타입 및 비활성화 조건
  const [meterType, setMeterType] = useState("meter")
  const isHighVoltage = typeof voltageType === "string" && voltageType.startsWith("고압")
  const isMeterTypeDisabled = !isEditing || isHighVoltage

  // TODO: Updated holiday state structure to match API
  const [holidays, setHolidays] = useState(
    Array(12)
      .fill()
      .map(() => ({ month: "0", day: "0", targetPower: "" }))
  )
  const [isAddingHoliday, setIsAddingHoliday] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [targetPower, setTargetPower] = useState("")
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const [deleteTargetDate, setDeleteTargetDate] = useState(null)
  const [isIndividualDeleteConfirmOpen, setIsIndividualDeleteConfirmOpen] = useState(false)

  const [isControlAble, setIsControlAble] = useState(false);
  const { userRole, user, userId } = useAuth();

  // 목표전력설정 모달 관련 상태
  const [isTargetPowerModalOpen, setIsTargetPowerModalOpen] = useState(false);
  const [isTargetPowerLoading, setIsTargetPowerLoading] = useState(false);
  
  // 목표전력설정 관련 상태
  const [targetPowerLevels, setTargetPowerLevels] = useState([]);
  const [seasonalTargetPower, setSeasonalTargetPower] = useState({
    현재계절: '봄',
    전체라벨번경: '',
    hourlySettings: []
  });
  const [publicHolidayLevel, setPublicHolidayLevel] = useState('1');
  
  const { toast } = useToast();

  // 목표전력설정 데이터 로딩 함수
  const loadTargetPowerSettings = async () => {
    try {
      setIsTargetPowerLoading(true);
      
      // 전체 목표전력설정 조회
      const targetPowerData = await getTargetPowerSetting(customerId);
      const data = targetPowerData.data || targetPowerData;
      
      console.log('목표전력설정 API 응답:', targetPowerData);
      console.log('처리된 데이터:', data);
      
      // 라벨 값들 설정 (API 데이터가 없어도 기본 틀 생성)
      const newTargetPowerLevels = Array.from({ length: 10 }, (_, i) => ({
        level: i + 1,
        value: 300000, // 기본값 (300kW = 300000W)
      }));
      
      if (data && data.targetPowerLabels && data.targetPowerLabels.length > 0) {
        data.targetPowerLabels.forEach(item => {
          if (item.labelNo >= 1 && item.labelNo <= 10) {
            // API에서 받은 값이 W 단위라면 그대로, kW 단위라면 1000을 곱해서 W로 변환
            const valueInW = item.targetKw ? (item.targetKw >= 1000 ? item.targetKw : item.targetKw * 1000) : 300000;
            newTargetPowerLevels[item.labelNo - 1].value = valueInW;
          }
        });
      }
      setTargetPowerLevels(newTargetPowerLevels);
      
      // 시간대별 설정 데이터 처리 (API 데이터가 없어도 기본 틀 생성)
      const hourlySettings = Array.from({ length: 24 }, (_, i) => ({ hour: i, value: 1 }));
      
      if (data && data.targetPowerByHours && data.targetPowerByHours.length > 0) {
        // 봄 계절 데이터로 초기화 (기본값)
        data.targetPowerByHours.forEach(item => {
          if (item.season === 'SPRING') {
            hourlySettings[item.hour] = { hour: item.hour, value: item.labelNo || 1 };
          }
        });
      }
      
      setSeasonalTargetPower({
        현재계절: '봄',
        전체라벨번경: '',
        hourlySettings: hourlySettings
      });
      
    } catch (error) {
      console.error('목표전력설정 로딩 실패:', error);
      toast.error("목표전력설정을 불러오는데 실패했습니다.");
      
      // 기본값 설정
      setTargetPowerLevels(Array.from({ length: 10 }, (_, i) => ({
        level: i + 1,
        value: 300000 // 300kW = 300000W
      })));
      setSeasonalTargetPower({
        현재계절: '봄',
        전체라벨번경: '',
        hourlySettings: Array.from({ length: 24 }, (_, i) => ({ hour: i, value: 1 }))
      });
    } finally {
      setIsTargetPowerLoading(false);
    }
  };

  // 목표전력설정 저장 함수
  const handleSaveTargetPower = async (tempSettings) => {
    try {
      console.log('목표전력설정 저장:', tempSettings);
      
      // schedule_dynamic.js의 saveTargetPowerSetting 함수 사용
      // customerId는 하드코딩된 1 사용
      const { saveTargetPowerSetting } = await import('../api/schedule_dynamic');
      await saveTargetPowerSetting(1, tempSettings);
      
      toast.success('목표전력설정이 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('저장 실패:', error);
      toast.error('목표전력설정 저장에 실패했습니다.');
      throw error;
    }
  };

  useEffect(() => {
    // 모니터링 관리자(admin_user)와 한전(han)은 일반 사용자(user)와 동일한 권한 (읽기만)
    if (userRole === "user" || userRole === "admin_user" || userRole === "han") {
      setIsControlAble(false);
    } else {
      // 나머지 역할들(admin, admin_owner, admin_engineer, owner, engineer)은 스케줄 편집 가능
      setIsControlAble(true); 
    }
  }, [userRole]);

  // 목표전력설정 모달이 열릴 때 데이터 로드
  useEffect(() => {
    if (isTargetPowerModalOpen) {
      loadTargetPowerSettings();
    }
  }, [isTargetPowerModalOpen]);

  // TODO: Updated seasons state to array format for API compatibility
  const [seasons, setSeasons] = useState(
    Array(12).fill().map(() => "없음")
  )

  // TODO: Customer ID (should be obtained from authentication context)
  const customerId = 1
  
  // 디버깅용 로그
  console.log('SchedulePage - user:', user);
  console.log('SchedulePage - userId:', userId);
  console.log('SchedulePage - customerId:', customerId);

  // TODO: Data loading function from schedulePage.jsx
  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // 고객전력정보 조회
      const customerPowerInfo = await getCustomerPowerInfo(customerId)
      const powerData = customerPowerInfo.data || customerPowerInfo
      setPowerClassification(powerData.powerType || "교육전력(갑)")
      setVoltageType(powerData.voltageType || "고압A")
      setMeterType(powerData.meterType || "meter")
      setSelection(powerData.selection || "선택1")
      
      // 공휴일설정 조회
      const holidaySetting = await getHolidaySetting(customerId)
      const holidayData = holidaySetting.data || holidaySetting
      
      if (holidayData && holidayData.holidayTargetPowers && holidayData.holidayTargetPowers.length > 0) {
        const formattedHolidays = holidayData.holidayTargetPowers.map(item => {
          const date = new Date(item.targetDate)
          return {
            month: (date.getMonth() + 1).toString(),
            day: date.getDate().toString(),
            targetPower: item.targetKw ? item.targetKw.toString() : ""
          }
        })
        
        // 12개 항목으로 맞추기
        const paddedHolidays = [...formattedHolidays]
        while (paddedHolidays.length < 12) {
          paddedHolidays.push({ month: "0", day: "0", targetPower: "" })
        }
        setHolidays(paddedHolidays)
      }
      
      // 계절설정 조회
      const seasonSetting = await getSeasonSetting(customerId)
      const seasonData = seasonSetting.data || seasonSetting
      
      if (seasonData && Array.isArray(seasonData)) {
        const seasonMap = {
          'SPRING': '봄',
          'SUMMER': '여름',
          'AUTUMN': '가을',
          'WINTER': '겨울'
        }
        
        const formattedSeasons = Array(12).fill().map((_, index) => {
          const monthData = seasonData.find(s => s.month === index + 1)
          if (!monthData || !monthData.season) return '없음'
          return seasonMap[monthData.season] || '없음'
        })
        setSeasons(formattedSeasons)
      }
      
    } catch (error) {
      console.error('데이터 로딩 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // TODO: useEffect to load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const handleSeasonChange = (monthIndex, season) => {
    if (!isEditing) return
    const newSeasons = [...seasons]
    newSeasons[monthIndex] = season
    setSeasons(newSeasons)
  }

  // TODO: Updated holiday functions for array-based state
  const handleAddHoliday = () => {
    if (selectedDate && targetPower) {
      const month = (selectedDate.getMonth() + 1).toString()
      const day = selectedDate.getDate().toString()
      
      // 빈 슬롯 찾기
      const emptyIndex = holidays.findIndex(h => h.month === "0" && h.day === "0")
      
      if (emptyIndex !== -1) {
        const newHolidays = [...holidays]
        newHolidays[emptyIndex] = {
          month,
          day,
          targetPower
        }
        setHolidays(newHolidays)
      } else {
        // 빈 슬롯이 없으면 새로 추가
        setHolidays([...holidays, { month, day, targetPower }])
      }

      // 초기화
      setSelectedDate(null)
      setTargetPower("")
      setIsAddingHoliday(false)
    }
  }

  const handleRemoveHoliday = (index) => {
    setDeleteTargetDate(index)
    setIsIndividualDeleteConfirmOpen(true)
  }

  const handleConfirmIndividualDelete = () => {
    if (deleteTargetDate !== null) {
      const newHolidays = [...holidays]
      newHolidays[deleteTargetDate] = { month: "0", day: "0", targetPower: "" }
      setHolidays(newHolidays)
    }
    setDeleteTargetDate(null)
    setIsIndividualDeleteConfirmOpen(false)
  }

  // TODO: Added holiday helper functions
  const updateHoliday = (index, field, value) => {
    if (!isEditing) return
    const newHolidays = [...holidays]
    newHolidays[index] = { ...newHolidays[index], [field]: value }
    setHolidays(newHolidays)
  }

  const getFormattedDate = (holiday) => {
    if (holiday.month === "0" || holiday.day === "0") {
      return { date: "날짜 선택", power: "" }
    }
    const formattedMonth = holiday.month.toString().padStart(2, '0')
    const formattedDay = holiday.day.toString().padStart(2, '0')
    const formattedPower = holiday.targetPower ? `목표전력 : ${holiday.targetPower}kW` : ""
    return {
      date: `${formattedMonth}월 ${formattedDay}일`,
      power: formattedPower
    }
  }

  // TODO: Updated save function with API integration
  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // 고객전력정보 저장
      await updateCustomerPowerInfo(customerId, {
        powerType: powerClassification,
        voltageType,
        meterType,
        selection
      })
      
      // 공휴일설정 저장
      const holidayTargetPowers = holidays
        .filter(holiday => holiday.month !== "0" && holiday.day !== "0")
        .map(holiday => {
          const year = new Date().getFullYear()
          const month = holiday.month.padStart(2, '0')
          const day = holiday.day.padStart(2, '0')
          return {
            targetDate: `${year}-${month}-${day}`,
            targetKw: holiday.targetPower ? parseFloat(holiday.targetPower) : 0
          }
        })
      
      if (holidayTargetPowers.length > 0) {
        await saveHolidaySetting(customerId, {
          holidayTargetPowers
        })
      }
      
      // 계절설정 저장
      const seasonMap = {
        '봄': 'SPRING',
        '여름': 'SUMMER',
        '가을': 'AUTUMN',
        '겨울': 'WINTER',
        '없음': ''
      }
      
      const seasonSettings = seasons.map((season, index) => ({
        month: index + 1,
        season: (seasonMap[season] !== undefined ? seasonMap[season] : '')
      }))
      
      await saveSeasonSetting(customerId, seasonSettings)
      
      setIsEditing(false)
      console.log("설정이 성공적으로 저장되었습니다.")
      
      // 저장 후 데이터 다시 로딩
      await loadData()
      
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // TODO: Added editing mode functions
  const handleEditMode = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    // 데이터를 다시 로딩하여 원본 상태로 복원
    loadData()
  }

  const seasonOptions = [
    { value: "없음", label: "없음", color: "text-gray-400" },
    { value: "봄", label: "봄", color: "text-green-600" },
    { value: "여름", label: "여름", color: "text-red-600" },
    { value: "가을", label: "가을", color: "text-orange-600" },
    { value: "겨울", label: "겨울", color: "text-blue-600" },
  ]

  const getSeasonColor = (season) => {
    const seasonMap = {
      없음: "text-gray-400",
      봄: "text-green-600",
      여름: "text-red-600",
      가을: "text-orange-600",
      겨울: "text-blue-600",
    }
    return seasonMap[season] || "text-gray-600"
  }

  const handleDeleteAllHolidays = () => {
    setHolidays(Array(12).fill().map(() => ({ month: "0", day: "0", targetPower: "" })))
    setIsDeleteConfirmOpen(false)
  }

  // TODO: Loading state check
  if (isLoading) {
    return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">데이터 로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      {/* TODO: Edit mode controls */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">스케줄 관리</h1>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleEditMode} className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white" disabled={!isControlAble}>
              편집
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleCancel} 
                variant="outline"
                disabled={isSaving}
              >
                취소
              </Button>
              <Button 
                onClick={handleSave} 
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isSaving}
              >
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 고객전력정보 */}
      <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl !p-0 gap-0">
        <CardHeader className="p-4 bg-gray-100 dark:bg-slate-700 rounded-t-2xl gap-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-gray-900">고객전력정보</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:px-6 md:pb-6">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-white w-16 text-end">전력구분 :</span>
              <Select value={powerClassification} onValueChange={setPowerClassification} disabled={!isEditing}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="교육전력(갑)">교육전력(갑)</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="산업전력(을)">산업전력(을)</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="일반전력">일반전력</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-16 text-end">고압/저압 :</span>
              <Select value={voltageType} onValueChange={setVoltageType} disabled={!isEditing}>
                <SelectTrigger className="w-40 lg:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="고압A">고압A</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="고압B">고압B</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="저압">저압</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 계량기 타입 - 고압일 때 비활성화 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-18 text-end">계량기타입:</span>
              <Select value={meterType} onValueChange={setMeterType} disabled={isMeterTypeDisabled}>
                <SelectTrigger className="w-40 lg:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="meter">계량기</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="meta">메타</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-16 text-end">선택 :</span>
              <Select value={selection} onValueChange={setSelection} disabled={!isEditing}>
                <SelectTrigger className="w-40 lg:w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="선택1">선택1</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="선택2">선택2</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="선택3">선택3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 공휴일설정 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl !p-0">
          <CardHeader className="p-4 bg-gray-100 dark:bg-slate-700 rounded-t-2xl gap-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900">공휴일설정</CardTitle>
              <div className="flex gap-2">
                {isEditing && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white flex items-center gap-1"
                    onClick={() => setIsAddingHoliday(true)}
                  >
                    <Plus className="h-3 w-3" />
                    추가
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 md:px-6 md:pb-6">
            <div className="space-y-4">
              {/* TODO: Updated holiday display for array-based state */}
              <div className="min-h-[200px]">
                {holidays.filter(h => h.month !== "0" && h.day !== "0").length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500 bg-gray-50 dark:bg-slate-700 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-white" />
                      <p className="text-sm dark:text-white">공휴일을 추가해주세요.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {holidays
                      .filter(h => h.month !== "0" && h.day !== "0")
                      .map((holiday, displayIndex) => {
                        const actualIndex = holidays.findIndex(h => h === holiday)
                        const { date, power } = getFormattedDate(holiday)
                        return (
                          <div
                            key={actualIndex}
                            className="flex items-center justify-between bg-blue-50 dark:bg-green-50 border border-blue-200 dark:border-green-200 rounded-lg px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-600 w-4">{displayIndex + 1}.</span>
                              <div>
                                <div className="text-sm font-medium text-blue-800 dark:text-green-800">{date}</div>
                                {power && <div className="text-xs text-blue-600 dark:text-green-600">{power}</div>}
                              </div>
                            </div>
                            {isEditing && (
                              <button
                                onClick={() => handleRemoveHoliday(actualIndex)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-green-600 dark:hover:text-green-800 dark:hover:bg-green-100 rounded-full p-1"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              {/* 통계 정보 */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
                <span className="text-sm text-gray-600 dark:text-white">총 공휴일 수:</span>
                <span className="text-sm font-medium text-gray-900">
                  {holidays.filter(h => h.month !== "0" && h.day !== "0").length}일
                </span>
              </div>

              {/* 전체 삭제 버튼 */}
              {isEditing && holidays.filter(h => h.month !== "0" && h.day !== "0").length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  전체 삭제
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TODO: Updated season settings for array-based state */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl !p-0 gap-0">
            <CardHeader className="p-4 bg-gray-100 dark:bg-slate-700 rounded-t-2xl gap-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-gray-900">계절설정</CardTitle>
                <Button
                  onClick={() => setIsTargetPowerModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4 py-2 text-sm"
                  disabled={!isControlAble || userRole === "user" || userRole === "admin_user"}
                >
                  목표전력설정
                </Button>
              </div>
            </CardHeader>
          <CardContent className="p-4 lg:px-6 lg:pb-6">
            <div className="grid grid-cols-2 gap-4">
              {seasons.map((season, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-white w-8">{index + 1}월</span>
                  <Select 
                    value={season} 
                    onValueChange={(value) => handleSeasonChange(index, value)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue>
                        <span className={getSeasonColor(season)}>[{season}]</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800">
                      {seasonOptions.map((option) => (
                        <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" key={option.value} value={option.value}>
                          <span className={option.color}>[{option.label}]</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 공휴일 모달 */}
      {isAddingHoliday && (
        <Dialog open={isAddingHoliday} onOpenChange={setIsAddingHoliday}>
          <DialogContent className="sm:max-w-md w-auto dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle>공휴일 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">날짜 선택</Label>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">목표전력 (kW)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="목표전력을 입력하세요"
                    value={targetPower}
                    onChange={(e) => setTargetPower(e.target.value)}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">kW</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleAddHoliday}
                  disabled={!selectedDate || !targetPower}
                  className="flex-1 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                >
                  추가
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedDate(null)
                    setTargetPower("")
                    setIsAddingHoliday(false)
                  }}
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 전체 삭제 확인 모달 */}
      {isDeleteConfirmOpen && (
        <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle>공휴일 전체 삭제</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">등록된 모든 공휴일({holidays.filter(h => h.month !== "0" && h.day !== "0").length}개)을 삭제하시겠습니까?</p>
              <p className="text-xs text-red-600">이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="destructive" onClick={handleDeleteAllHolidays} className="flex-1">
                  삭제
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1">
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 개별 삭제 확인 모달 */}
      {isIndividualDeleteConfirmOpen && (
        <Dialog open={isIndividualDeleteConfirmOpen} onOpenChange={setIsIndividualDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle>공휴일 삭제</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">선택한 공휴일을 삭제하시겠습니까?</p>
              {deleteTargetDate !== null && holidays[deleteTargetDate] && (
                <div className="bg-blue-50 dark:bg-green-50 border border-blue-200 dark:border-green-200 rounded-lg px-4 py-3">
                  <div className="text-sm font-medium text-blue-800 dark:text-green-800">{getFormattedDate(holidays[deleteTargetDate]).date}</div>
                  <div className="text-xs text-blue-600 dark:text-green-600">{getFormattedDate(holidays[deleteTargetDate]).power}</div>
                </div>
              )}
              <p className="text-xs text-red-600">이 작업은 되돌릴 수 없습니다.</p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="destructive" onClick={handleConfirmIndividualDelete} className="flex-1 dark:bg-red-600 dark:hover:bg-red-700 text-white">
                  삭제
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDeleteTargetDate(null)
                    setIsIndividualDeleteConfirmOpen(false)
                  }}
                  className="flex-1"
                >
                  취소
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 목표전력설정 모달 */}
      <TargetPowerModal
        isOpen={isTargetPowerModalOpen}
        onClose={() => setIsTargetPowerModalOpen(false)}
        targetPowerLevels={targetPowerLevels}
        seasonalTargetPower={seasonalTargetPower}
        publicHolidayLevel={publicHolidayLevel}
        isControlAble={isControlAble}
        isLoading={isTargetPowerLoading}
        onSave={handleSaveTargetPower}
        onCancel={() => setIsTargetPowerModalOpen(false)}
        setTargetPowerLevels={setTargetPowerLevels}
        setSeasonalTargetPower={setSeasonalTargetPower}
      />

      </div>
    )
  }
