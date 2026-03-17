# Daily Real-Time API Integration System

## Overview

The FinCalc application features a smart daily API integration system that fetches live financial and commodity data once per day (weekdays only) and serves this cached data to all visitors. This approach maximizes API efficiency while ensuring all users see consistent, up-to-date information.

## Key Principle: One API Call Per Day

**Smart Caching Strategy:**
- **Single Daily Fetch**: APIs are called once per day on weekdays (Monday-Friday)
- **Weekend Pause**: No API calls on Saturday/Sunday to conserve monthly limits
- **Universal Access**: Whether it's the 1st visitor or the 49,000th visitor, everyone sees the same daily data
- **IST Timezone**: All timestamps and scheduling based on Indian Standard Time (IST)

## API Sources & Monthly Limits

### 1. Metals.dev API ⭐ **Critical - 25 requests/month**
- **Purpose**: Real-time precious metals prices (Gold, Silver, Platinum)
- **Monthly Limit**: 25 requests (FREE tier)
- **Daily Strategy**: 1 call per weekday = ~22 calls/month (within limit)
- **Setup**: Get API key from https://metals.dev/

### 2. Alpha Vantage API
- **Purpose**: Commodity prices, stock data
- **Monthly Limit**: 500 requests (free tier)
- **Daily Strategy**: 1 call per weekday = ~22 calls/month (well within limit)
- **Setup**: Get API key from https://www.alphavantage.co/support/#api-key

### 3. World Bank API
- **Purpose**: Economic indicators (GDP, growth, debt, inflation, unemployment)
- **Limit**: Unlimited (free government data)
- **Daily Strategy**: 1 call per weekday for consistency

### 4. EIA (Energy Information Administration) API
- **Purpose**: Energy data (oil, gas, coal prices)
- **Monthly Limit**: 3000 requests
- **Daily Strategy**: 1 call per weekday = ~22 calls/month

### 5. FRED (Federal Reserve Economic Data) API
- **Purpose**: Economic indicators, interest rates
- **Monthly Limit**: 3600 requests
- **Daily Strategy**: 1 call per weekday = ~22 calls/month

## High-Traffic Handling (25,000+ Visitors)

### Problem Solved
Instead of making 25,000 API calls (which would exhaust monthly limits in one day), we make **1 API call per day** and serve cached data to all visitors.

### Daily Caching System

#### **Monday-Friday (Weekdays)**
1. **First API Call**: Server makes API calls at first request of the day
2. **Data Caching**: Results cached for 24 hours with IST timestamp
3. **All Subsequent Visitors**: Served from cache (same data for everyone)
4. **Cache Expiry**: Next day, fresh API calls are made

#### **Saturday-Sunday (Weekends)**
1. **No API Calls**: APIs are not called to conserve monthly limits
2. **Cached Data**: Friday's data is served to all weekend visitors
3. **User Notification**: "Weekend: Using cached data (APIs not called on weekends)"

### Example Traffic Scenario
- **Monday 9:00 AM IST**: 1st visitor triggers API calls, data cached
- **Monday 9:01 AM IST**: 2nd visitor gets cached data
- **Monday 11:30 PM IST**: 25,000th visitor gets same cached data
- **Tuesday 9:00 AM IST**: New day, fresh API calls made
- **Saturday**: All visitors get Friday's cached data

## User Experience

### Data Freshness Indicators
Users always know what data they're viewing:

- ✅ **Fresh Data**: "Fresh financial data fetched (Updated: 17/03/2026, 09:15:23 IST)"
- 📦 **Daily Cache**: "Daily cached data (Last updated: 17/03/2026, 09:15:23 IST)"
- 📅 **Weekend**: "Weekend: Using cached data (APIs not called on weekends)"
- ❌ **Error**: "Unable to fetch data. Using fallback estimates."

### Consistent Experience
- **Same Data**: All visitors on the same day see identical information
- **Fast Loading**: Cached responses in <50ms
- **No Surprises**: No random API failures during high traffic
- **Transparent**: Clear timestamps showing when data was last updated

