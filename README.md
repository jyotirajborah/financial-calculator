# FinCalc - Premium Financial Suite

FinCalc is a modern, responsive web application offering a suite of financial calculators with a premium glassmorphism design.

## Features
- **SIP Calculator**: Plan your mutual fund investments with detailed growth charts.
- **EMI Calculator**: Calculate loan repayments and interest breakdowns.
- **Compound Interest**: Visualize your savings growth over time.
- **Budget Planner**: Master the 50/30/20 rule for better financial health.
- **Income Tax Calculator**: (Coming Soon) Plan your taxes efficiently.
- **History**: (Coming Soon) Save and view your previous calculations.

## Tech Stack
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Chart.js, Ionicons.
- **Backend**: Node.js, Express, Supabase.

## Getting Started

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Set up Environment Variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update the following variables in `.env`:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_KEY`: Your Supabase anon key
     - `SITE_URL`: Your production domain (for password reset emails)
       - For GitHub Pages: `https://yourusername.github.io/financial-calculator`
       - For Vercel: `https://your-app.vercel.app`
       - For Netlify: `https://your-app.netlify.app`
       - For custom domain: `https://your-domain.com`
4. **Start the server**:
   ```bash
   npm start
   ```
5. **Visit the app**: Open `http://localhost:3000` in your browser.

## Security
This project uses environment variables for sensitive credentials. Ensure `.env` is never committed to version control.
