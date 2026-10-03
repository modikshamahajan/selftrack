import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Extract dev host IP from React Native Metro bundler URL if available
const getDevHost = (): string => {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {}
  // Default to machine LAN IP for physical device over local Wi-Fi
  return '192.168.1.9';
};

const devHost = getDevHost();

export const DEFAULT_BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api/v1'
  : `http://${devHost}:5000/api/v1`;

const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true',
  },
  timeout: 15000,
});

// Allow dynamic update of base URL (e.g. for physical phone testing on LAN)
export const updateApiBaseUrl = async (customUrl?: string) => {
  try {
    if (customUrl) {
      const cleanUrl = customUrl.trim().replace(/\/+$/, '');
      await AsyncStorage.setItem('customApiBaseUrl', cleanUrl);
      api.defaults.baseURL = cleanUrl;
    } else {
      const saved = await AsyncStorage.getItem('customApiBaseUrl');
      if (saved) {
        api.defaults.baseURL = saved;
      } else {
        api.defaults.baseURL = DEFAULT_BASE_URL;
      }
    }
  } catch (e) {
    if (customUrl) {
      api.defaults.baseURL = customUrl;
    }
  }
};

// Initialize custom URL if previously saved
updateApiBaseUrl();

// Request interceptor to automatically add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token && config.headers && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh if expired (401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          if (res.data?.access_token) {
            await AsyncStorage.setItem('userToken', res.data.access_token);
            originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        // Refresh failed: clear storage
        await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userProfile']);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
