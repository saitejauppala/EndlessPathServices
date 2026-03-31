const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected successfully'.green);
  } catch (error) {
    console.error('MongoDB connection error:'.red, error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
