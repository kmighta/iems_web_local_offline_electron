import { useEffect, useRef, useContext } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { AuthContext } from '@/router/router';
import { toast } from 'sonner';

// 전역 로그 웹소켓 연결 상태 관리
let globalLogStompClient = null;
let isLogConnecting = false;
let logReconnectAttempts = 0;
const maxLogReconnectAttempts = 5;
let hasShownLogConnectionError = false;

// 전역 연결 해제 함수
const disconnectGlobalLogWebSocket = () => {
  if (globalLogStompClient) {
    console.log('전역 로그 웹소켓 연결 해제 중...');
    globalLogStompClient.deactivate();
    globalLogStompClient = null;
    isLogConnecting = false;
    logReconnectAttempts = 0;
    hasShownLogConnectionError = false;
  }
};

export const useLogWebSocket = () => {
  const { user, userRole } = useContext(AuthContext);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    // 로그인하지 않은 경우 연결하지 않음
    if (!user) {
      console.log('로그인하지 않은 상태이므로 로그 WebSocket 연결을 건너뛰기');
      return;
    }

    // admin 권한이 아닌 경우 연결하지 않음
    if (userRole !== 'admin') {
      console.log('admin 권한이 아니므로 로그 WebSocket 연결을 건너뛰기');
      return;
    }

    // 이미 연결되어 있는 경우 새로운 연결을 만들지 않음
    if (globalLogStompClient && globalLogStompClient.connected) {
      console.log('이미 로그 WebSocket에 연결되어 있어서 새로운 연결 생성하지 않음');
      return;
    }

    // 이미 연결 중인 경우 기다림
    if (isLogConnecting) {
      console.log('이미 로그 WebSocket 연결 중이므로 대기');
      return;
    }

    function connectLogWebSocket() {
      if (isLogConnecting) {
        console.log('이미 로그 WebSocket 연결 시도 중');
        return;
      }

      // 네트워크 연결 상태 확인
      if (!navigator.onLine) {
        console.warn('네트워크 연결이 없습니다. 로그 WebSocket 연결을 건너뜁니다.');
        return;
      }

      isLogConnecting = true;
      const wsLogUrl = `${import.meta.env.VITE_WS_LOG_URL}/ws-sockjs`;

      console.log('로그 WebSocket 연결 시작:', {
        VITE_WS_LOG_URL: import.meta.env.VITE_WS_LOG_URL,
        wsLogUrl,
        user: user?.username
      });

      // URL 유효성 검사
      if (!import.meta.env.VITE_WS_LOG_URL) {
        console.error('VITE_WS_LOG_URL 환경변수가 설정되지 않았습니다.');
        isLogConnecting = false;
        return;
      }

      try {
        const socket = new SockJS(wsLogUrl);
        const stompClient = new Client({
          webSocketFactory: () => socket,
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          debug: (str) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('로그 STOMP Debug:', str);
            }
          },
          onConnect: () => {
            console.log('로그 WebSocket 연결 성공:', wsLogUrl);
            isLogConnecting = false;
            logReconnectAttempts = 0;
            hasShownLogConnectionError = false;
            globalLogStompClient = stompClient;

            // /topic/iEMU-debug-admin 구독
            stompClient.subscribe('/topic/plc-debug-admin', (message) => {
              try {
                console.log('iEMU 디버그 Raw 메시지 수신:', message.body);
                const data = JSON.parse(message.body);
                console.log('iEMU 디버그 파싱된 메시지:', data);
                
                // 전역 이벤트로 PLC 메시지 전달
                window.dispatchEvent(new CustomEvent('websocket-message', {
                  detail: {
                    destination: '/topic/plc-debug-admin',
                    body: message.body
                  }
                }));
                
                // sonner 토스트로 메시지 표시
                const title = `iEMU 디버그 알림 (${data.deviceId || 'Unknown'})`;
                const description = data.log || data.message || '로그 메시지';
                
                toast.success(title, {
                  description: description,
                  duration: 8000,
                });
                
                console.log('토스트 표시 완료:', { title, description });
              } catch (error) {
                console.error('iEMU 디버그 메시지 파싱 오류:', error);
                console.log('Raw message body:', message.body);
                toast.error("iEMU 디버그 알림", {
                  description: message.body,
                  duration: 5000,
                });
              }
            });

            // 연결 성공 시 토스트 표시 (재연결인 경우에만)
            if (logReconnectAttempts > 0) {
              toast.success("로그 연결 복구", {
                description: "로그 서버와의 실시간 통신이 정상적으로 복구되었습니다.",
              });
            }
          },
          onStompError: (frame) => {
            console.error('로그 STOMP 오류:', frame);
            isLogConnecting = false;
            
            if (!hasShownLogConnectionError) {
              hasShownLogConnectionError = true;
              toast.error("로그 WebSocket 연결 오류", {
                description: "로그 서버와의 실시간 통신에 문제가 발생했습니다.",
              });
            }
          },
          onWebSocketError: (error) => {
            console.error('로그 WebSocket 오류:', error);
            isLogConnecting = false;
            
            if (!hasShownLogConnectionError) {
              hasShownLogConnectionError = true;
              toast.error("로그 네트워크 연결 오류", {
                description: "로그 서버와의 네트워크 연결에 문제가 발생했습니다.",
              });
            }
          },
          onWebSocketClose: () => {
            console.log('로그 WebSocket 연결 종료');
            isLogConnecting = false;
            
            if (globalLogStompClient === stompClient) {
              globalLogStompClient = null;
            }

            // 재연결 시도 (로그인된 상태인 경우에만)
            if (user && logReconnectAttempts < maxLogReconnectAttempts) {
              logReconnectAttempts++;
              console.log(`로그 WebSocket 재연결 시도 ${logReconnectAttempts}/${maxLogReconnectAttempts}`);
              
              if (!reconnectTimeoutRef.current) {
                reconnectTimeoutRef.current = setTimeout(() => {
                  reconnectTimeoutRef.current = null;
                  connectLogWebSocket();
                }, 5000);
              }
            } else if (logReconnectAttempts >= maxLogReconnectAttempts) {
              // 최대 재연결 시도 횟수 초과
              if (!hasShownLogConnectionError) {
                hasShownLogConnectionError = true;
                toast.error("로그 연결 실패", {
                  description: `로그 서버 최대 재연결 시도 횟수(${maxLogReconnectAttempts}회)를 초과했습니다.`,
                  duration: 10000
                });
              }
            }
          }
        });

        stompClient.activate();
      } catch (error) {
        console.error('로그 WebSocket 연결 생성 오류:', error);
        isLogConnecting = false;
        
        toast.error("로그 연결 생성 오류", {
          description: "로그 WebSocket 연결을 생성하는 중 오류가 발생했습니다.",
        });
      }
    }

    connectLogWebSocket();

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user, userRole, toast]);

  // 로그아웃 시 연결 해제
  useEffect(() => {
    if (!user && globalLogStompClient) {
      console.log('로그아웃으로 인한 로그 WebSocket 연결 해제');
      disconnectGlobalLogWebSocket();
    }
  }, [user]);

  // admin 권한이 아닌 경우 연결 해제
  useEffect(() => {
    if (user && userRole !== 'admin' && globalLogStompClient) {
      console.log('admin 권한이 아니므로 로그 WebSocket 연결 해제');
      disconnectGlobalLogWebSocket();
    }
  }, [userRole]);

  // 네트워크 상태 변화 감지
  useEffect(() => {
    const handleOnline = () => {
      console.log('네트워크 연결 복구됨 - 로그 WebSocket 재연결 시도');
      if (user && !globalLogStompClient?.connected) {
        hasShownLogConnectionError = false;
        logReconnectAttempts = 0;
      }
    };

    const handleOffline = () => {
      console.log('네트워크 연결 끊어짐 - 로그 WebSocket');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  return {
    isConnected: globalLogStompClient?.connected || false,
    disconnect: disconnectGlobalLogWebSocket
  };
};
