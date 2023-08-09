const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: String,
  score: Number
});

const User = mongoose.model('User', userSchema);

module.exports = User;