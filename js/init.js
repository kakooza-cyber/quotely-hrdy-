// js/init.js - Main initialization

(async function() {
    // Load configuration
    let config;
    
    try {
        const response = await fetch('/.netlify/functions/get-config');
        if (response.ok) {
            config = await response.json();
        } else {
            throw new Error('Failed to load config');
        }
    } catch (error) {
        console.warn('Using fallback configuration');
        config = {
            supabaseUrl: 'https://fallback-project.supabase.co',
            supabaseAnonKey: 'fallback-anon-key',
            environment: 'development'
        };
    }
    
    // Store config globally
    window.AppConfig = config;
    
    // Initialize Supabase client
    await initializeSupabase(config);
    
    // Start the app
    if (window.appManager) {
        window.appManager.init();
    }
    
    console.log('App initialized in', config.environment, 'environment');
})();

async function initializeSupabase(config) {
    // Load Supabase library
    if (!window.supabase) {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    }
    
    // Create client
    window.supabaseClient = supabase.createClient(
        config.supabaseUrl,
        config.supabaseAnonKey
    );
    
    // Check session
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        window.user = session.user;
    }
    
    // Set up auth state change listener
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        window.user = session?.user || null;
    });
}

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}
