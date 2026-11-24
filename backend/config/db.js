const mongoose = require('mongoose');

const connectDB = async () => {
  const connStr = process.env.MONGODB_URI || 'mongodb+srv://booknest:Booknest2025@cluster0.jluj8qo.mongodb.net/booknest?retryWrites=true&w=majority';
  try {
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Warning: ${error.message}`);
    console.warn('⚠️ Server will continue running, but database features require a valid MONGODB_URI in environment variables.');
    return null;
  }
};

module.exports = connectDB;
