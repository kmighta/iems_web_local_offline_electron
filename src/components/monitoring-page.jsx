import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Zap,
  Target,
  TrendingUp,
  BarChart3,
  Clock,
  Store,
  AlertTriangle,
  TriangleAlert,
  BarChart2,
} from "lucide-react";
import { useAuth } from "../router/router";
// useSettingsStore는 전역 ConnectionStatusHandler에서 사용됨
import { toast } from "sonner";
import { updateDeviceInfoAndWait } from "@/lib/utils.js";
import { updateDeviceInfo } from "@/api/device.js";
import { getOrganization } from "@/api/organization.js";
import LgAcpModal from "./LgAcpModal.jsx";
import AcpBlockModal from "./AcpBlockModal.jsx";
import useSettingsStore from "@/store/settingsStore.js";
import useOrganizationStore from "@/store/organizationStore.js";

// 전체 화면 로딩 컴포넌트
const FullScreenLoading = ({ message = "저장 중..." }) => (
    <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 flex flex-col items-center space-y-4 backdrop-blur-sm rounded-2xl border-0 shadow-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-lg font-medium text-gray-700">{message}</p>
      </div>
    </div>
);

// 빠른 깜빡임 애니메이션 스타일
const blinkStyle = `
  @keyframes blink-fast {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }
`;

// 스타일 태그를 head에 추가
if (typeof document !== "undefined") {
  const styleElement = document.createElement("style");
  styleElement.textContent = blinkStyle;
  document.head.appendChild(styleElement);
}

// 모바일 환경 감지 함수
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
  ) || (window.innerWidth <= 768 && 'ontouchstart' in window);
};

// 전력 단위 변환 함수
const formatPower = (value, wUnit = null) => {
  if (value === null || value === undefined || isNaN(value)) {
    return { value: 0, unit: 'W' };
  }
  
  const numValue = Number(value);
  
  // w_unit이 1인 경우 kW 단위로 소수점 없이 표시
  if (wUnit === 1) {
    return { 
      value: Math.round(numValue), 
      unit: 'kW' 
    };
  }
  
  // w_unit이 0이거나 null인 경우 기존 로직 (자동 변환)
  if (numValue >= 1000000) {
    // 1MW 이상인 경우 MW로 표시
    return { 
      value: (numValue / 1000000).toFixed(3), 
      unit: 'MW' 
    };
  } else if (numValue >= 1000) {
    // 1kW 이상인 경우 kW로 표시
    return { 
      value: (numValue / 1000).toFixed(3), 
      unit: 'kW' 
    };
  } else {
    // 1kW 미만인 경우 W로 표시 (소수점 없음)
    return { 
      value: Math.round(numValue), 
      unit: 'W' 
    };
  }
};

// 다크모드 감지 함수
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };

    // 초기 확인
    checkDarkMode();

    // MutationObserver로 class 변경 감지
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

// 커스텀 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label, formatter, labelFormatter, onClose }) => {
  const isDark = useDarkMode();
  
  console.log("CustomTooltip rendered:", { active, payload: payload?.length, isMobile: isMobileDevice() });
  
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
      <div
          className="custom-tooltip"
          style={{
            background: isDark ? "#374151" : "white",
            border: isDark ? "1px solid #4b5563" : "1px solid #e2e8f0",
            borderRadius: 8,
            color: isDark ? "#f9fafb" : "#374151",
            fontSize: 14,
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            padding: "16px",
            paddingRight: "40px",
            position: "relative",
            minWidth: "200px"
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isMobileDevice() && onClose) {
              onClose();
            }
          }}
      >
        <div style={{ color: isDark ? "#f9fafb" : "#374151", fontWeight: 600, marginBottom: "12px", paddingRight: "20px" }}>
          {payload && payload[0] && payload[0].payload ? (() => {
            const demandTime = payload[0].payload.demandTime;
            const minutes = Math.floor(demandTime / 60);
            const seconds = demandTime % 60;
            return `수요시간: ${minutes}분 ${seconds}초`;
          })() : `시간: ${label}`}
        </div>
        {(() => {
          // 목표전력, 예측전력, 기준전력, 진행전력 순으로 강제 정렬
          const orderedNames = ["목표전력", "예측전력", "기준전력", "진행전력"];
          const sortedPayload = [];
          
          // 지정된 순서대로 데이터 찾아서 추가
          orderedNames.forEach(name => {
            const entry = payload.find(item => item.name === name);
            if (entry) {
              sortedPayload.push(entry);
            }
          });
          
          // 나머지 항목들 추가 (혹시 다른 항목이 있다면)
          payload.forEach(entry => {
            if (!orderedNames.includes(entry.name)) {
              sortedPayload.push(entry);
            }
          });
          
          return sortedPayload.map((entry, index) => {
            const [value, name] = formatter ? formatter(entry.value, entry.name) : [entry.value, entry.name];
            return (
                <div key={index} style={{ color: entry.color, marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold" }}>{name}:</span> {value}
                </div>
            );
          });
        })()}
        {isMobileDevice() && (
            <div
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: isDark ? "#9ca3af" : "#666",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "#4b5563" : "#f1f5f9",
                  borderRadius: "50%",
                  border: isDark ? "1px solid #6b7280" : "1px solid #e2e8f0"
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClose) onClose();
                }}
            >
              ×
            </div>
        )}
      </div>
  );
};

