import axios from "@/api/axios_util";

/**
 * 리포트 시계 데이터 서비스
 * 최대부하, 감축량, 제어현황 데이터를 관리합니다.
 */
export class ReportClockService {
  constructor(serialNumber) {
    this.serialNumber = serialNumber;
  }

  /**
   * 1시간 단위 시계 데이터 조회
   * @param {string} start - 시작일시 (ISO 8601 형식: yyyy-MM-ddTHH:mm:ss)
   * @param {string} end - 종료일시 (ISO 8601 형식: yyyy-MM-ddTHH:mm:ss)
   * @returns {Promise<Array>} 시계 데이터 배열
   */
  async fetchClockData(start, end) {
    try {
      const params = new URLSearchParams({
        serialNumber: this.serialNumber,
        start,
        end
      });
      
      const response = await axios.get(`/report/clock?${params}`);

      if (response.status !== 200) {
        throw new Error("Failed to get clock data");
      }

      return response.data;
    } catch (error) {
      console.error('시계 데이터 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 최대부하 데이터 추출 및 변환
   * @param {Array} clockData - 원본 시계 데이터
   * @param {string} viewType - 보기 타입 (daily, monthly, yearly)
   * @returns {Array} 최대부하 데이터
   */
  extractMaxLoadData(clockData, viewType = 'daily') {
    if (!Array.isArray(clockData)) return [];

    if (viewType === 'monthly') {
      // 월별 보기: 날짜별로 그룹화하여 일별 최대값 계산
      const dailyGroups = {};
      
      clockData.forEach(item => {
        if (item.plcTime) {
          const date = new Date(item.plcTime);
          const dayKey = date.getDate().toString().padStart(2, '0');
          
          if (!dailyGroups[dayKey]) {
            dailyGroups[dayKey] = {
              maxLoad: 0,
              maxLoadTime: '-',
              ctrlMaxLoad: 0,
              ctrlMaxLoadTime: '-'
            };
          }
          
          // ctrlMaxLoad 값으로 최대값 업데이트
          const currentMaxLoad = item.ctrlMaxLoad || 0;
          if (currentMaxLoad > dailyGroups[dayKey].ctrlMaxLoad) {
            dailyGroups[dayKey].ctrlMaxLoad = currentMaxLoad;
            dailyGroups[dayKey].maxLoad = currentMaxLoad / 1000; // W를 kW로 변환
            dailyGroups[dayKey].ctrlMaxLoadTime = item.ctrlMaxLoadTime || '-';
            dailyGroups[dayKey].maxLoadTime = dailyGroups[dayKey].ctrlMaxLoadTime;
          }
        }
      });
      
      // 일별 데이터를 배열로 변환 (1일부터 31일까지)
      const monthlyData = [];
      for (let day = 1; day <= 31; day++) {
        const dayKey = day.toString().padStart(2, '0');
        const dayData = dailyGroups[dayKey] || {
          maxLoad: 0,
          maxLoadTime: '-',
          ctrlMaxLoad: 0,
          ctrlMaxLoadTime: '-'
        };
        
        monthlyData.push({
          time: this.formatTimeByViewType(null, viewType, day - 1),
          day: dayKey,
          maxLoad: dayData.maxLoad,
          maxLoadTime: dayData.maxLoadTime,
          ctrlMaxLoad: dayData.ctrlMaxLoad,
          ctrlMaxLoadTime: dayData.ctrlMaxLoadTime,
          targetPower: 0,
          demandTime: 0,
          deviceId: this.serialNumber
        });
      }
      
      return monthlyData;
    } else if (viewType === 'yearly') {
      // 년별 보기: 월별로 그룹화하여 월별 최대값 계산
      const monthlyGroups = {};
      
      clockData.forEach(item => {
        if (item.plcTime) {
          const date = new Date(item.plcTime);
          const monthKey = (date.getMonth() + 1).toString().padStart(2, '0');
          
          if (!monthlyGroups[monthKey]) {
            monthlyGroups[monthKey] = {
              maxLoad: 0,
              maxLoadTime: '-',
              ctrlMaxLoad: 0,
              ctrlMaxLoadTime: '-'
            };
          }
          
          // ctrlMaxLoad 값으로 최대값 업데이트
          const currentMaxLoad = item.ctrlMaxLoad || 0;
          if (currentMaxLoad > monthlyGroups[monthKey].ctrlMaxLoad) {
            monthlyGroups[monthKey].ctrlMaxLoad = currentMaxLoad;
            monthlyGroups[monthKey].maxLoad = currentMaxLoad / 1000; // W를 kW로 변환
            monthlyGroups[monthKey].ctrlMaxLoadTime = item.ctrlMaxLoadTime || '-';
            monthlyGroups[monthKey].maxLoadTime = monthlyGroups[monthKey].ctrlMaxLoadTime;
          }
        }
      });
      
      // 월별 데이터를 배열로 변환 (1월부터 12월까지)
      const yearlyData = [];
      for (let month = 1; month <= 12; month++) {
        const monthKey = month.toString().padStart(2, '0');
        const monthData = monthlyGroups[monthKey] || {
          maxLoad: 0,
          maxLoadTime: '-',
          ctrlMaxLoad: 0,
          ctrlMaxLoadTime: '-'
        };
        
        yearlyData.push({
          time: this.formatTimeByViewType(null, viewType, month - 1),
          month: monthKey,
          maxLoad: monthData.maxLoad,
          maxLoadTime: monthData.maxLoadTime,
          ctrlMaxLoad: monthData.ctrlMaxLoad,
          ctrlMaxLoadTime: monthData.ctrlMaxLoadTime,
          targetPower: 0,
          demandTime: 0,
          deviceId: this.serialNumber
        });
      }
      
      return yearlyData;
    } else {
      // 일별 보기: 시간별 데이터
      return clockData.map((item, index) => {
        // plcTime에서 시간 추출
        let hour = 0;
        if (item.plcTime) {
          const date = new Date(item.plcTime);
          hour = date.getHours();
        } else if (item.time) {
          hour = parseInt(item.time) || 0;
        } else if (item.hour) {
          hour = parseInt(item.hour) || 0;
        }

        const baseData = {
          time: this.formatTimeByViewType(hour, viewType, index),
          maxLoad: (item.ctrlMaxLoad || 0) / 1000, // W를 kW로 변환
          maxLoadTime: item.ctrlMaxLoadTime || '-',
          ctrlMaxLoad: item.ctrlMaxLoad || 0,
          ctrlMaxLoadTime: item.ctrlMaxLoadTime || '-',
          targetPower: item.targetPower || 0,
          demandTime: item.demandTime || 0,
          deviceId: item.deviceId || this.serialNumber
        };

        return baseData;
      });
    }
  }

  /**
   * 감축량 데이터 추출 및 변환
   * @param {Array} clockData - 원본 시계 데이터
   * @param {string} viewType - 보기 타입 (daily, monthly, yearly)
   * @returns {Array} 감축량 데이터
   */
  extractReductionData(clockData, viewType = 'daily') {
    if (!Array.isArray(clockData)) return [];

    return clockData.map(item => {
      const baseData = {
        time: this.formatTimeByViewType(item.time || item.hour, viewType),
        reduction: item.reduction || item.reductionSum || 0,
        reductionSum: item.controlCount || item.ctrlCount || item.reductionSum || 0,
        groupReductionSum: item.controlCount || item.ctrlCount || item.reductionSum || 0,
        controlCount: item.reductionSum || 0, // 감축량 탭에서 사용할 controlCount 필드에 reductionSum 값 저장
        reductionRate: item.reductionRate || 0,
        reductionTime: item.reductionTime || 0,
        targetPower: item.targetPower || 0,
        actualPower: item.actualPower || 0,
        deviceId: item.deviceId || this.serialNumber
      };

      // group별 감축량 필드 추가 (일별 보기에서만)
      if (viewType === 'daily') {
        for (let i = 1; i <= 16; i++) {
          const groupReductionField = `group${i}Reduction`;
          const groupCtrlTimeField = `group${i}CtrlTime`;
          const controlReductionField = `controlReduction${i}`;
          const controlTimeField = `controlTime${i}`;
          
          const val = item[groupReductionField] || 0;
          baseData[controlReductionField] = val;
          // also set groupNReduction alias so consumers can read either name
          baseData[groupReductionField] = val;
          baseData[controlTimeField] = item[groupCtrlTimeField] || "00:00:00";
        }
      }

      return baseData;
    });
  }

  /**
   * 제어현황 데이터 추출 및 변환
   * @param {Array} clockData - 원본 시계 데이터
   * @param {string} viewType - 보기 타입 (daily, monthly, yearly)
   * @returns {Array} 제어현황 데이터
   */
  extractControlData(clockData, viewType = 'daily') {
    if (!Array.isArray(clockData)) return [];

    console.log('ReportClockService.extractControlData 호출:', { clockData: clockData.slice(0, 2), viewType });

    return clockData.map(item => {
      // 시간을 MM:SS 형식으로 변환하는 함수
      const formatTimeToMMSS = (timeStr) => {
        if (!timeStr || timeStr === null) return "00:00";
        try {
          const parts = timeStr.split(':');
          if (parts.length >= 2) {
            const minutes = parts[1].padStart(2, '0');
            const seconds = parts[2] ? parts[2].padStart(2, '0') : '00';
            return `${minutes}:${seconds}`;
          }
          return "00:00";
        } catch (e) {
          return "00:00";
        }
      };

      const baseData = {
        time: this.formatTimeByViewType(item.plcTime || item.time || item.hour, viewType),
        ctrlCount: item.ctrlCount || 0,  // 제어개수 필드 (우선)
        controlCount: item.ctrlCount || 0,  // 호환성용 필드
        controlTime: item.controlTime || item.ctrlTime || '00:00:00',
        controlStatus: item.controlStatus || 'OFF',
        controlType: item.controlType || 'MANUAL',
        lastControlTime: item.lastControlTime || '-',
        deviceId: item.deviceId || this.serialNumber,
        plcTime: item.plcTime,  // 원본 시간 필드 유지
        timestamp: item.timestamp,
        demandTimeIndex: item.demandTimeIndex,
        // 원본 데이터 모든 필드 포함
        ...item
      };

      // ctrlTime1~16 필드를 controlTime1~16으로 변환 (모든 보기에서)
      for (let i = 1; i <= 16; i++) {
        const ctrlTimeField = `ctrlTime${i}`;
        const controlTimeField = `controlTime${i}`;
        const timeValue = item[ctrlTimeField];
        baseData[controlTimeField] = formatTimeToMMSS(timeValue);
      }

      console.log('변환된 제어현황 데이터:', baseData);
      return baseData;
    });
  }

  /**
   * 보기 타입에 따른 시간 포맷팅
   * @param {string|number} time - 원본 시간
   * @param {string} viewType - 보기 타입
   * @param {number} index - 배열 인덱스 (월별/년별 보기에서 사용)
   * @returns {string} 포맷된 시간
   */
  formatTimeByViewType(time, viewType, index = 0) {
    switch (viewType) {
      case 'daily':
        // plcTime이나 ISO 형식 시간 처리
        if (typeof time === 'string' && (time.includes('T') || time.includes('-'))) {
          try {
            const date = new Date(time);
            if (!isNaN(date.getTime())) {
              return `${date.getHours().toString().padStart(2, '0')}:00`;
            }
          } catch (e) {
            console.warn('시간 파싱 실패:', time, e);
          }
        }
        
        // 시간 단위: "00", "01", "02" -> "00:00", "01:00", "02:00"
        if (typeof time === 'number') {
          return `${String(time).padStart(2, '0')}:00`;
        }
        if (typeof time === 'string' && !time.includes(':')) {
          return `${time.padStart(2, '0')}:00`;
        }
        return time || '';
      
      case 'monthly':
        // 최대부하 탭용: 일 단위로 "01일", "02일", "03일"... 생성
        return `${(index + 1).toString().padStart(2, '0')}일`;
      
      case 'yearly':
        // 최대부하 탭용: 월 단위로 "1월", "2월", "3월"... 생성
        return `${index + 1}월`;
      
      default:
        return String(time || '');
    }
  }

  /**
   * 날짜 범위 생성
   * @param {Date} selectedDate - 선택된 날짜
   * @param {string} viewType - 보기 타입
   * @returns {Object} {startDate, endDate}
   */
  createDateRange(selectedDate, viewType) {
    let startDate, endDate;
    
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const date = selectedDate.getDate();

    if (viewType === 'daily') {
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T00:00:00`;
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T23:59:59`;
    } else if (viewType === 'monthly') {
      const lastDay = new Date(year, month + 1, 0).getDate();
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-01T00:00:00`;
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59`;
    } else if (viewType === 'yearly') {
      startDate = `${year}-01-01T00:00:00`;
      endDate = `${year}-12-31T23:59:59`;
    }

    return { startDate, endDate };
  }

  /**
   * 통합 데이터 로드 (최대부하, 감축량, 제어현황)
   * @param {Date} selectedDate - 선택된 날짜
   * @param {string} viewType - 보기 타입
   * @returns {Promise<Object>} {maxLoadData, reductionData, controlData}
   */
  async loadAllClockData(selectedDate, viewType = 'daily') {
    try {
      const { startDate, endDate } = this.createDateRange(selectedDate, viewType);
      const clockData = await this.fetchClockData(startDate, endDate);

      return {
        maxLoadData: this.extractMaxLoadData(clockData, viewType),
        reductionData: this.extractReductionData(clockData, viewType),
        controlData: this.extractControlData(clockData, viewType),
        rawClockData: clockData
      };
    } catch (error) {
      console.error('시계 데이터 로드 실패:', error);
      return {
        maxLoadData: [],
        reductionData: [],
        controlData: [],
        rawClockData: []
      };
    }
  }

  /**
   * 특정 타입의 데이터만 로드
   * @param {Date} selectedDate - 선택된 날짜
   * @param {string} viewType - 보기 타입
   * @param {string} dataType - 데이터 타입 ('maxLoad', 'reduction', 'control')
   * @returns {Promise<Array>} 해당 타입의 데이터
   */
  async loadSpecificClockData(selectedDate, viewType = 'daily', dataType = 'maxLoad') {
    try {
      const { startDate, endDate } = this.createDateRange(selectedDate, viewType);
      const clockData = await this.fetchClockData(startDate, endDate);

      switch (dataType) {
        case 'maxLoad':
          return this.extractMaxLoadData(clockData, viewType);
        case 'reduction':
          return this.extractReductionData(clockData, viewType);
        case 'control':
          return this.extractControlData(clockData, viewType);
        default:
          return clockData;
      }
    } catch (error) {
      console.error(`${dataType} 데이터 로드 실패:`, error);
      return [];
    }
  }

  /**
   * 실시간 데이터 업데이트를 위한 최신 시계 데이터 조회
   * @returns {Promise<Object>} 최신 시계 데이터
   */
  async fetchLatestClockData() {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const { startDate, endDate } = this.createDateRange(startOfToday, 'daily');
      
      const clockData = await this.fetchClockData(startDate, endDate);
      
      // 가장 최근 데이터 반환
      if (Array.isArray(clockData) && clockData.length > 0) {
        return clockData[clockData.length - 1];
      }
      
      return null;
    } catch (error) {
      console.error('최신 시계 데이터 조회 실패:', error);
      return null;
    }
  }

  /**
   * 시리얼 번호 업데이트
   * @param {string} newSerialNumber - 새로운 시리얼 번호
   */
  updateSerialNumber(newSerialNumber) {
    this.serialNumber = newSerialNumber;
  }
}

export default ReportClockService;
