const Review = require('../models/Review');
const Book = require('../models/Book');

// @desc    Get reviews for a specific book
// @route   GET /api/books/:id/reviews
// @access  Public
exports.getBookReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ bookId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Add review for a book
// @route   POST /api/books/:id/reviews
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookId = req.params.id;

    if (rating === undefined || !comment) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Check if user already reviewed this book
    const alreadyReviewed = await Review.findOne({ userId: req.user.id, bookId });
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this book' });
    }

    const review = await Review.create({
      userId: req.user.id,
      bookId,
      rating: Number(rating),
      comment
    });

    // Update book ratings
    const reviews = await Review.find({ bookId });
    const count = reviews.length;
    const avgRating = reviews.reduce((sum, rev) => sum + rev.rating, 0) / count;

    book.reviewCount = count;
    book.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal place
    await book.save();

    res.status(201).json({ success: true, message: 'Review added successfully', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
