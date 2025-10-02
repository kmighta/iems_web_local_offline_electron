/**
 * API 새로고침 에러 알림 컴포넌트
 * 3회 실패 시 사용자에게 에러 알림 표시
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

const ApiErrorNotification = () => {
  const [errorState, setErrorState] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleApiRefreshError = (event) => {
      const { error, retryCount, maxRetries, message } = event.detail;
      
      setErrorState({
        error,
        retryCount,
        maxRetries,
        message,
        timestamp: new Date().toISOString(),
      });
      setIsVisible(true);
      
      console.error('🚨 API 새로고침 에러 알림:', event.detail);
    };

    // 에러 이벤트 리스너 등록
    window.addEventListener('apiRefreshError', handleApiRefreshError);
    
    return () => {
      window.removeEventListener('apiRefreshError', handleApiRefreshError);
    };
  }, []);

  const handleRetry = () => {
    setIsVisible(false);
    setErrorState(null);
    
    // 페이지 새로고침 시도
    window.location.reload();
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setErrorState(null);
  };

  if (!isVisible || !errorState) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Card className="border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-red-800 dark:text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <span>데이터 새로고침 실패</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-800"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-red-700 dark:text-red-300">
            <p>{errorState.message}</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              재시도 횟수: {errorState.retryCount}/{errorState.maxRetries}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-800"
              onClick={handleRetry}
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              다시 시도
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800"
              onClick={handleDismiss}
            >
              닫기
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiErrorNotification;
