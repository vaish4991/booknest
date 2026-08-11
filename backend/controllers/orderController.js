const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Book = require('../models/Book');

// Luhn Algorithm validation for credit cards
function luhnCheck(val) {
  let sum = 0;
  for (let i = 0; i < val.length; i++) {
    let intVal = parseInt(val.substr(val.length - 1 - i, 1));
    if (i % 2 !== 0) {
      intVal *= 2;
      if (intVal > 9) {
        intVal = (intVal % 10) + 1;
      }
    }
    sum += intVal;
  }
  return (sum % 10 === 0);
}

// Simulate credit card processing with a bank gateway
async function processOnlinePayment(paymentDetails) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const { cardNumber, expiry, cvv } = paymentDetails;
  
  if (!cardNumber || !expiry || !cvv) {
    throw new Error('Missing card information');
  }

  const cleanCardNum = cardNumber.replace(/\s+/g, '');
  
  // Validate card length
  if (cleanCardNum.length !== 16 || isNaN(cleanCardNum)) {
    throw new Error('Payment Failed: Invalid card number length (must be 16 digits)');
  }

  // Validate CVV length
  if (cvv.length !== 3 || isNaN(cvv)) {
    throw new Error('Payment Failed: Invalid CVV (must be 3 digits)');
  }

  // Validate Expiry format
  if (!expiry.match(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)) {
    throw new Error('Payment Failed: Expiry date must be in MM/YY format');
  }

  // Validate Expiry date value
  const parts = expiry.split('/');
  const expMonth = parseInt(parts[0], 10);
  const expYear = parseInt('20' + parts[1], 10);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
    throw new Error('Payment Failed: The credit card has expired');
  }

  // Run Luhn validation
  if (!luhnCheck(cleanCardNum)) {
    throw new Error('Payment Failed: The credit card number is invalid (Luhn check failed)');
  }

  // Simulator rules for testing errors
  if (cleanCardNum.endsWith('9999') || cleanCardNum.startsWith('5555')) {
    throw new Error('Payment Failed: Insufficient funds in card account');
  }
  if (cleanCardNum.endsWith('0000') || cleanCardNum.startsWith('4444')) {
    throw new Error('Payment Failed: Incorrect CVV code');
  }
  if (cleanCardNum.endsWith('1111')) {
    throw new Error('Payment Failed: Transaction declined by card issuer');
  }

  // Success
  return {
    transactionId: 'TXN_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
    status: 'Success'
  };
}

// @desc    Place a new order (COD or Online)
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, paymentDetails } = req.body;

    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Shipping address and payment method are required' });
    }

    // 1. Process payment if paymentMethod is Online
    let txnId = null;
    if (paymentMethod === 'Online') {
      if (!paymentDetails) {
        return res.status(400).json({ success: false, message: 'Card details are required for online payments' });
      }

      try {
        const paymentResult = await processOnlinePayment(paymentDetails);
        txnId = paymentResult.transactionId;
      } catch (paymentError) {
        return res.status(400).json({ success: false, message: paymentError.message });
      }
    }

    // 2. Retrieve user's cart
    const cart = await Cart.findOne({ userId: req.user.id }).populate('items.bookId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your shopping cart is empty' });
    }

    const orderItems = [];
    let subtotal = 0;
    let totalDiscount = 0;

    // 3. Validate stock and calculate prices
    for (const item of cart.items) {
      const book = item.bookId;
      if (!book) {
        return res.status(404).json({ success: false, message: 'One of the books in your cart no longer exists' });
      }

      if (book.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for book "${book.title}". Available stock: ${book.stock}, requested: ${item.quantity}.`
        });
      }

      const itemPrice = book.price;
      const itemDiscount = book.discount || 0;
      const discountedPrice = itemPrice * (1 - itemDiscount / 100);

      subtotal += itemPrice * item.quantity;
      totalDiscount += (itemPrice * (itemDiscount / 100)) * item.quantity;

      orderItems.push({
        bookId: book._id,
        title: book.title,
        price: book.price,
        discount: book.discount,
        quantity: item.quantity
      });
    }

    // Tax (5% of discounted subtotal)
    const taxableAmount = subtotal - totalDiscount;
    const tax = Math.round(taxableAmount * 0.05 * 100) / 100;

    // Shipping (Free if taxableAmount > 500, otherwise flat 50)
    const shipping = taxableAmount > 500 ? 0 : 50;

    // Grand total
    const totalAmount = taxableAmount + tax + shipping;

    // 4. Create the order
    const order = await Order.create({
      userId: req.user.id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'Online' ? 'Paid' : 'Pending',
      orderStatus: 'Pending',
      subtotal,
      discount: totalDiscount,
      tax,
      shipping,
      totalAmount
    });

    // 5. Reduce stock and increment salesCount for each book
    for (const item of cart.items) {
      const book = item.bookId;
      book.stock -= item.quantity;
      book.salesCount += item.quantity;
      await book.save();
    }

    // 6. Clear cart items
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: paymentMethod === 'Online' ? 'Payment processed & order placed successfully!' : 'Order placed successfully!',
      orderId: order._id,
      transactionId: txnId,
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Verify ownership
    if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Get order by ID error:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};
