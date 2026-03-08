const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oefxtqzwgkyzwycfoure.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_xtnADCfOk0LPQAqSEe9R-g_gcN8Z7Wv';
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

// Fallback to serve index.html for root path
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