## API Efficiency

### Monthly Usage Optimization
```
Traditional Approach (Per Visitor):
- 25,000 visitors × 1 API call = 25,000 calls/day
- Metals.dev limit: 25/month → Exhausted in 1 day ❌

Daily Caching Approach:
- 1 API call/day × 22 weekdays = 22 calls/month
- Metals.dev limit: 25/month → Within limit ✅
```

### Weekend Strategy
- **Saturday/Sunday**: 0 API calls
- **Savings**: ~8-10 API calls saved per month
- **Buffer**: Extra calls available for month-end or retries

## IST Timezone Integration

### Time-Based Logic
- **Daily Reset**: Cache expires at midnight IST
- **Weekday Detection**: Monday-Friday in IST timezone
- **User Timestamps**: All displayed times in IST format
- **Server Logs**: IST timestamps for debugging

### IST Display Format
```
17/03/2026, 09:15:23 IST (DD/MM/YYYY, HH:MM:SS)
```

## Configuration

### Environment Variables (.env)
```env
# Replace 'demo' with actual API keys
METALS_API_KEY=your_metals_dev_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
EIA_API_KEY=your_eia_api_key_here
FRED_API_KEY=your_fred_api_key_here
```

### Monthly Limits (server.js)
```javascript
const MONTHLY_LIMITS = {
    'metals-api': 25,      // Critical - Metals.dev free tier
    'alpha-vantage': 500,  // Alpha Vantage free tier
    'eia': 3000,          // EIA monthly limit
    'fred': 3600          // FRED monthly limit
};
```

## Monitoring & Status

### API Status Endpoint: `/api/status`
```json
{
  "currentDate": "2026-03-17",
  "isWeekday": true,
  "monthlyLimits": {
    "metals-api": {
      "used": 12,
      "limit": 25,
      "remaining": 13
    }
  },
  "dailyCache": {
    "commodity-prices-2026-03-17": {
      "lastUpdated": "17/03/2026, 09:15:23"
    }
  }
}
```

### Console Commands
```javascript
// Check current API status
showAPIStatus()

// View detailed status
checkAPIStatus()
```

## Fallback System

### Data Quality Hierarchy
1. **Real API Data** (weekdays, fresh calls)
2. **Cached API Data** (same day or weekend)
3. **Estimated Data** (when APIs fail)

### Estimation Logic
- **Historical Averages**: Based on country characteristics
- **Regional Patterns**: Similar countries' data patterns
- **Market Estimates**: Reasonable commodity price estimates
- **Clear Labeling**: All estimated data clearly marked

## Performance Benefits

### Speed Optimization
- **Cache Hit Rate**: 99.9% (only first visitor per day hits APIs)
- **Response Time**: <50ms for cached data
- **Server Load**: Minimal (no repeated API calls)
- **Bandwidth**: Reduced external API traffic

### Reliability
- **No Rate Limits**: Never hit hourly/daily API limits
- **Consistent Service**: Same experience for all visitors
- **Weekend Availability**: Data available even when APIs are paused
- **Error Resilience**: Cached data available during API outages

## Monthly API Budget

### Metals.dev (25 requests/month)
- **Weekdays Only**: ~22 requests/month
- **Buffer**: 3 requests for retries/testing
- **Usage**: 88% of monthly limit (safe margin)

### Other APIs
- **Alpha Vantage**: 22/500 requests (4% usage)
- **EIA**: 22/3000 requests (0.7% usage)
- **FRED**: 22/3600 requests (0.6% usage)

## Conclusion

This daily caching system ensures:

✅ **API Efficiency**: Maximum data freshness with minimal API usage
✅ **Cost Effective**: Stays within all free tier limits
✅ **High Performance**: Fast responses for all visitors
✅ **Consistent UX**: Same data for everyone on the same day
✅ **Weekend Coverage**: Data available 7 days a week
✅ **Transparent**: Users always know data freshness
✅ **Scalable**: Handles unlimited visitors with same API usage

**Perfect for 25,000+ daily visitors while respecting API limits!**