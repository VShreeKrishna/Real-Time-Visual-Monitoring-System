import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('🔄 API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Events API
export const eventsAPI = {
  // Get recent events
  getEvents: (params = {}) => {
    return api.get('/events', { params });
  },

  // Get event statistics
  getStats: () => {
    return api.get('/events/stats');
  },

  // Natural language query
  query: (question) => {
    return api.get('/events/query', { params: { question } });
  },

  // Create event (from Python service)
  createEvent: (eventData) => {
    return api.post('/events', eventData);
  }
};

// Reports API
export const reportsAPI = {
  // Get daily report
  getDailyReport: (date) => {
    return api.get('/reports/daily', { params: { date } });
  },

  // Get weekly report
  getWeeklyReport: (startDate) => {
    return api.get('/reports/weekly', { params: { startDate } });
  },

  // Export PDF report
  exportPDF: (params) => {
    return api.get('/reports/export', { 
      params,
      responseType: 'blob' // Important for PDF download
    });
  }
};

export default api;