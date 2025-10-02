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
      // SVG 실제 크기 계산 - 더 넓게 설정
      let width = 900;  // 640에서 900으로 증가
      let chartHeight = 400;  // 300에서 400으로 증가
      if (svgElement.viewBox && svgElement.viewBox.baseVal) {
        width = Math.max(svgElement.viewBox.baseVal.width || width, 900);
        chartHeight = Math.max(svgElement.viewBox.baseVal.height || chartHeight, 400);
      } else if (svgElement.width && svgElement.width.baseVal) {
        width = Math.max(svgElement.width.baseVal.value || width, 900);
        chartHeight = Math.max(svgElement.height.baseVal.value || chartHeight, 400);
      }
      const totalHeight = chartHeight + 60;  // 40에서 60으로 증가
      
      // 범례 SVG 생성 - 더 큰 크기와 개선된 레이아웃
      const legendSvg = `
        <svg width="${width}" height="60">
          <rect x="0" y="0" width="${width}" height="60" fill="#ffffff"/>
          <g transform="translate(20, 20)">
            <rect x="0" y="10" width="20" height="20" fill="${mainLegendColor}" rx="3"/>
            <text x="30" y="25" font-size="16" font-family="Arial, sans-serif" fill="#333">${mainLegendText}</text>
            <rect x="180" y="10" width="20" height="20" fill="#3182ce" rx="3"/>
            <text x="210" y="25" font-size="16" font-family="Arial, sans-serif" fill="#333">어제</text>
            <rect x="300" y="10" width="20" height="20" fill="#f6ad55" rx="3"/>
            <text x="330" y="25" font-size="16" font-family="Arial, sans-serif" fill="#333">이전달</text>
            <rect x="420" y="10" width="20" height="20" fill="#9f7aea" rx="3"/>
            <text x="450" y="25" font-size="16" font-family="Arial, sans-serif" fill="#333">이전년도</text>
          </g>
        </svg>
      `;
      
      // 차트 SVG 문자열
      const chartSvgStr = new XMLSerializer().serializeToString(svgElement);
      
      // 전체 SVG wrap (세로로 합치기)
      let mergedSvg = `
        <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${totalHeight}'>
          <g>
            <foreignObject x='0' y='0' width='${width}' height='60'>${legendSvg}</foreignObject>
          </g>
          <g transform='translate(0,60)'>
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
      tempDiv.style.width = '900px';  // 800에서 900으로 증가
      tempDiv.style.height = '460px';  // 400에서 460으로 증가
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
        fallbackCanvas.width = 900;  // 800에서 900으로 증가
        fallbackCanvas.height = 460;  // 400에서 460으로 증가
        const ctx = fallbackCanvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, 900, 460);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${activeTab === 'usage' ? '전력 사용량' : activeTab === 'peak' ? '전력 피크' : activeTab === 'maxload' ? '최대부하' : '전력 감축량'} 차트`, 450, 80);  // 400에서 450으로
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#666';
        ctx.fillText('차트 이미지를 생성할 수 없습니다. 데이터는 아래 표를 참고해주세요.', 450, 200);  // 400에서 450으로
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
export function addExcelTitleAndHeader(worksheet, { activeTab, titleBgColor, titleText, timeStr, storeName, data }) {
  if (activeTab === 'reduction') {
    // 감축량: A1~L1 병합
    worksheet.mergeCells("A1:L1");
    worksheet.getCell("A1").value = titleText;
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getCell("A1").font = { bold: true, size: 20, color: { argb: "000000" } };
    worksheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: titleBgColor }
    };
    
    // A2~F2에 사업장명 추가
    worksheet.mergeCells("A2:F2");
    worksheet.getCell("A2").value = `사업장 : ${storeName || "사업장"}`;
    worksheet.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };
    worksheet.getCell("A2").font = { size: 13, color: { argb: "000000" } };
    worksheet.getCell("A2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F5F5F5" }
    };
    
    // G2~L2에 출력시간
    worksheet.mergeCells("G2:L2");
    worksheet.getCell("G2").value = `출력시간 : ${timeStr}`;
    worksheet.getCell("G2").alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getCell("G2").font = { size: 13, color: { argb: "000000" } };
    worksheet.getCell("G2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F5F5F5" }
    };
  } else if (activeTab === 'control') {
    // 제어현황: A1~L1 병합 (타이틀)
    worksheet.mergeCells("A1:L1");
    worksheet.getCell("A1").value = titleText;
    worksheet.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
    worksheet.getCell("A1").font = { bold: true, size: 20, color: { argb: "000000" } };
    worksheet.getCell("A1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: titleBgColor }
    };
    
    // A2~F2에 사업장명 추가
    worksheet.mergeCells("A2:F2");
    worksheet.getCell("A2").value = `사업장 : ${storeName || "사업장"}`;
    worksheet.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };
    worksheet.getCell("A2").font = { size: 13, color: { argb: "000000" } };
    worksheet.getCell("A2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F5F5F5" }
    };
    
    // G2~L2에 출력시간
    worksheet.mergeCells("G2:L2");
    worksheet.getCell("G2").value = `출력시간 : ${timeStr}`;
    worksheet.getCell("G2").alignment = { horizontal: "right", vertical: "middle" };
    worksheet.getCell("G2").font = { size: 13, color: { argb: "000000" } };
    worksheet.getCell("G2").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F5F5F5" }
    };
  } else {
    // 다른 탭: 기존 로직
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
  }
  
  let headerRow;
  if (activeTab === 'maxload') {
    headerRow = ["시간", "최대부하(kW)", "", "최대부하시간", ""];
  } else if (activeTab === 'reduction') {
    headerRow = ["시간", "감축량", "1그룹", "2그룹", "3그룹", "4그룹", "5그룹", "6그룹", "7그룹", "8그룹", "9그룹", "10그룹"];
  } else if (activeTab === 'peak') {
    // 15분 단위일 때는 하나의 피크 컬럼만, 1시간 단위일 때는 피크1~4 모두 표시
    const isQuarterUnit = data && data.length > 0 && data[0] && data[0].time && data[0].time.includes(':');
    if (isQuarterUnit) {
      headerRow = ["시간", "피크", "", "", ""];
    } else {
      headerRow = ["시간", "피크1(kW)", "피크2(kW)", "피크3(kW)", "피크4(kW)"];
    }
  } else if (activeTab === 'control') {
    // 제어현황: 시간, 제어개수, 1제어~10제어 (이미지와 동일한 구조)
    headerRow = ["시간", "제어개수", "1제어", "2제어", "3제어", "4제어", "5제어", "6제어", "7제어", "8제어", "9제어", "10제어"];
  } else {
    headerRow = ["시간", "사용량(kWh)", "", "", ""];
  }
  worksheet.addRow(headerRow);
  
  // 15분 단위 피크인지 확인
  const isQuarterUnit = activeTab === 'peak' && data && data.length > 0 && data[0] && data[0].time && data[0].time.includes(':');
  
  if (isQuarterUnit) {
    // 15분 단위 피크: A3~E3 모두 스타일링하고 B3~E3 병합
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
    // B3~E3 병합
    worksheet.mergeCells("B3:E3");
  } else if (activeTab === 'maxload') {
    // 최대부하: A3~E3 모두 스타일링하고 B3~C3, D3~E3 각각 병합
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
    // B3~C3 병합 (최대부하(kW))
    worksheet.mergeCells("B3:C3");
    // D3~E3 병합 (최대부하시간)
    worksheet.mergeCells("D3:E3");
  } else if (activeTab === 'reduction') {
    // 감축량: A3~L3 모두 스타일링 (시간, 감축량, 1그룹~10그룹)
    ["A3", "B3", "C3", "D3", "E3", "F3", "G3", "H3", "I3", "J3", "K3", "L3"].forEach(cell => {
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
  } else if (activeTab === 'control') {
    // 제어현황: A3~L3 모두 스타일링 (시간, 제어개수, 1제어~10제어)
    ["A3", "B3", "C3", "D3", "E3", "F3", "G3", "H3", "I3", "J3", "K3", "L3"].forEach(cell => {
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
  } else {
    // 다른 경우: A3~E3 모두 스타일링
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
}

// 데이터 행 추가 및 스타일
export function addExcelDataRows(worksheet, data, activeTab) {
  let dataRows;
   if (activeTab === 'maxload') {
     dataRows = data.map(row => {
       console.log('최대부하 엑셀 데이터 매핑:', {
         time: row.time,
         maxLoad: row.maxLoad,
         maxLoadTime: row.maxLoadTime,
         sampleRow: row
       });
       
       // 시간 필드는 이미 적절한 형식으로 변환되어 있음
       const timeValue = row.time || "-";
       
       return [timeValue, row.maxLoad, '', row.maxLoadTime || '', ''];
     });
  } else if (activeTab === 'reduction') {
    dataRows = data.map(row => [
      row.time, 
      row.reduction || row.controlCount || 0, 
      row.controlReduction1 || 0,
      row.controlReduction2 || 0,
      row.controlReduction3 || 0,
      row.controlReduction4 || 0,
      row.controlReduction5 || 0,
      row.controlReduction6 || 0,
      row.controlReduction7 || 0,
      row.controlReduction8 || 0,
      row.controlReduction9 || 0,
      row.controlReduction10 || 0
    ]);
  } else if (activeTab === 'peak') {
    // 15분 단위일 때는 하나의 피크 값만, 1시간 단위일 때는 피크1~4 모두 표시
    const isQuarterUnit = data && data.length > 0 && data[0] && data[0].hasOwnProperty('peak') && !data[0].hasOwnProperty('peak1');
    
    console.log('전력 피크 엑셀 데이터 매핑:', {
      dataLength: data?.length || 0,
      isQuarterUnit,
      sampleData: data?.slice(0, 3),
      firstRowKeys: data?.[0] ? Object.keys(data[0]) : []
    });
    
    if (isQuarterUnit) {
      // 15분 단위: peak 필드 사용 (시간대별 피크 값)
      dataRows = data.map(row => {
        console.log('15분 단위 피크 데이터:', {
          time: row.time,
          peak: row.peak,
          sampleRow: row
        });
        
        return [row.time, row.peak, '', '', ''];
      });
    } else {
      // 1시간 단위: 피크1~4 모두 표시
      dataRows = data.map(row => {
        console.log('1시간 단위 피크 데이터:', {
          time: row.time,
          peak1: row.peak1,
          peak2: row.peak2,
          peak3: row.peak3,
          peak4: row.peak4,
          sampleRow: row
        });
        
        return [row.time, row.peak1, row.peak2, row.peak3, row.peak4];
      });
    }
   } else if (activeTab === 'control') {
     dataRows = data.map(row => {
       console.log('제어현황 엑셀 데이터 매핑:', {
         time: row.time,
         controlCount: row.controlCount,
         ctrlCount: row.ctrlCount,
         controlTime1: row.controlTime1,
         sampleRow: row
       });
       
       // 시간 필드는 이미 "00시" 형식으로 변환되어 있음
       const timeValue = row.time || "-";
       
       return [
         timeValue, 
         row.controlCount || row.ctrlCount || 0, 
         row.controlTime1 || "-",
         row.controlTime2 || "-",
         row.controlTime3 || "-",
         row.controlTime4 || "-",
         row.controlTime5 || "-",
         row.controlTime6 || "-",
         row.controlTime7 || "-",
         row.controlTime8 || "-",
         row.controlTime9 || "-",
         row.controlTime10 || "-"
       ];
     });
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
    // 15분 단위일 때는 하나의 피크 최대값만, 1시간 단위일 때는 피크1~4 최대값 모두 표시
    const isQuarterUnit = data && data.length > 0 && data[0] && data[0].time && data[0].time.includes(':');
    if (isQuarterUnit) {
      // 15분 단위: 모든 피크 값 중 최대값
      const allPeakValues = data.map(row => {
        const timeStr = row.time || '';
        const minute = timeStr.includes(':') ? parseInt(timeStr.split(':')[1]) : 0;
        let peakValue = parseFloat(row.peak1) || 0;
        
        if (minute === 15) peakValue = parseFloat(row.peak2) || 0;
        else if (minute === 30) peakValue = parseFloat(row.peak3) || 0;
        else if (minute === 45) peakValue = parseFloat(row.peak4) || 0;
        
        return peakValue;
      });
      totalValue = Math.max(...allPeakValues);
      summaryLabel = '15분 최대 피크';
    } else {
      // 1시간 단위: 피크1~4 최대값 모두 표시
      const peak1Max = Math.max(...data.map(row => parseFloat(row.peak1) || 0));
      const peak2Max = Math.max(...data.map(row => parseFloat(row.peak2) || 0));
      const peak3Max = Math.max(...data.map(row => parseFloat(row.peak3) || 0));
      const peak4Max = Math.max(...data.map(row => parseFloat(row.peak4) || 0));
      totalValue = Math.max(peak1Max, peak2Max, peak3Max, peak4Max);
      summaryLabel = '일별 최대 피크';
    }
  } else if (activeTab === 'maxload') {
    totalValue = Math.max(...data.map(row => parseFloat(row.maxLoad) || 0));
    summaryLabel = '일별 최대부하';
  } else if (activeTab === 'reduction') {
    totalValue = data.reduce((sum, row) => sum + (parseFloat(row.reduction || row.controlCount) || 0), 0);
    summaryLabel = '일별 감축량';
  } else if (activeTab === 'control') {
    totalValue = data.reduce((sum, row) => sum + (parseInt(row.controlCount || row.ctrlCount) || 0), 0);
    summaryLabel = '일별 제어횟수';
  }
  
  // 합계 행 추가
  if (activeTab === 'peak') {
    const isQuarterUnit = data && data.length > 0 && data[0] && data[0].time && data[0].time.includes(':');
    if (isQuarterUnit) {
      // 15분 단위: 하나의 피크 최대값만 표시
      const summaryRow = [summaryLabel, totalValue.toFixed(1), '', '', ''];
      worksheet.addRow(summaryRow);
    } else {
      // 1시간 단위: 각 피크별 최대값 표시
      const peak1Max = Math.max(...data.map(row => parseFloat(row.peak1) || 0));
      const peak2Max = Math.max(...data.map(row => parseFloat(row.peak2) || 0));
      const peak3Max = Math.max(...data.map(row => parseFloat(row.peak3) || 0));
      const peak4Max = Math.max(...data.map(row => parseFloat(row.peak4) || 0));
      const summaryRow = [summaryLabel, peak1Max.toFixed(1), peak2Max.toFixed(1), peak3Max.toFixed(1), peak4Max.toFixed(1)];
      worksheet.addRow(summaryRow);
    }
  } else if (activeTab === 'maxload') {
    // 최대부하: 테이블과 동일한 형식으로 포맷팅
    const formattedMaxLoad = totalValue === 0 ? "-" : 
      parseFloat(totalValue.toFixed(3)).toLocaleString(undefined, {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
      });
    
    // 최대부하시간은 데이터에서 가장 큰 값을 가진 행의 ctrlMaxLoadTime을 찾아서 표시
    const maxLoadRow = data.find(row => parseFloat(row.maxLoad) === totalValue);
    let formattedMaxLoadTime = "-";
    if (maxLoadRow) {
      const maxLoadTimeValue = maxLoadRow?.ctrlMaxLoadTime || maxLoadRow?.maxLoadTime;
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
    }
    
    const summaryRow = [summaryLabel, formattedMaxLoad, '', formattedMaxLoadTime, ''];
    worksheet.addRow(summaryRow);
  } else if (activeTab === 'reduction') {
    // 감축량: 전체 감축량과 각 그룹별 감축량 합계 표시
    const groupTotals = [];
    for (let i = 1; i <= 10; i++) {
      const groupTotal = data.reduce((sum, row) => sum + (parseFloat(row[`controlReduction${i}`]) || 0), 0);
      groupTotals.push(groupTotal.toFixed(1));
    }
    const summaryRow = [summaryLabel, totalValue.toFixed(1), ...groupTotals];
    worksheet.addRow(summaryRow);
  } else if (activeTab === 'control') {
    // 제어현황: 전체 제어개수만 표시 (이미지와 동일)
    const summaryRow = [summaryLabel, totalValue.toFixed(0), '', '', '', '', '', '', '', '', '', ''];
    worksheet.addRow(summaryRow);
  } else {
    const summaryRow = [summaryLabel, totalValue.toFixed(1), '', '', ''];
    worksheet.addRow(summaryRow);
  }
  
  const lastDataRow = 3 + dataRows.length;
  const summaryRowIndex = lastDataRow + 1;
  
  // 15분 단위 피크인지 확인
  const isQuarterUnit = activeTab === 'peak' && data && data.length > 0 && data[0] && data[0].time && data[0].time.includes(':');
  
  // 데이터 행 스타일링
  for (let i = 0; i < dataRows.length; i++) {
    const rowIdx = 4 + i;
    
    if (isQuarterUnit) {
      // 15분 단위 피크: A~E열 모두 스타일링하고 B~E열 병합
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
      // B~E열 병합
      worksheet.mergeCells(`B${rowIdx}:E${rowIdx}`);
    } else if (activeTab === 'maxload') {
      // 최대부하: A~E열 모두 스타일링하고 B~C열, D~E열 각각 병합
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
      // B~C열 병합 (최대부하(kW))
      worksheet.mergeCells(`B${rowIdx}:C${rowIdx}`);
      // D~E열 병합 (최대부하시간)
      worksheet.mergeCells(`D${rowIdx}:E${rowIdx}`);
    } else if (activeTab === 'reduction') {
      // 감축량: A~L열 모두 스타일링 (시간, 감축량, 1그룹~10그룹)
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].forEach((col, j) => {
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
    } else if (activeTab === 'control') {
      // 제어현황: A~L열 모두 스타일링 (시간, 제어개수, 1제어~10제어)
      ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].forEach((col, j) => {
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
    } else {
      // 다른 경우: A~E열 모두 스타일링
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
      
      // 15분 단위 피크가 아닌 경우에만 셀 병합
      if (activeTab !== 'peak') {
        worksheet.mergeCells(`B${rowIdx}:E${rowIdx}`);
      }
    }
  }
  
  // 합계 행 스타일링 (배경색과 굵은 폰트)
  if (isQuarterUnit) {
    // 15분 단위 피크: A~E열 모두 스타일링하고 B~E열 병합
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
    // B~E열 병합
    worksheet.mergeCells(`B${summaryRowIndex}:E${summaryRowIndex}`);
  } else if (activeTab === 'maxload') {
    // 최대부하: A~E열 모두 스타일링하고 B~C열, D~E열 각각 병합
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
    // B~C열 병합 (최대부하(kW))
    worksheet.mergeCells(`B${summaryRowIndex}:C${summaryRowIndex}`);
    // D~E열 병합 (최대부하시간)
    worksheet.mergeCells(`D${summaryRowIndex}:E${summaryRowIndex}`);
  } else if (activeTab === 'reduction') {
    // 감축량: A~L열 모두 스타일링 (시간, 감축량, 1그룹~10그룹)
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].forEach((col, j) => {
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
  } else if (activeTab === 'control') {
    // 제어현황: A~L열 모두 스타일링 (시간, 제어개수, 1제어~10제어)
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].forEach((col, j) => {
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
  } else {
    // 다른 경우: A~E열 모두 스타일링
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
    
    // 15분 단위 피크가 아닌 경우에만 셀 병합
    if (activeTab !== 'peak') {
      worksheet.mergeCells(`B${summaryRowIndex}:E${summaryRowIndex}`);
    }
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
      const chartEndRow = chartRowPosition + 25;
      
      // 다크모드일 때만 차트 영역의 모든 셀에 검정색 배경색 적용 (A열부터 G열까지)
      if (isDarkMode) {
        for (let row = chartRowPosition; row <= chartEndRow; row++) {
          for (let col = 1; col <= 7; col++) { // A(1)부터 G(7)까지
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
        br: { col: 6, row: chartRowPosition + 25 },  // 너비를 4에서 6으로, 높이를 20에서 25로 증가
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
  if (!data || data.length === 0) {
    console.warn('엑셀 다운로드: 데이터가 없습니다.');
    return;
  }

  try {
    // 이미지 캡처 (SVG 방식 또는 기존 방식)
    let finalChartImageDataUrl = chartImageDataUrl;
    if (!finalChartImageDataUrl && useSvgCapture && chartRef) {
      try {
        finalChartImageDataUrl = await captureChartAsSvgImage({ 
          chartRef, 
          activeTab, 
          mainLegendColor, 
          mainLegendText 
        });
      } catch (imageError) {
        console.warn('차트 이미지 캡처 실패:', imageError);
        finalChartImageDataUrl = null;
      }
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
  addExcelTitleAndHeader(worksheet, { activeTab, titleBgColor, titleText, timeStr, storeName, data });
  const lastDataRow = addExcelDataRows(worksheet, data, activeTab);
  insertChartImageToSheet(worksheet, finalChartImageDataUrl, lastDataRow, ExcelJS, isDarkMode);

  if (activeTab === 'reduction') {
    // 감축량: A1~L1, A2~L2 테두리 설정
    ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1", "J1", "K1", "L1"].forEach(cell => {
      worksheet.getCell(cell).border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
      };
    });
    ["A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2", "I2", "J2", "K2", "L2"].forEach(cell => {
      worksheet.getCell(cell).border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
      };
    });
    // 감축량: A~L열 너비를 14로 설정
    worksheet.columns = [
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }
    ];
  } else if (activeTab === 'control') {
    // 제어현황: A1~L1, A2~L2 테두리 설정
    ["A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1", "J1", "K1", "L1"].forEach(cell => {
      worksheet.getCell(cell).border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
      };
    });
    ["A2", "B2", "C2", "D2", "E2", "F2", "G2", "H2", "I2", "J2", "K2", "L2"].forEach(cell => {
      worksheet.getCell(cell).border = {
        top: { style: "thin", color: { argb: "000000" } },
        left: { style: "thin", color: { argb: "000000" } },
        right: { style: "thin", color: { argb: "000000" } },
        bottom: { style: "thin", color: { argb: "000000" } },
      };
    });
    // 제어현황: A~L열 너비를 14로 설정
    worksheet.columns = [
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
      { width: 14 }, { width: 14 }
    ];
  } else {
    // 다른 탭: 기존 로직
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
  }
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
  
  } catch (error) {
    console.error('엑셀 다운로드 중 오류:', error);
    throw error; // 상위에서 처리할 수 있도록 오류를 다시 던짐
  }
} 