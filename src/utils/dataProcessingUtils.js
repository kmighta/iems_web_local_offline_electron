/**
 * 데이터 가공 관련 공통 유틸리티 함수들
 * usage-report-page.jsx의 중복 코드를 통합하여 관리
 */

/**
 * 분기(Quarter) 관련 유틸리티 함수들
 */
export const QuarterUtils = {
  /**
   * 분기 인덱스를 분(분)으로 변환
   * @param {number} q - 분기 인덱스 (1, 2, 3, 4)
   * @returns {string} 분 문자열 ("00", "15", "30", "45")
   */
  mapQuarterToMinute: (q) => {
    return q === 1 ? "00" : q === 2 ? "15" : q === 3 ? "30" : "45";
  },

  /**
   * 분기 키를 분으로 변환
   * @param {string} qKey - 분기 키 ('peak1', 'peak2', 'peak3', 'peak4')
   * @returns {number} 분 (0, 15, 30, 45)
   */
  mapQKeyToMinute: (qKey) => {
    return qKey === 'peak1' ? 0 : qKey === 'peak2' ? 15 : qKey === 'peak3' ? 30 : 45;
  },

  /**
   * 특정 시간과 분기에서 데이터 값 조회
   * @param {string} hhStr - 시간 문자열 (예: "09")
   * @param {number} qIdx - 분기 인덱스 (1, 2, 3, 4)
   * @param {string} key - 조회할 키 (예: "peak1", "usage")
   * @param {Array} quarterData - 분기 데이터 배열
   * @returns {number|null} 찾은 값 또는 null
   */
  findQuarterValue: (hhStr, qIdx, key, quarterData) => {
    const minuteLabel = QuarterUtils.mapQuarterToMinute(qIdx);
    const qRow = quarterData.find(r => r.time === `${hhStr}:${minuteLabel}`);
    
    if (!qRow) return null;
    
    const val = qRow[key];
    if (val === null || val === undefined) return null;
    
    // 0이거나 0.1보다 작으면 이전 분기에서 유효값 찾기
    if (val === 0 || val < 0.1) {
      // 같은 시간대의 이전 분기들에서 유효값 찾기
      for (let p = qIdx - 1; p >= 1; p--) {
        const prevMinute = QuarterUtils.mapQuarterToMinute(p);
        const prevRow = quarterData.find(r => r.time === `${hhStr}:${prevMinute}`);
        const prevVal = prevRow ? prevRow[key] : null;
        if (prevVal !== null && prevVal !== undefined && prevVal > 0.1) {
          return prevVal;
        }
      }
      
      // 이전 시간대의 마지막 분기에서 찾기
      const h = parseInt(hhStr);
      if (h > 0) {
        const prevHourStr = (h - 1).toString().padStart(2, "0");
        for (let p = 4; p >= 1; p--) {
          const prevMinute = QuarterUtils.mapQuarterToMinute(p);
          const prevRow = quarterData.find(r => r.time === `${prevHourStr}:${prevMinute}`);
          const prevVal = prevRow ? prevRow[key] : null;
          if (prevVal !== null && prevVal !== undefined && prevVal > 0.1) {
            return prevVal;
          }
        }
      }
    }
    
    return val;
  },

  /**
   * 특정 시간과 분에서 사용량 조회
   * @param {number} hh - 시간 (0-23)
   * @param {number} mm - 분 (0, 15, 30, 45)
   * @param {Array} quarterData - 분기 데이터 배열
   * @returns {number} 사용량 값
   */
  getUsageAt: (hh, mm, quarterData) => {
    const label = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    const item = Array.isArray(quarterData) ? quarterData.find(r => r?.time === label) : null;
    const val = item ? parseFloat(item?.usage) : 0;
    return Number.isFinite(val) ? val : 0;
  }
};

/**
 * 피크 데이터 포맷팅 유틸리티 함수들
 */
