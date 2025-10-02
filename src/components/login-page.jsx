import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, AlertCircle, Shield, Building, Battery, Leaf, Mail, CheckCircle, Sun, Moon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Footer from "./footer"
import axios from "axios"
import { login } from "@/api/login"
import { sendVerifyEmail, verifyEmail, changePassword } from "@/api/user"
import { Checkbox } from "./ui/checkbox"
import PasswordResetModal from "./PasswordResetModal"
import StoreNameModal from "./StoreNameModal"
import { useTheme } from "./theme-provider"
import useOrganizationStore from "@/store/organizationStore"
import { getDefaultOrgId } from "@/lib/config"

export default function LoginPage({ onLogin }) {
  const { theme, toggleTheme } = useTheme()
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // 비밀번호 찾기 모달 상태
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false)
  
  // 사업장명 입력 모달 상태
  const [isStoreNameModalOpen, setIsStoreNameModalOpen] = useState(false)
  const [pendingLoginData, setPendingLoginData] = useState(null)
  const [isStoreNameLoading, setIsStoreNameLoading] = useState(false)
  const [savedStoreName, setSavedStoreName] = useState("")
  const [savedStoreSerial, setSavedStoreSerial] = useState("")
  
  const { setSelectedOrganization } = useOrganizationStore()
  
  // 세션 만료 알림 체크 및 저장된 사업장명 로드
  useEffect(() => {
    const sessionExpired = localStorage.getItem('sessionExpired');
    if (sessionExpired) {
      localStorage.removeItem('sessionExpired');
      setError("로그인 유효시간이 만료되었습니다. 다시 로그인해주세요.");
    }
    
    // 저장된 사업장명 로드
    const storedStoreName = localStorage.getItem('userStoreName');
    const storedStoreSerial = localStorage.getItem('userStoreSerial');
    if (storedStoreName) {
      setSavedStoreName(storedStoreName);
    }
    if (storedStoreSerial) {
      setSavedStoreSerial(storedStoreSerial);
    }
  }, []);

  const [signupData, setSignupData] = useState({
    username: "",
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    store: "",
  })
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState("")

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    if (error) setError("")
  }

  const handleSignupInputChange = (field, value) => {
    setSignupData((prev) => ({
      ...prev,
      [field]: value,
    }))
    if (signupError) setSignupError("")
  }

  const handleSignupSubmit = async (e) => {
    e.preventDefault()
    setSignupLoading(true)
    setSignupError("")

    // 유효성 검사
    if (!signupData.username.trim()) {
      setSignupError("사용자 ID를 입력해주세요.")
      setSignupLoading(false)
      return
    }

    if (!signupData.name.trim()) {
      setSignupError("이름을 입력해주세요.")
      setSignupLoading(false)
      return
    }

    if (!signupData.email.trim()) {
      setSignupError("이메일을 입력해주세요.")
      setSignupLoading(false)
      return
    }

    if (!signupData.password.trim()) {
      setSignupError("비밀번호를 입력해주세요.")
      setSignupLoading(false)
      return
    }

    if (signupData.password !== signupData.confirmPassword) {
      setSignupError("비밀번호가 일치하지 않습니다.")
      setSignupLoading(false)
      return
    }

    try {
      // 시뮬레이션 딜레이
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 회원가입 성공 처리
      alert(`${signupData.name}님, 회원가입이 완료되었습니다! 로그인해주세요.`)

      // 폼 초기화 및 모달 닫기
      setSignupData({
        username: "",
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        store: "",
      })
      setIsSignupModalOpen(false)
    } catch (err) {
      setSignupError("회원가입 중 오류가 발생했습니다.")
    } finally {
      setSignupLoading(false)
    }
  }

  const getOrganizationByUserId = async (userId, token) => {
    const { getOrganizationListPaginated } = await import("@/api/organization")
    const { setAxiosToken } = await import("@/api/axios_util")
    setAxiosToken(token)
    var resList = await getOrganizationListPaginated(0, 1000, "createdAt,desc", userId)
    return resList?.content.find(item => item.ownerUserId === userId)
  }

  const getOrganizationByOrganizationId = async (organizationId, token) => {
    const { getOrganization } = await import("@/api/organization")
    const { setAxiosToken } = await import("@/api/axios_util")
    setAxiosToken(token)
    var res = await getOrganization(organizationId)
    return res
  }

  // 기본 사업장 정보 가져오기
  const getDefaultOrganization = async (token) => {
    const defaultOrgId = getDefaultOrgId()
    console.log('기본 사업장 ID로 정보 가져오기:', defaultOrgId)
    
    try {
      const { getOrganization } = await import("@/api/organization")
      const { setAxiosToken } = await import("@/api/axios_util")
      setAxiosToken(token)
      const res = await getOrganization(defaultOrgId)
      console.log('기본 사업장 정보:', res)
      return res
    } catch (err) {
      console.error('기본 사업장 정보 로드 실패:', err)
      throw err
    }
  }

  // 사업장명 모달 표시 여부 확인 (organization의 active 상태가 false일 때만 표시)
  const shouldShowStoreNameModal = (store) => {
    // store가 없거나 active가 true이면 모달을 표시하지 않음
    if (!store || store.active === true) {
      return false
    }
    // active가 false이거나 undefined이면 모달 표시
    return true
  }

  // 사업장명 모달 처리 함수들
  const handleStoreNameConfirm = async (storeName, storeSerial) => {
    if (!pendingLoginData) return

    setIsStoreNameLoading(true)
    
    try {
      const { username, role, token, userId, userData } = pendingLoginData
      
      // 서버에 사업장명 업데이트
      if (pendingLoginData.store?.id) {
        const { updateOrganization } = await import("@/api/organization")
        const { setAxiosToken } = await import("@/api/axios_util")
        setAxiosToken(token)
        
        // 사업장 정보 업데이트 (이름만 변경)
        const updateData = {
          name: storeName,
          plcSerial: storeSerial,
          description: pendingLoginData.store.description || '',
          address: pendingLoginData.store.address || '',
          detailAddress: pendingLoginData.store.detailAddress || '',
          tel: pendingLoginData.store.tel || '',
          registrationNumber: pendingLoginData.store.registrationNumber || '',
          ownerUserId: pendingLoginData.store.ownerUserId || userId,
          deviceIds: pendingLoginData.store.deviceIds || [],
          local: pendingLoginData.store.local || true
        }
        
        const updatedStore = await updateOrganization(pendingLoginData.store.id, updateData)
        console.log('사업장명 업데이트 완료:', updatedStore)
        
        // 업데이트된 사업장 정보를 organizationStore에 설정
        setSelectedOrganization(updatedStore)
        
        // 업데이트된 사업장 정보로 로그인 완료
        onLogin(username, role, token, updatedStore, userId, userData)
      } else {
        // 사업장 ID가 없는 경우 기존 로직 사용
        const storeWithCustomName = {
          id: 'custom',
          name: storeName,
          ownerUserId: userId,
          ...pendingLoginData.store
        }
        
        // 사업장명을 localStorage에 저장
        localStorage.setItem('userStoreName', storeName)
        localStorage.setItem('userStoreSerial', storeSerial)
        localStorage.setItem('userStoreData', JSON.stringify(storeWithCustomName))
        
        // 사업장 정보를 전역 상태에 저장
        setSelectedOrganization(storeWithCustomName)
        
        // 로그인 완료
        onLogin(username, role, token, storeWithCustomName, userId, userData)
      }
      
      // 모달 닫기
      setIsStoreNameModalOpen(false)
      setPendingLoginData(null)
      
    } catch (err) {
      console.error('사업장명 처리 중 오류:', err)
      setError('사업장명 업데이트 중 오류가 발생했습니다.')
    } finally {
      setIsStoreNameLoading(false)
    }
  }

  const handleStoreNameModalClose = () => {
    setIsStoreNameModalOpen(false)
    setPendingLoginData(null)
    setIsStoreNameLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (!formData.username.trim()) {
      setError("사용자명을 입력해주세요.")
      setIsLoading(false)
      return
    }

    if (!formData.password.trim()) {
      setError("비밀번호를 입력해주세요.")
      setIsLoading(false)
      return
    }

    try {
      var res = await login(formData.username, formData.password)

      if (res.status !== 200) {
        setError("로그인 중 오류가 발생했습니다.")
        return
      }

      const userId = res.data.data.id
      const role = res.data.data.role
      const token = res.headers.authorization
      const userData = res.data.data // 전체 사용자 정보
      const organizationId = userData.organizationId

      if (role === "ROLE_ADMIN") {
        // 관리자는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_ADMIN 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "admin",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'admin', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_USER") {
        // 사용자는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_USER 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "user",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'user', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_HANZEON") {
        // 한전은 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_HANZEON 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "han",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'han', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_OWNER") {
        // 오너는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_OWNER 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "owner",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'owner', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_ENGINEER") {
        // 엔지니어는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_ENGINEER 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "engineer",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'engineer', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_ADMIN_OWNER") {
        // 관리자급 오너는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_ADMIN_OWNER 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "admin_owner",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'admin_owner', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_ADMIN_ENGINEER") {
        // 관리자급 엔지니어는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_ADMIN_ENGINEER 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "admin_engineer",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'admin_engineer', token, store, userId, userData)
        }
      }
      else if (role === "ROLE_ADMIN_USER") {
        // 관리자급 유저는 사업장명 입력 모달 표시 (active가 false일 때만)
        var store = null
        try {
          store = await getDefaultOrganization(token)
          console.log("ROLE_ADMIN_USER 로그인 - 기본 사업장 정보 로드:", store)
        } catch (err) {
          console.error("기본 사업장 정보 로드 실패")
        }
        
        // organization의 active 상태가 false일 때만 모달 표시
        if (shouldShowStoreNameModal(store)) {
          setPendingLoginData({
            username: formData.username,
            role: "admin_user",
            token: token,
            userId: userId,
            userData: userData,
            store: store
          })
          setIsStoreNameModalOpen(true)
        } else {
          // active가 true이면 바로 로그인 완료
          setSelectedOrganization(store)
          onLogin(formData.username, 'admin_user', token, store, userId, userData)
        }
      }
      else {
        setError("로그인 중 오류가 발생했습니다.")
      }

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true")
      }

