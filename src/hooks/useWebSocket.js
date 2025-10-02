import { useEffect, useRef, useCallback, useMemo } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import useSettingsStore from '@/store/settingsStore';
import useOrganizationStore from '@/store/organizationStore';
import { getWsUrl, getWsLogUrl, API_CONFIG } from '@/lib/config';
import { toast } from 'sonner';

export const useWebSocket = () => {
  const setDeviceInfo = useSettingsStore((state) => state.setDeviceInfo);
  const updateGraphData = useSettingsStore((state) => state.updateGraphData);
  const initializeGraphData = useSettingsStore((state) => state.initializeGraphData);
  
  // organizationStore에서 웹소켓 연결 상태 관리 함수 가져오기
  const setWebSocketConnected = useOrganizationStore((state) => state.setWebSocketConnected);

  const stompClientRef = useRef(null);
  const logStompClientRef = useRef(null); // LOG WebSocket용 추가
  const reconnectTimeoutRef = useRef(null);
  const logReconnectTimeoutRef = useRef(null); // LOG WebSocket용 추가
  const isConnectedRef = useRef(false);
  const isLogConnectedRef = useRef(false); // LOG WebSocket용 추가
  const connectionTimeoutRef = useRef(null);
  const logConnectionTimeoutRef = useRef(null); // LOG WebSocket용 추가
  const reconnectAttemptCountRef = useRef(0);
  const logReconnectAttemptCountRef = useRef(0); // LOG WebSocket용 추가
  const maxReconnectAttempts = 5; // 최대 재연결 시도 횟수
  const connectionTimeout = 10000; // 10초 연결 타임아웃
  const latestMetricsRef = useRef({
    targetPower: 0,
    basePower: 0,
    currentPower: 0,
    predictedPower: 0,
    demandTime: 0
  });

  // 대기 중인 Promise들을 저장하는 Map
  const pendingUpdatesRef = useRef(new Map());
  // 우선순위 대기를 위한 별도 Map
  const pendingPriorityUpdatesRef = useRef(new Map());

  // LOG WebSocket용 메시지 처리 함수
  const handleLogMessage = useCallback((message) => {
    console.log('LOG WebSocket 원본 메시지:', message);

    try {
      const parsedMessage = JSON.parse(message.body);
      console.log('LOG WebSocket 파싱된 메시지:', parsedMessage);

      // 항상 toast 표시 (테스트용)
      toast.info(`LOG 메시지 수신: ${JSON.stringify(parsedMessage)}`);

      // 메시지 구조: {id, event, requestId, plcId}
      if (parsedMessage.event) {
        // PLC 통신오류나 기타 이벤트를 toast로 표시
        if (parsedMessage.event.includes('오류') || parsedMessage.event.includes('에러')) {
          toast.error(`${parsedMessage.event} (PLC: ${parsedMessage.plcId || 'Unknown'})`);
        } else {
          toast.info(`${parsedMessage.event} (PLC: ${parsedMessage.plcId || 'Unknown'})`);
        }
      }
    } catch (error) {
      console.error('LOG 메시지 처리 오류:', error);
      // 파싱 실패 시에도 원본 메시지를 toast로 표시
      toast.error(`LOG 메시지 파싱 오류: ${message.body}`);
    }
  }, []);

  // 메시지 처리 함수 - 먼저 정의
  const handleMessage = useCallback((message) => {
    try {
      const parsedMessage = JSON.parse(message.body);
      if (!parsedMessage || !parsedMessage.data) return;

      const data = parsedMessage.data;
      
      // 피크 데이터 디버깅 로그
      console.log('웹소켓 메시지 데이터:', {
        peak1: data?.peak1,
        peak2: data?.peak2,
        peak3: data?.peak3,
        peak4: data?.peak4,
        usage: data?.usage,
        plc_time: data?.plc_time || data?.plcTime
      });
      // 우선순위 값을 이진수로 변환하여 priorityNumbers 배열 생성
      const parsePriorityNumbers = (priority1, priority2, priority3, priority4) => {
        const priorityNumbers = Array(16).fill(0);

        try {
          // 우선순위1 (S-01 ~ S-04) - 10진수를 16비트로 변환 후 4비트씩 나누어서 각각 0~15 값으로 변환 (역순)
          if (priority1 && priority1 !== '0') {
            const binary1 = parseInt(priority1, 10).toString(2).padStart(16, '0');
            // 16비트를 4비트씩 나누어서 각각 0~15 값으로 변환 (역순으로 처리) - +1 적용
            for (let i = 0; i < 4; i++) {
              const bits = binary1.slice((3 - i) * 4, (4 - i) * 4);
              priorityNumbers[i] = parseInt(bits, 2) + 1;
            }
          }

          // 우선순위2 (S-05 ~ S-08) - 10진수를 16비트로 변환 후 4비트씩 나누어서 각각 0~15 값으로 변환 (역순)
          if (priority2 && priority2 !== '0') {
            const binary2 = parseInt(priority2, 10).toString(2).padStart(16, '0');
            // 16비트를 4비트씩 나누어서 각각 0~15 값으로 변환 (역순으로 처리) - +1 적용
            for (let i = 0; i < 4; i++) {
              const bits = binary2.slice((3 - i) * 4, (4 - i) * 4);
              priorityNumbers[i + 4] = parseInt(bits, 2) + 1;
            }
          }

          // 우선순위3 (S-09 ~ S-12) - 10진수를 16비트로 변환 후 4비트씩 나누어서 각각 0~15 값으로 변환 (역순)
          if (priority3 && priority3 !== '0') {
            const binary3 = parseInt(priority3, 10).toString(2).padStart(16, '0');
            // 16비트를 4비트씩 나누어서 각각 0~15 값으로 변환 (역순으로 처리) - +1 적용
            for (let i = 0; i < 4; i++) {
              const bits = binary3.slice((3 - i) * 4, (4 - i) * 4);
              priorityNumbers[i + 8] = parseInt(bits, 2) + 1;
            }
          }

          // 우선순위4 (S-13 ~ S-16) - 10진수를 16비트로 변환 후 4비트씩 나누어서 각각 0~15 값으로 변환 (역순)
          if (priority4 && priority4 !== '0') {
            const binary4 = parseInt(priority4, 10).toString(2).padStart(16, '0');
            // 16비트를 4비트씩 나누어서 각각 0~15 값으로 변환 (역순으로 처리) - +1 적용
            for (let i = 0; i < 4; i++) {
              const bits = binary4.slice((3 - i) * 4, (4 - i) * 4);
              priorityNumbers[i + 12] = parseInt(bits, 2) + 1;
            }
          }

          // 기본값 설정 (0인 경우 1~16으로 설정)
          for (let i = 0; i < 16; i++) {
            if (priorityNumbers[i] === 0) {
              priorityNumbers[i] = i + 1;
            }
          }

          // 무한 출력 방지: 로그 제거
          // console.log('우선순위 파싱 완료:', priorityNumbers);
        } catch (error) {
          console.error('우선순위 파싱 오류:', error);
          // 오류 발생 시 기본값으로 설정
          for (let i = 0; i < 16; i++) {
            priorityNumbers[i] = i + 1;
          }
        }

        return priorityNumbers;
      };

      const priorityNumbers = parsePriorityNumbers(
          data?.priority_1?.toString() ?? '',
          data?.priority_2?.toString() ?? '',
          data?.priority_3?.toString() ?? '',
          data?.priority_4?.toString() ?? ''
      );

      // 우선순위 데이터 변경 감지 및 로깅
      const currentDeviceInfoForPriority = useSettingsStore.getState().deviceInfo;
      const currentPriorityNumbers = currentDeviceInfoForPriority.priorityNumbers;

      if (currentPriorityNumbers && Array.isArray(currentPriorityNumbers) &&
          Array.isArray(priorityNumbers) &&
          (currentPriorityNumbers.length !== priorityNumbers.length ||
              !currentPriorityNumbers.every((val, idx) => val === priorityNumbers[idx]))) {
        console.log('우선순위 데이터 변경 감지:', {
          이전: currentPriorityNumbers,
          현재: priorityNumbers
        });
      }

      // 디버깅 로그
      /*
      console.log('우선순위 파싱 결과:', {
        priority1: data?.priority_1?.toString() ?? '',
        priority2: data?.priority_2?.toString() ?? '',
        priority3: data?.priority_3?.toString() ?? '',
        priority4: data?.priority_4?.toString() ?? '',
        parsedNumbers: priorityNumbers
      });
      */

      const newMetrics = {
        targetPower: data?.target_eng?.toString() ?? '', // 목표전력
        basePower: data?.std_eng?.toString() ?? '', // 기준전력
        currentPower: data?.prog_eng?.toString() ?? '', // 현재전력
        predictedPower: data?.guess_eng?.toString() ?? '', // 예측전력
        usage: data?.usage?.toString() ?? '', // 실시간 사용량(시간단위 누계)
        demandTime: data?.demand_time?.toString(), // 수요시간
        currentLoad: data?.load_eng?.toString() ?? '', // 현재부하
        previousDemandPower: data?.prev_dmnd_eng?.toString() ?? '', // 이전수요전력
        maxDemandPower: data?.max_dmnd_eng?.toString() ?? '', // 최대수요전력
        // 최대부하(일별보기 실시간 표시용)
        ctrlMaxLoad: data?.ctrl_max_load?.toString() ?? '',
        ctrlMaxLoadTime: data?.ctrl_max_load_time?.toString() ?? '',
        pctRatio: data?.pct_cnt?.toString() ?? '', // 비율
        pulseConstant: data?.pulse_cnt?.toString() ?? '', // 펄스상수
        filterConstant: data?.filter_constant?.toString() ?? '', // 필터상수
        firstControlTime: data?.min_ctrl_time?.toString() ?? '', // 첫번째제어시간
        blockInterval: data?.block_interval?.toString() ?? '', // 블록간격
        inputInterval: data?.return_interval?.toString() ?? '', // 입력간격
        voltageType: data?.voltage_type?.toString() ?? '', // 전압형태
        reductionMeasure: data?.reduction_measure?.toString() ?? '', // 감축측정
        controlChange: data?.ctrl_change_time?.toString() ?? '', // 제어변경
        connectionDeviceCnt: data?.connection_device_cnt?.toString() ?? '', // 연결장치수
        connectionDevice: data?.ctrl_connection_type?.toString() ?? '', // 연결장치타입
        command2: data?.command_2?.toString() ?? '', // 명령(계속)
        autoReturnTime: data?.auto_return_time?.toString() ?? '', // 자동복귀시간
        meterType: data?.meter_type?.toString() ?? '', // 계량기형태
        eoiErrCnt: data?.eoi_err_cnt?.toString() ?? '', // EOI오류카운트
        wpErrCnt: data?.kp_err_cnt?.toString() ?? '', // KP오류카운트
        alarmStatus: data?.alarm_status?.toString() ?? '', // 알람상태
        operationMode: data?.operation_mode?.toString() ?? '', // 운전모드
        ctrlMode: data?.ctrl_mode?.toString() ?? '', // 제어모드
        ctrlCnt: data?.ctrl_cnt?.toString() ?? '', // 차단개수
        plcTime: data?.plc_time?.toString() ?? '', // PLC시간
        manualCtrl: data?.manual_ctrl?.toString() ?? '', // 수동제어신호
        priority1: data?.priority_1?.toString() ?? '', // 우선순위1
        priority2: data?.priority_2?.toString() ?? '', // 우선순위2
        priority3: data?.priority_3?.toString() ?? '', // 우선순위3
        priority4: data?.priority_4?.toString() ?? '', // 우선순위4
        peak1: data?.peak1?.toString() ?? '', // 피크1
        peak2: data?.peak2?.toString() ?? '', // 피크2
        peak3: data?.peak3?.toString() ?? '', // 피크3
        peak4: data?.peak4?.toString() ?? '', // 피크4
        // 4피크 2회 진행 여부 (웹소켓 필드 편차 대응: peak4plus 또는 peakplus)
        peak4plus: (data?.peak4plus ?? data?.peakplus ?? '').toString(),
        priorityNumbers: priorityNumbers, // 파싱된우선순위 번호 배열
      };
      console.log('newMetrics', newMetrics);

      // 대기 중인 업데이트 확인 및 해결
      pendingUpdatesRef.current.forEach((pending, field) => {
        const currentValue = newMetrics[field];
        if (currentValue === pending.expectedValue) {
          clearTimeout(pending.timeoutId);
          pending.resolve(newMetrics);
          pendingUpdatesRef.current.delete(field);
        }
      });

      // 우선순위 대기 확인 및 해결
      pendingPriorityUpdatesRef.current.forEach((pending, key) => {
        if (key === 'priorityNumbers') {
          // 현재 받은 우선순위 배열과 예상 배열을 비교
          const currentPriorityNumbers = newMetrics.priorityNumbers;
          const expectedPriorityNumbers = pending.expectedPriorityNumbers;

          if (Array.isArray(currentPriorityNumbers) && Array.isArray(expectedPriorityNumbers)) {
            const isMatch = currentPriorityNumbers.length === expectedPriorityNumbers.length &&
                currentPriorityNumbers.every((value, index) => value === expectedPriorityNumbers[index]);

            if (isMatch) {
              clearTimeout(pending.timeoutId);
              pending.resolve(newMetrics);
              pendingPriorityUpdatesRef.current.delete(key);
            }
          }
        }
      });

      // Update latest metrics ref
      latestMetricsRef.current = {
        targetPower: Number(newMetrics.targetPower) || 0, // 목표전력
        basePower: Number(newMetrics.basePower) || 0, // 기준전력
        currentPower: Number(newMetrics.currentPower) || 0, // 현재전력
        predictedPower: Number(newMetrics.predictedPower) || 0, // 예측전력
        demandTime: Number(newMetrics.demandTime) || 0, // 수요시간
      };

      // 수요시간이 0이 되면 그래프 데이터 초기화
      if (latestMetricsRef.current.demandTime === 0) {
        initializeGraphData(latestMetricsRef.current.targetPower); // 목표전력
        return;
      }

      // Add data point (수요시간 기반)
      const newEntry = {
        time: `${Math.floor(latestMetricsRef.current.demandTime / 60)}:${String(latestMetricsRef.current.demandTime % 60).padStart(2, '0')}`, // 시간
        demandTime: latestMetricsRef.current.demandTime, // 수요시간
        target: latestMetricsRef.current.targetPower, // 목표전력
        base: latestMetricsRef.current.basePower, // 기준전력
        current: latestMetricsRef.current.currentPower, // 현재전력
        predicted: Number(newMetrics.predictedPower) || null, // 예측전력
      };

      // 목표전력 변경 감지를 위한 로깅
      const currentGraphData = useSettingsStore.getState().graphData; // 그래프 데이터
      const currentTarget = currentGraphData[newEntry.demandTime]?.target; // 목표전력
      if (currentTarget !== null && newEntry.target !== null && currentTarget !== newEntry.target) { // 목표전력 변경 감지
        // 무한 출력 방지: 실제 변경이 있을 때만 로그 출력
        console.log('WebSocket에서 목표전력 변경 감지:', {
          demandTime: newEntry.demandTime, // 수요시간
          oldTarget: currentTarget, // 이전목표전력
          newTarget: newEntry.target // 새목표전력
        });
      }

      // 디버깅 로그
      /*
      console.log('그래프 데이터 업데이트:', {
        demandTime: newEntry.demandTime,
        target: newEntry.target,
        base: newEntry.base,
        current: newEntry.current
      });
      */
      // 그래프 데이터 업데이트
      updateGraphData(newEntry);

      // deviceInfo 업데이트와 함께 metricValues, priorityNumbers도 업데이트
      const store = useSettingsStore.getState();
      store.setDeviceInfo(newMetrics);

      // metricValues 업데이트 (설정 페이지에서 사용)
      const currentMetricValues = store.metricValues;
      const updatedMetricValues = {
        ...currentMetricValues,
        targetPower: newMetrics.targetPower || '',
        pctRatio: newMetrics.pctRatio || '',
        pulseConstant: newMetrics.pulseConstant || '',
        filterConstant: newMetrics.filterConstant || '',
        firstControlTime: newMetrics.firstControlTime || '',
        blockInterval: newMetrics.blockInterval || '',
        inputInterval: newMetrics.inputInterval || '',
        autoReturnTime: newMetrics.autoReturnTime || '',
        voltageType: newMetrics.voltageType || '',
        reductionMeasure: newMetrics.reductionMeasure || '',
        controlChange: newMetrics.controlChange || '',
        connectionDevice: newMetrics.connectionDevice || '',
        meterType: newMetrics.meterType || '',
      };
      store.setMetricValues(updatedMetricValues);

      // priorityNumbers 업데이트 (설정 페이지에서 사용)
      if (newMetrics.priorityNumbers && Array.isArray(newMetrics.priorityNumbers)) {
        store.setPriorityNumbers(newMetrics.priorityNumbers);
      }

      // manualCtrl 값이 변경될 때 차단그룹 상태 업데이트
      const currentDeviceInfo = store.deviceInfo;
      if (newMetrics.manualCtrl !== currentDeviceInfo.manualCtrl) {
        const manualCtrlValue = parseInt(newMetrics.manualCtrl, 10);
        if (!isNaN(manualCtrlValue)) {
          // 16비트 이진수로 변환 (G-01 ~ G-16)
          const binaryString = manualCtrlValue.toString(2).padStart(16, '0');

          // 각 비트를 차단그룹 상태로 변환
          const newCutoffStates = {};
          for (let i = 0; i < 16; i++) {
            const groupLabel = `G-${String(i + 1).padStart(2, '0')}`;
            // 비트가 1이면 차단상태, 0이면 비차단상태
            newCutoffStates[groupLabel] = binaryString[15 - i] === '1';
          }

          // store의 loadCutoffStates 업데이트
          const currentCutoffStates = store.loadCutoffStates;
          Object.keys(newCutoffStates).forEach(label => {
            if (currentCutoffStates[label] !== newCutoffStates[label]) {
              store.toggleLoadCutoff(label);
            }
          });
        }
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
    }
  }, [setDeviceInfo, updateGraphData, initializeGraphData]);

  // 특정 필드의 업데이트를 대기하는 함수
  const waitForDeviceInfoUpdate = useCallback((field, expectedValue, timeout = 20000) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingUpdatesRef.current.delete(field);
        reject(new Error(`${field} 업데이트 대기 시간 초과`));
      }, timeout);

      pendingUpdatesRef.current.set(field, {
        expectedValue,
        resolve,
        reject,
        timeoutId
      });
    });
  }, []);

  // 우선순위 배열 업데이트를 대기하는 함수
  const waitForPriorityNumbersUpdate = useCallback((expectedPriorityNumbers, timeout = 20000) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingPriorityUpdatesRef.current.delete('priorityNumbers');
        reject(new Error('우선순위 업데이트 대기 시간 초과'));
      }, timeout);

      pendingPriorityUpdatesRef.current.set('priorityNumbers', {
        expectedPriorityNumbers,
        resolve,
        reject,
        timeoutId
      });
    });
  }, []);

  // 수동 재연결 함수
  const manualReconnect = useCallback(() => {
    console.log('수동 재연결 시도...');

    // 기존 연결 재연결 시도 횟수 초기화
    reconnectAttemptCountRef.current = 0;

    // 기존 연결 정리
    isConnectedRef.current = false;
    if (typeof window !== 'undefined') {
      window.__webSocketConnected = false;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (stompClientRef.current) {
      try {
        stompClientRef.current.deactivate();
      } catch (error) {
        console.error('기존 연결 정리 중 오류:', error);
      }
      stompClientRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // LOG 연결 재연결 시도 횟수 초기화
    logReconnectAttemptCountRef.current = 0;

    // LOG 연결 정리
    isLogConnectedRef.current = false;

    if (logConnectionTimeoutRef.current) {
      clearTimeout(logConnectionTimeoutRef.current);
      logConnectionTimeoutRef.current = null;
    }

    if (logStompClientRef.current) {
      try {
        logStompClientRef.current.deactivate();
      } catch (error) {
        console.error('LOG 연결 정리 중 오류:', error);
      }
      logStompClientRef.current = null;
    }

    if (logReconnectTimeoutRef.current) {
      clearTimeout(logReconnectTimeoutRef.current);
      logReconnectTimeoutRef.current = null;
    }

    // 재연결 시도
    toast.info('서버 연결을 재시도합니다...');

    // 두 연결 모두 재시도
    setTimeout(() => {
      if (!isConnectedRef.current && !stompClientRef.current) {
        connectWebSocket();
      }
      if (!isLogConnectedRef.current && !logStompClientRef.current) {
        connectLogWebSocket();
      }
    }, 100);
  }, []);

  // WebSocket 연결 함수를 분리
  const connectWebSocket = useCallback(() => {
    // 중복 연결 방지 체크
    if (isConnectedRef.current || stompClientRef.current) {
      console.log('연결 시도 중 중복 확인됨, 취소');
      return;
    }

    console.log('WebSocket 연결 시도 중...',
        reconnectAttemptCountRef.current > 0 ?
            `(재연결 시도 ${reconnectAttemptCountRef.current}/${maxReconnectAttempts})` : '');

    // 연결 타임아웃 설정
    connectionTimeoutRef.current = setTimeout(() => {
      if (!isConnectedRef.current) {
        console.log('WebSocket 연결 타임아웃 (10초)');

        // 재연결 시도 횟수 증가
        reconnectAttemptCountRef.current++;

        if (reconnectAttemptCountRef.current <= maxReconnectAttempts) {
          // 경고 토스트 표시
          toast.error(`서버 연결에 실패했습니다. 재연결을 시도합니다... (${reconnectAttemptCountRef.current}/${maxReconnectAttempts})`);

          // 기존 클라이언트 정리
          if (stompClientRef.current) {
            try {
              stompClientRef.current.deactivate();
            } catch (error) {
              console.error('기존 연결 정리 중 오류:', error);
            }
            stompClientRef.current = null;
          }

          // 재연결 시도
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket();
            }, 5000);
          }
        } else {
          // 최대 재연결 시도 횟수 도달
          toast.error('서버에 연결할 수 없습니다. 네트워크 상태를 확인하고 페이지를 새로고침해 주세요.');
          console.error('최대 재연결 시도 횟수에 도달했습니다.');

          // 상태 초기화
          isConnectedRef.current = false;
          if (typeof window !== 'undefined') {
            window.__webSocketConnected = false;
          }
        }
      }
    }, connectionTimeout);

    const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
    console.log('WebSocket 연결 URL:', wsUrl);
    const socket = new SockJS(wsUrl);
    // const socket = new SockJS('http://114.207.245.135:8081/ws-sockjs');
    // const socket = new SockJS('http://iems.store:8081/ws-sockjs');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket 연결 성공');

        // 연결 타임아웃 클리어
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        // 재연결 시도 횟수 초기화
        const wasReconnecting = reconnectAttemptCountRef.current > 0;
        reconnectAttemptCountRef.current = 0;

        isConnectedRef.current = true;
        if (typeof window !== 'undefined') {
          window.__webSocketConnected = true;
        }

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);

        // 재연결 성공 시 성공 토스트 표시
        if (wasReconnecting) {
          toast.success('서버와의 연결이 복구되었습니다.');
        }

        stompClient.subscribe(`/topic/data/0`, handleMessage);
        // 서버 데이터 채우기 제거 - 로컬 상태만 사용
      },
      onStompError: (frame) => {
        console.error('STOMP 에러:', frame);

        // 연결 타임아웃 클리어
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        isConnectedRef.current = false;
        if (typeof window !== 'undefined') {
          window.__webSocketConnected = false;
        }

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);
      },
      onWebSocketClose: () => {
        console.log('WebSocket 연결 종료');

        // 연결 타임아웃 클리어
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        isConnectedRef.current = false;
        if (typeof window !== 'undefined') {
          window.__webSocketConnected = false;
        }

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);

        // 최대 재연결 시도 횟수를 초과하지 않은 경우에만 재연결 시도
        if (reconnectAttemptCountRef.current < maxReconnectAttempts && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 5000);
        }
      }
    });
    stompClient.activate();
    stompClientRef.current = stompClient;
  }, [handleMessage]);

  // LOG WebSocket 연결 함수 추가
  const connectLogWebSocket = useCallback(() => {
    // 중복 연결 방지 체크
    if (isLogConnectedRef.current || logStompClientRef.current) {
      console.log('LOG WebSocket 연결 시도 중 중복 확인됨, 취소');
      return;
    }

    console.log('LOG WebSocket 연결 시도 중...',
        logReconnectAttemptCountRef.current > 0 ?
            `(재연결 시도 ${logReconnectAttemptCountRef.current}/${maxReconnectAttempts})` : '');

    // 연결 타임아웃 설정
    logConnectionTimeoutRef.current = setTimeout(() => {
      if (!isLogConnectedRef.current) {
        console.log('LOG WebSocket 연결 타임아웃 (10초)');

        // 재연결 시도 횟수 증가
        logReconnectAttemptCountRef.current++;

        if (logReconnectAttemptCountRef.current <= maxReconnectAttempts) {
          // 경고 토스트 표시
          toast.error(`LOG 서버 연결에 실패했습니다. 재연결을 시도합니다... (${logReconnectAttemptCountRef.current}/${maxReconnectAttempts})`);

          // 기존 클라이언트 정리
          if (logStompClientRef.current) {
            try {
              logStompClientRef.current.deactivate();
            } catch (error) {
              console.error('기존 LOG 연결 정리 중 오류:', error);
            }
            logStompClientRef.current = null;
          }

          // 재연결 시도
          if (!logReconnectTimeoutRef.current) {
            logReconnectTimeoutRef.current = setTimeout(() => {
              logReconnectTimeoutRef.current = null;
              connectLogWebSocket();
            }, 5000);
          }
        } else {
          // 최대 재연결 시도 횟수 도달
          toast.error('LOG 서버에 연결할 수 없습니다. 네트워크 상태를 확인하고 페이지를 새로고침해 주세요.');
          console.error('LOG WebSocket 최대 재연결 시도 횟수에 도달했습니다.');

          // 상태 초기화
          isLogConnectedRef.current = false;

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);
        }
      }
    }, connectionTimeout);

    // LOG URL 웹소켓 연결 (VITE_WS_LOG_URL 사용)
    const logWsUrl = getWsLogUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
    console.log('LOG WebSocket 연결 URL:', logWsUrl);
    const logSocket = new SockJS(logWsUrl);
    const logStompClient = new Client({
      webSocketFactory: () => logSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('LOG WebSocket 연결 성공');

        // 연결 성공 toast 추가
        toast.success('LOG WebSocket 연결 성공');

        // 연결 타임아웃 클리어
        if (logConnectionTimeoutRef.current) {
          clearTimeout(logConnectionTimeoutRef.current);
          logConnectionTimeoutRef.current = null;
        }

        // 재연결 시도 횟수 초기화
        const wasReconnecting = logReconnectAttemptCountRef.current > 0;
        logReconnectAttemptCountRef.current = 0;

        isLogConnectedRef.current = true;

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);

        // 재연결 성공 시 성공 토스트 표시
        if (wasReconnecting) {
          toast.success('LOG 서버와의 연결이 복구되었습니다.');
        }

        // VITE_BASE_URL_IP를 사용한 PLC 토픽으로 구독
        const baseUrlIp = import.meta.env.VITE_BASE_URL_IP || '175_114_130_5';
        const logSubscriptionTopic = `/topic/plc/${baseUrlIp}`;
        console.log('LOG 웹소켓 구독 토픽:', logSubscriptionTopic);
        logStompClient.subscribe(logSubscriptionTopic, handleLogMessage);
      },
      onStompError: (frame) => {
        console.error('LOG STOMP 에러:', frame);

        // 연결 타임아웃 클리어
        if (logConnectionTimeoutRef.current) {
          clearTimeout(logConnectionTimeoutRef.current);
          logConnectionTimeoutRef.current = null;
        }

        isLogConnectedRef.current = false;

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);
      },
      onWebSocketClose: () => {
        console.log('LOG WebSocket 연결 종료');

        // 연결 타임아웃 클리어
        if (logConnectionTimeoutRef.current) {
          clearTimeout(logConnectionTimeoutRef.current);
          logConnectionTimeoutRef.current = null;
        }

        isLogConnectedRef.current = false;

        // organizationStore에 웹소켓 연결 상태 업데이트 (메인 또는 LOG 중 하나라도 연결되면 true)
        const isAnyConnected = isConnectedRef.current || isLogConnectedRef.current;
        const wsUrl = getWsUrl(API_CONFIG.ENDPOINTS.WS_SOCKJS);
        setWebSocketConnected(isAnyConnected, isAnyConnected ? wsUrl : null);

        // 최대 재연결 시도 횟수를 초과하지 않은 경우에만 재연결 시도
        if (logReconnectAttemptCountRef.current < maxReconnectAttempts && !logReconnectTimeoutRef.current) {
          logReconnectTimeoutRef.current = setTimeout(() => {
            logReconnectTimeoutRef.current = null;
            connectLogWebSocket();
          }, 5000);
        }
      }
    });
    logStompClient.activate();
    logStompClientRef.current = logStompClient;
  }, [handleLogMessage]);

  // WebSocket 연결 및 데이터 수신
  useEffect(() => {
    // 전역 중복 연결 방지
    if (typeof window !== 'undefined' && window.__webSocketConnected) {
      console.log('전역 WebSocket 이미 연결되어 있음, 중복 연결 방지');
      return;
    }

    // 이미 연결되어 있으면 중복 연결 방지
    if (isConnectedRef.current || stompClientRef.current) {
      console.log('WebSocket 이미 연결되어 있음, 중복 연결 방지');
      return;
    }

    // 기존 WebSocket과 LOG WebSocket 모두 연결
    connectWebSocket();
    connectLogWebSocket();

    return () => {
      console.log('WebSocket 정리 중...');
      isConnectedRef.current = false;
      if (typeof window !== 'undefined') {
        window.__webSocketConnected = false;
      }

      // 기존 연결 타임아웃 정리
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
        stompClientRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 재연결 시도 횟수 초기화
      reconnectAttemptCountRef.current = 0;

      // LOG WebSocket 정리
      isLogConnectedRef.current = false;

      if (logConnectionTimeoutRef.current) {
        clearTimeout(logConnectionTimeoutRef.current);
        logConnectionTimeoutRef.current = null;
      }

      if (logStompClientRef.current) {
        logStompClientRef.current.deactivate();
        logStompClientRef.current = null;
      }
      if (logReconnectTimeoutRef.current) {
        clearTimeout(logReconnectTimeoutRef.current);
        logReconnectTimeoutRef.current = null;
      }

      logReconnectAttemptCountRef.current = 0;
    };
  }, [connectWebSocket, connectLogWebSocket]);

  // return useMemo(() => ({
  //   latestMetrics: latestMetricsRef.current,
  //   waitForDeviceInfoUpdate,
  //   waitForPriorityNumbersUpdate
  // }), [waitForDeviceInfoUpdate, waitForPriorityNumbersUpdate]);


  return useMemo(() => {
    const webSocketHook = {
      latestMetrics: latestMetricsRef.current,
      waitForDeviceInfoUpdate,
      waitForPriorityNumbersUpdate,
      manualReconnect,
      get isConnected() {
        return isConnectedRef.current || isLogConnectedRef.current; // 둘 중 하나라도 연결되면 true
      },
      get reconnectAttempts() {
        return Math.max(reconnectAttemptCountRef.current, logReconnectAttemptCountRef.current); // 더 높은 재연결 시도 횟수 반환
      }
    };

    // 전역 변수로 설정 (utils.ts에서 접근하기 위해)
    if (typeof window !== 'undefined') {
      window.__webSocketHook = webSocketHook;
    }

    return webSocketHook;
  }, [waitForDeviceInfoUpdate, waitForPriorityNumbersUpdate, manualReconnect]);
};