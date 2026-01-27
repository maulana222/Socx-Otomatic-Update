// API utility for handling backend communication
const API_BASE_URL = 'http://localhost:3000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authorization header
  getAuthHeaders() {
    const token = localStorage.getItem('socx_bearer_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
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
}

// Create and export singleton instance
const apiClient = new ApiClient();
export default apiClient;