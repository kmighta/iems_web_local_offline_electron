export default function Footer({ style = '' }) {
  return (
    <div className={`text-center py-6 bg-gradient-to-br  border-t border-gray-200/50 dark:border-slate-700 ${style}`}>
      <div className="text-gray-500 dark:text-slate-400 text-sm px-4">
        <span>금호이앤지(주) | Copyright © 2013 KumhoE&G Inc. All rights reserved.</span>
      </div>
    </div>
  )
} 