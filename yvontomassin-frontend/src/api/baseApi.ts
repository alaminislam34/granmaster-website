import axios from 'axios';
import { ENDPOINTS } from './endPoints';

const baseApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // needed so the refreshToken cookie is sent automatically
});

// Attach access token to every request
baseApi.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// On 401, try to refresh via the httpOnly cookie the backend sets
baseApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // The backend reads refreshToken from cookies (withCredentials sends it)
        const res = await axios.post<{ data: { result: { accessToken: string } } }>(
          `${process.env.NEXT_PUBLIC_API_URL}${ENDPOINTS.refreshToken}`,
          {},
          { withCredentials: true },
        );

        const newToken = res.data?.data?.result?.accessToken;
        if (newToken) {
          localStorage.setItem('access_token', newToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return baseApi(originalRequest);
        }
      } catch {
        // Refresh failed — clear the stale cookie server-side then redirect to login
        if (typeof window !== 'undefined') {
          try {
            await axios.post(
              `${process.env.NEXT_PUBLIC_API_URL}/auth/logout`,
              {},
              { withCredentials: true },
            );
          } catch { /* ignore */ }
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          localStorage.removeItem('profile_image');
          localStorage.removeItem('profile_name');
          window.location.href = '/auth/login';
        }
      }
    }

    return Promise.reject(error);
  },
);

export default baseApi;
