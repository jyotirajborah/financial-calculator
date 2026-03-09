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
