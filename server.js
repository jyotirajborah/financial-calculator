require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Log environment information
console.log('🚀 Starting FinCalc Server...');
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('🌐 Site URL:', process.env.SITE_URL || 'Not configured');
console.log('🔗 Port:', PORT);

// For server-side PDF rendering fallback
const PDF_SECRET = process.env.PDF_SECRET || null;

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase configuration');
    console.error('SUPABASE_URL:', !!SUPABASE_URL);
    console.error('SUPABASE_KEY:', !!SUPABASE_KEY);
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Serve reset password page - must come before other routes
app.get('/reset-password', (req, res) => {
    console.log('Reset password page requested');
    res.sendFile(path.join(__dirname, 'reset-password.html'));
});

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

// 3. Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Please provide an email address.' });
    }

    // Determine the correct redirect URL based on environment
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const baseUrl = isDevelopment ? 'http://localhost:3000' : (process.env.SITE_URL || 'https://jyotirajborah.github.io/financial-calculator');
    const redirectUrl = `${baseUrl}/reset-password`;

    console.log('Sending password reset email with redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
    });

    if (error) {
        console.error('Password reset error:', error);
        return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Password reset link sent to your email.' });
});

// 4. Reset Password (handle the callback from email)
app.post('/api/reset-password', async (req, res) => {
    const { access_token, refresh_token, new_password } = req.body;

    if (!access_token || !refresh_token || !new_password) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }

    // Set the session with the tokens from the email link
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
    });

    if (sessionError) {
        return res.status(400).json({ error: sessionError.message });
    }

    // Update the password
    const { data, error } = await supabase.auth.updateUser({
        password: new_password
    });

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.status(200).json({ message: 'Password updated successfully.' });
});

