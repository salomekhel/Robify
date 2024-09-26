const axios = require('axios');
const querystring = require('querystring');
require('dotenv').config();

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, REDIRECT_URI } = process.env;

// Redirect to Spotify's Authorization Page
exports.spotifyLogin = (req, res) => {
    console.log("spotifyLogin function called");  // Debug log
    const scope = 'user-top-read';  // Ensure this scope is correct
    const authUrl = 'https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: REDIRECT_URI
        });
    console.log("Redirecting to Spotify auth URL:", authUrl);  // Debug log
    res.redirect(authUrl);
};

// Handle callback after Spotify authorization and get access/refresh tokens
exports.spotifyCallback = (req, res) => {
    console.log("spotifyCallback function called");  // Debug log
    const code = req.query.code || null;
    console.log("Received authorization code:", code);  // Debug log

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
        console.log("Received access token:", access_token);  // Debug log
        console.log("Received refresh token:", refresh_token);  // Debug log

        req.session.access_token = access_token; // Store access token in session
        req.session.refresh_token = refresh_token; // Store refresh token in session
        res.redirect('/?access_token=' + access_token); // Redirect to home with access token
    })
    .catch(error => {
        console.error('Error getting tokens:', error.response ? error.response.data : error);
        res.status(500).send('Error during authentication');
    });
};

// Fetch user's top tracks and evaluate genre
// Fetch user's top track using the access token (New Feature)
exports.getUserTopTrack = (req, res) => {
    console.log("getUserTopTrack function called");  // Debug log
    let accessToken = req.session.access_token;
    console.log("Access Token:", accessToken);  // Debug log

    if (!accessToken) {
        console.error("Access token is missing");
        return res.status(401).send('Access token is missing');
    }

    axios.get('https://api.spotify.com/v1/me/top/tracks?limit=1', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => {
        const topTrack = response.data.items[0];  // Get the top track
        console.log("Top track fetched:", topTrack.name);  // Debug log
        const randomImage = getRandomRobbyImage();  // Get a random Robby image

        // Return the track name, artist name, and a random Robby image
        res.json({
            trackName: topTrack.name,
            artistName: topTrack.artists[0].name,
            image: `/images/${randomImage}`,  // Set the image path
            phrase: ` `,  // Optional phrase
            trackUrl: topTrack.external_urls.spotify  // Spotify link to the track
        });
    })
    .catch(error => {
        console.error('Error fetching top track:', error.response ? error.response.data : error);
        if (error.response && error.response.status === 401) {
            console.log("Access token expired, refreshing token...");  // Debug log

            return refreshAccessToken(req, res, () => {
                // Update accessToken after refreshing
                accessToken = req.session.access_token;
                console.log("New Access Token:", accessToken);  // Log the new token

                // Retry fetching the top track with the new access token
                axios.get('https://api.spotify.com/v1/me/top/tracks?limit=1', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                })
                .then(response => {
                    const topTrack = response.data.items[0];
                    console.log("Top track fetched after token refresh:", topTrack.name);
                    const randomImage = getRandomRobbyImage();

                    res.json({
                        trackName: topTrack.name,
                        artistName: topTrack.artists[0].name,
                        image: `/images/${randomImage}`,
                        phrase: `Here's the link to your top track:`,
                        trackUrl: topTrack.external_urls.spotify
                    });
                })
                .catch(finalError => {
                    console.error("Error fetching top track after token refresh:", finalError);
                    res.status(500).send('Error fetching data after token refresh');
                });
            });
        }
        res.status(500).send('Error fetching data');
    });
};


// Fetch user's top artist using the access token
exports.getUserTopArtist = (req, res) => {
    console.log("getUserTopArtist function called");  // Debug log
    const accessToken = req.session.access_token;
    console.log("Access Token:", accessToken);  // Debug log

    if (!accessToken) {
        console.error("Access token is missing");
        return res.status(401).send('Access token is missing');
    }

    // Fetch user's top artist from Spotify API
    axios.get('https://api.spotify.com/v1/me/top/artists', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => {
        const topArtist = response.data.items[0];  // Get the top artist
        console.log("Top artist fetched:", topArtist.name);  // Debug log

        const robbyContent = generateRobbyContentForArtist(topArtist);  // Call the function
        res.json(robbyContent);  // Send the formatted Robby content back to the client
    })
    .catch(error => {
        console.error('Error fetching top artist:', error.response ? error.response.data : error);
        if (error.response && error.response.status === 401) {
            console.log("Access token expired, refreshing token...");  // Debug log
            return refreshAccessToken(req, res, () => {
                res.redirect('/user-top-artist');
            });
        }
        res.status(500).send('Error fetching data');
    });
};

