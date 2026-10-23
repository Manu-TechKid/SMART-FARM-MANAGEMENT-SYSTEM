import axios from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL ??
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5080/api'
    : '/api');

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: string; message?: string; title?: string; errors?: Record<string, string[]> } }; message?: string };
  const data = e.response?.data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data?.errors) return Object.values(data.errors).flat().join(' ');
  if (data?.title) return data.title;
  return e.message ?? 'Unexpected error';
}
