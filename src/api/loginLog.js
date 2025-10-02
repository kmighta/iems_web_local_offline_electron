import axios from "./axios_util";

/**
 * 모든 사용자의 로그인 로그 조회 (페이징)
 * @param {string} userId - 필터링할 사용자 ID (선택사항)
 * @param {number} page - 페이지 번호 (0부터 시작)
 * @param {number} size - 페이지 크기
 * @returns {Promise} API 응답 데이터
 */
async function getAllUserLoginReport(userId = null, page = 0, size = 20) {
    try {
        const params = {
            page: page,
            size: size
        };
        
        // userId가 있으면 파라미터에 추가
        if (userId) {
            params.userId = userId;
        }

        const res = await axios.get("/noti/login/all", { params });
        
        if (res.status !== 200) {
            throw new Error("로그인 기록 조회에 실패했습니다");
        }
        return res.data; // 직접 data 반환 (resultCode, resultMessage, data 구조)
    } catch (error) {
        console.error("로그인 기록 조회 오류:", error);
        throw error;
    }
}

/**
 * 특정 사용자의 로그인 로그 조회
 * @param {string} userId - 사용자 ID
 * @returns {Promise} API 응답 데이터
 */
async function getUserLoginReport(userId) {
    try {
        const res = await axios.get(`/noti/login/user/${userId}`);
        
        if (res.status !== 200) {
            throw new Error("사용자 로그인 기록 조회에 실패했습니다");
        }
        return res.data; // 직접 data 반환 (resultCode, resultMessage, data 구조)
    } catch (error) {
        console.error("사용자 로그인 기록 조회 오류:", error);
        throw error;
    }
}

/**
 * 특정 조직의 로그인 로그 조회 (페이징)
 * @param {string} orgId - 조직 ID
 * @param {number} page - 페이지 번호 (0부터 시작)
 * @param {number} size - 페이지 크기
 * @returns {Promise} API 응답 데이터
 */
async function getOrganizationLoginReport(orgId, page = 0, size = 20) {
    try {
        const params = {
            page: page,
            size: size
        };

        const res = await axios.get(`/noti/login/org/${orgId}`, { params });
        
        if (res.status !== 200) {
            throw new Error("기관 로그인 기록 조회에 실패했습니다");
        }
        return res.data; // 직접 data 반환 (resultCode, resultMessage, data 구조)
    } catch (error) {
        console.error("기관 로그인 기록 조회 오류:", error);
        throw error;
    }
}

/**
 * 로그인 기본 정보 조회 (조직 목록, 사용자 목록)
 * @returns {Promise} API 응답 데이터
 */
async function getUserLoginBaseInfo() {
    try {
        const res = await axios.get("/noti/login/base-info");
        
        if (res.status !== 200) {
            throw new Error("로그인 기본 정보 조회에 실패했습니다");
        }
        return res.data; // 직접 data 반환 (resultCode, resultMessage, data 구조)
    } catch (error) {
        console.error("로그인 기본 정보 조회 오류:", error);
        throw error;
    }
}

export { 
    getAllUserLoginReport, 
    getUserLoginReport,
    getOrganizationLoginReport,
    getUserLoginBaseInfo
};
