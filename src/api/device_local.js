import axios from "./axios_util";
import {API_CONFIG, getApiUrl} from "@/lib/config.js";
import { setGroupEditMode } from "@/lib/globalState.js";

// 사용량 보고서 API 함수들
// 15분 단위 데이터 조회
export async function fetchQuarterData(serialNumber, start, end) {
    try {
        const params = new URLSearchParams({
            type: 'quarter',
            deviceId: 0,
            start,
            end
        });
        const response = await axios.get(`/report/usage?${params}`);

        if (response.status !== 200) {
            throw new Error("Failed to get quarter data");
        }
        return response.data;
    } catch (error) {
        console.error('15분 단위 데이터 조회 실패:', error);
        throw error;
    }
}

// 1시간/일/월/년 단위 데이터 조회
export async function fetchCycleData(serialNumber, start, end, type) {
    try {
    const params = new URLSearchParams({
        type,
        deviceId: 0,
        start,
        end
    });
    const response = await axios.get(`/report/usage?${params}`);

        if (response.status !== 200) {
            throw new Error("Failed to get cycle data");
        }


        return response.data;
    } catch (error) {
        console.error('1시간/일/월/년 단위 데이터 조회 실패:', error);
        throw error;
    }
}


// 1시간 단위 시계 데이터 조회 (최대부하, 감축량, 제어현황) - /api/report/clock
export async function fetchClockData(serialNumber, start, end) {
    try {
        console.log('fetchClockData API 호출:', { serialNumber, start, end });
        const params = new URLSearchParams({
            serialNumber,
            start,
            end
        });
        const response = await axios.get(`/report/clock?${params}`);

        if (response.status !== 200) {
            throw new Error("Failed to get clock data");
        }

        console.log('fetchClockData API 응답:', response.data);
        
        // 실제 API 응답 데이터 구조 확인
        if (response.data && response.data.length > 0) {
            console.log('Clock API 응답 데이터 구조:', {
                sampleItem: response.data[0],
                allKeys: Object.keys(response.data[0]),
                hasCtrlMaxLoadTime: 'ctrlMaxLoadTime' in response.data[0],
                hasMaxLoadTime: 'maxLoadTime' in response.data[0],
                ctrlMaxLoadTimeValue: response.data[0].ctrlMaxLoadTime,
                maxLoadTimeValue: response.data[0].maxLoadTime
            });
        }
        
        return response.data;
    } catch (error) {
        console.error('시계 데이터 조회 실패:', error);
        throw error;
    }
}

export async function resetReportData(serialNumber) {
    const response = await axios.post(`/report/report-reset`, { serialNumber });

    if (response.status !== 200) {
        throw new Error("Failed to reset report data");
    }

    return response.data;
}

// 최대부하 데이터 조회 - /api/report/clock 사용
export async function fetchMaxLoadData(serialNumber, start, end) {
    try {
        console.log('fetchMaxLoadData 호출:', { serialNumber, start, end });
        const clockData = await fetchClockData(serialNumber, start, end);
        
        // Clock API 응답 데이터를 최대부하 형식으로 변환
        return clockData.map(item => ({
            time: new Date(item.plcTime).getHours().toString().padStart(2, '0') + ':00',
            maxLoad: (item.ctrlMaxLoad || 0) / 1000, // W에서 kW로 변환
            maxLoadTime: item.ctrlMaxLoadTime || '00:00:00',
            plcTime: item.plcTime,
            timestamp: item.timestamp,
            demandTimeIndex: item.demandTimeIndex,
            hour: new Date(item.plcTime).getHours().toString(),
            date: new Date(item.plcTime).toISOString().split('T')[0],
            deviceId: item.deviceId || serialNumber,
            // Clock API 원본 데이터도 포함
            originalData: item
        }));
    } catch (error) {
        console.error('최대부하 데이터 조회 실패:', error);
        throw error;
    }
}

