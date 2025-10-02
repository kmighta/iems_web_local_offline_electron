import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 안전한 토스트 함수들 (커스텀 토스트 사용)
export const safeToast = {
  success: (message: string) => {
    try {
      // 커스텀 토스트 객체 사용
      if (typeof window !== 'undefined' && (window as any).customToast) {
        (window as any).customToast.success(message, 3000);
      } else {
        console.log('Toast success:', message);
      }
    } catch (error) {
      console.log('Toast success:', message);
    }
  },
  error: (message: string) => {
    try {
      // 커스텀 토스트 객체 사용
      if (typeof window !== 'undefined' && (window as any).customToast) {
        (window as any).customToast.error(message, 3000);
      } else {
        console.error('Toast error:', message);
      }
    } catch (error) {
      console.error('Toast error:', message);
    }
  },
  warning: (message: string) => {
    try {
      // 커스텀 토스트 객체 사용
      if (typeof window !== 'undefined' && (window as any).customToast) {
        (window as any).customToast.warning(message, 3000);
      } else {
        console.warn('Toast warning:', message);
      }
    } catch (error) {
      console.warn('Toast warning:', message);
    }
  },
  info: (message: string) => {
    try {
      // 커스텀 토스트 객체 사용
      if (typeof window !== 'undefined' && (window as any).customToast) {
        (window as any).customToast.info(message, 3000);
      } else {
        console.info('Toast info:', message);
      }
    } catch (error) {
      console.info('Toast info:', message);
    }
  },
  // WebSocket에서 사용하는 형태의 safeToast 지원
  default: (options: { title: string; description: string; variant?: string; duration?: number; action?: any }) => {
    try {
      const { title, description, variant } = options;
      let message = `${title}: ${description}`;
      
      if (typeof window !== 'undefined' && (window as any).customToast) {
        switch (variant) {
          case 'destructive':
            (window as any).customToast.error(message, options.duration || 3000);
            break;
          case 'success':
            (window as any).customToast.success(message, options.duration || 3000);
            break;
          default:
            (window as any).customToast.info(message, options.duration || 3000);
            break;
        }
      } else {
        if (variant === 'destructive') {
          console.error('Toast error:', message);
        } else if (variant === 'success') {
          console.log('Toast success:', message);
        } else {
          console.info('Toast info:', message);
        }
      }
    } catch (error) {
      console.log('Toast fallback:', options.title, options.description);
    }
  }
};

// 웹소켓을 통한 deviceInfo 업데이트 대기 함수
export const waitForDeviceInfoUpdate = (field: string, expectedValue: string, timeout: number = 10000): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 전역 변수로 웹소켓 대기 함수에 접근
    const webSocketHook = (window as any).__webSocketHook;

    if (!webSocketHook || !webSocketHook.waitForDeviceInfoUpdate) {
      reject(new Error('웹소켓 훅을 찾을 수 없습니다.'));
      return;
    }

    webSocketHook.waitForDeviceInfoUpdate(field, expectedValue, timeout)
        .then(resolve)
        .catch(reject);
  });
};

// 우선순위 변경을 위한 특별한 대기 함수
export const waitForPriorityNumbersUpdate = (expectedPriorityNumbers: number[], timeout: number = 10000): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 전역 변수로 웹소켓 대기 함수에 접근
    const webSocketHook = (window as any).__webSocketHook;

    if (!webSocketHook || !webSocketHook.waitForPriorityNumbersUpdate) {
      reject(new Error('웹소켓 훅을 찾을 수 없습니다.'));
      return;
    }

    webSocketHook.waitForPriorityNumbersUpdate(expectedPriorityNumbers, timeout)
        .then(resolve)
        .catch(reject);
  });
};

// 시간 동기화 함수
export const updateTimeSync = async (
  id: number,
): Promise<any> => {
  const { updateTimeSync } = await import('@/api/device_dynamic');

  const result = await updateTimeSync(id);

  return result;
};

