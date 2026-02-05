// API utility for handling backend communication
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Validate that API URL is set
if (!API_BASE_URL) {
  throw new Error(
    'REACT_APP_BACKEND_URL is not set! Please check your .env or .env.production file.\n' +
    'Development: Check frontend/.env\n' +
    'Production: Check frontend/.env.production'
  );
}

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('socx_bearer_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Generic request method. options.timeout (ms) overrides default (30s) for heavy requests.
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultTimeout = typeof process.env.REACT_APP_API_TIMEOUT !== 'undefined' ? Number(process.env.REACT_APP_API_TIMEOUT) : 30000;
    const apiTimeout = options.timeout != null ? Number(options.timeout) : defaultTimeout;
    const { timeout: _omit, ...restOptions } = options;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...restOptions.headers,
      },
      ...restOptions,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), apiTimeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        // Handle token expiration
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('socx_bearer_token');
          localStorage.removeItem('socx_user');

          // Redirect to login if on protected page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }

        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: Server took too long to respond');
      }
      
      throw error;
    }
  }

  // Authentication methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async refreshToken(refreshToken) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(userData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(passwordData) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('Backend server is not running');
    }
  }

  // Generic HTTP methods for easier usage
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options
    });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  }
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;