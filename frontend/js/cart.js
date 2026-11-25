let cartItems = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    showToast('Please login to view your cart', 'warning');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
    return;
  }

  loadCart();
});

// Load cart items
async function loadCart() {
  const loader = document.getElementById('cart-loader');
  const cartView = document.getElementById('cart-container-view');
  const emptyView = document.getElementById('cart-empty-view');

  try {
    const data = await apiCall('/cart', 'GET');
    
    if (data.success) {
      cartItems = data.items || [];
      
      if (cartItems.length > 0) {
        renderCartItems();
        calculateCartTotals();
        
        if (loader) loader.style.display = 'none';
        if (emptyView) emptyView.style.display = 'none';
        if (cartView) cartView.style.display = 'grid';
      } else {
        if (loader) loader.style.display = 'none';
        if (cartView) cartView.style.display = 'none';
        if (emptyView) emptyView.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error loading cart:', error);
    showToast('Failed to load cart items', 'error');
    if (loader) {
      loader.innerHTML = `
        <div class="empty-state" style="border: none; box-shadow: none;">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error loading cart</h3>
          <p>${error.message || 'There was a connection issue.'}</p>
        </div>
      `;
    }
  }
}

// Render Cart Items list
function renderCartItems() {
  const container = document.getElementById('cart-items-list');
  if (!container) return;

  container.innerHTML = cartItems.map(item => {
    const book = item.bookId || item.book;
    if (!book) return ''; // Skip if book details missing

    const price = Number(book.price) || 0;
    const discount = Number(book.discount) || 0;
    const qty = Number(item.quantity) || 1;
    const finalPrice = Math.round(price * (1 - discount / 100));
    const itemSubtotal = finalPrice * qty;
    const bookId = book._id || book.isbn || 'item';
    const stock = Number(book.stock) || 10;
    
    // Stock alert
    let stockAlert = '';
    if (stock <= 5 && stock > 0) {
      stockAlert = `<span style="font-size:11px; color:var(--warning); display:block; margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Only ${stock} items left in stock</span>`;
    }

    return `
      <div class="cart-item" data-id="${bookId}">
        <div class="cart-item-cover">
          <img src="${book.coverImage || 'https://covers.openlibrary.org/b/id/8291585-L.jpg'}" alt="${book.title || 'Book Cover'}">
        </div>
        <div class="cart-item-details">
          <h3 class="cart-item-title">${book.title || 'Book Title'}</h3>
          <div class="cart-item-author">by ${book.author || 'Author'}</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Price: ₹${finalPrice} ${discount > 0 ? `<span style="text-decoration:line-through; font-size:11px;">₹${price}</span>` : ''}</div>
          ${stockAlert}
        </div>
        <div class="quantity-picker" style="margin-bottom:0;">
          <button class="cart-qty-minus" data-id="${bookId}"><i class="fas fa-minus"></i></button>
          <input type="text" value="${qty}" readonly style="width: 36px; padding: 4px 0;">
          <button class="cart-qty-plus" data-id="${bookId}" data-stock="${stock}"><i class="fas fa-plus"></i></button>
        </div>
        <div class="cart-item-price-col">
          <div class="cart-item-subtotal">₹${itemSubtotal}</div>
        </div>
        <button class="btn-remove cart-item-remove" data-id="${bookId}">
          <i class="far fa-trash-alt"></i>
        </button>
      </div>
    `;
  }).join('');

  attachCartItemListeners();
}

// Calculate cost breakdowns
function calculateCartTotals() {
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

// Attach event listeners for update/delete
function attachCartItemListeners() {
  const container = document.getElementById('cart-items-list');
  if (!container) return;

  // Helper to find item by ID
  const findCartItem = (bookId) => {
    return cartItems.find(i => {
      const id = (i.bookId && (i.bookId._id || i.bookId)) || (i.book && (i.book._id || i.book));
      return id === bookId;
    });
  };

  // Minus quantity
  container.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = btn.getAttribute('data-id');
      const item = findCartItem(bookId);
      if (!item) return;

      const newQty = (item.quantity || 1) - 1;
      if (newQty < 1) {
        // If drops below 1, remove item
        await removeItem(bookId);
      } else {
        await updateQuantity(bookId, newQty);
      }
    });
  });

  // Plus quantity
  container.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = btn.getAttribute('data-id');
      const stock = Number(btn.getAttribute('data-stock')) || 10;
      const item = findCartItem(bookId);
      if (!item) return;

      const newQty = (item.quantity || 1) + 1;
      if (newQty > stock) {
        showToast(`Only ${stock} items available in stock`, 'warning');
        return;
      }

      await updateQuantity(bookId, newQty);
    });
  });

  // Remove item
  container.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = btn.getAttribute('data-id');
      await removeItem(bookId);
    });
  });
}

// Call API to update quantity
async function updateQuantity(bookId, quantity) {
  try {
    const data = await apiCall(`/cart/${bookId}`, 'PUT', { quantity });
    if (data.success) {
      cartItems = data.items || [];
      renderCartItems();
      calculateCartTotals();
      updateCartBadge();
    }
  } catch (error) {
    showToast(error.message || 'Failed to update quantity', 'error');
  }
}

// Call API to remove item
async function removeItem(bookId) {
  try {
    const data = await apiCall(`/cart/${bookId}`, 'DELETE');
    if (data.success) {
      showToast('Item removed from cart', 'success');
      cartItems = data.items || [];
      updateCartBadge();
      
      if (cartItems.length > 0) {
        renderCartItems();
        calculateCartTotals();
      } else {
        const cartView = document.getElementById('cart-container-view');
        const emptyView = document.getElementById('cart-empty-view');
        if (cartView) cartView.style.display = 'none';
        if (emptyView) emptyView.style.display = 'block';
      }
    }
  } catch (error) {
    showToast(error.message || 'Failed to remove item', 'error');
  }
}
