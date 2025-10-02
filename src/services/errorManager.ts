/**
 * 전역 에러 관리 서비스
 */
import { AppError, ErrorLevel, ErrorCategory, ErrorLogger } from '@/types/error';

/**
 * 에러 로거 구현
 */
class ErrorLoggerImpl implements ErrorLogger {
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  log(error: AppError): void {
    // 콘솔 로깅
    const logMethod = this.getLogMethod(error.level);
    logMethod(`[${error.category.toUpperCase()}] ${error.message}`, error.toJSON());

    // 히스토리에 추가
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    // 운영 환경에서는 외부 로깅 서비스로 전송 가능
    // if (process.env.NODE_ENV === 'production') {
    //   this.sendToExternalLogger(error);
    // }
  }

  private getLogMethod(level: ErrorLevel): typeof console.log {
    switch (level) {
      case ErrorLevel.INFO:
        return console.info;
      case ErrorLevel.WARNING:
        return console.warn;
      case ErrorLevel.ERROR:
        return console.error;
      case ErrorLevel.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  clearHistory(): void {
    this.errorHistory = [];
  }

  // private sendToExternalLogger(error: AppError): void {
  //   // 외부 로깅 서비스 연동 (Sentry, LogRocket 등)
  // }
}

/**
 * 전역 에러 매니저 클래스
 */
class ErrorManager {
  private static instance: ErrorManager;
  private logger: ErrorLogger;
  private errorListeners: Set<(error: AppError) => void> = new Set();

  private constructor() {
    this.logger = new ErrorLoggerImpl();
  }

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * 에러 처리
   */
  handleError(error: Error | AppError): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else {
      // 일반 Error를 AppError로 변환
      appError = this.convertToAppError(error);
    }

    // 로깅
    this.logger.log(appError);

    // 리스너들에게 알림
    this.notifyListeners(appError);

    return appError;
  }

  /**
   * API 에러 처리
   */
  handleApiError(
    error: any,
    context?: string
  ): AppError {
    let appError: AppError;

    if (error.response) {
      // HTTP 응답 에러
      const { status, data } = error.response;
      const message = data?.resultMessage || data?.message || '서버 에러가 발생했습니다.';
      appError = AppError.createApiError(message, status, { context, response: data });
    } else if (error.request) {
      // 네트워크 에러
      appError = AppError.createNetworkError(
        '네트워크 연결을 확인해주세요.',
        { context, request: error.request }
      );
    } else {
      // 기타 에러
      appError = new AppError(
        error.message || '알 수 없는 에러가 발생했습니다.',
        ErrorLevel.ERROR,
        ErrorCategory.UNKNOWN,
        'UNKNOWN_API_ERROR',
        { context, originalError: error }
      );
    }

    return this.handleError(appError);
  }

  /**
   * 에러 리스너 등록
   */
  addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.add(listener);
    
    // 구독 해제 함수 반환
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * 에러 히스토리 조회
   */
  getErrorHistory(): AppError[] {
    return this.logger.getErrorHistory();
  }

  /**
   * 에러 히스토리 초기화
   */
  clearErrorHistory(): void {
    this.logger.clearHistory();
  }

  /**
   * 일반 Error를 AppError로 변환
   */
  private convertToAppError(error: Error): AppError {
    // 특정 에러 타입별 처리
    if (error.name === 'TypeError') {
      return new AppError(
        error.message,
        ErrorLevel.ERROR,
        ErrorCategory.VALIDATION,
        'TYPE_ERROR',
        { originalError: error }
      );
    }

    if (error.name === 'ReferenceError') {
      return new AppError(
        error.message,
        ErrorLevel.CRITICAL,
        ErrorCategory.UNKNOWN,
        'REFERENCE_ERROR',
        { originalError: error }
      );
    }

    // 기본 변환
    return new AppError(
      error.message || '알 수 없는 에러가 발생했습니다.',
      ErrorLevel.ERROR,
      ErrorCategory.UNKNOWN,
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }

  /**
   * 리스너들에게 에러 알림
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('에러 리스너에서 에러 발생:', listenerError);
      }
    });
  }
}

// 싱글톤 인스턴스 export
export const errorManager = ErrorManager.getInstance();

// 편의 함수들 export
export const handleError = (error: Error | AppError) => errorManager.handleError(error);
export const handleApiError = (error: any, context?: string) => errorManager.handleApiError(error, context);
export const addErrorListener = (listener: (error: AppError) => void) => errorManager.addErrorListener(listener);
export const getErrorHistory = () => errorManager.getErrorHistory();
export const clearErrorHistory = () => errorManager.clearErrorHistory();
