const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
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

// Body parser middleware to handle JSON requests
app.use(express.json());

// Path to messages file for storing the posted birthday messages
const messagesFile = path.join(__dirname, 'messages.json');

// Ensure the file exists with an empty array if it doesn't exist
if (!fs.existsSync(messagesFile)) {
    fs.writeFileSync(messagesFile, JSON.stringify([]));
}

// API route to post a message
app.post('/api/messages', (req, res) => {
    const { content } = req.body;

    // Read current messages from the file
    fs.readFile(messagesFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading messages file:', err);
            return res.status(500).json({ error: 'Error reading messages file' });
        }

        let messages = JSON.parse(data);
        const newMessage = { content, timestamp: new Date().toISOString() };

        // Add the new message to the array
        messages.push(newMessage);

        // Write the updated messages back to the file
        fs.writeFile(messagesFile, JSON.stringify(messages), 'utf8', (err) => {
            if (err) {
                console.error('Error writing messages file:', err);
                return res.status(500).json({ error: 'Error writing messages file' });
            }
            res.status(201).json(newMessage);
        });
    });
});

// API route to get all messages
app.get('/api/messages', (req, res) => {
    fs.readFile(messagesFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading messages file:', err);
            return res.status(500).json({ error: 'Error reading messages file' });
        }

        const messages = JSON.parse(data);
        res.json(messages);
    });
});

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
