import { getOrganizationAxios } from "./dynamic_axios";

// Device API를 조직별 동적 axios로 사용하는 함수들

// 디바이스 리스트 조회
export async function getDeviceList() {
    const axios = getOrganizationAxios();
    const response = await axios.get("/devices");
    
    if (response.status !== 200) {
        throw new Error("Failed to get device list");
    }
    return response.data;
}

// 디바이스 생성
export async function createDevice(device) {
    const axios = getOrganizationAxios();
    const response = await axios.post("/devices", device);
    
    if (response.status !== 200) {
        throw new Error("Failed to create device");
    }
    return response.data;
}

// 디바이스 업데이트
export async function updateDevice(id, device) {
    const axios = getOrganizationAxios();
    const response = await axios.put(`/devices/${id}`, device);
    
    if (response.status !== 200) {
        throw new Error("Failed to update device");
    }
    return response.data;
}

// 디바이스 삭제
export async function deleteDevice(id) {
    const axios = getOrganizationAxios();
    const response = await axios.delete(`/devices/${id}`);
    
    if (response.status !== 200) {
        throw new Error("Failed to delete device");
    }
    return response.data;
}

// 디바이스 정보 업데이트 (게이트웨이 API)
export async function updateDeviceInfo(id, updatedValues, changedField, waitForWebSocketUpdate = false) {
    const requestData = { id: id };

    console.log("updateDeviceInfo (Dynamic)");

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
        case 'autoReturnTime':
            requestData.auto_return_time = Number(updatedValues.autoReturnTime);
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
        case 'priorityNumbers':
            // 우선순위 번호 배열이 포함된 경우 (priorityNumbers)
            if (updatedValues.priorityNumbers && Array.isArray(updatedValues.priorityNumbers)) {
                // 우선순위 번호 배열을 4개의 10진수 값으로 변환
                const priorityNumbers = updatedValues.priorityNumbers;

                // S-01~S-04 (우선순위1) - 4비트씩 묶어서 16비트로 변환 후 10진수로 변환
                let priority1 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i] || 0) - 1; // 1~16을 0~15로 변환
                    priority1 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                // S-05~S-08 (우선순위2)
                let priority2 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i + 4] || 0) - 1;
                    priority2 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                // S-09~S-12 (우선순위3)
                let priority3 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i + 8] || 0) - 1;
                    priority3 |= (value << (i * 4)); // 순차적으로 비트 설정
                }

                // S-13~S-16 (우선순위4)
                let priority4 = 0;
                for (let i = 0; i < 4; i++) {
                    const value = (priorityNumbers[i + 12] || 0) - 1;
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
        const axios = getOrganizationAxios();
        const response = await axios.put(`/deviceinfo/${id}`, requestData);
        
        if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = response.data;
        console.log(`API 호출 성공: ${changedField} 업데이트 완료`);
        
        return result;
    } catch (error) {
        console.error('Update failed:', error);
        throw new Error(`설정 저장에 실패했습니다: ${error.message}`);
    }
}

// 현재 그래프 데이터 가져오기
export async function fetchCurrentGraphData(deviceId = 0, currentDemandTime) {
    try {
        const axios = getOrganizationAxios();
        
        const response = await axios.get(`/deviceinfo/graph/current/0?demandTime=${currentDemandTime}`, {
            params: { currentDemandTime }
        });
        
        if (response.status !== 200) {
            throw new Error("Failed to get current graph data");
        }
        
        return response.data;
    } catch (error) {
        console.error('그래프 데이터 조회 실패:', error);
        throw error;
    }
}

// 15분 단위 데이터 조회
export async function fetchQuarterData(deviceId, start, end) {
    try {
        const axios = getOrganizationAxios();

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
export async function fetchCycleData(deviceId, start, end, type) {
    try {
    const axios = getOrganizationAxios();

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


// 1시간/일/월/년 단위 데이터 조회
export async function fetchClockData(deviceId, start, end) {
    try {
        const axios = getOrganizationAxios();

        const params = new URLSearchParams({
            deviceId,
            start,
            end
        });
        const response = await axios.get(`/report/clock?${params}`);

        if (response.status !== 200) {
            throw new Error("Failed to get clock data");
        }

        return response.data;
    } catch (error) {
        console.error('1시간/일/월/년 단위 데이터 조회 실패:', error);
        throw error;
    }
}

// 시계 동기화
export async function updateTimeSync(id) {
    const axios = getOrganizationAxios();

    const response = await axios.put(`/deviceinfo/${id}/sync-plc-time`, {});

    if (response.status !== 200) {
        throw new Error("Failed to update time sync");
    }

    return response.data;
}

// plc 데이터 동기화
export async function syncPlcData(date) {
    const axios = getOrganizationAxios();

    const response = await axios.get(`/report/plc-report/backup`, {
        params: {
            reportDate: date
        },
        timeout: 20000
    });

    if (response.status !== 200) {
        throw new Error("Failed to sync plc data");
    }

    return response.data;
}

// 보고서 데이터 초기화
export async function resetReportData() {
    const axios = getOrganizationAxios();
    
    const response = await axios.post(`/report/report-reset`, {});

    if (response.status !== 200) {
        throw new Error("Failed to reset report data");
    }

    return response.data;
}

export default {
    getDeviceList,
    createDevice,
    updateDevice,
    deleteDevice,
    updateDeviceInfo,
    fetchCurrentGraphData,
    fetchQuarterData,
    fetchCycleData,
    fetchClockData,
    syncPlcData,
    resetReportData
};