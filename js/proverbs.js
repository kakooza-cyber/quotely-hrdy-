class ProverbsManager {
    constructor() {
        this.proverbs = [];
        this.categories = [];
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalProverbs = 0;
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadProverbs();
        this.setupEventListeners();
    }

    async loadCategories() {
        const result = await window.supabaseClient.getProverbs();
        if (result.success) {
            // Extract unique categories
            const categories = [...new Set(result.proverbs.map(p => p.category))].filter(Boolean);
            this.categories = categories;
            this.populateCategoryFilter();
        }
    }

    async loadProverbs(filters = {}) {
        const result = await window.supabaseClient.getProverbs(filters);
        if (result.success) {
            this.proverbs = result.proverbs;
            this.displayProverbs();
        }
    }

    populateCategoryFilter() {
        const filterSelect = document.getElementById('proverbCategoryFilter');
        if (!filterSelect) return;
        
        filterSelect.innerHTML = '<option value="">All Categories</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    displayProverbs() {
        const container = document.getElementById('proverbsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.proverbs.forEach(proverb => {
            const proverbElement = this.createProverbCard(proverb);
            container.appendChild(proverbElement);
        });
    }

    createProverbCard(proverb) {
        const card = document.createElement('div');
        card.className = 'proverb-card';
        card.innerHTML = `
            <div class="proverb-content">
                <p class="proverb-text">"${proverb.text}"</p>
                <div class="proverb-meta">
                    <span class="proverb-origin">
                        <i class="fas fa-globe"></i> ${proverb.origin}
                    </span>
                    ${proverb.category ? `<span class="proverb-category">${proverb.category}</span>` : ''}
                </div>
                ${proverb.meaning ? `<div class="proverb-meaning"><strong>Meaning:</strong> ${proverb.meaning}</div>` : ''}
                ${proverb.translation ? `<div class="proverb-translation"><strong>Translation:</strong> ${proverb.translation}</div>` : ''}
            </div>
            <div class="proverb-actions">
                <button class="btn-action copy-proverb" data-text="${proverb.text}">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <button class="btn-action share-proverb" data-text="${proverb.text}">
                    <i class="fas fa-share"></i> Share
                </button>
            </div>
        `;
        
        // Add event listeners
        card.querySelector('.copy-proverb').addEventListener('click', () => {
            this.copyProverb(proverb.text);
        });
        
        card.querySelector('.share-proverb').addEventListener('click', () => {
            this.shareProverb(proverb);
        });
        
        return card;
    }

    setupEventListeners() {
        // Category filter
        document.getElementById('proverbCategoryFilter')?.addEventListener('change', (e) => {
            this.filterProverbsByCategory(e.target.value);
        });
        
        // Origin filter
        document.getElementById('proverbOriginFilter')?.addEventListener('change', (e) => {
            this.filterProverbsByOrigin(e.target.value);
        });
        
        // Search
        document.getElementById('proverbSearch')?.addEventListener('input', (e) => {
            this.debouncedSearch(e.target.value);
        });
        
        // Load more button
        document.getElementById('loadMoreProverbs')?.addEventListener('click', () => {
            this.loadMoreProverbs();
        });
    }

    async filterProverbsByCategory(category) {
        const filters = {};
        if (category) filters.category = category;
        await this.loadProverbs(filters);
    }

    async filterProverbsByOrigin(origin) {
        const filters = {};
        if (origin) filters.origin = origin;
        await this.loadProverbs(filters);
    }

    async loadMoreProverbs() {
        this.currentPage++;
        // Implement pagination logic
    }

    copyProverb(text) {
        navigator.clipboard.writeText(text);
        this.showNotification('Proverb copied to clipboard!', 'success');
    }

    shareProverb(proverb) {
        const text = `"${proverb.text}" - ${proverb.origin} Proverb`;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank', 'width=600,height=400');
    }

    debouncedSearch = this.debounce(async (query) => {
        if (query.length < 2) return;
        
        const result = await window.supabaseClient.getProverbs({ search: query });
        if (result.success) {
            this.proverbs = result.proverbs;
            this.displayProverbs();
        }
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

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize proverbs manager
document.addEventListener('DOMContentLoaded', () => {
    window.proverbsManager = new ProverbsManager();
});
