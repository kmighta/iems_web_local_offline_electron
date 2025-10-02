import axios from "./axios_util";

/**
 * 전체 조직과 알림 목록 조회 (페이징)
 * @param {number} page - 페이지 번호 (0부터 시작)
 * @param {number} size - 페이지 크기
 * @returns {Promise} API 응답 데이터
 */
async function getAllOrganizationsWithNotifications(page = 0, size = 10) {
    try {
        const res = await axios.get("/noti/organizations", {
            params: {
                page: page,
                size: size
            }
        });
        if (res.status !== 200) {
            throw new Error("전체 조직 및 알림 목록 조회에 실패했습니다");
        }
        return res.data; // 직접 data 반환 (resultCode, resultMessage, data 구조)
    } catch (error) {
        console.error("전체 조직 및 알림 목록 조회 오류:", error);
        throw error;
    }
}

/**
 * Organization ID 기준 조직과 알림 목록 조회 (페이징)
 * @param {string} organizationId - 사업장 UUID ID
 * @param {number} page - 페이지 번호 (0부터 시작)
 * @param {number} size - 페이지 크기
 * @returns {Promise} API 응답 데이터
 */
async function getOrganizationWithNotificationsByOrganizationId(organizationId, page = 0, size = 10) {
    try {
        const res = await axios.get(`/noti/organizations/${organizationId}`, {
            params: {
                page: page,
                size: size
            }
        });
        if (res.status !== 200) {
            throw new Error("Organization ID 기준 조직 및 알림 목록 조회에 실패했습니다");
        }
        return res.data; // 직접 data 반환 (resultCode, resultMessage, data 구조)
    } catch (error) {
        console.error("Organization ID 기준 조직 및 알림 목록 조회 오류:", error);
        throw error;
    }
}

export { 
    getAllOrganizationsWithNotifications, 
    getOrganizationWithNotificationsByOrganizationId 
};
