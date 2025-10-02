import axios from "./axios_util";

const getDaily = async (params) => {
    const response = await axios.get("/reports/day", { params });

    if (response.status !== 200) {
        throw new Error("Failed to get daily report");
    }
    return response.data;
}

const getDailyReport = async (params) => {
    const response = await axios.get("/reports/day-data", { params });

    if (response.status !== 200) {
        throw new Error("Failed to get daily report");
    }
    return response.data;
}

const getMonthly = async (params) => {
    const response = await axios.get("/reports/month", { params });

    if (response.status !== 200) {
        throw new Error("Failed to get monthly report");
    }

    return response.data;
}

const getMonthlyReport = async (params) => {
    const response = await axios.get("/reports/month-data", { params });

    if (response.status !== 200) {
        throw new Error("Failed to get monthly report");
    }

    return response.data;
}

const getYearly = async (params) => {
    const response = await axios.get("/reports/year", { params });

    if (response.status !== 200) {
        throw new Error("Failed to get yearly report");
    }

    return response.data;
}

const getYearlyReport = async (params) => {
    const response = await axios.get("/reports/year-data", { params });

    if (response.status !== 200) {
        throw new Error("Failed to get yearly report");
    }

    return response.data;
}

export { getDaily, getDailyReport, getMonthly, getMonthlyReport, getYearly, getYearlyReport };