import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Target } from 'lucide-react';
import axios from '../api/axios_util';
import { getApiUrl } from '../lib/config';
import { toast } from 'sonner';

const TargetPowerModal = ({ 
  isOpen, 
  onClose, 
  targetPowerLevels, 
  seasonalTargetPower, 
  publicHolidayLevel,
  isControlAble,
  isLoading,
  onSave,
  onCancel,
  setTargetPowerLevels,
  setSeasonalTargetPower
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [tempTargetPowerSettings, setTempTargetPowerSettings] = useState({
    targetPowerLevels: [],
    seasonalTargetPower: {
      현재계절: '봄',
      전체라벨번경: '',
      hourlySettings: []
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  // 목표전력설정 저장 API 함수
  const saveTargetPowerSetting = async (data) => {
    try {
      // schedule_dynamic.js의 saveTargetPowerSetting 함수 사용
      // customerId는 하드코딩된 1 사용
      const { saveTargetPowerSetting: saveTargetPowerSettingAPI } = await import('../api/schedule_dynamic');
      const response = await saveTargetPowerSettingAPI(1, data);
      return response;
    } catch (error) {
      console.error('목표전력설정 저장 API 오류:', error);
      throw error;
    }
  };

  // 모달이 열릴 때 초기 데이터 설정
  useEffect(() => {
    if (isOpen) {
      setTempTargetPowerSettings({
        targetPowerLevels: [...targetPowerLevels],
        seasonalTargetPower: { 
          ...seasonalTargetPower,
          전체라벨번경: seasonalTargetPower.전체라벨번경 || ''
        }
      });
      setIsEditMode(true); // 항상 수정 모드로 시작
    }
  }, [isOpen, targetPowerLevels, seasonalTargetPower]);

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setTempTargetPowerSettings({
      targetPowerLevels: [...targetPowerLevels],
      seasonalTargetPower: { ...seasonalTargetPower }
    });
  };

  const handleTempTargetPowerLevelChange = (index, value) => {
    const newLevels = [...tempTargetPowerSettings.targetPowerLevels];
    newLevels[index] = { ...newLevels[index], value: parseFloat(value) || 0 };
    setTempTargetPowerSettings(prev => ({
      ...prev,
      targetPowerLevels: newLevels
    }));
  };

  const handleTempSeasonalHourlyChange = (hour, value) => {
    const currentHourlySettings = tempTargetPowerSettings.seasonalTargetPower?.hourlySettings || [];
    const newHourlySettings = currentHourlySettings.map(setting =>
      setting.hour === hour ? { ...setting, value: parseInt(value) || 0 } : setting
    );
    setTempTargetPowerSettings(prev => ({
      ...prev,
      seasonalTargetPower: {
        ...prev.seasonalTargetPower,
        hourlySettings: newHourlySettings
      }
    }));
  };

  const handleTempChangeAllLabels = () => {
    const newValue = parseInt(tempTargetPowerSettings.seasonalTargetPower?.전체라벨번경) || 0;
    const currentHourlySettings = tempTargetPowerSettings.seasonalTargetPower?.hourlySettings || [];
    const newHourlySettings = currentHourlySettings.map(setting => ({
      ...setting,
      value: newValue
    }));
    setTempTargetPowerSettings(prev => ({
      ...prev,
      seasonalTargetPower: {
        ...prev.seasonalTargetPower,
        hourlySettings: newHourlySettings
      }
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // 수정 모드에서는 임시 설정 사용, 아니면 현재 설정 사용
      const currentTargetPowerLevels = isEditMode 
        ? tempTargetPowerSettings.targetPowerLevels 
        : targetPowerLevels;
      const currentSeasonalTargetPower = isEditMode 
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
      
      // 전체 목표전력설정 저장
      await saveTargetPowerSetting(requestData);
      
      // 수정 모드인 경우 상태 업데이트
      if (isEditMode) {
        setTargetPowerLevels(currentTargetPowerLevels);
        setSeasonalTargetPower(currentSeasonalTargetPower);
        setIsEditMode(false);
        setTempTargetPowerSettings({
          targetPowerLevels: [],
          seasonalTargetPower: {}
        });
      }
      
      toast.success('목표전력설정이 성공적으로 저장되었습니다.');
      
      // 저장 성공 후 모달 닫기
      onClose();
      
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
        const currentTargetPowerLevels = isEditMode 
          ? tempTargetPowerSettings.targetPowerLevels 
          : targetPowerLevels;
        const currentSeasonalTargetPower = isEditMode 
          ? tempTargetPowerSettings.seasonalTargetPower 
          : seasonalTargetPower;
        
        const tempData = {
          targetPowerLevels: currentTargetPowerLevels,
          seasonalTargetPower: currentSeasonalTargetPower,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`targetPowerSetting_${customerId}`, JSON.stringify(tempData));
        
        // 수정 모드인 경우 상태 업데이트
        if (isEditMode) {
          setTargetPowerLevels(currentTargetPowerLevels);
          setSeasonalTargetPower(currentSeasonalTargetPower);
          setIsEditMode(false);
          setTempTargetPowerSettings({
            targetPowerLevels: [],
            seasonalTargetPower: {}
          });
        }
        
        toast.success('목표전력설정이 임시로 저장되었습니다.');
      } else if (error.message.includes('400')) {
        // 400 에러 시에도 임시 저장
        const currentTargetPowerLevels = isEditMode 
          ? tempTargetPowerSettings.targetPowerLevels 
          : targetPowerLevels;
        const currentSeasonalTargetPower = isEditMode 
          ? tempTargetPowerSettings.seasonalTargetPower 
          : seasonalTargetPower;
        
        const tempData = {
          targetPowerLevels: currentTargetPowerLevels,
          seasonalTargetPower: currentSeasonalTargetPower,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`targetPowerSetting_${customerId}`, JSON.stringify(tempData));
        
        // 수정 모드인 경우 상태 업데이트
        if (isEditMode) {
          setTargetPowerLevels(currentTargetPowerLevels);
          setSeasonalTargetPower(currentSeasonalTargetPower);
          setIsEditMode(false);
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
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-5xl max-h-[90vh] dark:bg-slate-800 overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 dark:text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-green-600" />
              목표전력설정
            </DialogTitle>
            <DialogDescription>
              라벨별 목표전력과 계절별 시간대 설정을 관리할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">데이터를 불러오는 중...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-4xl max-h-[90vh] dark:bg-slate-800 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600 dark:text-green-600" />
            목표전력설정
          </DialogTitle>
          {/*<DialogDescription>*/}
          {/*  라벨별 목표전력과 계절별 시간대 설정을 관리할 수 있습니다.*/}
          {/*</DialogDescription>*/}
        </DialogHeader>
        
        <div className="space-y-6">
          {/*<div className="flex items-center justify-between">*/}
          {/*  <div className="text-xl text-gray-900 flex items-center gap-2">*/}
          {/*    <Target className="h-5 w-5 text-blue-600 dark:text-green-600" />*/}
          {/*    목표전력설정*/}
          {/*  </div>*/}
          {/*  {!isEditMode ? (*/}
          {/*    <Button*/}
          {/*      onClick={handleStartEdit}*/}
          {/*      className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-4"*/}
          {/*      disabled={!isControlAble}*/}
          {/*    >*/}
          {/*      수정*/}
          {/*    </Button>*/}
          {/*  ) : (*/}
          {/*    <div className="flex gap-2">*/}
          {/*      <Button*/}
          {/*        onClick={handleCancelEdit}*/}
          {/*        variant="outline"*/}
          {/*        className="px-4"*/}
          {/*      >*/}
          {/*        취소*/}
          {/*      </Button>*/}
          {/*      <Button*/}
          {/*        onClick={handleSave}*/}
          {/*        className="bg-green-600 hover:bg-green-700 text-white px-4"*/}
          {/*        disabled={isSaving}*/}
          {/*      >*/}
          {/*        {isSaving ? "저장 중..." : "저장"}*/}
          {/*      </Button>*/}
          {/*    </div>*/}
          {/*  )}*/}
          {/*</div>*/}
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-6">
              {/* 라벨 설정 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1">라벨 설정 (1~10)</h3>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl border-1 border-gray-200 dark:border-slate-600">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(tempTargetPowerSettings.targetPowerLevels.length > 0 ? tempTargetPowerSettings.targetPowerLevels : (targetPowerLevels.length > 0 ? targetPowerLevels : Array.from({ length: 10 }, (_, i) => ({ level: i + 1, value: 300000 })))).map((level, index) => (
                      <div key={level.level} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-green-800 w-6 text-center bg-blue-100 dark:bg-green-50 rounded px-1 py-0.5 flex-shrink-0">
                          {level.level}
                        </span>
                        <div className="relative flex-1">
                          <Input
                            value={level.value >= 1000 ? (level.value / 1000).toFixed(0) : level.value}
                            onChange={(e) => {
                              const inputValue = parseFloat(e.target.value) || 0;
                              // 입력값이 1000 이상이면 W 단위로, 그렇지 않으면 kW 단위로 처리
                              const valueInW = inputValue >= 1000 ? inputValue : inputValue * 1000;
                              handleTempTargetPowerLevelChange(index, valueInW);
                            }}
                            className="text-center font-medium text-base h-8 pr-10"
                          />
                          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-medium">(kW)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-slate-600">
                    <Label className="text-sm font-medium text-gray-600 dark:text-white flex-shrink-0">공유일연번호</Label>
                    <Input
                      value={publicHolidayLevel}
                      onChange={(e) => {/* 공유일연번호 변경 로직 */}}
                      className="w-16 text-center font-medium text-base h-8"
                    />
                  </div>
                </div>
              </div>

              {/* 계절별 목표전력 */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-700 dark:text-white mb-1">계절별 목표전력</h3>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-xl space-y-4 border-1 border-gray-200 dark:border-slate-600">
                  {/* 계절 선택 */}
                  <div className="grid grid-cols-4 gap-2">
                    {["봄", "여름", "가을", "겨울"].map((season) => {
                      const currentSeasonalData = tempTargetPowerSettings.seasonalTargetPower?.hourlySettings?.length > 0 
                        ? tempTargetPowerSettings.seasonalTargetPower 
                        : seasonalTargetPower;
                      const selectedSeason = currentSeasonalData.현재계절;
                      const isSelected = selectedSeason === season;

                      return (
                        <Button
                          key={season}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className={
                            `h-8 text-sm
                            ${
                              isSelected
                                ? "dark:!bg-green-600 dark:hover:!bg-green-700 dark:!text-white dark:!border-violet-500"
                                : "dark:!border-neutral-600 dark:!text-neutral-300"
                            }`
                          }
                          onClick={() => {
                            setTempTargetPowerSettings(prev => ({
                              ...prev,
                              seasonalTargetPower: {...prev.seasonalTargetPower, 현재계절: season}
                            }));
                          }}
                        >
                          {season}
                        </Button>
                      );
                    })}
                  </div>

                  {/* 전체 라벨 번경 */}
                  <div className="flex items-center p-3 bg-white dark:bg-slate-800 rounded border space-y-2 gap-6">
                    <div className="text-sm text-gray-600 dark:text-white mb-0">
                      현재계절 :
                      <span className="text-blue-600 dark:text-green-600 font-medium">
                        {tempTargetPowerSettings.seasonalTargetPower?.hourlySettings?.length > 0 
                          ? tempTargetPowerSettings.seasonalTargetPower.현재계절 
                          : seasonalTargetPower?.현재계절 || '봄'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-gray-600 dark:text-white flex-shrink-0">전체라벨번경 :</span>
                      <Input
                        value={tempTargetPowerSettings.seasonalTargetPower?.hourlySettings?.length > 0 
                          ? tempTargetPowerSettings.seasonalTargetPower.전체라벨번경 
                          : seasonalTargetPower?.전체라벨번경 || ''}
                        onChange={(e) => {
                          setTempTargetPowerSettings(prev => ({
                            ...prev,
                            seasonalTargetPower: { 
                              ...prev.seasonalTargetPower, 
                              전체라벨번경: e.target.value 
                            }
                          }));
                        }}
                        className="w-12 text-center text-sm h-6"
                      />
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 h-6 px-2 text-sm"
                        onClick={handleTempChangeAllLabels}
                        disabled={!isControlAble}
                      >
                        확인
                      </Button>
                    </div>
                  </div>

                  {/* 시간별 설정 */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-white">시간대별 설정</h4>
                    <div className="bg-white dark:bg-slate-800 rounded border max-h-48 overflow-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-1 p-2">
                             {((tempTargetPowerSettings.seasonalTargetPower?.hourlySettings?.length > 0 
                               ? tempTargetPowerSettings.seasonalTargetPower.hourlySettings 
                               : (seasonalTargetPower?.hourlySettings?.length > 0 
                                 ? seasonalTargetPower.hourlySettings 
                                 : Array.from({ length: 24 }, (_, i) => ({ hour: i, value: 1 })))) || []).map((setting) => (
                          <div key={setting.hour} className="flex items-center justify-center gap-2 sm:gap-1">
                            <span className="text-sm text-gray-600 dark:text-white w-8 font-medium flex-shrink-0">{String(setting.hour).padStart(2, '0')}시</span>
                            <Input
                              value={setting.value}
                              onChange={(e) => handleTempSeasonalHourlyChange(setting.hour, e.target.value)}
                              className="w-10 text-center text-sm h-6"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-blue-600 dark:text-green-500 text-right">라벨1~10을 선택하세요.</div>
                </div>
              </div>
            </div>

            {/* 저장/취소 버튼 */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-slate-600">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="px-4"
                disabled={isSaving}
              >
                취소
              </Button>
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 text-white px-4"
                disabled={isSaving || !isControlAble}
              >
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TargetPowerModal;
