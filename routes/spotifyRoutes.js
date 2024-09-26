const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');  // Make sure this path is correct
const path = require('path');

// Log imported functions to check if they are properly imported
console.log('spotifyLogin:', spotifyController.spotifyLogin);  
console.log('spotifyCallback:', spotifyController.spotifyCallback);  
console.log('getUserTopTracks:', spotifyController.getUserTopTracks);
console.log('getUserTopArtist:', spotifyController.getUserTopArtist);
console.log('getUserTopTrack:', spotifyController.getUserTopTrack);
console.log('refreshAccessToken:', spotifyController.refreshAccessToken);

// Add console logs before each route definition to identify which one is causing the issue
console.log('Defining /login route');
router.get('/login', spotifyController.spotifyLogin);

console.log('Defining /callback route');
router.get('/callback', spotifyController.spotifyCallback);

console.log('Defining /user-top-tracks route');
router.get('/user-top-tracks', spotifyController.getUserTopTracks);

console.log('Defining /user-top-track route');
router.get('/user-top-track', spotifyController.getUserTopTrack);

console.log('Defining /user-top-artist route');
router.get('/user-top-artist', spotifyController.getUserTopArtist);

console.log('Defining /refresh-token route');
router.get('/refresh-token', spotifyController.refreshAccessToken);

// Static route for the post-birthday message
console.log('Defining /post-birthday-message route');
router.get('/post-birthday-message', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'post-birthday-message.html'));
});

// Export the router to be used in the server.js
module.exports = router;
