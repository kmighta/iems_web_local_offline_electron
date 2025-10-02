import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchCurrentGraphData } from '@/api/device_dynamic';

const getPersistedDeviceInfo = () => {
  try {
    const data = localStorage.getItem('settings-storage');
    if (data) {
      const parsed = JSON.parse(data);
      // deviceInfo 정규화: peak4plus 누락 시 peakplus 또는 '0'으로 보정
      const rawDeviceInfo = parsed.state?.deviceInfo || {};
      const normalizedDeviceInfo = {
        ...rawDeviceInfo,
        peak4plus: rawDeviceInfo?.peak4plus ?? rawDeviceInfo?.peakplus ?? '0',
      };
      return {
        deviceInfo: normalizedDeviceInfo,
        loadCutoffStates: parsed.state?.loadCutoffStates || {},
        graphData: parsed.state?.graphData || [],
      };
    }
  } catch (e) {}
  return { deviceInfo: {}, loadCutoffStates: {}, graphData: []};
};

const { deviceInfo: initialDeviceInfo, loadCutoffStates: initialLoadCutoffStates, graphData: initialGraphData } = getPersistedDeviceInfo();

// 초기 그래프 데이터 생성 함수
const createInitialGraphData = (targetPower = null) => {
  const data = Array.from({ length: 900 }, (_, index) => ({
    demandTime: index,
    time: index === 0 ? "0:00" : `${Math.floor(index / 60)}:${String(index % 60).padStart(2, '0')}`,
    target: targetPower,  // 목표전력 값이 있으면 설정, 없으면 null
    base: null,
    current: null,
    predicted: null
  }));
  // 배열 마지막 값(899번 인덱스)에 목표전력과 기준전력 설정
  if (targetPower !== null) {
    data[899] = {
      ...data[899],
      target: targetPower,
      base: targetPower  // 기준전력도 목표전력 값으로 설정
    };
  }

  return data;
};

