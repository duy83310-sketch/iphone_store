import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const axiosClient = axios.create({
	baseURL,
	headers: { 'Content-Type': 'application/json' }
});

// Attach token from localStorage to every request as x-auth-token (backend supports this header)
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // prefer x-auth-token to match existing code elsewhere
    config.headers = config.headers || {};
    config.headers['x-auth-token'] = token;
  }
  return config;
}, (error) => Promise.reject(error));

export default axiosClient;
