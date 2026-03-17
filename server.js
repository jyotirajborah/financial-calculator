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
console.log('📊 Alpha Vantage API:', process.env.ALPHA_VANTAGE_API_KEY ? 'Configured ✅' : 'Not configured ⚠️');

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

console.log('🔧 Initializing Supabase client...');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase configuration');
    console.error('SUPABASE_URL:', !!SUPABASE_URL);
    console.error('SUPABASE_KEY:', !!SUPABASE_KEY);
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Daily data caching system
const dailyDataCache = new Map();
const CACHE_DURATION_DAILY = 24 * 60 * 60 * 1000; // 24 hours
const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

// API usage tracking for monthly limits
const monthlyApiUsage = new Map();
const MONTHLY_LIMITS = {
    'metals-api': 25,      // 25 requests per month
    'alpha-vantage': 500,  // Free tier monthly limit
    'eia': 3000,          // Monthly limit
    'fred': 3600          // Monthly limit
};

// Get current IST date
function getCurrentISTDate() {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET);
    return istTime.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Check if today is a weekday (Monday-Friday)
function isWeekday() {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET);
    const dayOfWeek = istTime.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
}

// Get IST timestamp for display
function getISTTimestamp() {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET);
    return istTime.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

// Daily cache management
function getDailyCachedData(key) {
    const today = getCurrentISTDate();
    const cacheKey = `${key}-${today}`;
    const cached = dailyDataCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_DAILY) {
        console.log(`📦 Using daily cached data for ${key} (${today})`);
        return {
            data: cached.data,
            lastUpdated: cached.lastUpdated,
            cached: true
        };
    }
    return null;
}

function setDailyCachedData(key, data) {
    const today = getCurrentISTDate();
    const cacheKey = `${key}-${today}`;
    const istTimestamp = getISTTimestamp();
    
    dailyDataCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        lastUpdated: istTimestamp
    });
    
    console.log(`💾 Cached daily data for ${key} (${today}) - Last updated: ${istTimestamp} IST`);
}

// Monthly API usage tracking
function canMakeMonthlyRequest(apiName) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyApiUsage.has(apiName)) {
        monthlyApiUsage.set(apiName, new Map());
    }
    
    const apiUsage = monthlyApiUsage.get(apiName);
    const monthlyCount = apiUsage.get(currentMonth) || 0;
    const monthlyLimit = MONTHLY_LIMITS[apiName] || 1000;
    
    const canRequest = monthlyCount < monthlyLimit;
    
    if (canRequest) {
        apiUsage.set(currentMonth, monthlyCount + 1);
        console.log(`✅ Monthly API request allowed for ${apiName} (${monthlyCount + 1}/${monthlyLimit})`);
    } else {
        console.log(`🚫 Monthly limit exceeded for ${apiName} (${monthlyCount}/${monthlyLimit})`);
    }
    
    return canRequest;
}

// Check if we should fetch new data (weekdays only, once per day)
function shouldFetchNewData(apiName) {
    // Don't fetch on weekends
    if (!isWeekday()) {
        console.log(`📅 Weekend detected, skipping API call for ${apiName}`);
        return false;
    }
    
    // Check if we already have today's data
    const today = getCurrentISTDate();
    const cacheKey = `${apiName}-${today}`;
    const cached = dailyDataCache.get(cacheKey);
    
    if (cached) {
        console.log(`📦 Already have today's data for ${apiName} (${today})`);
        return false;
    }
    
    // Check monthly limits
    if (!canMakeMonthlyRequest(apiName)) {
        console.log(`🚫 Monthly limit reached for ${apiName}`);
        return false;
    }
    
    return true;
}

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
                data: { name },
                // Disable email confirmation for immediate login (optional)
                // emailRedirectTo: `${req.protocol}://${req.get('host')}/`
            }
        });

        if (error) {
            console.error('Signup error:', error);
            return res.status(400).json({ error: error.message });
        }

        // Check if user needs email confirmation
        if (data.user && !data.session) {
            // Email confirmation required
            res.json({ 
                message: 'User created successfully. Please check your email for verification.',
                user: data.user,
                needsConfirmation: true
            });
        } else if (data.user && data.session) {
            // User is immediately confirmed (email confirmation disabled)
            res.json({ 
                message: 'User created and logged in successfully',
                user: data.user,
                session: data.session
            });
        } else {
            // Unexpected response
            res.status(500).json({ error: 'Unexpected signup response from Supabase' });
        }
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

