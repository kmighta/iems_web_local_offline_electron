import { getOrganizationAxios } from "./dynamic_axios";

// 조직별 동적 axios를 사용하는 Schedule API 함수들

// 고객전력정보 조회
export const getCustomerPowerInfo = async (customerId) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.get(`/customer-power-info/${customerId}`);
    return response.data?.data ?? response.data;
  } catch (error) {
    console.error('고객전력정보 조회 실패:', error);
    throw error;
  }
};

// 고객전력정보 수정
export const updateCustomerPowerInfo = async (customerId, data) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.put(`/customer-power-info/${customerId}`, data);
    return response.data;
  } catch (error) {
    console.error('고객전력정보 수정 실패:', error);
    throw error;
  }
};

// 공휴일설정 조회
export const getHolidaySetting = async (customerId) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.get(`/holiday-setting/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('공휴일설정 조회 실패:', error);
    throw error;
  }
};

// 공휴일설정 저장
export const saveHolidaySetting = async (customerId, data) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.post(`/holiday-setting/${customerId}`, data);
    return response.data;
  } catch (error) {
    console.error('공휴일설정 저장 실패:', error);
    throw error;
  }
};

// 계절설정 조회
export const getSeasonSetting = async (customerId) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.get(`/season-setting/${customerId}/season-settings`);
    return response.data;
  } catch (error) {
    console.error('계절설정 조회 실패:', error);
    throw error;
  }
};

// 계절설정 저장
export const saveSeasonSetting = async (customerId, data) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.post(`/season-setting/${customerId}/season-settings`, data);
    return response.data;
  } catch (error) {
    console.error('계절설정 저장 실패:', error);
    throw error;
  }
}; 

// 목표전력설정 조회
export const getTargetPowerSetting = async (customerId) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.get(`/target-power-setting/${customerId}`);
    return response.data;
  } catch (error) {
    console.error('목표전력설정 조회 실패:', error);
    throw error;
  }
};

// 목표전력설정 저장
export const saveTargetPowerSetting = async (customerId, data) => {
  try {
    const axios = getOrganizationAxios();
    console.log('API 요청 데이터:', data);
    
    const response = await axios.post(`/target-power-setting/${customerId}`, data);
    console.log('API 성공 응답:', response.data);
    return response.data;
  } catch (error) {
    console.error('목표전력설정 저장 실패:', error);
    throw error;
  }
};

// 목표전력 라벨 조회
export const getTargetPowerLabels = async (customerId) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.get(`/target-power-setting/${customerId}/target-power-labels`);
    return response.data;
  } catch (error) {
    console.error('라벨별 목표전력 조회 실패:', error);
    throw error;
  }
};

// 목표전력 라벨 저장
export const saveTargetPowerLabels = async (customerId, labels) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.post(`/target-power-setting/${customerId}/target-power-labels`, labels);
    return response.data;
  } catch (error) {
    console.error('라벨별 목표전력 저장 실패:', error);
    throw error;
  }
};

// 시간대별 목표전력 조회
export const getTargetPowerByHours = async (customerId, season = null) => {
  try {
    const axios = getOrganizationAxios();
    const params = season ? { season } : {};
    const response = await axios.get(`/target-power-setting/${customerId}/target-power-by-hours`, { params });
    return response.data;
  } catch (error) {
    console.error('계절별 시간대 목표전력 조회 실패:', error);
    throw error;
  }
};

// 시간대별 목표전력 저장
export const saveTargetPowerByHours = async (customerId, hourlyData) => {
  try {
    const axios = getOrganizationAxios();
    const response = await axios.post(`/target-power-setting/${customerId}/target-power-by-hours`, hourlyData);
    return response.data;
  } catch (error) {
    console.error('계절별 시간대 목표전력 저장 실패:', error);
    throw error;
  }
};

export default {
  getCustomerPowerInfo,
  updateCustomerPowerInfo,
  getHolidaySetting,
  saveHolidaySetting,
  getSeasonSetting,
  saveSeasonSetting,
  getTargetPowerSetting,
  saveTargetPowerSetting,
  getTargetPowerLabels,
  saveTargetPowerLabels,
  getTargetPowerByHours,
  saveTargetPowerByHours
};