export const PeakDataUtils = {
  /**
   * 피크 값들을 정규화 (1000으로 나누고 소수점 3자리까지)
   * @param {number} peak1 - 피크1 값
   * @param {number} peak2 - 피크2 값
   * @param {number} peak3 - 피크3 값
   * @param {number} peak4 - 피크4 값
   * @returns {Object} 정규화된 피크 값들
   */
  normalizePeaks: (peak1, peak2, peak3, peak4) => {
    return {
      normalizedPeak1: Math.round((peak1 / 1000) * 1000) / 1000,
      normalizedPeak2: Math.round((peak2 / 1000) * 1000) / 1000,
      normalizedPeak3: Math.round((peak3 / 1000) * 1000) / 1000,
      normalizedPeak4: Math.round((peak4 / 1000) * 1000) / 1000
    };
  },

  /**
   * 정규화된 피크 값들을 포맷팅 (소수점 3자리까지)
   * @param {Object} normalizedPeaks - 정규화된 피크 값들
   * @returns {Object} 포맷팅된 피크 값들
   */
  formatPeaks: (normalizedPeaks) => {
    return {
      formattedPeak1: parseFloat(normalizedPeaks.normalizedPeak1.toFixed(3)),
      formattedPeak2: parseFloat(normalizedPeaks.normalizedPeak2.toFixed(3)),
      formattedPeak3: parseFloat(normalizedPeaks.normalizedPeak3.toFixed(3)),
      formattedPeak4: parseFloat(normalizedPeaks.normalizedPeak4.toFixed(3))
    };
  },

  /**
   * 피크 값들을 정규화하고 포맷팅하는 통합 함수
   * @param {number} peak1 - 피크1 값
   * @param {number} peak2 - 피크2 값
   * @param {number} peak3 - 피크3 값
   * @param {number} peak4 - 피크4 값
   * @returns {Object} 정규화 및 포맷팅된 피크 값들
   */
  processPeaks: (peak1, peak2, peak3, peak4) => {
    const normalized = PeakDataUtils.normalizePeaks(peak1, peak2, peak3, peak4);
    const formatted = PeakDataUtils.formatPeaks(normalized);
    
    return {
      ...formatted,
      peak: Math.max(formatted.formattedPeak1, formatted.formattedPeak2, formatted.formattedPeak3, formatted.formattedPeak4)
    };
  }
};

/**
 * 숫자 포맷팅 유틸리티 함수들
 */
export const NumberUtils = {
  /**
   * 숫자를 소수점 2자리까지 포맷팅하고 불필요한 0 제거
   * @param {number} value - 포맷팅할 숫자
   * @returns {string} 포맷팅된 문자열
   */
  formatToFixed2: (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return "0";
    return value.toFixed(2).replace(/\.?0+$/, '');
  },

  /**
   * 숫자를 소수점 3자리까지 포맷팅 (0 제거 안함)
   * @param {number} value - 포맷팅할 숫자
   * @returns {string} 포맷팅된 문자열
   */
  formatToFixed3: (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return "0.000";
    return value.toFixed(3);
  },

  /**
   * 숫자를 로케일 문자열로 변환 (천 단위 구분자 포함)
   * @param {number} value - 변환할 숫자
   * @returns {string} 로케일 문자열
   */
  formatToLocaleString: (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return "-";
    const formatted = NumberUtils.formatToFixed2(value);
    return parseFloat(formatted).toLocaleString();
  },

  /**
   * 숫자를 소수점 3자리 로케일 문자열로 변환 (천 단위 구분자 포함)
   * @param {number} value - 변환할 숫자
   * @returns {string} 로케일 문자열
   */
  formatToLocaleString3: (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return "-";
    const formatted = NumberUtils.formatToFixed3(value);
    return parseFloat(formatted).toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
  },

  /**
   * 숫자를 소수점 2자리까지 반올림
   * @param {number} value - 반올림할 숫자
   * @returns {number} 반올림된 숫자
   */
  roundTo2Decimals: (value) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  }
};

/**
 * 탭 및 뷰 타입 매핑 유틸리티 함수들
 */
