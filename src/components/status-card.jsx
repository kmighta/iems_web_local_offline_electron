export default function StatusCard({ value, label, icon: Icon, trend, trendValue, color = "blue" }) {
  const colorClasses = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20",
      border: "border-blue-200 dark:border-blue-700",
      icon: "bg-blue-500 text-white",
      text: "text-blue-700 dark:text-blue-300",
      value: "text-blue-900 dark:text-blue-100",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20",
      border: "border-green-200 dark:border-green-700",
      icon: "bg-green-500 text-white",
      text: "text-green-700 dark:text-green-300",
      value: "text-green-900 dark:text-green-100",
    },
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/20",
      border: "border-orange-200 dark:border-orange-700",
      icon: "bg-orange-500 text-white",
      text: "text-orange-700 dark:text-orange-300",
      value: "text-orange-900 dark:text-orange-100",
    },
  }

  const classes = colorClasses[color]

  return (
    <div
      className={`${classes.bg} ${classes.border} border rounded-2xl p-6 h-32 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-${color}-500/10`}
    >
      {/* 상단 영역 - 아이콘과 라벨 */}
      <div className="flex items-center gap-3">
        <div className={`${classes.icon} p-2 rounded-xl shadow-sm flex-shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`text-sm font-medium ${classes.text} truncate`}>{label}</span>
      </div>

      {/* 하단 영역 - 값과 트렌드 */}
      <div className="flex items-end justify-between">
        <div className={`text-2xl font-bold ${classes.value} leading-none`}>{value}</div>
        {trend && (
          <div className="flex items-center gap-1">
            <span
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                trend === "up" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
              }`}
            >
              {trend === "up" ? "↗" : "↘"} {trendValue}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