// Define getUserTopTracks function
exports.getUserTopTracks = (req, res) => {
    console.log("getUserTopTracks function called");  // Debug log
    const accessToken = req.session.access_token;
    console.log("Access Token:", accessToken);  // Debug log

    if (!accessToken) {
        console.error("Access token is missing");
        return res.status(401).send('Access token is missing');
    }

    // Fetch user's top tracks from Spotify API
    axios.get('https://api.spotify.com/v1/me/top/tracks', {
        headers: { Authorization: `Bearer ${accessToken}` }
    })
    .then(response => {
        const tracks = response.data.items;
        console.log("Top tracks fetched:", tracks.length);  // Debug log

        // Fetch the genre for each track's artist
        const artistGenrePromises = tracks.map(track => {
            const artistId = track.artists[0].id;  // Get the artist ID
            console.log("Fetching genre for artist ID:", artistId);  // Debug log
            return axios.get(`https://api.spotify.com/v1/artists/${artistId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
        });

        // Wait for all artist genre requests to complete
        Promise.all(artistGenrePromises)
            .then(artistResponses => {
                const genres = artistResponses.map(artistResponse => artistResponse.data.genres[0] || 'Unknown');  // Get the first genre, or 'Unknown'
                console.log("Genres fetched:", genres);  // Debug log

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
        if (error.response && error.response.status === 401) {
            console.log("Access token expired, refreshing token...");  // Debug log
            return refreshAccessToken(req, res, () => {
                res.redirect('/user-top-tracks');  // Retry the request after refreshing the token
            });
        }
        res.status(500).send('Error fetching data');
    });
};

// Refresh the access token using the refresh token
exports.refreshAccessToken = (req, res, callback) => {
    console.log("refreshAccessToken function called");  // Debug log
    const refresh_token = req.session.refresh_token;

    if (!refresh_token) {
        console.error("Refresh token is missing");  // Debug log
        return res.status(400).json({ error: 'No refresh token available in session' });
    }

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
        console.log("Access token refreshed:", newAccessToken);  // Debug log
        req.session.access_token = newAccessToken; // Update the access token in session
        callback();  // Retry the original request
    })
    .catch(error => {
        console.error('Error refreshing access token:', error.response ? error.response.data : error);
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

    let genreFound = genres.find(genre => genreMapping[genre.toLowerCase()]);
    let genre = genreFound ? genreFound.toLowerCase() : 'pop';  // Default to 'Pop' if no genre is matched

    let phrase = genreMapping[genre].phrase;
    let image = `/images/${genreMapping[genre].image}`;

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

    const robbyContent = artistMapping[artist.name] || defaultRobbyContent;

    return {
        phrase: robbyContent.phrase,
        image: `/images/${robbyContent.image}`,
        artistName: artist.name
    };
}

// Helper function to get a random Robby image (Updated)
function getRandomRobbyImage() {
    const robbyImages = [
        'IMG_0814.PNG',
        'IMG_0817.PNG',
        'IMG_0837.png',
        'IMG_0839.PNG',
        'IMG_0840.PNG',
        'IMG_0842.PNG',
        'IMG_0843.PNG',
        'robby_default.jpg',
        'robby_hiphop.jpg',  
        'robby_indie.jpg',
        'robby_kanye.jpg',
        'robby_pop.jpg',
        'robby_rock.jpg',
        'robby_taylor.jpg',
        'Subject_2.png',
        'Subject_3.png'
    ];

    // Log all image paths to ensure they are being processed
    console.log("All available images:", robbyImages);

    const randomIndex = Math.floor(Math.random() * robbyImages.length);
    const selectedImage = robbyImages[randomIndex];

    // Log the random index and selected image for debugging
    console.log("Random index:", randomIndex);
    console.log("Selected image:", selectedImage);

    // No need to create a new Image() in Node.js; just return the selected image path
    return selectedImage;
}
