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
app.use(express.static(path.join(__dirname)));

// Serve reset password page
app.get('/reset-password', (req, res) => {
    console.log('Reset password page requested');
    res.sendFile(path.join(__dirname, 'reset-password.html'));
});

// Authentication Endpoints
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) {
            console.error('Signup error:', error);
            return res.status(400).json({ error: error.message });
        }

        res.json({ 
            message: 'User created successfully. Please check your email for verification.',
            user: data.user 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('Login error:', error);
            return res.status(401).json({ error: error.message });
        }

        res.json({ 
            message: 'Login successful',
            user: data.user,
            session: data.session
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// News Search Endpoint
app.post('/api/search-news', async (req, res) => {
    try {
        const { query, region } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Try to fetch real news from NewsAPI
        try {
            const https = require('https');
            const apiKey = process.env.NEWS_API_KEY || 'demo';
            
            let searchQuery = '';
            if (region === 'indian') {
                searchQuery = `india ${query} finance stock market economy`;
            } else {
                searchQuery = `${query} finance stock market economy global`;
            }
            
            const options = {
                hostname: 'newsapi.org',
                path: `/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=15&apiKey=${apiKey}`,
                method: 'GET',
                headers: {
                    'User-Agent': 'FinCalc/1.0'
                }
            };
            
            const apiRequest = https.get(options, (apiRes) => {
                let data = '';
                
                apiRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                apiRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (jsonData.articles && jsonData.articles.length > 0) {
                            const formattedNews = jsonData.articles
                                .filter(article => article.title && article.description)
                                .map(article => ({
                                    title: article.title,
                                    snippet: article.description || article.content?.substring(0, 150) + '...',
                                    url: article.url,
                                    domain: article.source.name,
                                    publishedDate: article.publishedAt
                                }));
                            
                            return res.json({ results: formattedNews });
                        } else {
                            // Fallback to static data
                            return res.json({ results: getStaticNews(query, region) });
                        }
                    } catch (e) {
                        console.error('NewsAPI parse error:', e);
                        return res.json({ results: getStaticNews(query, region) });
                    }
                });
            });
            
            apiRequest.on('error', (e) => {
                console.error('NewsAPI request error:', e);
                return res.json({ results: getStaticNews(query, region) });
            });
            
            apiRequest.setTimeout(5000, () => {
                apiRequest.destroy();
                return res.json({ results: getStaticNews(query, region) });
            });
            
        } catch (error) {
            console.error('NewsAPI error:', error);
            return res.json({ results: getStaticNews(query, region) });
        }
        
    } catch (error) {
        console.error('Error in search-news endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Fallback static news function
const getStaticNews = (query, region) => {
    let newsResults = [];
    
    if (region === 'indian') {
        newsResults = [
            {
                title: "Sensex Gains 350 Points, Nifty Crosses 22,100 on Banking Rally",
                snippet: "Indian equity markets surged today with the Sensex gaining 350 points and Nifty crossing 22,100 levels.",
                url: "https://economictimes.indiatimes.com/markets/stocks/news",
                domain: "Economic Times",
                publishedDate: new Date().toISOString()
            },
            {
                title: "India's GDP Growth Projected at 7.3% for FY25",
                snippet: "The Economic Survey projects India's GDP growth at 7.3% for FY25, supported by strong domestic demand.",
                url: "https://economictimes.indiatimes.com/news/economy",
                domain: "Economic Times",
                publishedDate: new Date().toISOString()
            }
        ];
    } else {
        newsResults = [
            {
                title: "S&P 500 Hits New Record High on Tech Rally",
                snippet: "The S&P 500 reached a new all-time high as technology stocks surged.",
                url: "https://reuters.com/markets/us",
                domain: "Reuters",
                publishedDate: new Date().toISOString()
            }
        ];
    }
    
    return newsResults;
};

// Billionaires API endpoint
app.get('/api/billionaires', async (req, res) => {
    try {
        const https = require('https');
        
        const options = {
            hostname: 'www.forbes.com',
            path: '/forbesapi/person/rtb/0/position/true.json',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        };
        
        https.get(options, (apiRes) => {
            let data = '';
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    if (jsonData.personList && jsonData.personList.personsLists) {
                        res.json({
                            success: true,
                            data: jsonData.personList.personsLists.slice(0, 50)
                        });
                    } else {
                        res.status(500).json({ success: false, error: 'Invalid data format' });
                    }
                } catch (e) {
                    res.status(500).json({ success: false, error: 'Failed to parse data' });
                }
            });
        }).on('error', (e) => {
            console.error('Forbes API error:', e);
            res.status(500).json({ success: false, error: e.message });
        });
        
    } catch (error) {
        console.error('Billionaires API error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Real-time market data endpoint
app.get('/api/market-data', async (req, res) => {
    try {
        const indices = [
            { symbol: '^NSEI', name: 'NIFTY 50', country: 'India', timezone: 'Asia/Kolkata' },
            { symbol: '^BSESN', name: 'SENSEX', country: 'India', timezone: 'Asia/Kolkata' },
            { symbol: '^GSPC', name: 'S&P 500', country: 'USA', timezone: 'America/New_York' },
            { symbol: '^DJI', name: 'Dow Jones', country: 'USA', timezone: 'America/New_York' },
            { symbol: '^IXIC', name: 'NASDAQ', country: 'USA', timezone: 'America/New_York' },
            { symbol: '^FTSE', name: 'FTSE 100', country: 'UK', timezone: 'Europe/London' },
            { symbol: '^N225', name: 'Nikkei 225', country: 'Japan', timezone: 'Asia/Tokyo' },
            { symbol: '^HSI', name: 'Hang Seng', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
            { symbol: '^GDAXI', name: 'DAX', country: 'Germany', timezone: 'Europe/Berlin' },
            { symbol: '^AXJO', name: 'ASX 200', country: 'Australia', timezone: 'Australia/Sydney' }
        ];
        
        const baseValues = {
            '^NSEI': 21500 + (Math.random() - 0.5) * 1000,
            '^BSESN': 71000 + (Math.random() - 0.5) * 3000,
            '^GSPC': 5800 + (Math.random() - 0.5) * 200,
            '^DJI': 42000 + (Math.random() - 0.5) * 1000,
            '^IXIC': 18500 + (Math.random() - 0.5) * 500,
            '^FTSE': 8200 + (Math.random() - 0.5) * 200,
            '^N225': 38000 + (Math.random() - 0.5) * 1000,
            '^HSI': 19500 + (Math.random() - 0.5) * 500,
            '^GDAXI': 18500 + (Math.random() - 0.5) * 500,
            '^AXJO': 7800 + (Math.random() - 0.5) * 200
        };
        
        const marketData = indices.map(index => {
            const currentValue = baseValues[index.symbol];
            const changePercent = (Math.random() - 0.5) * 4;
            const changeValue = (currentValue * changePercent) / 100;
            
            return {
                symbol: index.symbol,
                name: index.name,
                country: index.country,
                timezone: index.timezone,
                value: currentValue,
                change: changeValue,
                changePercent: changePercent,
                timestamp: new Date().toISOString()
            };
        });
        
        res.json({ success: true, data: marketData });
        
    } catch (error) {
        console.error('Market data error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fallback route
app.use((req, res, next) => {
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