export const MappingUtils = {
  /**
   * 탭 이름을 엑셀 포맷으로 매핑
   * @param {string} tabName - 탭 이름
   * @returns {string} 엑셀 포맷 문자열
   */
  mapTabToExcelFormat: (tabName) => {
    switch(tabName) {
      case "전력 사용량": return "usage";
      case "전력 피크": return "peak";
      case "최대부하": return "maxload";
      case "감축량": return "reduction";
      case "제어현황": return "control";
      default: return "unknown";
    }
  },

  /**
   * 뷰 타입을 엑셀 포맷으로 매핑
   * @param {string} viewType - 뷰 타입
   * @returns {string} 엑셀 포맷 문자열
   */
  mapViewTypeToExcelFormat: (viewType) => {
    switch(viewType) {
      case "일별 보기": return "daily";
      case "월별 보기": return "monthly";
      case "년별 보기": return "yearly";
      default: return "unknown";
    }
  }
};

/**
 * 시간 관련 유틸리티 함수들
 */
export const TimeUtils = {
  /**
   * 시간을 MM:ss 형식으로 포맷팅
   * @param {string} timeStr - 시간 문자열
   * @returns {string} 포맷팅된 시간 문자열
   */
  formatTimeToMMss: (timeStr) => {
    if (!timeStr) return "-";
    
    // 이미 MM:ss 형식인 경우
    if (timeStr.includes(':')) {
      return timeStr;
    }
    
    // 숫자만 있는 경우 HHMM 형식으로 가정
    const time = timeStr.toString().padStart(4, '0');
    const hours = time.substring(0, 2);
    const minutes = time.substring(2, 4);
    
    return `${hours}:${minutes}`;
  },

  /**
   * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
   * @returns {string} 오늘 날짜 문자열
   */
  getTodayString: () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

/**
 * 데이터 검증 유틸리티 함수들
 */
export const ValidationUtils = {
  /**
   * 배열이 유효한지 확인
   * @param {Array} arr - 확인할 배열
   * @returns {boolean} 유효한 배열인지 여부
   */
  isValidArray: (arr) => {
    return Array.isArray(arr) && arr.length > 0;
  },

  /**
   * 숫자가 유효한지 확인
   * @param {any} value - 확인할 값
   * @returns {boolean} 유효한 숫자인지 여부
   */
  isValidNumber: (value) => {
    return value !== null && value !== undefined && Number.isFinite(value);
  },

  /**
   * 값이 0보다 큰지 확인
   * @param {any} value - 확인할 값
   * @returns {boolean} 0보다 큰지 여부
   */
  isPositiveNumber: (value) => {
    return ValidationUtils.isValidNumber(value) && value > 0;
  }
};

/**
 * 필드 생성 헬퍼 유틸리티
 */
export const FieldGeneratorUtils = {
  /**
   * 제어시간 필드들 생성 (1~16)
   * @param {string} defaultValue - 기본값 (기본: "")
   * @returns {Object} 제어시간 필드 객체
   */
  generateControlTimeFields: (defaultValue = "") => {
    const fields = {};
    for (let i = 1; i <= 16; i++) {
      fields[`controlTime${i}`] = defaultValue;
    }
    return fields;
  },

  /**
   * 제어감축량 필드들 생성 (1~10)
   * @param {number} defaultValue - 기본값 (기본: 0)
   * @returns {Object} 제어감축량 필드 객체
   */
  generateControlReductionFields: (defaultValue = 0) => {
    const fields = {};
    for (let i = 1; i <= 10; i++) {
      fields[`controlReduction${i}`] = defaultValue;
    }
    return fields;
  },

  /**
   * 피크값 필드들 생성 (1~4)
   * @param {number} defaultValue - 기본값 (기본: 0)
   * @returns {Object} 피크값 필드 객체
   */
  generatePeakFields: (defaultValue = 0) => {
    const fields = {};
    for (let i = 1; i <= 4; i++) {
      fields[`peak${i}`] = defaultValue;
    }
    return fields;
  },

  /**
   * 피크값 배열 필드들 생성 (1~4)
   * @param {Array} defaultValue - 기본값 (기본: [])
   * @returns {Object} 피크값 배열 필드 객체
   */
  generatePeakValueArrays: (defaultValue = []) => {
    const fields = {};
    for (let i = 1; i <= 4; i++) {
      fields[`peak${i}Values`] = defaultValue;
    }
    return fields;
  }
};

/**
 * 기본 데이터 생성 유틸리티 함수들
 */
export const DefaultDataUtils = {
  /**
   * 기본 시간 데이터 생성 (24시간)
   * @returns {Array} 기본 시간 데이터 배열
   */
  generateDefaultHourlyData: () => {
    const data = [];
    for (let i = 0; i < 24; i++) {
      data.push({
        time: i.toString().padStart(2, "0"),
        usage: 0,
        peak: 0,
        ...FieldGeneratorUtils.generatePeakFields(0),
        maxLoad: 0,
        maxLoadTime: "-",
        controlCount: 0,
        reduction: 0
      });
    }
    return data;
  },

  /**
   * 기본 월별 데이터 생성 (31일)
   * @returns {Array} 기본 월별 데이터 배열
   */
  generateDefaultMonthlyData: () => {
    const data = [];
    for (let i = 1; i <= 31; i++) {
      data.push({
        time: i.toString().padStart(2, "0"),
        usage: 0,
        peak: 0,
        ...FieldGeneratorUtils.generatePeakFields(0),
        maxLoad: 0,
        reduction: 0,
        controlCount: 0
      });
    }
    return data;
  },

  /**
   * 기본 제어 데이터 생성
   * @returns {Object} 기본 제어 데이터 객체
   */
  generateDefaultControlData: () => {
    return {
      controlCount: 0,
      times: {
        peak1: "-",
        peak2: "-", 
        peak3: "-",
        peak4: "-"
      }
    };
  },

  /**
   * 기본 데이터 아이템 생성 (공통 필드)
   * @returns {Object} 기본 데이터 아이템
   */
  generateDefaultDataItem: () => {
    return {
      usage: 0,
      peak: 0,
      ...FieldGeneratorUtils.generatePeakFields(0),
      maxLoad: 0,
      maxLoadTime: "",
      controlCount: 0,
      ...FieldGeneratorUtils.generateControlTimeFields(""),
      ...FieldGeneratorUtils.generateControlReductionFields(0),
      reduction: 0
    };
  },

  /**
   * 기본 데이터 아이템 생성 (시간 필드 포함)
   * @param {string} time - 시간 값
   * @returns {Object} 시간이 포함된 기본 데이터 아이템
   */
  generateDefaultDataItemWithTime: (time) => {
    return {
      time: time,
      ...DefaultDataUtils.generateDefaultDataItem()
    };
  },

  /**
   * 시간별 그룹 초기화 데이터 생성
   * @param {string} hourKey - 시간 키 (예: "00", "01", ...)
   * @returns {Object} 시간별 그룹 초기화 데이터
   */
  generateHourlyGroupData: (hourKey) => {
    return {
      time: hourKey,
      usage: 0,
      maxLoad: 0,
      maxLoadTime: "",
      controlCount: 0,
      ...FieldGeneratorUtils.generateControlTimeFields(""),
      ...FieldGeneratorUtils.generateControlReductionFields(0),
      reduction: 0,
      ...FieldGeneratorUtils.generatePeakValueArrays([]),
      count: 0
    };
  },

  /**
   * 월별 기본 데이터 생성 (특정 월의 일수만큼)
   * @param {Date} targetDate - 대상 날짜
   * @returns {Array} 월별 기본 데이터 배열
   */
  generateDefaultMonthlyDataForDate: (targetDate) => {
    const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      time: (i + 1).toString().padStart(2, "0"),
      ...DefaultDataUtils.generateDefaultDataItem()
    }));
  },

  /**
   * 년별 기본 데이터 생성 (12개월)
   * @returns {Array} 년별 기본 데이터 배열
   */
  generateDefaultYearlyData: () => {
    return Array.from({ length: 12 }, (_, i) => ({
      time: (i + 1).toString().padStart(2, "0"),
      ...DefaultDataUtils.generateDefaultDataItem()
    }));
  },

  /**
   * 시간별 기본 데이터 생성 (24시간)
   * @returns {Array} 시간별 기본 데이터 배열
   */
  generateDefaultHourlyDataForTransform: () => {
    return Array.from({ length: 24 }, (_, i) => ({
      time: i.toString().padStart(2, "0"),
      ...DefaultDataUtils.generateDefaultDataItem()
    }));
  },

  /**
   * 분기별 기본 데이터 생성 (15분 간격, 24시간)
   * @returns {Array} 분기별 기본 데이터 배열
   */
  generateDefaultQuarterlyData: () => {
    const quarterData = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let quarter = 0; quarter < 4; quarter++) {
        const minute = quarter * 15;
        const quarterDataItem = {
          time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
          ...DefaultDataUtils.generateDefaultDataItem()
        };
        quarterData.push(quarterDataItem);
      }
    }
    return quarterData;
  }
};

