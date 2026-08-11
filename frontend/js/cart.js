let cartItems = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    showToast('Please login to view your cart', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html';
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
      cartItems = data.items;
      
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
    const book = item.bookId;
    if (!book) return ''; // Skip if book details missing

    const finalPrice = Math.round(book.price * (1 - book.discount / 100));
    const itemSubtotal = finalPrice * item.quantity;
    
    // Stock alert
    let stockAlert = '';
    if (book.stock <= 5 && book.stock > 0) {
      stockAlert = `<span style="font-size:11px; color:var(--warning); display:block; margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Only ${book.stock} items left in stock</span>`;
    }

    return `
      <div class="cart-item" data-id="${book._id}">
        <div class="cart-item-cover">
          <img src="${book.coverImage}" alt="${book.title}">
        </div>
        <div class="cart-item-details">
          <h3 class="cart-item-title">${book.title}</h3>
          <div class="cart-item-author">by ${book.author}</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Price: ₹${finalPrice} ${book.discount > 0 ? `<span style="text-decoration:line-through; font-size:11px;">₹${book.price}</span>` : ''}</div>
          ${stockAlert}
        </div>
        <div class="quantity-picker" style="margin-bottom:0;">
          <button class="cart-qty-minus" data-id="${book._id}"><i class="fas fa-minus"></i></button>
          <input type="text" value="${item.quantity}" readonly style="width: 36px; padding: 4px 0;">
          <button class="cart-qty-plus" data-id="${book._id}" data-stock="${book.stock}"><i class="fas fa-plus"></i></button>
        </div>
        <div class="cart-item-price-col">
          <div class="cart-item-subtotal">₹${itemSubtotal}</div>
        </div>
        <button class="btn-remove cart-item-remove" data-id="${book._id}">
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
    const book = item.bookId;
    if (book) {
      subtotal += book.price * item.quantity;
      discountSavings += (book.price * (book.discount / 100)) * item.quantity;
    }
  });

  const taxableAmount = subtotal - discountSavings;
  const tax = Math.round(taxableAmount * 0.05 * 100) / 100;
  const shipping = taxableAmount > 500 ? 0 : 50;
  const grandTotal = taxableAmount + tax + shipping;

  // Render to DOM
  document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
  document.getElementById('summary-discount').textContent = `-₹${Math.round(discountSavings)}`;
  document.getElementById('summary-tax').textContent = `₹${tax}`;
  document.getElementById('summary-shipping').textContent = shipping === 0 ? 'Free' : `₹${shipping}`;
  document.getElementById('summary-grand-total').textContent = `₹${Math.round(grandTotal)}`;
}

// Attach event listeners for update/delete
function attachCartItemListeners() {
  const container = document.getElementById('cart-items-list');
  if (!container) return;

  // Minus quantity
  container.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = btn.getAttribute('data-id');
      const item = cartItems.find(i => i.bookId._id === bookId);
      if (!item) return;

      const newQty = item.quantity - 1;
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
      const stock = Number(btn.getAttribute('data-stock'));
      const item = cartItems.find(i => i.bookId._id === bookId);
      if (!item) return;

      const newQty = item.quantity + 1;
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
      cartItems = data.items;
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
      cartItems = data.items;
      updateCartBadge();
      
      if (cartItems.length > 0) {
        renderCartItems();
        calculateCartTotals();
      } else {
        document.getElementById('cart-container-view').style.display = 'none';
        document.getElementById('cart-empty-view').style.display = 'block';
      }
    }
  } catch (error) {
    showToast(error.message || 'Failed to remove item', 'error');
  }
}
