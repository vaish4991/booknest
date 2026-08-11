const Book = require('../models/Book');

// @desc    Get all books with filtering, searching, sorting & pagination
// @route   GET /api/books
// @access  Public
exports.getBooks = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      minRating,
      stockStatus,
      sortBy,
      page = 1,
      limit = 12
    } = req.query;

    const query = {};

    // 1. Search (Title, Author, Publisher, ISBN)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { publisher: { $regex: search, $options: 'i' } },
        { isbn: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // 3. Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // 4. Rating filter
    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // 5. Stock status filter
    if (stockStatus) {
      if (stockStatus === 'inStock') {
        query.stock = { $gt: 5 };
      } else if (stockStatus === 'lowStock') {
        query.stock = { $gt: 0, $lte: 5 };
      } else if (stockStatus === 'outOfStock') {
        query.stock = 0;
      }
    }

    // Build sorting query
    let sortQuery = { createdAt: -1 }; // Default: Newest
    if (sortBy) {
      switch (sortBy) {
        case 'priceAsc':
          sortQuery = { price: 1 };
          break;
        case 'priceDesc':
          sortQuery = { price: -1 };
          break;
        case 'ratingDesc':
          sortQuery = { rating: -1 };
          break;
        case 'newest':
          sortQuery = { createdAt: -1 };
          break;
        case 'bestSelling':
          sortQuery = { salesCount: -1 };
          break;
      }
    }

    // Pagination calculations
    const skip = (Number(page) - 1) * Number(limit);
    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: books.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      books
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get book details by ID
// @route   GET /api/books/:id
// @access  Public
exports.getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    res.status(200).json({ success: true, book });
  } catch (error) {
    console.error('Get book by ID error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Create a new book (Admin only)
// @route   POST /api/books
// @access  Private/Admin
exports.createBook = async (req, res) => {
  try {
    const { title, author, publisher, isbn, description, category, price, discount, stock, coverImage } = req.body;

    if (!title || !author || !publisher || !isbn || !description || !category || price === undefined || stock === undefined || !coverImage) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const isbnExists = await Book.findOne({ isbn });
    if (isbnExists) {
      return res.status(400).json({ success: false, message: 'A book with this ISBN already exists' });
    }

    const book = await Book.create({
      title,
      author,
      publisher,
      isbn,
      description,
      category,
      price,
      discount: discount || 0,
      stock,
      coverImage
    });

    res.status(201).json({ success: true, message: 'Book created successfully', book });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Update a book (Admin only)
// @route   PUT /api/books/:id
// @access  Private/Admin
exports.updateBook = async (req, res) => {
  try {
    const { title, author, publisher, isbn, description, category, price, discount, stock, coverImage } = req.body;

    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    if (isbn && isbn !== book.isbn) {
      const isbnExists = await Book.findOne({ isbn });
      if (isbnExists) {
        return res.status(400).json({ success: false, message: 'A book with this ISBN already exists' });
      }
    }

    if (title !== undefined) book.title = title;
    if (author !== undefined) book.author = author;
    if (publisher !== undefined) book.publisher = publisher;
    if (isbn !== undefined) book.isbn = isbn;
    if (description !== undefined) book.description = description;
    if (category !== undefined) book.category = category;
    if (price !== undefined) book.price = price;
    if (discount !== undefined) book.discount = discount;
    if (stock !== undefined) book.stock = stock;
    if (coverImage !== undefined) book.coverImage = coverImage;

    await book.save();

    res.status(200).json({ success: true, message: 'Book updated successfully', book });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Delete a book (Admin only)
// @route   DELETE /api/books/:id
// @access  Private/Admin
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    await Book.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
