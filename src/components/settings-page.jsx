import {useEffect, useState} from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Settings, Wifi, Target, Zap } from "lucide-react"
import useSettingsStore from "@/store/settingsStore.js";
import { toast } from "sonner"
import { updateDeviceInfoAndWaitWithMessage, updatePriorityNumbersAndWait, updateDeviceInfoAndWait, updateTimeSync } from "@/lib/utils.js";
import WebSocketStatusIndicator from "@/components/WebSocketStatusIndicator";
import { syncPlcData, updateDeviceInfo, resetReportData } from "@/api/device_dynamic.js";
import { resetReportData as resetReportDataCloud } from "@/api/device_local.js";
import React from "react"; // Added missing import for React
import {
  getTargetPowerSetting,
  saveTargetPowerSetting,
  getTargetPowerLabels,
  saveTargetPowerLabels,
  getTargetPowerByHours,
  saveTargetPowerByHours
} from "@/api/schedule_dynamic.js"
import { isGroupEditModeGlobal, setGroupEditMode } from "@/lib/globalState.js";
import { useAuth } from "@/router/router"
import { useReportData } from "@/hooks/useReportApi";
import useOrganizationStore from "@/store/organizationStore";

// 전체 화면 로딩 컴포넌트
const FullScreenLoading = ({ message = "저장 중..." }) => (
  <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-8 flex flex-col items-center space-y-4 backdrop-blur-sm rounded-2xl border-0 shadow-sm">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <p className="text-lg font-medium text-gray-700">{message}</p>
    </div>
  </div>
);

