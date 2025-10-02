/**
 * 사용량 리포트 관련 유틸리티 함수들
 */

/**
 * 시간 문자열을 HH:MM 형식으로 포맷팅
 * @param {string} timeStr - 시간 문자열 (HH:mm:ss 또는 HH:mm:ss.ffffff)
 * @returns {string} - HH:MM 형식의 시간 또는 "-"
 */
export function formatTimeToMMss(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "-";

  const timeParts = timeStr.split(":");
  
  // 유효하지 않은 시간 형식인 경우 "-" 반환
  if (timeParts.length < 2) return "-";
  
  const [hh, mm, ss] = timeParts;
  
  // undefined 체크 추가
  if (!hh || !mm) return "-";
  
  // 00:00:00 또는 00:00:00.000000인 경우만 "-" 반환
  if (timeStr === "00:00:00" || timeStr === "00:00:00.000000" || (hh === "00" && mm === "00" && (ss === "00" || !ss))) {
    return "-";
  }
  
  // HH:MM 형식으로 반환 (시:분만 표시)
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
}

/**
 * 시간 문자열을 MM:SS 형식으로 포맷팅
 * @param {string} timeStr - 시간 문자열 (HH:mm:ss 또는 HH:mm:ss.ffffff)
 * @returns {string} - MM:SS 형식의 시간 또는 "-"
 */
export function formatTimeMMSS(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "-";

  const timeParts = timeStr.split(":");
  
  // 이미 MM:SS 형식인 경우 (2개 파트)
  if (timeParts.length === 2) {
    const [mm, ss] = timeParts;
    if (!mm || !ss) return "-";
    
    // 00:00인 경우 "-" 반환
    if (mm === "00" && ss.split('.')[0] === "00") {
      return "-";
    }
    
    // 이미 올바른 형식이므로 그대로 반환
    const seconds = ss.split('.')[0]; // 소수점 제거
    return `${mm.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
  }
  
  // HH:MM:SS 형식인 경우 (3개 파트)
  if (timeParts.length === 3) {
    const [hh, mm, ss] = timeParts;
    
    // undefined 체크 추가
    if (!mm || !ss) return "-";
    
    // 00:00:00 또는 00:00:00.000000인 경우만 "-" 반환
    if (timeStr === "00:00:00" || timeStr === "00:00:00.000000" || (hh === "00" && mm === "00" && ss.split('.')[0] === "00")) {
      return "-";
    }
    
    // MM:SS 형식으로 반환 (분:초만 표시)
    const seconds = ss.split('.')[0]; // 소수점 제거
    return `${mm.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
  }
  
  // 유효하지 않은 형식인 경우 "-" 반환
  return "-";
}

/**
 * 모바일 환경 감지 함수
 * @returns {boolean} - 모바일 환경 여부
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.innerWidth <= 768 && 'ontouchstart' in window);
};

/**
 * 제어횟수에 따라 제어시간을 마스킹하는 함수
 * @param {number} count - 제어횟수
 * @param {Object} times - 제어시간 객체
 * @returns {Object} - 마스킹된 제어시간 객체
 */
export const maskControlTimes = (count, times) => {
  const masked = {};
  for (let i = 1; i <= 16; i++) {
    const key = `controlTime${i}`;
    const raw = times[key];
    masked[key] =
      count >= i && raw && raw !== "00:00:00" && raw !== "00:00:00.000000"
        ? (formatTimeToMMss(raw) || "-")
        : "-";
  }
  return masked;
};

/**
 * 날짜를 API 형식으로 포맷팅
 * @param {Date} date - 포맷팅할 날짜
 * @param {string} format - 포맷 문자열
 * @returns {string} - 포맷팅된 날짜 문자열
 */
export const formatDateForAPI = (date, format = "yyyy-MM-dd'T'HH:mm:ss") => {
  if (!date || !(date instanceof Date)) return "";
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 숫자를 소수점 2자리까지 반올림
 * @param {number} num - 반올림할 숫자
 * @returns {number} - 반올림된 숫자
 */
export const roundToTwoDecimals = (num) => {
  return Math.round((num || 0) * 100) / 100;
};

export const roundToThreeDecimals = (num) => {
  return Math.round((num || 0) * 1000) / 1000;
};

/**
 * 배열에서 유효한 피크값들을 필터링하고 합계 계산
 * @param {Array} peaks - 피크값 배열
 * @returns {Object} - {validPeaks, totalSum, count}
 */
export const processValidPeaks = (peaks) => {
  const validPeaks = peaks.filter(peak => peak > 0);
  const totalSum = validPeaks.reduce((sum, peak) => sum + peak, 0);
  const count = validPeaks.length;
  
  return {
    validPeaks,
    totalSum,
    count,
    average: count > 0 ? totalSum / count : 0
  };
};

/**
 * 시간 문자열을 Date 객체로 변환
 * @param {string} timeStr - 시간 문자열
 * @returns {Date|null} - Date 객체 또는 null
 */
export const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  
  try {
    const date = new Date(timeStr);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    return null;
  }
};

/**
 * 두 날짜가 같은 날인지 확인
 * @param {Date} date1 - 첫 번째 날짜
 * @param {Date} date2 - 두 번째 날짜
 * @returns {boolean} - 같은 날 여부
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

/**
 * 두 날짜가 같은 시간인지 확인
 * @param {Date} date1 - 첫 번째 날짜
 * @param {Date} date2 - 두 번째 날짜
 * @returns {boolean} - 같은 시간 여부
 */
export const isSameHour = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  return isSameDay(date1, date2) && date1.getHours() === date2.getHours();
};
