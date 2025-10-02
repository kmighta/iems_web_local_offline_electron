import {useState, useEffect, Suspense} from 'react'
import { RouterProvider } from 'react-router-dom'
import {AuthProvider} from './router/router'
import useSettingsStore from './store/settingsStore'
import useOrganizationStore from './store/organizationStore'
import { Toaster } from './components/ui/sonner'
import ConnectionStatusHandler from './components/ConnectionStatusHandler'
import './index.css'
import router from "./router/router";
import {ThemeProvider} from "@/components/theme-provider.js";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분 (이전의 cacheTime)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

// 로딩 컴포넌트
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const isSettingLoading = useSettingsStore((state) => state.isSettingLoading);
  const loadingMessage = useSettingsStore((state) => state.loadingMessage);

  // Store 초기화 완료 대기
  useEffect(() => {
    const initializeStores = async () => {
      try {
        // 필요한 경우 여기서 store 초기화 로직 추가
        // 예: await useSettingsStore.persist.rehydrate();
        // 예: await useOrganizationStore.persist.rehydrate();
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Store 초기화 실패:', error);
        setIsInitialized(true); // 에러가 발생해도 앱은 실행되도록
      }
    };

    initializeStores();
  }, []);

  if (!isInitialized) {
    return <LoadingFallback />;
  }

  return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </AuthProvider>
          <Toaster />
          <ConnectionStatusHandler />
          {/* 개발환경에서만 React Query Devtools 표시 */}
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
      </QueryClientProvider>
  )
}

export default App