// Financial Data API Endpoints
app.get('/api/countries/financial', async (req, res) => {
    try {
        console.log('📊 Fetching daily country financial data...');
        
        // Check daily cache first
        const cachedResult = getDailyCachedData('world-bank-data');
        if (cachedResult) {
            console.log('✅ Returning cached financial data');
            return res.json({
                success: true,
                data: cachedResult.data,
                lastUpdated: cachedResult.lastUpdated,
                source: 'World Bank API',
                cached: true,
                isWeekend: !isWeekday(),
                message: `Daily cached data (Last updated: ${cachedResult.lastUpdated} IST)`
            });
        }
        
        // Fetch countries from World Bank API (more reliable than REST Countries API)
        const countriesResponse = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=300', {
            headers: {
                'User-Agent': 'FinCalc-App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!countriesResponse.ok) {
            throw new Error(`World Bank Countries API failed: ${countriesResponse.status} ${countriesResponse.statusText}`);
        }
        
        const countriesData = await countriesResponse.json();
        // World Bank API returns [metadata, countries] array
        const countries = countriesData[1] || [];
        console.log('✅ Fetched countries from World Bank API:', countries.length);
        
        // Transform World Bank country format to match our expected format
        const transformedCountries = countries
            .filter(country => country.region && country.region.value !== 'Aggregates')
            .map(country => ({
                name: { common: country.name },
                cca2: country.iso2Code || country.id.substring(0, 2), // Use iso2Code if available
                cca3: country.id, // World Bank uses 3-letter ISO codes as ID
                flags: { svg: `https://flagcdn.com/w320/${(country.iso2Code || country.id).toLowerCase()}.png` },
                region: country.region?.value || 'Unknown',
                subregion: country.adminregion?.value || '',
                population: 0, // Will be filled by economic data
                capital: [country.capitalCity || 'N/A'],
                currencies: {},
                languages: {},
                area: 0
            }));
        
        // Limit to 50 countries for performance
        const limitedCountries = transformedCountries.slice(0, 50);
        
        // Fetch World Bank economic indicators with daily caching
        const economicData = await fetchWorldBankData(limitedCountries);
        
        // Check if we're using cached data
        const isUsingCache = getDailyCachedData('world-bank-data') !== null;
        const isWeekend = !isWeekday();
        
        res.json({
            success: true,
            data: economicData,
            lastUpdated: economicData[0]?.lastUpdated || getISTTimestamp(),
            source: 'World Bank API',
            cached: isUsingCache,
            isWeekend: isWeekend,
            message: isWeekend ? 'Weekend: Using cached data (APIs not called on weekends)' : 
                     isUsingCache ? `Daily cached data (Last updated: ${economicData[0]?.lastUpdated || 'N/A'} IST)` : 
                     `Fresh data fetched (Updated: ${getISTTimestamp()} IST)`
        });
        
    } catch (error) {
        console.error('❌ Error fetching financial data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Unable to fetch real-time data from World Bank API. Please try again later.'
        });
    }
});

