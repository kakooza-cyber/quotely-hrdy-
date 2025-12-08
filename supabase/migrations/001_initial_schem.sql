-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    favorites_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_visited DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create quotes table
CREATE TABLE public.quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT,
    tags TEXT[] DEFAULT '{}',
    background_url TEXT,
    likes_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- RLS for quotes
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quotes are viewable by everyone"
    ON public.quotes FOR SELECT
    USING (approved = true);

CREATE POLICY "Authenticated users can insert quotes"
    ON public.quotes FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own quotes"
    ON public.quotes FOR UPDATE
    USING (auth.uid() = created_by);

-- Create proverbs table
CREATE TABLE public.proverbs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    text TEXT NOT NULL,
    origin TEXT NOT NULL,
    translation TEXT,
    meaning TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    language TEXT DEFAULT 'English',
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.proverbs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proverbs are viewable by everyone" ON public.proverbs FOR SELECT USING (true);

-- Create user_favorites table
CREATE TABLE public.user_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, quote_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own favorites" 
    ON public.user_favorites FOR ALL 
    USING (auth.uid() = user_id);

-- Create user_likes table
CREATE TABLE public.user_likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(user_id, quote_id)
);

ALTER TABLE public.user_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own likes" 
    ON public.user_likes FOR ALL 
    USING (auth.uid() = user_id);

-- Create newsletter_subscribers table
CREATE TABLE public.newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view subscribers" ON public.newsletter_subscribers FOR SELECT USING (auth.role() = 'authenticated');

-- Create contact_submissions table
CREATE TABLE public.contact_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can insert contact submissions" 
    ON public.contact_submissions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Create daily_quotes table
CREATE TABLE public.daily_quotes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_id UUID REFERENCES public.quotes(id),
    date DATE UNIQUE NOT NULL,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_quotes_category ON public.quotes(category);
CREATE INDEX idx_quotes_author ON public.quotes(author);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX idx_proverbs_category ON public.proverbs(category);
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_likes_user_id ON public.user_likes(user_id);

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'user_favorites' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.profiles 
            SET favorites_count = favorites_count + 1,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
            UPDATE public.quotes 
            SET favorites_count = favorites_count + 1
            WHERE id = NEW.quote_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.profiles 
            SET favorites_count = favorites_count - 1,
                updated_at = NOW()
            WHERE id = OLD.user_id;
            
            UPDATE public.quotes 
            SET favorites_count = favorites_count - 1
            WHERE id = OLD.quote_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'user_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.profiles 
            SET likes_count = likes_count + 1,
                updated_at = NOW()
            WHERE id = NEW.user_id;
            
            UPDATE public.quotes 
            SET likes_count = likes_count + 1
            WHERE id = NEW.quote_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.profiles 
            SET likes_count = likes_count - 1,
                updated_at = NOW()
            WHERE id = OLD.user_id;
            
            UPDATE public.quotes 
            SET likes_count = likes_count - 1
            WHERE id = OLD.quote_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for favorites and likes
CREATE TRIGGER update_stats_on_favorite
    AFTER INSERT OR DELETE ON public.user_favorites
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

CREATE TRIGGER update_stats_on_like
    AFTER INSERT OR DELETE ON public.user_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats();

-- Function to get daily quote
CREATE OR REPLACE FUNCTION get_daily_quote()
RETURNS TABLE (
    id UUID,
    text TEXT,
    author TEXT,
    category TEXT,
    background_url TEXT,
    likes_count INTEGER,
    favorites_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.text,
        q.author,
        q.category,
        q.background_url,
        q.likes_count,
        q.favorites_count
    FROM public.daily_quotes dq
    JOIN public.quotes q ON dq.quote_id = q.id
    WHERE dq.date = CURRENT_DATE
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