// 5. Verify Token (to keep user logged in on refresh)
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
        const { query, region } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        let newsResults = [];
        
        if (region === 'indian') {
            // Indian Finance News
            if (query.includes('stock market')) {
                newsResults = [
                    {
                        title: "Sensex Gains 350 Points, Nifty Crosses 22,100 on Banking Rally",
                        snippet: "Indian equity markets surged today with the Sensex gaining 350 points and Nifty crossing 22,100 levels. Banking and IT stocks led the rally amid positive quarterly earnings and FII inflows.",
                        url: "https://economictimes.indiatimes.com/markets/stocks/news",
                        domain: "Economic Times",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "FII Inflows Touch ₹4,200 Crore This Week",
                        snippet: "Foreign institutional investors pumped in ₹4,200 crore into Indian equities this week, showing strong confidence in domestic markets despite global uncertainties.",
                        url: "https://moneycontrol.com/news/business/markets",
                        domain: "MoneyControl",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "Mid-Cap Stocks Outshine Large Caps in March Rally",
                        snippet: "Mid-cap and small-cap indices have outperformed benchmark indices by 3-4% this month, driven by strong domestic institutional buying and retail participation.",
                        url: "https://livemint.com/market/stock-market-news",
                        domain: "LiveMint",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "IPO Market Sees Strong Revival with 5 New Listings",
                        snippet: "The primary market witnessed strong activity with 5 new IPO listings this week, raising over ₹2,500 crore collectively from retail and institutional investors.",
                        url: "https://business-standard.com/markets/ipo",
                        domain: "Business Standard",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "Adani Group Stocks Rally 8% on Debt Reduction News",
                        snippet: "Adani Group stocks surged up to 8% after the conglomerate announced successful debt reduction of ₹15,000 crore through asset monetization and strategic partnerships.",
                        url: "https://economictimes.indiatimes.com/markets/stocks/news",
                        domain: "Economic Times",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            } else if (query.includes('banking')) {
                newsResults = [
                    {
                        title: "RBI Maintains Repo Rate at 6.5% for Seventh Consecutive Time",
                        snippet: "The Reserve Bank of India kept the repo rate unchanged at 6.5% citing persistent inflation concerns and global economic uncertainties. The decision was unanimous.",
                        url: "https://economictimes.indiatimes.com/industry/banking/finance/banking",
                        domain: "Economic Times",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "HDFC Bank Q4 Results: Net Profit Rises 24% to ₹16,512 Crore",
                        snippet: "HDFC Bank reported a 24% increase in net profit to ₹16,512 crore for Q4FY24, driven by strong loan growth and improved asset quality metrics.",
                        url: "https://moneycontrol.com/news/business/banks",
                        domain: "MoneyControl",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "UPI Transactions Cross ₹18 Lakh Crore Monthly Volume",
                        snippet: "Unified Payments Interface transactions reached a record high of ₹18.41 lakh crore in monthly volume, reflecting the rapid digitization of payments in India.",
                        url: "https://livemint.com/industry/banking",
                        domain: "LiveMint",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "PSU Banks Show Strong Credit Growth of 15.2% YoY",
                        snippet: "Public sector banks reported robust credit growth of 15.2% year-on-year, outpacing private banks as government initiatives boost lending to priority sectors.",
                        url: "https://business-standard.com/industry/banking",
                        domain: "Business Standard",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "SBI Launches New Digital Banking Platform for MSMEs",
                        snippet: "State Bank of India unveiled a comprehensive digital banking platform specifically designed for micro, small and medium enterprises, offering instant loan approvals.",
                        url: "https://economictimes.indiatimes.com/industry/banking",
                        domain: "Economic Times",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            } else if (query.includes('cryptocurrency')) {
                newsResults = [
                    {
                        title: "India Considers Pilot Program for Digital Rupee Expansion",
                        snippet: "The Reserve Bank of India is evaluating a broader pilot program for the Central Bank Digital Currency (CBDC) after successful initial trials with select banks.",
                        url: "https://economictimes.indiatimes.com/markets/cryptocurrency",
                        domain: "Economic Times",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "Crypto Tax Collections Rise 40% in FY24",
                        snippet: "Cryptocurrency tax collections increased by 40% in FY24 as more traders reported their gains following the implementation of 30% tax on crypto profits.",
                        url: "https://business-standard.com/finance/news",
                        domain: "Business Standard",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "WazirX Sees 60% Jump in Trading Volume Post Regulatory Clarity",
                        snippet: "Indian crypto exchange WazirX reported a 60% increase in trading volume following recent regulatory clarifications from the Finance Ministry on crypto taxation.",
                        url: "https://moneycontrol.com/news/business/cryptocurrency",
                        domain: "MoneyControl",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "Blockchain Adoption in Banking Sector Accelerates",
                        snippet: "Major Indian banks are accelerating blockchain adoption for trade finance and cross-border payments, with ICICI Bank leading the implementation.",
                        url: "https://livemint.com/technology/blockchain",
                        domain: "LiveMint",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "India Ranks 3rd Globally in Crypto Adoption: Report",
                        snippet: "India secured the third position globally in cryptocurrency adoption according to a new report, driven by young demographics and increasing digital literacy.",
                        url: "https://economictimes.indiatimes.com/markets/cryptocurrency",
                        domain: "Economic Times",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            } else {
                // General Indian Finance News
                newsResults = [
                    {
                        title: "India's GDP Growth Projected at 7.3% for FY25: Economic Survey",
                        snippet: "The Economic Survey projects India's GDP growth at 7.3% for FY25, supported by strong domestic demand, government capex, and improving global conditions.",
                        url: "https://economictimes.indiatimes.com/news/economy",
                        domain: "Economic Times",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "Mutual Fund SIP Collections Hit Record ₹19,270 Crore",
                        snippet: "Systematic Investment Plan collections reached an all-time high of ₹19,270 crore in the latest month, showing strong retail investor participation in equity markets.",
                        url: "https://moneycontrol.com/news/business/mutual-funds",
                        domain: "MoneyControl",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "Inflation Moderates to 4.6% in February",
                        snippet: "Consumer price inflation eased to 4.6% in February from 5.1% in January, coming closer to RBI's target range and raising hopes for future rate cuts.",
                        url: "https://livemint.com/economy/inflation",
                        domain: "LiveMint",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "GST Collections Cross ₹1.78 Lakh Crore in March",
                        snippet: "Goods and Services Tax collections crossed ₹1.78 lakh crore in March, marking the highest monthly collection and reflecting strong economic activity.",
                        url: "https://business-standard.com/economy/news",
                        domain: "Business Standard",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "Foreign Exchange Reserves Touch $648 Billion",
                        snippet: "India's foreign exchange reserves reached $648 billion, providing a strong buffer against external shocks and supporting the rupee's stability.",
                        url: "https://economictimes.indiatimes.com/news/economy",
                        domain: "Economic Times",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            }
        } else {
            // Global Finance News
            if (query.includes('stock market')) {
                newsResults = [
                    {
                        title: "S&P 500 Hits New Record High on Tech Rally",
                        snippet: "The S&P 500 reached a new all-time high as technology stocks surged, with Nvidia and Microsoft leading gains amid strong AI-related earnings.",
                        url: "https://reuters.com/markets/us",
                        domain: "Reuters",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "European Markets Rise on ECB Rate Cut Hopes",
                        snippet: "European stock markets gained 1.5% as investors bet on potential ECB rate cuts following softer inflation data from major eurozone economies.",
                        url: "https://bloomberg.com/news/markets",
                        domain: "Bloomberg",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "China's Shanghai Composite Jumps 2.8% on Stimulus Measures",
                        snippet: "Chinese stocks rallied after Beijing announced new stimulus measures to support the property sector and boost domestic consumption.",
                        url: "https://cnbc.com/world/asia",
                        domain: "CNBC",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "Japanese Yen Weakens to 151 Against Dollar",
                        snippet: "The Japanese yen fell to 151 against the US dollar, prompting speculation about potential intervention by the Bank of Japan to support the currency.",
                        url: "https://ft.com/markets",
                        domain: "Financial Times",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "Oil Prices Surge 3% on Middle East Tensions",
                        snippet: "Crude oil prices jumped 3% to $87 per barrel as geopolitical tensions in the Middle East raised concerns about potential supply disruptions.",
                        url: "https://wsj.com/markets/commodities",
                        domain: "Wall Street Journal",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            } else if (query.includes('banking')) {
                newsResults = [
                    {
                        title: "Federal Reserve Signals Potential Rate Cuts in 2024",
                        snippet: "Fed Chair Jerome Powell indicated that rate cuts could begin in the second half of 2024 if inflation continues to moderate toward the 2% target.",
                        url: "https://reuters.com/markets/us",
                        domain: "Reuters",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "JPMorgan Reports Record Q1 Profits of $15.2 Billion",
                        snippet: "JPMorgan Chase posted record first-quarter profits of $15.2 billion, driven by strong investment banking revenues and net interest income.",
                        url: "https://bloomberg.com/news/companies",
                        domain: "Bloomberg",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "European Central Bank Maintains Rates at 4.5%",
                        snippet: "The ECB kept interest rates unchanged at 4.5% but signaled potential cuts later this year as eurozone inflation shows signs of cooling.",
                        url: "https://ft.com/markets",
                        domain: "Financial Times",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "Credit Suisse Integration with UBS Progresses",
                        snippet: "UBS reported smooth progress in integrating Credit Suisse operations, with cost synergies expected to exceed initial estimates by $2 billion.",
                        url: "https://wsj.com/finance/banking",
                        domain: "Wall Street Journal",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "Bank of England Holds Rates Steady at 5.25%",
                        snippet: "The Bank of England maintained its base rate at 5.25% as policymakers await more evidence that inflation is sustainably returning to target.",
                        url: "https://cnbc.com/world/europe",
                        domain: "CNBC",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            } else if (query.includes('cryptocurrency')) {
                newsResults = [
                    {
                        title: "Bitcoin ETFs See $2.4 Billion Inflows in March",
                        snippet: "Bitcoin exchange-traded funds attracted $2.4 billion in net inflows during March, marking the strongest month since their launch in January.",
                        url: "https://coindesk.com/markets",
                        domain: "CoinDesk",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "Ethereum Upgrade 'Dencun' Successfully Implemented",
                        snippet: "Ethereum's major network upgrade 'Dencun' was successfully implemented, promising to reduce transaction costs and improve scalability.",
                        url: "https://bloomberg.com/news/technology",
                        domain: "Bloomberg",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "MicroStrategy Adds Another $1.5B in Bitcoin to Treasury",
                        snippet: "MicroStrategy purchased an additional $1.5 billion worth of Bitcoin, bringing its total holdings to over 214,000 BTC worth approximately $15 billion.",
                        url: "https://reuters.com/technology",
                        domain: "Reuters",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "EU Finalizes Comprehensive Crypto Regulation Framework",
                        snippet: "The European Union finalized its Markets in Crypto-Assets (MiCA) regulation, providing clear guidelines for cryptocurrency operations across member states.",
                        url: "https://ft.com/technology",
                        domain: "Financial Times",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "Solana Network Processes 65 Million Transactions Daily",
                        snippet: "The Solana blockchain network reached a new milestone, processing over 65 million transactions daily, showcasing its high-throughput capabilities.",
                        url: "https://coindesk.com/tech",
                        domain: "CoinDesk",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            } else {
                // General Global Finance News
                newsResults = [
                    {
                        title: "IMF Raises Global Growth Forecast to 3.2% for 2024",
                        snippet: "The International Monetary Fund upgraded its global economic growth forecast to 3.2% for 2024, citing resilient consumer spending and easing inflation pressures.",
                        url: "https://reuters.com/world/economy",
                        domain: "Reuters",
                        publishedDate: new Date().toISOString()
                    },
                    {
                        title: "US Inflation Drops to 3.1% in February",
                        snippet: "US consumer price inflation fell to 3.1% year-over-year in February, down from 3.2% in January, moving closer to the Federal Reserve's 2% target.",
                        url: "https://bloomberg.com/news/economy",
                        domain: "Bloomberg",
                        publishedDate: new Date(Date.now() - 3600000).toISOString()
                    },
                    {
                        title: "Gold Prices Hit Record High of $2,180 per Ounce",
                        snippet: "Gold prices reached a new all-time high of $2,180 per ounce as investors sought safe-haven assets amid geopolitical uncertainties and inflation concerns.",
                        url: "https://wsj.com/markets/commodities",
                        domain: "Wall Street Journal",
                        publishedDate: new Date(Date.now() - 7200000).toISOString()
                    },
                    {
                        title: "China's Manufacturing PMI Expands to 50.8 in March",
                        snippet: "China's manufacturing Purchasing Managers' Index rose to 50.8 in March, indicating expansion and suggesting the world's second-largest economy is stabilizing.",
                        url: "https://ft.com/world/asia-pacific",
                        domain: "Financial Times",
                        publishedDate: new Date(Date.now() - 10800000).toISOString()
                    },
                    {
                        title: "Global Trade Volume Grows 2.8% in Q1 2024",
                        snippet: "World trade volume increased by 2.8% in the first quarter of 2024, driven by recovering supply chains and strong demand in emerging markets.",
                        url: "https://cnbc.com/world/economy",
                        domain: "CNBC",
                        publishedDate: new Date(Date.now() - 14400000).toISOString()
                    }
                ];
            }
        }

        res.json({ results: newsResults });
        
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Save News Article Endpoint
app.post('/api/save-news', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { title, snippet, url, domain, region, category, published_date } = req.body;

    // Check if article is already saved by this user
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: existing } = await userSupabase
        .from('saved_news')
        .select('id')
        .eq('user_id', user.id)
        .eq('url', url)
        .single();

    if (existing) {
        return res.status(400).json({ error: 'Article already saved' });
    }

    const { data, error } = await userSupabase
        .from('saved_news')
        .insert([{ 
            user_id: user.id, 
            title, 
            snippet, 
            url, 
            domain, 
            region, 
            category, 
            published_date 
        }])
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data[0]);
});

// Get Saved News Endpoint
app.get('/api/saved-news', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { filter } = req.query;

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    let query = userSupabase
        .from('saved_news')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (filter && filter !== 'all') {
        query = query.eq('region', filter);
    }

    const { data, error } = await query;

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// Delete Saved News Endpoint
app.delete('/api/saved-news/:id', async (req, res) => {
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
        .from('saved_news')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: 'Deleted successfully' });
});

// Save Notes Endpoint
app.post('/api/save-notes', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const notesData = req.body;

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Upsert notes data
    const { data, error } = await userSupabase
        .from('user_notes')
        .upsert([{ 
            user_id: user.id, 
            notes_data: notesData,
            updated_at: new Date().toISOString()
        }], { 
            onConflict: 'user_id' 
        })
        .select();

    if (error) return res.status(400).json({ error: error.message });
    res.status(200).json({ message: 'Notes saved successfully' });
});

// Get Notes Endpoint
app.get('/api/get-notes', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data, error } = await userSupabase
        .from('user_notes')
        .select('notes_data')
        .eq('user_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        return res.status(400).json({ error: error.message });
    }

    res.json(data || { notes_data: { board: { todo: [], inprogress: [], done: [] }, sticky: [] } });
});

// [DEPRECATED] Server-side PDF rendering endpoint removed - Puppeteer dependency removed to speed up builds
// The /api/render-pdf endpoint is no longer available. Use client-side Excel export (exportToExcel) instead.

// Fallback route - serve index.html for any unmatched routes (SPA behavior)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log('Serving index.html for unmatched route:', req.path);
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
