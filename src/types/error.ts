/**
 * 에러 관리 타입들
 */

/**
 * 에러 레벨
 */
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning', 
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 에러 카테고리
 */
export enum ErrorCategory {
  API = 'api',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTH = 'auth',
  UNKNOWN = 'unknown'
}

/**
 * 커스텀 에러 클래스
 */
export class AppError extends Error {
  public readonly level: ErrorLevel;
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    level: ErrorLevel = ErrorLevel.ERROR,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    code: string = 'UNKNOWN_ERROR',
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.level = level;
    this.category = category;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.retryable = retryable;

    // Error 클래스 상속 시 프로토타입 체인 수정
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * 에러를 JSON 형태로 직렬화
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      level: this.level,
      category: this.category,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      stack: this.stack
    };
  }

  /**
   * API 에러 생성
   */
  static createApiError(
    message: string,
    statusCode: number,
    details?: any
  ): AppError {
    const retryable = statusCode >= 500 || statusCode === 429; // 5xx 또는 429는 재시도 가능
    return new AppError(
      message,
      statusCode >= 500 ? ErrorLevel.CRITICAL : ErrorLevel.ERROR,
      ErrorCategory.API,
      `API_ERROR_${statusCode}`,
      { statusCode, ...details },
      retryable
    );
  }

  /**
   * 네트워크 에러 생성
   */
  static createNetworkError(message: string, details?: any): AppError {
    return new AppError(
      message,
      ErrorLevel.ERROR,
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      details,
      true // 네트워크 에러는 일반적으로 재시도 가능
    );
  }

  /**
   * 검증 에러 생성
   */
  static createValidationError(message: string, details?: any): AppError {
    return new AppError(
      message,
      ErrorLevel.WARNING,
      ErrorCategory.VALIDATION,
      'VALIDATION_ERROR',
      details,
      false // 검증 에러는 재시도해도 소용없음
    );
  }
}

/**
 * 에러 핸들러 인터페이스
 */
export interface ErrorHandler {
  handle(error: AppError): void;
  canHandle(error: Error): boolean;
}

/**
 * 에러 알림 상태
 */
export interface ErrorNotificationState {
  isVisible: boolean;
  error: AppError | null;
  retryCount: number;
  maxRetries: number;
}

/**
 * 에러 로깅 인터페이스
 */
export interface ErrorLogger {
  log(error: AppError): void;
  getErrorHistory(): AppError[];
  clearHistory(): void;
}

/**
 * 에러 컨텍스트 타입
 */
export interface ErrorContextValue {
  errors: AppError[];
  addError: (error: AppError) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  retryOperation: (errorId: string) => Promise<void>;
}
