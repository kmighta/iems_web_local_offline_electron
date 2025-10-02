import { useState, useCallback } from 'react';
import { MappingUtils } from '@/utils/dataProcessingUtils';
import { handleExcelDownload } from '@/utils/excelExport';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTheme } from '@/components/theme-provider';

/**
 * 사용량 리포트 엑셀 다운로드 관리 커스텀 훅
 */
export const useUsageReportExcel = (
  activeTab,
  viewType,
  deviceInfo,
  selectedStore,
  hourlyData,
  quarterData,
  clockHourlyData,
  controlData,
  graphUnit,
  getBarColor,
  currentTab,
  getSelectedDateAsDateObject,
  tableData // 테이블 데이터 추가
) => {
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleExcelSave = useCallback(async (chartRef) => {
    try {
      setLoading(true);
      
      // 현재 탭에 따른 데이터 준비
      let excelData = [];
      const mappedActiveTab = MappingUtils.mapTabToExcelFormat(activeTab);
      const mappedViewType = MappingUtils.mapViewTypeToExcelFormat(viewType);
      const selectedDateObj = getSelectedDateAsDateObject();

      // 사업장명 가져오기
      const storeName = deviceInfo?.storeName || selectedStore?.name || "사업장";

      // 엑셀용 데이터 변환
      const isClockTabForExcel = activeTab === "최대부하" || activeTab === "제어현황";
      const currentData = isClockTabForExcel
        ? clockHourlyData
        : (mappedViewType === 'yearly' ? hourlyData : (graphUnit === 'hour' ? hourlyData : quarterData));
      
      if (activeTab === "전력 사용량") {
        excelData = currentData.map(row => ({
          time: row.time,
          usage: parseFloat(row.usage) || 0
        }));
      } else if (activeTab === "전력 피크") {
        // 전력 피크: tableData 사용 (15분/1시간 단위 구분)
        console.log('[엑셀 다운로드] 전력 피크 데이터 처리:', {
          tableDataLength: tableData?.length || 0,
          graphUnit,
          sampleTableData: tableData?.slice(0, 3)
        });
        
        excelData = tableData.map(row => {
          // 시간 필드 정규화
          let timeValue = row.time || row.hour || "";
          
          if (timeValue && timeValue !== "-") {
            if (graphUnit === "hour") {
              // 1시간 단위: HH시 형식으로 변환
              if (timeValue.includes(":")) {
                // HH:MM 형식에서 시간만 추출하여 HH시 형식으로 변환
                const hour = timeValue.split(":")[0];
                timeValue = `${hour.padStart(2, "0")}시`;
              } else if (!timeValue.includes("시")) {
                // 숫자만 있는 경우 HH시 형식으로 변환
                const hour = parseInt(timeValue);
                if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                  timeValue = `${hour.toString().padStart(2, "0")}시`;
                }
              }
            } else {
              // 15분 단위: HH:MM 형식 그대로 사용
              if (!timeValue.includes(":")) {
                // 숫자만 있는 경우 HH:00 형식으로 변환
                const hour = parseInt(timeValue);
                if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                  timeValue = `${hour.toString().padStart(2, "0")}:00`;
                }
              }
            }
          } else {
            // timeValue가 없거나 "-"인 경우 데이터 인덱스로 시간 생성
            const dataIndex = tableData.indexOf(row);
            if (graphUnit === "hour") {
              timeValue = `${dataIndex.toString().padStart(2, "0")}시`;
            } else {
              const hour = Math.floor(dataIndex / 4);
              const minute = (dataIndex % 4) * 15;
              timeValue = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
            }
          }
          
          if (graphUnit === "quarter") {
            // 15분 단위: 시간대별 피크 값 결정 (00분→피크1, 15분→피크2, 30분→피크3, 45분→피크4)
            const timeStr = timeValue || '';
            const minute = timeStr.includes(':') ? parseInt(timeStr.split(':')[1]) : 0;
            let peakValue = parseFloat(row.peak1) || 0;
            
            if (minute === 15) peakValue = parseFloat(row.peak2) || 0;
            else if (minute === 30) peakValue = parseFloat(row.peak3) || 0;
            else if (minute === 45) peakValue = parseFloat(row.peak4) || 0;
            
            return {
              time: timeValue,
              peak: peakValue
            };
          } else {
            // 1시간 단위: 피크1,2,3,4 모두 표시
            return {
              time: timeValue,
              peak1: parseFloat(row.peak1) || 0,
              peak2: parseFloat(row.peak2) || 0,
              peak3: parseFloat(row.peak3) || 0,
              peak4: parseFloat(row.peak4) || 0
            };
          }
        });
      } else if (activeTab === "최대부하") {
        // 최대부하: tableData 사용 (24시간/31일/12개월 구조)
        console.log('[엑셀 다운로드] 최대부하 데이터 처리:', {
          tableDataLength: tableData?.length || 0,
          sampleTableData: tableData?.slice(0, 3)
        });
        
        excelData = tableData.map(row => {
          // 시간 필드 정규화
          let timeValue = row.time || row.hour || row.day || row.month || "";
          
          // 뷰 타입에 따른 시간 형식 변환
          if (viewType === "일별 보기") {
            // 일별 보기: HH시 형식으로 변환
            if (timeValue && timeValue !== "-") {
              if (timeValue.includes(":")) {
                // HH:MM 형식에서 시간만 추출하여 HH시 형식으로 변환
                const hour = timeValue.split(":")[0];
                timeValue = `${hour.padStart(2, "0")}시`;
              } else if (!timeValue.includes("시")) {
                // 숫자만 있는 경우 HH시 형식으로 변환
                const hour = parseInt(timeValue);
                if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                  timeValue = `${hour.toString().padStart(2, "0")}시`;
                }
              }
            } else {
              // timeValue가 없거나 "-"인 경우 데이터 인덱스로 시간 생성
              const dataIndex = tableData.indexOf(row);
              timeValue = `${dataIndex.toString().padStart(2, "0")}시`;
            }
          } else if (viewType === "월별 보기") {
            // 월별 보기: 일 형식 (01일, 02일, ...)
            if (timeValue && timeValue !== "-") {
              if (!timeValue.includes("일")) {
                const day = parseInt(timeValue);
                if (!isNaN(day)) {
                  timeValue = `${day.toString().padStart(2, "0")}일`;
                }
              }
            } else {
              const dataIndex = tableData.indexOf(row);
              timeValue = `${(dataIndex + 1).toString().padStart(2, "0")}일`;
            }
          } else if (viewType === "년별 보기") {
            // 년별 보기: 월 형식 (01월, 02월, ...)
            if (timeValue && timeValue !== "-") {
              if (!timeValue.includes("월")) {
                const month = parseInt(timeValue);
                if (!isNaN(month)) {
                  timeValue = `${month.toString().padStart(2, "0")}월`;
                }
              }
            } else {
              const dataIndex = tableData.indexOf(row);
              timeValue = `${(dataIndex + 1).toString().padStart(2, "0")}월`;
            }
          }
          
          // 최대부하 값 포맷팅 (소수점 3자리, 천단위 구분자)
          const maxLoadValue = parseFloat(row.maxLoad) || 0;
          const formattedMaxLoad = maxLoadValue === 0 ? "-" : 
            parseFloat(maxLoadValue.toFixed(3)).toLocaleString(undefined, {
              minimumFractionDigits: 3,
              maximumFractionDigits: 3
            });
          
          // 최대부하시간 포맷팅 - ctrlMaxLoadTime 필드 사용
          const maxLoadTimeValue = row?.ctrlMaxLoadTime || row?.maxLoadTime;
          let formattedMaxLoadTime = "-";
          
          if (maxLoadTimeValue && maxLoadTimeValue !== "-" && maxLoadTimeValue !== "00:00:00") {
            // HH:MM:SS 형식을 MM:SS로 변환
            const timeParts = maxLoadTimeValue.split(':');
            if (timeParts.length >= 3) {
              // HH:MM:SS -> MM:SS (분:초)
              formattedMaxLoadTime = `${timeParts[1]}:${timeParts[2]}`;
            } else if (timeParts.length === 2) {
              // MM:SS 형식이면 그대로 사용
              formattedMaxLoadTime = maxLoadTimeValue;
            } else {
              formattedMaxLoadTime = maxLoadTimeValue;
            }
          }
          
          return {
            time: timeValue,
            maxLoad: formattedMaxLoad,
            maxLoadTime: formattedMaxLoadTime
          };
        });
      } else if (activeTab === "감축량") {
        excelData = currentData.map(row => ({
          time: row.time,
          reduction: parseFloat(row.reduction) || 0
        }));
      } else if (activeTab === "제어현황") {
        // 제어현황: tableData 사용 (24시간 구조)
        console.log('[엑셀 다운로드] 제어현황 데이터 처리:', {
          tableDataLength: tableData?.length || 0,
          sampleTableData: tableData?.slice(0, 3)
        });
        
        excelData = tableData.map(row => {
          // 시간 필드 정규화 (HH시 형식으로 변환)
          let timeValue = row.time || row.hour || "";
          if (timeValue && timeValue !== "-") {
            if (timeValue.includes(":")) {
              // HH:MM 형식에서 시간만 추출하여 HH시 형식으로 변환
              const hour = timeValue.split(":")[0];
              timeValue = `${hour.padStart(2, "0")}시`;
            } else if (!timeValue.includes("시")) {
              // 숫자만 있는 경우 HH시 형식으로 변환
              const hour = parseInt(timeValue);
              if (!isNaN(hour) && hour >= 0 && hour <= 23) {
                timeValue = `${hour.toString().padStart(2, "0")}시`;
              }
            }
          } else {
            // timeValue가 없거나 "-"인 경우 데이터 인덱스로 시간 생성
            const dataIndex = tableData.indexOf(row);
            timeValue = `${dataIndex.toString().padStart(2, "0")}시`;
          }
          
          return {
            time: timeValue,
            controlCount: parseInt(row.controlCount || row.ctrlCount) || 0,
            controlTime1: row.controlTime1 || "-",
            controlTime2: row.controlTime2 || "-",
            controlTime3: row.controlTime3 || "-",
            controlTime4: row.controlTime4 || "-",
            controlTime5: row.controlTime5 || "-",
            controlTime6: row.controlTime6 || "-",
            controlTime7: row.controlTime7 || "-",
            controlTime8: row.controlTime8 || "-",
            controlTime9: row.controlTime9 || "-",
            controlTime10: row.controlTime10 || "-"
          };
        });
      }

      // 차트 색상과 텍스트 설정
      const mainLegendColor = getBarColor(currentTab?.color);
      const mainLegendText = activeTab;

      // 엑셀 저장 함수 호출
      await handleExcelDownload({
        data: excelData,
        viewType: mappedViewType,
        activeTab: mappedActiveTab,
        selectedDate: selectedDateObj,
        chartRef,
        mainLegendColor,
        mainLegendText,
        storeName,
        ExcelJS,
        saveAs,
        format,
        ko,
        useSvgCapture: true,
        isDarkMode: theme === 'dark'
      });
      
    } catch (error) {
      console.error('엑셀 저장 중 오류:', error);
      console.error('오류 상세:', {
        message: error.message,
        stack: error.stack,
        activeTab,
        viewType
      });
      alert(`엑셀 저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    viewType,
    deviceInfo,
    selectedStore,
    hourlyData,
    quarterData,
    clockHourlyData,
    controlData,
    graphUnit,
    getBarColor,
    currentTab,
    getSelectedDateAsDateObject,
    theme
  ]);

  return {
    loading,
    handleExcelSave
  };
};
