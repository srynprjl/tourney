import axios from 'axios';

const getServiceURL = (service) => {
  const baseURL = import.meta.env.VITE_API_URL || '';
  
  // If a full base URL is provided, use service-specific paths
  if (baseURL) {
    return `${baseURL}`;
  }
  
  // Otherwise use relative paths (for local dev or proxied setup)
  switch(service) {
    case 'auth':
      return import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081';
    case 'tournament':
      return import.meta.env.VITE_TOURNAMENT_SERVICE_URL || 'http://localhost:8082';
    case 'match':
      return import.meta.env.VITE_MATCH_SERVICE_URL || 'http://localhost:8083';
    default:
      return baseURL;
  }
};

// Create API instances for each service
const createServiceAPI = (baseURL) => {
  const instance = axios.create({ baseURL });
  
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

const authAPI = createServiceAPI(getServiceURL('auth'));
const tournamentAPI = createServiceAPI(getServiceURL('tournament'));
const matchAPI = createServiceAPI(getServiceURL('match'));

export { authAPI, tournamentAPI, matchAPI };
export default authAPI;