export const updateDeviceInfoAndWait = async (
    id: number,
    updatedValues: any,
    changedField: string,
    timeout: number = 10000
): Promise<any> => {
  // 로딩 상태 시작
  const useSettingsStore = (await import('@/store/settingsStore')).default;
  useSettingsStore.getState().setIsSettingLoading(true);

  try {
    // 1. API 호출 (동적 axios 사용)
    const { updateDeviceInfo } = await import('@/api/device_dynamic');
    const result = await updateDeviceInfo(id, updatedValues, changedField);

    if (result.success !== true) {
      throw new Error('API 호출이 실패했습니다.');
    }

    // 2. 웹소켓을 통한 업데이트 대기
    const expectedValue = updatedValues[changedField]?.toString();
    if (expectedValue) {
      await waitForDeviceInfoUpdate(changedField, expectedValue, timeout);
    }

    return result;
  } catch (error) {
    console.error('updateDeviceInfoAndWait 실패:', error);
    throw error;
  } finally {
    // 로딩 상태 종료
    useSettingsStore.getState().setIsSettingLoading(false, "설정 변경중...");
  }
};

// 필드별 로딩 메시지 매핑
const getLoadingMessage = (changedField: string): string => {
  const messageMap: { [key: string]: string } = {
    'operationMode': '운전모드 변경중...',
    'ctrlMode': '제어방법 변경중...',
    'manualCtrl': '차단그룹 변경중...',
    'targetPower': '목표전력 설정중...',
    'pctRatio': 'PCT비율 설정중...',
    'pulseConstant': '펄스정수 설정중...',
    'filterConstant': '필터상수 설정중...',
    'firstControlTime': '최초제어시간 설정중...',
    'blockInterval': '차단간격 설정중...',
    'inputInterval': '복귀간격 설정중...',
    'currPowerMeasureSec': '전력측정간격 설정중...',
    'priorityNumbers': '우선순위 설정중...',
    'ctrlCnt': '차단개수 설정중...',
  };

  return messageMap[changedField] || '설정 변경중...';
};

// 로딩 메시지와 함께 업데이트하는 함수
export const updateDeviceInfoAndWaitWithMessage = async (
    id: number,
    updatedValues: any,
    changedField: string | string[],
    timeout: number = 10000
): Promise<any> => {
  // 로딩 상태 시작
  const useSettingsStore = (await import('@/store/settingsStore')).default;

  let loadingMessage = "설정 변경중...";

  if (typeof changedField === 'string') {
    loadingMessage = getLoadingMessage(changedField);
  } else {
    loadingMessage = getLoadingMessage(changedField[0]);
  }

  // 로딩 메시지를 store에 저장
  useSettingsStore.getState().setIsSettingLoading(true, loadingMessage);

  try {
    // 1. API 호출 (동적 axios 사용)
    const { updateDeviceInfo } = await import('@/api/device_dynamic');

    if (typeof changedField === 'string') {
      changedField = [changedField];
    }

    const result = await updateDeviceInfo(id, updatedValues, changedField[0]);

    if (result.success !== true) {
      throw new Error('API 호출이 실패했습니다.');
    }

    // 2. 웹소켓을 통한 업데이트 대기
    for (const field of changedField) {
      if (field === 'functionSettings' || field === 'systemTimeEnabled' || field === 'command1') {
        continue;
      }
      const expectedValue = updatedValues[field]?.toString();
      if (expectedValue) {
        await waitForDeviceInfoUpdate(field, expectedValue, timeout);
      }
    }

    return result;
  } catch (error) {
    console.error('updateDeviceInfoAndWait 실패:', error);
    throw error;
  } finally {
    // 로딩 상태 종료
    useSettingsStore.getState().setIsSettingLoading(false, "설정 변경중...");
  }
};

// 우선순위 변경을 위한 특별한 업데이트 함수
export const updatePriorityNumbersAndWait = async (
    id: number,
    updatedValues: any,
    timeout: number = 10000
): Promise<any> => {
  // 로딩 상태 시작
  const useSettingsStore = (await import('@/store/settingsStore')).default;
  useSettingsStore.getState().setIsSettingLoading(true, "우선순위 설정중...");

  try {
    // 1. API 호출 (동적 axios 사용)
    const { updateDeviceInfo } = await import('@/api/device_dynamic');
    const result = await updateDeviceInfo(id, updatedValues, "priorityNumbers");

    if (result.success !== true) {
      throw new Error('API 호출이 실패했습니다.');
    }

    // 2. 우선순위 배열 업데이트 대기
    if (updatedValues.priorityNumbers && Array.isArray(updatedValues.priorityNumbers)) {
      await waitForPriorityNumbersUpdate(updatedValues.priorityNumbers, timeout);
    }

    return result;
  } catch (error) {
    console.error('updatePriorityNumbersAndWait 실패:', error);
    throw error;
  } finally {
    // 로딩 상태 종료
    useSettingsStore.getState().setIsSettingLoading(false, "설정 변경중...");
  }
};