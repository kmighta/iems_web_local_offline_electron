const getRoleName = (role) => {
  switch (role) {
    case "ROLE_ADMIN":
      return "관리자"
    case "ROLE_USER":
      return "사용자"
    case "ROLE_HANZEON":
      return "한전"
    case "ROLE_OWNER":
      return "사업장 관리자"
    case "ROLE_ENGINEER":
      return "일반관리자"
    case "ROLE_ADMIN_OWNER":
      return "중간관리자"
    case "ROLE_ADMIN_ENGINEER":
      return "설정관리자"
    case "ROLE_ADMIN_USER":
      return "모니터링 관리자"
  }
  return role
}

const getRoleName2 = (role) => {
  switch (role) {
    case "admin":
      return "관리자"
    case "user":
      return "사용자"
    case "han":
      return "한전"
    case "owner":
      return "사업장 관리자"
    case "engineer":
      return "일반관리자"
    case "admin_owner":
      return "중간관리자"
    case "admin_engineer":
      return "설정관리자"
    case "admin_user":
      return "모니터링 관리자"
  }
  return role
}

export { getRoleName, getRoleName2 }