/**
 * 제어시간 관련 유틸리티 함수들
 */
export const ControlTimeUtils = {
  /**
   * 제어횟수가 0인지 확인
   * @param {number|string} controlCount - 제어횟수
   * @returns {boolean} 제어횟수가 0인지 여부
   */
  isControlCountZero: (controlCount) => {
    return controlCount === 0 || controlCount === "0" || !controlCount;
  },

  /**
   * 제어횟수에 따라 제어시간을 반환 (0이면 "-", 아니면 포맷팅된 시간)
   * @param {number|string} controlCount - 제어횟수
   * @param {string} controlTime - 제어시간
   * @param {Function} formatter - 시간 포맷터 함수 (선택사항)
   * @returns {string} 포맷팅된 제어시간 또는 "-"
   */
  formatControlTime: (controlCount, controlTime, formatter = null) => {
    if (ControlTimeUtils.isControlCountZero(controlCount)) {
      return "-";
    }
    
    if (!controlTime || controlTime === "00:00:00") {
      return "-";
    }
    
    return formatter ? formatter(controlTime) : controlTime;
  },

  /**
   * 제어횟수에 따라 모든 제어시간을 처리
   * @param {number|string} controlCount - 제어횟수
   * @param {Object} controlTimes - 제어시간 객체
   * @param {Function} formatter - 시간 포맷터 함수 (선택사항)
   * @returns {Object} 처리된 제어시간 객체
   */
  formatAllControlTimes: (controlCount, controlTimes, formatter = null) => {
    const result = {};
    
    if (ControlTimeUtils.isControlCountZero(controlCount)) {
      // 제어횟수가 0이면 모든 제어시간을 "-"로 설정
      for (let i = 1; i <= 16; i++) {
        result[`controlTime${i}`] = "-";
      }
    } else {
      // 제어횟수가 0이 아니면 각 제어시간을 포맷팅
      for (let i = 1; i <= 16; i++) {
        const timeKey = `controlTime${i}`;
        const timeValue = controlTimes[timeKey] || controlTimes[`ctrlTime${i}`] || controlTimes[`group${i}CtrlTime`];
        result[timeKey] = ControlTimeUtils.formatControlTime(controlCount, timeValue, formatter);
      }
    }
    
    return result;
  },

  /**
   * 데이터 배열에서 제어횟수 합계 계산
   * @param {Array} dataArray - 데이터 배열
   * @param {string} countKey - 제어횟수 키 (기본값: 'ctrlCount')
   * @returns {number} 제어횟수 합계
   */
  calculateTotalControlCount: (dataArray, countKey = 'ctrlCount') => {
    if (!Array.isArray(dataArray)) return 0;
    return dataArray.reduce((sum, item) => sum + (parseInt(item[countKey]) || 0), 0);
  },

  /**
   * 데이터 배열에서 유효한 제어시간 찾기
   * @param {Array} dataArray - 데이터 배열
   * @param {string} timeKey - 제어시간 키
   * @returns {string|null} 유효한 제어시간 또는 null
   */
  findValidControlTime: (dataArray, timeKey) => {
    if (!Array.isArray(dataArray)) return null;
    const validItem = dataArray.find(item => 
      item[timeKey] && 
      item[timeKey] !== "00:00:00" && 
      item[timeKey] !== ""
    );
    return validItem ? validItem[timeKey] : null;
  },

  /**
   * 제어시간 데이터를 일괄 처리하는 통합 함수
   * @param {Array} dataArray - 데이터 배열
   * @param {Function} formatter - 시간 포맷터 함수 (선택사항)
   * @returns {Object} 처리된 제어시간 데이터
   */
  processControlTimeData: (dataArray, formatter = null) => {
    const totalControlCount = ControlTimeUtils.calculateTotalControlCount(dataArray);
    const controlTimes = {};
    
    // 16개 제어시간 필드 처리
    for (let i = 1; i <= 16; i++) {
      const timeKey = `controlTime${i}`;
      const ctrlTimeKey = `ctrlTime${i}`;
      
      if (ControlTimeUtils.isControlCountZero(totalControlCount)) {
        controlTimes[timeKey] = "-";
      } else {
        const validTime = ControlTimeUtils.findValidControlTime(dataArray, ctrlTimeKey);
        controlTimes[timeKey] = ControlTimeUtils.formatControlTime(totalControlCount, validTime, formatter);
      }
    }
    
    return {
      controlCount: totalControlCount,
      ...controlTimes
    };
  }
};

