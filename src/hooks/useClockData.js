import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  fetchMaxLoadData, 
  fetchReductionData, 
  fetchControlData, 
  fetchAllClockData 
} from '@/api/device_local';
import { ReportClockService } from '@/services/ReportClockService';

/**
 * 시계 데이터 관리 커스텀 훅 (최대부하, 감축량, 제어현황)
 */
export const useClockData = (serialNumber, selectedDate, viewType = 'daily') => {
  const [clockService] = useState(() => new ReportClockService(serialNumber));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 데이터 상태
  const [maxLoadData, setMaxLoadData] = useState([]);
  const [reductionData, setReductionData] = useState([]);
  const [controlData, setControlData] = useState([]);
  const [rawClockData, setRawClockData] = useState([]);

  // selectedDate를 안정적인 문자열로 변환 (무한루프 방지)
  const selectedDateString = useMemo(() => {
    if (!selectedDate) return '';
    
    let dateObj;
    if (selectedDate instanceof Date) {
      dateObj = selectedDate;
    } else if (typeof selectedDate === 'string') {
      dateObj = new Date(selectedDate);
    } else {
      return '';
    }
    
    if (isNaN(dateObj.getTime())) return '';
    
    // 시간대 문제를 방지하기 위해 로컬 시간 기준으로 직접 포맷팅
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`; // YYYY-MM-DD 형태
  }, [selectedDate]);

  /**
   * 날짜 범위 생성
   */
  const createDateRange = useCallback((selectedDate, viewType) => {
    if (!selectedDate) return { startDate: '', endDate: '' };

    // selectedDate를 Date 객체로 변환
    let dateObj;
    if (selectedDate instanceof Date) {
      dateObj = selectedDate;
    } else if (typeof selectedDate === 'string') {
      dateObj = new Date(selectedDate);
    } else {
      console.error('selectedDate가 유효하지 않은 타입입니다:', typeof selectedDate, selectedDate);
      return { startDate: '', endDate: '' };
    }

    // 유효한 Date 객체인지 확인
    if (isNaN(dateObj.getTime())) {
      console.error('selectedDate가 유효하지 않은 날짜입니다:', selectedDate);
      return { startDate: '', endDate: '' };
    }

    let startDate, endDate;
    // 시간대 문제를 방지하기 위해 로컬 시간 기준으로 년/월/일 값을 직접 사용
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1
    const date = dateObj.getDate();

    if (viewType === 'daily') {
      startDate = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T00:00:00`;
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(date).padStart(2, '0')}T23:59:59`;
    } else if (viewType === 'monthly') {
      const lastDay = new Date(year, month, 0).getDate(); // 해당 월의 마지막 날
      startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`;
      endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`;
    } else if (viewType === 'yearly') {
      startDate = `${year}-01-01T00:00:00`;
      endDate = `${year}-12-31T23:59:59`;
    }

    console.log('[useClockData] 날짜 범위 생성:', { 
      originalDate: selectedDate, 
      viewType, 
      startDate, 
      endDate,
      year,
      month,
      date
    });

    return { startDate, endDate };
  }, []);

  /**
   * 모든 시계 데이터 로드
   */
  const loadAllData = useCallback(async () => {
    if (!serialNumber || !selectedDateString) {
      console.log('[useClockData] loadAllData - 필수 정보 없음:', { serialNumber, selectedDateString });
      // 필수 정보가 없으면 데이터 초기화
      setMaxLoadData([]);
      setReductionData([]);
      setControlData([]);
      setRawClockData([]);
      return;
    }

    console.log('[useClockData] loadAllData 시작:', { 
      serialNumber, 
      selectedDateString, 
      viewType,
      timestamp: new Date().toISOString()
    });
    
    setLoading(true);
    setError(null);

    try {
      // selectedDateString을 Date 객체로 변환
      const dateObj = new Date(selectedDateString);
      const { startDate, endDate } = createDateRange(dateObj, viewType);
      console.log('[useClockData] API 호출 준비:', { serialNumber, startDate, endDate });
      
      // 기존 API 사용하여 원본 데이터 가져오기
      const result = await fetchAllClockData(serialNumber, startDate, endDate);
      console.log('[useClockData] API 응답 완료:', {
        maxLoadDataCount: result?.maxLoadData?.length || 0,
        reductionDataCount: result?.reductionData?.length || 0,
        controlDataCount: result?.controlData?.length || 0,
        rawClockDataCount: result?.rawClockData?.length || 0
      });
      
      // ReportClockService를 사용하여 데이터 변환
      const rawClockData = result?.rawClockData || [];
      console.log('[useClockData] 원본 Clock 데이터:', { 
        rawClockDataCount: rawClockData.length,
        firstItem: rawClockData[0],
        viewType 
      });
      
      const maxLoadData = clockService.extractMaxLoadData(rawClockData, viewType);
      const reductionData = clockService.extractReductionData(rawClockData, viewType);
      const controlData = clockService.extractControlData(rawClockData, viewType);
      
      console.log('[useClockData] 변환된 데이터:', {
        maxLoadDataCount: maxLoadData.length,
        maxLoadFirstItem: maxLoadData[0],
        reductionDataCount: reductionData.length,
        controlDataCount: controlData.length
      });
      
      setMaxLoadData(maxLoadData);
      setReductionData(reductionData);
      setControlData(controlData);
      setRawClockData(rawClockData);
      
      console.log('[useClockData] 상태 업데이트 완료:', {
        maxLoadCount: maxLoadData.length,
        reductionCount: reductionData.length,
        controlCount: controlData.length,
        rawCount: rawClockData.length
      });
      
      // 데이터가 모두 비어있는 경우 로그 출력
      if (!maxLoadData.length && !reductionData.length && !controlData.length) {
        console.log('[useClockData] 모든 데이터가 비어있음 - 기존 데이터 초기화됨');
      }
    } catch (err) {
      setError(err.message);
      console.error('[useClockData] 시계 데이터 로드 실패:', err);
      // 오류 발생 시 데이터 초기화
      setMaxLoadData([]);
      setReductionData([]);
      setControlData([]);
      setRawClockData([]);
    } finally {
      setLoading(false);
      console.log('[useClockData] loadAllData 종료');
    }
  }, [serialNumber, selectedDateString, viewType, createDateRange, clockService]);

  /**
   * 최대부하 데이터만 로드
   */
  const loadMaxLoadData = useCallback(async () => {
    if (!serialNumber || !selectedDateString) {
      setMaxLoadData([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const dateObj = new Date(selectedDateString);
      const { startDate, endDate } = createDateRange(dateObj, viewType);
      const data = await fetchMaxLoadData(serialNumber, startDate, endDate);
      
      // 데이터가 null이거나 빈 배열인 경우 처리
      const cleanData = data || [];
      setMaxLoadData(cleanData);
      
      if (cleanData.length === 0) {
        console.log('useClockData: 최대부하 데이터 없음 - 빈 배열로 초기화');
      }
      
      return cleanData;
    } catch (err) {
      setError(err.message);
      console.error('최대부하 데이터 로드 실패:', err);
      // 오류 발생 시 빈 배열로 초기화
      setMaxLoadData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [serialNumber, selectedDateString, viewType, createDateRange]);

  /**
   * 감축량 데이터만 로드
   */
  const loadReductionData = useCallback(async () => {
    if (!serialNumber || !selectedDateString) {
      setReductionData([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const dateObj = new Date(selectedDateString);
      const { startDate, endDate } = createDateRange(dateObj, viewType);
      const data = await fetchReductionData(serialNumber, startDate, endDate);
      
      // 데이터가 null이거나 빈 배열인 경우 처리
      const cleanData = data || [];
      setReductionData(cleanData);
      
      if (cleanData.length === 0) {
        console.log('useClockData: 감축량 데이터 없음 - 빈 배열로 초기화');
      }
      
      return cleanData;
    } catch (err) {
      setError(err.message);
      console.error('감축량 데이터 로드 실패:', err);
      // 오류 발생 시 빈 배열로 초기화
      setReductionData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [serialNumber, selectedDateString, viewType, createDateRange]);

  /**
   * 제어현황 데이터만 로드
   */
  const loadControlData = useCallback(async () => {
    if (!serialNumber || !selectedDateString) {
      setControlData([]);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const dateObj = new Date(selectedDateString);
      const { startDate, endDate } = createDateRange(dateObj, viewType);
      console.log('useClockData: fetchControlData 호출', { serialNumber, startDate, endDate });
      const data = await fetchControlData(serialNumber, startDate, endDate);
      console.log('useClockData: fetchControlData 응답', data);
      
      // 데이터가 null이거나 빈 배열인 경우 처리
      const cleanData = data || [];
      setControlData(cleanData);
      
      if (cleanData.length === 0) {
        console.log('useClockData: 제어현황 데이터 없음 - 빈 배열로 초기화');
      } else {
        console.log('useClockData: 제어현황 데이터 로드 성공', cleanData.length, '개');
      }
      
      return cleanData;
    } catch (err) {
      setError(err.message);
      console.error('제어현황 데이터 로드 실패:', err);
      // 오류 발생 시 빈 배열로 초기화
      setControlData([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [serialNumber, selectedDateString, viewType, createDateRange]);

  /**
   * 데이터 새로고침
   */
  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // 의존성이 변경될 때 자동으로 데이터 로드
  useEffect(() => {
    console.log('[useClockData] useEffect 트리거됨:', { 
      serialNumber, 
      selectedDateString, 
      viewType,
      loadAllData: !!loadAllData
    });
    
    if (serialNumber && selectedDateString) {
      console.log('[useClockData] 날짜 변경 감지 - 데이터 새로고침 시작');
      loadAllData();
    } else {
      console.log('[useClockData] serialNumber 또는 selectedDateString 없음 - 데이터 초기화');
      setMaxLoadData([]);
      setReductionData([]);
      setControlData([]);
      setRawClockData([]);
    }
  }, [loadAllData]);

  return {
    // 데이터
    maxLoadData,
    reductionData,
    controlData,
    rawClockData,
    
    // 상태
    loading,
    error,
    
    // 액션
    loadAllData,
    loadMaxLoadData,
    loadReductionData,
    loadControlData,
    refresh
  };
};

export default useClockData;
