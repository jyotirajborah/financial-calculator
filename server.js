const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'super_secret_fincalc_key_123'; // In production, use env variables

// Middleware
app.use(cors());
app.use(express.json());
// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Initialize Database
const db = new sqlite3.Database('./fincalc.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite Database');
        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);
    }
});

// Authentication Endpoints

// 1. Sign Up
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists.' });
                }
                return res.status(500).json({ error: 'Server error during registration.' });
            }
            
            // Create JWT token for immediate login
            const token = jwt.sign({ id: this.lastID, email, name }, SECRET_KEY, { expiresIn: '24h' });
            res.status(201).json({ message: 'User created successfully', token, user: { name, email } });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error encrypting password.' });
    }
});

// 2. Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please provide email and password.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Server error during login.' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Create JWT token
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token, user: { name: user.name, email: user.email } });
    });
});

// 3. Verify Token (to keep user logged in on refresh)
app.get('/api/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid or expired token' });
        
        res.json({ user: { name: decoded.name, email: decoded.email } });
    });
});

// Fallback to serve index.html for root path
app.get('/*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
