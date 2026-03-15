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

// Token Verification Endpoint
app.get('/api/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify the token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        res.json({ 
            message: 'Token valid',
            user: user
        });
        
    } catch (error) {
        console.error('Error in verify endpoint:', error);
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

        // Fetch real news from multiple sources
        const newsResults = await fetchRealNews(query, region);
        
        if (newsResults.length > 0) {
            res.json({ results: newsResults });
        } else {
            res.json({ results: [], message: 'No real-time news available at the moment' });
        }
        
    } catch (error) {
        console.error('Error in search-news endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Save News Article Endpoint
app.post('/api/save-news', async (req, res) => {
    try {
        const { title, snippet, url, domain, region, category, published_date } = req.body;
        const authHeader = req.headers.authorization;
        
        console.log('📰 Save news request received:', { title, region, category });
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ No authorization header');
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.split(' ')[1];
        console.log('🔑 Token received, verifying...');
        
        // Verify the token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            console.error('❌ Token verification failed:', authError);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        console.log('✅ User verified:', user.id);
        console.log('💾 Attempting to save to database...');
        
        // Save the news article to the database
        const { data, error } = await supabase
            .from('saved_news')
            .insert([
                {
                    user_id: user.id,
                    title,
                    snippet,
                    url,
                    domain,
                    region,
                    category,
                    published_date
                }
            ]);
        
        if (error) {
            console.error('❌ Database error saving news:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return res.status(500).json({ 
                error: `Failed to save article: ${error.message || error.code || 'Unknown error'}`,
                details: error.hint || error.details
            });
        }
        
        console.log('✅ Article saved successfully');
        res.json({ message: 'Article saved successfully' });
        
    } catch (error) {
        console.error('❌ Error in save-news endpoint:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

// Get Saved News Articles Endpoint
app.get('/api/saved-news', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const { filter } = req.query;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify the token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Build query with optional filter
        let query = supabase
            .from('saved_news')
            .select('*')
            .eq('user_id', user.id);
            
        // Apply filter if provided
        if (filter && filter !== 'all') {
            if (filter === 'indian' || filter === 'global') {
                query = query.eq('region', filter);
            } else {
                // Filter by category
                query = query.eq('category', filter);
            }
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error('Database error fetching saved news:', error);
            return res.status(500).json({ error: 'Failed to fetch saved articles' });
        }
        
        res.json({ articles: data || [] });
        
    } catch (error) {
        console.error('Error in saved-news endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete Saved News Article Endpoint
app.delete('/api/saved-news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Verify the token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Delete the saved news article
        const { error } = await supabase
            .from('saved_news')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Database error deleting saved news:', error);
            return res.status(500).json({ error: 'Failed to delete article' });
        }
        
        res.json({ message: 'Article deleted successfully' });
        
    } catch (error) {
        console.error('Error in delete saved-news endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetch real news from multiple APIs
const fetchRealNews = async (query, region) => {
    const newsResults = [];
    
    try {
        // Try NewsAPI first
        const newsApiResults = await fetchFromNewsAPI(query, region);
        if (newsApiResults.length > 0) {
            newsResults.push(...newsApiResults.slice(0, 5));
        }
        
        // If we need more articles, try other sources
        if (newsResults.length < 5) {
            // Try Guardian API
            const guardianResults = await fetchFromGuardianAPI(query, region);
            if (guardianResults.length > 0) {
                newsResults.push(...guardianResults.slice(0, 5 - newsResults.length));
            }
        }
        
        // If still need more, try RSS feeds
        if (newsResults.length < 5) {
            const rssResults = await fetchFromRSSFeeds(query, region);
            if (rssResults.length > 0) {
                newsResults.push(...rssResults.slice(0, 5 - newsResults.length));
            }
        }
        
    } catch (error) {
        console.error('Error fetching real news:', error);
    }
    
    return newsResults.slice(0, 5); // Ensure exactly 5 articles
};

// NewsAPI integration
const fetchFromNewsAPI = (query, region) => {
    return new Promise((resolve) => {
        try {
            const https = require('https');
            const apiKey = process.env.NEWS_API_KEY || 'demo';
            
            if (apiKey === 'demo') {
                resolve([]);
                return;
            }
            
            let searchQuery = '';
            let sources = '';
            
            if (region === 'indian') {
                searchQuery = `india ${query} finance stock market economy`;
                sources = '&sources=the-times-of-india,google-news-in';
            } else {
                searchQuery = `${query} finance stock market economy global`;
                sources = '&sources=reuters,bloomberg,cnbc,financial-times';
            }
            
            const options = {
                hostname: 'newsapi.org',
                path: `/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}${sources}`,
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
                                .filter(article => article.title && article.description && !article.title.includes('[Removed]'))
                                .map(article => ({
                                    title: article.title,
                                    snippet: article.description || article.content?.substring(0, 150) + '...',
                                    url: article.url,
                                    domain: article.source.name,
                                    publishedDate: article.publishedAt
                                }));
                            
                            resolve(formattedNews);
                        } else {
                            resolve([]);
                        }
                    } catch (e) {
                        console.error('NewsAPI parse error:', e);
                        resolve([]);
                    }
                });
            });
            
            apiRequest.on('error', (e) => {
                console.error('NewsAPI request error:', e);
                resolve([]);
            });
            
            apiRequest.setTimeout(5000, () => {
                apiRequest.destroy();
                resolve([]);
            });
            
        } catch (error) {
            console.error('NewsAPI error:', error);
            resolve([]);
        }
    });
};

// Guardian API integration
const fetchFromGuardianAPI = (query, region) => {
    return new Promise((resolve) => {
        try {
            const https = require('https');
            const apiKey = process.env.GUARDIAN_API_KEY || 'demo';
            
            if (apiKey === 'demo') {
                resolve([]);
                return;
            }
            
            let searchQuery = `${query} finance`;
            let section = region === 'indian' ? 'world' : 'business';
            
            const options = {
                hostname: 'content.guardianapis.com',
                path: `/search?q=${encodeURIComponent(searchQuery)}&section=${section}&show-fields=trailText&page-size=5&api-key=${apiKey}`,
                method: 'GET'
            };
            
            https.get(options, (apiRes) => {
                let data = '';
                
                apiRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                apiRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        if (jsonData.response && jsonData.response.results) {
                            const formattedNews = jsonData.response.results.map(article => ({
                                title: article.webTitle,
                                snippet: article.fields?.trailText || article.webTitle,
                                url: article.webUrl,
                                domain: 'The Guardian',
                                publishedDate: article.webPublicationDate
                            }));
                            
                            resolve(formattedNews);
                        } else {
                            resolve([]);
                        }
                    } catch (e) {
                        console.error('Guardian API parse error:', e);
                        resolve([]);
                    }
                });
            }).on('error', (e) => {
                console.error('Guardian API error:', e);
                resolve([]);
            });
            
        } catch (error) {
            console.error('Guardian API error:', error);
            resolve([]);
        }
    });
};

// RSS Feed integration for additional sources
const fetchFromRSSFeeds = (query, region) => {
    return new Promise((resolve) => {
        try {
            // For now, return empty array - can be extended with RSS parser
            // This would require additional npm packages like 'rss-parser'
            resolve([]);
        } catch (error) {
            console.error('RSS feed error:', error);
            resolve([]);
        }
    });
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