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
const scoresFile = path.join(__dirname, 'scores.json'); // Path to the scores file for storing the trivia scores

// Ensure the messages file exists with an empty array if it doesn't exist
if (!fs.existsSync(messagesFile)) {
    fs.writeFileSync(messagesFile, JSON.stringify([]));
}

// Ensure the scores file exists with an empty array if it doesn't exist
if (!fs.existsSync(scoresFile)) {
    fs.writeFileSync(scoresFile, JSON.stringify([]));
}

// API route to post a birthday message
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

// API route to get all birthday messages
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

// API route to post a trivia score
app.post('/api/scores', (req, res) => {
    const { name, score } = req.body;

    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid data' });
    }

    // Read current scores from the file
    fs.readFile(scoresFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading scores file:', err);
            return res.status(500).json({ error: 'Error reading scores file' });
        }

        let scores = JSON.parse(data);
        scores.push({ name, score });
        scores.sort((a, b) => b.score - a.score); // Sort by score in descending order
        scores = scores.slice(0, 20); // Keep top 20 scores

        // Write the updated scores back to the file
        fs.writeFile(scoresFile, JSON.stringify(scores), 'utf8', (err) => {
            if (err) {
                console.error('Error writing scores file:', err);
                return res.status(500).json({ error: 'Error writing scores file' });
            }
            res.status(201).json(scores);
        });
    });
});

// API route to get top 20 trivia scores
app.get('/api/scores', (req, res) => {
    fs.readFile(scoresFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading scores file:', err);
            return res.status(500).json({ error: 'Error reading scores file' });
        }

        const scores = JSON.parse(data);
        res.json(scores);
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
