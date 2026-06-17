import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8080') + '/api',
});

api.interceptors.request.use((config) => {
  console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Ensure trailing slash for service roots to avoid Nginx redirects
  const roots = ['/auth', '/tournaments', '/matches', '/team', '/profile', '/venue'];
  const url = config.url.split('?')[0];
  if (roots.includes(url) || roots.some(root => url === root)) {
    if (!config.url.includes('?') && !config.url.endsWith('/')) {
      config.url += '/';
    } else if (config.url.includes('?')) {
      const [path, query] = config.url.split('?');
      if (!path.endsWith('/')) {
        config.url = `${path}/?${query}`;
      }
    }
  }
  
  return config;
});

api.interceptors.response.use(
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

export default api;
