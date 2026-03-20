import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── FIX: BASE_URL per platform ────────────────────────────────────────────────
// 'localhost' on Android emulator routes to the emulator itself, not your machine.
// 10.0.2.2 is the special alias Android emulator uses to reach the host machine.
// On a real physical device, replace with your machine's LAN IP (e.g. 192.168.1.5).
const getBaseUrl = () => {
    return 'https://location-tracker-2b5v.onrender.com';

};

const BASE_URL = getBaseUrl();

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  async config => {
    const token = await AsyncStorage.getItem('jwt_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error),
);

apiClient.interceptors.response.use(
  response => response.data,
  error => {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  },
);

export const registerUser    = userData         => apiClient.post('/auth/register', userData);
export const loginUser       = (email, password)=> apiClient.post('/auth/login', { email, password });
export const getCurrentUser  = ()               => apiClient.get('/auth/me');

export const generatePairingCode = childId      => apiClient.post('/pairing/child/generate-code', { child_id: childId });
export const getMyParent         = childId      => apiClient.get(`/pairing/child/${childId}/parent`);
export const pairWithChild       = (parentId, code) => apiClient.post('/pairing/parent/pair', { parent_id: parentId, code });
export const getMyChildren       = parentId     => apiClient.get(`/pairing/parent/${parentId}/children`);

export const updateLocation    = (childId, latitude, longitude, accuracy = 0, speed = 0) =>
  apiClient.post('/location/update', { child_id: childId, latitude, longitude, accuracy, speed });

export const getLatestLocation = childId        => apiClient.get(`/location/child/${childId}/latest`);
export const getLocationHistory= (childId, limit = 20) =>
  apiClient.get(`/location/child/${childId}/history`, { params: { limit } });

export default apiClient;