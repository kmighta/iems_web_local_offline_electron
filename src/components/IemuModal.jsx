import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import { getOrganizationList } from "@/api/organization"

const VOLTAGE_TYPES = [["HIGH", "고압"], ["LOW", "저압"], ["LOW_LOW", "저저압"]]
const COMM_MODES = [["ETHERNET", "이더넷"], ["BLUETOOTH", "블루투스"]/*,  ["RS485", "RS485"] */]

const initialForm = {
  installDate: new Date().toISOString().split("T")[0],
  voltageType: "",
  communicationMode: "ETHERNET",
  location: "",
  deviceAddress: "",
  deviceAddressApple: "",
  devicePort: "",
}

export default function IemuModal({
  open,
  onOpenChange,
  mode = "add", // "add" | "edit"
  initialValues = {},
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm)
  const [organizations, setOrganizations] = useState([])

  const fetchOrganizations = async () => {
    var res = await getOrganizationList()
    setOrganizations(res)
  }

  useEffect(() => {
    if (open) {
      var newForm = { ...initialForm, ...initialValues }
      if (initialValues?.organizationId) {
        newForm.location = initialValues?.organizationId
      }
      if (!initialValues?.deviceAddressApple) {
        newForm.deviceAddressApple = "00000000-0000-0000-0000-000000000000"
      }
      setForm(newForm)
      fetchOrganizations().then(() => {
        if (initialValues?.organizationId) {
          newForm.location = initialValues?.organizationId
        }
        setForm(newForm)
      })
    }
  }, [open])

  const handleChange = (e) => {
    const { id, value } = e.target
    setForm((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field) => (value) => {
    if (field === "communicationMode") {
      if (value === "ETHERNET") {
        setForm((prev) => ({ ...prev, [field]: value, deviceAddress: "", devicePort: "" }))
      }
      else {
        setForm((prev) => ({ ...prev, [field]: value, deviceAddress: "00:00:00:00:00:00", devicePort: "" }))
      }
      return
    }
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSubmit) onSubmit(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "새 iEMU 등록" : "iEMU 정보 수정"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installDate">설치일자</Label>
              <Input id="installDate" type="date" className="h-10" value={form.installDate} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="voltageType">전압타입</Label>
              <Select value={form.voltageType} onValueChange={handleSelectChange("voltageType")}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="전압타입 선택" />
                </SelectTrigger>
                <SelectContent>
                  {VOLTAGE_TYPES.map((v) => (
                    <SelectItem key={v[0]} value={v[0]}>{v[1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="communicationMode">통신모드</Label>
              <Select value={form.communicationMode} onValueChange={handleSelectChange("communicationMode")}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="통신모드 선택" />
                </SelectTrigger>
                <SelectContent>
                  {COMM_MODES.map((v) => (
                    <SelectItem key={v[0]} value={v[0]}>{v[1]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">설치 사업장</Label>
              <Select value={form.organizationId} onValueChange={handleSelectChange("location")}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="위치 선택" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deviceAddress">{form.communicationMode === "ETHERNET" ? "IP 주소" : "MAC 주소"}</Label>
            <Input id="deviceAddress" placeholder={form.communicationMode === "ETHERNET" ? "192.168.1.xxx" : "00:00:00:00:00:00"} className="h-10" value={form.deviceAddress} onChange={handleChange} />
          </div>



          {(form.communicationMode === "ETHERNET") && (<div className="space-y-2">
            <Label htmlFor="devicePort">포트</Label>
            <Input id="devicePort" placeholder="2500" className="h-10" value={form.devicePort} onChange={handleChange} />
          </div>)}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              {mode === "add" ? "등록" : "수정 완료"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 