require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const ExifParser = require('exif-parser');
const User = require('./models/user');
const mongoose = require('mongoose');
const Photo = require('./models/photo');

// Set up the Google Maps API key
maps_api_key = process.env.GMAPS_API_KEY;

// set mongodb location
mongodb_host = process.env.MONGODB_URI;

// Connect to the MongoDB database via mongo_host
mongoose.connect(`${mongodb_host}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch((error) => {
    console.error(error);
});

const fs = require('fs');

// Set up the file upload middleware
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/photos');
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  })
});

// Set up the static file server
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Set up the route for the game page
app.get('/game', async (req, res) => {
  // select a random photo from the photos mongoDB collection
  const photo = await Photo.aggregate([{ $sample: { size: 1 } }]);

  // Retrieve the top 10 users from the database
  const users = await User.find().sort({ score: -1 }).limit(10);

  res.render('game', { photo, users });
});

// Set up the route for the form submission
app.post('/guess', express.urlencoded({ extended: true }), async (req, res) => {
  // Get the user's guess from the form data
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  // Get the actual location from the photo table
  const photo = req.body.photo;
  // define actual
  const actual = await Photo.find({ filename: photo });
  console.log(actual);
  // log actual lat and long
  console.log(actual[0].tags.lat);
  console.log(actual[0].tags.lng);

  // Calculate the distance between the user's guess and the actual location
  const distance = await calculateDistance(lat, lng, actual[0].tags.lat, actual[0].tags.lng);

  // Award points based on how close the guess was to the actual location
  let points = 0;
  if (distance < 100) {
    points = 1000;
  } else if (distance < 1000) {
    points = 500;
  }

  // Return the distance and points to the user
  const username = req.body.username;
  // if user already exists, update score
  const userExists = await User.exists({ username });
  if (userExists) {
    // update score
    username.score += points;
  } else {
    // create new user
    const user = new User({ username, score: points });
    user.save();
  }

  //res.redirect('/result');
  res.render('guess', { distance, points });
});

// Set up the route for the upload form
app.get('/upload', (req, res) => {
  res.render('upload');
});

// Set up the route for handling the form submission for uploading a new photo and location
app.post('/upload', upload.single('photo'), (req, res) => {
  // Get the uploaded photo and location data from the form
  const img = req.file.originalname;
  // read exif data for lat and long from the photo and store in photos array, if there is no exif data, prompt user to add lat and long in the form
  const fs = require('fs');
  const buffer = fs.readFileSync(`public/photos/${img}`);
  const parser = ExifParser.create(buffer);
  const result = parser.parse();
  // set lat and long to request form input if exif data is undefined
  const lat = result.tags.GPSLatitude || req.body.lat;
  const lng = result.tags.GPSLongitude || req.body.lng;
  if (lat === undefined || lng === undefined) {
    res.render('upload', { error: 'Please add the latitude and longitude to the photo in the form below' });
  }

  // Check if the photo already exists in the mongoDB database
  Photo.findOne({ filename: img }, (err, result) => {
    if (err) {
      console.error(err);
    } else if (result) {
      // If the photo already exists, redirect the user back to the upload form
      res.render('upload', { error: 'That photo has already been uploaded' });
    } else {
      // If the photo doesn't exist, add it to the database
      const tags = { lat, lng };
      console.log(tags);
      const photo = new Photo({ filename: img, tags });
      console.log(photo);
      photo.save();
    }
  });



  // Redirect the user back to the game page
  res.redirect('/game');
});

// Set up the route for the leaderboard page
app.get('/leaderboard', async (req, res) => {
  // Retrieve the top 10 users from the database
  const users = await User.find().sort({ score: -1 }).limit(10);

  res.render('leaderboard', { users });
});


// Start the server
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  // Use a geolocation API like Google Maps to calculate the distance
  // This code is just an example and won't actually work without an API key
  // Replace YOUR_API_KEY with your actual API key
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=${lat1},${lng1}&destinations=${lat2},${lng2}&key=${maps_api_key}`;
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
        console.log(url)
        console.log(data);
        const distance = JSON.parse(data).rows[0].elements[0].distance.value;
        resolve(distance);
      });
    }).on('error', err => {
      reject(err);
    });
  });
}