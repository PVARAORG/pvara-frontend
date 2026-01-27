import axios from 'axios';

const DEFAULT_REMOTE_API = 'https://argaam-be.fortanixor.com';
const LOCAL_DEV_API = 'https://argaam-be.fortanixor.com';

const nodeEnv = process.env.NODE_ENV;
let API_URL = process.env.REACT_APP_API_URL
  || (nodeEnv === 'development' ? LOCAL_DEV_API : DEFAULT_REMOTE_API);

if (!API_URL && typeof window !== 'undefined') {
  API_URL = DEFAULT_REMOTE_API;
}

// Enforce HTTPS in production to prevent Mixed Content errors
if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http://')) {
  API_URL = API_URL.replace('http://', 'https://');
  console.warn('[api] Upgraded API URL to HTTPS to prevent mixed content:', API_URL);
}

if (nodeEnv === 'development' && typeof window !== 'undefined') {
  console.info('[api] Using backend base URL:', API_URL);
}


// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
});

// Collection endpoints that need trailing slash
const COLLECTION_ENDPOINTS = ['jobs', 'users', 'applications', 'auth', 'audit', 'settings', 'email', 'upload', 'interviews', 'offers', 'testing', 'login', 'register', 'me', 'health'];

// Request interceptor to add trailing slash and auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add trailing slash only for collection endpoints, not resource endpoints with IDs
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      const pathParts = config.url.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      
      // Add trailing slash if last part is a known collection endpoint
      if (COLLECTION_ENDPOINTS.includes(lastPart)) {
        config.url = config.url + '/';
      }
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
