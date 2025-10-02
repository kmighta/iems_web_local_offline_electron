import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building, AlertCircle } from "lucide-react"

export default function StoreNameModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialStoreName = "",
  initialStoreSerial = "",
  isLoading = false 
}) {
  const [storeName, setStoreName] = useState(initialStoreName)
  const [storeSerial, setStoreSerial] = useState(initialStoreSerial)
  const [error, setError] = useState("")

  // initialStoreName이 변경될 때 storeName 상태 업데이트
  useEffect(() => {
    setStoreName(initialStoreName)
    setStoreSerial(initialStoreSerial)
  }, [initialStoreName, initialStoreSerial])

  const handleInputChange = (e) => {
    const value = e.target.value
    setStoreName(value)
    if (error) setError("")
  }

  const handleInputChangeSerial = (e) => {
    const value = e.target.value
    setStoreSerial(value)
    if (error) setError("")
  }

  const handleConfirm = () => {
    if (!storeName.trim()) {
      setError("사업장명을 입력해주세요.")
      return
    }
    
    if (storeName.trim().length < 2) {
      setError("사업장명은 2글자 이상 입력해주세요.")
      return
    }

    onConfirm(storeName.trim(), storeSerial.trim())
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  const handleClose = () => {
    setStoreName(initialStoreName)
    setStoreSerial(initialStoreSerial)
    setError("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white text-center">
            사업장명 설정
          </DialogTitle>
          <p className="text-gray-600 dark:text-slate-300 text-center">
            사업장의 이름을 입력해주세요.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="store-name" className="text-gray-700 dark:text-slate-300 font-semibold text-base">
              사업장명
            </Label>
            <Input
              id="store-name"
              type="text"
              value={storeName}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="사업장명을 입력하세요"
              className="h-14 bg-gray-50/80 dark:bg-slate-700/50 backdrop-blur-sm border-2 border-gray-200/50 dark:border-slate-600/50 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all duration-300 text-lg shadow-sm"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-serial" className="text-gray-700 dark:text-slate-300 font-semibold text-base">
              iEMU Serial-Number
            </Label>
            <Input
              id="store-serial"
              type="text"
              value={storeSerial}
              onChange={handleInputChangeSerial}
              onKeyPress={handleKeyPress}
              placeholder="iEMU Serial-Number를 입력하세요"
              className="h-14 bg-gray-50/80 dark:bg-slate-700/50 backdrop-blur-sm border-2 border-gray-200/50 dark:border-slate-600/50 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all duration-300 text-lg shadow-sm"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl font-semibold transition-all duration-200 dark:text-white"
              onClick={handleClose}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="button"
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-semibold transition-all duration-200 text-white shadow-lg hover:shadow-xl"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>처리 중...</span>
                </div>
              ) : (
                "확인"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
