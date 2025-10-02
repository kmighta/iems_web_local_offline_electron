import AdminDashboardPage from "./admin-dashboard-page"
import UserManagementPage from "./user-management-page"
import StoresListPage from "./stores-management-page"
import IemuManagementPage from "./iemu-management-page"
import EventLogPage from "./event-log-page"
import ProfilePage from "./profile-page"

export default function AdminMainContent({ activeMenu, currentUser, userRole, onStoreSelect }) {
  const renderContent = () => {
    switch (activeMenu) {
      case "홈":
        return <AdminDashboardPage />
      case "회원관리":
        return <UserManagementPage />
      case "사업장관리":
        return <StoresListPage onStoreSelect={onStoreSelect} />
      case "iEMU 관리":
      case "iEMU관리":
        return <IemuManagementPage />
      case "이벤트로그":
        return <EventLogPage />
      case "내 정보":
        return <ProfilePage currentUser={currentUser} userRole={userRole} />
      default:
        return <AdminDashboardPage />
    }
  }

  return (
    <main className="flex-1 overflow-auto bg-gray-50/50 dark:bg-gray-900/50">
      <div className="p-4 sm:p-6">{renderContent()}</div>
    </main>
  )
}
