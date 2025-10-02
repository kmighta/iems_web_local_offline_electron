// 엑셀 저장 유틸리티 (엑셀JS, file-saver, date-fns 등은 페이지에서 import해서 전달)

// hex → rgba 변환 함수
export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

// SVG에서 Brush(부쉬) 숨김 스타일 삽입
export function hideBrushInSvg(mergedSvg) {
  const brushHideStyle = `\n<style>\n.recharts-brush, .recharts-brush-slide, .recharts-brush-traveller { display: none !important; }\n</style>\n`;
  return mergedSvg.replace(/<svg([^>]*)>/, `<svg$1>${brushHideStyle}`);
}

// SVG 기반 차트 이미지 캡처 함수
export async function captureChartAsSvgImage({ chartRef, activeTab, mainLegendColor, mainLegendText }) {
  if (!chartRef.current) return null;
  
  try {
    // 1. 차트 SVG 추출 시도
    const chartNode = chartRef.current;
    let svgElement = null;
    if (chartNode) {
      svgElement = chartNode.querySelector('svg');
    }
    
    if (svgElement) {
      // SVG 실제 크기 계산
      let width = 640;
      let chartHeight = 300;
      if (svgElement.viewBox && svgElement.viewBox.baseVal) {
        width = svgElement.viewBox.baseVal.width || width;
        chartHeight = svgElement.viewBox.baseVal.height || chartHeight;
      } else if (svgElement.width && svgElement.width.baseVal) {
        width = svgElement.width.baseVal.value || width;
        chartHeight = svgElement.height.baseVal.value || chartHeight;
      }
      const totalHeight = chartHeight + 40;
      
      // 범례 SVG 생성
      const legendSvg = `
        <svg width="${width}" height="40">
          <rect x="24" y="10" width="18" height="18" fill="${mainLegendColor}" rx="3"/>
          <text x="52" y="24" font-size="14" fill="#666">${mainLegendText}</text>
          <rect x="144" y="10" width="18" height="18" fill="#3182ce" rx="3"/>
          <text x="172" y="24" font-size="14" fill="#666">어제</text>
          <rect x="244" y="10" width="18" height="18" fill="#f6ad55" rx="3"/>
          <text x="272" y="24" font-size="14" fill="#666">이전달</text>
          <rect x="344" y="10" width="18" height="18" fill="#9f7aea" rx="3"/>
          <text x="372" y="24" font-size="14" fill="#666">이전년도</text>
        </svg>
      `;
      
      // 차트 SVG 문자열
      const chartSvgStr = new XMLSerializer().serializeToString(svgElement);
      
      // 전체 SVG wrap (세로로 합치기)
      let mergedSvg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${totalHeight}'>
          <g>
            <foreignObject x='0' y='0' width='${width}' height='40'>${legendSvg}</foreignObject>
          </g>
          <g transform='translate(0,40)'>
            ${chartSvgStr}
          </g>
        </svg>
      `;
      
      // Brush(부쉬) 부분을 none 처리하는 style 삽입
      mergedSvg = hideBrushInSvg(mergedSvg);
      
      // base64 인코딩
      const svgBase64 = window.btoa(unescape(encodeURIComponent(mergedSvg)));
      
      // 이미지 객체 생성
      const img = new window.Image();
      
      // canvas 생성
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = totalHeight;
      
      // 이미지 로드 후 캔버스에 그림
      return await new Promise((resolve, reject) => {
        img.onload = function() {
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          try {
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = reject;
        img.src = 'data:image/svg+xml;base64,' + svgBase64;
      });
    } else {
      // SVG가 없으면 fallback 이미지 생성
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '800px';
      tempDiv.style.height = '400px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '20px';
      tempDiv.innerHTML = `
        <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #000000;">
          ${activeTab === 'usage' ? '전력 사용량' : activeTab === 'peak' ? '전력 피크' : activeTab === 'maxload' ? '최대부하' : '전력 감축량'} 차트
        </div>
        <div style="text-align: center; color: #666666; font-size: 14px;">
          차트 이미지를 생성할 수 없습니다.<br/>
          데이터는 아래 표를 참고해주세요.
        </div>
      `;
      document.body.appendChild(tempDiv);
      try {
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 800;
        fallbackCanvas.height = 400;
        const ctx = fallbackCanvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 800, 400);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${activeTab === 'usage' ? '전력 사용량' : activeTab === 'peak' ? '전력 피크' : activeTab === 'maxload' ? '최대부하' : '전력 감축량'} 차트`, 400, 80);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('차트 이미지를 생성할 수 없습니다. 데이터는 아래 표를 참고해주세요.', 400, 200);
        const result = fallbackCanvas.toDataURL('image/png');
        document.body.removeChild(tempDiv);
        return result;
      } catch (fallbackError) {
        document.body.removeChild(tempDiv);
        return null;
      }
    }
  } catch (e) {
    return null;
  }
}

