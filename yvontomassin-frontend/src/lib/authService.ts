import axios from 'axios';
import baseApi from '@/src/api/baseApi';
import { ENDPOINTS } from '@/src/api/endPoints';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  _id?: string;
  userId?: string;
  name: string;
  email: string;
  role: string;
  is_admin?: boolean;
}

export async function register(payload: RegisterPayload) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}${ENDPOINTS.register}`,
    payload,
  );
  return res.data; 
}

export async function resendVerificationCode(email: string) {
  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}${ENDPOINTS.resendVerification}`,
    { email },
  );
  return res.data;
}

export async function verifyEmail(email: string, code: string) {
  const res = await baseApi.post(ENDPOINTS.verifyEmail, {
    email,
    code,
    verificationCode: code, 
  });
  return res.data;
}

export async function login(payload: LoginPayload) {
  const res = await baseApi.post(ENDPOINTS.login, payload);
  const { accessToken } = res.data.data;
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', accessToken);
  }
  return res.data;
}

export async function forgetPassword(email: string) {
  const res = await baseApi.post(ENDPOINTS.forgetPassword, { email });
  return res.data;
}

export async function verifyCode(email: string, code: string) {
  const res = await baseApi.post(ENDPOINTS.verifyCode, { email, code });
  return res.data;
}

export async function resetPassword(email: string, code: string, newPassword: string) {
  const res = await baseApi.post(ENDPOINTS.resetPassword, { email, code, newPassword });
  return res.data;
}

export function decodeToken(token: string): AuthUser | null {
  try {
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AuthUser;
  } catch {
    return null;
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  const user = decodeToken(token);
  if (!user) return null;

  const id = user.id ?? user._id ?? user.userId;
  return id ? { ...user, id } : user;
}

export async function logout() {
  try {
    await baseApi.post(ENDPOINTS.logout, {}, { withCredentials: true });
  } catch {
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile_image');
    localStorage.removeItem('profile_name');
  }
}
