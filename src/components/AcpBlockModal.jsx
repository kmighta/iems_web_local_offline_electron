import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group.js";

const AcpBlockModal = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    blockInterval: "10",      // 차단간격(초)
    returnInterval: "10",     // 복귀간격(초)
    blockType: "deduction",   // 차단율 타입 (deduction: 차감방식, ratio: 비율방식)
    blockValue: "8",          // 차단값 (차감량 또는 차단율)
    blockRate: "5",           // 차단율(%) - 1-10 범위
    sleepTime1: "3",          // Sleep Time1(초)
    sleepTime2: "5",          // Sleep Time2(초)
    sleepTime3: "35"          // Sleep Time3(초)
  });

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    console.log('ACP차단설정 저장:', settings);
    console.log('차단율 타입:', settings.blockType === "deduction" ? "차감방식" : "비율방식");
    console.log('차단값:', settings.blockValue);
    // 여기에 실제 저장 API 호출 로직 추가
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-blue-50 dark:bg-slate-800">
        <DialogHeader className="flex flex-row justify-between items-center">
          <DialogTitle className="text-xl font-bold text-black dark:text-white">
            ACP차단설정
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 p-1"
          >
          </Button>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 안내 문구 */}
          {/*<div className="space-y-2 text-sm text-black dark:text-white">*/}
          {/*  <p>Sleep Time은 네트워크 환경에 따라 셋팅하시기 바랍니다.</p>*/}
          {/*  <p>차단간격, 복귀간격, 차단율은 에어컨 설비에 맞게 셋팅하셔야 합니다.</p>*/}
          {/*</div>*/}

          {/* 상단 설정 그룹 */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-medium text-black dark:text-white">
                  차단간격(초)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="3600"
                  value={settings.blockInterval}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 숫자만 허용하고 1-3600 범위 내에서만 입력 가능
                    if (value === '' || (value >= 1 && value <= 3600)) {
                      handleInputChange('blockInterval', value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // 숫자, 백스페이스, 삭제, 화살표 키만 허용
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full h-10 text-center"
                  placeholder="1-3600초"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium text-black dark:text-white">
                  복귀간격(초)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="3600"
                  value={settings.returnInterval}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 숫자만 허용하고 1-3600 범위 내에서만 입력 가능
                    if (value === '' || (value >= 1 && value <= 3600)) {
                      handleInputChange('returnInterval', value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // 숫자, 백스페이스, 삭제, 화살표 키만 허용
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full h-10 text-center"
                  placeholder="1-3600초"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-medium text-black dark:text-white">
                  Sleep Time(초)
                </Label>
                <Input
                    type="number"
                    min="1"
                    max="300"
                    value={settings.sleepTime1}
                    onChange={(e) => {
                      const value = e.target.value;
                      // 숫자만 허용하고 1-300 범위 내에서만 입력 가능
                      if (value === '' || (value >= 1 && value <= 300)) {
                        handleInputChange('sleepTime1', value);
                      }
                    }}
                    onKeyDown={(e) => {
                      // 숫자, 백스페이스, 삭제, 화살표 키만 허용
                      if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full h-10 text-center"
                    placeholder="1-300초"
                />
              </div>

              {/*<div className="space-y-2">*/}
              {/*  <Label className="text-sm font-medium text-black dark:text-white">*/}
              {/*    차단율(%)*/}
              {/*  </Label>*/}
              {/*  <Input*/}
              {/*    value={settings.blockRate}*/}
              {/*    onChange={(e) => handleInputChange('blockRate', e.target.value)}*/}
              {/*    className="w-full h-10 text-center"*/}
              {/*  />*/}
              {/*</div>*/}
            </div>
          </div>

          {/* 하단 Sleep Time 설정 그룹 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base font-medium text-black dark:text-white">
                  차단율방식 설정
                </Label>
                <RadioGroup
                  value={settings.blockType}
                  onValueChange={(value) => handleInputChange('blockType', value)}
                  className="flex flex-row items-center"
                >
                  <div className="flex items-center space-x-2 h-10">
                    <RadioGroupItem value="deduction" id="deduction" />
                    <Label htmlFor="deduction" className="text-base text-black dark:text-white">
                      차감방식
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ratio" id="ratio" />
                    <Label htmlFor="ratio" className="text-base text-black dark:text-white">
                      비율방식
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-medium text-black dark:text-white">
                  차단율(%)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.blockRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 숫자만 허용하고 1-10 범위 내에서만 입력 가능
                    if (value === '' || (value >= 1 && value <= 10)) {
                      handleInputChange('blockRate', value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // 숫자, 백스페이스, 삭제, 화살표 키만 허용
                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  className="w-full h-10 text-center"
                  placeholder="1-10 입력"
                />
              </div>


              {/*<div className="space-y-2">*/}
              {/*  <Label className="text-sm font-medium text-black dark:text-white">*/}
              {/*    Sleep Time(초)*/}
              {/*  </Label>*/}
              {/*  <Input*/}
              {/*    value={settings.sleepTime1}*/}
              {/*    onChange={(e) => handleInputChange('sleepTime1', e.target.value)}*/}
              {/*    className="w-full h-10 text-center"*/}
              {/*  />*/}
              {/*</div>*/}
              {/*<div className="space-y-2">*/}
              {/*  <Label className="text-sm font-medium text-black dark:text-white">*/}
              {/*    Sleep Time2(초)*/}
              {/*  </Label>*/}
              {/*  <Input*/}
              {/*    value={settings.sleepTime2}*/}
              {/*    onChange={(e) => handleInputChange('sleepTime2', e.target.value)}*/}
              {/*    className="w-full h-10 text-center"*/}
              {/*  />*/}
              {/*</div>*/}
              {/*<div className="space-y-2">*/}
              {/*  <Label className="text-sm font-medium text-black dark:text-white">*/}
              {/*    Sleep Time3(초)*/}
              {/*  </Label>*/}
              {/*  <Input*/}
              {/*    value={settings.sleepTime3}*/}
              {/*    onChange={(e) => handleInputChange('sleepTime3', e.target.value)}*/}
              {/*    className="w-full h-10 text-center"*/}
              {/*  />*/}
              {/*</div>*/}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-center gap-4 pt-4">
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-8 py-2"
            >
              저장
            </Button>
            <Button
              onClick={handleCancel}
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2"
            >
              취소
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcpBlockModal;