export default function SettingsPage() {
  const {
    deviceInfo, setDeviceInfo,
    metricValues, setMetricValues,
    priorityLevel, setPriorityLevel,
    priorityNumbers, setPriorityNumbers,
    isSaveProtected, setIsSaveProtected,
    isSettingLoading, loadingMessage
  } = useSettingsStore();

  const { selectedOrganization } = useOrganizationStore();


  // 목표전력설정 로딩 상태
  const [isTargetPowerLoading, setIsTargetPowerLoading] = useState(false);
  const [isTargetPowerSaving, setIsTargetPowerSaving] = useState(false);

  // 목표전력설정 수정 모드 상태
  const [isTargetPowerEditMode, setIsTargetPowerEditMode] = useState(false);

  // 목표전력설정 임시 상태 (수정 모드에서 사용)
  const [tempTargetPowerSettings, setTempTargetPowerSettings] = useState({
    targetPowerLevels: [],
    seasonalTargetPower: {}
  });

  // 전력/간격설정 수정중 상태 추가 - 제거 (updateDeviceInfoAndWait 사용으로 불필요)
  // const [isPowerSettingUpdating, setIsPowerSettingUpdating] = useState(false);
  // const [expectedTargetPower, setExpectedTargetPower] = useState(null);
  // const [powerUpdateTimeout, setPowerUpdateTimeout] = useState(null);
  // const [expectedValues, setExpectedValues] = useState({});

  // 그룹설정 수정중 상태 추가 - 제거 (updatePriorityNumbersAndWait 사용으로 불필요)
  // const [isGroupSettingUpdating, setIsGroupSettingUpdating] = useState(false);
  // const [expectedPriorityNumbers, setExpectedPriorityNumbers] = useState(null);
  // const [groupUpdateTimeout, setGroupUpdateTimeout] = useState(null);

  const [isControlAble, setIsControlAble] = useState(false);
  const { userRole, user, userId: authUserId } = useAuth();
  // 인증 컨텍스트에서 사용자 정보 가져오기
  
  // 고객 ID (실제로는 인증 컨텍스트에서 가져와야 함)
  const customerId = 1;

  // 보고서 캐시 무효화를 위해 훅에서 유틸리티 함수 사용
  const { invalidateAllQueries: invalidateDailyQueries } = useReportData('daily');
  const { invalidateAllQueries: invalidateMonthlyQueries } = useReportData('monthly');
  const { invalidateAllQueries: invalidateYearlyQueries } = useReportData('yearly');
  
  // 디버깅용 로그
  // console.log('SettingsPage - user:', user);
  // console.log('SettingsPage - authUserId:', authUserId);
  // console.log('SettingsPage - customerId:', customerId);

  // 권한 체크 함수들
  const isAdmin = userRole === "admin";
  const isAdminOwner = userRole === "admin_owner"; // 중간관리자
  const isAdminEngineer = userRole === "admin_engineer"; // 설정관리자
  const canEditPowerSettings = isControlAble; // 기본 전력 설정 권한
  const canEditAdvancedSettings = isControlAble && (isAdmin || isAdminOwner || isAdminEngineer); // 고급 설정 권한 (중간관리자, 설정관리자도 가능)
  const canEditFunctionSettings = isControlAble && (isAdmin || isAdminOwner || isAdminEngineer); // 기능 설정 권한 (중간관리자, 설정관리자도 가능)

  useEffect(() => {
    // 모니터링 관리자(admin_user)와 한전(han)은 일반 사용자(user)와 동일한 권한 (읽기만)
    if (userRole === "user" || userRole === "admin_user" || userRole === "han") {
      setIsControlAble(false);
    } else {
      // 나머지 역할들(admin, admin_owner, admin_engineer, owner, engineer)은 설정 변경 가능
      setIsControlAble(true); 
    }
  }, [userRole]);
  

  // 목표전력설정 데이터 로딩 함수
  const loadTargetPowerSettings = async () => {
    try {
      setIsTargetPowerLoading(true);
      
      // 전체 목표전력설정 조회
      const targetPowerData = await getTargetPowerSetting(customerId);
      const data = targetPowerData.data || targetPowerData;
      
      console.log('목표전력설정 API 응답:', targetPowerData);
      console.log('처리된 데이터:', data);
      
      if (data && data.targetPowerLabels && data.targetPowerLabels.length > 0) {
        // 라벨 값들 설정
        const newTargetPowerLevels = Array.from({ length: 10 }, (_, i) => ({
          level: i + 1,
          value: "300", // 기본값
        }));
        
        data.targetPowerLabels.forEach(item => {
          if (item.labelNo >= 1 && item.labelNo <= 10) {
            newTargetPowerLevels[item.labelNo - 1].value = item.targetKw ? item.targetKw.toString() : "300";
          }
        });
        setTargetPowerLevels(newTargetPowerLevels);
      }
      
      if (data && data.targetPowerByHours && data.targetPowerByHours.length > 0) {
        // 계절별 시간대 값들 설정
        const seasonMap = {
          'SPRING': '봄',
          'SUMMER': '여름',
          'AUTUMN': '가을',
          'WINTER': '겨울'
        };
        
        const newSeasonalValues = {
          봄: Array(24).fill("4"),
          여름: Array(24).fill("4"),
          가을: Array(24).fill("4"),
          겨울: Array(24).fill("4"),
        };
        
        data.targetPowerByHours.forEach(item => {
          const season = seasonMap[item.season];
          if (season && item.hour >= 0 && item.hour <= 23) {
            newSeasonalValues[season][item.hour] = item.labelNo ? item.labelNo.toString() : "4";
          }
        });
        
        setSeasonalTargetPower(prev => ({
          ...prev,
          hourlySettings: newSeasonalValues[prev.현재계절].map((value, hour) => ({
            hour,
            value
          }))
        }));
      }
      
    } catch (error) {
      console.error('목표전력설정 데이터 로딩 실패:', error);
      
      // API가 아직 구현되지 않았거나 네트워크 오류인 경우 임시 저장된 데이터 확인
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        console.log('API가 아직 구현되지 않았거나 네트워크 오류입니다. 임시 저장된 데이터를 확인합니다.');
        
        // 로컬 스토리지에서 임시 저장된 데이터 확인
        const tempData = localStorage.getItem(`targetPowerSetting_${customerId}`);
        if (tempData) {
          try {
            const parsedData = JSON.parse(tempData);
            if (parsedData.targetPowerLevels) {
              setTargetPowerLevels(parsedData.targetPowerLevels);
            }
            if (parsedData.seasonalTargetPower) {
              setSeasonalTargetPower(parsedData.seasonalTargetPower);
            }
            console.log('임시 저장된 데이터를 불러왔습니다:', parsedData);
          } catch (parseError) {
            console.error('임시 저장된 데이터 파싱 실패:', parseError);
          }
        }
      } else {
        toast.error('목표전력설정 데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setIsTargetPowerLoading(false);
    }
  };

  // 수정 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGroupEditMode, setIsGroupEditMode] = useState(false);
  const [isGroupSaving, setIsGroupSaving] = useState(false); // 그룹설정 저장 중 상태 추가
  const [isPowerSaving, setIsPowerSaving] = useState(false); // 전력/간격설정 저장 중 상태 추가

  // 임시 설정 상태 (수정 모드에서 사용)
  const [tempSettings, setTempSettings] = useState({});
  const [tempGroupSettings, setTempGroupSettings] = useState([]);

  // 수정 모드 시작 (전력/간격설정용)
  const handleStartEdit = () => {
    setTempSettings({
      목표전력: basicSettings.목표전력,
      PCT비율: basicSettings.PCT비율,
      펄스정수: basicSettings.펄스정수,
      최초제어시간: basicSettings.최초제어시간,
      차단간격: basicSettings.차단간격,
      복귀간격: basicSettings.복귀간격,
      자동운전복귀간격: basicSettings.자동운전복귀간격,
    });
    setIsEditMode(true);
  };

  // 수정 모드 취소 (전력/간격설정용)
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setTempSettings({});
  };

  // 그룹설정 수정 모드 시작
  const handleStartGroupEdit = () => {
    setTempGroupSettings([...groupSettings]);
    setGroupEditMode(true);
    setIsGroupEditMode(true); // UI 업데이트를 위해 로컬 상태도 유지
  };

  // 그룹설정 수정 모드 취소
  const handleCancelGroupEdit = () => {
    setGroupEditMode(false);
    setIsGroupEditMode(false);
    setTempGroupSettings([]);
  };

  // 그룹설정 저장
  const handleSaveGroupSettings = async () => {
    try {
      setIsGroupSaving(true); // 저장 중 상태 시작
      
      // 변경된 그룹 설정이 있는지 확인
      const hasChanges = tempGroupSettings.some((temp, index) => 
        temp.value !== groupSettings[index].value
      );

      if (!hasChanges) {
        setGroupEditMode(false);
        setIsGroupEditMode(false);
        setTempGroupSettings([]);
        setIsGroupSaving(false); // 저장 중 상태 해제
        toast.info("변경된 그룹 설정이 없습니다.");
        return;
      }

      // 그룹 설정을 우선순위 번호 배열로 변환
      const priorityNumbers = tempGroupSettings.map(group => parseInt(group.value) || 1);
      
      console.log('그룹설정 저장 시작 - 예상 우선순위:', {
        oldPriorityNumbers: groupSettings.map(g => g.value),
        newPriorityNumbers: priorityNumbers
      });
      
      // API 호출을 위한 데이터 준비
      const updated = {
        ...metricValues,
        priorityNumbers: priorityNumbers
      };

      // updatePriorityNumbersAndWait 함수 사용 (웹소켓 대기 포함)
      const result = await updatePriorityNumbersAndWait(0, updated, 10000);

      if (result.success === true) {
        // 웹소켓 대기가 완료되었으므로 priorityNumbers는 이미 서버에서 업데이트됨
        // groupSettings만 tempGroupSettings 값으로 업데이트
        console.log('그룹설정 저장 완료 - 값 업데이트:', {
          tempGroupSettings,
          currentPriorityNumbers: priorityNumbers,
          newGroupSettings: priorityNumbers.map((value, index) => ({
            id: `S-${String(index + 1).padStart(2, "0")}`,
            value: String(value || index + 1),
          }))
        });
        
        const newGroupSettings = priorityNumbers.map((value, index) => ({
          id: `S-${String(index + 1).padStart(2, "0")}`,
          value: String(value || index + 1),
        }));
        
        setGroupSettings(newGroupSettings);
        
        // 수정 모드 완전 해제
        setGroupEditMode(false);
        setIsGroupEditMode(false);
        setTempGroupSettings([]);
        setIsGroupSaving(false);
        
        toast.success("그룹 설정이 성공적으로 저장되었습니다.");
      } else {
        throw new Error("그룹 설정 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error('Error saving group settings:', error);
      toast.error("그룹 설정 저장에 실패했습니다.");
      // 에러 발생 시에도 수정 모드 해제
      setGroupEditMode(false);
      setIsGroupEditMode(false);
      setTempGroupSettings([]);
      setIsGroupSaving(false);
    }
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    try {
      setIsPowerSaving(true); // 저장 중 상태 시작
      
      // 변경된 필드만 감지
      const fieldMappings = [
        { key: '목표전력', metricKey: 'targetPower' },
        { key: 'PCT비율', metricKey: 'pctRatio' },
        { key: '펄스정수', metricKey: 'pulseConstant' },
        { key: '최초제어시간', metricKey: 'firstControlTime' },
        { key: '차단간격', metricKey: 'blockInterval' },
        { key: '복귀간격', metricKey: 'inputInterval' },
        { key: '자동운전복귀간격', metricKey: 'autoReturnTime' }
      ];

      const changedFields = [];

      // 변경된 필드 찾기
      for (const mapping of fieldMappings) {
        if (tempSettings[mapping.key] !== basicSettings[mapping.key]) {
          changedFields.push(mapping);
        }
      }

      // 변경된 필드가 없으면 저장하지 않음
      if (changedFields.length === 0) {
        setIsEditMode(false);
        setTempSettings({});
        setIsPowerSaving(false); // 저장 중 상태 해제
        toast.info("변경된 설정이 없습니다.");
        return;
      }

      // 변경된 필드만 각각 API로 전송 (웹소켓 대기 포함)
      for (const mapping of changedFields) {
        const value = Number(tempSettings[mapping.key]) * (mapping.metricKey === 'targetPower' ? 1000 : 1);
        const updated = {
          ...metricValues,
          [mapping.metricKey]: value.toString()
        };

        const result = await updateDeviceInfoAndWait(0, updated, mapping.metricKey, 10000);

        if (result.success !== true) {
          throw new Error(`${mapping.key} 업데이트에 실패했습니다.`);
        }
      }

      // 웹소켓 대기가 완료되었으므로 metricValues는 이미 서버에서 업데이트됨
      // basicSettings만 tempSettings 값으로 업데이트
      console.log('설정 저장 완료 - 값 업데이트:', {
        tempSettings,
        currentMetricValues: metricValues,
        newBasicSettings: {
          목표전력: tempSettings.목표전력 || metricValues.targetPower / 1000 || "",
          PCT비율: tempSettings.PCT비율 || metricValues.pctRatio || "",
          펄스정수: tempSettings.펄스정수 || metricValues.pulseConstant || "",
          최초제어시간: tempSettings.최초제어시간 || metricValues.firstControlTime || "",
          차단간격: tempSettings.차단간격 || metricValues.blockInterval || "",
          복귀간격: tempSettings.복귀간격 || metricValues.inputInterval || "",
          자동운전복귀간격: tempSettings.자동운전복귀간격 || metricValues.autoReturnTime || "",
        }
      });
      
      setBasicSettings({
        목표전력: tempSettings.목표전력 || metricValues.targetPower / 1000 || "",
        PCT비율: tempSettings.PCT비율 || metricValues.pctRatio || "",
        펄스정수: tempSettings.펄스정수 || metricValues.pulseConstant || "",
        최초제어시간: tempSettings.최초제어시간 || metricValues.firstControlTime || "",
        차단간격: tempSettings.차단간격 || metricValues.blockInterval || "",
        복귀간격: tempSettings.복귀간격 || metricValues.inputInterval || "",
        자동운전복귀간격: tempSettings.자동운전복귀간격 || metricValues.autoReturnTime || "",
      });
      
      // 수정 모드 완전 해제
      setIsEditMode(false);
      setTempSettings({});
      setIsPowerSaving(false);
      
      toast.success("설정이 성공적으로 저장되었습니다.");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.message || "설정 저장에 실패했습니다.");
      // 에러 발생 시에도 수정 모드 해제
      setIsEditMode(false);
      setTempSettings({});
      setIsPowerSaving(false);
    }
  };

  // 임시 설정 변경
  const handleTempSettingChange = (key, value) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  // 기본 설정 상태
  const [basicSettings, setBasicSettings] = useState({
    목표전력: metricValues.targetPower / 1000,
    PCT비율: metricValues.pctRatio,
    펄스정수: metricValues.pulseConstant,
    최초제어시간: metricValues.firstControlTime,
    차단간격: metricValues.blockInterval || "",
    복귀간격: metricValues.inputInterval || "",
    자동운전복귀간격: metricValues.autoReturnTime || "",
  })

  // metricValues가 변경될 때 basicSettings도 실시간 동기화
  React.useEffect(() => {
    // 수정 모드가 아닐 때만 동기화 (수정 중에는 사용자 입력을 유지)
    if (!isEditMode) {
      setBasicSettings({
        목표전력: metricValues.targetPower / 1000,
        PCT비율: metricValues.pctRatio,
        펄스정수: metricValues.pulseConstant,
        최초제어시간: metricValues.firstControlTime,
        차단간격: metricValues.blockInterval || "",
        복귀간격: metricValues.inputInterval || "",
        자동운전복귀간격: metricValues.autoReturnTime || "",
      });
    }
  }, [metricValues, isEditMode]); // metricValues와 isEditMode를 의존성으로 추가

  const handleBasicSettingChange = (key, value) => {
    setBasicSettings((prev) => ({ ...prev, [key]: value }))
    // setMetricValues 호출 제거 - 엔터키를 눌렀을 때만 업데이트
  }

  const topMetrics = [
    { label: "목표전력", value: metricValues.targetPower, id: "targetPower" },
    { label: "PCT비율", value: metricValues.pctRatio, id: "pctRatio" },
    { label: "펄스정수", value: metricValues.pulseConstant, id: "pulseConstant" },
    // { label: "필터상수", value: metricValues.filterConstant, id: "filterConstant" },
    { label: "최초제어시간", value: metricValues.firstControlTime, id: "firstControlTime" },
  ]

  // 그룹 설정 상태 (S-01 ~ S-16) - 실제 우선순위 데이터와 동기화
  const [groupSettings, setGroupSettings] = useState(
      Array.from({ length: 16 }, (_, i) => ({
        id: `S-${String(i + 1).padStart(2, "0")}`,
        value: String(i + 1), // 기본값
      })),
  )

  // priorityNumbers가 변경될 때 groupSettings도 실시간 동기화
  React.useEffect(() => {
    // 수정 모드가 아닐 때만 동기화
    if (!isGroupEditModeGlobal && !isGroupEditMode && priorityNumbers && Array.isArray(priorityNumbers) && priorityNumbers.length === 16) {
      const newGroupSettings = priorityNumbers.map((value, index) => ({
        id: `S-${String(index + 1).padStart(2, "0")}`,
        value: String(value || index + 1),
      }));
      
      // 현재 groupSettings와 비교하여 변경사항이 있을 때만 업데이트
      const hasChanges = newGroupSettings.some((newSetting, index) => 
        newSetting.value !== groupSettings[index]?.value
      );
      
      if (hasChanges) {
        console.log('그룹설정 실시간 업데이트:', {
          demandTime: Date.now(),
          priorityNumbers,
          newGroupSettings,
          oldGroupSettings: groupSettings
        });
        setGroupSettings(newGroupSettings);
      }
    }
  }, [priorityNumbers, isGroupEditModeGlobal, isGroupEditMode, groupSettings]);

  // 통신 설정 상태
  const [communicationSettings, setCommunicationSettings] = useState({
    "LG ACP": true,
    KHAM: false,
    UFO: false,
  })

  // 목표전력설정 상태
  const [targetPowerLevels, setTargetPowerLevels] = useState(
      Array.from({ length: 10 }, (_, i) => ({
        level: i + 1,
        value: i === 9 ? "65836" : "300",
      })),
  )

  const [publicHolidayLevel, setPublicHolidayLevel] = useState("1")

  // 계절별 목표전력 상태
  const [seasonalTargetPower, setSeasonalTargetPower] = useState({
    현재계절: "봄",
    전체라벨번경: "5",
    hourlySettings: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      value: "4",
    })),
  })

  const command2BitCheck = (command2, type) => {
    command2 = parseInt(command2);
    let result = false;
    if (type === 1) {
      result = (command2 & 1) === 1;
    } else if (type === 2) {
      result = (command2 & 2) === 2;
    } else if (type === 3) {
      result = (command2 & 4) === 4;
    }
    return result;
  }
  const ctrlConnectionTypeBitCheck = (ctrlConnectionType, type) => {
    ctrlConnectionType = parseInt(ctrlConnectionType);
    let result = false;
    if (type === 1) {
      result = (ctrlConnectionType & 1) === 1;
    } else if (type === 2) {
      result = (ctrlConnectionType & 2) === 2;
    } else if (type === 3) {
      result = (ctrlConnectionType & 4) === 4;
    } else if (type === 4) {
      result = (ctrlConnectionType & 8) === 8;
    } else if (type === 5) {
      result = (ctrlConnectionType & 16) === 16;
    } else if (type === 6) {
      result = (ctrlConnectionType & 32) === 32;
    } else if (type === 7) {
      result = (ctrlConnectionType & 64) === 64;
    } else if (type === 8) {
      result = (ctrlConnectionType & 128) === 128;
    }
    return result;
  }

  // 기능 설정 상태 추가
  const [voltageType, setVoltageType] = useState(deviceInfo.voltageType || '1')
  const [meterType, setMeterType] = useState(deviceInfo.meterType || '1')
  const [reductionMeasure, setReductionMeasure] = useState(deviceInfo.reductionMeasure || 5)
  const [controlChange, setControlChange] = useState(deviceInfo.controlChange || 720)
  const [connectionDevice, setConnectionDevice] = useState(deviceInfo.connectionDevice || 0)

  // 기능 설정 수정 모드 상태
  const [isFunctionEditMode, setIsFunctionEditMode] = useState(false)

  // 기능 설정 임시 상태 (수정 모드에서 사용)
  const [tempFunctionSettings, setTempFunctionSettings] = useState({})

  // 기능 설정 저장 상태
  const [isFunctionSaving, setIsFunctionSaving] = useState(false)

  // EOI 신호 옵션 상태
  const [eoiSignalOptions, setEoiSignalOptions] = useState({
    자동모드복귀: command2BitCheck(deviceInfo.command2, 1),
    운전모드부하차단초기화: command2BitCheck(deviceInfo.command2, 2),
    EOI부하차단초기화: command2BitCheck(deviceInfo.command2, 3),
  })

  // 연결장치 상태
  const [connectionDevices, setConnectionDevices] = useState({
    DC30000: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 1),
    삼성DMS: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 2),
    한전RCU: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 3),
    유선1: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 4),
    무선1: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 5),
    무선2: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 6),
    무선3: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 7),
    LGACP: ctrlConnectionTypeBitCheck(deviceInfo.ctrlConnectionType, 8),
  })

  // 연결장치 개수 상태
  const [connectionDeviceCounts, setConnectionDeviceCounts] = useState({
    한전RCU: deviceInfo.connectionDevice || 0,
  })

  // 기능 설정 수정 모드 시작
  const handleStartFunctionEdit = () => {
    setTempFunctionSettings({
      voltageType: voltageType,
      meterType: meterType,
      reductionMeasure: reductionMeasure,
      controlChange: controlChange,
      eoiSignalOptions: { ...eoiSignalOptions },
      connectionDevices: { ...connectionDevices },
      connectionDeviceCounts: { ...connectionDeviceCounts }
    });
    setIsFunctionEditMode(true);
  };

  // 기능 설정 수정 모드 취소
  const handleCancelFunctionEdit = () => {
    setIsFunctionEditMode(false);
    setTempFunctionSettings({});
  };

  // 임시 기능 설정 변경
  const handleTempFunctionSettingChange = (key, value) => {
    if (key === 'eoiSignalOptions') {
      setTempFunctionSettings(prev => ({
        ...prev,
        eoiSignalOptions: {
          ...prev.eoiSignalOptions,
          [value]: !prev.eoiSignalOptions[value]
        }
      }));
    } else if (key === 'connectionDevices') {
      setTempFunctionSettings(prev => ({
        ...prev,
        connectionDevices: {
          ...prev.connectionDevices,
          [value]: !prev.connectionDevices[value]
        }
      }));
    } else if (key === 'connectionDeviceCounts') {
      setTempFunctionSettings(prev => ({
        ...prev,
        connectionDeviceCounts: {
          ...prev.connectionDeviceCounts,
          [value.device]: value.count
        }
      }));
    } else {
      setTempFunctionSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  // 기능 설정 저장 함수
  const handleFunctionSettingsSave = async () => {
    try {
      setIsFunctionSaving(true);
      // 수정 모드에서는 임시 설정 사용, 아니면 현재 설정 사용
      const currentSettings = isFunctionEditMode ? tempFunctionSettings : {
        voltageType,
        meterType,
        reductionMeasure,
        controlChange,
        eoiSignalOptions,
        connectionDevices,
        connectionDeviceCounts
      };

      let command2 = 0;
      if (currentSettings.eoiSignalOptions.자동모드복귀) {
        command2 += 1;
      }
      if (currentSettings.eoiSignalOptions.운전모드부하차단초기화) {
        command2 += 2;
      }
      if (currentSettings.eoiSignalOptions.EOI부하차단초기화) {
        command2 += 4;
      }

      let connectionDevice = 0;
      if (currentSettings.connectionDevices.DC30000) {
        connectionDevice += 1;
      }
      if (currentSettings.connectionDevices.삼성DMS) {
        connectionDevice += 2;
      }
      if (currentSettings.connectionDevices.한전RCU) {
        connectionDevice += 4;
      }
      if (currentSettings.connectionDevices.유선1) {
        connectionDevice += 8;
      }
      if (currentSettings.connectionDevices.무선1) {
        connectionDevice += 16;
      }
      if (currentSettings.connectionDevices.무선2) {
        connectionDevice += 32;
      }
      if (currentSettings.connectionDevices.무선3) {
        connectionDevice += 64;
      }
      if (currentSettings.connectionDevices.LGACP) {
        connectionDevice += 128;
      }

      const connectionDeviceCount = currentSettings.connectionDeviceCounts.한전RCU;

      console.log('connectionDevice', connectionDevice);
      console.log('connectionDeviceCount', connectionDeviceCount);

      const deviceId = deviceInfo?.id || 0;

      var changedFields = [];
      changedFields.push('functionSettings');
      if (deviceInfo?.voltageType !== currentSettings.voltageType) {
        changedFields.push('voltageType');
      }
      if (deviceInfo?.meterType !== currentSettings.meterType) {
        changedFields.push('meterType');
      }
      if (deviceInfo?.reductionMeasure !== currentSettings.reductionMeasure) {
        changedFields.push('reductionMeasure');
      }
      if (deviceInfo?.controlChange !== currentSettings.controlChange) {
        changedFields.push('controlChange');
      }
      if (deviceInfo?.connectionDeviceCnt !== connectionDeviceCount) {
        changedFields.push('connectionDeviceCnt');
      }
      if (deviceInfo?.connectionDevice !== ('' + connectionDevice)) {
        changedFields.push('connectionDevice');
      }
      if (deviceInfo?.command2 !== command2) {
        changedFields.push('command2');
      }
      if (changedFields.length === 0) {
        toast.error("변경된 설정이 없습니다.");
        return;
      }

      const result = await updateDeviceInfoAndWaitWithMessage(deviceId, {
        voltageType: currentSettings.voltageType,
        meterType: currentSettings.meterType,
        reductionMeasure: currentSettings.reductionMeasure,
        controlChange: currentSettings.controlChange,
        connectionDeviceCnt: connectionDeviceCount,
        connectionDevice: connectionDevice,
        command2: command2,
      }, changedFields, 20000);

      if (result.success) {
        // 수정 모드인 경우 상태 업데이트
        if (isFunctionEditMode) {
          setVoltageType(currentSettings.voltageType);
          setMeterType(currentSettings.meterType);
          setReductionMeasure(currentSettings.reductionMeasure);
          setControlChange(currentSettings.controlChange);
          setEoiSignalOptions({
            자동모드복귀: command2BitCheck(currentSettings.command2, 1),
            운전모드부하차단초기화: command2BitCheck(currentSettings.command2, 2),
            EOI부하차단초기화: command2BitCheck(currentSettings.command2, 3),
          });
          setConnectionDevices(currentSettings.connectionDevices);
          setConnectionDeviceCounts(currentSettings.connectionDeviceCounts);
          setIsFunctionEditMode(false);
          setTempFunctionSettings({});
        }
        toast.success("기능 설정이 성공적으로 저장되었습니다.");
      } else {
        throw new Error("기능 설정 저장에 실패했습니다.");
      }
    } catch (error) {
      console.error('Error saving function settings:', error);
      toast.error("기능 설정 저장에 실패했습니다.");
    } finally {
      setIsFunctionSaving(false);
    }
  };

  // xx 초기화 함수
  const handleReset = async (e) => {
    try {
      const deviceId = deviceInfo?.id || 0;
      let command1 = 0;
      let text = "";
      switch (e.target.id) {
        case 'save-reset':
          command1 = 1;
          text = "저장영역 초기화";
          break;
        case 'setting-reset':
          command1 = 2;
          text = "설정값 초기화";
          break;
        case 'factory-reset':
          command1 = 4;
          text = "출고(공장) 초기화";
          break;
        case 'block-reset':
          command1 = 8;
          text = "차단 초기화";
          break;
        default:
          toast.error(`알 수 없는 버튼 (${e.target.id})`);
          console.error(`알 수 없는 버튼 (${e.target.id})`);
          return;
      }

      if (!confirm(`${text}을 진행하시겠습니까?`)) {
        return;
      }

      const result = await updateDeviceInfoAndWaitWithMessage(deviceId, { command1 }, 'command1', 10000);

      if (result.success) {
        toast.success(`${text}가 완료되었습니다.`);
      } else {
        throw new Error(`${text}에 실패했습니다.`);
      }
    } catch (error) {
      console.error(`Error ${text}:`, error);
      toast.error(`${text}에 실패했습니다.`);
    }
  };

  // EOI 동기화 함수
  const handleEoiSync = async () => {
    try {
      const deviceId = deviceInfo?.id || 0;
      const result = await updateDeviceInfoAndWaitWithMessage(deviceId, { command1: 16 }, 'command1', 10000);

      if (result.success) {
        toast.success("EOI 동기화가 완료되었습니다.");
      } else {
        throw new Error("EOI 동기화에 실패했습니다.");
      }
    } catch (error) {

      console.error('Error EOI sync:', error);
      toast.error("EOI 동기화에 실패했습니다.");
    }
  };

  // 시계 동기화 함수
  const handleTimeSync = async () => {
    try {
      await updateTimeSync(deviceInfo?.id || 0);
      toast.success("시계 동기화가 완료되었습니다.");
    }
    catch (error) {
      console.error('Error Time sync:', error);
      toast.error("시계 동기화에 실패했습니다.");
    }
  }

  // EOI 신호 옵션 변경 함수
  const handleEoiSignalOptionChange = (option) => {
    setEoiSignalOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  // 연결장치 변경 함수
  const handleConnectionDeviceChange = (device) => {
    setConnectionDevices(prev => ({
      ...prev,
      [device]: !prev[device],
    }));
  };

  // 연결장치 개수 변경 함수
  const handleConnectionDeviceCountChange = (device, count) => {
    setConnectionDeviceCounts(prev => ({
      ...prev,
      [device]: Math.max(1, parseInt(count) || 1),
    }));
  };

  const handleGroupSettingChange = (index, value) => {
    if (isGroupEditModeGlobal) {
      setTempGroupSettings((prev) => prev.map((item, i) => (i === index ? { ...item, value } : item)));
    }
  }

  const handleCommunicationChange = (key, checked) => {
    setCommunicationSettings((prev) => ({ ...prev, [key]: checked }))
  }

  const handleTargetPowerLevelChange = (index, value) => {
    setTargetPowerLevels((prev) => prev.map((item, i) => (i === index ? { ...item, value } : item)))
  }

  const handleSeasonalHourlyChange = (hour, value) => {
    setSeasonalTargetPower((prev) => ({
      ...prev,
      hourlySettings: prev.hourlySettings.map((item) => (item.hour === hour ? { ...item, value } : item)),
    }))
  }

  const handleSave = (section) => {
    console.log(`${section} 설정 저장`)
    // 실제 저장 로직 구현
  }

  // 목표전력설정 저장 함수
  const saveTargetPowerSettings = async () => {
    try {
      setIsTargetPowerSaving(true);
      
      // 수정 모드에서는 임시 설정 사용, 아니면 현재 설정 사용
      const currentTargetPowerLevels = isTargetPowerEditMode 
        ? tempTargetPowerSettings.targetPowerLevels 
        : targetPowerLevels;
      const currentSeasonalTargetPower = isTargetPowerEditMode 
        ? tempTargetPowerSettings.seasonalTargetPower 
        : seasonalTargetPower;
      
      // 라벨별 목표전력 데이터 준비
      const targetPowerLabels = currentTargetPowerLevels.map((level, index) => ({
        labelNo: index + 1,
        targetKw: parseFloat(level.value) || 0
      }));
      
      // 계절별 시간대 목표전력 데이터 준비
      const seasonMap = {
        '봄': 'SPRING',
        '여름': 'SUMMER',
        '가을': 'AUTUMN',
        '겨울': 'WINTER'
      };
      
      const targetPowerByHours = [];
      const seasons = ['봄', '여름', '가을', '겨울'];
      
      seasons.forEach(season => {
        const hourlyValues = currentSeasonalTargetPower.hourlySettings.map(setting => setting.value);
        hourlyValues.forEach((value, hour) => {
          const labelNo = parseInt(value) || 4;
          // labelNo에 해당하는 targetKw 값을 찾기
          const targetKw = currentTargetPowerLevels[labelNo - 1] ? parseFloat(currentTargetPowerLevels[labelNo - 1].value) : 300;
          
          targetPowerByHours.push({
            season: seasonMap[season],
            hour: hour,
            labelNo: labelNo,
            targetKw: targetKw
          });
        });
      });
      
      // 전송할 데이터 로깅
      const requestData = {
        targetPowerLabels,
        targetPowerByHours
      };
      console.log('전송할 데이터:', requestData);
      
      // schedule_dynamic.js의 saveTargetPowerSetting 함수 사용
      // customerId는 하드코딩된 1 사용
      const { saveTargetPowerSetting } = await import('../api/schedule_dynamic');
      await saveTargetPowerSetting(1, requestData);
      
      // 수정 모드인 경우 상태 업데이트
      if (isTargetPowerEditMode) {
        setTargetPowerLevels(currentTargetPowerLevels);
        setSeasonalTargetPower(currentSeasonalTargetPower);
        setIsTargetPowerEditMode(false);
        setTempTargetPowerSettings({
          targetPowerLevels: [],
          seasonalTargetPower: {}
        });
      }
      
      toast.success('목표전력설정이 성공적으로 저장되었습니다.');
      
    } catch (error) {
      console.error('목표전력설정 저장 실패:', error);
      console.error('에러 상세 정보:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      
      // API가 아직 구현되지 않았거나 네트워크 오류인 경우 임시 저장
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        // 로컬 스토리지에 임시 저장
        const currentTargetPowerLevels = isTargetPowerEditMode 
          ? tempTargetPowerSettings.targetPowerLevels 
          : targetPowerLevels;
        const currentSeasonalTargetPower = isTargetPowerEditMode 
          ? tempTargetPowerSettings.seasonalTargetPower 
          : seasonalTargetPower;
        
        const tempData = {
          targetPowerLevels: currentTargetPowerLevels,
          seasonalTargetPower: currentSeasonalTargetPower,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`targetPowerSetting_${customerId}`, JSON.stringify(tempData));
        
        // 수정 모드인 경우 상태 업데이트
        if (isTargetPowerEditMode) {
          setTargetPowerLevels(currentTargetPowerLevels);
          setSeasonalTargetPower(currentSeasonalTargetPower);
          setIsTargetPowerEditMode(false);
          setTempTargetPowerSettings({
            targetPowerLevels: [],
            seasonalTargetPower: {}
          });
        }
        
        toast.success('목표전력설정이 임시로 저장되었습니다.');
      } else if (error.message.includes('400')) {
        // 400 에러 시에도 임시 저장
        const currentTargetPowerLevels = isTargetPowerEditMode 
          ? tempTargetPowerSettings.targetPowerLevels 
          : targetPowerLevels;
        const currentSeasonalTargetPower = isTargetPowerEditMode 
          ? tempTargetPowerSettings.seasonalTargetPower 
          : seasonalTargetPower;
        
        const tempData = {
          targetPowerLevels: currentTargetPowerLevels,
          seasonalTargetPower: currentSeasonalTargetPower,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`targetPowerSetting_${customerId}`, JSON.stringify(tempData));
        
        // 수정 모드인 경우 상태 업데이트
        if (isTargetPowerEditMode) {
          setTargetPowerLevels(currentTargetPowerLevels);
          setSeasonalTargetPower(currentSeasonalTargetPower);
          setIsTargetPowerEditMode(false);
          setTempTargetPowerSettings({
            targetPowerLevels: [],
            seasonalTargetPower: {}
          });
        }
        
        toast.success('목표전력설정이 임시로 저장되었습니다.');
        console.error('400 에러 - 데이터 형식 문제 가능성');
      } else {
        toast.error('목표전력설정 저장에 실패했습니다.');
      }
    } finally {
      setIsTargetPowerSaving(false);
    }
  };

  // 전체 라벨 번경 함수
  const handleChangeAllLabels = () => {
    const newValue = parseInt(seasonalTargetPower.전체라벨번경) || 4;
    if (newValue >= 1 && newValue <= 10) {
      const newHourlySettings = seasonalTargetPower.hourlySettings.map(setting => ({
        ...setting,
        value: newValue.toString()
      }));
      
      setSeasonalTargetPower(prev => ({
        ...prev,
        hourlySettings: newHourlySettings
      }));
      
      toast.success(`${seasonalTargetPower.현재계절} 계절의 모든 시간대가 라벨 ${newValue}로 변경되었습니다.`);
    } else {
      toast.error('라벨 번호는 1-10 사이의 값이어야 합니다.');
    }
  };

  // 목표전력설정 수정 모드 시작
  const handleStartTargetPowerEdit = () => {
    setTempTargetPowerSettings({
      targetPowerLevels: [...targetPowerLevels],
      seasonalTargetPower: { ...seasonalTargetPower }
    });
    setIsTargetPowerEditMode(true);
  };

  // 목표전력설정 수정 모드 취소
  const handleCancelTargetPowerEdit = () => {
    setIsTargetPowerEditMode(false);
    setTempTargetPowerSettings({
      targetPowerLevels: [],
      seasonalTargetPower: {}
    });
  };

  // 임시 목표전력 레벨 변경
  const handleTempTargetPowerLevelChange = (index, value) => {
    if (isTargetPowerEditMode) {
      setTempTargetPowerSettings(prev => ({
        ...prev,
        targetPowerLevels: prev.targetPowerLevels.map((item, i) => 
          i === index ? { ...item, value } : item
        )
      }));
    } else {
      // 수정 모드가 아닐 때는 바로 targetPowerLevels 업데이트
      setTargetPowerLevels(prev => prev.map((item, i) => 
        i === index ? { ...item, value } : item
      ));
    }
  };

  // 임시 계절별 시간대 변경
  const handleTempSeasonalHourlyChange = (hour, value) => {
    if (isTargetPowerEditMode) {
      setTempTargetPowerSettings(prev => ({
        ...prev,
        seasonalTargetPower: {
          ...prev.seasonalTargetPower,
          hourlySettings: prev.seasonalTargetPower.hourlySettings.map(item => 
            item.hour === hour ? { ...item, value } : item
          )
        }
      }));
    } else {
      // 수정 모드가 아닐 때는 바로 seasonalTargetPower 업데이트
      setSeasonalTargetPower(prev => ({
        ...prev,
        hourlySettings: prev.hourlySettings.map(item => 
          item.hour === hour ? { ...item, value } : item
        )
      }));
    }
  };

  // 임시 전체 라벨 번경
  const handleTempChangeAllLabels = () => {
    const currentSeasonalTargetPower = isTargetPowerEditMode 
      ? tempTargetPowerSettings.seasonalTargetPower 
      : seasonalTargetPower;
    
    const newValue = parseInt(currentSeasonalTargetPower.전체라벨번경) || 4;
    if (newValue >= 1 && newValue <= 10) {
      const newHourlySettings = currentSeasonalTargetPower.hourlySettings.map(setting => ({
        ...setting,
        value: newValue.toString()
      }));
      
      if (isTargetPowerEditMode) {
        setTempTargetPowerSettings(prev => ({
          ...prev,
          seasonalTargetPower: {
            ...prev.seasonalTargetPower,
            hourlySettings: newHourlySettings
          }
        }));
      } else {
        // 수정 모드가 아닐 때는 바로 seasonalTargetPower 업데이트
        setSeasonalTargetPower(prev => ({
          ...prev,
          hourlySettings: newHourlySettings
        }));
      }
      
      toast.success(`${currentSeasonalTargetPower.현재계절} 계절의 모든 시간대가 라벨 ${newValue}로 변경되었습니다.`);
    } else {
      toast.error('라벨 번호는 1-10 사이의 값이어야 합니다.');
    }
  };

  const [isPlcSyncing, setIsPlcSyncing] = useState(false);
  // plc 데이터 동기화
  const handleSyncPlcData = async (daysAgo) => {
    try {
      setIsPlcSyncing(true);
      const now = new Date();
      now.setDate(now.getDate() - daysAgo);
      const reportDate = now.toISOString().split('T')[0];
      const result = await syncPlcData(reportDate);
      if (result.success) {
        invalidateDailyQueries();
        invalidateMonthlyQueries();
        invalidateYearlyQueries();
        toast.success('iEMU 데이터 동기화가 완료되었습니다.');
      } else {
        throw new Error('iEMU 데이터 동기화에 실패했습니다.');
      }
    }
    catch (error) {
      console.error('iEMU 데이터 동기화 실패:', error);
      toast.error('iEMU 데이터 동기화에 실패했습니다.');
    } finally {
      setIsPlcSyncing(false);
    }
  };

  // 보고서 데이터 초기화
  const handleResetReportData = async () => {
    if (!confirm('보고서 데이터를 초기화하시겠습니까?\n초기화 후 데이터는 복구가 불가능합니다.')) {
      return;
    }

    try {
      const plcSerial = selectedOrganization.plcSerial;
      let result = await resetReportDataCloud(plcSerial);
      if (result.resultCode === 200) {
        console.log('cloud 보고서 데이터 초기화 완료');
      }
      else {
        throw new Error('cloud 보고서 데이터 초기화 실패');
      }

      result = await resetReportData();
      if (result.success) {
        console.log('local 보고서 데이터 초기화 완료');
      }
      else {
        throw new Error('local 보고서 데이터 초기화 실패');
      }

      invalidateDailyQueries();
      invalidateMonthlyQueries();
      invalidateYearlyQueries();
      console.log('보고서 데이터 캐시 무효화 완료');

      result = await updateDeviceInfoAndWaitWithMessage(deviceId, { command1: 1 }, 'command1', 10000);

      if (result.success) {
        console.log('iEMU 데이터 초기화 업데이트 완료');
      } else {
        throw new Error('iEMU 데이터 초기화 업데이트 실패');
      }

      toast.success('보고서 데이터 초기화가 완료되었습니다.');
    }
    catch (error) {
      console.error('보고서 데이터 초기화 실패:', error);
      toast.error('보고서 데이터 초기화에 실패했습니다.');
    }
  };

  // 목표전력설정 데이터를 웹소켓으로 받아와서 실시간 업데이트
  React.useEffect(() => {
    // 수정 모드가 아닐 때만 웹소켓 데이터로 동기화
    if (!isTargetPowerEditMode) {
      // deviceInfo에서 목표전력설정 관련 데이터가 있다면 업데이트
      if (deviceInfo.targetPowerLevels && Array.isArray(deviceInfo.targetPowerLevels)) {
        setTargetPowerLevels(deviceInfo.targetPowerLevels);
      }
      
      if (deviceInfo.seasonalTargetPower) {
        setSeasonalTargetPower(deviceInfo.seasonalTargetPower);
      }
    }
  }, [deviceInfo, isTargetPowerEditMode]);

  // deviceInfo가 변경될 때 기능 설정 상태들도 실시간 동기화
  React.useEffect(() => {
    // 수정 모드가 아닐 때만 동기화 (수정 중에는 사용자 입력을 유지)
    if (!isFunctionEditMode) {
      setVoltageType(deviceInfo.voltageType || '1');
      setMeterType(deviceInfo.meterType || '1');
      setReductionMeasure(deviceInfo.reductionMeasure || 5);
      setControlChange(deviceInfo.controlChange || 720);
      
      // EOI 신호 옵션 업데이트
      setEoiSignalOptions({
        자동모드복귀: command2BitCheck(deviceInfo.command2, 1),
        운전모드부하차단초기화: command2BitCheck(deviceInfo.command2, 2),
        EOI부하차단초기화: command2BitCheck(deviceInfo.command2, 3),
      });
      
      // 연결장치 상태 업데이트 (deviceInfo에 연결장치 정보가 있다면)
      if (deviceInfo.connectionDevice) {
        setConnectionDevices({
          DC30000: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 1),
          삼성DMS: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 2),
          한전RCU: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 3),
          유선1: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 4),
          무선1: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 5),
          무선2: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 6),
          무선3: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 7),
          LGACP: ctrlConnectionTypeBitCheck(deviceInfo.connectionDevice, 8),
        });
      }
      
      // 연결장치 개수 상태 업데이트 (deviceInfo에 연결장치 개수 정보가 있다면)
      if (deviceInfo.connectionDeviceCnt) {
        setConnectionDeviceCounts({
          한전RCU: deviceInfo.connectionDeviceCnt,
        });
      }
    }
  }, [deviceInfo, isFunctionEditMode]);

  // 전역 상태 변화 감지를 위한 useEffect
  React.useEffect(() => {
    const checkGlobalState = () => {
      if (!isGroupEditModeGlobal && isGroupEditMode) {
        setIsGroupEditMode(false);
        setTempGroupSettings([]);
      }
    };

    // 주기적으로 전역 상태 확인
    const interval = setInterval(checkGlobalState, 100);
    
    return () => clearInterval(interval);
  }, [isGroupEditMode]);

  // 컴포넌트 마운트 시 목표전력설정 데이터 로딩
  React.useEffect(() => {
    loadTargetPowerSettings();
  }, []); // 빈 의존성 배열로 초기 로딩 시에만 실행

  // 페이지 진입 시 그룹편집 모드 초기화
  React.useEffect(() => {
    setGroupEditMode(false);
  }, []); // 빈 의존성 배열로 초기 로딩 시에만 실행

  return (
    <>
      {/* 전체 화면 로딩 */}
      {isPowerSaving && <FullScreenLoading message="전력/간격설정 저장 중..." />}
      {isGroupSaving && <FullScreenLoading message="그룹설정 저장 중..." />}
      {isFunctionSaving && <FullScreenLoading message="기능 설정 저장 중..." />}
      {isPlcSyncing && <FullScreenLoading message="iEMU 데이터 동기화 중..." />}

      <div className="container p-4 overflow-x-hidden max-w-[80rem] m-auto space-y-6">
        {/* 페이지 헤더와 WebSocket 상태 표시 */}
        <div className="flex items-center justify-between mb-6">
          {/*<div className="flex items-center space-x-4">*/}
          {/*  <Settings className="h-8 w-8 text-blue-600" />*/}
          {/*  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">설정</h1>*/}
          {/*</div>*/}
          <WebSocketStatusIndicator />
        </div>

        {/* 전력/간격 설정 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-0 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl sm:text-2xl text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600 dark:text-green-600" />
                전력/간격 설정
              </CardTitle>
              {!isEditMode ? (
                <Button
                  onClick={handleStartEdit}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4"
                  disabled={!canEditPowerSettings}
                >
                  수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    className="px-4"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSaveSettings}
                    className="bg-green-600 hover:bg-green-700 px-4 text-white"
                    disabled={isPowerSaving}
                  >
                    {isPowerSaving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            {/* 전력 설정 */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-700 dark:text-white">전력 설정</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">목표전력</div>
                  <div className="relative">
                    <Input
                        value={isEditMode ? tempSettings.목표전력 : basicSettings.목표전력}
                        onChange={(e) => isEditMode ? handleTempSettingChange("목표전력", e.target.value) : handleBasicSettingChange("목표전력", e.target.value)}
                        readOnly={!isEditMode}
                        className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                        disabled={!canEditAdvancedSettings}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">(kW)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">PCT비율</div>
                  <Input
                      value={isEditMode ? tempSettings.PCT비율 : basicSettings.PCT비율}
                      onChange={(e) => isEditMode ? handleTempSettingChange("PCT비율", e.target.value) : handleBasicSettingChange("PCT비율", e.target.value)}
                      readOnly={!isEditMode || !canEditAdvancedSettings}
                      className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                      disabled={!canEditAdvancedSettings}
                  />
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">펄스정수</div>
                  <Input
                      value={isEditMode ? tempSettings.펄스정수 : basicSettings.펄스정수}
                      onChange={(e) => isEditMode ? handleTempSettingChange("펄스정수", e.target.value) : handleBasicSettingChange("펄스정수", e.target.value)}
                      readOnly={!isEditMode || !canEditAdvancedSettings}
                      className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                      disabled={!canEditAdvancedSettings}
                  />
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">
                    최초제어시간
                  </div>
                  <Input
                      value={isEditMode ? tempSettings.최초제어시간 : basicSettings.최초제어시간}
                      onChange={(e) => isEditMode ? handleTempSettingChange("최초제어시간", e.target.value) : handleBasicSettingChange("최초제어시간", e.target.value)}
                      readOnly={!isEditMode}
                      className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                      disabled={!canEditAdvancedSettings}
                  />
                </div>
              </div>
            </div>

            {/* 간격 설정 */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-700 dark:text-white">간격 설정</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">차단간격</div>
                  <Input
                      value={isEditMode ? tempSettings.차단간격 : basicSettings.차단간격}
                      onChange={(e) => isEditMode ? handleTempSettingChange("차단간격", e.target.value) : handleBasicSettingChange("차단간격", e.target.value)}
                      readOnly={!isEditMode}
                      className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                      disabled={!canEditAdvancedSettings}
                  />
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">복귀간격</div>
                  <Input
                      value={isEditMode ? tempSettings.복귀간격 : basicSettings.복귀간격}
                      onChange={(e) => isEditMode ? handleTempSettingChange("복귀간격", e.target.value) : handleBasicSettingChange("복귀간격", e.target.value)}
                      readOnly={!isEditMode}
                      className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                      disabled={!canEditAdvancedSettings}
                  />
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-600 dark:bg-green-600 text-white p-2 rounded-lg text-center font-medium text-base">
                    자동운전복귀간격
                  </div>
                  <Input
                      value={isEditMode ? tempSettings.자동운전복귀간격 : basicSettings.자동운전복귀간격}
                      onChange={(e) => isEditMode ? handleTempSettingChange("자동운전복귀간격", e.target.value) : handleBasicSettingChange("자동운전복귀간격", e.target.value)}
                      readOnly={!isEditMode || !canEditAdvancedSettings}
                      className={`text-center md:text-base font-bold h-12 ${!isEditMode || !canEditAdvancedSettings ? 'bg-gray-50' : ''}`}
                      disabled={!canEditAdvancedSettings}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 그룹 설정 */}
        <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-0 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl sm:text-2xl text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600 dark:text-green-600" />
                그룹 설정
              </CardTitle>
              {!isGroupEditModeGlobal ? (
                <Button
                  onClick={handleStartGroupEdit}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4"
                  disabled={!isControlAble}
                >
                  수정
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancelGroupEdit}
                    variant="outline"
                    className="px-4"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleSaveGroupSettings}
                    className="bg-green-600 hover:bg-green-700 text-white px-4"
                    disabled={isGroupSaving}
                  >
                    {isGroupSaving ? "저장 중..." : "저장"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6">
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-700 dark:text-white">그룹 설정</h3>
              <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl overflow-x-auto border-1 border-gray-200 dark:border-slate-600">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {groupSettings.map((group, index) => (
                      <div key={group.id} className="text-center space-y-2">
                        <div className="bg-blue-100 dark:bg-green-50 text-blue-700 dark:text-green-800 p-1 rounded text-base font-medium">{group.id}</div>
                        <Input
                            value={isGroupEditModeGlobal ? tempGroupSettings[index]?.value : group.value}
                            onChange={(e) => handleGroupSettingChange(index, e.target.value)}
                            readOnly={!isGroupEditModeGlobal}
                            className={`text-center remove-arrow font-bold h-8 text-base ${!isGroupEditModeGlobal ? 'bg-gray-50' : 'bg-white'}`}
                            placeholder="1-16"
                            type="number"
                            min="1"
                            max="16"
                        />
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 통신 설정 & 기능 설정 */}
        <div className="flex flex-row w-full gap-6">
          {/* 기능 설정 */}
          <Card className="border-0 shadow-sm bg-white/70 backdrop-blur-sm rounded-2xl w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-green-600" />
                  기능 설정
                </CardTitle>
                {!isFunctionEditMode ? (
                  <Button
                    onClick={handleStartFunctionEdit}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4"
                    disabled={!canEditFunctionSettings}
                  >
                    수정
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCancelFunctionEdit}
                      variant="outline"
                      className="px-4"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleFunctionSettingsSave}
                      className="bg-green-600 hover:bg-green-700 text-white px-4"
                    >
                      저장
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-4 sm:px-6">
              {/* 피크제어방식 */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <div className="flex-1">
                <div className="space-y-3 flex flex-col sm:flex-row gap-0 sm:gap-3 mb-4 sm:mb-0">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1">전압 설정</h3>
                    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border-1 border-gray-200 dark:border-slate-600">
                      <RadioGroup
                          value={isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType}
                          onValueChange={(value) => isFunctionEditMode ? handleTempFunctionSettingChange('voltageType', value) : setVoltageType(value)}
                          className="space-y-2"
                          disabled={!isFunctionEditMode || !canEditFunctionSettings}
                      >
                        <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 dark:text-white rounded border hover:bg-gray-50 transition-colors ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RadioGroupItem value="1" id="high-voltage" disabled={!isFunctionEditMode || !canEditFunctionSettings} />
                          <Label htmlFor="high-voltage" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            고압
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 dark:text-white rounded border hover:bg-gray-50 transition-colors ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RadioGroupItem value="2" id="low-voltage" disabled={!isFunctionEditMode || !canEditFunctionSettings} />
                          <Label htmlFor="low-voltage" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            저압
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1">계량기 타입</h3>
                    <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border-1 border-gray-200 dark:border-slate-600">
                      <RadioGroup
                          value={isFunctionEditMode ? tempFunctionSettings.meterType : meterType}
                          onValueChange={(value) => isFunctionEditMode ? handleTempFunctionSettingChange('meterType', value) : setMeterType(value)}
                          className="space-y-2"
                          disabled={!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1'}
                      >
                        <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 dark:text-white rounded border hover:bg-gray-50 transition-colors ${(!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RadioGroupItem value="1" id="meter" disabled={!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1'} />
                          <Label htmlFor="meter" className={`text-base font-medium ${(!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1') ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            계량기
                          </Label>
                        </div>
                        <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 dark:text-white rounded border hover:bg-gray-50 transition-colors ${(!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1') ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <RadioGroupItem value="2" id="meta" disabled={!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1'} />
                          <Label htmlFor="meta" className={`text-base font-medium ${(!isFunctionEditMode || !canEditFunctionSettings || (isFunctionEditMode ? tempFunctionSettings.voltageType : voltageType) === '1') ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            메타
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                </div>


              <div className="space-y-3 flex flex-row gap-3">
                <div className="flex-1 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border-1 border-gray-200 dark:border-slate-600 m-0">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-white text-center mb-2">감축측정</h3>
                  <div className="flex items-center space-x-2 p-2 bg-white dark:bg-slate-600 rounded border hover:bg-gray-50 transition-colors justify-center">
                    <Input
                      type="number"
                      value={isFunctionEditMode ? tempFunctionSettings.reductionMeasure : reductionMeasure}
                      onChange={(e) => isFunctionEditMode ? handleTempFunctionSettingChange('reductionMeasure', Number(e.target.value) || 0) : setReductionMeasure(Number(e.target.value) || 0)}
                      disabled={!isFunctionEditMode || !canEditFunctionSettings}
                      className={`text-center text-base font-medium border-0 bg-transparent dark:bg-slate-800 ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
                <div className="flex-1 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl border-1 border-gray-200 dark:border-slate-600 m-0">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-white text-center mb-2">제어변경</h3>
                  <div className="flex items-center space-x-2 p-2 bg-white dark:bg-slate-600 rounded border hover:bg-gray-50 transition-colors justify-center">
                    <Input
                      type="number"
                      value={isFunctionEditMode ? tempFunctionSettings.controlChange : controlChange}
                      onChange={(e) => isFunctionEditMode ? handleTempFunctionSettingChange('controlChange', Number(e.target.value) || 0) : setControlChange(Number(e.target.value) || 0)}
                      disabled={!isFunctionEditMode || !canEditFunctionSettings}
                      className={`text-center text-base font-medium border-0 bg-transparent dark:bg-slate-800 ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>
                </div>
              </div>

              {/* EOI 신호 수신 */}
              <div className="flex flex-row gap-3 space-y-3">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1 mt-2 hidden md:block">자동모드복귀/부하차단초기화</h3>
                  <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1 mt-2 block md:hidden">
                    자동모드복귀/ <br/>
                    부하차단초기화
                  </h3>
                  <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded-xl space-y-2 border-1 border-gray-200 dark:border-slate-600">

                  <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                      <Checkbox
                          id="auto-return"
                          checked={isFunctionEditMode ? tempFunctionSettings.eoiSignalOptions?.자동모드복귀 : eoiSignalOptions.자동모드복귀}
                          onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('eoiSignalOptions', '자동모드복귀') : handleEoiSignalOptionChange("자동모드복귀")}
                          disabled={!isFunctionEditMode || !canEditFunctionSettings}
                      />
                      <Label htmlFor="auto-return" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        수동 자동 복귀
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                      <Checkbox
                          id="operation-mode-reset"
                          checked={isFunctionEditMode ? tempFunctionSettings.eoiSignalOptions?.운전모드부하차단초기화 : eoiSignalOptions.운전모드부하차단초기화}
                          onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('eoiSignalOptions', '운전모드부하차단초기화') : handleEoiSignalOptionChange("운전모드부하차단초기화")}
                          disabled={!isFunctionEditMode || !canEditFunctionSettings}
                      />
                      <Label htmlFor="operation-mode-reset" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        자수동 변경 초기화
                      </Label>
                    </div>
                    <div className={`flex items-center space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                      <Checkbox
                          id="eoi-reset"
                          checked={isFunctionEditMode ? tempFunctionSettings.eoiSignalOptions?.EOI부하차단초기화 : eoiSignalOptions.EOI부하차단초기화}
                          onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('eoiSignalOptions', 'EOI부하차단초기화') : handleEoiSignalOptionChange("EOI부하차단초기화")}
                          disabled={!isFunctionEditMode || !canEditFunctionSettings}
                      />
                      <Label htmlFor="eoi-reset" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        EOI시 제어 초기화
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1 mt-2 flex items-center h-[56px] md:h-auto">데이터 동기화</h3>
                  <div className="grid grid-cols-2 gap-2.5 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl space-y-2 border-1 border-gray-200 dark:border-slate-600">
                    <Button
                        id="save-reset"
                        variant="outline"
                        className="h-10 px-4 border-gray-200 text-base text-blue-600 dark:text-green-500 dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-gray-200 hover:border-gray-300 hover:text-blue-700 bg-transparent m-0"
                        disabled={!isFunctionEditMode || !canEditFunctionSettings || isPlcSyncing}
                        onClick={() => handleSyncPlcData(0)}
                    >
                      D-Day
                    </Button>
                    <Button
                        id="setting-reset"
                        variant="outline"
                        className="h-10 px-4 border-gray-200 text-base text-blue-600 dark:text-green-500 dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-gray-200 hover:border-gray-300 hover:text-blue-700 bg-transparent m-0"
                        disabled={!isFunctionEditMode || !canEditFunctionSettings || isPlcSyncing}
                        onClick={() => handleSyncPlcData(1)}
                    >
                      D-1
                    </Button>
                    <Button
                        id="block-reset"
                        variant="outline"
                        className="h-10 px-4 border-gray-200 text-base text-blue-600 dark:text-green-500 dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-gray-200 hover:border-gray-300 hover:text-blue-700 bg-transparent m-0"
                        disabled={!isFunctionEditMode || !canEditFunctionSettings || isPlcSyncing}
                        onClick={() => handleSyncPlcData(2)}
                    >
                      D-2
                    </Button>
                    <Button
                        id="factory-reset"
                        variant="outline"
                        className="h-10 px-4 border-gray-200 text-base text-blue-600 dark:text-green-500 dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-gray-200 hover:border-gray-300 hover:text-blue-700 bg-transparent m-0"
                        disabled={!isFunctionEditMode || !canEditFunctionSettings || isPlcSyncing}
                        onClick={() => handleSyncPlcData(3)}
                    >
                      D-3
                    </Button>
                    <Button
                        variant="outline"
                        className="h-10 px-4 border-gray-200 text-base text-blue-600 dark:text-green-500 dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-gray-200 hover:border-gray-300 hover:text-blue-700 bg-transparent m-0"
                        disabled={!isFunctionEditMode || !canEditFunctionSettings || isPlcSyncing}
                        onClick={() => handleSyncPlcData(4)}
                    >
                      D-4
                    </Button>
                    <Button
                        variant="outline"
                        className="h-10 px-4 border-gray-200 text-base text-blue-600 dark:text-green-500 dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-gray-200 hover:border-gray-300 hover:text-blue-700 bg-transparent m-0"
                        disabled={!isFunctionEditMode || !canEditFunctionSettings || isPlcSyncing}
                        onClick={() => handleResetReportData()}
                    >
                      데이터 초기화
                    </Button>
                    {/*<Button*/}
                    {/*    variant="outline"*/}
                    {/*    className="h-10 px-4 border-green-200 text-base text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-slate-800 hover:border-green-300 hover:text-green-600 bg-transparent m-0"*/}
                    {/*>*/}
                    {/*  시계 동기화*/}
                    {/*</Button>*/}
                  </div>
                </div>
              </div>
                </div>
                <div className="flex-1">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1">연결장치</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl space-y-2 border-1 border-gray-200 dark:border-slate-600">
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="dc30000"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.DC30000 : connectionDevices.DC30000}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', 'DC30000') : handleConnectionDeviceChange("DC30000")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="dc30000" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          DC30000
                        </Label>
                      </div>
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="samsung-dms"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.삼성DMS : connectionDevices.삼성DMS}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', '삼성DMS') : handleConnectionDeviceChange("삼성DMS")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="samsung-dms" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          삼성DMS
                        </Label>
                      </div>
                      <div className={`flex items-center justify-between h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                              id="kepco-rcu"
                              checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.한전RCU : connectionDevices.한전RCU}
                              onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', '한전RCU') : handleConnectionDeviceChange("한전RCU")}
                              disabled={!isFunctionEditMode || !canEditFunctionSettings}
                          />
                          <Label htmlFor="kepco-rcu" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                            한전RCU
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className={`text-sm ${(isFunctionEditMode ? tempFunctionSettings.connectionDevices?.한전RCU : connectionDevices.한전RCU) ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                            개수:
                          </span>
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            value={isFunctionEditMode ? tempFunctionSettings.connectionDeviceCounts?.한전RCU : connectionDeviceCounts.한전RCU}
                            onChange={(e) => {
                              const count = Math.max(0, parseInt(e.target.value) || 0);
                              if (isFunctionEditMode) {
                                handleTempFunctionSettingChange('connectionDeviceCounts', { device: '한전RCU', count });
                              } else {
                                handleConnectionDeviceCountChange('한전RCU', count);
                              }
                            }}
                            className={`w-16 h-6 text-center text-sm ${(isFunctionEditMode ? tempFunctionSettings.connectionDevices?.한전RCU : connectionDevices.한전RCU) ? 'bg-white dark:bg-slate-700' : 'bg-gray-100 dark:bg-slate-600'}`}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings || !(isFunctionEditMode ? tempFunctionSettings.connectionDevices?.한전RCU : connectionDevices.한전RCU)}
                          />
                        </div>
                      </div>
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="wired1"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.유선1 : connectionDevices.유선1}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', '유선1') : handleConnectionDeviceChange("유선1")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="wired1" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          유선1
                        </Label>
                      </div>
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="wireless1"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.무선1 : connectionDevices.무선1}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', '무선1') : handleConnectionDeviceChange("무선1")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="wireless1" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          무선1
                        </Label>
                      </div>
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="wireless2"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.무선2 : connectionDevices.무선2}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', '무선2') : handleConnectionDeviceChange("무선2")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="wireless2" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          무선2
                        </Label>
                      </div>
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="wireless3"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.무선3 : connectionDevices.무선3}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', '무선3') : handleConnectionDeviceChange("무선3")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="wireless3" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          무선3
                        </Label>
                      </div>
                      <div className={`flex items-center h-11 space-x-2 p-2 bg-white dark:bg-slate-800 rounded border ${!isFunctionEditMode || !canEditFunctionSettings ? 'opacity-50' : ''}`}>
                        <Checkbox
                            id="lgacp"
                            checked={isFunctionEditMode ? tempFunctionSettings.connectionDevices?.LGACP : connectionDevices.LGACP}
                            onCheckedChange={() => isFunctionEditMode ? handleTempFunctionSettingChange('connectionDevices', 'LGACP') : handleConnectionDeviceChange("LGACP")}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        />
                        <Label htmlFor="lgacp" className={`text-base font-medium ${!isFunctionEditMode || !canEditFunctionSettings ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          LGACP
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1 mt-2">장치 제어</h3>
                    <div className="grid grid-cols-2 gap-2.5 bg-gray-50 dark:bg-slate-700 p-3 rounded-xl space-y-2 border-1 border-gray-200 dark:border-slate-600">
                        <Button
                            id="save-reset"
                            variant="outline"
                            // className="h-10 px-4 border-red-200 text-base text-red-600 hover:bg-red-50 hover:border-red-300 bg-transparent m-0"
                            className="h-10 px-4 border-red-200 text-base text-red-600 dark:text-[#FF2400] dark:bg-slate-800 dark:hover:bg-slate-500 hover:bg-red-50 hover:border-red-300 hover:text-red-600 bg-transparent m-0"
                            onClick={handleReset}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        >
                          저장영역 초기화
                        </Button>
                        <Button
                            id="setting-reset"
                            variant="outline"
                            className="h-10 px-4 border-red-200 text-base text-red-600 dark:text-[#FF2400] hover:bg-red-50 dark:bg-slate-800 hover:border-red-300 hover:text-red-600 bg-transparent m-0"
                            onClick={handleReset}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        >
                          설정값 초기화
                        </Button>
                        <Button
                            id="block-reset"
                            variant="outline"
                            className="h-10 px-4 border-red-200 text-base text-red-600 dark:text-[#FF2400] hover:bg-red-50 dark:bg-slate-800 hover:border-red-300 hover:text-red-600 bg-transparent m-0"
                            onClick={handleReset}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        >
                          차단 초기화
                        </Button>
                        <Button
                            id="factory-reset"
                            variant="outline"
                            className="h-10 px-4 border-red-200 text-base text-red-600 dark:text-[#FF2400] hover:bg-red-50 dark:bg-slate-800 hover:border-red-300 hover:text-red-600 bg-transparent m-0"
                            onClick={handleReset}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        >
                          출고(공장) 초기화
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 px-4 border-green-200 text-base text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-slate-800 hover:border-green-300 hover:text-green-600 bg-transparent m-0"
                            onClick={handleEoiSync}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        >
                          EOI 동기화
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 px-4 border-green-200 text-base text-green-600 dark:text-green-400 hover:bg-green-50 dark:bg-slate-800 hover:border-green-300 hover:text-green-600 bg-transparent m-0"
                            onClick={handleTimeSync}
                            disabled={!isFunctionEditMode || !canEditFunctionSettings}
                        >
                          시계 동기화
                        </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}