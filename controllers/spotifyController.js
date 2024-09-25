const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI } = process.env;

// Redirect to Spotify's Authorization Page
exports.spotifyLogin = (req, res) => {
    const scope = 'user-top-read';
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI
        });
    res.redirect(authUrl);
};

// Handle callback after Spotify authorization and get access/refresh tokens
exports.spotifyCallback = (req, res) => {
    const code = req.query.code || null;

    axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(response => {
        const { access_token, refresh_token } = response.data;

        req.session.access_token = access_token; // Store access token in session
        req.session.refresh_token = refresh_token; // Store refresh token in session
        console.log('Access Token:', access_token); // Log the access token
        console.log('Refresh Token:', refresh_token); // Log the refresh token
        console.log('Stored Access Token in Session:', req.session.access_token); // Verify storage
        res.redirect('/?access_token=' + access_token); // Redirect to home with access token
    })
    .catch(error => {
        console.error('Error getting tokens:', error);
        res.status(500).send('Error during authentication');
    });
};

// Fetch user's top tracks using the access token
exports.getUserTopTracks = (req, res) => {
    const accessToken = req.session.access_token;

    console.log('Access Token from Session:', accessToken); // Log the access token being used

    if (!accessToken) {
        return res.status(401).send('Access token is missing');
    }

    axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => {
        const tracks = response.data.items;
        const robbyContent = generateRobbyContent(tracks);
        res.json(robbyContent); // Send the formatted data back to the client
    })
    .catch(error => {
        console.error('Error fetching top tracks:', error.response ? error.response.data : error);
        if (error.response && error.response.status === 401) {
            console.log('Access token expired or invalid. Attempting to refresh...');
            return exports.refreshAccessToken(req, res); // Refresh the token if expired
        }
        res.status(500).send('Error fetching data');
    });
};

// Fetch user's top artist using the access token
exports.getUserTopArtist = (req, res) => {
    const accessToken = req.session.access_token;

    console.log('Access Token from Session:', accessToken); // Log the access token being used

    if (!accessToken) {
        return res.status(401).send('Access token is missing');
    }

    // Fetch user's top artist from Spotify API
    axios.get('https://api.spotify.com/v1/me/top/artists', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => {
        const topArtist = response.data.items[0];  // Get the top artist
        const robbyContent = generateRobbyContentForArtist(topArtist);  // Call the function

        res.json(robbyContent);  // Send the formatted Robby content back to the client
    })
    .catch(error => {
        console.error('Error fetching top artist:', error.response ? error.response.data : error);
        if (error.response && error.response.status === 401) {
            console.log('Access token expired or invalid. Attempting to refresh...');
            return exports.refreshAccessToken(req, res); // Refresh the token if expired
        }
        res.status(500).send('Error fetching data');
    });
};

// Refresh the access token using the refresh token
exports.refreshAccessToken = (req, res) => {
    const refresh_token = req.session.refresh_token;

    if (!refresh_token) {
        return res.status(400).json({ error: 'No refresh token available in session' });
    }

    console.log('Using Refresh Token:', refresh_token); // Log the refresh token

    axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
    }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    .then(response => {
        const newAccessToken = response.data.access_token;
        req.session.access_token = newAccessToken; // Update the access token in session
        console.log('New Access Token:', newAccessToken); // Log the new access token
        res.redirect('/user-top-tracks'); // Redirect to fetch top tracks
    })
    .catch(error => {
        console.error('Error refreshing access token:', error);
        res.status(500).json({ error: 'Error refreshing access token' });
    });
};

// Custom function to map Spotify data to Robby content for genres
function generateRobbyContent(tracks) {
    const genreMapping = {
        'Taylor Swift': { phrase: "YES YES YESSS", image: "robby_taylor.jpg" },
        'Harry Styles': { phrase: "There is genuinely nothing I would not let Harry Styles do to me", image: "robby_taylor.jpg" }, // Reusing Taylor's image for Harry Styles
        'Kanye West': { phrase: "BOOM BOOM CHICKEN", image: "robby_kanye.jpg" },
        // Additional mappings...
    };

    let genreFound = tracks.find(track => Object.keys(genreMapping).includes(track.genre));
    let genre = genreFound ? genreFound.genre : 'Pop'; // Default to 'Pop' if no specific genre is found

    let message = genre ? `You listen to a lot of ${genre}. This is what Robby thinks of that:` : 'You listen to a lot of music. This is what Robby thinks of that:';
    let phrase = genreMapping[genre].phrase;
    let image = `/images/${genreMapping[genre].image}`;

    return { phrase, image, message };
}



// Custom function to map Spotify data to Robby content for artists
function generateRobbyContentForArtist(artist) {
    const artistMapping = {
        'Taylor Swift': { phrase: "YES YES YESSS", image: "robby_taylor.jpg" },
        'Harry Styles': { phrase: "There is genuinely nothing I would not let Harry Styles do to me", image: "robby_taylor.jpg" },
        'Kanye West': { phrase: "BOOM BOOM CHICKEN", image: "robby_kanye.jpg" },
        'Adele': { phrase: "Lorem ipsum Adele", image: "robby_default.jpg" },
        'Radiohead': { phrase: "You're WEIRD", image: "IMG_0817.PNG" }
    };

    const defaultRobbyContent = { phrase: "oh you’re WEIRD", image: "robby_default.jpg" };

    // Check if the top artist matches any in the artistMapping, otherwise use default
    const robbyContent = artistMapping[artist.name] || defaultRobbyContent;

    return {
        phrase: robbyContent.phrase,
        image: `/images/${robbyContent.image}`,  // Make sure the path is correct here
        artistName: artist.name
    };
}
