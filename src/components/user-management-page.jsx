import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  Search,
  X,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Shield,
  User,
  Mail,
  Phone,
  Calendar, Building,
  Loader2,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Pagination from "./pagination"
import { createUser, deleteUser, getUserList, adminUpdateUser, getUserInfo } from "@/api/user"
import { getOrganizationList } from "@/api/organization"
import UserModal from "./UserModal"
import { getRoleName } from "@/utils/userRole"
import { useAuth } from "@/router/router"
import { useNavigate } from "react-router-dom"

export default function UserManagementPage() {
  const { userRole, currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [currentUserOrganizationId, setCurrentUserOrganizationId] = useState(null)
  const [newUserRole, setNewUserRole] = useState("")
  const [newUserStatus, setNewUserStatus] = useState("")
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [detailUser, setDetailUser] = useState(null)
  const [isStoreListModalOpen, setIsStoreListModalOpen] = useState(false)
  const [selectedUserStores, setSelectedUserStores] = useState([])
  const [organizations, setOrganizations] = useState([])
  const itemsPerPage = 10

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      //user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoleName(user.role)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.assignedStore && user.assignedStore?.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const totalItems = filteredUsers.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      var userList = await getUserList()
      setUsers(userList.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt.split("T")[0],
        lastLogin: user.lastLogin ? user.lastLogin.split("T")[0] : "미로그인",
        assignedStore: user.organizationName || "미할당",
        organizationNames: user.organizationNames || [],
        status: user.isActivated ? "활성" : "비활성",
      })))
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCurrentUserInfo = async () => {
    if (userRole === "owner") {
      try {
        const userInfo = await getUserInfo()
        setCurrentUserOrganizationId(userInfo.organizationId)
      } catch (error) {
        console.error("Failed to fetch current user info:", error)
      }
    }
  }

  const fetchOrganizations = async () => {
    try {
      const orgList = await getOrganizationList()
      setOrganizations(orgList)
    } catch (error) {
      console.error("Failed to fetch organizations:", error)
    }
  }

  const handleNavigateToStore = (storeName) => {
    // 사업장 이름으로 해당 사업장의 ID 찾기
    const organization = organizations.find(org => org.name === storeName)
    if (organization) {
      // 모달 닫기
      setIsStoreListModalOpen(false)
      // 해당 사업장의 모니터링 페이지로 이동
      navigate(`/admin/stores/${organization.id}/monitoring`)
    } else {
      console.error("사업장에 대한 권한이 없습니다.", storeName)
      alert("사업장에 대한 권한이 없습니다.")
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchCurrentUserInfo()
    fetchOrganizations()
  }, [])

  const getStatusConfig = (status) => {
    switch (status) {
      case "활성":
        return {
          badge: "bg-green-100 text-green-700",
          icon: UserCheck,
        }
      case "비활성":
        return {
          badge: "bg-gray-100 text-gray-700",
          icon: User,
        }
      case "정지":
        return {
          badge: "bg-red-100 text-red-700",
          icon: UserX,
        }
      default:
        return {
          badge: "bg-gray-100 text-gray-700",
          icon: User,
        }
    }
  }

  const getRoleConfig = (role) => {
    switch (role) {
      case "ROLE_ADMIN":
        return {
          badge: "bg-blue-100 text-blue-700",
          icon: Shield,
        }
      case "ROLE_USER":
        return {
          badge: "bg-purple-100 text-purple-700",
          icon: User,
        }
      case "ROLE_HANZEON":
        return {
          badge: "bg-red-100 text-red-700",
          icon: User,
        }
      default:
        return {
          badge: "bg-gray-100 text-gray-700",
          icon: User,
        }
    }
  }

  const handleStatusChange = (userId, newStatus) => {
    setUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)))
  }

  const handleDeleteUser = async (userId) => {
    if (confirm("정말로 이 사용자를 삭제하시겠습니까?")) {
      try {
        await deleteUser(userId)
        alert("사용자 삭제에 성공했습니다.")
      } catch (error) {
        alert("사용자 삭제에 실패했습니다.")
        console.error(error)
        return
      }

      fetchUsers()
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleShowStores = (stores) => {
    setSelectedUserStores(stores)
    setIsStoreListModalOpen(true)
  }

  const renderStoreCell = (user) => {
    const stores = user.organizationNames || []
    
    if (stores.length === 0) {
      return <span className="text-sm font-medium text-gray-900 dark:text-white">미할당</span>
    }
    
    if (stores.length === 1) {
      return (
        <button
          onClick={() => handleShowStores(stores)}
          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
        >
          {stores[0]}
        </button>
      )
    }
    
    return (
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => handleShowStores(stores)}
          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
        >
          {stores[0]}
        </button>
        <button
          onClick={() => handleShowStores(stores)}
          className="text-xs px-2 py-1 bg-blue-600 dark:bg-green-600 text-white dark:text-white rounded-full  transition-colors cursor-pointer"
        >
          외 {stores.length - 1}개
        </button>
      </div>
    )
  }

  const handleAddUser = async (e) => {
    e.preventDefault()

    var user = {
      name: e.target.name.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      role: newUserRole,
      isActivated: newUserStatus === "활성" ? true : false,
      password: e.target.password.value,
    }

    if (user.name === "" || user.email === "" || user.phone === "" || user.role === "" || user.password === "") {
      alert("모든 필드를 입력해주세요.")
      return
    }

    try {
      var res = await createUser(user)
    } catch (error) {
      alert("사용자 추가에 실패했습니다.")
      console.error(error)
      return
    }

    setIsAddUserModalOpen(false)
    setNewUserRole("")
    setNewUserStatus("")
    fetchUsers()
  }

  return (
    <div className="space-y-6 p-5 max-w-[80rem] m-auto">
      <div className="md:flex items-center space-x-3 mb-4 hidden">
        <Users className="h-6 w-6 text-blue-600 dark:text-green-600" />
        <p className="font-bold text-[28px] text-gray-900 dark:text-white">회원관리</p>
      </div>
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <Input
            type="text"
            placeholder="이름, 이메일, 연락처, 역할로 검색..."
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
          className="bg-blue-600 dark:bg-green-600 dark:hover:bg-green-700 text-white flex items-center gap-2"
          onClick={() => setIsAddUserModalOpen(true)}
          disabled={userRole === "admin_engineer" || userRole === "admin_user"}
        >
          <Plus className="h-4 w-4" />새 사용자 추가
        </Button>
      </div>

      {/* Search Results */}
      {searchTerm && (
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            "{searchTerm}" 검색 결과: <span className="font-medium">{filteredUsers.length}명</span>
            {filteredUsers.length > itemsPerPage && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                (페이지 {currentPage}/{totalPages})
              </span>
            )}
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 !p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-white">전체 사용자</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">{filteredUsers.length}</p>
              </div>
              <Users className="h-5 w-5 text-gray-400 dark:text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 !p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-white">활성 사용자</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {filteredUsers.filter((user) => user.status === "활성").length}
                </p>
              </div>
              <UserCheck className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 !p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-white">관리자</p>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  {filteredUsers.filter((user) => user.role === "ROLE_ADMIN" || user.role === "ROLE_ADMIN_OWNER" || user.role === "ROLE_ADMIN_ENGINEER" || user.role === "ROLE_ADMIN_USER").length}
                </p>
              </div>
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* <Card className="border border-gray-200 dark:border-slate-700 p-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-400">정지된 사용자</p>
                <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {filteredUsers.filter((user) => user.status === "정지").length}
                </p>
              </div>
              <UserX className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Users Table */}
      <Card className="border border-gray-200 dark:border-slate-700 dark:bg-slate-800/70 pb-2 pt-0">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">데이터를 불러오는 중...</h3>
              <p className="text-gray-600 dark:text-slate-400">잠시만 기다려주세요.</p>
            </div>
          ) : currentUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-gray-400 dark:text-slate-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">검색 결과가 없습니다</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-4">"{searchTerm}"와 일치하는 사용자를 찾을 수 없습니다.</p>
              <Button variant="outline" onClick={() => setSearchTerm("")} className="dark:text-white">
                검색 초기화
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-slate-600">
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[60px] px-4 py-4">순번</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-left min-w-[200px] px-4 py-4">사용자</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[100px] px-4 py-4">역할</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[100px] px-4 py-4">상태</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-left min-w-[220px] px-4 py-4">연락처</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[120px] px-4 py-4">사업장</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-left min-w-[180px] px-4 py-4">마지막 로그인</TableHead>
                      <TableHead className="font-medium text-gray-700 dark:text-slate-300 text-center min-w-[120px] px-4 py-4">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentUsers.map((user, index) => {
                      const globalIndex = totalItems - (startIndex + index);
                      const statusConfig = getStatusConfig(user.status)
                      const roleConfig = getRoleConfig(user.role)
                      const StatusIcon = statusConfig.icon
                      const RoleIcon = roleConfig.icon

                      return (
                        <TableRow key={user.id} className="border-b border-gray-100 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                          <TableCell className="px-4 py-3 text-center">
                            <span className="font-medium text-gray-900 dark:text-white">{globalIndex}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="h-5 w-5 text-gray-600 dark:text-slate-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">{user.name}</div>
                                {/* <div className="text-sm text-gray-500 dark:text-slate-400 truncate">@{user.username}</div> */}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Badge className={`${roleConfig.badge} text-xs px-2 py-1 inline-flex items-center`}>
                                <RoleIcon className="h-3 w-3 mr-1" />
                                {getRoleName(user.role)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <div className="flex justify-center">
                              <Badge className={`${statusConfig.badge} text-xs px-2 py-1 inline-flex items-center`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {user.status}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                <span className="text-gray-900 dark:text-white truncate">{user.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                <span className="text-gray-600 dark:text-slate-400 truncate">{user.phone}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            {renderStoreCell(user)}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                                <span className="text-gray-900 dark:text-white truncate">{user.lastLogin}</span>
                              </div>
                              <div className="text-xs text-gray-500 dark:text-slate-400 truncate">가입: {user.createdAt}</div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-transparent dark:text-white" onClick={() => { setDetailUser(user); setIsDetailModalOpen(true) }}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 bg-transparent dark:text-white" 
                                onClick={() => { setSelectedUser(user); setIsEditUserModalOpen(true) }}
                                disabled={userRole === "admin_owner" || userRole === "admin_engineer" || userRole === "admin_user"}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              {user.role !== "ROLE_ADMIN" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 dark:text-red-400 bg-transparent"
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={userRole === "admin_owner" || userRole === "admin_engineer" || userRole === "admin_user"}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
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

      {/* 새 사용자 추가 모달 */}
      <UserModal
        open={isAddUserModalOpen}
        onOpenChange={setIsAddUserModalOpen}
        mode="add"
        currentUserRole={userRole}
        onSubmit={async (form) => {
          if (!form.name || !form.email || !form.phone || !form.role || !form.password) {
            alert("모든 필드를 입력해주세요.")
            return
          }
          try {
            const userData = {
              name: form.name,
              email: form.email,
              phone: form.phone,
              role: form.role,
              isActivated: form.status === "활성",
              password: form.password,
            }
            
            // 사용자가 선택한 organizationId 추가 (admin, owner, admin_owner 모두 지원)
            if ((userRole === "admin" || userRole === "owner" || userRole === "admin_owner") && form.organizationIds && form.organizationIds.length > 0) {
              userData.organizationIds = form.organizationIds
            } else if (form.organizationId) {
              userData.organizationId = form.organizationId
            }
            // ROLE_OWNER가 ROLE_ENGINEER, ROLE_USER를 생성할 때 자동으로 organizationId 추가 (기존 로직 유지)
            else if (userRole === "owner" && (form.role === "ROLE_ENGINEER" || form.role === "ROLE_USER") && currentUserOrganizationId) {
              userData.organizationId = currentUserOrganizationId
            }
            
            await createUser(userData)
            alert("사용자 추가에 성공했습니다.")
          } catch (error) {
            alert("사용자 추가에 실패했습니다.")
            return
          }
          setIsAddUserModalOpen(false)
          fetchUsers()
        }}
      />

      {/* 사용자 정보 수정 모달 */}
      <UserModal
        open={isEditUserModalOpen}
        onOpenChange={setIsEditUserModalOpen}
        mode="edit"
        initialValues={selectedUser || {}}
        currentUserRole={userRole}
        onSubmit={async (form) => {
          if (!form.name || !form.email || !form.phone || !form.role) {
            alert("모든 필드를 입력해주세요.")
            return
          }
          try {
            const userData = {
              id: selectedUser.id,
              name: form.name,
              email: form.email,
              phone: form.phone,
              role: form.role,
              isActivated: form.status === "활성",
              password: form.password || undefined,
            }
            
            // 사용자가 선택한 organizationId 추가 (admin, owner, admin_owner 모두 지원)
            if ((userRole === "admin" || userRole === "owner" || userRole === "admin_owner") && form.organizationIds && form.organizationIds.length > 0) {
              userData.organizationIds = form.organizationIds
            } else if (form.organizationId) {
              userData.organizationId = form.organizationId
            }
            // ROLE_OWNER가 ROLE_ENGINEER, ROLE_USER를 생성할 때 자동으로 organizationId 추가 (기존 로직 유지)
            else if (userRole === "owner" && (form.role === "ROLE_ENGINEER" || form.role === "ROLE_USER") && currentUserOrganizationId) {
              userData.organizationId = currentUserOrganizationId
            }
            
            await adminUpdateUser(userData)
            alert("사용자 정보가 수정되었습니다.")
          } catch (error) {
            alert("사용자 정보 수정에 실패했습니다.")
            return
          }
          setIsEditUserModalOpen(false)
          setSelectedUser(null)
          fetchUsers()
        }}
      />

      {/* 상세보기 모달 */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-2xl dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              사용자 상세 정보
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">이름</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailUser.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">이메일</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailUser.email}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">전화번호</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailUser.phone}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">사업장</Label>
                    <div className="mt-1">
                      {detailUser.organizationNames && detailUser.organizationNames.length > 0 ? (
                        <div className="space-y-1">
                          {detailUser.organizationNames.map((store, index) => (
                            <div key={index} className="text-sm text-gray-900 dark:text-white">
                              {store}
                            </div>
                          ))}
                          {detailUser.organizationNames.length > 1 && (
                            <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              총 {detailUser.organizationNames.length}개 사업장
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-slate-400">미할당</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">역할</Label>
                    <div className="mt-1">
                      <Badge className={getRoleConfig(detailUser.role).badge}>{getRoleName(detailUser.role)}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">상태</Label>
                    <div className="mt-1">
                      <Badge className={getStatusConfig(detailUser.status).badge}>{detailUser.status}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">가입일</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailUser.createdAt}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">마지막 로그인</Label>
                    <div className="mt-1 text-sm text-gray-900 dark:text-white">{detailUser.lastLogin}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 사업장 목록 모달 */}
      <Dialog open={isStoreListModalOpen} onOpenChange={setIsStoreListModalOpen}>
        <DialogContent className="sm:max-w-md dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              할당된 사업장 목록
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {selectedUserStores.map((store, index) => (
              <button
                key={index}
                onClick={() => handleNavigateToStore(store)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors cursor-pointer"
              >
                <Building className="h-4 w-4 text-gray-500 dark:text-slate-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {store}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-slate-400 text-center">
            총 {selectedUserStores.length}개의 사업장에 할당되어 있습니다.
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}