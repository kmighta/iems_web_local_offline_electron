import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Router, AlertTriangle, CheckCircle, Clock, WifiOff, Wifi } from "lucide-react"

export default function DevicesPage() {
  const [systemTime, setSystemTime] = useState({
    year: "2025",
    month: "07",
    day: "03",
    hour: "15",
    minute: "59",
    second: "12",
  })

  const [iemuTime, setIemuTime] = useState({
    year: "2025",
    month: "07",
    day: "03",
    hour: "15",
    minute: "59",
    second: "06",
  })

  const handleTimeSync = () => {
    // 시간 동기화 로직
    const now = new Date()
    const timeData = {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, "0"),
      day: String(now.getDate()).padStart(2, "0"),
      hour: String(now.getHours()).padStart(2, "0"),
      minute: String(now.getMinutes()).padStart(2, "0"),
      second: String(now.getSeconds()).padStart(2, "0"),
    }
    setSystemTime(timeData)
    setIemuTime(timeData)
  }

  const handleBeepControl = () => {
    // Beep 제어 로직
    console.log("Beep 제어 실행")
  }

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      {/* 장치 상태 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ACP 정보 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Router className="h-4 w-4 text-blue-600" />
                </div>
                ACP 정보
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">현재운전율</span>
                <span className="text-sm font-bold text-gray-900">0 %</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">현재사용량</span>
                <span className="text-sm font-bold text-gray-900">0 kW</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-700">최량운전율</span>
                <span className="text-sm font-bold text-blue-800">0 %</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-700">최량사용량</span>
                <span className="text-sm font-bold text-blue-800">0 kW</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DMS 정보 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <WifiOff className="h-4 w-4 text-red-600" />
                </div>
                DMS 정보
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <div className="space-y-2">
                <Badge variant="destructive" className="bg-red-500 text-white">
                  통신에러
                </Badge>
                <p className="text-sm text-gray-600">장치와 연결할 수 없습니다</p>
                <p className="text-xs text-gray-500">네트워크 연결을 확인해주세요</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KHAM 정보 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                KHAM 정보
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wifi className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  활성화
                </Badge>
                <p className="text-sm text-gray-600">정상 작동 중</p>
              </div>
            </div>
            <Button size="sm" onClick={handleBeepControl} className="w-full bg-purple-600 hover:bg-purple-700">
              Beep 제어
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 시간 설정 */}
      <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            시스템 시간 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* 시스템시간 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-base font-semibold text-gray-800">시스템 시간</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { key: "year", label: "년도", value: systemTime.year },
                { key: "month", label: "월", value: systemTime.month },
                { key: "day", label: "일", value: systemTime.day },
                { key: "hour", label: "시", value: systemTime.hour },
                { key: "minute", label: "분", value: systemTime.minute },
                { key: "second", label: "초", value: systemTime.second },
              ].map((item) => (
                <div key={item.key} className="text-center">
                  <label className="text-xs text-gray-500 block mb-2 font-medium">{item.label}</label>
                  <Input
                    value={item.value}
                    onChange={(e) => setSystemTime({ ...systemTime, [item.key]: e.target.value })}
                    className="text-center text-sm h-10 font-mono bg-gray-50 border-gray-300 focus:bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200"></div>

          {/* iEMU시간 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-base font-semibold text-gray-800">iEMU 시간</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { key: "year", label: "년도", value: iemuTime.year },
                { key: "month", label: "월", value: iemuTime.month },
                { key: "day", label: "일", value: iemuTime.day },
                { key: "hour", label: "시", value: iemuTime.hour },
                { key: "minute", label: "분", value: iemuTime.minute },
                { key: "second", label: "초", value: iemuTime.second },
              ].map((item) => (
                <div key={item.key} className="text-center">
                  <label className="text-xs text-gray-500 block mb-2 font-medium">{item.label}</label>
                  <Input
                    value={item.value}
                    onChange={(e) => setIemuTime({ ...iemuTime, [item.key]: e.target.value })}
                    className="text-center text-sm h-10 font-mono bg-gray-50 border-gray-300 focus:bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 시간동기화 버튼 */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleTimeSync} className="bg-blue-600 hover:bg-blue-700 px-8 py-2">
              <Clock className="mr-2 h-4 w-4" />
              시간 동기화
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
