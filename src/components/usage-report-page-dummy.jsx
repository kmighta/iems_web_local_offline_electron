import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Calendar, RefreshCw } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { useTheme } from "./theme-provider"
// 엑셀 기능 유지
import { useUsageReportExcel } from '@/hooks/useUsageReportExcel'
// 유틸리티 및 컴포넌트 imports
import useSettingsStore from "@/store/settingsStore"
import { useReportTabStore } from "@/store/reportTabStore"
import { formatTimeToMMss, isMobileDevice } from '@/utils/usageReportUtils'
import { TableColumnBuilderFactory } from '@/utils/usageReportTableBuilders'
import UsageReportDataTable from './usage-report-data-table'
import ApiErrorNotification from './ApiErrorNotification'

// 더미 데이터 생성 함수들
const generateHourlyDummyData = () => {
  const data = []
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, '0')
    data.push({
      time: `${hour}:00`,
      usage: Math.floor(Math.random() * 100) + 50,
      peak: Math.floor(Math.random() * 50) + 30,
      maxLoad: Math.floor(Math.random() * 80) + 40,
      controlCount: Math.floor(Math.random() * 10),
      ctrlCount: Math.floor(Math.random() * 5),
      prevDay: Math.floor(Math.random() * 90) + 40,
      prevMonth: Math.floor(Math.random() * 85) + 35,
      isRealTime: i === 10, // 10시를 실시간으로 설정
    })
  }
  return data
}

const generateQuarterDummyData = () => {
  const data = []
  for (let hour = 0; hour < 24; hour++) {
    for (let quarter = 0; quarter < 4; quarter++) {
      const h = String(hour).padStart(2, '0')
      const m = String(quarter * 15).padStart(2, '0')
      data.push({
        time: `${h}:${m}`,
        usage: Math.floor(Math.random() * 25) + 10,
        peak: Math.floor(Math.random() * 15) + 5,
        maxLoad: Math.floor(Math.random() * 20) + 8,
        controlCount: Math.floor(Math.random() * 3),
        ctrlCount: Math.floor(Math.random() * 2),
        isRealTime: hour === 10 && quarter === 2, // 10:30을 실시간으로 설정
      })
    }
  }
  return data
}

const generateClockDummyData = () => {
  const data = []
  for (let i = 0; i < 24; i++) {
    const hour = String(i).padStart(2, '0')
    data.push({
      time: `${hour}:00`,
      maxLoad: Math.floor(Math.random() * 80) + 40,
      ctrlCount: Math.floor(Math.random() * 5),
      totalCtrlTime: "02:30:45"
    })
  }
  return data
}

