const API_BASE = '/api';

const API = {
  // Token management
  getToken() {
    return localStorage.getItem('vibenet_token');
  },
  
  setToken(token) {
    localStorage.setItem('vibenet_token', token);
  },
  
  clearToken() {
    localStorage.removeItem('vibenet_token');
  },

  // Base API Request wrapper
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Add content type header by default if sending body
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // Add Auth token
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const config = {
      ...options,
      headers,
    };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    
    return data;
  },

  // Auth Operations
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    this.setToken(data.token);
    return data.user;
  },

  async register(username, email, displayName, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: { username, email, displayName, password }
    });
    this.setToken(data.token);
    return data.user;
  },

  async getCurrentUser() {
    return this.request('/auth/me');
  },

  // Post Operations
  async getFeed() {
    return this.request('/posts');
  },

  async createPost(content, image = '') {
    return this.request('/posts', {
      method: 'POST',
      body: { content, image }
    });
  },

  async likePost(postId) {
    return this.request(`/posts/${postId}/like`, {
      method: 'POST'
    });
  },

  async deletePost(postId) {
    return this.request(`/posts/${postId}`, {
      method: 'DELETE'
    });
  },

  async addComment(postId, content) {
    return this.request(`/posts/${postId}/comment`, {
      method: 'POST',
      body: { content }
    });
  },

  async getComments(postId) {
    return this.request(`/posts/${postId}/comments`);
  },

  // User Operations
  async getUserProfile(username) {
    return this.request(`/users/${username}`);
  },

  async toggleFollow(userId) {
    return this.request(`/users/${userId}/follow`, {
      method: 'POST'
    });
  },

  async getSuggestions() {
    return this.request('/users/suggestions');
  },

  async updateProfile(updates) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: updates
    });
  }
};