export default function MonitoringPage() {
  const { storeId } = useParams();
  const location = useLocation();
  const { userRole, currentUser, selectedStore: authSelectedStore } = useAuth();

  // API 재시도 wrapper 함수
  const retryApiCall = async (
    apiFunction, 
    maxRetries = 5, 
    timeoutMs = 5000, 
    delayMs = 1000,
    functionName = 'API'
  ) => {
    let lastError = null;
    
    // 재시도 상태 초기화
    setRetryStatus({ isRetrying: true, attempt: 0, maxAttempts: maxRetries, functionName });
    
    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // 재시도 상태 업데이트
          setRetryStatus({ isRetrying: true, attempt, maxAttempts: maxRetries, functionName });
          console.log(`${functionName} 호출 시도 ${attempt}/${maxRetries}`);
          
          // Promise.race를 사용하여 타임아웃 구현
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${functionName} 호출이 ${timeoutMs/1000}초 내에 완료되지 않았습니다.`)), timeoutMs)
          );
          
          const result = await Promise.race([
            apiFunction(),
            timeoutPromise
          ]);
          
          console.log(`${functionName} 호출 성공 (시도 ${attempt}/${maxRetries})`);
          
          // 성공 시 재시도 상태 해제
          setRetryStatus({ isRetrying: false, attempt: 0, maxAttempts: 0, functionName: '' });
          return result;
          
        } catch (error) {
          lastError = error;
          console.warn(`${functionName} 호출 실패 (시도 ${attempt}/${maxRetries}):`, error.message);
          
          // 마지막 시도가 아니라면 지연 후 재시도
          if (attempt < maxRetries) {
            console.log(`${delayMs/1000}초 후 재시도합니다...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            // 지연시간 점진적 증가 (백오프 전략)
            delayMs = Math.min(delayMs * 1.5, 5000);
          }
        }
      }
      
      // 모든 재시도 실패 시
      const errorMessage = `${functionName} 호출이 ${maxRetries}번 모두 실패했습니다. 마지막 오류: ${lastError?.message}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
      
    } finally {
      // 재시도 상태 해제
      setRetryStatus({ isRetrying: false, attempt: 0, maxAttempts: 0, functionName: '' });
    }
  };

  // 연결 상태 처리는 전역 ConnectionStatusHandler에서 처리됨

  // 연결 해제 모달은 전역 ConnectionStatusHandler에서 처리됨
  const [plcTime, setPlcTime] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [isControlAble, setIsControlAble] = useState(false);

  const {
    deviceInfo,
    setDeviceInfo,
    isSaveProtected,
    setIsSaveProtected,
    loadCutoffStates,
    toggleLoadCutoff,
    graphData,
    loadGraphData,
    fillGraphDataFromServer,
    initializeGraphDataWithServer,
    initializeGraphData,
    isGraphDataLoading,
    setIsGraphDataLoading,
    priorityLevel,
    setPriorityLevel,
    isSettingLoading,
    loadingMessage,
  } = useSettingsStore();

  // 웹소켓 연결 상태 확인을 위한 store 추가
  const { isWebSocketConnected } = useOrganizationStore();

  const [metricsData, setMetricsData] = useState(deviceInfo);
  const [operationMode, setOperationMode] = useState(
      deviceInfo.operationMode || "1"
  );
  const [ctrlModes, setCtrlModes] = useState(deviceInfo.ctrlMode || "1");
  
  // 조직 정보 상태 추가
  const [organizationInfo, setOrganizationInfo] = useState(null);
  const [isOrganizationLoading, setIsOrganizationLoading] = useState(false);

  // 차트 선 표시/숨김 상태 관리
  const [hiddenLines, setHiddenLines] = useState({});
  
  // 차트 데이터 로딩 상태 관리
  const [isChartDataReady, setIsChartDataReady] = useState(false);
  
  // 차트 표시 지연 상태 (실서버에서 이전 사업장 차트 잠깐 보이는 문제 방지)
  const [isChartVisible, setIsChartVisible] = useState(false);
  
  // 중복 API 호출 방지를 위한 ref
  const lastLoadedRef = useRef({ storeId: null, targetPower: null });
  
  // stableInitializeGraphData 제거됨 - 직접 initializeGraphData 사용

  // Legend 클릭 핸들러 - useCallback 제거하여 무한 리렌더링 방지
  const handleLegendClick = (entry) => {
    setHiddenLines((prev) => ({
      ...prev,
      [entry.dataKey]: !prev[entry.dataKey],
    }));
  };

  // 운전모드 변경 로딩 상태
  const [isOperationModeLoading, setIsOperationModeLoading] = useState(false);

  // 제어방법 변경 로딩 상태
  const [isControlModeLoading, setIsControlModeLoading] = useState(false);

  // 차단그룹 변경 로딩 상태
  const [isLoadCutoffLoading, setIsLoadCutoffLoading] = useState(false);

  // 차트 새로고침 로딩 상태 추가
  const [isChartRefreshing, setIsChartRefreshing] = useState(false);

  // 이전 차트 데이터를 유지하기 위한 상태 추가
  const [previousGraphData, setPreviousGraphData] = useState([]);

  // API 재시도 상태 관리
  const [retryStatus, setRetryStatus] = useState({ isRetrying: false, attempt: 0, maxAttempts: 0, functionName: '' });

  // 툴팁 상태 관리
  const [tooltipActive, setTooltipActive] = useState(false);

  // LG ACP 모달 상태 관리
  const [isLgAcpModalOpen, setIsLgAcpModalOpen] = useState(false);

  // ACP차단설정 모달 상태 관리
  const [isAcpBlockModalOpen, setIsAcpBlockModalOpen] = useState(false);  

  // 사업장 정보 가져오기
  const getStoreInfo = () => {
    // 관리자급 역할들(admin, han, admin_owner, admin_engineer, admin_user)인 경우
    if (userRole === "admin" || userRole === "han" || userRole === "admin_owner" || 
        userRole === "admin_engineer" || userRole === "admin_user") {
      // 관리자인 경우 URL 파라미터나 location state에서 사업장 정보 가져오기
      if (location.state?.store) {
        return location.state.store;
      }
      // storeId가 있으면 해당 사업장 정보 찾기
      if (storeId) {
        return {id:storeId};
      }
    } else {
      // 일반 사용자인 경우 본인 사업장 정보 가져오기
      return authSelectedStore;
    }
    return null;
  };

  const selectedStore = useMemo(() => getStoreInfo(), [userRole, location.state?.store, storeId, authSelectedStore]);

  // 사업장 변경 시 차트 상태 초기화 (데이터는 별도 useEffect에서 처리)
  useEffect(() => {
    console.log('사업장 변경으로 인한 차트 상태 초기화:', selectedStore?.id);
    
    // 사업장이 변경되면 차트 상태 즉시 숨기기
    setTooltipActive(false);
    setIsChartDataReady(false);
    setIsChartVisible(false); // 차트 즉시 숨김
  }, [selectedStore]);

  // 컴포넌트 마운트 시 차트 표시 상태 초기화 (F5 새로고침 대응)
  useEffect(() => {
    console.log('컴포넌트 마운트 - 차트 표시 상태 초기화');
    // 마운트 시 차트를 일단 숨기고, 데이터 로딩 완료 후 표시
    setIsChartVisible(false);
  }, []); // 컴포넌트 마운트 시에만 실행

  // deviceInfo 변경 감지 useEffect 제거됨 (위의 combined useEffect로 처리)

  // 조직 정보 가져오기
  useEffect(() => {
    const fetchOrganizationInfo = async () => {
      if (selectedStore && selectedStore.id && !isOrganizationLoading) {
        // 이미 로딩 중이거나 동일한 조직 정보가 있으면 중복 호출 방지
        if (organizationInfo && organizationInfo.id === selectedStore.id) {
          console.log('이미 동일한 조직 정보가 로드되어 있습니다.');
          return;
        }

        setIsOrganizationLoading(true);
        try {
          const orgInfo = await getOrganization(selectedStore.id);
          setOrganizationInfo(orgInfo);
          console.log('조직 정보 로드:', orgInfo);
        } catch (error) {
          console.error('조직 정보 로드 실패:', error);
        } finally {
          setIsOrganizationLoading(false);
        }
      }
    };

    fetchOrganizationInfo();
  }, [selectedStore?.id]); // selectedStore 전체가 아닌 id만 의존성으로 설정

  // deviceInfo가 실시간으로 업데이트될 때 operationMode와 ctrlModes도 함께 업데이트
  useEffect(() => {
    if (deviceInfo) {
      if (deviceInfo.operationMode !== undefined) {
        setOperationMode(deviceInfo.operationMode);
      }
      if (deviceInfo.ctrlMode !== undefined) {
        setCtrlModes(deviceInfo.ctrlMode);
      }
    }
  }, [deviceInfo?.operationMode, deviceInfo?.ctrlMode]);

  // deviceInfo의 manualCtrl 값이 변경될 때 loadCutoffStates 자동 업데이트
  useEffect(() => {
    if (deviceInfo && deviceInfo.manualCtrl !== undefined) {
      const manualCtrlValue = parseInt(deviceInfo.manualCtrl, 10);
      if (!isNaN(manualCtrlValue)) {
        // 16비트 이진법으로 변환 (G-01 ~ G-16)
        const binaryString = manualCtrlValue.toString(2).padStart(16, "0");

        // 각 비트를 차단그룹 상태로 변환
        const newCutoffStates = {};
        for (let i = 0; i < 16; i++) {
          const groupLabel = `G-${String(i + 1).padStart(2, "0")}`;
          // 비트가 1이면 차단상태, 0이면 비차단상태
          newCutoffStates[groupLabel] = binaryString[15 - i] === "1";
        }

        // 현재 상태와 비교하여 변경된 것만 업데이트
        Object.keys(newCutoffStates).forEach((label) => {
          if (loadCutoffStates[label] !== newCutoffStates[label]) {
            toggleLoadCutoff(label);
          }
        });
      }
    }
  }, [deviceInfo?.manualCtrl, loadCutoffStates, toggleLoadCutoff]);

  useEffect(() => {
    // 모니터링 관리자(admin_user)와 한전(han)은 일반 사용자(user)와 동일한 권한 (모니터링만)
    if (userRole === "user" || userRole === "admin_user" || userRole === "han") {
      setIsControlAble(false);
    } else {
      // 나머지 역할들(admin, admin_owner, admin_engineer, owner, engineer)은 제어 가능
      setIsControlAble(true);
    }
  }, [userRole]);

  // 데이터 끊김 방지를 위한 보완된 차트 데이터
  const stableGraphData = useMemo(() => {
    // 데이터 유효성 검증 함수
    const isValidData = (data) => {
      return data &&
          typeof data === 'object' &&
          data.demandTime !== undefined &&
          data.demandTime !== null &&
          !isNaN(data.demandTime) &&
          data.demandTime >= 0 &&
          data.demandTime <= 900;
    };

    // 데이터 값 유효성 검증 함수
    const isValidValue = (value) => {
      return value !== null &&
          value !== undefined &&
          !isNaN(value) &&
          value >= 0;
    };

    // 새로고침 중이거나 데이터가 없을 때 이전 데이터 사용
    let currentData = graphData;

    // 현재 데이터 유효성 체크
    if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
      // 현재 데이터가 없으면 이전 데이터 사용
      currentData = previousGraphData;
    }

    // 새로고침 중일 때는 항상 이전 데이터 사용
    if (isChartRefreshing && previousGraphData && previousGraphData.length > 0) {
      currentData = previousGraphData;
    }

    // 최종적으로 사용할 데이터가 없으면 빈 배열 반환
    if (!currentData || !Array.isArray(currentData) || currentData.length === 0) {
      return [];
    }

    // 실제 데이터가 있는지 확인 (모든 필드 체크)
    const hasRealData = currentData.some(data =>
            isValidData(data) && (
                isValidValue(data.target) ||
                isValidValue(data.base) ||
                isValidValue(data.current) ||
                isValidValue(data.predicted)
            )
    );

    if (!hasRealData) {
      return [];
    }

    // 현재 진행 중인 수요시간 확인
    const currentDemandTime = currentData.reduce((max, item) => {
      return Math.max(max, item.demandTime || 0);
    }, 0);

    // 데이터 전처리: 유효한 데이터만 필터링하고 정렬
    const sortedData = currentData
        .filter(data => isValidData(data))
        .sort((a, b) => (a.demandTime || 0) - (b.demandTime || 0))
        .map(data => ({
          demandTime: data.demandTime || 0,
          target: isValidValue(data.target) ? data.target : null,
          base: isValidValue(data.base) ? data.base : null,
          current: isValidValue(data.current) ? data.current : null,
          predicted: isValidValue(data.predicted) ? data.predicted : null
        }));

    // 정제된 데이터가 없으면 빈 배열 반환
    if (sortedData.length === 0) return [];

    // 실제 데이터에서 현재 수요시간 확인 (실제 진행 중인 시간)
    const demandTimes = sortedData.map(d => d.demandTime).filter(t => !isNaN(t));
    if (demandTimes.length === 0) return [];

    const maxDemandTime = Math.max(...demandTimes);

    // 실제 데이터에서 최신 유효값들 추출 (더미 데이터 생성 기준)
    const latestValidData = {
      target: null,
      base: null,
      current: null,
      predicted: null
    };

    // 역순으로 검색하여 각 항목의 최신 유효값 찾기
    for (let i = sortedData.length - 1; i >= 0; i--) {
      const data = sortedData[i];
      if (!data) continue;

      if (latestValidData.target === null && isValidValue(data.target)) {
        latestValidData.target = data.target;
      }
      if (latestValidData.base === null && isValidValue(data.base)) {
        latestValidData.base = data.base;
      }
      if (latestValidData.current === null && isValidValue(data.current)) {
        latestValidData.current = data.current;
      }
      if (latestValidData.predicted === null && isValidValue(data.predicted)) {
        latestValidData.predicted = data.predicted;
      }

      // 모든 값이 찾아지면 중단
      if (latestValidData.target !== null && latestValidData.base !== null &&
          latestValidData.current !== null && latestValidData.predicted !== null) {
        break;
      }
    }

    // 기본값 설정 (유효한 데이터가 하나도 없는 경우 대비)
    const defaultValues = {
      target: latestValidData.target || 0,
      base: latestValidData.base || 0,
      current: latestValidData.current || 0,
      predicted: latestValidData.predicted || 0
    };

    const filledData = [];
    let lastValidData = { ...latestValidData };

    // 0초부터 현재 수요시간까지 데이터 처리 (실제 데이터는 그대로, null인 부분만 채우기)
    for (let time = 0; time <= currentDemandTime; time++) {
      const existingData = sortedData.find(d => d && d.demandTime === time);

      if (existingData && isValidData(existingData)) {
        // 실제 데이터가 있는 경우: 그대로 사용하고 유효한 값들로 lastValidData 업데이트
        if (isValidValue(existingData.target)) {
          lastValidData.target = existingData.target;
        }
        if (isValidValue(existingData.base)) {
          lastValidData.base = existingData.base;
        }
        if (isValidValue(existingData.current)) {
          lastValidData.current = existingData.current;
        }
        if (isValidValue(existingData.predicted)) {
          lastValidData.predicted = existingData.predicted;
        }

        // 실제 데이터를 그대로 추가 (null 값이 있어도 그대로)
        filledData.push({
          demandTime: time,
          target: existingData.target,
          base: existingData.base,
          current: existingData.current,
          predicted: existingData.predicted
        });
      } else {
        // 실제 데이터가 없는 경우에만 더미 데이터 생성
        const timeProgress = time / Math.max(currentDemandTime, 1);
        const variation = Math.sin(time * 0.1) * 3;

        const safeTarget = lastValidData.target !== null ? lastValidData.target : defaultValues.target;
        const safeBase = lastValidData.base !== null ? lastValidData.base : defaultValues.base;
        const safeCurrent = lastValidData.current !== null ? lastValidData.current : defaultValues.current;
        const safePredicted = lastValidData.predicted !== null ? lastValidData.predicted : defaultValues.predicted;

        filledData.push({
          demandTime: time,
          target: safeTarget,
          base: Math.max(0, safeBase + variation),
          current: Math.max(0, safeCurrent * timeProgress + variation),
          predicted: Math.max(0, safePredicted + variation * 0.5)
        });
      }
    }

    // 최종 데이터 검증
    const validFilledData = filledData.filter(data =>
            isValidData(data) && (
                isValidValue(data.target) ||
                isValidValue(data.base) ||
                isValidValue(data.current) ||
                isValidValue(data.predicted)
            )
    );

    return validFilledData;
  }, [graphData, isChartRefreshing, previousGraphData]);

  // Y축 도메인 계산
  const yAxisDomain = useMemo(() => {
    if (!stableGraphData || stableGraphData.length === 0) {
      return [0, 1000]; // 기본값
    }
    const maxTarget = Math.max(...stableGraphData.map((d) => d.target || 0));
    const maxBase = Math.max(...stableGraphData.map((d) => d.base || 0));
    const maxCurrent = Math.max(...stableGraphData.map((d) => d.current || 0));
    const maxPredicted = Math.max(
        ...stableGraphData.map((d) => d.predicted || 0)
    );
    const overallMax = Math.max(maxTarget, maxBase, maxCurrent, maxPredicted);
    return [0, Math.ceil(overallMax * 1.2)];
  }, [stableGraphData]);

  // X축 도메인 계산 - 0분~15분 고정
  const xAxisDomain = useMemo(() => {
    return [0, 900]; // 0초~900초(15분) 고정
  }, []);

  // 차트 데이터가 준비되었는지 확인 (차트 표시 로직 제거)
  useEffect(() => {
    if (stableGraphData && stableGraphData.length > 0) {
      // 실제 데이터가 있는지 확인 (목표전력이나 기준전력이 유효한 값이 있는지 체크)
      const hasValidData = stableGraphData.some(item => 
        (item.target !== null && item.target !== 0) || 
        (item.base !== null && item.base !== 0)
      );
      
      setIsChartDataReady(hasValidData);
    } else {
      setIsChartDataReady(false);
    }
  }, [stableGraphData]); // isChartVisible 의존성 제거

  const isDark = useDarkMode();

  // 차트 컴포넌트 메모이제이션으로 깜빡임 방지
  const memoizedChart = useMemo(() => {
    // 차트가 보이지 않는 상태면 로딩 표시
    if (!isChartVisible) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>차트 데이터를 불러오는 중...</p>
          </div>
        </div>
      );
    }
    
    return (
        <ResponsiveContainer width="100%" height={300}>
          <ReLineChart
              data={stableGraphData}
              margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
              isAnimationActive={false}
              onClick={(data) => {
                if (isMobileDevice()) {
                  console.log("Chart clicked on mobile, toggling tooltip");
                  setTooltipActive(!tooltipActive);
                }
              }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#BDBDBD" : "#9E9E9E"} />
            <XAxis
                dataKey="demandTime"
                type="number"
                domain={xAxisDomain}
                interval={0}
                ticks={[
                  0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780,
                  840, 900,
                ]}
                height={40}
                tick={{ fontSize: 12, fill: isDark ? "#f9fafb" : "#374151", fontWeight: 400 }}
                tickFormatter={(value) => {
                  const adjustedValue = value;
                  const minutes = Math.floor(adjustedValue / 60);
                  const seconds = adjustedValue % 60;
                  if (seconds === 0) {
                    return `${minutes}분`;
                  } else {
                    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
                  }
                }}
                axisLine={{ stroke: isDark ? "#f9fafb" : "#374151" }}
                tickLine={true}
            />
            <YAxis
                domain={yAxisDomain}
                tickFormatter={(value) => {
                  const powerData = formatPower(value, organizationInfo?.w_unit);
                  return `${powerData.value}${powerData.unit}`;
                }}
                axisLine={{ stroke: isDark ? "#f9fafb" : "#374151" }}
                tickLine={true}
                tick={{ fontSize: 12, fill: isDark ? "#f9fafb" : "#374151", fontWeight: 400 }}
                width={60}
            />
            <Tooltip
                trigger={isMobileDevice() ? "click" : "hover"}
                cursor={isMobileDevice() ? false : true}
                isAnimationActive={false}
                active={isMobileDevice() ? tooltipActive : undefined}
                content={isMobileDevice() ?
                    (props) => (
                        <CustomTooltip
                            {...props}
                            formatter={(value, name) => {
                              if (value === null || value === undefined) return null;
                              if (
                                  name === "목표전력" ||
                                  name === "예측전력" ||
                                  name === "기준전력" ||
                                  name === "진행전력"
                              ) {
                                const powerData = formatPower(value, organizationInfo?.w_unit);
                                return [`${powerData.value} ${powerData.unit}`, name];
                              }
                              return [`${value} W`, name];
                            }}
                            labelFormatter={(value, payload) => {
                              if (payload && payload[0] && payload[0].payload) {
                                const demandTime = payload[0].payload.demandTime;
                                const minutes = Math.floor(demandTime / 60);
                                const seconds = demandTime % 60;
                                return `수요시간: ${minutes}분 ${seconds}초`;
                              }
                              return value;
                            }}
                            onClose={() => {
                              setTooltipActive(false);
                            }}
                        />
                    ) : (props) => {
                  if (!props.active || !props.payload || !props.payload.length) {
                    return null;
                  }
                  
                  // 목표전력, 예측전력, 기준전력, 진행전력 순으로 강제 정렬
                  const orderedNames = ["목표전력", "예측전력", "기준전력", "진행전력"];
                  const sortedPayload = [];
                  
                  // 지정된 순서대로 데이터 찾아서 추가
                  orderedNames.forEach(name => {
                    const entry = props.payload.find(item => item.name === name);
                    if (entry) {
                      sortedPayload.push(entry);
                    }
                  });
                  
                  // 나머지 항목들 추가 (혹시 다른 항목이 있다면)
                  props.payload.forEach(entry => {
                    if (!orderedNames.includes(entry.name)) {
                      sortedPayload.push(entry);
                    }
                  });
                  
                  return (
                    <div
                      style={{
                        background: isDark ? "#374151" : "white",
                        border: isDark ? "1px solid #4b5563" : "1px solid #e2e8f0",
                        borderRadius: 8,
                        color: isDark ? "#f9fafb" : "#374151",
                        fontSize: 14,
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        padding: "16px",
                        minWidth: "200px"
                      }}
                    >
                      <div style={{ color: isDark ? "#f9fafb" : "#374151", fontWeight: 600, marginBottom: "12px" }}>
                        {props.label && props.payload && props.payload[0] && props.payload[0].payload ? (() => {
                          const demandTime = props.payload[0].payload.demandTime;
                          const minutes = Math.floor(demandTime / 60);
                          const seconds = demandTime % 60;
                          return `수요시간: ${minutes}분 ${seconds}초`;
                        })() : `시간: ${props.label}`}
                      </div>
                      {sortedPayload.map((entry, index) => {
                        const value = entry.value;
                        const name = entry.name;
                        let displayValue;
                        
                        if (value === null || value === undefined) {
                          displayValue = null;
                        } else if (
                            name === "목표전력" ||
                            name === "예측전력" ||
                            name === "기준전력" ||
                            name === "진행전력"
                        ) {
                          const powerData = formatPower(value, organizationInfo?.w_unit);
                          displayValue = `${powerData.value} ${powerData.unit}`;
                        } else {
                          displayValue = `${value} W`;
                        }
                        
                        if (displayValue === null) return null;
                        
                        return (
                          <div key={index} style={{ color: entry.color, marginBottom: "4px" }}>
                            <span style={{ fontWeight: "bold" }}>{name}:</span> {displayValue}
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
            />
            {/* <Legend
          wrapperStyle={{ color: '#374151', fontSize: 14, fontWeight: 500, marginTop: 10 }}
          iconType="line"
          onClick={handleLegendClick}
        /> */}
            <Line
                type="monotone"
                dataKey="target"
                stroke="#2563eb"
                name="목표전력"
                dot={false}
                strokeWidth={2}
                connectNulls={true}
                hide={hiddenLines.target}
                isAnimationActive={false}
                animationDuration={0}
                animationBegin={0}
            />
            <Line
                type="monotone"
                dataKey="predicted"
                stroke="#9333ea"
                name="예측전력"
                dot={false}
                strokeWidth={2}
                connectNulls={true}
                hide={hiddenLines.predicted}
                isAnimationActive={false}
                animationDuration={0}
                animationBegin={0}
            />
            <Line
                type="linear"
                dataKey="base"
                stroke="#16a34a"
                name="기준전력"
                dot={false}
                strokeWidth={2}
                connectNulls={true}
                hide={hiddenLines.base}
                isAnimationActive={false}
                animationDuration={0}
                animationBegin={0}
            />
            <Line
                type="monotone"
                dataKey="current"
                stroke="#dc2626"
                name="진행전력"
                dot={false}
                strokeWidth={2}
                connectNulls={true}
                hide={hiddenLines.current}
                isAnimationActive={false}
                animationDuration={0}
                animationBegin={0}
            />
          </ReLineChart>
        </ResponsiveContainer>
    );
  }, [stableGraphData, yAxisDomain, xAxisDomain, hiddenLines, isChartRefreshing, tooltipActive, isDark, selectedStore, isChartVisible]);

  // metricsData는 오직 아래 useEffect에서만 갱신
  useEffect(() => {
    setMetricsData(deviceInfo);
    // console.log("deviceInfo", deviceInfo);
  }, [deviceInfo]);

  // PLC 시간 업데이트 - 실시간으로 업데이트
  useEffect(() => {
    if (deviceInfo && deviceInfo.plcTime) {
      setPlcTime(deviceInfo.plcTime);
    }
  }, [deviceInfo?.plcTime]); // plcTime만 의존성으로 설정하여 실시간 업데이트

  // 현재 시간 갱신
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const formattedTime = `${now.getFullYear()}년 ${String(
          now.getMonth() + 1
      ).padStart(2, "0")}월 ${String(now.getDate()).padStart(
          2,
          "0"
      )}일 ${String(now.getHours()).padStart(2, "0")}시 ${String(
          now.getMinutes()
      ).padStart(2, "0")}분 ${String(now.getSeconds()).padStart(2, "0")}초 (${
          days[now.getDay()]
      })`;
      setCurrentTime(formattedTime);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 컴포넌트 마운트 시 초기화 (실제 데이터 로딩은 별도 useEffect에서 처리)
  useEffect(() => {
    console.log('컴포넌트 마운트 - 초기 설정 완료');
  }, []); // 컴포넌트 마운트 시에만 실행

  // deviceInfo와 selectedStore가 모두 준비되고 웹소켓이 연결되었을 때 서버에서 데이터 로딩
  useEffect(() => {
    // 더 엄격한 조건: 웹소켓 연결 + 로딩 중이 아닐 때만 호출
    if (selectedStore?.id && isWebSocketConnected && !isGraphDataLoading) {
      const currentStoreId = selectedStore.id;
      const currentTargetPower = deviceInfo?.targetPower || 0;
      
      // 이미 같은 데이터로 로딩했으면 건너뛰기
      if (lastLoadedRef.current.storeId === currentStoreId && 
          lastLoadedRef.current.targetPower === currentTargetPower &&
          lastLoadedRef.current.storeId !== null) {
        console.log('동일한 데이터로 이미 로딩되어 있습니다.');
        // 기존 데이터가 있으면 즉시 차트 표시
        if (!isChartVisible) {
          setIsChartVisible(true);
          console.log('기존 로딩된 데이터로 차트 즉시 표시');
        }
        return;
      }
      
      // 웹소켓에서 유효한 demandTime을 받았는지 확인
      const hasValidDemandTime = deviceInfo?.demandTime !== undefined && 
                                deviceInfo?.demandTime !== null && 
                                deviceInfo?.demandTime >= 0;
      
      if (!hasValidDemandTime) {
        console.log('유효한 demandTime을 기다리는 중...', deviceInfo?.demandTime);
        return;
      }
      
      console.log('웹소켓 연결 + 유효한 demandTime 확인 - 서버에서 데이터 로딩 시작');
      
      // 지연 없이 즉시 실행 (웹소켓에서 이미 유효한 데이터를 받았으므로)
      const timeoutId = setTimeout(() => {
      
      console.log('deviceInfo와 selectedStore 준비 완료 - 서버에서 데이터 로딩:', {
        targetPower: currentTargetPower,
        storeId: currentStoreId
      });
      
      // 서버에서 데이터 로딩 시작
      const loadDataFromServer = async () => {
        if (isGraphDataLoading) {
          console.log('이미 로딩 중이므로 중복 실행을 방지합니다.');
          return;
        }

        setIsGraphDataLoading(true);
        try {
          console.log('서버에서 그래프 데이터 로딩 시작...');
          
          // 먼저 빈 차트로 초기화하여 이전 데이터 제거
          initializeGraphData(null);
          
          // 로컬 데이터 확인
          const loadedData = loadGraphData();
          
          if (!loadedData || loadedData.length === 0) {
            // 로컬 데이터가 없으면 서버에서 초기 데이터 가져오기
            console.log('로컬 데이터가 없어 서버에서 초기 데이터를 가져옵니다...');
            await retryApiCall(
              () => initializeGraphDataWithServer(deviceInfo.targetPower, 0, selectedStore.id),
              5, // 최대 5번 재시도
              5000, // 5초 타임아웃
              1000, // 1초 지연
              'initializeGraphDataWithServer'
            );
          } else {
            // 로컬 데이터가 있으면 null 값이 있는지 확인하고 서버에서 채우기
            const hasNullValues = loadedData.some(item => item.base === null || item.base === 0);
            
            if (hasNullValues) {
              console.log('그래프에 null 값이 있어 서버에서 이전 데이터를 채웁니다...');
              await retryApiCall(
                () => fillGraphDataFromServer(0, selectedStore.id),
                5, // 최대 5번 재시도
                5000, // 5초 타임아웃
                1000, // 1초 지연
                'fillGraphDataFromServer'
              );
            } else {
              console.log('로컬 데이터가 유효하여 서버 호출을 건너뜁니다.');
              // 유효한 로컬 데이터가 있어도 목표전력으로 초기화
              initializeGraphData(deviceInfo.targetPower);
            }
          }
          
          console.log('서버에서 그래프 데이터 로딩 완료');
          
          // 로딩 완료 후 ref 업데이트
          lastLoadedRef.current = {
            storeId: currentStoreId,
            targetPower: currentTargetPower
          };
          
          // 0.5초 지연 후 차트 표시 (지연시간 단축)
          setTimeout(() => {
            setIsChartVisible(true);
            console.log('0.5초 지연 후 차트 표시');
          }, 500);
        } catch (error) {
          console.error('서버 데이터 로딩 중 오류:', error);
          // 오류 발생 시 기본 데이터로 초기화
          initializeGraphData(deviceInfo.targetPower);
          
          // 오류 발생 시에도 0.5초 지연 후 차트 표시
          setTimeout(() => {
            setIsChartVisible(true);
            console.log('0.5초 지연 후 차트 표시 (오류 시)');
          }, 500);
        } finally {
          setIsGraphDataLoading(false);
        }
      };
      
        loadDataFromServer();
      }, 500); // 0.5초로 지연 단축 (웹소켓에서 이미 유효한 데이터 확인했으므로)
      
      // cleanup function
      return () => clearTimeout(timeoutId);
    }
  }, [selectedStore?.id, isWebSocketConnected, deviceInfo?.demandTime, deviceInfo?.targetPower, isGraphDataLoading]); // demandTime과 로딩 상태 추가

  // deviceInfo.targetPower가 변경될 때 그래프 데이터 업데이트 (제거 - 사업장 진입 시에만 초기화)
  // useEffect(() => {
  //   if (deviceInfo && deviceInfo.targetPower !== undefined) {
  //     const currentTargetPower = deviceInfo.targetPower;
  //     const previousTargetPower = previousTargetPowerRef.current;
      
  //     // 목표전력이 실제로 변경되었을 때만 그래프 데이터 업데이트
  //     if (previousTargetPower !== currentTargetPower) {
  //       console.log('목표전력이 변경되어 그래프 데이터를 업데이트합니다.', {
  //         previousTargetPower,
  //         currentTargetPower
  //       });
        
  //       // ref 업데이트
  //       previousTargetPowerRef.current = currentTargetPower;
        
  //       // 그래프 데이터 초기화
  //       stableInitializeGraphData(currentTargetPower);
  //     }
  //   }
  // }, [deviceInfo?.targetPower, stableInitializeGraphData]); // stableInitializeGraphData를 의존성에 포함

  // metricsData(deviceInfo)가 없을 때 기본값 처리
  const metrics = metricsData || {};

  // 차단그룹 개수: 초기 진입 시 deviceInfo가 비어 있어도 기본값으로 렌더되도록 보정
  const [controlGroupCount, setControlGroupCount] = useState(() => {
    const initial = Number(deviceInfo?.ctrlCnt);
    return !isNaN(initial) && initial > 0 && initial <= 16 ? initial : 16;
  });
  
  // WebSocket으로 ctrlCnt가 도착하면 동기화 (초기 진입 시 새로고침 없이도 표시되도록)
  useEffect(() => {
    const next = Number(deviceInfo?.ctrlCnt);
    if (!isNaN(next) && next > 0 && next <= 16 && next !== controlGroupCount) {
      setControlGroupCount(next);
    }
  }, [deviceInfo?.ctrlCnt]);
  const [controlGroupStates, setControlGroupStates] = useState({});

  const powerMetrics = [
    {
      title: "목표전력",
      value: formatPower(metrics.targetPower, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.targetPower, organizationInfo?.w_unit).unit,
      color: "blue",
      icon: Target,
      status: "normal",
    },
    {
      title: "예측전력",
      value: formatPower(metrics.predictedPower, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.predictedPower, organizationInfo?.w_unit).unit,
      color: "purple",
      icon: Zap,
      status: "normal",
    },
    {
      title: "기준전력",
      value: formatPower(metrics.basePower, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.basePower, organizationInfo?.w_unit).unit,
      color: "green",
      icon: BarChart3,
      status: "normal",
    },
    {
      title: "진행전력",
      value: formatPower(metrics.currentPower, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.currentPower, organizationInfo?.w_unit).unit,
      color: "red",
      icon: TrendingUp,
      status: "warning",
    },
    {
      title: "수요시간",
      value: isWebSocketConnected ? (metrics.demandTime ? (metrics.demandTime) : 0) : 0,
      unit: "초",
      color: "teal",
      icon: Clock,
      status: "normal",
    },
    {
      title: "현재부하량",
      value: formatPower(metrics.currentLoad, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.currentLoad, organizationInfo?.w_unit).unit,
      color: "gray",
      icon: Activity,
      status: "normal",
    },
    {
      title: "직전전력",
      value: formatPower(metrics.previousDemandPower, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.previousDemandPower, organizationInfo?.w_unit).unit,
      color: "orange",
      icon: Clock,
      status: "normal",
    },
    {
      title: "최대전력",
      value: formatPower(metrics.maxDemandPower, organizationInfo?.w_unit).value,
      unit: formatPower(metrics.maxDemandPower, organizationInfo?.w_unit).unit,
      color: "indigo",
      icon: TrendingUp,
      status: "normal",
    },
  ];

  // plcTime 포맷 함수
  function formatPlcTime(plcTime) {
    if (!plcTime) return "";
    try {
      const date = new Date(plcTime);
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn("유효하지 않은 PLC 시간 포맷:", plcTime);
        return "";
      }
      const days = ["일", "월", "화", "수", "목", "금", "토"];
      return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(
          2,
          "0"
      )}월 ${String(date.getDate()).padStart(2, "0")}일 ${String(
          date.getHours()
      ).padStart(2, "0")}시 ${String(date.getMinutes()).padStart(
          2,
          "0"
      )}분 ${String(date.getSeconds()).padStart(2, "0")}초 (${
          days[date.getDay()]
      })`;
    } catch (error) {
      console.error("PLC 시간 포맷 오류:", error, "원본 값:", plcTime);
      return "";
    }
  }

  const systemStatus = [
    {
      title: "EOI",
      error: metrics.eoiErrCnt,
      showErrorIcon: Number(metrics.eoiErrCnt) >= 1,
      blink: Number(metrics.eoiErrCnt) > 0,
    },
    {
      title: "WP",
      error: metrics.wpErrCnt,
      showErrorIcon: Number(metrics.wpErrCnt) >= 1,
      blink: Number(metrics.wpErrCnt) >= 1,
    },
    {
      title: "1차",
      error: metrics.alarmStatus,
      showErrorIcon: Number(metrics.alarmStatus) === 1,
      blink: Number(metrics.alarmStatus) === 1,
    },
    {
      title: "2차",
      error: metrics.alarmStatus,
      showErrorIcon: Number(metrics.alarmStatus) === 2,
      blink: Number(metrics.alarmStatus) === 2,
    },
    {
      title: "3차",
      error: metrics.alarmStatus,
      showErrorIcon: Number(metrics.alarmStatus) === 3,
      blink: Number(metrics.alarmStatus) === 3,
    },
  ];
  // 차단개수 핸들러
  const handleControlGroupCountChange = async (e) => {
    setControlGroupCount(Number(e.target.value));

    try {
      const result = await updateDeviceInfoAndWait(0, { ...deviceInfo, ctrlCnt: Number(e.target.value) }, "ctrlCnt", 10000);

      // API 응답 확인
      if (result && result.success === true) {
        // 웹소켓 대기가 완료된 후에 차단그룹 상태 업데이트
        toast.success("차단개수 변경에 성공했습니다.");
        console.log("차단개수 변경 성공:");
      } else {
        toast.error("차단개수 변경에 실패했습니다. 서버 응답을 확인해주세요.");
      }
    } catch (error) {
      console.error("차단개수 변경 오류:", error);
      toast.error(`차단개수 변경에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoadCutoffLoading(false);
    }
  };

  // 차단그룹 토글 핸들러 (운전모드에 따라 제한)
  const handleLoadCutoffToggle = async (label) => {
    // 권한 체크
    // if (!hasUserPermission()) {
    //   toast.error("차단그룹 설정을 수정할 권한이 없습니다.");
    //   return;
    // }

    // 운전모드가 자동일 때는 차단그룹 차단 불가
    // if (deviceInfo.operationMode === "1") {
    //   toast.error("자동 모드에서는 차단그룹을 차단할 수 없습니다.");
    //   return;
    // }

    // 현재 manualCtrl 값을 이진수로 변환
    const currentmanualCtrl = parseInt(metrics.manualCtrl || 0, 10);
    const binaryString = currentmanualCtrl.toString(2).padStart(16, "0");

    // 클릭된 차단그룹의 인덱스 찾기
    const groupIndex = parseInt(label.replace("G-", ""), 10) - 1;
    const bitIndex = 15 - groupIndex; // 비트 순서는 G-16이 최하위비트

    // 해당 비트 토글
    const newBinaryString = binaryString.split("");
    newBinaryString[bitIndex] = newBinaryString[bitIndex] === "0" ? "1" : "0";

    // 새로운 manualCtrl 값 계산
    const newmanualCtrl = parseInt(newBinaryString.join(""), 2);

    try {
      setIsLoadCutoffLoading(true);

      // 웹소켓 대기 기능을 사용하여 업데이트
      const result = await updateDeviceInfoAndWait(
          0,
          { ...deviceInfo, manualCtrl: newmanualCtrl.toString() },
          "manualCtrl",
          10000
      );

      // API 응답 확인
      if (result && result.success === true) {
        // 웹소켓 대기가 완료된 후에 차단그룹 상태 업데이트
        toggleLoadCutoff(label);
        toast.success("차단그룹 변경에 성공했습니다.");
        console.log("차단그룹 변경 성공:");
      } else {
        toast.error("차단그룹 변경에 실패했습니다. 서버 응답을 확인해주세요.");
      }
    } catch (error) {
      console.error("차단그룹 변경 오류:", error);
      toast.error(`차단그룹 변경에 실패했습니다: ${error.message}`);
    } finally {
      setIsLoadCutoffLoading(false);
    }
  };

  // 운전모드 변경 핸들러
  const handleOperationModeChange = async (mode) => {
    // 권한 체크
    // if (!hasUserPermission()) {
    //   toast.error("운전모드를 변경할 권한이 없습니다.");
    //   return;
    // }

    try {
      setIsOperationModeLoading(true);

      // 웹소켓 대기 기능을 사용하여 업데이트
      const result = await updateDeviceInfoAndWait(
          0,
          { ...deviceInfo, operationMode: mode },
          "operationMode",
          10000
      );

      // API가 성공적으로 응답한 경우에만 아래 코드 실행
      if (result.success === true) {
        toast.success("운전모드 변경에 성공했습니다.");
        setOperationMode(mode);
      } else {
        toast.error("운전모드 변경에 실패했습니다.");
      }
    } catch (e) {
      console.error("운전모드 변경 오류:", e);
      toast.error(`운전모드 변경에 실패했습니다: ${e.message}`);
    } finally {
      setIsOperationModeLoading(false);
    }
  };

  // 제어방법 변경 핸들러
  const handleControlModeChange = async (mode) => {
    // 권한 체크
    // if (!hasUserPermission()) {
    //   safeToast.error("제어방법을 변경할 권한이 없습니다.");
    //   return;
    // }

    // 운전모드가 수동일 때는 제어방법 변경 불가
    if (deviceInfo.operationMode === "2") {
      toast.error("수동 모드에서는 제어방법을 변경할 수 없습니다.");
      return;
    }

    try {
      setIsControlModeLoading(true);
      // 웹소켓 대기 기능을 사용하여 업데이트 (로딩 메시지 포함)
      const { updateDeviceInfoAndWaitWithMessage } = await import(
          "@/lib/utils"
          );
      const result = await updateDeviceInfoAndWaitWithMessage(
          0,
          { ...deviceInfo, ctrlMode: mode },
          "ctrlMode",
          10000
      );

      // API가 성공적으로 응답한 경우에만 아래 코드 실행
      if (result.success === true) {
        // 웹소켓 대기가 완료된 후에만 로컬 상태 업데이트
        // setDeviceInfo({ ...deviceInfo, ctrlMode: mode }); // 이 줄 제거
        // console.log("** deviceInfo 제어방법 : ", deviceInfo.ctrlMode+" "+mode);
        toast.success("제어방법 변경에 성공했습니다.");
        setCtrlModes(mode);
      } else {
        toast.error("제어방법 변경에 실패했습니다.");
      }
    } catch (e) {
      console.error("제어방법 변경 오류:", e);
      toast.error(`제어방법 변경에 실패했습니다: ${e.message}`);
    } finally {
      setIsControlModeLoading(false);
    }
  };

  // 운전모드가 수동인지 확인
  const isManualMode = deviceInfo.operationMode === "2";

  const controlGroups = Array.from({ length: controlGroupCount }, (_, i) => ({
    id: `G-${String(i + 1).padStart(2, "0")}`,
    status:
        controlGroupStates[`G-${String(i + 1).padStart(2, "0")}`] || "inactive",
  }));

  const handleControlGroupClick = (groupId) => {
    setControlGroupStates((prev) => ({
      ...prev,
      [groupId]: prev[groupId] === "active" ? "inactive" : "active",
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "정상":
        return "bg-green-100 text-green-800 border-green-200";
      case "주의":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "오류":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // LG ACP 모달 핸들러
  const handleLgAcpModalOpen = () => {
    setIsLgAcpModalOpen(true);
  };

  const handleLgAcpModalClose = () => {
    setIsLgAcpModalOpen(false);
  };

  // ACP차단설정 모달 핸들러
  const handleAcpBlockModalOpen = () => {
    setIsAcpBlockModalOpen(true);
  };

  const handleAcpBlockModalClose = () => {
    setIsAcpBlockModalOpen(false);
  };

  return (
      <div className="space-y-6 p-5 max-w-[80rem] m-auto">
        {/* 연결 해제 모달은 전역 ConnectionStatusHandler에서 처리됨 */}
        {isSettingLoading && <FullScreenLoading message={loadingMessage} />}
        {/* 상단 시스템 상태 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl py-4 dark:border-slate-700 dark:border-1">
          <CardHeader className="sm-px-6 px-4">
            <div className="flex items-center justify-between sm:flex-row flex-col sm:gap-0 gap-4">
              <div className="flex items-center gap-4 order-2 sm:order-1">
                {systemStatus.map((item, index) => (
                    <div
                        key={index}
                        className="text-center flex flex-col items-center justify-center"
                    >
                      <div className="text-base text-black mb-2 py-1 px-2 dark:text-white">
                        {item.title}
                      </div>
                      <Badge
                          // variant={status.status === "error" ? "destructive" : "secondary"}
                          className="text-base px-0 py-0 bg-[#1B2A49] dark:bg-slate-500 text-white rounded-4xl min-w-[35px] min-h-[35px] sm:min-w-[46px] sm:min-h-[46px] w-auto h-auto"
                      >
                        {/* {status.value} */}
                        {item.title === "EOI" &&
                            item.showErrorIcon &&
                            Number(metrics.eoiErrCnt) >= 1 && (
                                <AlertTriangle
                                    color="#FEFD48"
                                    strokeWidth={3}
                                    className={`!w-[20px] !h-[20px] sm:!w-[28px] sm:!h-[28px] text-[#FEFD48]`}
                                    style={{
                                      animation: item.blink
                                          ? "blink-fast 0.5s ease-in-out infinite"
                                          : "none",
                                    }}
                                />
                            )}
                        {item.title === "WP" &&
                            item.showErrorIcon &&
                            Number(metrics.wpErrCnt) >= 1 && (
                                <AlertTriangle
                                    color="#FEFD48"
                                    strokeWidth={3}
                                    className={`!w-[20px] !h-[20px] sm:!w-[28px] sm:!h-[28px] text-[#FEFD48]`}
                                    style={{
                                      animation: item.blink
                                          ? "blink-fast 0.5s ease-in-out infinite"
                                          : "none",
                                    }}
                                />
                            )}
                        {item.title === "1차" &&
                            item.showErrorIcon &&
                            Number(metrics.alarmStatus) === 1 && (
                                <AlertTriangle
                                    color="#FEFD48"
                                    strokeWidth={3}
                                    className={`!w-[20px] !h-[20px] sm:!w-[28px] sm:!h-[28px] text-[#FEFD48]`}
                                    style={{
                                      animation: item.blink
                                          ? "blink-fast 0.5s ease-in-out infinite"
                                          : "none",
                                    }}
                                />
                            )}
                        {item.title === "2차" &&
                            item.showErrorIcon &&
                            Number(metrics.alarmStatus) === 2 && (
                                <AlertTriangle
                                    color="#FEFD48"
                                    strokeWidth={3}
                                    className={`!w-[20px] !h-[20px] sm:!w-[28px] sm:!h-[28px] text-[#FEFD48]`}
                                    style={{
                                      animation: item.blink
                                          ? "blink-fast 0.5s ease-in-out infinite"
                                          : "none",
                                    }}
                                />
                            )}
                        {item.title === "3차" &&
                            item.showErrorIcon &&
                            Number(metrics.alarmStatus) === 3 && (
                                <AlertTriangle
                                    color="#FEFD48"
                                    strokeWidth={3}
                                    className={`!w-[20px] !h-[20px] sm:!w-[28px] sm:!h-[28px] text-[#FEFD48]`}
                                    style={{
                                      animation: item.blink
                                          ? "blink-fast 0.5s ease-in-out infinite"
                                          : "none",
                                    }}
                                />
                            )}
                        {/*{item.error}*/}
                      </Badge>
                    </div>
                ))}
              </div>
              <div className="text-left sm:text-right order-1 sm:order-2 flex flex-col gap-2">
                {/*<div className="text-xs sm:text-[15px] text-gray-800 flex justify-center items-center">*/}
                {/*  <Clock className={`w-4 h-4 mr-1 text-gray-800`} />*/}
                {/*  {currentTime}*/}
                {/*</div>*/}
                <div className="text-sm sm:text-base text-gray-800">
                  {/*⏰ 2025년 07월 03일 12시 30분 16초 (목)*/}
                  <span
                      className={`flex justify-center items-center dark:text-white ${
                          isSettingLoading ? "opacity-50" : ""
                      }`}
                  >
                  <Clock className={`w-4 h-4 mr-1 text-gray-800 dark:text-white`} />
                    {plcTime ? formatPlcTime(plcTime) : ""}
                </span>
                  {isSettingLoading && (
                      <span className="ml-2 text-xs text-blue-500 animate-pulse">
                    {loadingMessage}
                  </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 실시간 전력 차트 */}
        <Card className="border-0 shadow-sm bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl dark:border-slate-700 dark:border-1">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                실시간 전력 추이
              </CardTitle>
              <Button
                  onClick={async () => {
                    // 현재 데이터를 이전 데이터로 저장
                    if (graphData && graphData.length > 0) {
                      setPreviousGraphData([...graphData]);
                    }

                    setIsChartRefreshing(true);
                    try {
                      // 차트 데이터 새로고침
                      if (typeof fillGraphDataFromServer === 'function') {
                        await retryApiCall(
                          () => fillGraphDataFromServer(0, selectedStore?.id),
                          5, // 최대 5번 재시도
                          5000, // 5초 타임아웃
                          1000, // 1초 지연
                          'fillGraphDataFromServer (새로고침)'
                        );
                      } else if (typeof loadGraphData === 'function') {
                        await retryApiCall(
                          () => loadGraphData(),
                          5, // 최대 5번 재시도
                          5000, // 5초 타임아웃
                          1000, // 1초 지연
                          'loadGraphData (새로고침)'
                        );
                      }

                      // 새 데이터가 성공적으로 로드되면 이전 데이터 정리
                      setTimeout(() => {
                        setPreviousGraphData([]);
                      }, 1000); // 1초 후 이전 데이터 정리
                    } catch (error) {
                      console.error('차트 데이터 새로고침 오류:', error);
                      toast.error('차트 데이터 새로고침에 실패했습니다.');
                    } finally {
                      setIsChartRefreshing(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isChartRefreshing}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 dark:bg-green-600 dark:hover:bg-green-700 dark:border-green-500 dark:text-white"
              >
                {isChartRefreshing ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin dark:border-white"></div>
                        <span>새로고침 중...</span>
                      </div>
                      {retryStatus.isRetrying && (
                        <span className="text-xs text-orange-600 dark:text-orange-300">
                          재시도 ({retryStatus.attempt}/{retryStatus.maxAttempts})
                        </span>
                      )}
                    </div>
                ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      새로고침
                    </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pr-4 pl-0 sm:px-6 h-auto">
            {/* 커스텀 Legend */}
            <div className="h-80 overflow-x-auto overflow-y-hidden">
              <div className="flex flex-wrap gap-6 mb-4 justify-center pl-4 sm:p-0 min-w-[470px]">
                {[
                  { key: "target", name: "목표전력", color: "#3b82f6" },
                  { key: "predicted", name: "예측전력", color: "#8b5cf6" },
                  { key: "base", name: "기준전력", color: "#10b981" },
                  { key: "current", name: "진행전력", color: "#ef4444" },
                ].map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => handleLegendClick({ dataKey: item.key })}
                    >
                      <div
                          className="w-4 h-0.5"
                          style={{
                            backgroundColor: hiddenLines[item.key]
                                ? "#ccc"
                                : item.color,
                          }}
                      />
                      <span
                          className="text-base font-medium dark:!text-white"
                          style={{
                            color: "#000",
                            textDecoration: hiddenLines[item.key]
                                ? "line-through"
                                : "none",
                          }}
                      >
                  {item.name}
                </span>
                    </div>
                ))}
              </div>
              {/* 로딩 중일 때 로딩 화면 표시 */}
              {(isChartRefreshing || isSettingLoading || isGraphDataLoading || !isWebSocketConnected) ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <div className="text-lg font-medium text-slate-600 dark:text-white">
                      {!isWebSocketConnected ? "웹소켓 연결 중..." : 
                       isChartRefreshing ? "차트 데이터 로딩 중..." : 
                       loadingMessage || "데이터 로딩 중..."}
                    </div>
                    {/* {retryStatus.isRetrying && (
                      <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                        {retryStatus.functionName} 재시도 중... ({retryStatus.attempt}/{retryStatus.maxAttempts})
                      </div>
                    )} */}
                  </div>
              ) : (
                  // <div className="h-80 overflow-x-auto">
                  <div className="min-w-[800px] w-full max-w-[1200px] h-[300px]">
                    {isChartDataReady ? (
                      memoizedChart
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <div className="text-lg font-medium text-slate-600 dark:text-white">
                          차트 데이터를 불러오는 중...
                        </div>
                      </div>
                    )}
                  </div>
                  // </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="w-full py-4">
          {/* 전력 수치 카드들 - 개선된 4x2 배열 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {powerMetrics.map((metric, index) => {
              const Icon = metric.icon;
              const colorClasses = {
                blue: "bg-white/70 border-1 shadow-sm text-blue-700 dark:text-blue-400",
                green: "bg-white/70 border-1 shadow-sm text-green-600 dark:text-green-400",
                red: "bg-white/70 border-1 shadow-sm text-red-600 dark:text-red-400",
                gray: "bg-white/70 border-1 shadow-sm text-yellow-700 dark:text-yellow-400",
                purple: "bg-white/70 border-1 shadow-sm text-purple-700 dark:text-purple-400",
                orange: "bg-white/70 border-1 shadow-sm text-orange-600 dark:text-orange-400",
                teal: "bg-white/70 border-1 shadow-sm text-teal-700 dark:text-teal-400",
              };

              return (
                  <Card
                      key={index}
                      className={`border-2 rounded-2xl ${
                          colorClasses[metric.color]
                      } min-h-[120px] md:min-h-[140px] transition-all hover:shadow-md`}
                  >
                    <CardContent className="h-full flex flex-col justify-between">
                      <div className="flex items-start justify-between mb-3">
                    <span className="text-base sm:text-xl md:text-2xl font-semibold leading-tight">
                      {metric.title}
                    </span>
                        <Icon className="h-5 w-5 md:h-6 md:w-6 flex-shrink-0 ml-2" />
                      </div>
                      <div className="flex justify-end items-center gap-2">
                        <div className="text-2xl md:text-3xl lg:text-4xl font-bold leading-none mb-1">
                          {metric.value}
                        </div>
                        <div className="text-xl md:text-2xl opacity-80 font-medium">
                          {metric.unit}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
              );
            })}
          </div>
        </div>

        {/* 차단그룹 - 반응형 개선 */}
        <Card className="border-0 shadow-sm bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl dark:border-slate-700 dark:border-1">
          <CardHeader>
            <div className="flex sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg text-gray-900 dark:text-white">
                차단그룹
                {isLoadCutoffLoading && (
                    <span className="ml-2 text-xs text-blue-500 animate-pulse">
                  변경 중...
                </span>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-ms text-gray-500 dark:text-white">개수:</span>
                <select
                    value={controlGroupCount}
                    onChange={handleControlGroupCountChange}
                    className="text-sm px-2 py-1 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-black"
                    disabled={!isControlAble}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
                className={`grid gap-2 sm:gap-3 ${
                    controlGroupCount <= 8
                        ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8"
                        : controlGroupCount <= 12
                            ? "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12"
                            : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-16"
                }`}
            >
              {controlGroups.map((group) => (
                  <Button
                      key={group.id}
                      variant={group.status === "active" ? "default" : "outline"}
                      className={`h-10 sm:h-12 text-sm sm:text-base ${
                          loadCutoffStates[group.id]
                              ? "bg-red-500 dark:bg-green-600  dark:text-white hover:bg-red-700 text-white hover:text-white"
                              : ""
                      } ${
                          operationMode === "1" ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      onClick={() =>
                          operationMode !== "1" && handleLoadCutoffToggle(group.id)
                      }
                      disabled={operationMode === "1" || isLoadCutoffLoading || !isControlAble}
                  >
                    {isLoadCutoffLoading ? (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>{group.id}</span>
                        </div>
                    ) : (
                        group.id
                    )}
                  </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 제어 설정 - 반응형 개선 */}
        <Card className="border-0 shadow-sm bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl dark:border-slate-700 dark:border-1">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">제어 설정</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <label className="text-base font-medium text-gray-700 dark:text-white mb-3 block">
                  운전모드
                  {isOperationModeLoading && (
                      <span className="ml-2 text-xs text-blue-500 animate-pulse">
                    변경 중...
                  </span>
                  )}
                </label>
                <div className="flex gap-2 h-[calc(100%-36px)]">
                  <Button
                      variant={
                        deviceInfo.operationMode === "1" ? "default" : "outline"
                      }
                      size="base"
                      className="flex-1 h-14 text-base dark:text-white"
                      onClick={() => handleOperationModeChange("1")}
                      disabled={isOperationModeLoading || !isControlAble}
                  >
                    {isOperationModeLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>자동</span>
                        </div>
                    ) : (
                        "자동"
                    )}
                  </Button>
                  <Button
                      variant={
                        deviceInfo.operationMode === "2" ? "default" : "outline"
                      }
                      size="base"
                      className="flex-1 h-14 text-base dark:text-white"
                      onClick={() => handleOperationModeChange("2")}
                      disabled={isOperationModeLoading || !isControlAble}
                  >
                    {isOperationModeLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>수동</span>
                        </div>
                    ) : (
                        "수동"
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <label className="text-base font-medium text-gray-700 dark:text-white mb-3 block">
                  제어방법
                  {isControlModeLoading && (
                      <span className="ml-2 text-xs text-blue-500 animate-pulse">
                    변경 중...
                  </span>
                  )}
                </label>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                      variant={deviceInfo.ctrlMode === "1" ? "default" : "outline"}
                      size="base"
                      className={`flex-1 h-14 text-base dark:text-white ${
                          deviceInfo.operationMode === "2"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                      }`}
                      onClick={() =>
                          deviceInfo.operationMode !== "2" &&
                          handleControlModeChange("1")
                      }
                      disabled={
                          deviceInfo.operationMode === "2" || isControlModeLoading || !isControlAble
                      }
                  >
                    {isControlModeLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>우선</span>
                        </div>
                    ) : (
                        "우선"
                    )}
                  </Button>
                  <Button
                      variant={deviceInfo.ctrlMode === "2" ? "default" : "outline"}
                      size="base"
                      className={`flex-1 h-14 text-base dark:text-white ${
                          deviceInfo.operationMode === "2"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                      }`}
                      onClick={() =>
                          deviceInfo.operationMode !== "2" &&
                          handleControlModeChange("2")
                      }
                      disabled={
                          deviceInfo.operationMode === "2" || isControlModeLoading || !isControlAble
                      }
                  >
                    {isControlModeLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>순차</span>
                        </div>
                    ) : (
                        "순차"
                    )}
                  </Button>
                  <Button
                      variant={deviceInfo.ctrlMode === "3" ? "default" : "outline"}
                      size="base"
                      className={`flex-1 h-14 text-base dark:text-white ${
                          deviceInfo.operationMode === "2"
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                      }`}
                      onClick={() =>
                          deviceInfo.operationMode !== "2" &&
                          handleControlModeChange("3")
                      }
                      disabled={
                          deviceInfo.operationMode === "2" || isControlModeLoading || !isControlAble
                      }
                  >
                    {isControlModeLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          <span>스마트</span>
                        </div>
                    ) : (
                        "스마트"
                    )}
                  </Button>
                </div>
              </div>

              {/*<div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">*/}
              {/*  <label className="text-base font-medium text-gray-700 dark:text-white mb-3 block">*/}
              {/*    피크제어기준*/}
              {/*  </label>*/}
              {/*  <div className="text-center py-2">*/}
              {/*  <span className="text-red-600 font-medium text-lg">*/}
              {/*    {deviceInfo.ctrlMode === "1" && "우선제어"}*/}
              {/*    {deviceInfo.ctrlMode === "2" && "순차제어"}*/}
              {/*    {deviceInfo.ctrlMode === "3" && "스마트제어"}*/}
              {/*  </span>*/}
              {/*  </div>*/}
              {/*</div>*/}


              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex flex-row justify-between items-center mb-3">
                  <label className="flex flex-row gap-3 text-base font-medium text-gray-700 dark:text-white">
                    <span>ACP</span>
                    <span>1</span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 dark:bg-green-600 dark:hover:bg-green-700 dark:border-green-500 dark:text-white h-8 px-3 text-xs"
                      onClick={handleLgAcpModalOpen}
                    >
                      LGACP설정
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 dark:bg-green-600 dark:hover:bg-green-700 dark:border-green-500 dark:text-white h-8 px-3 text-xs"
                      onClick={handleAcpBlockModalOpen}
                    >
                      ACP차단설정
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col text-center gap-2">
                  <div className="flex flex-row gap-3">
                    <span>모드</span>
                    <span>:</span>
                    <span>통신안됨</span>
                  </div>
                  <div className="grid grid-cols-2 text-center">
                    <div className="flex flex-row gap-3">
                      <span>현재</span>
                      <span>:</span>
                      <span>- %</span>
                    </div>
                    <div className="flex flex-row gap-3">
                      <span>희망</span>
                      <span>:</span>
                      <span>- %</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* LG ACP 설정 모달 */}
        <LgAcpModal 
          isOpen={isLgAcpModalOpen} 
          onClose={handleLgAcpModalClose} 
        />

        {/* ACP차단설정 모달 */}
        <AcpBlockModal 
          isOpen={isAcpBlockModalOpen} 
          onClose={handleAcpBlockModalClose} 
        />
      </div>
  );
}
