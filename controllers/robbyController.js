const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');

// Routes
router.get('/login', spotifyController.spotifyLogin);
router.get('/callback', spotifyController.spotifyCallback);
router.get('/user-top-tracks', spotifyController.getUserTopTracks);

module.exports = router;
