// 전역 상태 관리
export let isGroupEditModeGlobal = false;

export const setGroupEditMode = (value) => {
  isGroupEditModeGlobal = value;
}; 