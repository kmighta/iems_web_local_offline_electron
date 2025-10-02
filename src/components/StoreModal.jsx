import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Building } from "lucide-react"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { getUserList } from "@/api/user"
import { useDaumPostcodePopup } from 'react-daum-postcode';
import useOrganizationStore from "@/store/organizationStore"

const initialForm = {
  name: "",
  address: "",
  detailAddress: "",
  registrationNumber: "",
  ownerUserId: "",
  tel: "",
  description: "",
  ipAddress: "",
  plcSerial: "",
  local: false, // 로컬접속여부 기본값 false
  powerCategory: "",
  pressureType: "",
  optionSelect: "",
  meterType: "",
}

export default function StoreModal({ open, onOpenChange, fetchStores, mode = "add", initialValues = {}, onSubmit, currentUserRole }) {
  const [form, setForm] = useState(initialForm)
  const [users, setUsers] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const openPostcode = useDaumPostcodePopup();
  const { setSelectedOrganization, selectedOrganization } = useOrganizationStore()

  // 매핑 불필요: API 응답 라벨을 그대로 Select value로 사용

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await getUserList()
      setUsers(res)
    }
    const fetchPowerInfo = async () => {
      try {
        if (mode === "edit" && (initialValues?.id || selectedOrganization?.id)) {
          const customerId = 1
          const { getCustomerPowerInfo } = await import("@/api/schedule_dynamic")
          const powerInfo = await getCustomerPowerInfo(customerId)
          setForm((prev) => {
            return {
              ...prev,
              powerCategory: powerInfo?.powerType ?? prev.powerCategory,
              pressureType: powerInfo?.voltageType ?? prev.pressureType,
              optionSelect: powerInfo?.selection ?? prev.optionSelect,
              meterType: powerInfo?.meterType ?? prev.meterType,
            }
          })
        }
      } catch (error) {
        console.error("기존 고객전력정보 조회 실패", error)
      }
    }
    if (open) {
      // 편집 모달이 열릴 때 전역 선택 조직을 우선 세팅하여 동적 axios의 소켓 프록시 ID가 default가 되지 않도록 처리
      if (mode === "edit" && initialValues?.id && (!selectedOrganization || selectedOrganization.id !== initialValues.id)) {
        setSelectedOrganization(initialValues)
      }
      fetchUsers()
      setForm({ ...initialForm, ...initialValues })
      fetchPowerInfo()
    }
  }, [open])

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialValues }))
  }, [users])

  const handleChange = (e) => {
    const { id, value } = e.target
    setForm((prev) => ({ ...prev, [id.replace("store-", "")]: value }))
  }

  const handleUserChange = (value) => {
    setForm((prev) => ({ ...prev, ownerUserId: value }))
  }

  const handleLocalAccessChange = (value) => {
    setForm((prev) => ({ ...prev, local: value !== 'true' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return // 중복 제출 방지
    
    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(form)
      }
      setForm(initialForm)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = (data) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname;
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    //console.log(fullAddress); // e.g. '서울 성동구 왕십리로2길 20 (성수동1가)'
    setForm((prev) => ({ ...prev, address: fullAddress }))
  };

  const handleClick = () => {
    openPostcode({ onComplete: handleComplete });
  };

  // 고압일 때 계량기 타입 비활성화 (라벨 기준)
  const isMeterTypeDisabled = form.pressureType === "고압A" || form.pressureType === "고압B"

  // 고압 선택 시 선택된 계량기 타입 초기화
  useEffect(() => {
    if (isMeterTypeDisabled && form.meterType) {
      setForm((prev) => ({ ...prev, meterType: "" }))
    }
  }, [form.pressureType])

  let submitButtonText = mode === "add" ? "사업장 추가" : "수정 완료"
  if (isSubmitting) {
    submitButtonText = "처리 중..."
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600 dark:text-green-600" />{mode === "add" ? "새 사업장 추가" : "사업장 정보 수정"}
          </DialogTitle>
        </DialogHeader>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
          {/* 좌측 컬럼: 기본 정보 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">사업장명 <span className="text-red-500">*</span></Label>
              <Input id="store-name" placeholder="사업장명을 입력하세요" className="h-10" value={form.name} onChange={handleChange} />
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="mb-1" htmlFor="store-address">주소 <span className="text-red-500">*</span></Label>
                <Input id="store-address" placeholder="사업장 주소를 입력하세요" className="h-10" value={form.address} onChange={handleChange} />
              </div>
              <Button type="button" onClick={handleClick} className="h-10 mt-6 text-white dark:bg-green-600">주소 검색</Button>
            </div>

            <div className="space-y-2">
              <Label className="mb-1" htmlFor="store-detail-address">상세 주소</Label>
              <Input id="store-detailAddress" placeholder="사업장 상세 주소를 입력하세요" className="h-10" value={form.detailAddress} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label className="mb-1" htmlFor="store-business-number">사업자 등록번호 <span className="text-red-500">*</span></Label>
              <Input id="store-registrationNumber" placeholder="사업자 등록번호를 입력하세요" className="h-10" value={form.registrationNumber} onChange={handleChange} />
            </div>

            {currentUserRole !== "owner" ? (
              <div className="space-y-2">
                <Label className="mb-1" htmlFor="store-manager">관리자</Label>
                <Select value={form.ownerUserId} onValueChange={handleUserChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="관리자 선택" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    {users.map((user) => (
                      <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label className="mb-1">로컬접속여부</Label>
              <Select value={(!form.local).toString()} onValueChange={handleLocalAccessChange}>
                <SelectTrigger>
                  <SelectValue placeholder="선택하세요" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="true">O (허용)</SelectItem>
                  <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="false">X (차단)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-phone">전화번호</Label>
              <Input id="store-tel" placeholder="전화번호" className="h-10" value={form.tel} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-description">사업장 설명</Label>
              <Input id="store-description" placeholder="사업장 설명을 입력하세요" className="h-10" value={form.description} onChange={handleChange} />
            </div>
          </div>

          {/* 우측 컬럼: iEMU 정보 */}
          <div className="space-y-4 md:border-l md:pl-6">
              <div className="space-y-2">
                <Label htmlFor="store-ipAddress">iEMU IP 주소</Label>
                <Input
                  id="store-ipAddress"
                  placeholder="예: 192.168.1.100:XXXX [포트번호 필수]"
                  className="h-10"
                  value={form.ipAddress}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500">
                  {mode === "add" ? "사업장 등록과 함께 iEMU IP를 입력하세요." : "iEMU의 IP 주소를 변경할 수 있습니다."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-plcSerial">iEMU Serial-Number</Label>
                <Input
                  id="store-plcSerial"
                  className="h-10"
                  value={form.plcSerial}
                  onChange={handleChange}
                />
              </div>

              <Separator className="my-4" />

            {/* 추가 선택 영역: 전력구분 / (고압·저압, 계량기 타입) / 선택 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 전력구분 - 한 줄 전체 */}
              <div className="space-y-2 sm:col-span-2">
                <Label>전력구분 <span className="text-red-500">*</span></Label>
                <Select value={form.powerCategory} onValueChange={(v) => setForm((p) => ({ ...p, powerCategory: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="교육전력(갑)" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="교육전력(갑)">교육전력(갑)</SelectItem>
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="산업전력(을)">산업전력(을)</SelectItem>
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="일반전력">일반전력</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 고압/저압 */}
              <div className="space-y-2">
                <Label>고압/저압 <span className="text-red-500">*</span></Label>
                <Select value={form.pressureType} onValueChange={(v) => setForm((p) => ({ ...p, pressureType: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="고압A" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="고압A">고압A</SelectItem>
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="고압B">고압B</SelectItem>
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="저압">저압</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 계량기 타입 - 고압일 때 비활성화 */}
              <div className="space-y-2">
                <Label>
                  계량기 타입
                  {form.pressureType === "저압" && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Select value={form.meterType} onValueChange={(v) => setForm((p) => ({ ...p, meterType: v }))} disabled={isMeterTypeDisabled}>
                  <SelectTrigger>
                    <SelectValue placeholder="계량기 타입 선택" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="meter">계량기</SelectItem>
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="meta">메타</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>선택</Label>
                <Select value={form.optionSelect} onValueChange={(v) => setForm((p) => ({ ...p, optionSelect: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="선택1" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800">
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="선택1">선택1</SelectItem>
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" value="선택2">선택2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {(mode === "add" && <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 md:col-span-2`}>
            <p className="text-xs text-blue-800">
              💡 새 사업장 추가 후 해당 사업장에 iEMU 장치를 등록하고 설정을 완료해주세요.
            </p>
          </div>)}

          <div className={`flex gap-2 pt-4 md:col-span-2`}>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-green-600">
              {submitButtonText}
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