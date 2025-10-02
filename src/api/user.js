import axios from "./axios_util";

async function getUserList() {
    var res = await axios.get("/admin/user/all");
    if (res.status !== 200) {
        throw new Error("Failed to get user list");
    }
    return res.data.data;
}

async function createUser(user) {
    var res = await axios.post("/admin/user", user);
    if (res.status !== 200) {
        throw new Error("Failed to create user");
    }
    return res.data.data;
}

async function adminUpdateUser(user) {
    var res = await axios.put(`/admin/user`, user);
    if (res.status !== 200) {
        throw new Error("Failed to update user");
    }
    return res.data.data;
}

async function deleteUser(id) {
    var res = await axios.delete(`/admin/user/${id}`);
    if (res.status !== 200) {
        throw new Error("Failed to delete user");
    }
    return res.data.data;
}

async function getUserInfo() {
    var res = await axios.get("/auth/get-info");
    if (res.status !== 200) {
        throw new Error("Failed to get user info");
    }
    return res.data.data;
}

async function sendVerifyEmail(email) {
    var res = await axios.post("/auth/password/request-reset", { email });
    if (res.status !== 200) {
        throw new Error("Failed to send verify email");
    }
    return res.data;
}

async function verifyEmail(email, code) {
    var res = await axios.post("/auth/password/verify", { email, code });
    if (res.status === 400) {
        throw new Error("이메일 인증 코드가 일치하지 않습니다.");
    }
    if (res.status !== 200) {
        throw new Error("이메일 인증에 실패했습니다.");
    }
    return res.data;
}

async function changePassword(email, code, newPassword) {
    var res = await axios.post("/auth/password/reset", { email, code, newPassword });
    if (res.status === 400) {
        throw new Error("이메일 인증 코드가 일치하지 않습니다.");
    }
    if (res.status !== 200) {
        throw new Error("비밀번호 변경에 실패했습니다.");
    }
    return res.data;
}

async function updateUser(user) {
    var res = await axios.put(`/user/update/${user.id}`, user);
    if (res.status !== 200) {
        throw new Error("Failed to update user");
    }
    return res.data.data;
}

export { getUserList, createUser, adminUpdateUser, deleteUser, getUserInfo, sendVerifyEmail, verifyEmail, changePassword, updateUser };
