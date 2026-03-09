require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Server-side PDF rendering endpoint (secure: requires X-PDF-SECRET header matching PDF_SECRET)
app.post('/api/render-pdf', async (req, res) => {
    const secret = req.headers['x-pdf-secret'] || req.query.secret;
    if (!PDF_SECRET || secret !== PDF_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { path: renderPath } = req.body || {};
    // Only allow rendering internal paths
    const safePath = renderPath && typeof renderPath === 'string' ? renderPath : '/';
    const url = `http://localhost:${PORT}${safePath.startsWith('/') ? safePath : '/' + safePath}`;

    const puppeteer = require('puppeteer');
    let browser;
    try {
        browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        // Set a reasonable viewport so the rendered page matches typical desktop layout
        await page.setViewport({ width: 1200, height: 800 });
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });

        res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length });
        return res.send(pdfBuffer);
    } catch (err) {
        console.error('Server-side PDF render failed:', err);
        return res.status(500).json({ error: 'PDF generation failed' });
    } finally {
        if (browser) await browser.close();
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
