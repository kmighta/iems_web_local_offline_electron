import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { getOrganizationList } from "@/api/organization"

const ALL_ROLE_OPTIONS = [
  ["ROLE_ADMIN", "관리자"],
  ["ROLE_OWNER", "사업장관리자"],
  ["ROLE_HANZEON", "한전"],
  ["ROLE_USER", "사용자"],
  ["ROLE_ENGINEER", "일반관리자"],
  ["ROLE_ADMIN_OWNER", "중간관리자"],
  ["ROLE_ADMIN_ENGINEER", "설정관리자"],
  ["ROLE_ADMIN_USER", "모니터링 관리자"],
]
const STATUS_OPTIONS = [
  ["활성", "활성"],
  ["비활성", "비활성"],
]

const initialForm = {
  name: "",
  email: "",
  phone: "",
  role: "",
  status: "활성",
  password: "",
  organizationId: "",
  organizationIds: [], // 다중 선택을 위한 배열
}

export default function UserModal({
  open,
  onOpenChange,
  mode = "add", // "add" | "edit"
  initialValues = {},
  onSubmit,
  currentUserRole,
}) {
  const [form, setForm] = useState(initialForm)
  const [organizations, setOrganizations] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 사업장 목록 로드
  const loadOrganizations = async () => {
    try {
      const orgList = await getOrganizationList()
      setOrganizations(orgList || [])
    } catch (error) {
      console.error('사업장 목록 로드 실패:', error)
      setOrganizations([])
    }
  }

  // 현재 사용자 역할에 따른 역할 옵션 필터링
  const getRoleOptions = () => {
    if (currentUserRole === "owner") {
      // ROLE_OWNER는 기본 사용자 역할들만 생성 가능
      return ALL_ROLE_OPTIONS.filter(([value]) => 
        value === "ROLE_USER" || value === "ROLE_ENGINEER"
      )
    }
    
    if (currentUserRole === "admin") {
      // 시스템관리자는 관리자급 역할들만 생성 가능
      return ALL_ROLE_OPTIONS.filter(([value]) => 
        value === "ROLE_ADMIN" ||
        value === "ROLE_OWNER" ||
        value === "ROLE_HANZEON" ||
        value === "ROLE_ADMIN_OWNER" ||
        value === "ROLE_ADMIN_ENGINEER" ||
        value === "ROLE_ADMIN_USER"
      )
    }
    
    // 중간관리자는 하위 관리자 역할들 생성 가능
    if (currentUserRole === "admin_owner") {
      return ALL_ROLE_OPTIONS.filter(([value]) => 
        value === "ROLE_ADMIN_ENGINEER" || 
        value === "ROLE_ADMIN_USER" || 
        // value === "ROLE_USER" ||
        value === "ROLE_ENGINEER"
      )
    }
    
    // 일반관리자(ADMIN_ENGINEER)는 모니터링 관리자와 사용자만 생성 가능
    if (currentUserRole === "admin_engineer") {
      return ALL_ROLE_OPTIONS.filter(([value]) => 
        value === "ROLE_ADMIN_USER"
        //   ||
        // value === "ROLE_USER"
      )
    }
    
    // 모니터링 관리자는 일반 사용자만 생성 가능
    if (currentUserRole === "admin_user") {
      return ALL_ROLE_OPTIONS.filter(([value]) => 
        value === "ROLE_USER"
      )
    }
    
    // 기본적으로 최고 관리자급 역할들 (관리자, 사업장관리자, 한전)
    return ALL_ROLE_OPTIONS.filter(([value]) => 
      value === "ROLE_ADMIN" || 
      value === "ROLE_OWNER" || 
      value === "ROLE_HANZEON" ||
      value === "ROLE_ADMIN_OWNER" ||
      value === "ROLE_ADMIN_ENGINEER" ||
      value === "ROLE_ADMIN_USER"
    )
  }

  useEffect(() => {
    if (open) {
      setForm({ ...initialForm, ...initialValues })
      loadOrganizations()
    }
    // eslint-disable-next-line
  }, [open])

  const handleChange = (e) => {
    const { id, value } = e.target
    setForm((prev) => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleOrganizationChange = (orgId, checked) => {
    setForm((prev) => {
      const newOrganizationIds = checked 
        ? [...(prev.organizationIds || []), orgId]
        : (prev.organizationIds || []).filter(id => id !== orgId)
      
      console.log('사업장 선택 변경:', { orgId, checked, newOrganizationIds })
      
      return { ...prev, organizationIds: newOrganizationIds }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return // 중복 제출 방지
    
    setIsSubmitting(true)
    try {
      // API 전송용 데이터 준비
      const submitData = { ...form }
      
      // 관리자나 사업장관리자, 중간관리자인 경우 organizationIds 배열 사용
      if (currentUserRole === "admin" || currentUserRole === "owner" || currentUserRole === "admin_owner") {
        console.log('현재 form.organizationIds:', form.organizationIds)
        console.log('현재 사용자 역할:', currentUserRole)
        
        submitData.organizationIds = form.organizationIds || []
        // 단일 선택 필드는 제거 (혼동 방지)
        delete submitData.organizationId
      } else {
        // 다른 역할은 기존처럼 단일 organizationId 사용
        submitData.organizationIds = form.organizationId ? [form.organizationId] : []
      }
      
      console.log('최종 API 전송 데이터:', submitData)
      console.log('organizationIds 필드:', submitData.organizationIds)
      
      if (onSubmit) await onSubmit(submitData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md dark:bg-slate-800 dark:border-slate-700/50 dark:backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{mode === "add" ? "새 사용자 추가" : "사용자 정보 수정"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="dark:text-slate-200">이름</Label>
            <Input id="name" placeholder="이름을 입력하세요" className="h-10" value={form.name} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="dark:text-slate-200">이메일</Label>
            <Input id="email" type="email" placeholder="이메일을 입력하세요" className="h-10" value={form.email} onChange={handleChange} disabled={mode === "edit"} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="dark:text-slate-200">전화번호</Label>
            <Input id="phone" placeholder="전화번호를 입력하세요" className="h-10" value={form.phone} onChange={handleChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organizationId" className="dark:text-slate-200">사업장</Label>
            {(currentUserRole === "owner" || currentUserRole === "admin" || currentUserRole === "admin_owner") ? (
              <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-2">
                <Label className="text-sm text-gray-600 dark:text-slate-400">사업장 선택 (다중 선택 가능)</Label>
                {organizations.map((org) => (
                  <div key={org.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`org-${org.id}`}
                      checked={form.organizationIds.includes(org.id)}
                      onCheckedChange={(checked) => handleOrganizationChange(org.id, checked)}
                    />
                    <Label htmlFor={`org-${org.id}`} className="text-sm cursor-pointer">
                      {org.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <Select value={form.organizationId} onValueChange={handleSelectChange("organizationId")}> 
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="사업장을 선택하세요" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  {organizations.map((org) => (
                    <SelectItem 
                      className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" 
                      key={org.id} 
                      value={org.id}
                    >
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role" className="dark:text-slate-200">역할</Label>
              <Select value={form.role} onValueChange={handleSelectChange("role")}> 
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  {getRoleOptions().map(([val, label]) => (
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="dark:text-slate-200">상태</Label>
              <Select value={form.status} onValueChange={handleSelectChange("status")}> 
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800">
                  {STATUS_OPTIONS.map(([val, label]) => (
                    <SelectItem className="dark:bg-slate-800 dark:hover:bg-slate-900 dark:focus:bg-slate-900" key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 권한별 안내문구 */}
          {form.role && (
            <div className="p-3 bg-gray-50 dark:bg-slate-700/80 rounded-md border-l-4 border-blue-500">
              <div className="text-sm text-gray-700 dark:text-slate-300">
                <div className="font-medium mb-1">권한 안내</div>
                {form.role === "ROLE_ENGINEER" && (
                  <p>• 일반관리자는 설정값 조회 및 수정이 가능합니다.</p>
                )}
                {form.role === "ROLE_USER" && (
                  <div>
                    <p>• 사용자는 모든 데이터를 보기만 가능하며, 수정 권한이 없습니다.</p>
                    <p>• 사업장관리자 소속으로, 사업장관리자가 관리하는 매장에 접근할 수 있습니다.</p>
                  </div>
                )}
                {form.role === "ROLE_ADMIN" && (
                  <p>• 관리자는 모든 시스템 기능에 대한 전체 권한을 가집니다.</p>
                )}
                {form.role === "ROLE_OWNER" && (
                  <p>• 사업장관리자는 해당 사업장의 모든 기능을 관리할 수 있습니다. 사업장을 선택해주세요.</p>
                )}
                {form.role === "ROLE_HANZEON" && (
                  <p>• 한전 관리자는 시스템 전체 모니터링 권한을 가집니다.</p>
                )}
                {form.role === "ROLE_ADMIN_OWNER" && (
                  <p>• 중간관리자는 하위 관리자 역할들을 생성하고 관리할 수 있습니다.</p>
                )}
                {form.role === "ROLE_ADMIN_ENGINEER" && (
                  <p>• 일반관리자는 모니터링 관리자와 일반 사용자를 생성하고 관리할 수 있습니다.</p>
                )}
                {form.role === "ROLE_ADMIN_USER" && (
                  <div>
                    <p>• 모니터링 관리자는 모든 데이터를 보기만 가능하며, 설정 변경 권한이 없습니다.</p>
                    <p>• 시스템관리자가 생성하는 독립적 계정으로, 시스템관리자가 정해준 사업장들에 접근할 수 있습니다.</p>
                    <p>• 사업장 소유권과 관계없이 허용된 모든 사업장을 모니터링할 수 있습니다.</p>
                  </div>
                )}
                {(form.role === "ROLE_USER" || 
                  form.role === "ROLE_ENGINEER" || 
                  form.role === "ROLE_ADMIN_OWNER" || 
                  form.role === "ROLE_ADMIN_ENGINEER" || 
                  form.role === "ROLE_ADMIN_USER") && form.organizationId && (
                  <p>• 선택한 사업장에서만 활동할 수 있습니다.</p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="dark:text-slate-200">임시 비밀번호{mode === "edit" && " (변경 시에만 입력)"}</Label>
            <Input id="password" type="password" placeholder="임시 비밀번호를 입력하세요" className="h-10" value={form.password} onChange={handleChange} autoComplete="new-password" />
          </div>


          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white">
              {isSubmitting ? "처리 중..." : (mode === "add" ? "사용자 추가" : "수정 완료")}
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