/*
      await new Promise((resolve) => setTimeout(resolve, 1000))
      // 관리자 계정 체크
      if (formData.username === "admin" && formData.password === "admin") {
        onLogin(formData.username, "admin")
      }
      // 유저 계정 체크 (user1~user5)
      else if (
        ["user1", "user2", "user3", "user4", "user5"].includes(formData.username) &&
        formData.password === "user"
      ) {
        onLogin(formData.username, "user")
      }
      else if (formData.username === "han" && formData.password === "han"){
        onLogin(formData.username, "han")
      }
      else {
        setError("사용자명 또는 비밀번호가 올바르지 않습니다.")
      } */
    } catch (err) {
      if (err.status === 401) {
        setError("사용자명 또는 비밀번호가 올바르지 않습니다.")
      }
      else {
        setError("로그인 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-auto lg:overflow-hidden">
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-50 hidden lg:block">
        <Button
          onClick={toggleTheme}
          variant="outline"
          size="icon"
          className="w-12 h-12 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 hover:bg-white/90 dark:hover:bg-slate-700/80 transition-all duration-300 shadow-lg hover:shadow-xl group"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-yellow-500 group-hover:text-yellow-400 transition-colors duration-300" />
          ) : (
            <Moon className="h-5 w-5 text-slate-600 group-hover:text-slate-700 transition-colors duration-300" />
          )}
        </Button>
      </div>

      {/* Enhanced header with logo */}
      {/*<div className="relative z-10 p-8">*/}
      {/*  <div className="flex items-center justify-center lg:justify-start">*/}
      {/*    <div className="flex items-center gap-3">*/}
      {/*      <img src="/iEMS_logo.png" alt="iEMS Logo" className="h-14 object-contain opacity-90" />*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</div>*/}

      <div className="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-8 flex flex-col">
        {/* Main Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-12 items-center pt-12 pb-15">
          {/* Left Side - Feature Description */}
          <div className="flex flex-col justify-end h-full space-y-12 order-2 lg:order-1">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-800 dark:text-white mb-6 leading-tight">
                지능형 에너지 관리 시스템
              </h2>
              <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed">
                차세대 스마트 에너지 솔루션으로 미래를 준비하세요.
                <br />
                효율적인 에너지 관리와 최적화된 제어 시스템을 제공합니다.
              </p>
            </div>

            {/* Enhanced Key Features */}
            <div className="grid grid-cols-1 gap-10 max-w-6xl mx-auto">
              <div className="group flex flex-col lg:flex-row items-center gap-8 p-5 bg-white/80 dark:bg-slate-800/80 dark:backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/20 dark:border-slate-700/50">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-blue-500/25 transition-all duration-500 group-hover:scale-110">
                  <Battery className="h-10 w-10 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 text-center lg:text-left">
                    지능형 수요 관리
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-base text-center lg:text-left">
                    전력거래소의 수요감축 신호에 응답하여 자동 제어할 수 있는 DR 솔루션을 제공합니다.
                  </p>
                </div>
              </div>

              <div className="group flex flex-col lg:flex-row items-center gap-8 p-5 bg-white/80 dark:bg-slate-800/80 dark:backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/20 dark:border-slate-700/50">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-green-500/25 transition-all duration-500 group-hover:scale-110">
                  <Leaf className="h-10 w-10 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300 text-center lg:text-left">
                    에너지 통합 관리
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-base text-center lg:text-left">
                    사용자가 손쉽게 에너지 사용을 확인하고, 피크관리를 할 수 있는 웹페이지입니다.
                  </p>
                </div>
              </div>

              <div className="group flex flex-col lg:flex-row items-center gap-8 p-5 bg-white/80 dark:bg-slate-800/80 dark:backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border border-white/20 dark:border-slate-700/50">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl group-hover:shadow-purple-500/25 transition-all duration-500 group-hover:scale-110">
                  <Building className="h-10 w-10 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300 text-center lg:text-left">
                    중앙 관제 시스템
                  </h3>
                  <p className="text-gray-600 dark:text-slate-300 leading-relaxed text-base text-center lg:text-left">
                    중앙 관제 센터의 실시간 모니터링으로 최적의 서비스를 제공합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Login Card */}
          <div className="flex flex-col h-full items-center justify-center lg:justify-end order-1 lg:order-2">
            <div className="flex flex-col justify-end w-full h-full px-0 lg:px-16">
            <div className="flex items-center lg:items-end justify-center lg:justify-stert mb-15">
              <img src={theme === "dark" ? "/iems_logo_w.png" : "/iEMS_logo.png"} alt="iEMS Logo" className="h-12 lg:h-14 object-contain opacity-90" />
              <span className="text-gray-700 dark:text-slate-300 text-[10px] md:text-[12px] lg:text-[14px] flex h-full items-end">
                Intelligent Energy
                <br/>
                Management System
              </span>
            </div>
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-0 shadow-2xl rounded-3xl overflow-hidden w-full border border-white/20 dark:border-slate-700/50">
              <CardContent className="p-4 lg:p-10">
                <div className="text-center mb-2">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                    {"시스템 접속\n"}
                  </h2>
                  <p className="text-gray-600 dark:text-slate-300">시스템에 로그인하세요</p>
                </div>

                  {error && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl mb-1">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                    </div>
                  )}
                  {/*{!error && (*/}
                  {/*  <div className="flex items-center p-3 rounded-2xl border border-white mb-1 dark:text-white">*/}
                  {/*    <AlertCircle className="h-5 w-5 text-white flex-shrink-0" />*/}
                  {/*  </div>*/}
                  {/*)}*/}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-6">
                    <div>
                      <Input
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder="아이디"
                        className="h-14 bg-gray-50/80 dark:bg-slate-700/50 backdrop-blur-sm border-2 border-gray-200/50 dark:border-slate-600/50 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all duration-300 text-lg shadow-sm"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="relative">
                      <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="비밀번호"
                        className="h-14 bg-gray-50/80 dark:bg-slate-700/50 backdrop-blur-sm border-2 border-gray-200/50 dark:border-slate-600/50 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-700 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all duration-300 text-lg pr-14 shadow-sm"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-slate-600/50 backdrop-blur-sm"
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} />
                      <span className="text-gray-600 dark:text-slate-300 text-sm">로그인 유지</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="link"
                        className="text-gray-600 dark:text-slate-300 text-sm cursor-pointer"
                        onClick={() => setIsPasswordResetModalOpen(true)}
                      >
                        비밀번호 찾기
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-14 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-lg shadow-xl hover:shadow-2xl"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Login</span>
                      </div>
                    ) : (
                      "Login"
                    )}
                  </Button>

                  {/* <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => setIsSignupModalOpen(true)}
                      className="text-blue-600 hover:text-blue-700 text-lg font-medium hover:underline transition-colors"
                    >
                      회원가입
                    </button>
                  </div> */}
                </form>

                {/* Enhanced Demo Account Info */}
                {/* <div className="mt-10 p-6 bg-gradient-to-br from-gray-50/80 to-gray-100/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-800">데모 계정</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <span className="text-gray-600 font-medium">관리자</span>
                      <code className="text-sm font-mono bg-gray-100/80 backdrop-blur-sm px-3 py-2 rounded-lg text-gray-800 font-semibold border border-gray-200/50">
                        admin / admin
                      </code>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <span className="text-gray-600 font-medium">사용자</span>
                      <code className="text-sm font-mono bg-gray-100/80 backdrop-blur-sm px-3 py-2 rounded-lg text-gray-800 font-semibold border border-gray-200/50">
                        user1~5 / user
                      </code>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <span className="text-gray-600 font-medium">한전</span>
                      <code className="text-sm font-mono bg-gray-100/80 backdrop-blur-sm px-3 py-2 rounded-lg text-gray-800 font-semibold border border-gray-200/50">
                        han / han
                      </code>
                    </div>
                  </div>
                </div> */}
                <div className="space-y-4"></div>
              </CardContent>
            </Card>
            </div>
          </div>
        </div>

        {/* Simple Footer */}
        <div className="flex-shrink-0">
          <Footer style="pb-15" />
        </div>
      </div>

      {/* Signup Modal */}
      <Dialog open={isSignupModalOpen} onOpenChange={setIsSignupModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white text-center">회원가입</DialogTitle>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleSignupSubmit}>
            {signupError && (
              <div className="flex items-center gap-4 p-5 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 rounded-2xl">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-800/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-red-700 dark:text-red-300 font-medium">{signupError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username" className="text-gray-700 dark:text-slate-300 font-semibold">
                  사용자 ID
                </Label>
                <Input
                  id="signup-username"
                  placeholder="사용자 ID를 입력하세요"
                  className="h-12 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all duration-200 dark:text-white"
                  value={signupData.username}
                  onChange={(e) => handleSignupInputChange("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-gray-700 dark:text-slate-300 font-semibold">
                  이름
                </Label>
                <Input
                  id="signup-name"
                  placeholder="이름을 입력하세요"
                  className="h-12 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 transition-all duration-200 dark:text-white"
                  value={signupData.name}
                  onChange={(e) => handleSignupInputChange("name", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-gray-700 dark:text-slate-300 font-semibold">
                이메일
              </Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="이메일을 입력하세요"
                className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                value={signupData.email}
                onChange={(e) => handleSignupInputChange("email", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone" className="text-gray-700 dark:text-slate-300 font-semibold">
                전화번호
              </Label>
              <Input
                id="signup-phone"
                placeholder="전화번호를 입력하세요"
                className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                value={signupData.phone}
                onChange={(e) => handleSignupInputChange("phone", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-gray-700 dark:text-slate-300 font-semibold">
                비밀번호
              </Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                value={signupData.password}
                onChange={(e) => handleSignupInputChange("password", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password" className="text-gray-700 dark:text-slate-300 font-semibold">
                비밀번호 확인
              </Label>
              <Input
                id="signup-confirm-password"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-200"
                value={signupData.confirmPassword}
                onChange={(e) => handleSignupInputChange("confirmPassword", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-store" className="text-gray-700 dark:text-slate-300 font-semibold">
                희망 담당 사업장 (선택사항)
              </Label>
              <Select>
                <SelectTrigger className="h-12 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-400">
                  <SelectValue placeholder="사업장 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="강남점">강남점</SelectItem>
                  <SelectItem value="홍대점">홍대점</SelectItem>
                  <SelectItem value="부산점">부산점</SelectItem>
                  <SelectItem value="대구점">대구점</SelectItem>
                  <SelectItem value="인천점">인천점</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-xl p-4">
              <p className="text-blue-800 dark:text-blue-300 font-medium">
                💡 회원가입 완료 후 바로 로그인하여 시스템을 이용하실 수 있습니다.
              </p>
            </div>

            <div className="flex gap-3 pt-6">
              <Button
                type="submit"
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl font-semibold transition-all duration-200"
                disabled={signupLoading}
              >
                {signupLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>가입 중...</span>
                  </div>
                ) : (
                  "회원가입"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-xl font-semibold transition-all duration-200 dark:text-white"
                onClick={() => setIsSignupModalOpen(false)}
              >
                취소
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

             {/* 비밀번호 찾기 모달 */}
      <PasswordResetModal open={isPasswordResetModalOpen} onOpenChange={setIsPasswordResetModalOpen} />
      
      {/* 사업장명 입력 모달 */}
      <StoreNameModal
        isOpen={isStoreNameModalOpen}
        onClose={handleStoreNameModalClose}
        onConfirm={handleStoreNameConfirm}
        initialStoreName={savedStoreName || pendingLoginData?.store?.name || ""}
        initialStoreSerial={savedStoreSerial || pendingLoginData?.store?.plcSerial || ""}
        isLoading={isStoreNameLoading}
      />
    </div>
  )
}
