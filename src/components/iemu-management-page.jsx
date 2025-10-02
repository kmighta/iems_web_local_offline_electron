import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Cpu,
  Search,
  X,
  Plus,
  Edit,
  Trash2,
  Eye,
  Wifi,
  WifiOff,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
  Bluetooth,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Pagination from "./pagination"
import IemuModal from "./IemuModal"

export default function IemuManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [iemuList, setIemuList] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedIemu, setSelectedIemu] = useState(null)
  const itemsPerPage = 10

  const getVoltageType = (type) => {
    switch (type) {
      case "HIGH":
        return "고압"
      case "LOW":
        return "저압"
      case "LOW_LOW":
        return "저저압"
      default:
        return "미지정"
    }
  }

  const getCommunicationMode = (mode) => {
    switch (mode) {
      case "ETHERNET":
        return "이더넷"
      case "BLUETOOTH":
        return "블루투스"
      // case "RS485":
      //   return "RS485"
      default:
        return "미지정"
    }
  }

  const filteredIemus = iemuList.filter(
      (iemu) =>
          //iemu.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          iemu.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getVoltageType(iemu.voltageType)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getCommunicationMode(iemu.communicationMode)?.toLowerCase().includes(searchTerm.toLowerCase()),// ||
          //iemu.status?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalItems = filteredIemus.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentIemus = filteredIemus.slice(startIndex, endIndex)

  const fetchDevices = async () => {
    const { getDeviceList } = await import("@/api/device")
    var res = await getDeviceList()
    setIemuList(res.map(device => ({
      id: device.id,
      serialNumber: "",
      installDate: device.installationDate.split("T")[0],
      voltageType: device.voltageType,
      communicationMode: device.communicationType,
      lastUpdate: `${device.lastDataUpdated?.split("T")[0]} ${device.lastDataUpdated?.split("T")[1].split(".")[0]}`,
      status: "",
      organizationId: device.organizationId,
      location: device.organizationName || "미지정",
      firmwareVersion: "",
      deviceAddress: device.deviceAddress?.split(",")[0],
      deviceAddressApple: device.deviceAddress?.split(",")[1] || "00000000-0000-0000-0000-000000000000",
      devicePort: device.devicePort,
    })))
  }

  useEffect(() => {
    fetchDevices()
  }, [])

  const getStatusConfig = (status) => {
    switch (status) {
      case "정상":
        return {
          badge: "bg-green-100 text-green-700",
          icon: CheckCircle,
        }
      case "주의":
        return {
          badge: "bg-yellow-100 text-yellow-700",
          icon: AlertTriangle,
        }
      case "오류":
        return {
          badge: "bg-red-100 text-red-700",
          icon: AlertTriangle,
        }
      default:
        return {
          badge: "bg-gray-100 text-gray-700",
          icon: Cpu,
        }
    }
  }

  const getCommunicationIcon = (mode) => {
    switch (mode) {
      case "ETHERNET":
        return Wifi
      case "BLUETOOTH":
        return Bluetooth
      // case "RS485":
      //   return Zap
      default:
        return WifiOff
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleDetailView = (iemu) => {
    setSelectedIemu(iemu)
    setIsDetailModalOpen(true)
  }

  const handleEdit = (iemu) => {
    setSelectedIemu(iemu)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (iemuId) => {
    if (confirm("정말로 이 iEMU를 삭제하시겠습니까?")) {
      try {
        const { deleteDevice } = await import("@/api/device")
        await deleteDevice(iemuId)
        alert("iEMU 정보 삭제에 성공했습니다.")
      } catch (error) {
        alert("iEMU 정보 삭제에 실패했습니다.")
        console.error(error)
      }

      fetchDevices()
    }
  }

  return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
            <Input
                type="text"
                placeholder="설치 사업장, 전압타입, 통신모드로 검색..."
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

          <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4" />새 iEMU 등록
          </Button>
        </div>

        {/* Search Results */}
        {searchTerm && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                "{searchTerm}" 검색 결과: <span className="font-medium">{filteredIemus.length}개</span>
                {filteredIemus.length > itemsPerPage && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                (페이지 {currentPage}/{totalPages})
              </span>
                )}
              </p>
            </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border border-gray-200 dark:border-slate-700 p-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">전체 iEMU</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{filteredIemus.length}</p>
                </div>
                <Cpu className="h-5 w-5 text-gray-400 dark:text-slate-500" />
              </div>
            </CardContent>
          </Card>

          {/* <Card className="border border-gray-200 dark:border-slate-700 p-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">정상</p>
                  <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                    {filteredIemus.filter((iemu) => iemu.status === "정상").length}
                  </p>
                </div>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-slate-700 p-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">주의</p>
                  <p className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                    {filteredIemus.filter((iemu) => iemu.status === "주의").length}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-slate-700 p-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400">오류</p>
                  <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                    {filteredIemus.filter((iemu) => iemu.status === "오류").length}
                  </p>
                </div>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* iEMU Table */}
        <Card className="border border-gray-200 dark:border-slate-700 pb-2 pt-0">
          <CardContent className="p-0">
            {currentIemus.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-12 w-12 text-gray-400 dark:text-slate-500 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">검색 결과가 없습니다</h3>
                  <p className="text-gray-600 dark:text-slate-400 mb-4">"{searchTerm}"와 일치하는 iEMU를 찾을 수 없습니다.</p>
                  <Button variant="outline" onClick={() => setSearchTerm("")} className="dark:text-white">
                    검색 초기화
                  </Button>
                </div>
            ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 dark:border-slate-700">
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[60px] px-4 py-4">순번</TableHead>
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[100px] px-4 py-4">설치 사업장</TableHead>
                          {/* <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-left min-w-[180px] px-4 py-4">시리얼번호</TableHead> */}
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[120px] px-4 py-4">설치일자</TableHead>
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[100px] px-4 py-4">전압타입</TableHead>
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[120px] px-4 py-4">통신모드</TableHead>
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[160px] px-4 py-4">데이터 갱신일자</TableHead>
                          {/* <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[80px] px-4 py-4">상태</TableHead> */}
                          <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[120px] px-4 py-4">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentIemus.map((iemu, index) => {
                          const statusConfig = getStatusConfig(iemu.status)
                          const StatusIcon = statusConfig.icon
                          const CommunicationIcon = getCommunicationIcon(iemu.communicationMode)
                          const globalIndex = totalItems - (startIndex + index)

                          return (
                              <TableRow key={iemu.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <TableCell className="px-4 py-3 text-center">
                                  <span className="font-medium text-gray-900 dark:text-white">{globalIndex}</span>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{iemu.location}</span>
                                </TableCell>
                                {/* <TableCell className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-medium text-gray-900 dark:text-white truncate">{iemu.serialNumber}</div>
                                      <div className="text-sm text-gray-500 dark:text-slate-400 truncate">v{iemu.firmwareVersion}</div>
                                    </div>
                                  </div>
                                </TableCell> */}
                                <TableCell className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Calendar className="h-4 w-4 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate dark:text-white">{iemu.installDate}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center">
                                  <div className="flex justify-center">
                                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-1 inline-flex items-center">
                                      <Zap className="h-3 w-3 mr-1" />
                                      {getVoltageType(iemu.voltageType)}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <CommunicationIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                    <span className="text-sm font-medium truncate dark:text-white">{getCommunicationMode(iemu.communicationMode)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="px-4 py-3 text-center">
                                  <div className="text-sm space-y-1">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">{iemu.lastUpdate.split(" ")[0]}</div>
                                    <div className="text-gray-500 dark:text-slate-400 truncate">{iemu.lastUpdate.split(" ")[1]}</div>
                                  </div>
                                </TableCell>
                                {/* <TableCell className="px-4 py-3 text-center">
                                  <div className="flex justify-center">
                                    <Badge className={`${statusConfig.badge} text-xs px-2 py-1 inline-flex items-center`}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {iemu.status}
                                    </Badge>
                                  </div>
                                </TableCell> */}
                                <TableCell className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 bg-transparent dark:text-white"
                                        onClick={() => handleDetailView(iemu)}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 bg-transparent dark:text-white"
                                        onClick={() => handleEdit(iemu)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400 bg-transparent"
                                        onClick={() => handleDelete(iemu.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                </>
            )}
          </CardContent>
        </Card>

        {/* 디테일 보기 모달 */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-blue-600" />
                iEMU 상세 정보
              </DialogTitle>
            </DialogHeader>
            {selectedIemu && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {/* <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">시리얼번호</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-slate-800 p-2 rounded">
                          {selectedIemu.serialNumber}
                        </div>
                      </div> */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">설치일자</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">{selectedIemu.installDate}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">전압타입</Label>
                        <div className="mt-1">
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{getVoltageType(selectedIemu.voltageType)}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">통신모드</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">{getCommunicationMode(selectedIemu.communicationMode)}</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">상태</Label>
                        <div className="mt-1">
                          <Badge className={getStatusConfig(selectedIemu.status).badge}>{selectedIemu.status}</Badge>
                        </div>
                      </div> */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">설치 사업장</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white">{selectedIemu.location}</div>
                      </div>
                      {/* <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">펌웨어 버전</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono">{selectedIemu.firmwareVersion}</div>
                      </div> */}
                      <div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">{selectedIemu.communicationMode === "ETHERNET" ? "IP 주소" : "MAC 주소"}</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-slate-800 p-2 rounded">
                          {selectedIemu.deviceAddress}
                        </div>
                      </div>
                      {selectedIemu.communicationMode === "ETHERNET" && (<div>
                        <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">포트</Label>
                        <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-slate-800 p-2 rounded">
                          {selectedIemu.devicePort}
                        </div>
                      </div>)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">마지막 갱신일자</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-slate-800 p-2 rounded">
                      {selectedIemu.lastUpdate}
                    </div>
                  </div>
                </div>
            )}
          </DialogContent>
        </Dialog>

        {/* 새 iEMU 등록 모달 */}
        <IemuModal
          open={isAddModalOpen}
          onOpenChange={setIsAddModalOpen}
          mode="add"
          onSubmit={async (form) => {
            if (form.installDate === "" || form.voltageType === "" || form.communicationMode === "" || form.location === "") {
              alert("필수 정보를 입력해주세요.")
              return
            }

            if (form.communicationMode === "ETHERNET" && (form.devicePort === "" || form.deviceAddress === "")) {
              alert("이더넷 통신 모드인 경우 포트와 IP 주소를 입력해주세요.")
              return
            }

            if (form.communicationMode === "BLUETOOTH" && (form.deviceAddress === "")) {
              alert("블루투스 통신 모드인 경우 MAC 주소를 입력해주세요.")
              return
            }

            if (form.communicationMode === "BLUETOOTH" && (/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(form.deviceAddress) === false)) {
              alert("MAC 주소 형식이 올바르지 않습니다.")
              return
            }

            if (form.communicationMode === "BLUETOOTH") {
              form.deviceAddress = `${form.deviceAddress},${form.deviceAddressApple}`
            }


            try {
              const { createDevice } = await import("@/api/device")
              var res = await createDevice({
                "organizationId": form.location,
                "deviceAddress": form.deviceAddress,
                "devicePort": form.devicePort,
                "voltageType": form.voltageType,
                "communicationType": form.communicationMode,
                "installationDate": form.installDate + "T00:00:00",
              })

              if (res) {
                alert("iEMU 등록에 성공했습니다.")
              } else {
                alert("iEMU 등록에 실패했습니다.")
                return
              }
            } catch (error) {
              console.error(error)
              alert("iEMU 등록에 실패했습니다.")
              return
            }

            setIsAddModalOpen(false)
            fetchDevices()
          }}
        />

        {/* 수정 모달 */}
        <IemuModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          mode="edit"
          initialValues={selectedIemu || {}}
          onSubmit={async (form) => {
            if (form.installDate === "" || form.voltageType === "" || form.communicationMode === "" || form.location === "") {
              alert("필수 정보를 입력해주세요.")
              return
            }

            if (form.communicationMode === "ETHERNET" && (form.devicePort === "" || form.deviceAddress === "")) {
              alert("이더넷 통신 모드인 경우 포트와 IP 주소를 입력해주세요.")
              return
            }

            if (form.communicationMode === "BLUETOOTH" && (form.deviceAddress === "")) {
              alert("블루투스 통신 모드인 경우 MAC 주소를 입력해주세요.")
              return
            }

            if (form.communicationMode === "BLUETOOTH" && (/^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$/.test(form.deviceAddress) === false)) {
              alert("MAC 주소 형식이 올바르지 않습니다.")
              return
            } 

            if (form.communicationMode === "BLUETOOTH") {
              form.deviceAddress = `${form.deviceAddress},${form.deviceAddressApple}`
            }


            try {
              const { updateDevice } = await import("@/api/device")
              var res = await updateDevice(selectedIemu.id, {
                "organizationId": form.location,
                "deviceAddress": form.deviceAddress,
                "devicePort": form.devicePort,
                "voltageType": form.voltageType,
                "communicationType": form.communicationMode,
                "installationDate": form.installDate + "T00:00:00",
              })

              if (res) {
                alert("iEMU 정보 수정에 성공했습니다.")
              } else {
                alert("iEMU 정보 수정에 실패했습니다.")
                return
              }
            } catch (error) {
              console.error(error)
              alert("iEMU 정보 수정에 실패했습니다.")
              return
            }

            setIsEditModalOpen(false)
            fetchDevices()
          }}
        />
      </div>
  )
}