/**
 * 시간별 그룹핑 유틸리티
 */
export const HourlyGroupingUtils = {
  /**
   * 제어시간 업데이트 (유효한 시간만 업데이트)
   * @param {Object} group - 그룹 객체
   * @param {Object} item - 아이템 객체
   */
  updateControlTimes: (group, item) => {
    for (let i = 1; i <= 16; i++) {
      const ctrlTimeField = `ctrlTime${i}`;
      const controlTimeField = `controlTime${i}`;
      if (item[ctrlTimeField] && item[ctrlTimeField] !== "00:00:00") {
        group[controlTimeField] = item[ctrlTimeField];
      }
    }
  },

  /**
   * 제어감축량 업데이트
   * @param {Object} group - 그룹 객체
   * @param {Object} item - 아이템 객체
   */
  updateControlReductions: (group, item) => {
    for (let i = 1; i <= 10; i++) {
      const groupReductionField = `group${i}Reduction`;
      const controlReductionField = `controlReduction${i}`;
      group[controlReductionField] = item[groupReductionField] || 0;
    }
  },

  /**
   * 피크값 배열에 추가
   * @param {Object} group - 그룹 객체
   * @param {Object} item - 아이템 객체
   */
  updatePeakValues: (group, item) => {
    for (let i = 1; i <= 4; i++) {
      const peakField = `peak${i}`;
      const peakValuesField = `peak${i}Values`;
      if (item[peakField]) {
        group[peakValuesField].push(item[peakField]);
      }
    }
  },

  /**
   * 그룹 데이터 업데이트 (전체)
   * @param {Object} group - 그룹 객체
   * @param {Object} item - 아이템 객체
   */
  updateGroupData: (group, item) => {
    group.usage += item.usageSum || 0;
    group.maxLoad = Math.max(group.maxLoad, item.ctrlMaxLoad || 0);
    group.maxLoadTime = item.ctrlMaxLoadTime || "-";
    group.controlCount += item.ctrlCount || 0;
    group.reduction += item.reductionSum || 0;
    group.count++;
    
    HourlyGroupingUtils.updateControlTimes(group, item);
    HourlyGroupingUtils.updateControlReductions(group, item);
    HourlyGroupingUtils.updatePeakValues(group, item);
  },

  /**
   * 피크값 평균 계산 및 포맷팅
   * @param {Object} group - 그룹 객체
   * @returns {Object} 계산된 피크값들
   */
  calculatePeakAverages: (group) => {
    const peakData = {};
    const peakValues = [];
    
    for (let i = 1; i <= 4; i++) {
      const peakValuesField = `peak${i}Values`;
      const validCount = group[peakValuesField].length;
      const total = group[peakValuesField].reduce((sum, val) => sum + val, 0);
      const avg = validCount > 0 ? total / validCount : 0;
      const normalized = Math.round((avg / 1000) * 1000) / 1000;
      const formatted = parseFloat(normalized.toFixed(2));
      
      peakData[`peak${i}`] = formatted;
      peakValues.push(formatted);
    }
    
    peakData.peak = Math.max(...peakValues);
    return peakData;
  }
};
