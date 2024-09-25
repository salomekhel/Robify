const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Set up express-session middleware
app.use(session({
    secret: 'yourSecretKey', // Change this to a secure key in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Middleware to serve static files
app.use(express.static('public'));

// Import and use the Spotify routes
const spotifyRoutes = require('./routes/spotifyRoutes');
app.use('/', spotifyRoutes);

// Temporary route to check session
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

// Start the Server
const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

