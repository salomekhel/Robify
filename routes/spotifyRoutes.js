const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');

// Define your routes here
router.get('/login', spotifyController.spotifyLogin);
router.get('/callback', spotifyController.spotifyCallback);
router.get('/user-top-tracks', spotifyController.getUserTopTracks);
router.get('/refresh-token', spotifyController.refreshAccessToken);
// Route for top artist (add this)
router.get('/user-top-artist', spotifyController.getUserTopArtist);  // Ensure this is correctly pointing to the controller


module.exports = router;
