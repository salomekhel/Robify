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
        // console.log('Access Token:', access_token); // Log the access token
        // console.log('Refresh Token:', refresh_token); // Log the refresh token
        res.redirect('/?access_token=' + access_token); // Redirect to home with access token
    })
    .catch(error => {
        console.error('Error getting tokens:', error);
        res.status(500).send('Error during authentication');
    });
};

// Fetch user's top tracks and evaluate genre
exports.getUserTopTracks = (req, res) => {
    const accessToken = req.session.access_token;

    if (!accessToken) {
        return res.status(401).send('Access token is missing');
    }

    axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => {
        const tracks = response.data.items;

        // Fetch the genre for each track's artist
        const artistGenrePromises = tracks.map(track => {
            const artistId = track.artists[0].id;  // Get the artist ID
            return axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
        });

        // Wait for all artist genre requests to complete
        Promise.all(artistGenrePromises)
            .then(artistResponses => {
                // Collect genres from each artist
                const genres = artistResponses.map(artistResponse => artistResponse.data.genres[0] || 'Unknown');  // Get the first genre, or 'Unknown'

                const robbyContent = generateRobbyContentForGenres(genres);  // Create Robby content based on genres
                res.json(robbyContent);  // Send the Robby content to the client
            })
            .catch(error => {
                console.error('Error fetching artist genres:', error.response ? error.response.data : error);
                res.status(500).send('Error fetching genres');
            });
    })
    .catch(error => {
        console.error('Error fetching top tracks:', error.response ? error.response.data : error);
        res.status(500).send('Error fetching data');
    });
};

// Fetch user's top artist using the access token
exports.getUserTopArtist = (req, res) => {
    const accessToken = req.session.access_token;

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
        res.status(500).send('Error fetching data');
    });
};

// Refresh the access token using the refresh token
exports.refreshAccessToken = (req, res) => {
    const refresh_token = req.session.refresh_token;

    if (!refresh_token) {
        return res.status(400).json({ error: 'No refresh token available in session' });
    }

    // console.log('Using Refresh Token:', refresh_token); // Log the refresh token

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
        // console.log('New Access Token:', newAccessToken); // Log the new access token
        res.redirect('/user-top-tracks'); // Redirect to fetch top tracks
    })
    .catch(error => {
        console.error('Error refreshing access token:', error);
        res.status(500).json({ error: 'Error refreshing access token' });
    });
};

// Custom function to map Spotify data to Robby content for genres
function generateRobbyContentForGenres(genres) {
    const genreMapping = {
        'pop': { phrase: "You listen to Pop, you're so mainstream!", image: "robby_pop.jpg" },
        'rock': { phrase: "Rock on! You're a true headbanger.", image: "robby_rock.jpg" },
        'hip hop': { phrase: "Hip hop is life, isn't it?", image: "robby_hiphop.jpg" },
        'indie': { phrase: "Indie vibes all the way.", image: "robby_indie.jpg" },
        // Add more genre mappings here
    };

    let genreFound = genres.find(genre => genreMapping[genre.toLowerCase()]);  // Match with a known genre
    let genre = genreFound ? genreFound.toLowerCase() : 'Pop';  // Default to 'Pop' if no genre is matched

    let phrase = genreMapping[genre].phrase;
    let image = `/images/${genreMapping[genre].image}`;

    // Return the genre along with the phrase and image
    return { genre, phrase, image };
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
