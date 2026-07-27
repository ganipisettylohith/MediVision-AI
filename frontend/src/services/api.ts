import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

// Request interceptor to inject JWT Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medivision_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    const customError = {
      message: detail || error.message || 'An unexpected error occurred',
      status: status || 500,
      response: error.response,
    };
    return Promise.reject(customError);
  }
);

export const getPdfReportUrl = (scanIdOrUuid: string | number) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  return `${baseUrl}/reports/${scanIdOrUuid}/pdf`;
};

export default apiClient;
