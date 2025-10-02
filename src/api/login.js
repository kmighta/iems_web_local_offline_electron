import axios from "./axios_util";

async function login(username, password) {
    return await axios.post(`/auth/login`, { username, password });
}

export { login };