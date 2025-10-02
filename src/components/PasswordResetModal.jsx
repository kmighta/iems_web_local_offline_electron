import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Mail, CheckCircle, AlertCircle } from "lucide-react"
import { sendVerifyEmail, verifyEmail, changePassword } from "@/api/user"

export default function PasswordResetModal({ open, onOpenChange }) {
  const [passwordResetStep, setPasswordResetStep] = useState(1) // 1: 이메일 입력, 2: 인증코드 입력, 3: 새 비밀번호 입력
  const [passwordResetData, setPasswordResetData] = useState({
    email: "",
    code: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)
  const [passwordResetError, setPasswordResetError] = useState("")
  const [passwordResetSuccess, setPasswordResetSuccess] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPasswordResetComplete, setIsPasswordResetComplete] = useState(false)

  const handlePasswordResetInputChange = (field, value) => {
    setPasswordResetData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (passwordResetError) setPasswordResetError("")
  }

  const handleSendVerificationEmail = async (e) => {
    e.preventDefault()
    if (!passwordResetData.email.trim()) {
      setPasswordResetError("이메일을 입력해주세요.")
      return
    }
    setPasswordResetLoading(true)
    setPasswordResetError("")
    try {
      await sendVerifyEmail(passwordResetData.email)
      setPasswordResetSuccess("인증 코드가 이메일로 전송되었습니다.")
      setPasswordResetStep(2)
    } catch (err) {
      setPasswordResetError("인증 코드 전송에 실패했습니다. 이메일을 확인해주세요.")
    } finally {
      setPasswordResetLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!passwordResetData.code.trim()) {
      setPasswordResetError("인증 코드를 입력해주세요.")
      return
    }
    setPasswordResetLoading(true)
    setPasswordResetError("")
    try {
      await verifyEmail(passwordResetData.email, passwordResetData.code)
      setPasswordResetSuccess("인증이 완료되었습니다. 새 비밀번호를 입력해주세요.")
      setPasswordResetStep(3)
    } catch (err) {
      setPasswordResetError(err?.response?.data?.resultMessage || "인증 코드가 일치하지 않습니다.")
    } finally {
      setPasswordResetLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordResetData.newPassword.trim()) {
      setPasswordResetError("새 비밀번호를 입력해주세요.")
      return
    }
    if (passwordResetData.newPassword !== passwordResetData.confirmPassword) {
      setPasswordResetError("비밀번호가 일치하지 않습니다.")
      return
    }
    if (passwordResetData.newPassword.length < 8) {
      setPasswordResetError("비밀번호는 8자 이상이어야 합니다.")
      return
    }
    setPasswordResetLoading(true)
    setPasswordResetError("")
    try {
      await changePassword(passwordResetData.email, passwordResetData.code, passwordResetData.newPassword)
      setPasswordResetSuccess("비밀번호가 성공적으로 변경되었습니다!")
      setIsPasswordResetComplete(true)
      setTimeout(() => {
        onOpenChange(false)
        resetPasswordModal()
      }, 3000)
    } catch (err) {
      setPasswordResetError(err?.response?.data?.resultMessage || "비밀번호 변경에 실패했습니다.")
    } finally {
      setPasswordResetLoading(false)
    }
  }

  const resetPasswordModal = () => {
    setPasswordResetStep(1)
    setPasswordResetData({
      email: "",
      code: "",
      newPassword: "",
      confirmPassword: "",
    })
    setPasswordResetError("")
    setPasswordResetSuccess("")
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetPasswordModal()
    }}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-0 rounded-3xl shadow-2xl border border-white/20">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold text-gray-800 text-center">비밀번호 찾기</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {passwordResetStep === 1 && (
            <form onSubmit={handleSendVerificationEmail}>
              <div className="text-center">
                <Mail className="h-12 w-12 text-blue-500 mx-auto" />
                <p className="text-gray-700 text-lg mt-4">
                  가입하신 이메일을 입력해주세요. 인증 코드를 발송해드립니다.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-reset-email" className="text-gray-700 font-semibold">
                    이메일
                  </Label>
                  <Input
                    id="password-reset-email"
                    type="email"
                    

                    placeholder="가입하신 이메일을 입력하세요"
                    className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                    value={passwordResetData.email}
                    onChange={(e) => handlePasswordResetInputChange("email", e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                  disabled={passwordResetLoading}
                >
                  {passwordResetLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>인증 코드 발송</span>
                    </div>
                  ) : (
                    "인증 코드 발송"
                  )}
                </Button>
              </div>
            </form>
          )}
          {passwordResetStep === 2 && (
            <>
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-gray-700 text-lg mt-4">
                  인증 코드가 발송되었습니다. 이메일을 확인해주세요.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-reset-code" className="text-gray-700 font-semibold">
                    인증 코드
                  </Label>
                  <Input
                    id="password-reset-code"
                    type="text"
                    placeholder="인증 코드를 입력하세요"
                    className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                    value={passwordResetData.code}
                    onChange={(e) => handlePasswordResetInputChange("code", e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                  onClick={handleVerifyCode}
                  disabled={passwordResetLoading}
                >
                  {passwordResetLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>인증 코드 확인</span>
                    </div>
                  ) : (
                    "인증 코드 확인"
                  )}
                </Button>
              </div>
            </>
          )}
          {passwordResetStep === 3 && (
            <>
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <p className="text-gray-700 text-lg mt-4">
                  인증이 완료되었습니다. 새 비밀번호를 입력해주세요.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password-reset-new-password" className="text-gray-700 font-semibold">
                    새 비밀번호
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-reset-new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="새 비밀번호를 입력하세요"
                      className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 pr-12"
                      value={passwordResetData.newPassword}
                      onChange={(e) => handlePasswordResetInputChange("newPassword", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100/80 backdrop-blur-sm"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-reset-confirm-password" className="text-gray-700 font-semibold">
                    비밀번호 확인
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-reset-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="비밀번호를 다시 입력하세요"
                      className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200 pr-12"
                      value={passwordResetData.confirmPassword}
                      onChange={(e) => handlePasswordResetInputChange("confirmPassword", e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-xl hover:bg-gray-100/80 backdrop-blur-sm"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
                  onClick={handleChangePassword}
                  disabled={passwordResetLoading || isPasswordResetComplete}
                >
                  {passwordResetLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>비밀번호 변경</span>
                    </div>
                  ) : (
                    "비밀번호 변경"
                  )}
                </Button>
              </div>
            </>
          )}
          {passwordResetSuccess && !passwordResetError && (
            <div className="flex items-center gap-4 p-5 bg-green-50 border-l-4 border-green-400 rounded-2xl">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-green-700 font-medium">{passwordResetSuccess}</span>
            </div>
          )}
          {passwordResetError && (
            <div className="flex items-center gap-4 p-5 bg-red-50 border-l-4 border-red-400 rounded-2xl">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-red-700 font-medium">{passwordResetError}</span>
            </div>
          )}
          {/* <div className="text-center pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-gray-600 text-sm cursor-pointer"
              onClick={resetPasswordModal}
            >
              비밀번호 찾기 취소
            </Button>
          </div> */}
        </div>
      </DialogContent>
    </Dialog>
  )
} 