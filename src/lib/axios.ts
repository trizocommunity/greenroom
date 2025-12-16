import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract error message from response if available
    const message = error.response?.data?.message || error.response?.data || error.message || 'Something went wrong';
    
    // You can also handle global redirects here (e.g. 401 -> login)
    // if (error.response?.status === 401) { ... }

    // Reject nicely formatted error object or string
    return Promise.reject(new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
);

export default api;
