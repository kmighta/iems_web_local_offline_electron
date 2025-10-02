import { Activity, Settings, TrendingUp, FileText, Calendar, Router, AlertCircle, Users, Megaphone, MessageSquare, Bell } from "lucide-react"

 export const menuItems = [
  { name: "모니터링", icon: Activity, href: "/monitoring" },
  { name: "환경설정", icon: Settings, href: "/settings" },
  { name: "최대수요현황", icon: TrendingUp, href: "/peak-demand" },
  { name: "사용량보고서", icon: FileText, href: "/usage-report" },
  // { name: "이벤트", icon: AlertCircle, href: "/events" },
  { name: "알림현황", icon: Bell, href: "/alarms" },
  { name: "시간/휴일설정", icon: Calendar, href: "/schedule" },
  // { name: "연동장치", icon: Router, href: "/devices" },
  { name: "공지사항", icon: Megaphone, href: "/notices" },
  { name: "1:1 문의", icon: MessageSquare, href: "/inquiries" },
  { name: "유저관리", icon: Users, href: "/admin/users" },
  { name: "회원관리", icon: Users, href: "/user-management" },
]
// export const menuItems = [
//   { name: "사용량보고서", icon: FileText, href: "/usage-report" },
// ]
