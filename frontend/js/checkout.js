let cartItems = [];
let userObj = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    showToast('Please login to checkout', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
    return;
  }

  initCheckout();

  // Toggle online payment fields
  const pmRadios = document.querySelectorAll('input[name="payment-method"]');
  const cardFields = document.getElementById('card-fields-wrapper');

  pmRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'Online') {
        cardFields.style.display = 'block';
        toggleCardRequired(true);
      } else {
        cardFields.style.display = 'none';
        toggleCardRequired(false);
      }
    });
  });

  // Place Order Click
  const placeOrderBtn = document.getElementById('btn-place-order');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', handlePlaceOrder);
  }
});

// Load details
async function initCheckout() {
  const loader = document.getElementById('checkout-loader');
  const view = document.getElementById('checkout-view');

  try {
    // 1. Load profile details to prefill
    const profileData = await apiCall('/auth/me', 'GET');
    if (profileData.success && profileData.user) {
      userObj = profileData.user;
      prefillAddressForm(userObj);
    }

    // 2. Load cart to check if empty
    const cartData = await apiCall('/cart', 'GET');
    if (cartData.success) {
      cartItems = cartData.items;

      if (cartItems.length === 0) {
        showToast('Your shopping cart is empty!', 'warning');
        setTimeout(() => {
          window.location.href = 'cart.html';
        }, 1200);
        return;
      }

      renderOrderSummary();
      calculateTotals();

      if (loader) loader.style.display = 'none';
      if (view) view.style.display = 'grid';
    }
  } catch (error) {
    console.error('Error initializing checkout:', error);
    showToast('Failed to initialize checkout', 'error');
  }
}

// Prefill form details
function prefillAddressForm(user) {
  document.getElementById('ship-name').value = user.name || '';
  document.getElementById('ship-email').value = user.email || '';
  document.getElementById('ship-mobile').value = user.mobile || '';

  // Look for default address
  if (user.addresses && user.addresses.length > 0) {
    const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
    document.getElementById('ship-address').value = defaultAddr.addressLine || '';
    document.getElementById('ship-city').value = defaultAddr.city || '';
    document.getElementById('ship-state').value = defaultAddr.state || '';
    document.getElementById('ship-pincode').value = defaultAddr.pincode || '';
  }
}