// 차트 이미지를 캡처하는 함수 (html2canvas 활용)
export async function captureChartAsImage({ chartRef, activeTab, html2canvas }) {
  if (!chartRef.current) return null;
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: '#ffffff',
      scale: 1,
      useCORS: false,
      allowTaint: false,
      logging: false,
      foreignObjectRendering: false,
      removeContainer: true,
      width: chartRef.current.offsetWidth,
      height: chartRef.current.offsetHeight,
      onclone: (clonedDoc, element) => {
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            color: #000000 !important;
            background-color: transparent !important;
            border-color: #cccccc !important;
          }
          svg, svg * {
            fill: #000000 !important;
            stroke: #000000 !important;
            color: #000000 !important;
          }
          .recharts-line { stroke: #4fd1c5 !important; }
          .recharts-legend-item { color: #000000 !important; }
          .recharts-cartesian-axis-tick-value { fill: #000000 !important; }
          .recharts-tooltip-wrapper {
            background-color: #ffffff !important;
            border: 1px solid #cccccc !important;
            color: #000000 !important;
          }
          text { fill: #000000 !important; color: #000000 !important; }
          .recharts-cartesian-grid-horizontal line,
          .recharts-cartesian-grid-vertical line { stroke: #e0e0e0 !important; }
          .recharts-surface { background-color: #ffffff !important; }
        `;
        clonedDoc.head.appendChild(style);
        const allElements = clonedDoc.querySelectorAll('*');
        allElements.forEach(el => {
          if (el.style) {
            for (let i = 0; i < el.style.length; i++) {
              const property = el.style[i];
              const value = el.style.getPropertyValue(property);
              if (value && value.includes('oklch')) {
                el.style.setProperty(property, '#000000', 'important');
              }
            }
          }
          if (el.classList) {
            el.classList.forEach(className => {
              if (className.includes('text-') || className.includes('bg-') || className.includes('border-')) {
                el.style.setProperty('color', '#000000', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('border-color', '#cccccc', 'important');
              }
            });
          }
        });
      }
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    // fallback: 간단한 이미지 생성
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.width = '800px';
      tempDiv.style.height = '400px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '20px';
      tempDiv.innerHTML = `
        <div style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; color: #000000;">
          ${activeTab === 'usage' ? '전력 사용량' : activeTab === 'peak' ? '전력 피크' : activeTab === 'maxload' ? '최대부하' : '전력 감축량'} 차트
        </div>
        <div style="text-align: center; color: #666666; font-size: 14px;">
          차트 이미지를 생성할 수 없습니다.<br/>
          데이터는 아래 표를 참고해주세요.
        </div>
      `;
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-99999px';
      tempDiv.style.top = '-99999px';
      tempDiv.style.zIndex = '-99999';
      tempDiv.style.opacity = '0';
      tempDiv.style.pointerEvents = 'none';
      document.body.appendChild(tempDiv);
      let chartImageDataUrl = null;
      try {
        const canvas = await html2canvas(tempDiv, { backgroundColor: '#fff', scale: 1 });
        chartImageDataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        chartImageDataUrl = null;
      }
      document.body.removeChild(tempDiv);
      return chartImageDataUrl;
    } catch (fallbackError) {
      return null;
    }
  }
}

// 워크북/시트 생성
export function createWorkbookAndSheet(ExcelJS) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  return { workbook, worksheet };
}

// 타이틀/헤더/스타일 추가
export function addExcelTitleAndHeader(worksheet, { activeTab, titleBgColor, titleText, timeStr, storeName }) {
  worksheet.mergeCells("A1:E1");
  worksheet.getCell("A1").value = titleText;
  worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getCell("A1").font = { bold: true, size: 20, color: { argb: "000000" } };
  worksheet.getCell("A1").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: titleBgColor }
  };
  
  // A2~B2에 사업장명 추가
  worksheet.mergeCells("A2:B2");
  worksheet.getCell("A2").value = `사업장 : ${storeName || "사업장"}`;
  worksheet.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };
  worksheet.getCell("A2").font = { size: 13, color: { argb: "000000" } };
  worksheet.getCell("A2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F5F5F5" }
  };
  
  // C2~E2에 출력시간
  worksheet.mergeCells("C2:E2");
  worksheet.getCell("C2").value = `출력시간 : ${timeStr}`;
  worksheet.getCell("C2").alignment = { horizontal: "right", vertical: "middle" };
  worksheet.getCell("C2").font = { size: 13, color: { argb: "000000" } };
  worksheet.getCell("C2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F5F5F5" }
  };
  
  let headerRow;
  if (activeTab === 'maxload') {
    headerRow = ["시간", "최대부하(kW)", "", "", ""];
  } else if (activeTab === 'reduction') {
    headerRow = ["시간", "감축량(kWh)", "", "", ""];
  } else if (activeTab === 'peak') {
    headerRow = ["시간", "피크1(kW)", "피크2(kW)", "피크3(kW)", "피크4(kW)"];
  } else if (activeTab === 'control') {
    headerRow = ["시간", "제어횟수", "", "", ""];
  } else {
    headerRow = ["시간", "사용량(kWh)", "", "", ""];
  }
  worksheet.addRow(headerRow);
  ["A3", "B3", "C3", "D3", "E3"].forEach(cell => {
    worksheet.getCell(cell).alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getCell(cell).font = { bold: true, size: 13, color: { argb: "000000" } };
    worksheet.getCell(cell).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "CFD8DC" }
    };
    worksheet.getCell(cell).border = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
    };
  });
  if (activeTab !== 'peak') {
    worksheet.mergeCells("B3:E3");
  }
}

// 데이터 행 추가 및 스타일
export function addExcelDataRows(worksheet, data, activeTab) {
  let dataRows;
  if (activeTab === 'maxload') {
    dataRows = data.map(row => [row.time, row.maxLoad, '', '', '']);
  } else if (activeTab === 'reduction') {
    dataRows = data.map(row => [row.time, row.reduction, '', '', '']);
  } else if (activeTab === 'peak') {
    dataRows = data.map(row => [row.time, row.peak1, row.peak2, row.peak3, row.peak4]);
  } else if (activeTab === 'control') {
    dataRows = data.map(row => [row.time, row.controlCount, '', '', '']);
  } else {
    dataRows = data.map(row => [row.time, row.usage, '', '', '']);
  }
  dataRows.forEach(row => worksheet.addRow(row));
  
  // 합계 계산 및 추가
  let totalValue = 0;
  let summaryLabel = '';
  
  if (activeTab === 'usage') {
    totalValue = data.reduce((sum, row) => sum + (parseFloat(row.usage) || 0), 0);
    summaryLabel = '총 사용량';
  } else if (activeTab === 'peak') {
    // 피크는 최대값을 구함
    const peak1Max = Math.max(...data.map(row => parseFloat(row.peak1) || 0));
    const peak2Max = Math.max(...data.map(row => parseFloat(row.peak2) || 0));
    const peak3Max = Math.max(...data.map(row => parseFloat(row.peak3) || 0));
    const peak4Max = Math.max(...data.map(row => parseFloat(row.peak4) || 0));
    totalValue = Math.max(peak1Max, peak2Max, peak3Max, peak4Max);
    summaryLabel = '일별 최대 피크';
  } else if (activeTab === 'maxload') {
    totalValue = Math.max(...data.map(row => parseFloat(row.maxLoad) || 0));
    summaryLabel = '일별 최대부하';
  } else if (activeTab === 'control') {
    totalValue = data.reduce((sum, row) => sum + (parseInt(row.controlCount) || 0), 0);
    summaryLabel = '일별 제어횟수';
  }
  
  // 합계 행 추가
  if (activeTab === 'peak') {
    // 피크의 경우 각 피크별 최대값 표시
    const peak1Max = Math.max(...data.map(row => parseFloat(row.peak1) || 0));
    const peak2Max = Math.max(...data.map(row => parseFloat(row.peak2) || 0));
    const peak3Max = Math.max(...data.map(row => parseFloat(row.peak3) || 0));
    const peak4Max = Math.max(...data.map(row => parseFloat(row.peak4) || 0));
    const summaryRow = [summaryLabel, peak1Max.toFixed(1), peak2Max.toFixed(1), peak3Max.toFixed(1), peak4Max.toFixed(1)];
    worksheet.addRow(summaryRow);
  } else {
    const summaryRow = [summaryLabel, totalValue.toFixed(activeTab === 'control' ? 0 : 1), '', '', ''];
    worksheet.addRow(summaryRow);
  }
  
  const lastDataRow = 3 + dataRows.length;
  const summaryRowIndex = lastDataRow + 1;
  
  // 데이터 행 스타일링
  for (let i = 0; i < dataRows.length; i++) {
    const rowIdx = 4 + i;
    ["A", "B", "C", "D", "E"].forEach((col, j) => {
      const cell = worksheet.getCell(`${col}${rowIdx}`);
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.font = { size: 13 };
      cell.border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
      };
    });
    if (activeTab !== 'peak') {
      worksheet.mergeCells(`B${rowIdx}:E${rowIdx}`);
    }
  }
  
  // 합계 행 스타일링 (배경색과 굵은 폰트)
  ["A", "B", "C", "D", "E"].forEach((col, j) => {
    const cell = worksheet.getCell(`${col}${summaryRowIndex}`);
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.font = { size: 13, bold: true, color: { argb: "FFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4472C4" } // 파란색 배경
    };
    cell.border = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
    };
  });
  
  if (activeTab !== 'peak') {
    worksheet.mergeCells(`B${summaryRowIndex}:E${summaryRowIndex}`);
  }
  
  return lastDataRow + 1; // 합계 행까지 포함한 마지막 행 번호 반환
}

// 차트 이미지 삽입
export function insertChartImageToSheet(worksheet, chartImageDataUrl, lastDataRow, ExcelJS, isDarkMode = false) {
  if (chartImageDataUrl) {
    try {
      console.log('차트 이미지 삽입 시작:', chartImageDataUrl.substring(0, 50) + '...');
      const base64Data = chartImageDataUrl.split(',')[1];
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const chartImageId = worksheet.workbook.addImage({
        buffer: imageBuffer,
        extension: 'png',
      });
      
      // 차트 위치를 더 명확하게 설정
      const chartRowPosition = lastDataRow + 2;  // 한 행 띄우기
      const chartEndRow = chartRowPosition + 20;
      
      // 다크모드일 때만 차트 영역의 모든 셀에 검정색 배경색 적용 (A열부터 E열까지)
      if (isDarkMode) {
        for (let row = chartRowPosition; row <= chartEndRow; row++) {
          for (let col = 1; col <= 5; col++) { // A(1)부터 E(5)까지
            const cell = worksheet.getCell(row, col);
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "000000" } // 검정색 배경
            };
          }
        }
      }
      
      worksheet.addImage(chartImageId, {
        tl: { col: 0, row: chartRowPosition },
        br: { col: 4, row: chartRowPosition + 20 },  // 끝점을 명시적으로 설정
      });
      
      console.log('차트 이미지 삽입 완료');
    } catch (error) {
      console.error('차트 이미지 삽입 중 오류:', error);
    }
  } else {
    console.log('차트 이미지가 캡처되지 않아 삽입을 건너뜁니다.');
  }
}

// 파일명 생성
export function getExcelFilename(viewType, selectedDate, format, ko, activeTab) {
  const dateStr = viewType === "daily"
    ? format(selectedDate, "yyyyMMdd", { locale: ko })
    : viewType === "monthly"
    ? format(selectedDate, "yyyyMM", { locale: ko })
    : format(selectedDate, "yyyy", { locale: ko });
  
  // activeTab에 따른 파일명 접두사
  const tabPrefix = 
    activeTab === 'usage' ? '전력사용량'
    : activeTab === 'peak' ? '전력피크'
    : activeTab === 'maxload' ? '최대부하'
    : activeTab === 'control' ? '제어현황'
    : '전력사용량';
  
  return `${tabPrefix}-${dateStr}.xlsx`;
}

// 메인 엑셀 저장 함수 (SVG 방식과 html2canvas 방식 모두 지원)
export async function handleExcelDownload({
  data,
  viewType,
  graphUnit,
  hourlyData,
  quarterData,
  selectedDate,
  mainLegendColor,
  mainLegendText,
  activeTab,
  format,
  ko,
  chartImageDataUrl,
  ExcelJS,
  saveAs,
  // SVG 방식 사용 시 필요한 파라미터들
  chartRef,
  useSvgCapture = false,
  storeName, // 추가된 파라미터
  isDarkMode = false // 테마 파라미터 추가
}) {
  if (!data || data.length === 0) return;

  // 이미지 캡처 (SVG 방식 또는 기존 방식)
  let finalChartImageDataUrl = chartImageDataUrl;
  if (!finalChartImageDataUrl && useSvgCapture && chartRef) {
    finalChartImageDataUrl = await captureChartAsSvgImage({ 
      chartRef, 
      activeTab, 
      mainLegendColor, 
      mainLegendText 
    });
  }

  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const titleBgColor =
    activeTab === 'usage' ? '4FD1C5'
    : activeTab === 'maxload' ? 'ED8936'
    : activeTab === 'reduction' ? '48BB78'
    : activeTab === 'peak' ? 'F56565'
    : activeTab === 'control' ? '9F7AEA'
    : 'E3F2FD';
  const titleText =
    activeTab === 'maxload' ? '최대부하 보고서'
    : activeTab === 'reduction' ? '전력 감축량 보고서'
    : activeTab === 'peak' ? '전력피크 보고서'
    : activeTab === 'control' ? '제어현황 보고서'
    : '전력사용량 보고서';

  const { workbook, worksheet } = createWorkbookAndSheet(ExcelJS);
  addExcelTitleAndHeader(worksheet, { activeTab, titleBgColor, titleText, timeStr, storeName });
  const lastDataRow = addExcelDataRows(worksheet, data, activeTab);
  insertChartImageToSheet(worksheet, finalChartImageDataUrl, lastDataRow, ExcelJS, isDarkMode);

  ["A1", "B1", "C1", "D1", "E1"].forEach(cell => {
    worksheet.getCell(cell).border = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
    };
  });
  ["A2", "B2", "C2", "D2", "E2"].forEach(cell => {
    worksheet.getCell(cell).border = {
      top: { style: "thin", color: { argb: "000000" } },
      left: { style: "thin", color: { argb: "000000" } },
      right: { style: "thin", color: { argb: "000000" } },
      bottom: { style: "thin", color: { argb: "000000" } },
    };
  });
  worksheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];
  worksheet.getRow(1).height = 40;
  worksheet.getRow(2).height = 25;
  worksheet.getRow(3).height = 25;
  for (let i = 0; i < (lastDataRow - 3); i++) {
    worksheet.getRow(4 + i).height = 25;
  }
  const filename = getExcelFilename(viewType, selectedDate, format, ko, activeTab);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, filename);
} 