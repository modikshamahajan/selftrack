import axios from 'axios';
import { Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Constants from 'expo-constants';

// Extract dev host IP from React Native Metro bundler URL if available
const getDevHost = (): string => {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/^https?:\/\/([^:/]+)/) || scriptURL.match(/^exp:\/\/([^:/]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch (e) {}
  // Default to machine LAN IP for physical device over local Wi-Fi
  return '192.168.1.5';
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
  timeout: 10000,
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
      // On real mobile devices, ignore saved URLs that point to localhost or 10.0.2.2 emulator IPs
      if (
        saved &&
        !(Platform.OS !== 'web' && (saved.includes('localhost') || saved.includes('10.0.2.2')))
      ) {
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

// ---------------------------------------------------------------------------
// Admin route isolation
// ---------------------------------------------------------------------------
// The admin portal authenticates with its OWN token (`@admin_token`), which is
// completely separate from the end-user session (`userToken` / `refreshToken`).
// Without the guard below, the shared axios interceptors treated an admin 401
// as a *user* session problem: they tried to refresh the user token and, when
// that failed, wiped the signed-in user's session - logging them out of the
// app just because an admin request failed.
const ADMIN_ROUTE_PATTERN = /(^|\/)admin(\/|$|\?)/;

/**
 * True when an axios request targets the privileged `/admin` surface.
 */
export const isAdminRequest = (config?: { url?: string; baseURL?: string } | null): boolean => {
  if (!config) return false;
  return ADMIN_ROUTE_PATTERN.test(config.url || '');
};

// Request interceptor to automatically add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    // Admin requests carry their own credential - never leak the user token.
    if (isAdminRequest(config)) {
      return config;
    }
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
    const status = error.response?.status;

    // Admin routes own their auth lifecycle. A 401/403 there means the admin
    // token is missing, expired or insufficient - it must NEVER trigger a
    // user-token refresh and must NEVER clear the user's session.
    if (isAdminRequest(originalRequest)) {
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          if (res.data?.access_token) {
            await AsyncStorage.setItem('userToken', res.data.access_token);
            originalRequest.headers = originalRequest.headers || {};
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
