const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  filename: String,
  tags: Object
});

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;