// 차트 컴포넌트 메모이제이션
const UsageChart = memo(({ 
  chartData, 
  loading, 
  isLoading, 
  activeTab,
  theme, 
  currentTab, 
  visibleSeries, 
  viewType,
  graphUnit,
  effectiveGraphUnit,
  chartKey,
  getBarColor,
  getBarColor2 
}) => {
  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-green-600"></div>
          <div className="text-gray-500 dark:text-gray-300">차트 데이터를 불러오는 중...</div>
        </div>
      </div>
    );
  }
  
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <div className="text-gray-500">표시할 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="h-auto overflow-x-auto overflow-y-hidden">
      <div className="min-w-[800px] w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            key={`${chartKey}-${effectiveGraphUnit}-${activeTab}`}
            data={chartData} 
            isAnimationActive={false}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12, fill: theme === "dark" ? "#fff" : "#6b7280" }}
              axisLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              tickLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              tickFormatter={(value) => {
                if (viewType === "일별 보기" && typeof value === "string") {
                  if (value.includes(":")) {
                    if (graphUnit === "hour") {
                      return value.split(":")[0].padStart(2, "0");
                    }
                    return value;
                  }
                }
                return value;
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: theme === "dark" ? "#fff" : "#6b7280" }}
              axisLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              tickLine={{ stroke: theme === "dark" ? "#374151" : "#d1d5db" }}
              label={{
                value: currentTab?.unit || '',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: theme === "dark" ? "#fff" : "#6b7280" }
              }}
            />
            <Tooltip
              animationDuration={0}
              animationEasing="ease"
              contentStyle={{
                backgroundColor: theme === "dark" ? "#1f2937" : "#fff",
                border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
                borderRadius: "8px",
                color: theme === "dark" ? "#fff" : "#1f2937"
              }}
              formatter={(value, name, props) => {
                const cleanValue = typeof value === 'number' ? value.toLocaleString() : value;
                return [cleanValue, name];
              }}
              labelFormatter={(label) => {
                const timeLabel = viewType === "일별 보기" ? "시간" : viewType === "월별 보기" ? "일" : "월";
                return `${timeLabel}: ${label}`;
              }}
            />
            <Bar 
              dataKey={currentTab?.dataKey}
              name={currentTab?.name}
              fill={getBarColor(currentTab?.color)} 
              opacity={0.8} 
              hide={!visibleSeries.main}
              isAnimationActive={true}
              shape={(props) => {
                const { 
                  payload,
                  x,
                  y,
                  width,
                  height,
                  fill,
                  ...cleanProps
                } = props;
                
                let barFill = fill;
                let barOpacity = 0.8;
                
                if (payload?.isRealTime) {
                  barFill = getBarColor2(currentTab?.color);
                  barOpacity = 1;
                } else if (payload?.isTempData) {
                  barFill = getBarColor2(currentTab?.color);
                  barOpacity = 0.6;
                }
                
                const rectProps = {
                  x,
                  y,
                  width,
                  height,
                  fill: barFill,
                  opacity: barOpacity
                };
                
                return <rect {...rectProps} />;
              }}
            />
            {visibleSeries.prev && (
              <Line 
                key="prevDay"
                type="monotone" 
                dataKey="prevDay"
                name="전일"
                stroke="#22c55e" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
            )}
            {viewType !== "년별 보기" && visibleSeries.compare && (
              <Line 
                key="prevMonth"
                type="monotone" 
                dataKey="prevMonth"
                name="전월"
                stroke="#f97316" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

UsageChart.displayName = 'UsageChart';

function UsageReportPage() {
  const chartRef = useRef(null)
  const { theme } = useTheme();
  
  // store에서 상태 가져오기
  const {
    activeTab,
    viewType,
    graphUnit,
    selectedDate,
    selectedMonth,
    selectedYear,
    visibleSeries,
    setActiveTab,
    setViewType,
    setGraphUnit,
    setSelectedDate,
    setSelectedMonth,
    setSelectedYear,
    setVisibleSeries,
  } = useReportTabStore();

  // 로컬 상태들 (store에 저장하지 않는 것들)
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(today);
  const [calendarMonth, setCalendarMonth] = useState(today);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [chartKey, setChartKey] = useState(0);
  const [tooltipActive, setTooltipActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 더미 데이터 생성
  const { deviceInfo } = useSettingsStore();
  
  // 더미 스토어 정보
  const selectedStore = {
    storeId: 'dummy-store-id',
    storeName: '더미 매장',
    id: 'dummy-store-id'
  };
  
  const serialNumber = "DUMMY123456";
  
  // 더미 데이터 생성
  const hourlyData = useMemo(() => generateHourlyDummyData(), []);
  const quarterData = useMemo(() => generateQuarterDummyData(), []);
  const clockData = useMemo(() => generateClockDummyData(), []);
  const prevDayData = useMemo(() => generateHourlyDummyData(), []);
  const prevMonthData = useMemo(() => generateHourlyDummyData(), []);
  const prevYearData = useMemo(() => generateHourlyDummyData(), []);
  
  // 색상 계산 함수들
  const getBarColor = useCallback((color) => {
    const colors = {
      teal: "#14b8a6",
      red: "#ef4444",
      orange: "#f97316",
      green: "#22c55e",
    }
    return colors[color] || "#14b8a6"
  }, []);

  const getBarColor2 = useCallback((color) => {
    const colors = {
      teal: "#B3E0DC",
      red: "#F0B7BD",
      orange: "#FFCC80",
      green: "#C8E6C9",
    }
    return colors[color] || "#14b8a6"
  }, []);

  // 날짜 선택 핸들러들
  const handleDateSelect = useCallback((date) => {
    if (date) {
      setCalendarDate(date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      const newDate = `${year}년 ${month}월 ${day}일`
      setSelectedDate(newDate)
      setIsCalendarOpen(false)
    }
  }, []);

  const handleMonthSelect = useCallback((date) => {
    if (date) {
      setCalendarMonth(date)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const newMonth = `${year}년 ${month}월`
      setSelectedMonth(newMonth)
      setIsCalendarOpen(false)
    }
  }, []);

  const handleYearSelect = useCallback((year) => {
    const newYear = `${year}년`
    setSelectedYear(newYear)
    setIsCalendarOpen(false)
  }, []);

  // 레전드 클릭 핸들러
  const handleLegendClick = useCallback((seriesType) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesType]: !prev[seriesType]
    }));
  }, []);

  // 탭 정의
  const tabs = [
    { name: "전력 사용량", color: "teal", unit: "kWh", dataKey: "usage" },
    { name: "전력 피크", color: "red", unit: "kW", dataKey: "peak" },
    { name: "최대부하", color: "orange", unit: "kW", dataKey: "maxLoad" },
    { name: "감축량", color: "green", unit: "kWh", dataKey: "controlCount" },
    { name: "제어현황", color: "blue", unit: "", dataKey: "ctrlCount", isTableOnly: true },
  ]

  const currentTab = tabs.find((tab) => tab.name === activeTab)
  
  // Clock 탭 여부 체크
  const isClockTab = activeTab === "최대부하" || activeTab === "제어현황";
  const effectiveGraphUnit = isClockTab ? "hour" : graphUnit;
  
  // 차트 데이터 (더미)
  const chartData = useMemo(() => {
    if (isClockTab) {
      return clockData;
    }
    
    const mainData = graphUnit === "quarter" ? quarterData : hourlyData;
    
    // 비교 데이터와 병합
    return mainData.map((item, index) => ({
      ...item,
      prevDay: prevDayData[index]?.usage || 0,
      prevMonth: prevMonthData[index]?.usage || 0,
    }));
  }, [isClockTab, clockData, graphUnit, quarterData, hourlyData, prevDayData, prevMonthData]);
  
  // 테이블 데이터 (더미)
  const tableData = useMemo(() => {
    if (isClockTab) {
      return clockData;
    }
    return graphUnit === "quarter" ? quarterData : hourlyData;
  }, [isClockTab, clockData, graphUnit, quarterData, hourlyData]);
  
  // 제어 데이터 (더미)
  const controlData = useMemo(() => ({
    totalCtrlTime: "02:30:45",
    totalControlCount: 15
  }), []);
  
  // 합계 데이터 (더미)
  const dailySummary = useMemo(() => ({
    totalControlCount: 15,
    totalUsage: 1250.5,
    averagePeak: 45.2
  }), []);
  
  const monthlySummary = useMemo(() => ({
    totalControlCount: 450,
    totalUsage: 38250.5,
    averagePeak: 42.8
  }), []);
  
  const yearlySummary = useMemo(() => ({
    totalControlCount: 5400,
    totalUsage: 459000.0,
    averagePeak: 44.1
  }), []);
  
  // 오늘 날짜 체크
  const isTodaySelectedForLive = useMemo(() => {
    if (!selectedDate) return false;
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}년 ${String(today.getMonth() + 1).padStart(2, '0')}월 ${String(today.getDate()).padStart(2, '0')}일`;
    
    return selectedDate === todayStr;
  }, [selectedDate]);
  
  // 선택된 날짜를 Date 객체로 변환
  const getSelectedDateAsDateObject = useCallback(() => {
    if (!selectedDate) return new Date();
    
    const match = selectedDate.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    }
    
    return new Date();
  }, [selectedDate]);

  // 엑셀 다운로드 훅 (유지)
  const excelHook = useUsageReportExcel(
    activeTab,
    viewType,
    deviceInfo,
    selectedStore,
    hourlyData,
    quarterData,
    clockData,
    controlData,
    graphUnit,
    getBarColor,
    currentTab,
    getSelectedDateAsDateObject,
    tableData
  );
  const { loading: excelLoading, handleExcelSave } = excelHook;
  
  // 새로고침 함수 (더미)
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 더미 새로고침 (1초 대기)
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('더미 새로고침 완료');
    } catch (error) {
      console.error('더미 새로고침 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 테이블 헤더 생성
  const tableHeaders = useMemo(() => {
    return TableColumnBuilderFactory.build(viewType, activeTab, graphUnit);
  }, [viewType, activeTab, graphUnit]);

  // 스타일 객체들
  const currentTabColorStyle = useMemo(() => ({
    backgroundColor: getBarColor(currentTab?.color)
  }), [getBarColor, currentTab?.color]);

  const currentTabBorderStyle = useMemo(() => ({
    borderColor: getBarColor2(currentTab?.color)
  }), [getBarColor2, currentTab?.color]);

  // 실시간 위치 정보 (더미)
  const liveHourAndQuarter = useMemo(() => {
    if (!deviceInfo) return null;
    
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentQuarter = Math.floor(now.getMinutes() / 15);
    
    return {
      hh: currentHour,
      quarterKey: `peak${currentQuarter + 1}`,
      rowLabel: `${currentHour} 시`,
      currentQuarterKey: `peak${currentQuarter + 1}`,
      coordinates: {
        row: now.getHours(),
        column: currentQuarter
      }
    };
  }, [deviceInfo]);

  // graphUnit 변경 시 차트 리렌더링
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [graphUnit]);

  // activeTab 변경 시 차트 리렌더링
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [activeTab]);

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      {/* 상단 알림 */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>API 재설계 중:</strong> 현재 더미 데이터로 표시되고 있습니다. 실제 데이터는 API 재설계 완료 후 연결됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 탭 메뉴 */}
      <Card className="border-0 shadow-sm bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl">
        <CardContent>
          <div className="flex flex-col gap-4 sm:gap-6 mb-6">
            {/* 탭 버튼들 */}
            <div className="overflow-x-auto py-2">
              <div className="flex gap-2 min-w-max">
                {tabs.map((tab) => (
                  <Button
                    key={tab.name}
                    variant={activeTab === tab.name ? "default" : "outline"}
                    className={`${activeTab === tab.name ? "bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700" : "bg-white hover:bg-gray-50"} px-2 lg:px-4 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0`}
                    onClick={() => setActiveTab(tab.name)}
                  >
                    {tab.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* 필터와 날짜 선택 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <Select value={viewType} onValueChange={(newViewType) => {
                  setViewType(newViewType);
                }}>
                  <SelectTrigger className="w-full sm:w-32 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="일별 보기">일별 보기</SelectItem>
                    <SelectItem value="월별 보기">월별 보기</SelectItem>
                    <SelectItem value="년별 보기">년별 보기</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex dark:bg-slate-700 items-center gap-2 px-3 py-2 rounded-lg h-10 w-full sm:w-auto justify-start"
                    >
                      <Calendar className="h-4 w-4 text-gray-600 dark:bg-slate-700 dark:text-white flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-white truncate">
                        {viewType === "일별 보기" ? selectedDate : viewType === "월별 보기" ? selectedMonth : selectedYear}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    {viewType === "일별 보기" ? (
                      <CalendarComponent
                        mode="single"
                        selected={calendarDate}
                        onSelect={handleDateSelect}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(23, 59, 59, 999)
                          return date > today
                        }}
                        initialFocus
                      />
                    ) : viewType === "년별 보기" ? (
                      <div className="p-4 space-y-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">년도 선택</div>
                        <div className="flex justify-center">
                          <Select
                            value={selectedYear}
                            onValueChange={handleYearSelect}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => 2023 + i).map((year) => {
                                const currentYear = new Date().getFullYear()
                                return (
                                  <SelectItem key={year} value={`${year}년`} disabled={year > currentYear}>
                                    {year}년
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button size="sm" className="w-full" onClick={() => setIsCalendarOpen(false)}>
                          확인
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 space-y-4">
                        <div className="text-sm font-medium text-gray-900 mb-3">년월 선택</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={selectedYear}
                            onValueChange={(year) => {
                              setSelectedYear(year)
                              const month = selectedMonth.split(" ")[1]
                              const newDate = `${year} ${month}`
                              setSelectedMonth(newDate)
                            }}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }, (_, i) => 2023 + i).map((year) => {
                                const currentYear = new Date().getFullYear()
                                return (
                                  <SelectItem key={year} value={`${year}년`} disabled={year > currentYear}>
                                    {year}년
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                          <Select
                            value={selectedMonth.split(" ")[1]}
                            onValueChange={(month) => {
                              const year = selectedYear
                              const newDate = `${year} ${month}`
                              setSelectedMonth(newDate)
                            }}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                                const currentYear = new Date().getFullYear()
                                const currentMonth = new Date().getMonth() + 1
                                const selectedYearNum = parseInt(selectedYear)
                                return (
                                  <SelectItem 
                                    key={month} 
                                    value={`${String(month).padStart(2, "0")}월`}
                                    disabled={selectedYearNum === currentYear && month > currentMonth}
                                  >
                                    {month}월
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button size="sm" className="w-full" onClick={() => setIsCalendarOpen(false)}>
                          확인
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {viewType === "일별 보기" && !isClockTab && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-slate-400">시간 단위:</span>
                    <Select value={graphUnit} onValueChange={(newUnit) => {
                      setGraphUnit(newUnit);
                      setChartKey(prev => prev + 1);
                    }}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quarter">15분</SelectItem>
                        <SelectItem value="hour">1시간</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
              )}
            </div>
          </div>

          {/* 차트 섹션 */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === "제어현황" 
                  ? (viewType === "일별 보기" ? "일일 제어현황" : viewType === "월별 보기" ? "월별 제어현황" : "년별 제어현황")
                  : viewType === "월별 보기" ? `월별 ${activeTab} (${currentTab?.unit})` : viewType === "년별 보기" ? `년별 ${activeTab} (${currentTab?.unit})` : `일일 ${activeTab} (${currentTab?.unit})`
                }
              </h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <Button 
                  size="sm" 
                  className="bg-blue-600 dark:bg-green-600 dark:text-white hover:bg-blue-700 h-10 w-full sm:w-auto flex items-center gap-2"
                  onClick={handleRefresh}
                  disabled={isLoading || excelLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  {isLoading ? "로딩 중..." : "새로고침"}
                </Button>
                
                <Button 
                  size="sm" 
                  className="bg-purple-500 dark:text-white hover:bg-green-700 h-10 w-full sm:w-auto"
                  onClick={() => handleExcelSave(chartRef)}
                  disabled={isLoading || excelLoading}
                >
                  {excelLoading ? "저장 중..." : "엑셀 저장"}
                </Button>
              </div>
            </div>

            {/* 제어현황 탭일 때는 모든 보기에서 제어횟수 표시 */}
            {activeTab === "제어현황" ? (
              <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <div className="flex justify-center">
                    <Table className="w-auto">
                      <TableBody>
                        <TableRow className="bg-green-50 border-t-2 border-green-200 hover:bg-green-100">
                          <TableCell className="font-bold text-sm text-green-800 border-r border-green-200 text-center px-8">
                            {viewType === "일별 보기" ? "일별 제어횟수" : viewType === "월별 보기" ? "월별 제어횟수" : "년별 제어횟수"}
                          </TableCell>
                          <TableCell className="text-center font-bold text-sm text-green-800 border-r border-green-200 px-8">
                            {viewType === "일별 보기" 
                              ? dailySummary.totalControlCount
                              : viewType === "월별 보기"
                              ? monthlySummary.totalControlCount
                              : yearlySummary.totalControlCount
                            }
                          </TableCell>
                        </TableRow>
                        <TableRow className="bg-blue-50 border-t border-blue-200 hover:bg-blue-100">
                          <TableCell className="font-bold text-sm text-blue-800 border-r border-blue-200 text-center px-8">
                            총 제어시간
                          </TableCell>
                          <TableCell className="text-center font-bold text-sm text-blue-800 border-r border-blue-200 px-8">
                            {controlData.totalCtrlTime}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 범례 */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-white">
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('main')}>
                    <div
                      className={`w-3 h-3 rounded-full border ${visibleSeries.main ? '' : 'opacity-30 border-gray-400'}`}
                      style={currentTabColorStyle}
                    ></div>
                    <span className={visibleSeries.main ? '' : 'opacity-30'}>{activeTab}</span>
                  </div>
                  {/* 실시간 데이터 범례 */}
                  {isTodaySelectedForLive && (activeTab === "전력 피크" || activeTab === "전력 사용량") && (
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border-2 border-dashed`} style={currentTabBorderStyle}></div>
                      <span className="font-medium animate-pulse" style={{ color: getBarColor2(currentTab?.color) }}>실시간 (더미)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('prev')}>
                    <div className={`w-3 h-3 rounded-full dark:text-white bg-green-500 border ${visibleSeries.prev ? '' : 'opacity-30 border-gray-400'}`}></div>
                    <span className={visibleSeries.prev ? '' : 'opacity-30'}>{viewType === "월별 보기" ? "전월" : viewType === "년별 보기" ? "전년" : "전일"}</span>
                  </div>
                  {viewType !== "년별 보기" && (
                    <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleLegendClick('compare')}>
                      <div className={`w-3 h-3 rounded-full dark:text-white bg-orange-500 border ${visibleSeries.compare ? '' : 'opacity-30 border-gray-400'}`}></div>
                      <span className={visibleSeries.compare ? '' : 'opacity-30'}>
                        {viewType === "월별 보기" ? "전년동일" : "전월동일"}
                      </span>
                    </div>
                  )}
                </div>

                {/* 차트 */}
                <div className="h-auto sm:h-96 bg-gray-50 dark:bg-slate-700 rounded-xl p-4 sm:p-6" ref={chartRef}>
                  <UsageChart
                    chartData={chartData}
                    loading={false}
                    isLoading={isLoading}
                    activeTab={activeTab}
                    theme={theme}
                    currentTab={currentTab}
                    visibleSeries={visibleSeries}
                    viewType={viewType}
                    graphUnit={graphUnit}
                    effectiveGraphUnit={effectiveGraphUnit}
                    chartKey={chartKey}
                    getBarColor={getBarColor}
                    getBarColor2={getBarColor2}
                  />
                </div>
              </> 
            )}
          </div>
        </CardContent>
      </Card>

      {/* 데이터 테이블 */}
      <div className="relative">
        <UsageReportDataTable
          loading={isLoading}
          isLoading={isLoading}
          tableHeaders={tableHeaders}
          tableData={tableData}
          viewType={viewType}
          graphUnit={graphUnit}
          activeTab={activeTab}
          deviceInfo={deviceInfo}
          liveHourAndQuarter={liveHourAndQuarter}
          isTodaySelectedForLive={isTodaySelectedForLive}
          quarterData={quarterData}
          dailySummary={dailySummary}
          monthlySummary={monthlySummary}
          yearlySummary={yearlySummary}
          onTimeRowChange={() => {}}
          tempWebSocketData={null}
          peakDataCache={null}
        />
      </div>
      
      {/* API 에러 알림 */}
      <ApiErrorNotification />
    </div>
  )
}

export default UsageReportPage;