const useSettingsStore = create(
    persist(
        (set, get) => ({
          deviceInfo: initialDeviceInfo,
          setDeviceInfo: (newDeviceInfo) => {
            const currentDeviceInfo = get().deviceInfo;
            // 신규 값 정규화: peak4plus 누락 시 peakplus 또는 '0'으로 보정
            const normalizedNew = {
              ...newDeviceInfo,
              peak4plus: newDeviceInfo?.peak4plus ?? newDeviceInfo?.peakplus ?? currentDeviceInfo?.peak4plus ?? '0',
            };
            // 실제로 변경된 값이 있는 경우에만 상태 업데이트
            const hasChanges = Object.keys(normalizedNew).some(
                key => newDeviceInfo[key] !== currentDeviceInfo[key]
            );

            if (hasChanges) {
              set({ deviceInfo: { ...currentDeviceInfo, ...normalizedNew } });
            }
          },

          metricValues: {
            targetPower: initialDeviceInfo.targetPower || '',
            pctRatio: initialDeviceInfo.pctRatio || '',
            pulseConstant: initialDeviceInfo.pulseConstant || '',
            filterConstant: initialDeviceInfo.filterConstant || '',
            firstControlTime: initialDeviceInfo.firstControlTime || '',
            blockInterval: initialDeviceInfo.blockInterval || '',
            inputInterval: initialDeviceInfo.inputInterval || '',
            autoReturnTime: initialDeviceInfo.autoReturnTime || '',
            priorityLevel: (initialDeviceInfo.priorityLevel && initialDeviceInfo.priorityLevel !== '' ? initialDeviceInfo.priorityLevel : '10'),
          },
          setMetricValues: (metricValues) => set({ metricValues }),

          priorityLevel: (initialDeviceInfo.priorityLevel && initialDeviceInfo.priorityLevel !== '' ? initialDeviceInfo.priorityLevel : 10),
          setPriorityLevel: (priorityLevel) => set({ priorityLevel: (priorityLevel && priorityLevel !== '' ? priorityLevel : 10) }),

          // 우선순위 번호 배열 (S-01 ~ S-16)
          priorityNumbers: initialDeviceInfo.priorityNumbers && Array.isArray(initialDeviceInfo.priorityNumbers)
              ? initialDeviceInfo.priorityNumbers
              : Array.from({ length: 16 }, (_, i) => i + 1),
          setPriorityNumbers: (priorityNumbers) => set({ priorityNumbers }),

          // 부하차단 버튼 상태 관리
          loadCutoffStates: initialLoadCutoffStates,
          toggleLoadCutoff: (buttonId) => set((state) => ({
            loadCutoffStates: {
              ...state.loadCutoffStates,
              [buttonId]: !state.loadCutoffStates[buttonId]
            }
          })),

          // 설정 변경 로딩 상태
          isSettingLoading: false,
          loadingMessage: "데이터 로딩중...",
          setIsSettingLoading: (isSettingLoading, message = "데이터 로딩중...") => set({
            isSettingLoading,
            loadingMessage: message
          }),

          // 그래프 데이터 관리
          graphData: initialGraphData.length > 0 ? initialGraphData : createInitialGraphData(initialDeviceInfo.targetPower),

          // 그래프 데이터 로딩 상태
          isGraphDataLoading: false,
          setIsGraphDataLoading: (isLoading) => set({ isGraphDataLoading: isLoading }),

          // 서버에서 초기 그래프 데이터를 가져와서 초기화하는 함수
          initializeGraphDataWithServer: async (targetPower = null, deviceId = 0) => {
            try {
              const { setIsGraphDataLoading } = get();
              setIsGraphDataLoading(true);

              console.log(`서버에서 초기 그래프 데이터 초기화 시작: deviceId=${deviceId}, targetPower=${targetPower}`);

              // 서버에서 현재 그래프 데이터 가져오기
              const currentData = await fetchCurrentGraphData(deviceId, 0);
              //const currentData = [];

              if (currentData && currentData.length > 0) {
                console.log(`서버에서 ${currentData.length}개의 초기 데이터를 받았습니다.`);

                // 900개 배열로 초기화
                const initialData = Array.from({ length: 900 }, (_, index) => ({
                  demandTime: index,
                  time: index === 0 ? "0:00" : `${Math.floor(index / 60)}:${String(index % 60).padStart(2, '0')}`,
                  target: targetPower,
                  base: null,
                  current: null,
                  predicted: null
                }));

                // 서버에서 가져온 데이터로 채우기
                currentData.forEach(item => {
                  const demandTime = Number(item.demandTime);
                  if (demandTime >= 0 && demandTime < initialData.length) {
                    initialData[demandTime] = {
                      demandTime: demandTime,
                      time: demandTime === 0 ? "0:00" : `${Math.floor(demandTime / 60)}:${String(demandTime % 60).padStart(2, '0')}`,
                      target: item.target || targetPower,
                      base: item.base || null,
                      current: item.current || null,
                      predicted: item.predicted || null
                    };
                  }
                });

                // 899번 인덱스에 목표전력과 기준전력 설정
                if (targetPower !== null) {
                  initialData[899] = {
                    ...initialData[899],
                    target: targetPower,
                    base: initialData[899].base || targetPower
                  };
                }

                set({ graphData: initialData });
                localStorage.setItem('iems-graph-data', JSON.stringify(initialData));

                console.log('서버에서 초기 그래프 데이터 초기화 완료');
                return initialData;
              } else {
                console.log('서버에서 초기 데이터를 받지 못하여 기본 데이터로 초기화합니다.');
                const fallbackData = createInitialGraphData(targetPower);
                set({ graphData: fallbackData });
                localStorage.setItem('iems-graph-data', JSON.stringify(fallbackData));
                return fallbackData;
              }
            } catch (error) {
              console.error('서버에서 초기 그래프 데이터 초기화 실패:', error);
              const fallbackData = createInitialGraphData(targetPower);
              set({ graphData: fallbackData });
              localStorage.setItem('iems-graph-data', JSON.stringify(fallbackData));
              return fallbackData;
            } finally {
              const { setIsGraphDataLoading } = get();
              setIsGraphDataLoading(false);
            }
          },

          // 서버에서 이전 그래프 데이터를 가져와서 null 값을 채우는 함수 (마운트 시 한 번만 사용)
          fillGraphDataFromServer: async (deviceId = 0, storeId = null) => {
            try {
              const { deviceInfo, graphData } = get();
              
              // 현재 수요시간을 더 스마트하게 결정
              let currentDemandTime = Number(deviceInfo.demandTime) || 0;
              
              // deviceInfo.demandTime이 0이거나 없는 경우, 그래프 데이터에서 추출
              if (currentDemandTime === 0 && graphData && graphData.length > 0) {
                // 그래프 데이터에서 가장 최신의 유효한 demandTime 찾기
                // current 값이 있는 항목만 실제 웹소켓 데이터로 간주 (초기화 데이터 899번 제외)
                const validDemandTimes = graphData
                  .filter(item => item.current !== null && item.current !== undefined)
                  .map(item => item.demandTime)
                  .filter(time => time >= 0 && time < 899); // 899는 초기화 데이터이므로 제외
                
                if (validDemandTimes.length > 0) {
                  currentDemandTime = Math.max(...validDemandTimes);
                  console.log(`deviceInfo.demandTime이 0이므로 그래프 데이터에서 추출: ${currentDemandTime} (실제 웹소켓 데이터 기준)`);
                } else {
                  // 실제 웹소켓 데이터가 없다면 기본값 사용
                  console.log('실제 웹소켓 데이터가 없어 currentDemandTime을 기본값(0)으로 설정');
                }
              }
              
              const currentTargetPower = Number(deviceInfo.targetPower) || 0;

              console.log(`서버에서 그래프 데이터 채우기 시작: deviceId=${deviceId}, demandTime=${currentDemandTime}, targetPower=${currentTargetPower}, storeId=${storeId}`);

              // 현재 그래프 데이터에서 null 값이 있는 구간 찾기
              const nullRanges = [];
              let startIndex = null;

              for (let i = 0; i < graphData.length; i++) {
                if (graphData[i].base === null || graphData[i].base === 0) {
                  if (startIndex === null) {
                    startIndex = i;
                  }
                } else {
                  if (startIndex !== null) {
                    nullRanges.push({ start: startIndex, end: i - 1 });
                    startIndex = null;
                  }
                }
              }

              // 마지막 null 구간 처리
              if (startIndex !== null) {
                nullRanges.push({ start: startIndex, end: graphData.length - 1 });
              }

              // console.log(`null 구간 ${nullRanges.length}개 발견:`, nullRanges);

              // null 구간이 있으면 서버에서 데이터 가져오기
              if (nullRanges.length > 0) {
                // console.log('서버에서 현재 그래프 데이터 요청 중...');

                // 현재 수요시간까지의 데이터 가져오기
                const currentData = (await fetchCurrentGraphData(deviceId, currentDemandTime)).data;
                //const currentData = [];

                if (currentData && currentData.length > 0) {
                  // console.log(`서버에서 ${currentData.length}개의 현재 데이터를 받았습니다.`);

                  const updatedGraphData = [...graphData];

                  // 서버에서 가져온 데이터로 null 값 채우기
                  currentData.forEach(item => {
                    const demandTime = Number(item.demandTime);
                    if (demandTime >= 0 && demandTime < updatedGraphData.length) {
                      updatedGraphData[demandTime] = {
                        demandTime: demandTime,
                        time: demandTime === 0 ? "0:00" : `${Math.floor(demandTime / 60)}:${String(demandTime % 60).padStart(2, '0')}`,
                        target: item.target || currentTargetPower,
                        base: item.base || null,
                        current: item.current || null,
                        predicted: item.predicted || null
                      };
                    }
                  });

                  // 목표전력이 null인 구간을 현재 목표전력으로 채우기
                  for (let i = 0; i < updatedGraphData.length; i++) {
                    if (updatedGraphData[i].target === null) {
                      updatedGraphData[i].target = currentTargetPower;
                    }
                  }

                  // 899번 인덱스에 목표전력과 기준전력 설정
                  if (currentTargetPower !== null) {
                    updatedGraphData[899] = {
                      ...updatedGraphData[899],
                      target: currentTargetPower,
                      base: updatedGraphData[899].base || currentTargetPower
                    };
                  }

                  set({ graphData: updatedGraphData });
                  localStorage.setItem('iems-graph-data', JSON.stringify(updatedGraphData));

                  // console.log('서버에서 이전 그래프 데이터 채우기 완료');
                  return updatedGraphData;
                } else {
                  console.log('서버에서 현재 데이터를 받지 못했습니다.');
                }
              } else {
                console.log('null 구간이 없어 서버 호출을 건너뜁니다.');
              }

              return graphData;
            } catch (error) {
              console.error('서버에서 그래프 데이터 가져오기 실패:', error);
              return get().graphData;
            }
          },

          // 그래프 데이터 초기화
          initializeGraphData: (targetPower = null) => {
            console.log('그래프 데이터 초기화 시작:', { targetPower });

            const initialData = Array.from({ length: 900 }, (_, index) => ({
              demandTime: index,
              time: index === 0 ? "0:00" : `${Math.floor(index / 60)}:${String(index % 60).padStart(2, '0')}`,
              target: targetPower,  // 목표전력 값이 있으면 설정, 없으면 null
              base: 0,
              current: null,
              predicted: null
            }));

            // 배열 마지막 값(899번 인덱스)에 목표전력과 기준전력 설정
            if (targetPower !== null) {
              initialData[899] = {
                ...initialData[899],
                target: targetPower,
                base: targetPower  // 기준전력도 목표전력 값으로 설정
              };
            }

            set({ graphData: initialData });
            // localStorage에도 저장
            localStorage.setItem('iems-graph-data', JSON.stringify(initialData));
            
            console.log('그래프 데이터 초기화 완료:', { targetPower, dataLength: initialData.length });
          },

          // 그래프 데이터 업데이트
          updateGraphData: (newEntry) => {
            const { graphData } = get();

            // 새로운 주기가 시작되면(수요시간이 감소하면) 기존 데이터를 초기화합니다.
            // 단, 0초 바로 다음 1초가 오는 정상적인 시작은 제외합니다.
            let dataForUpdate = graphData;
            const lastDemandTime = graphData.length > 0 ? Math.max(...graphData.filter(d => d.current !== null).map(d => d.demandTime)) : 0;

            if (newEntry.demandTime < lastDemandTime && lastDemandTime > 1) {
              // 새로운 주기 시작 시 목표전력을 전체 수요시간에 미리 설정
              dataForUpdate = Array.from({ length: 900 }, (_, index) => ({
                demandTime: index,
                time: index === 0 ? "0:00" : `${Math.floor(index / 60)}:${String(index % 60).padStart(2, '0')}`,
                target: newEntry.target,  // 새로운 목표전력으로 전체 설정
                base: null,
                current: null,
                predicted: null
              }));

              // 배열 마지막 값(899번 인덱스)에도 목표전력과 기준전력 설정
              if (newEntry.target !== null) {
                dataForUpdate[899] = {
                  ...dataForUpdate[899],
                  target: newEntry.target,
                  base: newEntry.target  // 기준전력도 목표전력 값으로 설정
                };
              }
            }

            // 현재 수요시간 인덱스에 새 데이터 업데이트
            const updated = [...dataForUpdate];
            const currentTarget = updated[newEntry.demandTime]?.target;

            // 목표전력이 변경되었는지 확인 (null이 아닌 경우에만 비교)
            const targetChanged = currentTarget !== null &&
                newEntry.target !== null &&
                currentTarget !== newEntry.target;

            updated[newEntry.demandTime] = {
              ...newEntry
            };

            // 실시간 기준전력 선형 연결 로직 (목표전력 변경이 아닌 경우)
            if (!targetChanged) {
              const currentBasePower = newEntry.base;
              const lastBasePower = updated[899]?.base;

              if (currentBasePower !== null && lastBasePower !== null &&
                  newEntry.demandTime < 899 && newEntry.demandTime > 0) {

                const totalSteps = 899 - newEntry.demandTime;
                const powerDifference = lastBasePower - currentBasePower;

                if (totalSteps > 0) {
                  const stepIncrement = powerDifference / totalSteps;

                  for (let i = newEntry.demandTime + 1; i <= 899; i++) {
                    const interpolatedBase = currentBasePower + (stepIncrement * (i - newEntry.demandTime));
                    updated[i] = {
                      ...updated[i],
                      base: Math.round(interpolatedBase * 100) / 100  // 소수점 2자리까지 반올림
                    };
                  }
                }
              }
            }

            // 목표전력이 변경되었으면 현재 수요시간 이후의 모든 시간에 새로운 목표전력 적용
            if (targetChanged) {
              console.log('목표전력 변경 감지:', {
                demandTime: newEntry.demandTime,
                oldTarget: currentTarget,
                newTarget: newEntry.target
              });

              // 899번 인덱스는 제외 (목표전력과 기준전력이 설정되어 있음)
              for (let i = newEntry.demandTime + 1; i < updated.length - 1; i++) {
                updated[i] = {
                  ...updated[i],
                  target: newEntry.target,  // 새로운 목표전력으로 업데이트
                  base: null,
                  current: null
                  // predicted는 기존 값 유지
                };
              }

              // 배열 마지막 값(899번 인덱스)에도 목표전력과 기준전력 설정
              console.log('newEntry.target:', newEntry.target);
              if (newEntry.target !== null) {
                updated[899] = {
                  ...updated[899],
                  target: newEntry.target,
                  base: newEntry.target  // 기준전력도 목표전력 값으로 설정
                };
              }

              // 목표전력 변경 후 기준전력 선형 연결 재계산
              const currentBasePower = newEntry.base;
              const lastBasePower = updated[899]?.base;

              if (currentBasePower !== null && lastBasePower !== null &&
                  newEntry.demandTime < 899 && newEntry.demandTime > 0) {

                const totalSteps = 899 - newEntry.demandTime;
                const powerDifference = lastBasePower - currentBasePower;

                if (totalSteps > 0) {
                  const stepIncrement = powerDifference / totalSteps;

                  for (let i = newEntry.demandTime + 1; i <= 899; i++) {
                    const interpolatedBase = currentBasePower + (stepIncrement * (i - newEntry.demandTime));
                    updated[i] = {
                      ...updated[i],
                      base: Math.round(interpolatedBase * 100) / 100  // 소수점 2자리까지 반올림
                    };
                  }
                }
              }
              // 마지막 값 보정
              if (updated[899].base === null && currentBasePower !== null) {
                updated[899].base = currentBasePower;
              }
            }

            // 이전 값들을 현재 수요시간까지 복사 (진행전력은 현재 수요시간까지만 유지)
            for (let i = 1; i < newEntry.demandTime; i++) {
              if (updated[i].base === 0 && updated[i].target === null) {
                const prevItem = updated.find(d => d.demandTime < i && d.base !== 0);
                if (prevItem) {
                  updated[i] = {
                    ...updated[i],
                    target: prevItem.target,
                    base: prevItem.base,
                    current: null, // 진행전력은 null 유지
                    predicted: null
                  };
                }
              }
            }

            // 현재 수요시간 이후의 진행전력은 null로 설정 (목표전력은 위에서 이미 처리됨)
            // 기준전력은 선형 연결 로직에서 이미 설정되었으므로 건드리지 않음
            for (let i = newEntry.demandTime + 1; i < updated.length - 1; i++) {
              updated[i] = {
                ...updated[i],
                current: null,
                predicted: null
                // base와 target은 유지 (이미 위에서 설정됨)
              };
            }

            set({ graphData: updated });
            // localStorage에도 저장
            localStorage.setItem('iems-graph-data', JSON.stringify(updated));
          },

          // 그래프 데이터 로드 (localStorage에서)
          loadGraphData: () => {
            try {
              const savedData = localStorage.getItem('iems-graph-data');
              if (savedData) {
                const parsed = JSON.parse(savedData);
                const { deviceInfo } = get();
                const currentDemandTime = Number(deviceInfo.demandTime) || 0;
                const currentTargetPower = Number(deviceInfo.targetPower) || 0;

                // 900개 배열로 확장 (0~899)
                const expandedData = Array.from({ length: 900 }, (_, index) => {
                  const existingItem = parsed.find(item => item.demandTime === index);
                  if (existingItem) {
                    return {
                      ...existingItem,
                      target: existingItem.target !== null ? existingItem.target : currentTargetPower  // 목표전력이 null이면 현재 목표전력으로 설정
                    };
                  }
                  // 데이터가 없으면 이전 값 유지 (진행전력은 null)
                  const prevItem = parsed.find(item => item.demandTime < index);
                  return {
                    demandTime: index,
                    time: index === 0 ? "0:00" : `${Math.floor(index / 60)}:${String(index % 60).padStart(2, '0')}`,
                    target: currentTargetPower,  // 현재 목표전력으로 설정
                    base: prevItem?.base || 0,
                    current: null, // 진행전력은 이전 값 유지하지 않고 null
                    predicted: null
                  };
                });
                set({ graphData: expandedData });
                return expandedData;
              }
            } catch (error) {
              console.error('그래프 데이터 복원 실패:', error);
            }

            // 저장된 데이터가 없거나 오류 발생 시 초기 데이터 생성
            const { deviceInfo } = get();
            const currentTargetPower = Number(deviceInfo.targetPower) || 0;
            const fallbackData = createInitialGraphData(currentTargetPower);

            // 배열 마지막 값(899번 인덱스)에 목표전력과 기준전력 설정
            if (currentTargetPower !== null) {
              fallbackData[899] = {
                ...fallbackData[899],
                target: currentTargetPower,
                base: currentTargetPower  // 기준전력도 목표전력 값으로 설정
              };
            }

            set({ graphData: fallbackData });
            return fallbackData;
          },

          // 사업장 페이지를 벗어날 때 모니터링 상태 초기화
          resetMonitoringData: () => {
            console.log('모니터링 상태 초기화 시작');
            
            // 초기 상태로 리셋
            const initialState = {
              deviceInfo: {},
              metricValues: {
                targetPower: '',
                pctRatio: '',
                pulseConstant: '',
                filterConstant: '',
                firstControlTime: '',
                blockInterval: '',
                inputInterval: '',
                autoReturnTime: '',
                priorityLevel: '10',
              },
              priorityLevel: 10,
              priorityNumbers: Array.from({ length: 16 }, (_, i) => i + 1),
              loadCutoffStates: {},
              isSettingLoading: false,
              loadingMessage: "데이터 로딩중...",
              graphData: createInitialGraphData(null),
              isGraphDataLoading: false,
            };

            set(initialState);

            // localStorage에서도 관련 데이터 제거
            try {
              localStorage.removeItem('iems-graph-data');
              // settings-storage는 persist 미들웨어가 자동으로 처리하므로 별도 삭제하지 않음
              console.log('모니터링 관련 localStorage 데이터 초기화 완료');
            } catch (error) {
              console.error('localStorage 초기화 실패:', error);
            }

            console.log('모니터링 상태 초기화 완료');
          },

          // deviceInfo 캐시만 초기화 (보고서/사업장 탭 전환 시)
          clearDeviceInfoCache: () => {
            console.log('deviceInfo 캐시 초기화');
            set({ deviceInfo: {} });
            
            // localStorage에서도 deviceInfo만 제거
            try {
              const settingsData = localStorage.getItem('settings-storage');
              if (settingsData) {
                const parsed = JSON.parse(settingsData);
                if (parsed.state) {
                  parsed.state.deviceInfo = {};
                  localStorage.setItem('settings-storage', JSON.stringify(parsed));
                }
              }
              console.log('deviceInfo 캐시 초기화 완료');
            } catch (error) {
              console.error('deviceInfo 캐시 초기화 중 오류:', error);
            }
          },

          // loadCutoffStates 캐시만 초기화 (보고서/사업장 탭 전환 시)
          clearLoadCutoffStatesCache: () => {
            console.log('loadCutoffStates 캐시 초기화');
            set({ loadCutoffStates: {} });
          },

          // 연결 상태 관리
          connectionState: {
            isConnected: true,
            hasShownConnectionLost: false,
            hasShownConnectionRestored: false
          },
          setConnectionState: (newState) => set((state) => ({
            connectionState: { ...state.connectionState, ...newState }
          })),
          resetConnectionState: () => set({
            connectionState: {
              isConnected: true,
              hasShownConnectionLost: false,
              hasShownConnectionRestored: false
            }
          }),
        }),
        {
          name: 'settings-storage',
          partialize: (state) => ({
            deviceInfo: state.deviceInfo,
            priorityLevel: state.priorityLevel,
            loadCutoffStates: state.loadCutoffStates,
            graphData: state.graphData,
          }),
        }
    )
);

export default useSettingsStore; 