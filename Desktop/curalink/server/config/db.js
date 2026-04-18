const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    // Debug log
    console.log('MONGODB_URI from env:', mongoURI ? '✅ EXISTS' : '❌ MISSING');
    
    if (!mongoURI) {
      console.error('❌ MONGODB_URI environment variable is not set!');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')));
      process.exit(1);
    }
    
    const conn = await mongoose.connect(mongoURI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;