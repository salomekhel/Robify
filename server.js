const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Set up express-session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'yourSecretKey', // Use env var for secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Only secure cookies in production
        maxAge: 24 * 60 * 60 * 1000 // 1-day expiry for sessions
    }
}));

// Middleware to serve static files
app.use(express.static('public'));

// Import and use the Spotify routes
const spotifyRoutes = require('./routes/spotifyRoutes');
app.use('/', spotifyRoutes);

// Temporary route to check session (good for debugging)
app.get('/check-session', (req, res) => {
    res.send(`Access Token from Session: ${req.session.access_token || 'Not set'}`);
});

// Serve trivia.html when the user navigates to /trivia
app.get('/trivia', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'trivia.html'));  // Adjust the path if necessary
});

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware (catch unexpected errors)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

// Start the Server
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
