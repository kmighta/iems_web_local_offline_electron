import { getApiUrl } from '@/lib/config';

// 고객전력정보 조회
export const getCustomerPowerInfo = async (customerId) => {
  try {
    const response = await fetch(getApiUrl(`/api/customer-power-info/${customerId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('고객전력정보 조회 실패:', error);
    throw error;
  }
};

// 고객전력정보 수정
export const updateCustomerPowerInfo = async (customerId, data) => {
  try {
    const response = await fetch(getApiUrl(`/api/customer-power-info/${customerId}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('고객전력정보 수정 실패:', error);
    throw error;
  }
};

// 공휴일설정 조회
export const getHolidaySetting = async (customerId) => {
  try {
    const response = await fetch(getApiUrl(`/api/holiday-setting/${customerId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('공휴일설정 조회 실패:', error);
    throw error;
  }
};

// 공휴일설정 저장
export const saveHolidaySetting = async (customerId, data) => {
  try {
    const response = await fetch(getApiUrl(`/api/holiday-setting/${customerId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('공휴일설정 저장 실패:', error);
    throw error;
  }
};

// 계절설정 조회
export const getSeasonSetting = async (customerId) => {
  try {
    const response = await fetch(getApiUrl(`/api/season-setting/${customerId}/season-settings`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('계절설정 조회 실패:', error);
    throw error;
  }
};

// 계절설정 저장
export const saveSeasonSetting = async (customerId, data) => {
  try {
    const response = await fetch(getApiUrl(`/api/season-setting/${customerId}/season-settings`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('계절설정 저장 실패:', error);
    throw error;
  }
}; 

// 목표전력설정 API 함수들
export const getTargetPowerSetting = async (customerId) => {
  try {
    const response = await fetch(getApiUrl(`/api/target-power-setting/${customerId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('목표전력설정 조회 실패:', error);
    throw error;
  }
};

export const saveTargetPowerSetting = async (customerId, data) => {
  try {
    console.log('API 요청 URL:', getApiUrl(`/api/target-power-setting/${customerId}`));
    console.log('API 요청 데이터:', data);
    
    const response = await fetch(getApiUrl(`/api/target-power-setting/${customerId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    console.log('API 응답 상태:', response.status);
    console.log('API 응답 헤더:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      // 응답 본문이 있으면 에러 메시지에 포함
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorMessage += ` - ${errorBody}`;
          console.error('서버 에러 응답:', errorBody);
        }
      } catch (e) {
        console.error('에러 응답 본문 읽기 실패:', e);
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    const result = await response.json();
    console.log('API 성공 응답:', result);
    return result;
  } catch (error) {
    console.error('목표전력설정 저장 실패:', error);
    throw error;
  }
};

export const getTargetPowerLabels = async (customerId) => {
  try {
    const response = await fetch(getApiUrl(`/api/target-power-setting/${customerId}/target-power-labels`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('라벨별 목표전력 조회 실패:', error);
    throw error;
  }
};

export const saveTargetPowerLabels = async (customerId, labels) => {
  try {
    const response = await fetch(getApiUrl(`/api/target-power-setting/${customerId}/target-power-labels`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labels)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('라벨별 목표전력 저장 실패:', error);
    throw error;
  }
};

export const getTargetPowerByHours = async (customerId, season = null) => {
  try {
    let url = getApiUrl(`/api/target-power-setting/${customerId}/target-power-by-hours`);
    if (season) {
      url += `?season=${season}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('계절별 시간대 목표전력 조회 실패:', error);
    throw error;
  }
};

export const saveTargetPowerByHours = async (customerId, hourlyData) => {
  try {
    const response = await fetch(getApiUrl(`/api/target-power-setting/${customerId}/target-power-by-hours`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hourlyData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('계절별 시간대 목표전력 저장 실패:', error);
    throw error;
  }
}; 