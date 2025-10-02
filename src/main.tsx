// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
// import { RouterProvider } from 'react-router-dom'
import './index.css'
// import router from './router/router'
// import { ThemeProvider } from './components/theme-provider'
// import { AuthProvider } from './router/router'
import App from "@/App";

// Tanstack Query 클라이언트 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
      retry: 3, // 3회 재시도
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  //   <ThemeProvider>
  //     <AuthProvider>
  //         <RouterProvider router={router} />
  //     </AuthProvider>
  //   </ThemeProvider>
  // </StrictMode>,
  <QueryClientProvider client={queryClient}>
    <App />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