// 감축량 데이터 조회 - /api/report/clock 사용
export async function fetchReductionData(serialNumber, start, end) {
    try {
        console.log('fetchReductionData 호출:', { serialNumber, start, end });
        const clockData = await fetchClockData(serialNumber, start, end);
        
        // Clock API 응답 데이터를 감축량 형식으로 변환
        return clockData.map(item => ({
            time: new Date(item.plcTime).getHours().toString().padStart(2, '0') + ':00',
            reduction: (item.ctrlMaxLoad || 0) / 1000, // W에서 kW로 변환 (감축량은 최대부하 값을 사용하거나 별도 계산 필요)
            ctrlCount: item.ctrlCount || 0,
            ctrlTime: item.ctrlTime || '00:00:00',
            plcTime: item.plcTime,
            timestamp: item.timestamp,
            demandTimeIndex: item.demandTimeIndex,
            hour: new Date(item.plcTime).getHours().toString(),
            date: new Date(item.plcTime).toISOString().split('T')[0],
            deviceId: item.deviceId || serialNumber,
            // Clock API 원본 데이터도 포함
            originalData: item
        }));
    } catch (error) {
        console.error('감축량 데이터 조회 실패:', error);
        throw error;
    }
}

// 제어현황 데이터 조회 - /api/report/clock 사용
export async function fetchControlData(serialNumber, start, end) {
    try {
        console.log('fetchControlData 호출:', { serialNumber, start, end });
        const clockData = await fetchClockData(serialNumber, start, end);
        
        // Clock API 응답 데이터를 제어현황 형식으로 변환
        return clockData.map(item => {
            const baseData = {
                time: new Date(item.plcTime).getHours().toString().padStart(2, '0') + ':00',
                controlStatus: item.ctrlCount > 0 ? 1 : 0, // 제어 횟수가 0보다 크면 제어됨
                controlCount: item.ctrlCount || 0,
                ctrlCount: item.ctrlCount || 0, // 제어개수 필드 추가
                controlTime: item.ctrlTime || '00:00:00',
                ctrlTimes: [
                    item.ctrlTime1, item.ctrlTime2, item.ctrlTime3, item.ctrlTime4,
                    item.ctrlTime5, item.ctrlTime6, item.ctrlTime7, item.ctrlTime8,
                    item.ctrlTime9, item.ctrlTime10, item.ctrlTime11, item.ctrlTime12,
                    item.ctrlTime13, item.ctrlTime14, item.ctrlTime15, item.ctrlTime16
                ].filter(time => time !== null),
                plcTime: item.plcTime,
                timestamp: item.timestamp,
                demandTimeIndex: item.demandTimeIndex,
                hour: new Date(item.plcTime).getHours().toString(),
                date: new Date(item.plcTime).toISOString().split('T')[0],
                deviceId: item.deviceId || serialNumber,
                // Clock API 원본 필드들 직접 매핑
                ...item, // 원본 데이터의 모든 필드 포함
                // Clock API 원본 데이터도 포함
                originalData: item
            };

            // 개별 제어시간 필드 추가 (controlTime1~16)
            for (let i = 1; i <= 16; i++) {
                const ctrlTimeField = `ctrlTime${i}`;
                const controlTimeField = `controlTime${i}`;
                baseData[controlTimeField] = item[ctrlTimeField] || null;
            }

            return baseData;
        });
    } catch (error) {
        console.error('제어현황 데이터 조회 실패:', error);
        throw error;
    }
}

// 통합 시계 데이터 조회 (최대부하, 감축량, 제어현황 모두 포함)
export async function fetchAllClockData(serialNumber, start, end) {
    try {
        console.log('fetchAllClockData 호출:', { serialNumber, start, end });
        
        const [maxLoadData, reductionData, controlData] = await Promise.all([
            fetchMaxLoadData(serialNumber, start, end),
            fetchReductionData(serialNumber, start, end),
            fetchControlData(serialNumber, start, end)
        ]);

        const result = {
            maxLoadData,
            reductionData,
            controlData,
            rawClockData: await fetchClockData(serialNumber, start, end)
        };
        
        console.log('fetchAllClockData 완료:', result);
        return result;
    } catch (error) {
        console.error('통합 시계 데이터 조회 실패:', error);
        throw error;
    }
}