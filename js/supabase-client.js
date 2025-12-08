// Supabase Client Configuration
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.user = null;
        this.initialize();
    }

    async initialize() {
        // Load Supabase client
        if (typeof supabase === 'undefined') {
            // Dynamically load Supabase client
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            document.head.appendChild(script);
            
            await new Promise(resolve => {
                script.onload = resolve;
            });
        }

        // Initialize Supabase client
        const supabaseUrl = 'https://YOUR_SUPABASE_PROJECT.supabase.co';
        const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
        
        this.supabase = supabase.createClient(supabaseUrl, supabaseKey);
        
        // Check for existing session
        await this.checkSession();
        
        // Listen for auth changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                localStorage.setItem('supabase_session', JSON.stringify(session));
                this.updateUIForLoggedInUser();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                localStorage.removeItem('supabase_session');
                this.updateUIForLoggedOutUser();
            }
        });
    }

    async checkSession() {
        const sessionStr = localStorage.getItem('supabase_session');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                const { data, error } = await this.supabase.auth.setSession(session);
                if (!error && data.user) {
                    this.user = data.user;
                    this.updateUIForLoggedInUser();
                }
            } catch (error) {
                console.error('Error restoring session:', error);
                localStorage.removeItem('supabase_session');
            }
        }
    }

    updateUIForLoggedInUser() {
        // Update UI elements for logged in user
        const loginLinks = document.querySelectorAll('.auth-links, .login-section');
        const userSections = document.querySelectorAll('.user-section, .user-menu');
        
        loginLinks.forEach(el => el.style.display = 'none');
        userSections.forEach(el => el.style.display = 'block');
        
        // Update user info
        if (this.user) {
            document.querySelectorAll('.user-name').forEach(el => {
                el.textContent = this.user.user_metadata?.full_name || this.user.email;
            });
            
            document.querySelectorAll('.user-avatar').forEach(el => {
                el.src = this.user.user_metadata?.avatar_url || 
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(this.user.email)}&background=4A90E2&color=fff`;
            });
        }
    }

    updateUIForLoggedOutUser() {
        const loginLinks = document.querySelectorAll('.auth-links, .login-section');
        const userSections = document.querySelectorAll('.user-section, .user-menu');
        
        loginLinks.forEach(el => el.style.display = 'block');
        userSections.forEach(el => el.style.display = 'none');
    }

    // Auth Methods
    async signUp(email, password, userData = {}) {
        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: userData.name,
                        username: userData.username,
                        ...userData
                    }
                }
            });

            if (error) throw error;

            // Create profile record
            if (data.user) {
                await this.createProfile(data.user.id, {
                    username: userData.username,
                    full_name: userData.name
                });
            }

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    async signInWithProvider(provider) {
        try {
            const { data, error } = await this.supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin + '/dashboard.html'
                }
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Social login error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    }

    // Profile Methods
    async createProfile(userId, profileData) {
        try {
            const { error } = await this.supabase
                .from('profiles')
                .insert({
                    id: userId,
                    ...profileData
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Create profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async getProfile(userId = null) {
        try {
            const targetUserId = userId || this.user?.id;
            if (!targetUserId) throw new Error('No user ID provided');

            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', targetUserId)
                .single();

            if (error) throw error;
            return { success: true, profile: data };
        } catch (error) {
            console.error('Get profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProfile(profileData) {
        try {
            if (!this.user) throw new Error('User not authenticated');

            const { error } = await this.supabase
                .from('profiles')
                .update(profileData)
                .eq('id', this.user.id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }

    // Quotes Methods
    async getDailyQuote() {
        try {
            const { data, error } = await this.supabase
                .rpc('get_daily_quote');

            if (error) throw error;
            
            // If no daily quote set, get random featured quote
            if (!data || data.length === 0) {
                return await this.getRandomQuote();
            }

            return { success: true, quote: data[0] };
        } catch (error) {
            console.error('Get daily quote error:', error);
            return await this.getRandomQuote();
        }
    }

    async getRandomQuote() {
        try {
            const { data, error } = await this.supabase
                .from('quotes')
                .select('*')
                .eq('approved', true)
                .order('likes_count', { ascending: false })
                .limit(1);

            if (error) throw error;
            return { success: true, quote: data[0] };
        } catch (error) {
            console.error('Get random quote error:', error);
            return { success: false, error: error.message };
        }
    }

    async getQuotes(filters = {}, page = 1, pageSize = 20) {
        try {
            let query = this.supabase
                .from('quotes')
                .select('*', { count: 'exact' })
                .eq('approved', true);

            // Apply filters
            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            if (filters.author) {
                query = query.ilike('author', `%${filters.author}%`);
            }
            if (filters.search) {
                query = query.or(`text.ilike.%${filters.search}%,author.ilike.%${filters.search}%`);
            }
            if (filters.featured) {
                query = query.eq('featured', true);
            }

            // Apply pagination
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            // Check user interactions
            const quotesWithInteractions = await this.addUserInteractions(data);

            return {
                success: true,
                quotes: quotesWithInteractions,
                total: count,
                page,
                totalPages: Math.ceil(count / pageSize)
            };
        } catch (error) {
            console.error('Get quotes error:', error);
            return { success: false, error: error.message };
        }
    }

    async getQuoteById(id) {
        try {
            const { data, error } = await this.supabase
                .from('quotes')
                .select('*')
                .eq('id', id)
                .eq('approved', true)
                .single();

            if (error) throw error;

            // Add user interactions
            const quoteWithInteractions = await this.addUserInteractions([data]);

            return { success: true, quote: quoteWithInteractions[0] };
        } catch (error) {
            console.error('Get quote by ID error:', error);
            return { success: false, error: error.message };
        }
    }

    async submitQuote(quoteData) {
        try {
            if (!this.user) throw new Error('User not authenticated');

            const { data, error } = await this.supabase
                .from('quotes')
                .insert({
                    ...quoteData,
                    created_by: this.user.id
                })
                .select()
                .single();

            if (error) throw error;
            return { success: true, quote: data };
        } catch (error) {
            console.error('Submit quote error:', error);
            return { success: false, error: error.message };
        }
    }

    // Proverbs Methods
    async getProverbs(filters = {}) {
        try {
            let query = this.supabase.from('proverbs');

            if (filters.category) {
                query = query.eq('category', filters.category);
            }
            if (filters.origin) {
                query = query.eq('origin', filters.origin);
            }
            if (filters.search) {
                query = query.or(`text.ilike.%${filters.search}%,origin.ilike.%${filters.search}%`);
            }

            const { data, error } = await query
                .select('*')
                .order('likes_count', { ascending: false });

            if (error) throw error;
            return { success: true, proverbs: data };
        } catch (error) {
            console.error('Get proverbs error:', error);
            return { success: false, error: error.message };
        }
    }

    // User Interactions
    async addUserInteractions(quotes) {
        if (!this.user || !quotes || quotes.length === 0) {
            return quotes.map(quote => ({
                ...quote,
                is_liked: false,
                is_favorited: false
            }));
        }

        const quoteIds = quotes.map(q => q.id);
        
        // Get user likes
        const { data: likes } = await this.supabase
            .from('user_likes')
            .select('quote_id')
            .eq('user_id', this.user.id)
            .in('quote_id', quoteIds);

        // Get user favorites
        const { data: favorites } = await this.supabase
            .from('user_favorites')
            .select('quote_id')
            .eq('user_id', this.user.id)
            .in('quote_id', quoteIds);

        const likedIds = new Set(likes?.map(l => l.quote_id) || []);
        const favoritedIds = new Set(favorites?.map(f => f.quote_id) || []);

        return quotes.map(quote => ({
            ...quote,
            is_liked: likedIds.has(quote.id),
            is_favorited: favoritedIds.has(quote.id)
        }));
    }

    async toggleLike(quoteId) {
        try {
            if (!this.user) throw new Error('User not authenticated');

            // Check if already liked
            const { data: existingLike } = await this.supabase
                .from('user_likes')
                .select('id')
                .eq('user_id', this.user.id)
                .eq('quote_id', quoteId)
                .single();

            if (existingLike) {
                // Unlike
                const { error } = await this.supabase
                    .from('user_likes')
                    .delete()
                    .eq('id', existingLike.id);

                if (error) throw error;
                return { success: true, action: 'unliked' };
            } else {
                // Like
                const { error } = await this.supabase
                    .from('user_likes')
                    .insert({
                        user_id: this.user.id,
                        quote_id: quoteId
                    });

                if (error) throw error;
                return { success: true, action: 'liked' };
            }
        } catch (error) {
            console.error('Toggle like error:', error);
            return { success: false, error: error.message };
        }
    }

    async toggleFavorite(quoteId) {
        try {
            if (!this.user) throw new Error('User not authenticated');

            // Check if already favorited
            const { data: existingFavorite } = await this.supabase
                .from('user_favorites')
                .select('id')
                .eq('user_id', this.user.id)
                .eq('quote_id', quoteId)
                .single();

            if (existingFavorite) {
                // Remove favorite
                const { error } = await this.supabase
                    .from('user_favorites')
                    .delete()
                    .eq('id', existingFavorite.id);

                if (error) throw error;
                return { success: true, action: 'unfavorited' };
            } else {
                // Add favorite
                const { error } = await this.supabase
                    .from('user_favorites')
                    .insert({
                        user_id: this.user.id,
                        quote_id: quoteId
                    });

                if (error) throw error;
                return { success: true, action: 'favorited' };
            }
        } catch (error) {
            console.error('Toggle favorite error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserFavorites(page = 1, pageSize = 20) {
        try {
            if (!this.user) throw new Error('User not authenticated');

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await this.supabase
                .from('user_favorites')
                .select(`
                    quote_id,
                    quotes (*)
                `)
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const quotes = data.map(item => ({
                ...item.quotes,
                favorited_at: item.created_at
            }));

            return {
                success: true,
                quotes: quotes,
                total: count,
                page,
                totalPages: Math.ceil(count / pageSize)
            };
        } catch (error) {
            console.error('Get user favorites error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserStats() {
        try {
            if (!this.user) throw new Error('User not authenticated');

            // Get profile with stats
            const profileResult = await this.getProfile();
            if (!profileResult.success) throw new Error(profileResult.error);

            // Get favorites count
            const { count: favoritesCount } = await this.supabase
                .from('user_favorites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.user.id);

            // Get likes count
            const { count: likesCount } = await this.supabase
                .from('user_likes')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', this.user.id);

            // Update streak if last visited was yesterday
            const today = new Date().toISOString().split('T')[0];
            const lastVisited = profileResult.profile.last_visited;
            
            let streak = profileResult.profile.streak_days || 0;
            if (lastVisited) {
                const lastVisitedDate = new Date(lastVisited);
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                if (lastVisitedDate.toDateString() === yesterday.toDateString()) {
                    streak += 1;
                } else if (lastVisitedDate.toDateString() !== new Date().toDateString()) {
                    streak = 1;
                }
            } else {
                streak = 1;
            }

            // Update last visited
            await this.supabase
                .from('profiles')
                .update({
                    last_visited: today,
                    streak_days: streak,
                    favorites_count: favoritesCount || 0,
                    likes_count: likesCount || 0
                })
                .eq('id', this.user.id);

            return {
                success: true,
                stats: {
                    favorites: favoritesCount || 0,
                    likes: likesCount || 0,
                    shares: profileResult.profile.shares_count || 0,
                    streak: streak,
                    viewed: profileResult.profile.views_count || 0
                }
            };
        } catch (error) {
            console.error('Get user stats error:', error);
          return { success: false, error: error.message };
        }
    }

    // Newsletter
    async subscribeToNewsletter(email) {
        try {
            const { error } = await this.supabase
                .from('newsletter_subscribers')
                .insert({
                    email,
                    user_id: this.user?.id || null
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Newsletter subscription error:', error);
            return { success: false, error: error.message };
        }
    }

    // Contact Form
    async submitContactForm(contactData) {
        try {
            const { error } = await this.supabase
                .from('contact_submissions')
                .insert({
                    ...contactData,
                    user_id: this.user?.id || null
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Contact form submission error:', error);
            return { success: false, error: error.message };
        }
    }

    // Search
    async searchQuotes(query, category = null) {
        try {
            let queryBuilder = this.supabase
                .from('quotes')
                .select('*')
                .eq('approved', true)
                .or(`text.ilike.%${query}%,author.ilike.%${query}%`);

            if (category) {
                queryBuilder = queryBuilder.eq('category', category);
            }

            const { data, error } = await queryBuilder
                .order('likes_count', { ascending: false })
                .limit(50);

            if (error) throw error;

            const quotesWithInteractions = await this.addUserInteractions(data);
            return { success: true, quotes: quotesWithInteractions };
        } catch (error) {
            console.error('Search quotes error:', error);
            return { success: false, error: error.message };
        }
    }

    // Categories
    async getCategories() {
        try {
            const { data, error } = await this.supabase
                .from('quotes')
                .select('category')
                .eq('approved', true);

            if (error) throw error;

            // Get unique categories
            const categories = [...new Set(data.map(item => item.category))];
            return { success: true, categories };
        } catch (error) {
            console.error('Get categories error:', error);
            return { success: false, error: error.message };
        }
    }

    // Real-time subscriptions
    subscribeToQuoteUpdates(callback) {
        if (!this.supabase) return null;

        return this.supabase
            .channel('quotes-changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'quotes' }, 
                callback
            )
            .subscribe();
    }

    subscribeToUserFavorites(callback) {
        if (!this.supabase || !this.user) return null;

        return this.supabase
            .channel('user-favorites-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'user_favorites',
                    filter: `user_id=eq.${this.user.id}`
                }, 
                callback
            )
            .subscribe();
    }
}

// Create and export global instance
window.supabaseClient = new SupabaseClient();
          
