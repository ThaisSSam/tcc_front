import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

// ⚠️ Mude de localhost para 127.0.0.1 para evitar problemas com IPv6 ([::1])
const baseURL = 'http://localhost:8000';

const pendingRequests = new Map<string, Promise<AxiosResponse>>();

const normalizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => normalizeObject(item));
  if (typeof obj !== 'object' || obj instanceof FormData || obj instanceof Date) return obj;

  return Object.keys(obj)
    .sort()
    .reduce((acc: any, key) => {
      acc[key] = normalizeObject(obj[key]);
      return acc;
    }, {});
};

const generateRequestKey = (config: AxiosRequestConfig): string => {
  const method = (config.method || 'GET').toUpperCase();
  let url = config.url || '';
  const allParams: Record<string, any> = {};

  if (url.includes('?')) {
    const [baseUrl, queryString] = url.split('?');
    url = baseUrl;
    new URLSearchParams(queryString).forEach((value, key) => {
      allParams[key] = value;
    });
  }

  if (config.params) Object.assign(allParams, config.params);
  const normalizedParams = normalizeObject(allParams);
  const paramsStr = Object.keys(normalizedParams).length > 0 ? JSON.stringify(normalizedParams) : '';

  let dataStr = '';
  if (config.data) {
    dataStr = config.data instanceof FormData ? 'FormData' : JSON.stringify(normalizeObject(config.data));
  }

  return `${method}_${url}_${paramsStr}_${dataStr}`;
};

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false, 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data && !(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  config.headers['Accept'] = 'application/json';
  return config;
});

const originalRequest = api.request.bind(api);
api.request = function (config: AxiosRequestConfig): any {
  if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
    return originalRequest(config);
  }

  const requestKey = generateRequestKey(config);
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  const requestPromise = originalRequest(config)
    .then((response) => {
      pendingRequests.delete(requestKey);
      return response;
    })
    .catch((error) => {
      pendingRequests.delete(requestKey);
      throw error;
    });

  pendingRequests.set(requestKey, requestPromise);
  return requestPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const ehRotaLogin = error.config?.url?.includes('/api/login');

    if ((error.response?.status === 401 || error.response?.status === 403) && !ehRotaLogin) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      localStorage.removeItem('auth_user');

      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;