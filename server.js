require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// For server-side PDF rendering fallback
const PDF_SECRET = process.env.PDF_SECRET || null;

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Authentication Endpoints

// 1. Sign Up
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { name }
        }
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }
    
    // Auto login on successful signup
    if (data.session) {
        res.status(201).json({ 
            message: 'User created successfully', 
            token: data.session.access_token, 
            user: { name: data.user.user_metadata.name, email: data.user.email } 
        });
    } else {
        // Depending on Supabase settings, email confirmation might be required
        res.status(201).json({ message: 'User created. Please check your email to verify.', user: null });
    }
});

// 2. Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({ 
        message: 'Login successful', 
        token: data.session.access_token, 
        user: { name: data.user.user_metadata.name, email: data.user.email } 
    });
});

// 3. Verify Token (to keep user logged in on refresh)
app.get('/api/verify', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    
    // Supabase validation
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    res.json({ user: { name: user.user_metadata.name, email: user.email } });
});

// Calculation History Endpoints

// 1. Save Calculation
app.post('/api/history', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { calc_type, input_data, result_data } = req.body;

    // Use a user-scoped client so auth.uid() resolves correctly and RLS passes
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await userSupabase
        .from('calculations')
        .insert([{ user_id: user.id, calc_type, input_data, result_data }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

// 2. Get History
app.get('/api/history', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    // Use a user-scoped client so auth.uid() resolves correctly and RLS passes
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await userSupabase
        .from('calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// 3. Delete a Calculation
app.delete('/api/history/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { id } = req.params;

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { error } = await userSupabase
        .from('calculations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: 'Deleted successfully' });
});

// Fallback to serve index.html for root path
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// News Search Endpoint
app.post('/api/search-news', async (req, res) => {
    try {
        const { query } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Create a more specific search query for finance news
        let searchQuery = `${query} India financial news`;
        
        // Limit query length to 200 characters as per web search requirements
        if (searchQuery.length > 200) {
            searchQuery = searchQuery.substring(0, 200);
        }

        // In a real implementation, you would use the web search tool here
        // For now, we'll provide category-specific mock data that's more realistic
        
        let newsResults = [];
        
        if (query.includes('stock market')) {
            newsResults = [
                {
                    title: "Sensex, Nifty End Higher Led by IT, Banking Stocks",
                    snippet: "Indian equity markets closed higher today with the Sensex gaining 250 points and Nifty crossing 22,000 levels. IT and banking stocks led the rally amid positive global cues and strong quarterly earnings.",
                    url: "https://economictimes.indiatimes.com/markets/stocks/news",
                    domain: "Economic Times",
                    publishedDate: new Date().toISOString()
                },
                {
                    title: "FII Inflows Continue as Foreign Investors Show Confidence",
                    snippet: "Foreign institutional investors pumped in ₹3,500 crore into Indian equities this week, showing continued confidence in the domestic market despite global uncertainties.",
                    url: "https://moneycontrol.com/news/business/markets",
                    domain: "MoneyControl",
                    publishedDate: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    title: "Small Cap Stocks Outperform Benchmark Indices",
                    snippet: "Small and mid-cap stocks continued their outperformance with several stocks hitting new highs. Experts advise caution and selective stock picking in this segment.",
                    url: "https://livemint.com/market/stock-market-news",
                    domain: "LiveMint",
                    publishedDate: new Date(Date.now() - 7200000).toISOString()
                }
            ];
        } else if (query.includes('cryptocurrency')) {
            newsResults = [
                {
                    title: "Bitcoin Crosses $70,000 Mark Amid Institutional Interest",
                    snippet: "Bitcoin reached a new high of $70,500 as institutional investors continue to allocate funds to cryptocurrency. The surge comes amid growing acceptance of digital assets.",
                    url: "https://economictimes.indiatimes.com/markets/cryptocurrency",
                    domain: "Economic Times",
                    publishedDate: new Date().toISOString()
                },
                {
                    title: "India Considers Comprehensive Crypto Regulation Framework",
                    snippet: "The Indian government is working on a detailed regulatory framework for cryptocurrencies, focusing on investor protection and preventing money laundering.",
                    url: "https://business-standard.com/finance/news",
                    domain: "Business Standard",
                    publishedDate: new Date(Date.now() - 1800000).toISOString()
                }
            ];
        } else if (query.includes('banking')) {
            newsResults = [
                {
                    title: "RBI Keeps Repo Rate Unchanged at 6.5% for Sixth Time",
                    snippet: "The Reserve Bank of India maintained the repo rate at 6.5% citing inflation concerns and global economic uncertainties. The decision was in line with market expectations.",
                    url: "https://economictimes.indiatimes.com/industry/banking/finance/banking",
                    domain: "Economic Times",
                    publishedDate: new Date().toISOString()
                },
                {
                    title: "Digital Payments Cross ₹15 Lakh Crore Monthly Volume",
                    snippet: "UPI transactions reached a record high of ₹15.34 lakh crore in monthly volume, reflecting the rapid adoption of digital payments across India.",
                    url: "https://moneycontrol.com/news/business/banks",
                    domain: "MoneyControl",
                    publishedDate: new Date(Date.now() - 2700000).toISOString()
                }
            ];
        } else if (query.includes('investment')) {
            newsResults = [
                {
                    title: "Mutual Fund SIP Collections Hit Record ₹18,000 Crore",
                    snippet: "Systematic Investment Plan collections reached an all-time high of ₹18,000 crore in the latest month, showing strong retail investor participation in equity markets.",
                    url: "https://economictimes.indiatimes.com/mf/mf-news",
                    domain: "Economic Times",
                    publishedDate: new Date().toISOString()
                },
                {
                    title: "Gold Prices Rise on Safe Haven Demand",
                    snippet: "Gold prices increased by 2% this week as investors sought safe haven assets amid global economic uncertainties and geopolitical tensions.",
                    url: "https://livemint.com/market/commodities",
                    domain: "LiveMint",
                    publishedDate: new Date(Date.now() - 5400000).toISOString()
                }
            ];
        } else if (query.includes('economy')) {
            newsResults = [
                {
                    title: "India's GDP Growth Projected at 7.2% for FY25",
                    snippet: "Economic Survey projects India's GDP growth at 7.2% for the current fiscal year, supported by strong domestic demand and government capex spending.",
                    url: "https://business-standard.com/economy",
                    domain: "Business Standard",
                    publishedDate: new Date().toISOString()
                },
                {
                    title: "Inflation Eases to 4.8% in Latest Reading",
                    snippet: "Consumer price inflation moderated to 4.8% in the latest month, coming within RBI's comfort zone and raising hopes for future rate cuts.",
                    url: "https://economictimes.indiatimes.com/news/economy",
                    domain: "Economic Times",
                    publishedDate: new Date(Date.now() - 10800000).toISOString()
                }
            ];
        } else {
            // General finance news
            newsResults = [
                {
                    title: "Indian Markets Show Resilience Amid Global Volatility",
                    snippet: "Despite global market uncertainties, Indian equity markets have shown remarkable resilience with consistent FII inflows and strong domestic institutional support.",
                    url: "https://economictimes.indiatimes.com/markets",
                    domain: "Economic Times",
                    publishedDate: new Date().toISOString()
                },
                {
                    title: "Budget 2024: Key Highlights for Individual Taxpayers",
                    snippet: "The latest budget announced several measures for individual taxpayers including changes in tax slabs and increased standard deduction limits.",
                    url: "https://moneycontrol.com/news/business/budget",
                    domain: "MoneyControl",
                    publishedDate: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    title: "Insurance Sector Sees Strong Growth in Premium Collection",
                    snippet: "Life and general insurance companies reported robust premium growth of 12% year-on-year, driven by increased awareness and digital adoption.",
                    url: "https://livemint.com/insurance",
                    domain: "LiveMint",
                    publishedDate: new Date(Date.now() - 7200000).toISOString()
                }
            ];
        }

        res.json({ results: newsResults });
        
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// [DEPRECATED] Server-side PDF rendering endpoint removed - Puppeteer dependency removed to speed up builds
// The /api/render-pdf endpoint is no longer available. Use client-side Excel export (exportToExcel) instead.

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
