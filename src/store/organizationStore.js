import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useOrganizationStore = create(
  persist(
    (set, get) => ({
      selectedOrganization: null,
      isLoading: false,
      lastNavigatedPath: null,
      webSocketDisconnectCallback: null, // 웹소켓 해제 콜백 함수
      isWebSocketConnected: false, // 웹소켓 연결 상태
      currentWebSocketUrl: null, // 현재 연결된 웹소켓 URL
      userId: null, // 현재 로그인한 사용자의 ID
      organizationId: null, // 현재 선택된 조직의 ID
      
      // 로딩 상태 설정
      setLoading: (loading) => set({ isLoading: loading }),
      
      // 마지막 탐색 경로 저장
      setLastNavigatedPath: (path) => set({ lastNavigatedPath: path }),
      
      // 사용자 ID 설정
      setUserId: (userId) => {
        console.log('사용자 ID 설정:', userId)
        set({ userId })
      },
      
      // 조직 ID 설정
      setOrganizationId: (organizationId) => {
        console.log('조직 ID 설정:', organizationId)
        set({ organizationId })
      },
      
      // 사용자 정보 설정 (로그인 시 사용)
      setUserInfo: (userData) => {
        console.log('사용자 정보 설정:', userData)
        set({ 
          userId: userData.id,
          organizationId: userData.organizationId
        })
      },
      
      // 사용자 정보 초기화 (로그아웃 시 사용)
      clearUserInfo: () => {
        console.log('사용자 정보 초기화')
        set({ 
          userId: null,
          organizationId: null
        })
      },
      
      // 선택된 사업장 설정
      setSelectedOrganization: (organization) => {
        console.log('선택된 사업장 설정:', organization)
        
        // localStorage에도 저장 (AdminLayoutWrapper에서 사용)
        if (organization) {
          localStorage.setItem('lastSelectedOrganization', JSON.stringify(organization));
        } else {
          localStorage.removeItem('lastSelectedOrganization');
        }
        
        set({ 
          selectedOrganization: organization,
          organizationId: organization?.id || null,
          isLoading: false 
        })
      },
      
      // 선택된 사업장 초기화
      clearSelectedOrganization: () => {
        console.log('선택된 사업장 초기화')
        localStorage.removeItem('lastSelectedOrganization');
        set({ 
          selectedOrganization: null,
          isLoading: false,
          lastNavigatedPath: null
          // userId와 organizationId는 유지 (로그인 정보이므로)
        })
      },
      
      // 안전한 네비게이션을 위한 사업장 설정
      setSelectedOrganizationSafe: async (organization, callback) => {
        try {
          set({ isLoading: true })
          console.log('안전한 사업장 설정:', organization)
          
          // 비동기 작업이 필요한 경우 여기서 처리
          await new Promise(resolve => setTimeout(resolve, 0)) // 다음 틱으로 지연
          
          set({ 
            selectedOrganization: organization,
            isLoading: false 
          })
          
          // 콜백 실행
          if (callback && typeof callback === 'function') {
            callback()
          }
        } catch (error) {
          console.error('사업장 설정 오류:', error)
          set({ isLoading: false })
        }
      },
      
      // 현재 사용할 API URL 반환
      getCurrentApiUrl: () => {
        const { selectedOrganization } = get()
        const apiUrl = selectedOrganization?.ipAddress 
          ? `http://${selectedOrganization.ipAddress}/api`
          // : 'http://iems.store/api'
          : '/api'
        console.log('현재 API URL:', apiUrl, 'from organization:', selectedOrganization)
        return apiUrl
      },
      
      // 현재 사용할 WebSocket URL 반환
      getCurrentWsUrl: () => {
        const { selectedOrganization } = get()
        const wsUrl = selectedOrganization?.ipAddress 
          ? `http://${selectedOrganization.ipAddress}`
          : import.meta.env.VITE_PROXY_WEBSOCKET_URL
        console.log('현재 WebSocket URL:', wsUrl, 'from organization:', selectedOrganization)
        return wsUrl
      },

      // 웹소켓 해제 콜백 설정
      setWebSocketDisconnectCallback: (callback) => {
        set({ webSocketDisconnectCallback: callback })
      },

      // 웹소켓 연결 상태 설정
      setWebSocketConnected: (isConnected, wsUrl = null) => {
        set({
          isWebSocketConnected: isConnected,
          currentWebSocketUrl: isConnected ? wsUrl : null
        })
      },

      // 사업장 페이지를 벗어날 때 웹소켓 해제
      disconnectWebSocketOnLeave: () => {
        const { webSocketDisconnectCallback } = get()
        console.log('disconnectWebSocketOnLeave 호출됨, callback 존재:', !!webSocketDisconnectCallback)
        if (webSocketDisconnectCallback && typeof webSocketDisconnectCallback === 'function') {
          console.log('사업장 페이지를 벗어나므로 웹소켓 연결 해제')
          webSocketDisconnectCallback()
          // 연결 상태 초기화
          set({ 
            isWebSocketConnected: false,
            currentWebSocketUrl: null
          })
        }
      },

      // 사업장 페이지를 벗어날 때 모니터링 상태만 초기화 (웹소켓 재시도 로직 유지)
      resetMonitoringOnLeave: () => {
        console.log('사업장 페이지 벗어남 - 모니터링 상태만 초기화 (웹소켓 유지)')
        
        // 웹소켓은 그대로 두고 모니터링 상태만 초기화
        try {
          import('@/store/settingsStore.js').then((module) => {
            const useSettingsStore = module.default
            const { resetMonitoringData } = useSettingsStore.getState()
            if (resetMonitoringData && typeof resetMonitoringData === 'function') {
              console.log('모니터링 상태 초기화 중...')
              resetMonitoringData()
            }
          }).catch((error) => {
            console.error('settingsStore 로드 실패:', error)
          })
        } catch (error) {
          console.error('모니터링 상태 초기화 실패:', error)
        }
        
        console.log('모니터링 상태 초기화 완료')
      },

      // 사업장 페이지를 벗어날 때 모니터링 상태 초기화 (웹소켓은 유지)
      disconnectAndResetOnLeave: () => {
        console.log('사업장 페이지 벗어남 - 모니터링 상태 초기화 시작 (웹소켓 연결 유지)')
        
        // 1. 웹소켓은 그대로 두고 연결 상태만 업데이트
        set({ 
          isWebSocketConnected: false,
        })
        
        // 2. 모니터링 상태 초기화 (동적으로 settingsStore import)
        try {
          import('@/store/settingsStore.js').then((module) => {
            const useSettingsStore = module.default
            const { resetMonitoringData } = useSettingsStore.getState()
            if (resetMonitoringData && typeof resetMonitoringData === 'function') {
              console.log('모니터링 상태 초기화 중...')
              resetMonitoringData()
            }
          }).catch((error) => {
            console.error('settingsStore 로드 실패:', error)
          })
        } catch (error) {
          console.error('모니터링 상태 초기화 실패:', error)
        }
        
        console.log('사업장 페이지 벗어남 처리 완료 (웹소켓 재시도 로직 유지)')
      }
    }),
    {
      name: 'organization-store', // localStorage key
      // selectedOrganization과 lastNavigatedPath만 persist
      partialize: (state) => ({ 
        selectedOrganization: state.selectedOrganization,
        lastNavigatedPath: state.lastNavigatedPath,
        userId: state.userId,
        organizationId: state.organizationId
      }),
      // hydration 완료 시 콜백
      onRehydrateStorage: () => (state) => {
        console.log('Organization store hydration 완료:', state)
        if (state) {
          state.isLoading = false
        }
      }
    }
  )
)

export default useOrganizationStore
