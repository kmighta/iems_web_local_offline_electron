import axios from "./axios_util";

// 기존 함수 - 하위 호환성을 위해 유지 (모든 사업장을 첫 번째 페이지로 조회)
async function getOrganizationList() {
    var res = await axios.get("/organizations", {
        params: {
            page: 0,
            size: 1000, // 충분히 큰 값으로 설정하여 모든 데이터 조회
            sort: "createdAt,desc"
        }
    });
    if (res.status !== 200) {
        throw new Error("Failed to get organization list");
    }
    // 페이지네이션 응답에서 content만 반환 (기존 호환성 유지)
    return res.data.content || res.data;
}

// 새로운 페이지네이션 지원 함수
async function getOrganizationListPaginated(page = 0, size = 10, sort = "createdAt,desc", userId = null) {
    const params = {
        page,
        size,
        sort
    };
    
    if (userId) {
        params.userId = userId;
    }
    
    var res = await axios.get("/organizations", { params });
    if (res.status !== 200) {
        throw new Error("Failed to get organization list");
    }
    return res.data; // 전체 페이지네이션 응답 반환
}

// 특정 사용자의 사업장 목록 조회 (페이지네이션 지원)
async function getOrganizationByUserId(userId, page = 0, size = 10, sort = "createdAt,desc") {
    return getOrganizationListPaginated(page, size, sort, userId);
}

async function getOrganization(id) {
    var res = await axios.get(`/organizations/${id}`);
    if (res.status !== 200) {
        throw new Error("Failed to get organization");
    }
    return res.data;
}

async function createOrganization(organization) {
    var res = await axios.post("/organizations", organization);
    if (res.status !== 200) {
        throw new Error("Failed to create organization");
    }
    return res.data;
}

async function createOrganizationByOwner(organization, ownerOrgId) {
    var res = await axios.post("/organizations/owner", organization, {
        params: {
            ownerId: ownerOrgId
        }
    });
    if (res.status !== 200) {
        throw new Error("Failed to create organization by owner");
    }
    return res.data;
}

async function updateOrganization(id, organization) {
    var res = await axios.put(`/organizations/${id}`, organization);
    if (res.status !== 200) {
        throw new Error("Failed to update organization");
    }
    return res.data;
}

async function deleteOrganization(id) {
    var res = await axios.delete(`/organizations/${id}`);
    if (res.status !== 200) {
        throw new Error("Failed to delete organization");
    }
    return res.data;
}

async function addPlcToOrganization(orgId, address, plcSerial) {
    var res = await axios.put("/organizations/plc", { orgId, address, plcSerial });
    if (res.status !== 200) {
        throw new Error("Failed to add PLC to organization");
    }
    return res.data;
}

async function updatePlcAddress(orgId, address, plcSerial) {
    var res = await axios.put("/organizations/plc", { orgId, address, plcSerial });
    if (res.status !== 200) {
        throw new Error("Failed to update PLC address");
    }
    return res.data;
}

// PLC 장치 등록 API
async function registerPlcDevice(plcAddress, serialNumber) {
    try {
        // PLC 주소에서 IP와 포트 분리
        const [ip, port] = plcAddress.split(':');
        const apiUrl = `http://${ip}:${port}/api/register/device`;
        
        const response = await axios.post(apiUrl, null, {
            params: {
                serialNumber: serialNumber
            },
            timeout: 10000, // 10초 타임아웃
        });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            throw new Error(`요청 실패 (${response.status})`);
        }
    } catch (error) {
        if (error.response && error.response.status === 500) {
            throw new Error('서버 내부 오류 (500)');
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            throw new Error('서버와 연결할 수 없습니다');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            throw new Error('서버와 연결할 수 없습니다');
        }
        throw error;
    }
}

export { 
    getOrganizationList, 
    getOrganizationListPaginated, 
    getOrganizationByUserId, 
    getOrganization, 
    createOrganization, 
    createOrganizationByOwner,
    updateOrganization, 
    deleteOrganization, 
    addPlcToOrganization, 
    updatePlcAddress, 
    registerPlcDevice 
};
