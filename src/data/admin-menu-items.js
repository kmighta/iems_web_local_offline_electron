import { BarChart3, Users, Building, Cpu, Bell, Megaphone, MessageSquare, Home } from "lucide-react"

export const adminMenuItems = [
  { name: "홈", icon: Home, href: "/admin" },
  { name: "회원관리", icon: Users, href: "/admin/users" },
  { name: "사업장관리", icon: Building, href: "/admin/stores" },
  { name: "알림관리", icon: Bell, href: "/admin/notifications" },
  { name: "공지사항", icon: Megaphone, href: "/admin/notices" },
  { name: "1:1 문의", icon: MessageSquare, href: "/admin/inquiries" },
  // { name: "iEMU 관리", icon: Cpu, href: "/admin/iemu" },
]
