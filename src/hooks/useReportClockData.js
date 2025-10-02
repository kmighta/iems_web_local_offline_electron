import { useState, useEffect, useCallback } from 'react';
import { ReportClockService } from '@/services/ReportClockService';

/**
 * 리포트 시계 데이터 관리 커스텀 훅
 * 최대부하, 감축량, 제어현황 데이터를 관리합니다.
 */
export const useReportClockData = (serialNumber, selectedDate, viewType = 'daily') => {
  const [clockService] = useState(() => new ReportClockService(serialNumber));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 데이터 상태
  const [maxLoadData, setMaxLoadData] = useState([]);
  const [reductionData, setReductionData] = useState([]);
  const [controlData, setControlData] = useState([]);
  const [rawClockData, setRawClockData] = useState([]);

  // 시리얼 번호 업데이트
  useEffect(() => {
    if (serialNumber) {
      clockService.updateSerialNumber(serialNumber);
    }
  }, [serialNumber, clockService]);

  /**
   * 모든 시계 데이터 로드
   */
  const loadAllData = useCallback(async () => {
    if (!serialNumber || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const result = await clockService.loadAllClockData(selectedDate, viewType);
      
      setMaxLoadData(result.maxLoadData);
      setReductionData(result.reductionData);
      setControlData(result.controlData);
      setRawClockData(result.rawClockData);
    } catch (err) {
      setError(err.message);
      console.error('시계 데이터 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [clockService, serialNumber, selectedDate, viewType]);

  /**
   * 특정 타입의 데이터만 로드
   */
  const loadSpecificData = useCallback(async (dataType) => {
    if (!serialNumber || !selectedDate) return [];

    setLoading(true);
    setError(null);

    try {
      const data = await clockService.loadSpecificClockData(selectedDate, viewType, dataType);
      
      // 상태 업데이트
      switch (dataType) {
        case 'maxLoad':
          setMaxLoadData(data);
          break;
        case 'reduction':
          setReductionData(data);
          break;
        case 'control':
          setControlData(data);
          break;
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      console.error(`${dataType} 데이터 로드 실패:`, err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [clockService, serialNumber, selectedDate, viewType]);

  /**
   * 최신 시계 데이터 조회
   */
  const fetchLatestData = useCallback(async () => {
    if (!serialNumber) return null;

    try {
      return await clockService.fetchLatestClockData();
    } catch (err) {
      setError(err.message);
      console.error('최신 시계 데이터 조회 실패:', err);
      return null;
    }
  }, [clockService, serialNumber]);

  /**
   * 데이터 새로고침
   */
  const refresh = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  // 의존성이 변경될 때 자동으로 데이터 로드
  useEffect(() => {
    loadAllData();
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
    loadSpecificData,
    fetchLatestData,
    refresh,
    
    // 서비스 인스턴스 (필요시 직접 사용)
    clockService
  };
};

export default useReportClockData;
