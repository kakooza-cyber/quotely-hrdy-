class QuotesManager {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalQuotes = 0;
        this.viewMode = 'grid';
        this.filters = {
            category: '',
            author: '',
            search: '',
            sort: 'newest'
        };
        this.quotes = [];
        this.userFavorites = new Set();
        this.init();
    }

    async init() {
        // Check authentication
        if (!await this.checkAuth()) return;
        
        // Load user info
        this.loadUserInfo();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    async checkAuth() {
        if (!QuotelyAPI.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        
        const user = QuotelyAPI.getCurrentUser();
        if (!user) {
            window.location.href = 'index.html';
            return false;
        }
        
        return true;
    }

    loadUserInfo() {
        const user = QuotelyAPI.getCurrentUser();
        if (user) {
            // Update avatar if available
            const avatar = document.querySelector('.user-avatar');
            if (avatar && user.avatar) {
                avatar.src = user.avatar;
            }
        }
    }

    async loadInitialData() {
        try {
            // Load user favorites
            await this.loadUserFavorites();
            
            // Load quotes
            await this.loadQuotes();
            
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Failed to load data. Please refresh the page.', 'error');
        }
    }

    async loadUserFavorites() {
        try {
            const data = await QuotelyAPI.getFavorites();
            if (data.success && data.data) {
                // Store quote favorites in a Set for quick lookup
                this.userFavorites = new Set(
                    data.data
                        .filter(fav => fav.item.type === 'quote')
                        .map(fav => fav.item.id)
                );
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
        }
    }

    async loadQuotes() {
        try {
            const container = document.getElementById('quotesGrid');
            if (!container) return;

            // Show loading
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading quotes...</p>
                </div>
            `;

            // Prepare filters for API
            const apiFilters = {};
            if (this.filters.search) apiFilters.search = this.filters.search;
            if (this.filters.category) apiFilters.category = this.filters.category;
            if (this.filters.author) apiFilters.author = this.filters.author;

            // Get quotes from secure backend
            const data = await QuotelyAPI.getQuotes(
                this.currentPage,
                this.pageSize,
                apiFilters
            );

            if (data.success && data.data) {
                this.quotes = data.data;
                this.totalQuotes = data.pagination?.total || data.data.length;
                
                // Display quotes
                this.displayQuotes(data.data);
                
                // Update pagination
                this.updatePagination(data);
                
                // Update results count
                this.updateResultsCount(this.totalQuotes);
            } else {
                this.showNotification('No quotes found. Try different filters.', 'info');
                this.displayEmptyState();
            }
        } catch (error) {
            console.error('Error loading quotes:', error);
            this.showNotification('Failed to load quotes. Please try again.', 'error');
            this.displayEmptyState();
        }
    }

    displayQuotes(quotes) {
        const container = document.getElementById('quotesGrid');
        if (!container || !quotes || quotes.length === 0) {
            this.displayEmptyState();
            return;
        }

        container.innerHTML = '';
        
        quotes.forEach(quote => {
            const quoteElement = this.createQuoteElement(quote);
            container.appendChild(quoteElement);
        });
    }

    createQuoteElement(quote) {
        const quoteDiv = document.createElement('div');
        quoteDiv.className = `quote-item ${this.viewMode}`;
        
        const isFavorite = this.userFavorites.has(quote.id);
        
        let html = '';
        
        switch(this.viewMode) {
            case 'grid':
                html = this.createGridView(quote, isFavorite);
                break;
            case 'list':
                html = this.createListView(quote, isFavorite);
                break;
            case 'minimal':
                html = this.createMinimalView(quote, isFavorite);
                break;
            default:
                html = this.createGridView(quote, isFavorite);
        }
        
        quoteDiv.innerHTML = html;
        
        // Add event listeners
        this.addQuoteEventListeners(quoteDiv, quote, isFavorite);
        
        return quoteDiv;
    }

    createGridView(quote, isFavorite) {
        return `
            <div class="quote-card">
                <div class="quote-content">
                    <p class="quote-text">"${quote.content}"</p>
                    <p class="quote-author">- ${quote.author || 'Unknown'}</p>
                    <div class="quote-meta">
                        <span class="quote-category">${quote.category || 'General'}</span>
                        ${quote.tags && quote.tags.length > 0 ? `
                            <div class="quote-tags">
                                ${quote.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="quote-actions">
                    <button class="btn-action favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-quote-id="${quote.id}" data-action="favorite">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                        <span class="favorite-text">${isFavorite ? 'Favorited' : 'Favorite'}</span>
                    </button>
                    <button class="btn-action share-btn" data-quote-id="${quote.id}" data-action="share">
                        <i class="fas fa-share"></i>
                    </button>
                    <button class="btn-action copy-btn" data-quote-id="${quote.id}" data-action="copy">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
    }

    createListView(quote, isFavorite) {
        return `
            <div class="quote-list-item">
                <div class="list-content">
                    <p class="quote-text">"${quote.content}"</p>
                    <div class="list-meta">
                        <span class="quote-author">${quote.author || 'Unknown'}</span>
                        <span class="quote-category">${quote.category || 'General'}</span>
                        ${quote.tags && quote.tags.length > 0 ? `
                            <div class="quote-tags">
                                ${quote.tags.slice(0, 2).map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="list-actions">
                    <button class="btn-action favorite-btn ${isFavorite ? 'active' : ''}" 
                            data-quote-id="${quote.id}" data-action="favorite">
                        <i class="${isFavorite ? 'fas' : 'far'} fa-star"></i>
                    </button>
                    <button class="btn-action share-btn" data-quote-id="${quote.id}" data-action="share">
                        <i class="fas fa-share"></i>
                    </button>
                </div>
            </div>
        `;
    }

    createMinimalView(quote, isFavorite) {
        return `
            <div class="quote-minimal">
                <p class="quote-text">"${quote.content}"</p>
                <div class="minimal-meta">
                    <span class="quote-author">${quote.author || 'Unknown'}</span>
                    <span class="quote-category">${quote.category || 'General'}</span>
                </div>
            </div>
        `;
    }

    addQuoteEventListeners(element, quote, isFavorite) {
        // Favorite button
        const favoriteBtn = element.querySelector('.favorite-btn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.handleFavorite(quote.id, favoriteBtn, isFavorite);
            });
        }

        // Share button
        const shareBtn = element.querySelector('.share-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.shareQuote(quote);
            });
        }

        // Copy button
        const copyBtn = element.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyQuote(quote);
            });
        }

        // View quote details on click
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-action')) {
                this.viewQuoteDetails(quote.id);
            }
        });
    }

    setupEventListeners() {
        // Search
        document.getElementById('searchQuotesBtn')?.addEventListener('click', () => {
            this.handleSearch();
        });

        document.getElementById('quoteSearch')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Filters
        document.getElementById('quoteCategory')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.currentPage = 1;
            this.loadQuotes();
        });

        document.getElementById('quoteAuthor')?.addEventListener('change', (e) => {
            this.filters.author = e.target.value;
            this.currentPage = 1;
            this.loadQuotes();
        });

        document.getElementById('quoteSort')?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.currentPage = 1;
            this.loadQuotes();
        });

        // Clear filters
        document.getElementById('clearQuoteFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // View mode toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const viewMode = e.currentTarget.dataset.view;
                this.setViewMode(viewMode);
            });
        });

        // Pagination
        document.getElementById('prevQuotesPage')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadQuotes();
            }
        });

        document.getElementById('nextQuotesPage')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.totalQuotes / this.pageSize);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.loadQuotes();
            }
        });

        // Submit quote form (will be implemented when backend supports it)
        document.getElementById('submitQuoteForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmitQuote(e.target);
        });

        // Author view buttons
        document.querySelectorAll('.view-author').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const author = e.currentTarget.dataset.author;
                this.viewAuthorQuotes(author);
            });
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await QuotelyAPI.logout();
            window.location.href = 'index.html';
        });

        // Mobile navigation
        document.querySelector('.nav-toggle')?.addEventListener('click', () => {
            document.querySelector('.nav-menu').classList.toggle('active');
        });
    }

    setViewMode(mode) {
        this.viewMode = mode;
        localStorage.setItem('quotely_view_mode', mode);

        // Update UI
        document.querySelectorAll('.view-btn').forEach(btn => {
            if (btn.dataset.view === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Reload quotes with new view mode
        if (this.quotes.length > 0) {
            this.displayQuotes(this.quotes);
        }
    }

    handleSearch() {
        const searchInput = document.getElementById('quoteSearch');
        if (searchInput) {
            this.filters.search = searchInput.value.trim();
            this.currentPage = 1;
            this.loadQuotes();
        }
    }

    clearFilters() {
        this.filters = {
            category: '',
            author: '',
            search: '',
            sort: 'newest'
        };

        // Reset UI
        const categorySelect = document.getElementById('quoteCategory');
        const authorSelect = document.getElementById('quoteAuthor');
        const sortSelect = document.getElementById('quoteSort');
        const searchInput = document.getElementById('quoteSearch');

        if (categorySelect) categorySelect.value = '';
        if (authorSelect) authorSelect.value = '';
        if (sortSelect) sortSelect.value = 'newest';
        if (searchInput) searchInput.value = '';

        this.currentPage = 1;
        this.loadQuotes();
    }

    async handleFavorite(quoteId, button, isCurrentlyFavorite) {
        try {
            if (isCurrentlyFavorite) {
                // Remove from favorites
                // Note: We need the favorite ID to remove - for now we'll skip removal
                // This will be implemented when backend returns favorite IDs
                this.showNotification('Remove favorite feature coming soon!', 'info');
                
                // Update UI temporarily
                const icon = button.querySelector('i');
                const textSpan = button.querySelector('.favorite-text');
                icon.classList.remove('fas');
                icon.classList.add('far');
                button.classList.remove('active');
                if (textSpan) textSpan.textContent = 'Favorite';
                
                // Update favorites set
                this.userFavorites.delete(quoteId);
            } else {
                // Add to favorites
                const data = await QuotelyAPI.addFavorite(quoteId, 'quote');
                if (data.success) {
                    this.showNotification('Added to favorites!', 'success');
                    
                    // Update UI
                    const icon = button.querySelector('i');
                    const textSpan = button.querySelector('.favorite-text');
                    icon.classList.remove('far');
                    icon.classList.add('fas');
                    button.classList.add('active');
                    if (textSpan) textSpan.textContent = 'Favorited';
                    
                    // Update favorites set
                    this.userFavorites.add(quoteId);
                } else {
                    this.showNotification('Failed to add to favorites', 'error');
                }
            }
        } catch (error) {
            console.error('Error handling favorite:', error);
            this.showNotification('Failed to update favorite', 'error');
        }
    }

    async handleSubmitQuote(form) {
        const formData = new FormData(form);
        const quoteData = {
            text: formData.get('quoteText'),
            author: formData.get('quoteAuthor'),
            category: formData.get('category'),
            source: formData.get('source') || null,
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
        };

        // Validate
        if (!quoteData.text || !quoteData.author || !quoteData.category) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            // Note: This endpoint doesn't exist yet in our backend
            // Will be implemented when backend supports quote submission
            this.showNotification('Quote submission feature coming soon!', 'info');
            form.reset();
            
        } catch (error) {
            console.error('Error submitting quote:', error);
            this.showNotification('Failed to submit quote', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    shareQuote(quote) {
        const text = `"${quote.content}" - ${quote.author || 'Unknown'}`;
        const url = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: 'Inspiring Quote',
                text: text,
                url: url
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${text}\n\nShared from Quotely-Hardy`);
            this.showNotification('Quote copied to clipboard!', 'success');
        }
    }

    copyQuote(quote) {
        const text = `"${quote.content}" - ${quote.author || 'Unknown'}`;
        navigator.clipboard.writeText(text);
        this.showNotification('Quote copied to clipboard!', 'success');
    }

    viewQuoteDetails(quoteId) {
        // For now, just filter by this quote
        this.filters.search = '';
        this.currentPage = 1;
        this.loadQuotes();
        this.showNotification('Quote details feature coming soon!', 'info');
    }

    viewAuthorQuotes(authorName) {
        // Filter by author
        this.filters.author = authorName;
        this.currentPage = 1;
        this.loadQuotes();
    }

    updatePagination(data) {
        const prevBtn = document.getElementById('prevQuotesPage');
        const nextBtn = document.getElementById('nextQuotesPage');
        const pageNumbers = document.getElementById('pageNumbers');
        
        if (!prevBtn || !nextBtn || !pageNumbers) return;

        const totalPages = data.pagination?.pages || Math.ceil(this.totalQuotes / this.pageSize);
        
        // Previous button
        prevBtn.disabled = this.currentPage === 1;
        
        // Next button
        nextBtn.disabled = this.currentPage === totalPages;
        
        // Page numbers
        pageNumbers.innerHTML = '';
        const maxPagesToShow = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
         if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === this.currentPage ? 'active' : ''}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => {
                this.currentPage = i;
                this.loadQuotes();
            });
            pageNumbers.appendChild(pageBtn);
        }
    }

    updateResultsCount(total) {
        const countElement = document.getElementById('resultsCount');
        if (countElement) {
            countElement.textContent = total;
        }
    }

    displayEmptyState() {
        const container = document.getElementById('quotesGrid');
        if (!container) return;

        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-quote-right"></i>
                <h3>No quotes found</h3>
                <p>Try changing your search or filters</p>
                <button class="btn btn-primary" id="clearFiltersBtn">Clear All Filters</button>
            </div>
        `;

        // Add event listener to clear filters button
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        });

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Initialize quotes manager
document.addEventListener('DOMContentLoaded', () => {
    window.quotesManager = new QuotesManager();
});
        
       
