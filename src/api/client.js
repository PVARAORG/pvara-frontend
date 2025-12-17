import axios from 'axios';

const DEFAULT_REMOTE_API = 'https://pvara-backend.fortanixor.com';
const LOCAL_DEV_API = 'https://pvara-backend.fortanixor.com';

const nodeEnv = process.env.NODE_ENV;
let API_URL = process.env.REACT_APP_API_URL
  || (nodeEnv === 'development' ? LOCAL_DEV_API : DEFAULT_REMOTE_API);

if (!API_URL && typeof window !== 'undefined') {
  API_URL = DEFAULT_REMOTE_API;
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

// Request interceptor to add trailing slash and auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add trailing slash if not present (FastAPI requires it)
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      // Only add if there's no query params and no trailing slash
      const hasPathParams = config.url.match(/\/[^/]+$/);
      if (!hasPathParams || hasPathParams[0].includes('.')) {
        // Don't add trailing slash if it looks like a file or has path params
      } else {
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
