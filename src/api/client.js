import axios from 'axios';

const DEFAULT_REMOTE_API = 'https://portal-be.paicc.tech';
const LOCAL_DEV_API = 'https://portal-be.paicc.tech';

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

// Request interceptor to add trailing slash and auth token
apiClient.interceptors.request.use(
  (config) => {
    // Add trailing slash for collection endpoints (e.g., /jobs/) but NOT for resource endpoints (e.g., /jobs/{id})
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      // Check if URL ends with a path parameter (resource ID)
      // Resource paths like /jobs/abc123 should NOT get trailing slash
      // Collection paths like /jobs should get trailing slash
      const pathParts = config.url.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      
      // If the last part looks like a resource name (no special chars, common endpoint names), add slash
      // If it looks like an ID (has numbers/special patterns), don't add slash
      const isCollectionEndpoint = /^[a-z-]+$/.test(lastPart) && 
        ['jobs', 'users', 'applications', 'auth', 'audit', 'settings', 'email', 'upload', 'interviews', 'offers', 'testing'].includes(lastPart);
      
      if (isCollectionEndpoint) {
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
