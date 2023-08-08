const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();

// Define a list of custom photos and locations
const photos = [
  { url: 'photo1.jpg', lat: 37.7749, lng: -122.4194 },
  { url: 'photo2.jpg', lat: 40.7128, lng: -74.0060 },
  { url: 'photo3.jpg', lat: 51.5074, lng: -0.1278 },
  // Add more photos and locations here
];

// Set up the file upload middleware
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  })
});

// Set up the static file server
app.use(express.static('public'));

// Set up the route for the game page
app.get('/game', (req, res) => {
  // Select a random photo and location from the list
  const photo = photos[Math.floor(Math.random() * photos.length)];
  res.render('game', { photo });
});

// Set up the route for the form submission
app.post('/guess', express.urlencoded({ extended: true }), (req, res) => {
  // Get the user's guess from the form data
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  // Get the actual location from the photo data
  const photo = req.body.photo;
  const actual = photos.find(p => p.url === photo);

  // Calculate the distance between the user's guess and the actual location
  const distance = calculateDistance(lat, lng, actual.lat, actual.lng);

  // Award points based on how close the guess was to the actual location
  let points = 0;
  if (distance < 100) {
    points = 1000;
  } else if (distance < 1000) {
    points = 500;
  }

  // Return the distance and points to the user
  res.render('guess', { distance, points });
});

// Set up the route for the upload form
app.get('/upload', (req, res) => {
  res.render('upload');
});

// Set up the route for handling the form submission for uploading a new photo and location
app.post('/upload', upload.single('photo'), (req, res) => {
  // Get the uploaded photo and location data from the form
  const photo = req.file.originalname;
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  // Add the new photo and location to the list
  photos.push({ url: photo, lat, lng });

  // Redirect the user back to the game page
  res.redirect('/game');
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Use a geolocation API like Google Maps to calculate the distance
  // This code is just an example and won't actually work without an API key
  // Replace YOUR_API_KEY with your actual API key
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${lat1},${lng1}&destinations=${lat2},${lng2}&key=YOUR_API_KEY`;
  // Use the built-in Node.js HTTP module to make the API request
  // This code is just an example and won't actually work without an API key
  // Replace YOUR_API_KEY with your actual API key
  const https = require('https');
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => {
        const distance = JSON.parse(data).rows[0].elements[0].distance.value;
        resolve(distance);
      });
    }).on('error', err => {
      reject(err);
    });
  });
}