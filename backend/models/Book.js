const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
  publisher: { type: String, required: true, trim: true },
  isbn: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 }, // Percentage discount
  stock: { type: Number, required: true, min: 0, default: 0 },
  coverImage: { type: String, required: true }, // URL or filename
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  salesCount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

// Index fields for text search
bookSchema.index({ title: 'text', author: 'text', publisher: 'text', isbn: 'text' });

module.exports = mongoose.model('Book', bookSchema);
