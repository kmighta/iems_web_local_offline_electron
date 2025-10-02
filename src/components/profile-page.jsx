import { useEffect, useState } from "react"
import { User, Mail, Shield, Calendar, Edit, Save, X, Lock, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/router/router"
import { getUserInfo, sendVerifyEmail, verifyEmail, changePassword, updateUser } from "@/api/user"
import { getRoleName2 } from "@/utils/userRole"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isEmailSend, setIsEmailSend] = useState(false)
  const [isEmailVerify, setIsEmailVerify] = useState(false)
  const { currentUser, userRole } = useAuth()

  const [formData, setFormData] = useState({
    id: "-",
    name: "-",
    email: currentUser || "-",
    phone: "-",
    createdAt: "-",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const fetchUserInfo = async () => {
    const userInfo = await getUserInfo();

    console.log(userInfo)
    var createdAt = new Date(userInfo.createdAt).toLocaleString()
    setFormData({
      id: userInfo.id,
      name: userInfo.nickname,
      email: userInfo.email,
      phone: userInfo.phone,
      createdAt: createdAt,
    })
  }

  useEffect(() => {
    fetchUserInfo()
  }, [])

  const onClickSendEmailVerify = async () => {
    try {
      await sendVerifyEmail(formData.email)
      alert("이메일 인증 코드가 전송되었습니다.")
      setIsEmailSend(true)
    } catch (error) {
      console.log(error)
      alert("이메일 인증 코드 전송에 실패했습니다.")
    }
  }

  const onClickVerifyEmail = async () => {
    try {
      await verifyEmail(formData.email, passwordData.emailCode)
      alert("이메일 인증이 완료되었습니다.")
      setIsEmailVerify(true)
    } catch (error) {
      console.log(error.response.data.resultMessage)
      alert(error.response.data.resultMessage)
    }
  }

  const onClickChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("새 비밀번호가 일치하지 않습니다.")
      return
    }
    if (passwordData.newPassword.length < 8) {
      alert("비밀번호는 8자 이상이어야 합니다.")
      return
    }
    // 비밀번호 변경 로직
    try {
      await changePassword(formData.email, passwordData.emailCode, passwordData.newPassword)
      alert("비밀번호가 성공적으로 변경되었습니다.")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setIsChangingPassword(false)
      setIsEmailVerify(false)
      setIsEmailSend(false)
    } catch (error) {
      console.log(error.response.data.resultMessage)
      alert(error.response.data.resultMessage)
    }
  }

  const handlePasswordCancel = () => {
    setIsChangingPassword(false)
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    setIsEmailVerify(false)
    setIsEmailSend(false)
  }

  const handleSave = async () => {
    if (formData.phone && formData.phone.length !== 9 && formData.phone.length !== 11) {
      alert("연락처는 9자리 또는 11자리 이어야 합니다.")
      return
    }

    try {  
      await updateUser({
        id: formData.id,
        phone: formData.phone,
      })
      alert("정보가 성공적으로 저장되었습니다.")
      setIsEditing(false)
    } catch (error) {
      console.log(error.response.data.resultMessage)
      alert(error.response.data.resultMessage)
    }
  }
  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 프로필 카드 */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-12 w-12 text-white" />
            </div>
            <CardTitle className="text-xl">{formData.name}</CardTitle>
            <Badge variant="secondary" className="w-fit mx-auto bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200">
              {getRoleName2(userRole)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
              <Mail className="h-4 w-4" />
              <span>{formData.email}</span>
            </div>
            {/* <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
              <Shield className="h-4 w-4" />
              <span>{formData.department}</span>
            </div> */}
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span>가입일: {formData.createdAt}</span>
            </div>
          </CardContent>
        </Card>

        {/* 기본 정보 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>기본 정보</CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="dark:text-white">
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="dark:text-white">
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                {/* {isEditing ? (
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">{formData.name}</div>
                )} */}
                <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">{formData.name}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                {/* {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                ) : (
                  <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">{formData.email}</div>
                )} */}
                <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">{formData.email}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={formData.phone}
                    maxLength={11}
                    minLength={9}
                    placeholder="연락처를 입력하세요 (예: 01000000000)"
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white dark:bg-slate-900"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">{formData.phone}</div>
                )}
              </div>
              {/* <div className="space-y-2">
                <Label htmlFor="department">부서</Label>
                {isEditing ? (
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                ) : (
                  <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">{formData.department}</div>
                )}
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            비밀번호 변경
          </CardTitle>
          {!isChangingPassword ? (
            <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)} className="dark:text-white">
              <Edit className="h-4 w-4 mr-2" />
              변경
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePasswordCancel} className="dark:text-white">
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              <Button
                size="sm"
                onClick={onClickChangePassword}
                disabled={!isEmailVerify}
              >
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isChangingPassword ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cemail-auth">비밀번호 번경시 이메일 인증이 필요합니다.</Label>
                  <Button id="email-auth" variant="outline" size="sm" onClick={() => onClickSendEmailVerify()} disabled={isEmailSend} className="dark:text-white">이메일 인증</Button>
                  {/* <div className="relative flex flex-row gap-2">
                    <span>이메일 주소: {formData.email}</span>
                    <Button id="email-auth" variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>이메일 인증</Button>
                  </div> */}
                </div>
                <div></div>
                {isEmailSend && (<div className="space-y-2">
                  <Label htmlFor="email-code">인증 번호</Label>
                  <div className="relative flex flex-row gap-2">
                  <Input
                    className="max-w-48 bg-white dark:bg-slate-900"
                    id="email-code"
                    type="text"
                    value={passwordData.emailCode}
                    onChange={(e) => setPasswordData({ ...passwordData, emailCode: e.target.value })}
                  />
                  <Button variant="outline" size="sm" onClick={() => onClickVerifyEmail()} className="dark:text-white">인증</Button>
                  </div>
                </div>)}
                <div><input type="input" id="email" value={formData.email} readOnly className="w-0" /></div>
                {isEmailVerify && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">새 비밀번호</Label>
                      <div className="relative">
                        <Input
                          className="max-w-48 bg-white dark:bg-slate-900"
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                          placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-40 top-0 h-full px-3 py-2 hover:bg-transparent dark:text-white"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                      <div className="relative">
                        <Input
                          className="max-w-48 bg-white dark:bg-slate-900"
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                          placeholder="새 비밀번호를 다시 입력하세요"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute left-40 top-0 h-full px-3 py-2 hover:bg-transparent dark:text-white"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              {passwordData.newPassword && passwordData.newPassword.length < 8 && (
                <p className="text-sm text-red-500">비밀번호는 8자 이상이어야 합니다.</p>
              )}
              {passwordData.newPassword &&
                passwordData.confirmPassword &&
                passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="text-sm text-red-500">새 비밀번호가 일치하지 않습니다.</p>
                )}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-slate-400">보안을 위해 정기적으로 비밀번호를 변경해주세요.</p>
          )}
        </CardContent>
      </Card>

      {/* 최근 활동 */}
      {/* <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: "사용자 계정 생성", time: "2024.01.08 14:30", target: "user@example.com" },
              { action: "시스템 설정 변경", time: "2024.01.08 10:15", target: "알림 설정" },
              { action: "iEMU 장치 등록", time: "2024.01.07 16:45", target: "IEMU-001" },
              { action: "사업장 정보 수정", time: "2024.01.07 09:20", target: "서울 본사" },
              { action: "로그인", time: "2024.01.08 08:30", target: "관리자 계정" },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <div className="font-medium text-sm">{activity.action}</div>
                  <div className="text-xs text-gray-500">{activity.target}</div>
                </div>
                <div className="text-xs text-gray-400">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
