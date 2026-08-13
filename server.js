const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./backend/config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB().then(async () => {
  try {
    const Book = require('./backend/models/Book');
    const count = await Book.countDocuments();
    if (count === 0) {
      console.log('Database is empty. Running seed script...');
      const { exec } = require('child_process');
      exec('node seed.js', (err, stdout, stderr) => {
        if (err) console.error('Error seeding:', err);
        else console.log('Seed output:', stdout);
      });
    }
  } catch (error) {
    console.error('Auto-seed failed:', error);
  }
});

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./backend/routes/authRoutes'));
app.use('/api/books', require('./backend/routes/bookRoutes'));
app.use('/api/cart', require('./backend/routes/cartRoutes'));
app.use('/api/orders', require('./backend/routes/orderRoutes'));
app.use('/api/admin', require('./backend/routes/adminRoutes'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Fallback route for non-API files (Multi-page App fallback)
app.get('*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'API endpoint not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`BookNest Server running on port ${PORT}`);
  console.log(`Open in browser: http://localhost:${PORT}`);
});
