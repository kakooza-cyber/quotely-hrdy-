class FavoritesManager {
    constructor() {
        this.favorites = [];
        this.currentPage = 1;
        this.pageSize = 12;
        this.totalFavorites = 0;
        this.activeCategory = 'all';
        this.sortBy = 'recent';
        this.init();
    }

    async init() {
        await this.checkAuth();
        this.setupEventListeners();
        await this.loadFavorites();
        await this.loadFavoritesInsights();
        this.setupCharts();
    }

    async checkAuth() {
        if (!window.supabaseClient || !window.supabaseClient.user) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    setupEventListeners() {
        // Search
        document.getElementById('favoritesSearch')?.addEventListener('input', (e) => {
            this.debouncedSearch(e.target.value);
        });

        document.getElementById('clearSearch')?.addEventListener('click', () => {
            document.getElementById('favoritesSearch').value = '';
            this.loadFavorites();
        });

        // Sort
        document.getElementById('sortFavorites')?.addEventListener('change', (e) => {
            this.sortBy = e.target.value;
            this.sortFavorites();
        });

        // Category filter
        document.querySelectorAll('.category-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.filterByCategory(category);
            });
        });

        // Export button
        document.getElementById('exportFavorites')?.addEventListener('click', () => {
            this.exportFavorites();
        });

        // Clear all button
        document.getElementById('clearAllFavorites')?.addEventListener('click', () => {
            this.confirmClearAll();
        });

        // Collection creation
        document.getElementById('createCollection')?.addEventListener('click', () => {
            this.openCollectionModal();
        });

        // Collection modal
        const collectionModal = document.getElementById('collectionModal');
        if (collectionModal) {
            collectionModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closeModal('collectionModal');
                });
            });

            // Icon selection
            collectionModal.querySelectorAll('.icon-option').forEach(icon => {
                icon.addEventListener('click', (e) => {
                    e.preventDefault();
                    collectionModal.querySelectorAll('.icon-option').forEach(i => {
                        i.classList.remove('active');
                    });
                    e.currentTarget.classList.add('active');
                });
            });

            // Color selection
            collectionModal.querySelectorAll('.color-option').forEach(color => {
                color.addEventListener('click', (e) => {
                    e.preventDefault();
                    collectionModal.querySelectorAll('.color-option').forEach(c => {
                        c.classList.remove('active');
                    });
                    e.currentTarget.classList.add('active');
                });
            });

            // Form submission
            document.getElementById('collectionForm')?.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateCollection(e.target);
            });
        }

        // Share options
        document.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const platform = e.currentTarget.dataset.platform;
                this.handleShare(platform);
            });
        });

        // Clear recent
        document.getElementById('clearRecent')?.addEventListener('click', () => {
            this.clearRecentlyViewed();
        });

        // Confirmation modal
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal) {
            confirmModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.closeModal('confirmModal');
                });
            });
        }
    }

    async loadFavorites() {
        try {
            const container = document.getElementById('favoritesContainer');
            const emptyState = document.getElementById('emptyFavorites');
            
            if (!container) return;

            // Show loading
            container.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Loading your favorites...</p>
                </div>
            `;

            // Get favorites from Supabase
            const result = await window.supabaseClient.getUserFavorites(
                this.currentPage,
                this.pageSize
            );

            if (result.success) {
                this.favorites = result.quotes;
                this.totalFavorites = result.total;
                
                if (result.quotes.length > 0) {
                    this.displayFavorites(result.quotes);
                    
                    // Hide empty state
                    if (emptyState) emptyState.style.display = 'none';
                    
                    // Update stats
                    this.updateStats(result.total);
                } else {
                    this.showEmptyState();
                }
            } else {
                this.showError('Failed to load favorites');
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading favorites:', error);
            this.showError('Failed to load favorites');
            this.showEmptyState();
        }
    }

    displayFavorites(quotes) {
        const container = document.getElementById('favoritesContainer');
        if (!container || !quotes) return;

        container.innerHTML = '';
        
        quotes.forEach(quote => {
            const favoriteElement = this.createFavoriteElement(quote);
            container.appendChild(favoriteElement);
        });
    }

    createFavoriteElement(quote) {
        const div = document.createElement('div');
        div.className = 'favorite-item';
        div.innerHTML = `
            <div class="favorite-card">
                <div class="favorite-header">
                    <div class="favorite-category-badge">${quote.category}</div>
                    <button class="btn-action remove-favorite" data-quote-id="${quote.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="favorite-content">
                    <p class="favorite-text">"${quote.text}"</p>
                    <p class="favorite-author">- ${quote.author}</p>
                    <div class="favorite-meta">
                        <span class="favorite-date">
                            <i class="fas fa-calendar"></i> 
                            ${new Date(quote.favorited_at || quote.created_at).toLocaleDateString()}
                        </span>
                        <div class="favorite-stats">
                            <span class="favorite-likes">
                                <i class="fas fa-heart"></i> ${quote.likes_count || 0}
                            </span>
                            <span class="favorite-favorites">
                                <i class="fas fa-star"></i> ${quote.favorites_count || 0}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="favorite-actions">
                    <button class="btn-action view-favorite" data-quote-id="${quote.id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action share-favorite" data-quote-id="${quote.id}">
                        <i class="fas fa-share"></i> Share
                    </button>
                    <button class="btn-action copy-favorite" data-quote-id="${quote.id}">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
            </div>
        `;
        // Add event listeners
        div.querySelector('.remove-favorite').addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.removeFavorite(quote.id, div);
        });

        div.querySelector('.view-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            this.viewFavorite(quote.id);
        });

        div.querySelector('.share-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            this.shareFavorite(quote);
        });

        div.querySelector('.copy-favorite').addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyFavorite(quote);
        });

        div.addEventListener('click', () => {
            this.viewFavorite(quote.id);
        });

        return div;
    }

    async loadFavoritesInsights() {
        // This would load analytics data from Supabase
        // For now, we'll update with current favorites data
        this.updateInsights();
    }

    updateStats(total) {
        // Update total count
        const totalElement = document.getElementById('totalFavorites');
        if (totalElement) {
            totalElement.textContent = total;
        }

        // Update category count
        const categories = [...new Set(this.favorites.map(f => f.category))];
        const categoriesElement = document.getElementById('totalCategories');
        if (categoriesElement) {
            categoriesElement.textContent = categories.length;
        }
    }

    updateInsights() {
        if (!this.favorites || this.favorites.length === 0) return;

        // Calculate category distribution
        const categoryCounts = {};
        this.favorites.forEach(favorite => {
            categoryCounts[favorite.category] = (categoryCounts[favorite.category] || 0) + 1;
        });

        // Update category list
        const categoryList = document.getElementById('categoryDistribution');
        if (categoryList) {
            categoryList.innerHTML = '';
            
            Object.entries(categoryCounts).forEach(([category, count]) => {
                const percentage = ((count / this.favorites.length) * 100).toFixed(1);
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="category-name">${category}</span>
                    <span class="category-percentage">${percentage}%</span>
                    <span class="category-count">${count}</span>
                `;
                categoryList.appendChild(li);
            });
        }

        // Update monthly stats (simplified)
        const thisMonthElement = document.getElementById('thisMonthFavorites');
        const lastMonthElement = document.getElementById('lastMonthFavorites');
        const averageElement = document.getElementById('monthlyAverage');
        
        if (thisMonthElement) thisMonthElement.textContent = '12'; // Placeholder
        if (lastMonthElement) lastMonthElement.textContent = '8'; // Placeholder
        if (averageElement) averageElement.textContent = '10/mo'; // Placeholder
    }

    setupCharts() {
        // Initialize Chart.js charts if needed
        // This would require actual data from Supabase
    }

    debouncedSearch = this.debounce((query) => {
        this.filterFavorites(query);
    }, 300);

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    filterFavorites(query) {
        if (!query.trim()) {
            this.loadFavorites();
            return;
        }

        const filtered = this.favorites.filter(favorite => 
            favorite.text.toLowerCase().includes(query.toLowerCase()) ||
            favorite.author.toLowerCase().includes(query.toLowerCase()) ||
            favorite.category.toLowerCase().includes(query.toLowerCase())
        );

        this.displayFavorites(filtered);
    }

    filterByCategory(category) {
        this.activeCategory = category;
        
        // Update UI
        document.querySelectorAll('.category-tag').forEach(tag => {
            if (tag.dataset.category === category) {
                tag.classList.add('active');
            } else {
                tag.classList.remove('active');
            }
        });

        if (category === 'all') {
            this.displayFavorites(this.favorites);
        } else {
            const filtered = this.favorites.filter(favorite => 
                favorite.category === category
            );
            this.displayFavorites(filtered);
        }
    }

    sortFavorites() {
        let sorted = [...this.favorites];
        
        switch(this.sortBy) {
            case 'recent':
                sorted.sort((a, b) => 
                    new Date(b.favorited_at || b.created_at) - new Date(a.favorited_at || a.created_at)
                );
                break;
            case 'oldest':
                sorted.sort((a, b) => 
                    new Date(a.favorited_at || a.created_at) - new Date(b.favorited_at || b.created_at)
                );
                break;
            case 'author':
                sorted.sort((a, b) => a.author.localeCompare(b.author));
                break;
            case 'category':
                sorted.sort((a, b) => a.category.localeCompare(b.category));
                break;
            case 'popular':
                sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
                break;
        }

        this.displayFavorites(sorted);
    }

    async removeFavorite(quoteId, element) {
        if (confirm('Remove this quote from favorites?')) {
            try {
                const result = await window.supabaseClient.toggleFavorite(quoteId);
                
                if (result.success && result.action === 'unfavorited') {
                    element.remove();
                    this.showNotification('Removed from favorites', 'success');
                    
                    // Reload favorites to update counts
                    await this.loadFavorites();
                    await this.loadFavoritesInsights();
                }
            } catch (error) {
                console.error('Error removing favorite:', error);
                this.showNotification('Failed to remove favorite', 'error');
            }
        }
    }

    viewFavorite(quoteId) {
        window.location.href = `quote-details.html?id=${quoteId}`;
    }

    shareFavorite(quote) {
        const text = `"${quote.text}" - ${quote.author}`;
        const url = `${window.location.origin}/quote-details.html?id=${quote.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Favorite Quote',
                text: text,
                url: url
            });
        } else {
            navigator.clipboard.writeText(`${text}\n\n${url}`);
            this.showNotification('Quote link copied to clipboard!', 'success');
        }
    }

    copyFavorite(quote) {
        const text = `"${quote.text}" - ${quote.author}`;
        navigator.clipboard.writeText(text);
        this.showNotification('Quote copied to clipboard!', 'success');
    }

    exportFavorites() {
        if (this.favorites.length === 0) {
            this.showNotification('No favorites to export', 'warning');
            return;
        }

        const exportData = {
            exportedAt: new Date().toISOString(),
            total: this.favorites.length,
            favorites: this.favorites.map(fav => ({
                text: fav.text,
                author: fav.author,
                category: fav.category,
                favorited_at: fav.favorited_at
            }))
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `quotely-favorites-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showNotification('Favorites exported successfully!', 'success');
    }

    confirmClearAll() {
        this.showConfirmationModal(
            'Are you sure you want to clear all favorites? This action cannot be undone.',
            async () => {
                await this.clearAllFavorites();
            }
        );
    }

    async clearAllFavorites() {
        try {
            // This would require a batch operation in Supabase
            // For now, we'll show a message
            this.showNotification('Bulk favorite removal coming soon', 'info');
            
            // Alternative: Remove each favorite individually
            /*
            for (const favorite of this.favorites) {
                await window.supabaseClient.toggleFavorite(favorite.id);
            }
            */
        } catch (error) {
            console.error('Error clearing favorites:', error);
            this.showNotification('Failed to clear favorites', 'error');
        }
    }

    openCollectionModal() {
        const modal = document.getElementById('collectionModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    async handleCreateCollection(form) {
        const formData = new FormData(form);
        const collectionData = {
            name: formData.get('name'),
            description: formData.get('description'),
            icon: document.querySelector('.icon-option.active')?.dataset.icon || 'fa-folder',
            color: document.querySelector('.color-option.active')?.dataset.color || '#4A90E2'
        };

        if (!collectionData.name) {
            this.showNotification('Collection name is required', 'error');
            return;
        }

        // Note: Collections would require a new table in Supabase
        // This is a placeholder for future implementation
        this.showNotification('Collection created! Feature in development.', 'success');
        this.closeModal('collectionModal');
        form.reset();
    }

    handleShare(platform) {
        switch(platform) {
            case 'twitter':
                this.shareToTwitter();
                break;
            case 'facebook':
                this.shareToFacebook();
                break;
            case 'pinterest':
                this.shareToPinterest();
                break;
            case 'copy':
                this.copyFavoritesLink();
                break;
            case 'download':
                this.exportFavorites();
                break;
            case 'email':
                this.emailFavorites();
                break;
        }
    }

    shareToTwitter() {
        const text = `Check out my favorite quotes on Quotely-hardy!`;
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
    }

    shareToFacebook() {
        const url = window.location.href;
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        window.open(facebookUrl, '_blank');
    }

    shareToPinterest() {
        // Pinterest sharing requires an image
        const url = window.location.href;
        const description = 'My favorite quotes on Quotely-hardy';
        const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(description)}`;
        window.open(pinterestUrl, '_blank');
    }

    copyFavoritesLink() {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        this.showNotification('Link copied to clipboard!', 'success');
    }

    emailFavorites() {
        const subject = 'My Favorite Quotes from Quotely-hardy';
        const body = `Check out my favorite quotes:\n\n${window.location.href}`;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }

    clearRecentlyViewed() {
        // Clear recently viewed from localStorage
        localStorage.removeItem('quotely_recently_viewed');
        this.showNotification('Recently viewed cleared', 'success');
        
        // Update UI
        const viewedContainer = document.getElementById('recentlyViewed');
        if (viewedContainer) {
            viewedContainer.innerHTML = '<p>No recently viewed quotes</p>';
        }
    }

    showEmptyState() {
        const container = document.getElementById('favoritesContainer');
        const emptyState = document.getElementById('emptyFavorites');
        
        if (container) container.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
    }

    showConfirmationModal(message, confirmCallback) {
        const modal = document.getElementById('confirmModal');
        const messageElement = document.getElementById('confirmMessage');
        const confirmButton = document.getElementById('confirmAction');
        
        if (modal && messageElement && confirmButton) {
            messageElement.textContent = message;
            
            // Set up confirm action
            const handleConfirm = () => {
                confirmCallback();
                this.closeModal('confirmModal');
                confirmButton.removeEventListener('click', handleConfirm);
            };
            
            confirmButton.addEventListener('click', handleConfirm);
            modal.classList.add('active');
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Add close button functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize favorites manager
document.addEventListener('DOMContentLoaded', () => {
    window.favoritesManager = new FavoritesManager();
