import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Building,
  MapPin,
  User,
  Clock,
  Search,
  X,
  Grid3X3,
  List,
  Eye,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MoreVertical, Megaphone,
  Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// 페이지네이션 관련 import와 상태를 추가합니다
import Pagination from "./pagination"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/router/router"
import StoreModal from "./StoreModal"
import useOrganizationStore from "@/store/organizationStore"
import { useLogWebSocket } from "@/hooks/useLogWebSocket"
import useSettingsStore from "@/store/settingsStore"

// 커스텀 깜빡임 애니메이션 스타일
const errorBlinkStyle = `
  @keyframes errorBlink {
    0%, 100% { 
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      background-color: rgba(254, 242, 242, 0.3);
    }
    50% { 
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3);
      background-color: rgba(254, 242, 242, 0.6);
    }
  }
  .error-blink {
    animation: errorBlink 2s ease-in-out infinite;
  }
  @keyframes fastBlink {
    0%, 100% { 
      opacity: 1;
      background-color: rgb(239, 68, 68);
    }
    50% { 
      opacity: 0.7;
      background-color: rgb(220, 38, 38);
    }
  }
  .fast-blink {
    animation: fastBlink 0.8s ease-in-out infinite;
  }
`

export default function StoresListPage() {
  const navigate = useNavigate()
  const [storesData, setStoresData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState("card") // "card" or "list"
  // 서버 사이드 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const itemsPerPage = 10 
  const [isAddStoreModalOpen, setIsAddStoreModalOpen] = useState(false)
  const [isEditStoreModalOpen, setIsEditStoreModalOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailStore, setDetailStore] = useState(null) 
  const [isPlcModalOpen, setIsPlcModalOpen] = useState(false)
  const [selectedStoreForPlc, setSelectedStoreForPlc] = useState(null)
  const [plcAddress, setPlcAddress] = useState("")
  const [plcSerialNumber, setPlcSerialNumber] = useState("")
  const [openMoreMenu, setOpenMoreMenu] = useState(null)
  const { userRole } = useAuth()
  const { setSelectedOrganization } = useOrganizationStore()
  const settingsStore = useSettingsStore()
  
  // 사업장 관리 페이지 진입 시 deviceInfo 캐시 초기화
  useEffect(() => {
    console.log('사업장 관리 페이지 진입 - deviceInfo 캐시 초기화');
    settingsStore.clearDeviceInfoCache();
    settingsStore.clearLoadCutoffStatesCache();
  }, []); // 의존성 배열을 빈 배열로 변경
  
  // 웹소켓 연결 및 PLC 상태 관리
  const { isConnected: websocketConnected } = useLogWebSocket()

  // PLC 메시지 처리 함수
  const handlePlcMessage = (plcData) => {
    const { type, plcSerial } = plcData
    
    console.log('=== iEMU 메시지 처리 시작 ===')
    console.log('받은 iEMU 데이터:', plcData)
    console.log('type:', type, 'iEMU:', plcSerial)
    
    let newStatus = "정상"
    
    // type에 따른 상태 결정
    switch (type) {
      case 2: // plc 연결 복구
        newStatus = "정상"
        console.log(`PLC ${plcSerial} 연결 복구 - 정상으로 변경`)
        break
      case 3: // plc 연결 끊김
        newStatus = "통신오류"
        console.log(`PLC ${plcSerial} 연결 끊김 - 통신오류로 변경`)
        break
      case 8: // 네트워크연결 끊김 또는 전원연결 안됨
        newStatus = "서버오류"
        console.log(`PLC ${plcSerial} 네트워크/전원 오류 - 서버오류로 변경`)
        break
      default:
        newStatus = "정상"
        console.log(`PLC ${plcSerial} 기타 메시지(type: ${type}) - 정상으로 변경`)
        break
    }
    
    console.log('결정된 새 상태:', newStatus)
    
    // plcSerial로 해당 사업장을 찾아서 상태 업데이트
    setStoresData(prevStores => {
      console.log('현재 storesData:', prevStores)
      console.log('찾을 plcSerial:', plcSerial)
      console.log('현재 등록된 plcSerial들:', prevStores.map(s => ({ name: s.name, plcSerial: s.plcSerial })))
      
      let found = false
      const updatedStores = prevStores.map(store => {
        console.log(`사업장 "${store.name}"의 plcSerial: "${store.plcSerial}" vs 찾는 plcSerial: "${plcSerial}"`)
        console.log('매칭 여부:', store.plcSerial === plcSerial)
        
        if (store.plcSerial === plcSerial) {
          found = true
          console.log(`✅ 매칭 성공! 사업장 "${store.name}" (plcSerial: ${plcSerial}) 상태를 ${newStatus}로 변경`)
          return {
            ...store,
            status: newStatus,
            lastPlcUpdate: new Date().toISOString()
          }
        }
        return store
      })
      
      if (!found) {
        console.warn(`❌ plcSerial "${plcSerial}"과 매칭되는 사업장을 찾을 수 없습니다.`)
        console.log('현재 등록된 plcSerial들:', prevStores.map(s => s.plcSerial).filter(Boolean))
      }
      
      console.log('업데이트된 storesData:', updatedStores)
      console.log('=== PLC 메시지 처리 완료 ===')
      
      return updatedStores
    })
  }

  // 웹소켓 메시지 리스너 설정 (admin 권한일 때만)
  useEffect(() => {
    // admin 권한이 아닌 경우 리스너 등록하지 않음
    if (userRole !== 'admin') {
      console.log('admin 권한이 아니므로 PLC 디버그 메시지 리스너 등록하지 않음')
      return
    }

    // 전역 이벤트 리스너로 PLC 메시지 수신
    const handlePlcMessageEvent = (event) => {
      console.log('=== PLC 디버그 메시지 이벤트 수신 ===')
      console.log('받은 이벤트:', event)
      console.log('이벤트 detail:', event.detail)
      
      if (event.detail && event.detail.type === 'plc-debug') {
        console.log('iEMU 디버그 메시지 타입 확인됨')
        const plcData = event.detail.data
        console.log('iEMU 데이터 추출:', plcData)
        handlePlcMessage(plcData)
      } else {
        console.log('iEMU 디버그 메시지 타입이 아님:', event.detail?.type)
      }
    }

    window.addEventListener('plc-debug-message', handlePlcMessageEvent)
    console.log('iEMU 디버그 메시지 리스너 등록 완료')
    
    return () => {
      window.removeEventListener('plc-debug-message', handlePlcMessageEvent)
      console.log('iEMU 디버그 메시지 리스너 해제 완료')
    }
  }, [userRole])

  // useLogWebSocket에서 받은 메시지를 전역 이벤트로 전달하는 함수 (admin 권한일 때만)
  useEffect(() => {
    // admin 권한이 아닌 경우 리스너 등록하지 않음
    if (userRole !== 'admin') {
      console.log('admin 권한이 아니므로 웹소켓 메시지 리스너 등록하지 않음')
      return
    }

    const handleWebSocketMessage = (event) => {
      console.log('=== 웹소켓 메시지 수신 ===')
      console.log('받은 이벤트:', event)
      console.log('이벤트 detail:', event.detail)
      
      if (event.detail && event.detail.destination === '/topic/plc-debug-admin') {
        console.log('iEMU 디버그 메시지 감지됨')
        try {
          const plcData = JSON.parse(event.detail.body)
          console.log('파싱된 iEMU 데이터:', plcData)
          
          // 전역 이벤트로 PLC 메시지 전달
          window.dispatchEvent(new CustomEvent('plc-debug-message', {
            detail: {
              type: 'plc-debug',
              data: plcData
            }
          }))
          console.log('PLC 디버그 메시지를 전역 이벤트로 전달 완료')
        } catch (error) {
          console.error('PLC 메시지 파싱 오류:', error)
          console.log('Raw message body:', event.detail.body)
        }
      } else {
        console.log('PLC 디버그 메시지가 아님:', event.detail?.destination)
      }
    }

    window.addEventListener('websocket-message', handleWebSocketMessage)
    console.log('웹소켓 메시지 리스너 등록 완료')
    
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage)
      console.log('웹소켓 메시지 리스너 해제 완료')
    }
  }, [userRole])

  // 서버 사이드 페이지네이션에서는 필터링을 서버에서 처리
  // 클라이언트 사이드 검색은 제거하고 서버 사이드 검색으로 대체할 예정
  const filteredStores = storesData
  
  // 서버에서 이미 페이지네이션된 데이터를 받으므로 추가 슬라이싱 불필요
  const currentStores = storesData
  const totalItems = totalElements
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + currentStores.length

  // 검색 기능은 서버 사이드 검색으로 대체 예정

  useEffect(() => {
    console.log('currentStores:', currentStores)
  }, [currentStores])

  const fetchStores = async (page = currentPage, size = itemsPerPage) => {
    setIsLoading(true)
    try {
      const { getOrganizationListPaginated } = await import("@/api/organization")
      
      // 서버 사이드 페이지네이션 API 사용 (page는 0부터 시작)
      const paginatedResponse = await getOrganizationListPaginated(page - 1, size, "createdAt,desc")
      const res = paginatedResponse.content || []
      
      console.log('Paginated Organization API Response:', paginatedResponse)
      console.log('첫 번째 사업장 구조:', res[0])

      // 페이지네이션 정보 업데이트
      setTotalElements(paginatedResponse.totalElements || 0)
      setTotalPages(paginatedResponse.totalPages || 0)

      // deviceLog의 type 값으로 초기 상태 판별
      const storesWithInitialStatus = res.map(store => {
        let initialStatus = null
        
        // deviceLog가 있는 경우 초기 상태 결정
        if (store.deviceLog) {
          console.log(`사업장 ${store.name}의 deviceLog:`, store.deviceLog)
          
          // deviceLog가 배열인지 객체인지 확인
          const latestLog = Array.isArray(store.deviceLog) 
            ? store.deviceLog[store.deviceLog.length - 1] // 배열인 경우 마지막 요소
            : store.deviceLog // 객체인 경우 그대로 사용
          
          if (latestLog && latestLog.plcSerial === store.plcSerial) {
            switch (latestLog.type) {
              case 2: // plc 연결 복구
                initialStatus = "정상"
                console.log(`사업장 ${store.name} (plcSerial: ${store.plcSerial}) 초기 상태 - 정상`)
                break
              case 3: // plc 연결 끊김
                initialStatus = "통신오류"
                console.log(`사업장 ${store.name} (plcSerial: ${store.plcSerial}) 초기 상태 - 통신오류`)
                break
              case 8: // 네트워크연결 끊김 또는 전원연결 안됨
                initialStatus = "서버오류"
                console.log(`사업장 ${store.name} (plcSerial: ${store.plcSerial}) 초기 상태 - 서버오류`)
                break
              default:
                initialStatus = "정상"
                console.log(`사업장 ${store.name} (plcSerial: ${store.plcSerial}) 초기 상태 - 기본 정상`)
                break
            }
          } else {
            console.log(`사업장 ${store.name}의 plcSerial (${store.plcSerial})과 deviceLog의 plcSerial (${latestLog?.plcSerial}) 불일치 또는 deviceLog 없음`)
          }
        } else {
          console.log(`사업장 ${store.name}에 deviceLog가 없음`)
        }
        
        return {
          ...store,
          status: initialStatus // 초기 상태 설정
        }
      })

      // 실제 API 응답 데이터만 사용
      setStoresData(storesWithInitialStatus)
    } catch (error) {
      console.error("Failed to fetch stores:", error)
      setStoresData([])
      setTotalElements(0)
      setTotalPages(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStores()
  }, [])

  // 페이지 변경 핸들러 - 서버에서 새 데이터를 가져옴
  const handlePageChange = (page) => {
    setCurrentPage(page)
    fetchStores(page, itemsPerPage)
  }

  // 페이지가 변경될 때마다 데이터를 새로 가져옴
  useEffect(() => {
    if (currentPage > 1) { // 초기 로드 시에는 fetchStores()가 이미 호출되므로 제외
      fetchStores(currentPage, itemsPerPage)
    }
  }, []) // currentPage 의존성 제거 (handlePageChange에서 직접 호출)

  // 사업장 모니터링으로 이동하는 함수
  const handleStoreMonitoring = (store) => {
    console.log('보고서 버튼 클릭 - 선택된 사업장:', store)
    console.log('사업장 ipAddress:', store.ipAddress)
    // 선택된 사업장 정보를 전역 상태에 저장
    setSelectedOrganization(store)
    navigate(`/admin/stores/${store.id}/monitoring`, { state: { store } })
  }

  const handleDelete = async (storeId) => {
    if (confirm("정말로 이 사업장을 삭제하시겠습니까?")) {
      try {
        const { deleteOrganization } = await import("@/api/organization")
        await deleteOrganization(storeId)
        alert("사업장 삭제에 성공했습니다.")
      } catch (error) {
        alert("사업장 삭제에 실패했습니다.")
        console.error(error)
      }

      fetchStores()
    }
  }

  const handleAddPlc = async (store) => {
    setSelectedStoreForPlc(store)
    setPlcAddress("")
    setPlcSerialNumber("")
    setIsPlcModalOpen(true)
  }

  const handlePlcSubmit = async () => {
    if (!plcAddress.trim()) {
      // alert("iEMU 주소를 입력해주세요.")
      // return
      if (!confirm("iEMU 주소를 입력하지 않았습니다. 계속 진행하시겠습니까?\n주소를 입력하지 않으면 소켓모드로 동작합니다")) {
        return
      }
    }

    if (!plcSerialNumber.trim()) {
      alert("Serial-Number를 입력해주세요.")
      return
    }

    try {
      // 먼저 PLC 장치 등록 API 호출
      if (plcAddress) {
        const { registerPlcDevice } = await import("@/api/organization")
        try {
          await registerPlcDevice(plcAddress.trim(), plcSerialNumber.trim())
          console.log('iEMU 등록 성공')
        } catch (plcError) {
          alert(`iEMU 등록 실패: ${plcError.message}`)
          return
        }
      }

      // PLC 등록이 성공하면 기존 PLC IP 등록 로직 실행
      const { addPlcToOrganization } = await import("@/api/organization")
      const response = await addPlcToOrganization(selectedStoreForPlc.id, plcAddress.trim(), plcSerialNumber.trim())

      // 응답 데이터로 해당 사업장 정보 업데이트
      setStoresData(prevStores =>
        prevStores.map(store =>
          store.id === selectedStoreForPlc.id
            ? { ...store, ...response }
            : store
        )
      )
      
      alert("iEMU 추가에 성공했습니다.")
      setIsPlcModalOpen(false)
      setSelectedStoreForPlc(null)
      setPlcAddress("")
      setPlcSerialNumber("")
    } catch (error) {
      alert("iEMU 추가에 실패했습니다.")
      console.error(error)
    }
  }

  const getStatusConfig = (status) => {
    switch (status) {
      case "정상":
        return {
          badge: "bg-green-600 text-white",
          dot: "bg-green-500",
          icon: CheckCircle,
        }
      case "통신오류":
        return {
          badge: "bg-red-500 text-white",
          dot: "bg-red-500",
          icon: AlertTriangle,
        }
      case "서버오류":
        return {
          badge: "bg-orange-500 text-white",
          dot: "bg-orange-500",
          icon: AlertTriangle,
        }
      case "연결대기":
        return {
          badge: "bg-blue-600 text-white",
          dot: "bg-blue-500",
          icon: Activity,
        }
      case "PLC 연결필요":
        return {
          badge: "bg-gray-100 text-gray-700",
          dot: "bg-gray-500",
          icon: Activity,
        }
      case "로컬차단":
        return {
          badge: "bg-gray-100 text-gray-700",
          dot: "bg-gray-500",
          icon: AlertTriangle,
        }
      default:
        return {
          badge: "bg-gray-100 text-gray-700",
          dot: "bg-gray-500",
          icon: Activity,
        }
    }
  }

  // renderCardView 함수에서 filteredStores 대신 currentStores를 사용하도록 수정합니다
  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {isLoading ? (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">데이터를 불러오는 중...</h3>
          <p className="text-gray-600 dark:text-slate-400">잠시만 기다려주세요.</p>
        </div>
      ) : currentStores.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-gray-400 dark:text-slate-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-600 dark:text-slate-400 mb-4">"{searchTerm}"와 일치하는 사업장을 찾을 수 없습니다.</p>
          <Button variant="outline" onClick={() => setSearchTerm("")} className="dark:text-white">
            검색 초기화
          </Button>
        </div>
      ) : (
        currentStores.map((store) => {
          // 상태 결정: active가 true이고 connect가 true면 정상, connect가 false면 통신오류, active가 false면 연결대기
          let status = "연결대기"
          if (store?.active === true) {
            if (store?.connect === true) {
              status = "정상"
            } else if (store?.connect === false) {
              status = "통신오류"
            }
          }

          const statusConfig = getStatusConfig(status)
          const StatusIcon = statusConfig.icon

          return (
            <Card
              key={store.id}
              className={`border-0 shadow-sm bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-200 !py-5 ${
                status === "통신오류" ? "ring-2 ring-red-200 dark:ring-red-800 bg-red-50/30 dark:bg-red-900/30" :
                status === "서버오류" ? "ring-2 ring-orange-200 dark:ring-orange-800 bg-orange-50/30 dark:bg-orange-900/30" :
                status === "로컬차단" ? "ring-2 ring-gray-200 dark:ring-slate-700 bg-gray-300/50 dark:bg-slate-400/50" :
                "ring-1 ring-gray-200 dark:ring-slate-700"
              }`}
            >
              {/* 기존 카드 내용 유지 */}
              <CardHeader className="p-0 px-3 md:!pr-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 h-[50px]">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <CardTitle
                        className="text-base font-medium text-gray-900 dark:text-white cursor-pointer"
                        onClick={() => { setDetailStore(store); setIsDetailModalOpen(true) }}
                      >
                        {store.name}
                      </CardTitle>
                      {/* <p className="text-sm text-gray-500 dark:text-slate-400">{store.id}</p> */}
                    </div>
                  </div>
                  <DropdownMenu open={openMoreMenu === store.id} onOpenChange={(open) => setOpenMoreMenu(open ? store.id : null)}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-0 focus:shadow-none focus:outline-none focus-visible:ring-0 focus-visible:shadow-none focus-visible:outline-none"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem
                        onClick={() => { setSelectedStore(store); setIsEditStoreModalOpen(true) }}
                        className="cursor-pointer"
                      >
                        <Edit className="h-3 w-3 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(store.id)}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* 상태 아이콘과 배지 */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${statusConfig.dot === "bg-green-500" ? "text-green-500" : statusConfig.dot === "bg-red-500" ? "text-red-500" : "text-blue-500"}`} />
                    <Badge className={`text-xs px-2 py-1 ${statusConfig.badge} ${status === "통신오류" ? "fast-blink" : ""}`}>
                      {status}
                    </Badge>
                    {/* 최근 오류 표시: error가 true면 최근오류 배지 노출 */}
                    {store?.error === true && (
                      <Badge className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                        이슈발생
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{store.address}</span>
                </div>

                {/* Power Metrics */}
                {/* <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{store.currentPower}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">사용량</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{store.efficiency}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">효율</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{store.devices}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">장치</div>
                  </div>
                </div> */}

                {/* Manager Info */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-200">
                    <User className="h-4 w-4" />
                    <span>{store.ownerUserName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-slate-500">
                    {/* <span className="text-xs">갱신일자: </span> */}
                    {/* <Clock className="h-3 w-3" /> */}
                    {/* <span className="text-xs">갱신일자: {store?.devices[0]?.lastDataUpdated?.split("T")[0] || "데이터 없음"}</span> */}
                  </div>
                </div>

                {/* <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-200">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">데이터 갱신일</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-slate-300">
                    <span className="text-xs">{store?.devices[0]?.lastDataUpdated?.split("T")[0] || "데이터 없음"}</span>
                  </div>
                </div> */}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-200">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">생성일</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-slate-300">
                    <span className="text-xs">{store?.createdAt?.split("T")[0] || "데이터 없음"}</span>
                  </div>
                </div>

                {/* Action Button */}
                {store.active === true ? (
                  <Button
                    size="sm"
                    // className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStoreMonitoring(store)}
                  >
                    모니터링
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    // className="w-full bg-green-600 hover:bg-green-700 text-white"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleAddPlc(store)}
                  >
                    iEMU 추가
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )

  // renderListView 함수에서 filteredStores 대신 currentStores를 사용하고 페이지네이션을 추가합니다
  const renderListView = () => (<></>) //(
  //   <Card className="border border-gray-200 p-0">
  //     <CardContent className="p-0">
  //       <div className="overflow-x-auto">
  //         {currentStores.length === 0 ? (
  //           <div className="flex flex-col items-center justify-center py-16 text-center">
  //             <Search className="h-12 w-12 text-gray-400 mb-4" />
  //             <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
  //             <p className="text-gray-600 mb-4">"{searchTerm}"와 일치하는 사업장을 찾을 수 없습니다.</p>
  //             <Button variant="outline" onClick={() => setSearchTerm("")}>
  //               검색 초기화
  //             </Button>
  //           </div>
  //         ) : (
  //           <div>
  //             <Table>
  //               <TableHeader>
  //                 <TableRow className="border-b border-gray-200 bg-gray-50">
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">사업장</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">상태</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">사용량</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">효율</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">장치</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">관리자</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">업데이트</TableHead>
  //                   <TableHead className="text-center text-sm font-semibold text-gray-700 py-4">작업</TableHead>
  //                 </TableRow>
  //               </TableHeader>

  //               <TableBody>
  //                 {currentStores.map((store) => {
  //                   const statusConfig = getStatusConfig(store.status)
  //                   const StatusIcon = statusConfig.icon

  //                   return (
  //                       <TableRow
  //                           key={store.id}
  //                           className="border-b border-gray-100 hover:bg-gray-50"
  //                       >
  //                         <TableCell className="text-left p-5">
  //                           {/* 상점명 및 주소 */}
  //                           <div className="flex items-center gap-3">
  //                             <div className="relative">
  //                               <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
  //                                 <Building className="h-4 w-4 text-blue-600" />
  //                               </div>
  //                               <div
  //                                   className={`absolute -bottom-1 -right-1 w-2 h-2 ${statusConfig.dot} rounded-full`}
  //                               ></div>
  //                             </div>
  //                             <div>
  //                               <div className="font-medium text-gray-900">{store.name}</div>
  //                               <div className="text-xs text-gray-500 truncate max-w-[200px]">{store.address}</div>
  //                             </div>
  //                           </div>
  //                         </TableCell>

  //                         <TableCell className="text-center py-3 px-2">
  //                           <Badge className={`${statusConfig.badge} text-xs px-2 py-1`}>
  //                             <StatusIcon className="h-3 w-3 mr-1" />
  //                             {store.status}
  //                           </Badge>
  //                         </TableCell>

  //                         <TableCell className="text-center text-sm font-medium text-gray-800 py-3 px-2">
  //                           {store.currentPower}
  //                         </TableCell>

  //                         <TableCell className="text-center text-sm font-medium text-gray-800 py-3 px-2">
  //                           {store.efficiency}
  //                         </TableCell>

  //                         <TableCell className="text-center text-sm font-medium text-gray-800 py-3 px-2">
  //                           {store.devices}개
  //                         </TableCell>

  //                         <TableCell className="text-center py-3 px-2">
  //                           <div className="text-sm">
  //                             <div className="font-medium text-gray-900">{store.manager}</div>
  //                             <div className="text-gray-500 text-xs">{store.phone}</div>
  //                           </div>
  //                         </TableCell>

  //                         <TableCell className="text-center text-sm text-gray-600 py-3 px-2">
  //                           {store.lastUpdate}
  //                         </TableCell>

  //                         <TableCell className="text-center py-3 px-2">
  //                           <Button
  //                               size="sm"
  //                               className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 h-auto mr-2"
  //                               onClick={() => { setDetailStore(store); setIsDetailModalOpen(true) }}
  //                           >
  //                             <Eye className="h-3 w-3 mr-1" />
  //                             모니터링
  //                           </Button>
  //                           <Button
  //                               size="sm"
  //                               className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-3 py-1.5 h-auto"
  //                               onClick={() => { setSelectedStore(store); setIsEditStoreModalOpen(true) }}
  //                           >
  //                             수정
  //                           </Button>
  //                         </TableCell>
  //                       </TableRow>
  //                   )
  //                 })}
  //               </TableBody>
  //             </Table>


  //             {/* 페이지네이션 추가 */}
  //             <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
  //           </div>
  //         )}
  //       </div>
  //     </CardContent>
  //   </Card>
  // )

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      <div className="md:flex items-center space-x-3 mb-4 hidden">
        <Building className="h-6 w-6 text-blue-600 dark:text-green-600" />
        <p className="font-bold text-[28px] text-gray-900 dark:text-white">사업장관리</p>
      </div>
      {/* 커스텀 CSS 애니메이션 스타일 추가 */}
      <style dangerouslySetInnerHTML={{ __html: errorBlinkStyle }} />

      {/* 웹소켓 연결 상태 표시 */}
      {/*<div className="flex items-center justify-between mb-4">*/}
      {/*  <div className="flex items-center gap-2">*/}
      {/*    <div className={`w-2 h-2 rounded-full ${websocketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>*/}
      {/*    <span className="text-sm text-gray-600">*/}
      {/*      실시간 연결: {websocketConnected ? '연결됨' : '연결 끊김'}*/}
      {/*    </span>*/}
      {/*  </div>*/}
      {/*</div>*/}

      {/* Search Bar - 일시적으로 비활성화 (서버 사이드 검색 구현 예정) */}
      {/*
      <div className="flex flex-row sm:flex-row gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="사업장명, 주소, 관리자로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 h-12 sm:h-10 border-gray-300 dark:border-slate-700 focus:border-gray-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-gray-400 dark:focus:ring-slate-500 text-base sm:text-sm bg-white dark:bg-slate-900"
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
      </div>
      */}

      <div className="flex md:hidden mb-4">
        {(userRole === "admin" || userRole === "owner") && (
            <Button
                // className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white flex items-center gap-2 w-full"
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full"
                onClick={() => setIsAddStoreModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="sm:inline">사업장 추가</span>
            </Button>
        )}
      </div>

      {/* Summary Cards - 반응형 개선 */}
      <div className="flex flex-row justify-center md:justify-between gap-3 sm:gap-4 mb-4">
        <div className="flex flex-row justify-between gap-4 md:w-auto w-full">
        <Card className="border border-gray-200 dark:border-slate-600 dark:bg-slate-800 !p-0 rounded-md flex-1 md:flex-none">
          <CardContent className="px-4 py-2 min-w-auto md:min-w-[140px] md:w-auto w-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-white">전체</p>
              <div className="flex flex-row justify-center items-center gap-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{totalElements}</p>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">개</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-200 dark:border-red-800 !p-0 rounded-md bg-red-50/30 dark:bg-red-900/30 flex-1 md:flex-none">
          <CardContent className="px-4 py-2 min-w-auto md:min-w-[140px] md:w-auto w-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">오류</p>
              <div className="flex flex-row justify-center items-center gap-1">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {currentStores.filter(store => (store?.connect === false)).length}
                </p>
                <span className="text-sm font-semibold text-red-700 dark:text-red-300">개</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
        <div className="hidden md:flex">
          {(userRole === "admin" || userRole === "owner") && (
              <Button
                  // className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white flex items-center gap-2"
                  className="bg-blue-600 hover:bg-blue-700  text-white flex items-center gap-2"
                  onClick={() => setIsAddStoreModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="sm:inline">사업장 추가</span>
              </Button>
          )}
        </div>
      </div>
      {/* Content based on view mode */}
      {viewMode === "card" ? renderCardView() : renderListView()}
      
      {/* 페이지네이션 */}
      {!isLoading && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ≪
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            
            <div className="flex items-center gap-1">
              {(() => {
                const maxVisible = 5;
                const halfVisible = Math.floor(maxVisible / 2);
                let startPage = Math.max(1, currentPage - halfVisible);
                let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                
                // 끝 페이지가 최대치에 도달했다면 시작 페이지를 조정
                if (endPage === totalPages) {
                  startPage = Math.max(1, endPage - maxVisible + 1);
                }
                
                const pages = [];
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(i);
                }
                
                return pages.map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 border rounded-md min-w-[2.5rem] ${
                      pageNum === currentPage
                        ? 'bg-blue-600 dark:bg-green-600 text-white border-blue-600 dark:border-green-600'
                        : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                ));
              })()}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ≫
            </button>
          </div>
        </div>
      )}
      {/* 새 사업장 추가 모달 */}
      <StoreModal
        open={isAddStoreModalOpen}
        onOpenChange={setIsAddStoreModalOpen}
        fetchStores={fetchStores}
        mode="add"
        currentUserRole={userRole}
        onSubmit={async (form) => {
          // 등록 로직
          const { createOrganization, createOrganizationByOwner } = await import("@/api/organization")
          const { updateCustomerPowerInfo } = await import("@/api/schedule_dynamic")
          try {
            let createdOrganization = null
            if (userRole === "owner") {
              // OWNER 권한일 때는 owner_org_id 파라미터와 함께 /owner 엔드포인트 사용
              const currentUserOrganizationId = JSON.parse(localStorage.getItem('auth'))?.userData?.organizationId;
              createdOrganization = await createOrganizationByOwner(form, currentUserOrganizationId)
            } else {
              createdOrganization = await createOrganization(form)
            }

            // 전력구분/고압저압/선택 정보 저장 (시간/휴일 설정 API 스타일)
            try {
              await updateCustomerPowerInfo(createdOrganization.id, {
                powerCategory: form.powerCategory || null,
                pressureType: form.pressureType || null,
                optionSelect: form.optionSelect || null,
                meterType: form.meterType || null,
              })
            } catch (e) {
              console.error("고객전력정보 저장 실패", e)
            }
            alert("사업장 추가에 성공했습니다.")
          } catch (error) {
            alert("사업장 추가에 실패했습니다.")
            return
          }
          setIsAddStoreModalOpen(false)
          fetchStores()
        }}
      />
      {/* 사업장 정보 수정 모달 */}
      <StoreModal
        open={isEditStoreModalOpen}
        onOpenChange={setIsEditStoreModalOpen}
        fetchStores={fetchStores}
        mode="edit"
        currentUserRole={userRole}
        initialValues={selectedStore || {}}
        onSubmit={async (form) => {
          // 수정 로직
          const { updateOrganization, updatePlcAddress } = await import("@/api/organization")
          const { updateCustomerPowerInfo } = await import("@/api/schedule_dynamic")
          try {
            await updateOrganization(selectedStore.id, form)
            // 전력구분/고압저압/선택 정보 저장
            try {
              const customerId = 1
              await updateCustomerPowerInfo(customerId, {
                powerType: form.powerCategory || null,
                voltageType: form.pressureType || null,
                selection: form.optionSelect || null,
                meterType: form.meterType || null,
              })
            } catch (e) {
              console.error("고객전력정보 저장 실패", e)
            }
            
            // PLC 주소 또는 Serial-Number가 변경된 경우 별도 API 호출
            if (form.plcAddress && form.plcAddress !== selectedStore.plcAddress ||
                form.plcSerial && form.plcSerial !== selectedStore.plcSerial) {
              } {
              await updatePlcAddress(selectedStore.id, form.plcAddress, form.plcSerial)
            }
            
            alert("사업장 정보가 수정되었습니다.")
          } catch (error) {
            alert("사업장 정보 수정에 실패했습니다.")
            return
          }
          setIsEditStoreModalOpen(false)
          setSelectedStore(null)
          fetchStores()
        }}
      />
      {/* 상세보기 모달 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600 dark:text-green-600" />
              사업장 상세 정보
            </DialogTitle>
          </DialogHeader>
          {detailStore && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">사업장명</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">연락처</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.tel}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">주소</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.address}</div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">관리자</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.ownerUserName}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">사업자 등록번호</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.registrationNumber}</div>
                  </div>
                  <div> 
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">상세 주소</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.detailAddress}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">사업장 설명</Label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailStore.description}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PLC 추가 모달 */}
      <Dialog open={isPlcModalOpen} onOpenChange={setIsPlcModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-green-600" />
              iEMU 추가
            </DialogTitle>
          </DialogHeader>
          {selectedStoreForPlc && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">사업장</Label>
                <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">{selectedStoreForPlc.name}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plc-address" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  iEMU 주소
                </Label>
                <Input
                  id="plc-address"
                  type="text"
                  placeholder="예: 192.168.1.100:502"
                  value={plcAddress}
                  onChange={(e) => setPlcAddress(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  iEMU의 IP 주소와 포트번호를 입력해주세요.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plc-serial" className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Serial-Number
                </Label>
                <Input
                  id="plc-serial"
                  type="text"
                  placeholder="PLC Serial-Number를 입력하세요"
                  value={plcSerialNumber}
                  onChange={(e) => setPlcSerialNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  iEMU의 Serial-Number를 입력해주세요.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPlcModalOpen(false)
                    setSelectedStoreForPlc(null)
                    setPlcAddress("")
                    setPlcSerialNumber("")
                  }}
                  className="dark:text-white"
                >
                  취소
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handlePlcSubmit}
                >
                  iEMU 추가
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
