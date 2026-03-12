-- Run this in your Supabase SQL Editor to enable calculation history

CREATE TABLE IF NOT EXISTS calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    calc_type TEXT NOT NULL, -- 'SIP', 'EMI', 'CI', 'TAX', 'BUDGET'
    input_data JSONB NOT NULL,
    result_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

-- Create Policy for Users to insert their own records
CREATE POLICY "Users can insert their own calculations" 
ON calculations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create Policy for Users to view their own records
CREATE POLICY "Users can view their own calculations" 
ON calculations FOR SELECT 
USING (auth.uid() = user_id);

-- Create Policy for Users to delete their own records
CREATE POLICY "Users can delete their own calculations" 
ON calculations FOR DELETE 
USING (auth.uid() = user_id);

-- Create table for saved news articles
CREATE TABLE IF NOT EXISTS saved_news (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    snippet TEXT,
    url TEXT NOT NULL,
    domain TEXT,
    region TEXT NOT NULL, -- 'indian' or 'global'
    category TEXT,
    published_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, url) -- Prevent duplicate saves of same article by same user
);

-- Enable Row Level Security for saved_news
ALTER TABLE saved_news ENABLE ROW LEVEL SECURITY;

-- Create Policy for Users to insert their own saved news
CREATE POLICY "Users can save their own news articles" 
ON saved_news FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create Policy for Users to view their own saved news
CREATE POLICY "Users can view their own saved news" 
ON saved_news FOR SELECT 
USING (auth.uid() = user_id);

-- Create Policy for Users to delete their own saved news
CREATE POLICY "Users can delete their own saved news" 
ON saved_news FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance on saved news queries
CREATE INDEX IF NOT EXISTS idx_saved_news_user_region ON saved_news(user_id, region);
CREATE INDEX IF NOT EXISTS idx_saved_news_created_at ON saved_news(created_at DESC);