// Render Order review list
function renderOrderSummary() {
  const container = document.getElementById('checkout-items-summary');
  if (!container) return;

  container.innerHTML = cartItems.map(item => {
    const book = item.bookId || item.book;
    if (!book) return '';
    const price = Number(book.price) || 0;
    const discount = Number(book.discount) || 0;
    const qty = Number(item.quantity) || 1;
    const finalPrice = Math.round(price * (1 - discount / 100));

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:13px;">
        <span style="display:block; max-width:70%; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
          <strong>${book.title || 'Book Title'}</strong> <span style="color:var(--text-muted);">x ${qty}</span>
        </span>
        <span style="font-weight:600;">₹${finalPrice * qty}</span>
      </div>
    `;
  }).join('');
}

// Calculate totals
function calculateTotals() {
  let subtotal = 0;
  let discountSavings = 0;

  cartItems.forEach(item => {
    const book = item.bookId || item.book;
    if (book) {
      const price = Number(book.price) || 0;
      const discount = Number(book.discount) || 0;
      const qty = Number(item.quantity) || 1;
      subtotal += price * qty;
      discountSavings += (price * (discount / 100)) * qty;
    }
  });

  const taxableAmount = Math.max(0, subtotal - discountSavings);
  const tax = subtotal > 0 ? Math.round(taxableAmount * 0.05 * 100) / 100 : 0;
  const shipping = (subtotal === 0 || taxableAmount > 500) ? 0 : 50;
  const grandTotal = subtotal > 0 ? Math.round(taxableAmount + tax + shipping) : 0;

  // Render to DOM
  const subtotalEl = document.getElementById('summary-subtotal');
  const discountEl = document.getElementById('summary-discount');
  const taxEl = document.getElementById('summary-tax');
  const shippingEl = document.getElementById('summary-shipping');
  const grandTotalEl = document.getElementById('summary-grand-total');

  if (subtotalEl) subtotalEl.textContent = `₹${subtotal}`;
  if (discountEl) discountEl.textContent = `-₹${Math.round(discountSavings)}`;
  if (taxEl) taxEl.textContent = `₹${tax}`;
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Free' : `₹${shipping}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal}`;
}

function toggleCardRequired(required) {
  const cardNum = document.getElementById('card-num');
  const cardExpiry = document.getElementById('card-expiry');
  const cardCvv = document.getElementById('card-cvv');

  if (cardNum && cardExpiry && cardCvv) {
    cardNum.required = required;
    cardExpiry.required = required;
    cardCvv.required = required;
  }
}

// Place Order
async function handlePlaceOrder(e) {
  e.preventDefault();

  const name = document.getElementById('ship-name').value.trim();
  const email = document.getElementById('ship-email').value.trim();
  const mobile = document.getElementById('ship-mobile').value.trim();
  const addressLine = document.getElementById('ship-address').value.trim();
  const city = document.getElementById('ship-city').value.trim();
  const state = document.getElementById('ship-state').value.trim();
  const pincode = document.getElementById('ship-pincode').value.trim();

  // Validate form
  if (!name || !email || !mobile || !addressLine || !city || !state || !pincode) {
    showToast('Please fill out all shipping fields', 'error');
    return;
  }

  if (mobile.length !== 10 || isNaN(mobile)) {
    showToast('Please enter a valid 10-digit mobile number', 'error');
    return;
  }

  if (pincode.length !== 6 || isNaN(pincode)) {
    showToast('Please enter a valid 6-digit pincode', 'error');
    return;
  }

  const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
  const paymentDetails = {};

  // Validate card details if online payment selected
  if (paymentMethod === 'Online') {
    const cardNum = document.getElementById('card-num').value.replace(/\s+/g, '');
    const expiry = document.getElementById('card-expiry').value;
    const cvv = document.getElementById('card-cvv').value;

    if (cardNum.length !== 16 || isNaN(cardNum)) {
      showToast('Please enter a valid 16-digit card number', 'error');
      return;
    }
    if (!expiry.match(/^(0[1-9]|1[0-2])\/[0-9]{2}$/)) {
      showToast('Please enter expiry date in MM/YY format', 'error');
      return;
    }
    if (cvv.length !== 3 || isNaN(cvv)) {
      showToast('Please enter a valid 3-digit CVV number', 'error');
      return;
    }

    paymentDetails.cardNumber = cardNum;
    paymentDetails.expiry = expiry;
    paymentDetails.cvv = cvv;
  }

  const placeOrderBtn = document.getElementById('btn-place-order');

  try {
    placeOrderBtn.disabled = true;
    placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Payment...';

    const shippingAddress = {
      fullName: name,
      email,
      mobile,
      addressLine,
      city,
      state,
      pincode
    };

    const reqBody = {
      shippingAddress,
      paymentMethod
    };

    if (paymentMethod === 'Online') {
      reqBody.paymentDetails = paymentDetails;
    }

    const response = await apiCall('/orders', 'POST', reqBody);

    if (response.success && response.order) {
      showToast(response.message || 'Order placed successfully!', 'success');
      
      // Render success screen details
      document.getElementById('success-order-id').textContent = response.orderId;
      document.getElementById('success-order-name').textContent = response.order.shippingAddress.fullName;
      document.getElementById('success-order-address').textContent = `${response.order.shippingAddress.addressLine}, ${response.order.shippingAddress.city}, ${response.order.shippingAddress.state} - ${response.order.shippingAddress.pincode}`;
      document.getElementById('success-order-payment').textContent = response.order.paymentMethod === 'Online' ? `Online Payment (Txn: ${response.transactionId})` : 'Cash on Delivery (COD)';
      document.getElementById('success-order-total').textContent = `₹${Math.round(response.order.totalAmount)}`;

      // Update cart count badge
      updateCartBadge();

      // Show confirmation screen
      document.getElementById('checkout-view').style.display = 'none';
      document.getElementById('checkout-success-view').style.display = 'block';
    }
  } catch (error) {
    showToast(error.message || 'Failed to place order', 'error');
  } finally {
    placeOrderBtn.disabled = false;
    placeOrderBtn.innerHTML = 'Place Order <i class="fas fa-check"></i>';
  }
}
