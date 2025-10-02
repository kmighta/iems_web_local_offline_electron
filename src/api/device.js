import axios from "./axios_util";
import {API_CONFIG, getApiUrl} from "@/lib/config.js";
import { setGroupEditMode } from "@/lib/globalState.js";

async function getDeviceList() {
    var res = await axios.get("/devices");
    if (res.status !== 200) {
        throw new Error("Failed to get device list");
    }
    return res.data;
}

async function createDevice(device) {
    var res = await axios.post("/devices", device);
    if (res.status !== 200) {
        throw new Error("Failed to create device");
    }
    return res.data;
}

async function updateDevice(id, device) {

    var res = await axios.put(`/devices/${id}`, device);
    if (res.status !== 200) {
        throw new Error("Failed to update device");
    }
    return res.data;
}

async function deleteDevice(id) {
    var res = await axios.delete(`/devices/${id}`);
    if (res.status !== 200) {
        throw new Error("Failed to delete device");
    }
    return res.data;
}

export { getDeviceList, createDevice, updateDevice, deleteDevice };


// 게이트웨이 api
export async function updateDeviceInfo(id, updatedValues, changedField, waitForWebSocketUpdate = false) {
    const requestData = { id: id };

    console.log("updateDeviceInfo");

    // 모든 경우에 PLC 시간을 시스템 시간으로 동기화
    // const now = new Date();
    // requestData.plc_year = now.getFullYear();
    // requestData.plc_month = now.getMonth() + 1; // getMonth()는 0부터 시작하므로 +1
    // requestData.plc_day = now.getDate();
    // requestData.plc_hour = now.getHours();
    // requestData.plc_minute = now.getMinutes();
    // requestData.plc_second = now.getSeconds();

    switch (changedField) {
        case 'targetPower':
            requestData.target_eng = Number(updatedValues.targetPower);
            break;
        case 'pctRatio':
            requestData.pct_cnt = Number(updatedValues.pctRatio);
            break;
        case 'pulseConstant':
            requestData.pulse_cnt = Number(updatedValues.pulseConstant);
            break;
        case 'filterConstant':
            requestData.filter_constant = Number(updatedValues.filterConstant);
            break;
        case 'firstControlTime':
            requestData.min_ctrl_time = Number(updatedValues.firstControlTime);
            break;
        case 'blockInterval':
            requestData.block_interval = Number(updatedValues.blockInterval);
            break;
        case 'inputInterval':
            requestData.return_interval = Number(updatedValues.inputInterval);
            break;
        case 'currPowerMeasureSec':
            requestData.curr_power_measure_sec = Number(updatedValues.currPowerMeasureSec);
            break;
        case 'operationMode':
            requestData.operation_mode = Number(updatedValues.operationMode);
            break;
        case 'ctrlCnt':
            requestData.ctrl_cnt = Number(updatedValues.ctrlCnt);
            break;
        case 'ctrlMode':
            requestData.ctrl_mode = Number(updatedValues.ctrlMode);
            break;
        case 'manualCtrl':
            requestData.manual_ctrl = Number(updatedValues.manualCtrl);
            break;
        case 'plcTimeSync':
            // PLC 시간 동기화는 이미 위에서 처리됨
            break;
        case 'functionSettings':
            requestData.voltage_type = Number(updatedValues.voltageType);
            requestData.meter_type = Number(updatedValues.meterType);
            requestData.reduction_measure = Number(updatedValues.reductionMeasure);
            requestData.ctrl_change_time = Number(updatedValues.controlChange);
            requestData.connection_device_cnt = Number(updatedValues.connectionDeviceCnt);
            requestData.ctrl_connection_type = Number(updatedValues.connectionDevice);
            requestData.command_2 = Number(updatedValues.command2);
            break;
        case 'command1':
            requestData.command_1 = Number(updatedValues.command1);
            break;
        // case 'command2':
        //     requestData.command_2 = Number(updatedValues.command2);
        //     break;
        // 필요시 추가
        case 'priorityNumbers':
            // 우선순위 번호 배열이 포함된 경우 (priorityNumbers)
            if (updatedValues.priorityNumbers && Array.isArray(updatedValues.priorityNumbers)) {
                // 우선순위 번호 배열을 4개의 10진수 값으로 변환
                const priorityNumbers = updatedValues.priorityNumbers;

                // S-01~S-04 (우선순위1) - 4비트씩 묶어서 16비트로 변환 후 10진수로 변환
                let priority1 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i] || 0) - 1; // 1~16을 0~15로 변환
                    //priority1 |= (value << ((3 - i) * 4)); // 역순으로 비트 설정
                    priority1 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                // S-05~S-08 (우선순위2)
                let priority2 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i + 4] || 0) - 1;
                    // priority2 |= (value << ((3 - i) * 4));
                    priority2 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                // S-09~S-12 (우선순위3)
                let priority3 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i + 8] || 0) - 1;
                    // priority3 |= (value << ((3 - i) * 4));
                    priority3 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                // S-13~S-16 (우선순위4)
                let priority4 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i + 12] || 0) - 1;
                    // priority4 |= (value << ((3 - i) * 4));
                    priority4 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                requestData.priority_1 = priority1;
                requestData.priority_2 = priority2;
                requestData.priority_3 = priority3;
                requestData.priority_4 = priority4;
            }
            break;

    }

    try {
        const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.DEVICE_INFO}/${id}`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });
        // console.log(requestData);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`API 호출 성공: ${changedField} 업데이트 완료`);
        
        return result;
    } catch (error) {
        console.error('Update failed:', error);
        throw new Error(`설정 저장에 실패했습니다: ${error.message}`);
    }
}

// 서버에서 현재 수요시간까지의 그래프 데이터를 가져오는 함수
export async function fetchCurrentGraphData(deviceId = 0, currentDemandTime) {
    try {
        //console.log(`서버에서 현재 그래프 데이터 요청: deviceId=${deviceId}, demandTime=${currentDemandTime}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

        const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.GRAPH_DATA}/current/${deviceId}?demandTime=${currentDemandTime}`), {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        // console.log(`서버에서 현재 그래프 데이터 수신: ${result.length}개 데이터`);
        return result;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Current graph data fetch timeout');
            throw new Error('서버 요청 시간 초과');
        }
        console.error('Current graph data fetch failed:', error);
        throw new Error(`현재 그래프 데이터 가져오기에 실패했습니다: ${error.message}`);
    }
}

// 사용량 보고서 API 함수들

// 15분 단위 데이터 조회
export async function fetchQuarterData(deviceId, start, end) {
    const params = new URLSearchParams({
        type: 'quarter',
        deviceId: 0,
        start,
        end
    });
    const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.REPORT_USAGE}?${params}`));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// 1시간/일/월/년 단위 데이터 조회
export async function fetchCycleData(deviceId, start, end, type) {
    const params = new URLSearchParams({
        type,
        deviceId: 0,
        start,
        end
    });
    const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.REPORT_USAGE}?${params}`));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

// 1시간/일/월/년 단위 데이터 조회
export async function fetchClockData(deviceId, start, end) {
    const params = new URLSearchParams({
        deviceId,
        start,
        end
    });
    const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.REPORT_CLOCK}?${params}`));
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}