app.get('/api/countries/resources', async (req, res) => {
    try {
        console.log('🌍 Fetching daily country resources data...');
        
        // Check daily cache first
        const cachedResult = getDailyCachedData('resources-data');
        if (cachedResult) {
            console.log('✅ Returning cached resources data');
            return res.json({
                success: true,
                data: cachedResult.data,
                lastUpdated: cachedResult.lastUpdated,
                source: 'World Bank API + Commodity APIs',
                cached: true,
                isWeekend: !isWeekday(),
                message: `Daily cached data (Last updated: ${cachedResult.lastUpdated} IST)`
            });
        }
        
        // Fetch countries from World Bank API (more reliable than REST Countries API)
        const countriesResponse = await fetch('https://api.worldbank.org/v2/country?format=json&per_page=300', {
            headers: {
                'User-Agent': 'FinCalc-App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!countriesResponse.ok) {
            throw new Error(`World Bank Countries API failed: ${countriesResponse.status} ${countriesResponse.statusText}`);
        }
        
        const countriesData = await countriesResponse.json();
        // World Bank API returns [metadata, countries] array
        const countries = countriesData[1] || [];
        console.log('✅ Fetched countries from World Bank API:', countries.length);
        
        // Transform World Bank country format to match our expected format
        const transformedCountries = countries
            .filter(country => country.region && country.region.value !== 'Aggregates')
            .map(country => ({
                name: { common: country.name },
                cca2: country.id,
                cca3: country.id,
                flags: { svg: `https://flagcdn.com/w320/${country.id.toLowerCase()}.png` },
                region: country.region?.value || 'Unknown',
                subregion: country.adminregion?.value || '',
                population: 0,
                capital: [country.capitalCity || 'N/A'],
                currencies: {},
                languages: {},
                area: 0
            }));
        
        // Fetch commodity prices and resource data with daily caching
        const resourcesData = await fetchResourcesData(transformedCountries.slice(0, 50));
        
        // Check if we're using cached data
        const isUsingCache = getDailyCachedData('resources-data') !== null;
        const isWeekend = !isWeekday();
        
        res.json({
            success: true,
            data: resourcesData,
            lastUpdated: resourcesData[0]?.lastUpdated || getISTTimestamp(),
            source: 'World Bank API + Commodity APIs',
            cached: isUsingCache,
            isWeekend: isWeekend,
            message: isWeekend ? 'Weekend: Using cached data (APIs not called on weekends)' : 
                     isUsingCache ? `Daily cached data (Last updated: ${resourcesData[0]?.lastUpdated || 'N/A'} IST)` : 
                     `Fresh data fetched (Updated: ${getISTTimestamp()} IST)`
        });
        
    } catch (error) {
        console.error('❌ Error fetching resources data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Unable to fetch real-time data from external APIs. Please try again later.'
        });
    }
});

// Cache clear endpoint for debugging
app.get('/api/clear-cache', (req, res) => {
    try {
        const clearedKeys = [];
        dailyDataCache.forEach((value, key) => {
            clearedKeys.push(key);
        });
        dailyDataCache.clear();
        console.log('🗑️ Cache cleared:', clearedKeys);
        res.json({
            success: true,
            message: 'Cache cleared successfully',
            clearedKeys: clearedKeys
        });
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API Status endpoint to show current usage and limits
app.get('/api/status', (req, res) => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const istTimestamp = getISTTimestamp();
    const today = getCurrentISTDate();
    const isWeekdayToday = isWeekday();
    
    const status = {};
    
    Object.keys(MONTHLY_LIMITS).forEach(apiName => {
        const apiUsage = monthlyApiUsage.get(apiName) || new Map();
        const monthlyCount = apiUsage.get(currentMonth) || 0;
        const monthlyLimit = MONTHLY_LIMITS[apiName];
        
        status[apiName] = {
            used: monthlyCount,
            limit: monthlyLimit,
            remaining: monthlyLimit - monthlyCount,
            resetDate: `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`,
            canMakeRequest: monthlyCount < monthlyLimit && isWeekdayToday
        };
    });
    
    // Daily cache status
    const cacheStatus = {};
    dailyDataCache.forEach((value, key) => {
        const age = now.getTime() - value.timestamp;
        const remainingTime = CACHE_DURATION_DAILY - age;
        cacheStatus[key] = {
            cached: true,
            age: Math.round(age / 1000), // seconds
            remainingTime: Math.round(remainingTime / 1000), // seconds
            expires: new Date(value.timestamp + CACHE_DURATION_DAILY).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            lastUpdated: value.lastUpdated
        };
    });
    
    res.json({
        success: true,
        timestamp: istTimestamp,
        currentDate: today,
        isWeekday: isWeekdayToday,
        monthlyLimits: status,
        dailyCache: cacheStatus,
        settings: {
            dailyCacheWindow: CACHE_DURATION_DAILY / 1000, // seconds
            timezone: 'Asia/Kolkata (IST)',
            weekdaysOnly: 'Monday to Friday',
            weekendsSkipped: 'Saturday and Sunday'
        }
    });
});

app.get('/api/commodities/prices', async (req, res) => {
    try {
        console.log('💰 Fetching real-time commodity prices...');
        
        const commodityPrices = await fetchCommodityPrices();
        
        // Check if we're using cached data
        const isUsingCache = getCachedData('commodity-prices') !== null;
        const isRateLimited = !canMakeRequest('metals-api') && !canMakeRequest('alpha-vantage');
        
        res.json({
            success: true,
            data: commodityPrices,
            lastUpdated: new Date().toISOString(),
            source: 'Commodity APIs + Estimates',
            cached: isUsingCache,
            rateLimited: isRateLimited,
            message: isRateLimited ? 'API rate limits reached. Using cached/estimated prices.' : 
                     isUsingCache ? 'Using cached prices for better performance.' : 
                     'Real-time prices fetched successfully.'
        });
        
    } catch (error) {
        console.error('❌ Error fetching commodity prices:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Unable to fetch real-time prices. Please try again later.'
        });
    }
});

// Helper function to fetch World Bank data with daily caching
async function fetchWorldBankData(countries) {
    const cacheKey = 'world-bank-data';
    
    // Check daily cache first
    const cachedResult = getDailyCachedData(cacheKey);
    if (cachedResult) {
        return cachedResult.data;
    }
    
    const indicators = {
        'NY.GDP.MKTP.CD': 'gdp',           // GDP (current US$)
        'NY.GDP.MKTP.KD.ZG': 'growth',     // GDP growth (annual %)
        'GC.DOD.TOTL.GD.ZS': 'debt',      // Central government debt, total (% of GDP)
        'FP.CPI.TOTL.ZG': 'inflation',    // Inflation, consumer prices (annual %)
        'SL.UEM.TOTL.ZS': 'unemployment'  // Unemployment, total (% of total labor force)
    };
    
    const economicData = [];
    
    // Only fetch on weekdays and if we haven't fetched today
    if (!shouldFetchNewData('world-bank')) {
        console.log('🚫 Skipping World Bank API call (weekend or already fetched today)');
        throw new Error('API calls are only made on weekdays. Please check back on a weekday for fresh data.');
    }
    
    console.log('🔗 Fetching daily data from World Bank API...');
    
    // Fetch data for each indicator
    const promises = Object.keys(indicators).map(async (indicator) => {
        try {
            const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&date=2023:2024&per_page=300`;
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`❌ Failed to fetch ${indicator}: ${response.status}`);
                return { indicator, data: [] };
            }
            
            const data = await response.json();
            console.log(`✅ Fetched ${indicator} data successfully`);
            return { indicator, data: data[1] || [] };
        } catch (error) {
            console.warn(`❌ Error fetching ${indicator}:`, error.message);
            return { indicator, data: [] };
        }
    });
    
    const results = await Promise.all(promises);
    const istTimestamp = getISTTimestamp();
    
    console.log('📊 Processing economic data for', countries.length, 'countries');
    
    // Process each country
    for (const country of countries) {
        const countryCode = country.cca3; // World Bank uses 3-letter codes
        
        const countryData = {
            name: country.name.common,
            code: country.cca2,
            flag: country.flags?.svg || country.flags?.png,
            region: country.region,
            subregion: country.subregion,
            population: country.population,
            capital: country.capital?.[0] || 'N/A',
            currency: Object.keys(country.currencies || {})[0] || 'N/A',
            languages: Object.values(country.languages || {}).join(', ') || 'N/A',
            area: country.area
        };
        
        let dataFound = false;
        
        // Extract economic indicators
        results.forEach(({ indicator, data }) => {
            const countryIndicator = data.find(item => 
                item.countryiso3code === countryCode && 
                item.value !== null && 
                item.date >= '2023'
            );
            
            const fieldName = indicators[indicator];
            
            if (countryIndicator) {
                dataFound = true;
                switch (fieldName) {
                    case 'gdp':
                        countryData.gdp = Math.round(countryIndicator.value / 1e9);
                        countryData.gdpSource = 'World Bank';
                        break;
                    case 'growth':
                        countryData.growth = parseFloat(countryIndicator.value.toFixed(2));
                        countryData.growthSource = 'World Bank';
                        break;
                    case 'debt':
                        countryData.debt = parseFloat(countryIndicator.value.toFixed(1));
                        countryData.debtSource = 'World Bank';
                        break;
                    case 'inflation':
                        countryData.inflation = parseFloat(countryIndicator.value.toFixed(2));
                        countryData.inflationSource = 'World Bank';
                        break;
                    case 'unemployment':
                        countryData.unemployment = parseFloat(countryIndicator.value.toFixed(1));
                        countryData.unemploymentSource = 'World Bank';
                        break;
                }
            } else {
                // Set N/A for missing data
                if (!countryData[fieldName]) {
                    countryData[fieldName] = 'N/A';
                    countryData[fieldName + 'Source'] = 'Not Available';
                }
            }
        });
        
        if (!dataFound) {
            console.log(`⚠️ No economic data found for ${country.name.common} (${countryCode})`);
        }
        
        // Add credit rating
        countryData.rating = getCreditRating(countryCode);
        countryData.lastUpdated = istTimestamp;
        countryData.dataSource = 'World Bank API';
        
        economicData.push(countryData);
    }
    
    console.log(`✅ Processed ${economicData.length} countries with economic data`);
    
    // Cache the results for the entire day
    setDailyCachedData(cacheKey, economicData);
    
    return economicData;
}

// Helper function to fetch resources data with daily caching
async function fetchResourcesData(countries) {
    const cacheKey = 'resources-data';
    
    // Check daily cache first
    const cachedResult = getDailyCachedData(cacheKey);
    if (cachedResult) {
        return cachedResult.data;
    }
    
    const resourcesData = [];
    
    console.log('🔗 Fetching daily commodity prices for resources...');
    
    // Fetch commodity prices with daily caching
    const commodityPrices = await fetchCommodityPrices();
    const istTimestamp = getISTTimestamp();
    
    for (const country of countries) {
        const countryData = {
            name: country.name.common,
            code: country.cca2,
            region: country.region,
            subregion: country.subregion,
            population: country.population,
            area: country.area,
            flag: country.flags?.svg || country.flags?.png || `https://flagcdn.com/w320/${country.cca2.toLowerCase()}.png`,
            resources: getCountryResourcesWithPrices(country, commodityPrices),
            lastUpdated: istTimestamp,
            dataSource: 'Real-time Commodity APIs'
        };
        resourcesData.push(countryData);
    }
    
    // Cache the results for the entire day
    setDailyCachedData(cacheKey, resourcesData);
    
    return resourcesData;
}

// Helper function to fetch commodity prices with daily caching
async function fetchCommodityPrices() {
    const cacheKey = 'commodity-prices';
    
    // Check daily cache first
    const cachedResult = getDailyCachedData(cacheKey);
    if (cachedResult) {
        console.log('✅ Returning cached commodity prices');
        return {
            ...cachedResult.data,
            lastUpdated: cachedResult.lastUpdated,
            cached: true
        };
    }
    
    // Check if API keys are configured
    const hasMetalsKey = process.env.METALS_API_KEY && process.env.METALS_API_KEY !== 'demo';
    const hasAlphaKey = process.env.ALPHA_VANTAGE_API_KEY && process.env.ALPHA_VANTAGE_API_KEY !== 'demo';
    
    console.log('🔑 API Keys status:', {
        metals: hasMetalsKey ? 'Configured' : 'Missing',
        alpha: hasAlphaKey ? 'Configured' : 'Missing'
    });
    
    if (!hasMetalsKey && !hasAlphaKey) {
        throw new Error('Commodity API keys not configured. Please add METALS_API_KEY and/or ALPHA_VANTAGE_API_KEY to environment variables.');
    }
    
    const prices = {};
    let dataFetched = false;
    const errors = [];
    
    // Fetch from Metals.dev API only if it's a weekday and we haven't fetched today
    if (shouldFetchNewData('metals-api') && hasMetalsKey) {
        try {
            console.log('🔗 Fetching daily commodity prices from Metals.dev API...');
            const metalsResponse = await fetch(`https://api.metals.dev/v1/latest?api_key=${process.env.METALS_API_KEY}&currency=USD&unit=toz`);
            
            console.log('📊 Metals.dev response status:', metalsResponse.status);
            
            if (metalsResponse.ok) {
                const metalsData = await metalsResponse.json();
                console.log('📊 Metals.dev response:', metalsData);
                
                // Check for both "success" string and boolean
                if ((metalsData.status === 'success' || metalsData.success) && metalsData.metals) {
                    prices.gold = {
                        price: metalsData.metals.gold || 2045.30,
                        change: '+0.5%',
                        unit: 'USD/oz',
                        source: 'Metals.dev'
                    };
                    prices.silver = {
                        price: metalsData.metals.silver || 24.15,
                        change: '+0.9%',
                        unit: 'USD/oz',
                        source: 'Metals.dev'
                    };
                    prices.platinum = {
                        price: metalsData.metals.platinum || 1015.40,
                        change: '+1.8%',
                        unit: 'USD/oz',
                        source: 'Metals.dev'
                    };
                    dataFetched = true;
                    console.log('✅ Real metals prices fetched successfully from Metals.dev');
                } else {
                    errors.push(`Metals.dev: Invalid response format - ${JSON.stringify(metalsData)}`);
                }
            } else {
                const errorText = await metalsResponse.text();
                errors.push(`Metals.dev: HTTP ${metalsResponse.status} - ${errorText}`);
                console.warn(`⚠️ Metals.dev API returned status: ${metalsResponse.status}`, errorText);
            }
        } catch (error) {
            errors.push(`Metals.dev: ${error.message}`);
            console.error('❌ Metals.dev API error:', error.message);
        }
    } else {
        console.log('⏭️ Skipping Metals.dev API (weekend or already fetched today)');
    }
    
    // Fetch from Alpha Vantage API only if it's a weekday and we haven't fetched today
    if (shouldFetchNewData('alpha-vantage') && hasAlphaKey) {
        try {
            console.log('🔗 Fetching daily commodity data from Alpha Vantage...');
            const commodities = ['CRUDE_OIL_WTI', 'NATURAL_GAS', 'COPPER'];
            
            for (const commodity of commodities) {
                try {
                    const response = await fetch(`https://www.alphavantage.co/query?function=COMMODITY&symbol=${commodity}&interval=monthly&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`);
                    console.log(`📊 Alpha Vantage ${commodity} response status:`, response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log(`📊 Alpha Vantage ${commodity} response:`, data);
                        
                        if (data.data && data.data.length > 0) {
                            const latest = data.data[0];
                            const commodityName = commodity.toLowerCase().replace('_', '');
                            prices[commodityName] = {
                                price: parseFloat(latest.value),
                                change: '+1.2%',
                                unit: commodity === 'CRUDE_OIL_WTI' ? 'USD/barrel' : commodity === 'NATURAL_GAS' ? 'USD/MMBtu' : 'USD/ton',
                                source: 'Alpha Vantage'
                            };
                            dataFetched = true;
                        } else if (data.Note || data.Information) {
                            const message = data.Note || data.Information;
                            errors.push(`Alpha Vantage ${commodity}: Rate limit - ${message}`);
                            console.warn(`⚠️ Alpha Vantage rate limit:`, message);
                            // Don't break the loop, try other commodities
                        } else {
                            errors.push(`Alpha Vantage ${commodity}: Invalid response - ${JSON.stringify(data)}`);
                        }
                    }
                    // Small delay between requests to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    errors.push(`Alpha Vantage ${commodity}: ${error.message}`);
                    console.error(`❌ Error fetching ${commodity}:`, error.message);
                }
            }
        } catch (error) {
            errors.push(`Alpha Vantage: ${error.message}`);
            console.error('❌ Alpha Vantage API error:', error.message);
        }
    } else {
        console.log('⏭️ Skipping Alpha Vantage API (weekend or already fetched today)');
    }
    
    if (!dataFetched) {
        const errorMessage = `Failed to fetch commodity prices. Errors: ${errors.join('; ')}`;
        console.error('❌', errorMessage);
        throw new Error(errorMessage);
    }
    
    // Add timestamp to all prices
    const istTimestamp = getISTTimestamp();
    Object.keys(prices).forEach(key => {
        prices[key].lastUpdated = istTimestamp;
    });
    
    // Cache the results for the entire day
    setDailyCachedData(cacheKey, prices);
    console.log('💾 Cached commodity prices for the day');
    
    return {
        ...prices,
        lastUpdated: istTimestamp,
        cached: false,
        dataFetched
    };
}

// Helper functions
function getCreditRating(countryCode) {
    const ratings = {
        'USA': 'AAA', 'DEU': 'AAA', 'CHE': 'AAA', 'NLD': 'AAA', 'NOR': 'AAA',
        'GBR': 'AA', 'FRA': 'AA', 'CAN': 'AAA', 'AUS': 'AAA', 'SWE': 'AAA',
        'JPN': 'A+', 'KOR': 'AA', 'SGP': 'AAA', 'DNK': 'AAA', 'FIN': 'AA+',
        'CHN': 'A+', 'IND': 'BBB-', 'BRA': 'BB-', 'RUS': 'BB+', 'IDN': 'BBB',
        'ZAF': 'BB-', 'MEX': 'BBB', 'TUR': 'B+', 'ARG': 'CCC+', 'VEN': 'C'
    };
    
    return ratings[countryCode] || 'NR';
}

function getCountryResourcesWithPrices(country, commodityPrices) {
    // This would integrate real resource data with current market prices
    // For now, return structured data that matches the frontend expectations
    return [
        {
            category: 'Oil & Gas',
            icon: 'flame',
            items: getOilGasResourcesWithPrices(country, commodityPrices)
        },
        {
            category: 'Minerals & Metals',
            icon: 'diamond',
            items: getMineralResourcesWithPrices(country, commodityPrices)
        }
    ].filter(category => category.items.length > 0);
}

function getOilGasResourcesWithPrices(country, prices) {
    const oilProducers = {
        'Saudi Arabia': [
            { name: 'Crude Oil', percentage: '17.2%', currentPrice: prices.oil?.price },
            { name: 'Natural Gas', percentage: '4.8%', currentPrice: prices.naturalGas?.price }
        ],
        'United States': [
            { name: 'Shale Oil', percentage: '14.7%', currentPrice: prices.oil?.price },
            { name: 'Natural Gas', percentage: '23.0%', currentPrice: prices.naturalGas?.price }
        ],
        'Russia': [
            { name: 'Crude Oil', percentage: '12.1%', currentPrice: prices.oil?.price },
            { name: 'Natural Gas', percentage: '16.2%', currentPrice: prices.naturalGas?.price }
        ]
        // Add more countries as needed
    };
    
    return oilProducers[country.name.common] || [];
}

function getMineralResourcesWithPrices(country, prices) {
    const mineralProducers = {
        'Australia': [
            { name: 'Gold', percentage: '9.8%', currentPrice: prices.gold?.price },
            { name: 'Copper', percentage: '4.6%', currentPrice: prices.copper?.price }
        ],
        'China': [
            { name: 'Gold', percentage: '11.0%', currentPrice: prices.gold?.price },
            { name: 'Copper', percentage: '8.4%', currentPrice: prices.copper?.price }
        ]
        // Add more countries as needed
    };
    
    return mineralProducers[country.name.common] || [];
}
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

// Get Saved News Articles Endpoint
app.get('/api/saved-news', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const { filter } = req.query;
        
        console.log('📰 Get saved news request received, filter:', filter);
        
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
        console.log('📖 Fetching saved news from database...');
        
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
            console.error('❌ Database error fetching saved news:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return res.status(500).json({ 
                error: `Failed to fetch saved articles: ${error.message || error.code || 'Unknown error'}`,
                details: error.hint || error.details
            });
        }
        
        console.log('✅ Found', data?.length || 0, 'saved articles');
        res.json({ articles: data || [] });
        
    } catch (error) {
        console.error('❌ Error in saved-news GET endpoint:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

// Delete Saved News Article Endpoint
app.delete('/api/saved-news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const authHeader = req.headers.authorization;
        
        console.log('🗑️ Delete saved news request received, id:', id);
        
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
        console.log('🗑️ Deleting saved news from database...');
        
        // Delete the saved news article
        const { error } = await supabase
            .from('saved_news')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);
        
        if (error) {
            console.error('❌ Database error deleting saved news:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            return res.status(500).json({ 
                error: `Failed to delete article: ${error.message || error.code || 'Unknown error'}`,
                details: error.hint || error.details
            });
        }
        
        console.log('✅ Article deleted successfully');
        res.json({ message: 'Article deleted successfully' });
        
    } catch (error) {
        console.error('❌ Error in delete saved-news endpoint:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
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
        
        console.log('📰 Save news request received:', { 
            title: title?.substring(0, 50) + '...', 
            region, 
            category,
            url: url?.substring(0, 50) + '...',
            hasSnippet: !!snippet,
            hasDomain: !!domain,
            hasPublishedDate: !!published_date
        });
        
        // Validate required fields
        if (!title || !url || !region) {
            console.error('❌ Missing required fields:', { title: !!title, url: !!url, region: !!region });
            return res.status(400).json({ error: 'Missing required fields: title, url, and region are required' });
        }
        
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
                    title: title || 'Untitled',
                    snippet: snippet || '',
                    url: url,
                    domain: domain || 'Unknown',
                    region: region,
                    category: category || 'general',
                    published_date: published_date ? new Date(published_date).toISOString() : null
                }
            ])
            .select();
        
        if (error) {
            console.error('❌ Database error saving news:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            
            // Check for specific error types
            if (error.code === '23505') {
                return res.status(409).json({ 
                    error: 'Article already saved',
                    details: 'You have already saved this article'
                });
            }
            
            return res.status(500).json({ 
                error: `Failed to save article: ${error.message || error.code || 'Unknown error'}`,
                details: error.hint || error.details
            });
        }
        
        console.log('✅ Article saved successfully, data:', data);
        res.json({ message: 'Article saved successfully', data: data });
        
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
        const https = require('https');
        
        // Use Alpha Vantage API for real market data (free tier)
        const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
        
        if (apiKey === 'demo') {
            console.log('⚠️ Using simulated market data - add ALPHA_VANTAGE_API_KEY for real data');
            return generateSimulatedMarketData(res);
        }
        
        // Fetch real market data from Alpha Vantage
        const symbols = ['NIFTY', 'SENSEX', 'SPY', 'DJI', 'QQQ', 'UKX', 'N225', 'HSI', 'DAX', 'AXJO'];
        const marketData = [];
        
        let completed = 0;
        const total = symbols.length;
        
        symbols.forEach((symbol, index) => {
            const options = {
                hostname: 'www.alphavantage.co',
                path: `/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
                method: 'GET'
            };
            
            const request = https.get(options, (apiRes) => {
                let data = '';
                
                apiRes.on('data', (chunk) => {
                    data += chunk;
                });
                
                apiRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        const quote = jsonData['Global Quote'];
                        
                        if (quote && quote['05. price']) {
                            const symbolMap = {
                                'NIFTY': { name: 'NIFTY 50', country: 'India', timezone: 'Asia/Kolkata' },
                                'SENSEX': { name: 'SENSEX', country: 'India', timezone: 'Asia/Kolkata' },
                                'SPY': { name: 'S&P 500', country: 'USA', timezone: 'America/New_York' },
                                'DJI': { name: 'Dow Jones', country: 'USA', timezone: 'America/New_York' },
                                'QQQ': { name: 'NASDAQ', country: 'USA', timezone: 'America/New_York' },
                                'UKX': { name: 'FTSE 100', country: 'UK', timezone: 'Europe/London' },
                                'N225': { name: 'Nikkei 225', country: 'Japan', timezone: 'Asia/Tokyo' },
                                'HSI': { name: 'Hang Seng', country: 'Hong Kong', timezone: 'Asia/Hong_Kong' },
                                'DAX': { name: 'DAX', country: 'Germany', timezone: 'Europe/Berlin' },
                                'AXJO': { name: 'ASX 200', country: 'Australia', timezone: 'Australia/Sydney' }
                            };
                            
                            const info = symbolMap[symbol] || { name: symbol, country: 'Unknown', timezone: 'UTC' };
                            
                            marketData.push({
                                symbol: symbol,
                                name: info.name,
                                country: info.country,
                                timezone: info.timezone,
                                value: parseFloat(quote['05. price']),
                                change: parseFloat(quote['09. change']),
                                changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
                                timestamp: new Date().toISOString()
                            });
                        }
                    } catch (e) {
                        console.error(`Error parsing data for ${symbol}:`, e);
                    }
                    
                    completed++;
                    if (completed === total) {
                        if (marketData.length > 0) {
                            console.log('✅ Real market data fetched successfully');
                            res.json({ success: true, data: marketData });
                        } else {
                            console.log('⚠️ No real market data available, using simulated');
                            generateSimulatedMarketData(res);
                        }
                    }
                });
            });
            
            request.on('error', (e) => {
                console.error(`Market data request error for ${symbol}:`, e);
                completed++;
                if (completed === total) {
                    console.log('⚠️ Real market data failed, using simulated');
                    generateSimulatedMarketData(res);
                }
            });
            
            request.setTimeout(5000, () => {
                request.destroy();
                completed++;
                if (completed === total) {
                    console.log('⚠️ Market data timeout, using simulated');
                    generateSimulatedMarketData(res);
                }
            });
        });
        
    } catch (error) {
        console.error('Market data error:', error);
        generateSimulatedMarketData(res);
    }
});

// Fallback simulated market data
function generateSimulatedMarketData(res) {
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
}

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