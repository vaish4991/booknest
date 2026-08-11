const Cart = require('../models/Cart');
const Book = require('../models/Book');

// Helper to get or create cart
const getOrCreateCartObj = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
};

// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');
    if (!cart) {
      return res.status(200).json({ success: true, items: [] });
    }
    res.status(200).json({ success: true, items: cart.items });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { bookId, quantity = 1 } = req.body;
    if (!bookId) {
      return res.status(400).json({ success: false, message: 'Book ID is required' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    const cart = await getOrCreateCartObj(req.user.id);
    const existingItemIndex = cart.items.findIndex(item => item.bookId.toString() === bookId);

    let targetQty = Number(quantity);
    if (existingItemIndex > -1) {
      targetQty += cart.items[existingItemIndex].quantity;
    }

    // Check stock
    if (targetQty > book.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot add requested quantity. Only ${book.stock} item(s) available in stock.`
      });
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = targetQty;
    } else {
      cart.items.push({ bookId, quantity: Number(quantity) });
    }

    await cart.save();
    
    const updatedCart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');
    res.status(200).json({ success: true, message: 'Item added to cart', items: updatedCart.items });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:bookId
// @access  Private
exports.updateCartQuantity = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || Number(quantity) < 1) {
      return res.status(400).json({ success: false, message: 'Valid quantity is required (minimum 1)' });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found' });
    }

    // Check stock
    if (Number(quantity) > book.stock) {
      return res.status(400).json({
        success: false,
        message: `Cannot update quantity. Only ${book.stock} item(s) available in stock.`
      });
    }

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item.bookId.toString() === bookId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    cart.items[itemIndex].quantity = Number(quantity);
    await cart.save();

    const updatedCart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');
    res.status(200).json({ success: true, message: 'Cart updated', items: updatedCart.items });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:bookId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const { bookId } = req.params;
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.bookId.toString() !== bookId);
    await cart.save();

    const updatedCart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');
    res.status(200).json({ success: true, message: 'Item removed from cart', items: updatedCart.items });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
