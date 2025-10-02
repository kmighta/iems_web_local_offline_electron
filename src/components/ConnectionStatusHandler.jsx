import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import useSettingsStore from '@/store/settingsStore';
import useConnectionModalStore from '@/store/connectionModalStore';

/**
 * 전역 연결 상태 처리 컴포넌트
 * 모든 페이지에서 웹소켓 연결 상태를 모니터링하고 알림을 표시합니다.
 */
const ConnectionStatusHandler = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 연결 모달 상태 관리
  const { 
    isModalOpen, 
    isRefreshing, 
    refreshAttempted, 
    refreshFailureCount,
    lastRefreshTime,
    openModal, 
    closeModal, 
    startRefresh, 
    finishRefresh, 
    failRefresh 
  } = useConnectionModalStore();

  // admin/stores/** 경로인지 확인 (window.location 사용)
  const isAdminStoresRoute = window.location.pathname.startsWith('/admin/stores/');

  // 컴포넌트 초기화 완료 후 이벤트 리스너 등록
  useEffect(() => {
    // 초기화 완료 표시
    setIsInitialized(true);
  }, []);

  // WebSocket 장치 연결 해제 알림 모달
  useEffect(() => {
    if (!isInitialized) return; // 초기화 완료 전에는 이벤트 처리 안함
    
    const handler = () => {
      try {
        const { connectionState, setConnectionState } = useSettingsStore.getState();
        
        // admin/stores/** 경로가 아니면 모달 표시 안함
        if (!window.location.pathname.startsWith('/admin/stores/')) return;
        
        // 이미 표시된 경우 무시 (1회만 표시)
        if (connectionState.hasShownConnectionLost) return;
        
        // 상태 업데이트
        setConnectionState({ 
          isConnected: false, 
          hasShownConnectionLost: true,
          hasShownConnectionRestored: false  // 재연결 상태 리셋
        });
        
        toast.error("장치 연결 해제", {
          description: '장치와의 연결이 해제되었습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도하세요.'
        });
        openModal(); // 모달 열기
      } catch {}
    };
    window.addEventListener('iemu-connection-lost', handler);
    return () => window.removeEventListener('iemu-connection-lost', handler);
  }, [isInitialized]);

  // WebSocket 장치 재연결 완료 처리
  useEffect(() => {
    if (!isInitialized) return; // 초기화 완료 전에는 이벤트 처리 안함
    
    const handler = () => {
      try {
        const { connectionState, setConnectionState } = useSettingsStore.getState();
        
        // admin/stores/** 경로가 아니면 처리 안함
        if (!window.location.pathname.startsWith('/admin/stores/')) return;
        
        // 이미 표시된 경우 무시
        if (connectionState.hasShownConnectionRestored) return;
        
        // 모달 숨기기 (실패 횟수도 리셋됨)
        closeModal();
        
        // 재연결 완료 토스트 표시
        toast.success("장치 재연결 완료", {
          description: '장치와의 연결이 정상적으로 복구되었습니다.'
        });
        
        // 상태 업데이트
        setConnectionState({ 
          isConnected: true, 
          hasShownConnectionLost: false,  // 연결 해제 상태 리셋
          hasShownConnectionRestored: true 
        });
      } catch {}
    };
    window.addEventListener('iemu-connection-restored', handler);
    return () => window.removeEventListener('iemu-connection-restored', handler);
  }, [isInitialized]);

  // 새로고침 처리 함수
  const handleRefresh = async () => {
    const refreshId = Date.now().toString();
    startRefresh();
    
    // 새로고침 시도 ID를 localStorage에 저장
    localStorage.setItem('refresh-attempt-id', refreshId);
    localStorage.setItem('refresh-attempt-time', Date.now().toString());
    
    // 새로고침 시도
    try {
      window.location.reload();
    } catch (error) {
      console.error('새로고침 실패:', error);
      failRefresh();
    }
  };

  // 페이지 로드 시 새로고침 실패 감지
  useEffect(() => {
    const checkRefreshFailure = () => {
      const refreshAttemptId = localStorage.getItem('refresh-attempt-id');
      const refreshAttemptTime = localStorage.getItem('refresh-attempt-time');
      
      if (refreshAttemptId && refreshAttemptTime) {
        const attemptTime = parseInt(refreshAttemptTime);
        const currentTime = Date.now();
        const timeDiff = currentTime - attemptTime;
        
        console.log('새로고침 체크:', { refreshAttemptId, attemptTime, currentTime, timeDiff });
        
        // 3초 이상 지났으면 새로고침이 실패한 것으로 간주
        if (timeDiff > 3000) {
          console.log('새로고침 실패 감지 - 실패 횟수 증가');
          useConnectionModalStore.getState().failRefresh();
        } else {
          console.log('새로고침 성공 감지 - 실패 횟수 리셋');
          useConnectionModalStore.getState().finishRefresh();
        }
        
        // localStorage에서 제거
        localStorage.removeItem('refresh-attempt-id');
        localStorage.removeItem('refresh-attempt-time');
      }
    };

    // 컴포넌트 마운트 시 체크 (약간의 지연을 두어 새로고침 완료를 기다림)
    setTimeout(checkRefreshFailure, 100);
  }, []);

  // 연결 해제 모달 (admin/stores/** 경로에서만 표시)
  if (!isModalOpen || !window.location.pathname.startsWith('/admin/stores/')) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => {
        // 닫기 버튼으로만 모달 닫기 가능 (배경 클릭으로는 닫기 불가)
      }}></div>
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 w-[90%] max-w-md border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">장치 연결 해제</h3>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          장치와의 연결이 해제되었습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도하세요.
          {refreshAttempted && !isRefreshing && (
            <span className="block mt-2 text-orange-600 dark:text-orange-400 text-xs">
              새로고침을 시도했지만 연결이 복구되지 않았습니다.
              {refreshFailureCount > 1 && (
                <span className="block mt-1 text-red-600 dark:text-red-400 font-semibold">
                  ({refreshFailureCount}번째 시도 실패) 서버 상태를 확인하거나 관리자에게 문의하세요.
                </span>
              )}
            </span>
          )}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button 
            className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" 
            onClick={() => {
              closeModal();
              // 닫기 시에는 hasShownConnectionLost를 true로 유지하여 재표시 방지
              useSettingsStore.getState().setConnectionState({ 
                hasShownConnectionLost: true,  // 닫기 시에도 true 유지
                hasShownConnectionRestored: false 
              });
            }}
          >
            닫기
          </button>
          <button 
            className={`px-3 py-1.5 rounded text-white transition-colors flex items-center gap-2 ${
              isRefreshing 
                ? 'bg-blue-400 cursor-not-allowed' 
                : refreshFailureCount > 2
                  ? 'bg-red-600 hover:bg-red-700'
                  : refreshFailureCount > 0
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-blue-600 hover:bg-blue-700'
            }`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {isRefreshing 
              ? '새로고침 중...' 
              : refreshFailureCount > 2
                ? `재시도 (${refreshFailureCount}회 실패)`
                : refreshFailureCount > 0
                  ? `다시 시도 (${refreshFailureCount}회 실패)`
                  : '새로고침'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatusHandler;
