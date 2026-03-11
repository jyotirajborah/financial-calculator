# FinCalc - Premium Financial Suite

## Overview
A modern financial calculator web app with glassmorphism design. Features SIP Calculator, EMI Calculator, Compound Interest, Budget Planner, and user authentication with calculation history.

## Tech Stack
- **Runtime**: Node.js 20
- **Backend**: Express.js serving static files + REST API
- **Auth & Database**: Supabase (auth + PostgreSQL via RLS)
- **Frontend**: Vanilla HTML/CSS/JS with Chart.js

## Project Structure
- `server.js` - Express server (API endpoints + static file serving)
- `index.html` - Main frontend (all UI in one file)
- `script.js` - Frontend logic and calculator implementations
- `style.css` - Glassmorphism styles
- `database_setup.sql` - Supabase table + RLS policy setup

## Environment Variables / Secrets
- `SUPABASE_URL` - Supabase project URL (required)
- `SUPABASE_KEY` - Supabase anon/public key (required)
- `PORT` - Server port (default: 5000)

## Running the App
```bash
node server.js
```
Server listens on `0.0.0.0:5000`.

## Database Setup
Run `database_setup.sql` in your Supabase SQL Editor to create the `calculations` table with Row Level Security policies.

## API Endpoints
- `POST /api/signup` - User registration
- `POST /api/login` - User login
- `GET /api/verify` - Token verification
- `POST /api/history` - Save calculation
- `GET /api/history` - Fetch user history
- `DELETE /api/history/:id` - Delete a calculation

## Deployment
Configured for autoscale deployment with `node server.js`.
