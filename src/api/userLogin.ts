import axios from "@/request/axios";

const BASE_URL = '/users';

export interface userInfo {
    userName?: string;
    password?: string;
    email?: string;
}

export function register(user: userInfo) {
    return axios.post(`${BASE_URL}/register`, user);
}
export function login(user: userInfo) {
    return axios.post(`${BASE_URL}/login`, user);
}

export function isLogin() {
    return axios.get(`${BASE_URL}/isLogin`);
}
export function tokenInfo() {
    return axios.get(`${BASE_URL}/tokenInfo`);
}
export function userInfo(id: string) {
    return axios.get(`${BASE_URL}/`+ id);
}

export function logout() {
    return axios.get(`${BASE_URL}/logout`);
}