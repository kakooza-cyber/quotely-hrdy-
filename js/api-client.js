// API Client for communicating with Quotely-Hardy backend
class ApiClient {
    constructor() {
        this.baseUrl = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Helper method to set auth header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Handle API response
    async handleResponse(response) {
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'API request failed');
        }
        return response.json();
    }

    // GET request
    async get(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    // POST request
    async post(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse(response);
    }

    // PUT request
    async put(endpoint, data) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data),
        });
        return this.handleResponse(response);
    }

    // DELETE request
    async delete(endpoint) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
        });
        return this.handleResponse(response);
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Clear auth token
    clearToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }
}

// API Endpoints
const API = {
    // Auth endpoints
    auth: {
        login: (email, password) => apiClient.post('/auth/login', { email, password }),
        register: (userData) => apiClient.post('/auth/register', userData),
        logout: () => apiClient.post('/auth/logout'),
    },

    // Quotes endpoints
    quotes: {
        getAll: (page = 1, limit = 20) => apiClient.get(`/quotes?page=${page}&limit=${limit}`),
        getById: (id) => apiClient.get(`/quotes/${id}`),
        search: (query) => apiClient.get(`/quotes/search?q=${query}`),
        getRandom: () => apiClient.get('/quotes/random'),
        addQuote: (quoteData) => apiClient.post('/quotes', quoteData),
        updateQuote: (id, quoteData) => apiClient.put(`/quotes/${id}`, quoteData),
        deleteQuote: (id) => apiClient.delete(`/quotes/${id}`),
    },

    // Proverbs endpoints
    proverbs: {
        getAll: (page = 1, limit = 20) => apiClient.get(`/proverbs?page=${page}&limit=${limit}`),
        getById: (id) => apiClient.get(`/proverbs/${id}`),
        search: (query) => apiClient.get(`/proverbs/search?q=${query}`),
        getRandom: () => apiClient.get('/proverbs/random'),
        addProverb: (proverbData) => apiClient.post('/proverbs', proverbData),
        updateProverb: (id, proverbData) => apiClient.put(`/proverbs/${id}`, proverbData),
        deleteProverb: (id) => apiClient.delete(`/proverbs/${id}`),
    },

    // Favorites endpoints
    favorites: {
        getAll: () => apiClient.get('/favorites'),
        addFavorite: (itemId, type) => apiClient.post('/favorites', { itemId, type }),
        removeFavorite: (favoriteId) => apiClient.delete(`/favorites/${favoriteId}`),
        checkFavorite: (itemId, type) => apiClient.get(`/favorites/check?itemId=${itemId}&type=${type}`),
    },

    // User endpoints
    user: {
        getProfile: () => apiClient.get('/users/profile'),
        updateProfile: (userData) => apiClient.put('/users/profile', userData),
        getStats: () => apiClient.get('/users/stats'),
    },

    // Dashboard endpoints
    dashboard: {
        getSummary: () => apiClient.get('/dashboard/summary'),
        getRecentActivity: () => apiClient.get('/dashboard/activity'),
        getRecommendations: () => apiClient.get('/dashboard/recommendations'),
    },
};

// Create global instance
const apiClient = new ApiClient();
