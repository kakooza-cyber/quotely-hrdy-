// js/api-client.js - NEW FILE
class ApiClient {
    constructor() {
        // Use your Render/Railway backend URL
        this.baseUrl = 'https://quotely-hrdy-api.onrender.com';
        // For local development: 'http://localhost:3001'
    }

    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    // ========== AUTH METHODS ==========
    async signUp(email, password, name, username) {
        return this.request('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, name, username })
        });
    }

    async login(email, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    // ========== QUOTE METHODS ==========
    async getQuotes(filters = {}, page = 1, limit = 20) {
        const params = new URLSearchParams({
            page,
            limit,
            ...filters
        });
        
        return this.request(`/api/quotes?${params}`);
    }

    async submitQuote(quoteData, userId) {
        return this.request('/api/quotes/submit', {
            method: 'POST',
            body: JSON.stringify({ ...quoteData, userId })
        });
    }

    // ========== PROVERB METHODS ==========
    async getProverbs(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/api/proverbs?${params}`);
    }

    // ========== USER METHODS ==========
    async getProfile(userId) {
        return this.request(`/api/user/profile/${userId}`);
    }

    async updateProfile(userId, profileData) {
        return this.request(`/api/user/profile/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // ========== FAVORITE METHODS ==========
    async addFavorite(userId, quoteId) {
        return this.request('/api/user/favorites', {
            method: 'POST',
            body: JSON.stringify({ userId, quoteId, action: 'add' })
        });
    }

    async removeFavorite(userId, quoteId) {
        return this.request('/api/user/favorites', {
            method: 'POST',
            body: JSON.stringify({ userId, quoteId, action: 'remove' })
        });
    }

    async getFavorites(userId, page = 1, limit = 20) {
        return this.request(`/api/user/favorites/${userId}?page=${page}&limit=${limit}`);
    }

    // ========== CONTACT & NEWSLETTER ==========
    async submitContact(formData) {
        return this.request('/api/contact', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
    }

    async subscribeToNewsletter(email, name) {
        return this.request('/api/newsletter/subscribe', {
            method: 'POST',
            body: JSON.stringify({ email, name })
        });
    }

    // ========== HELPER METHODS ==========
    getCurrentUserId() {
        // Get user ID from localStorage
        const userData = localStorage.getItem('quotely_user');
        return userData ? JSON.parse(userData).id : null;
    }
}

// Create global instance
window.apiClient = new ApiClient();
