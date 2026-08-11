let bookId = '';
let bookStock = 0;
let currentQty = 1;
let selectedRating = 0;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  bookId = urlParams.get('id');

  if (!bookId) {
    window.location.href = '/books.html';
    return;
  }

  // Load Book details & reviews
  loadBookDetails();
  loadBookReviews();

  // Wire up quantity picker
  const qtyInput = document.getElementById('qty-input');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');

  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      if (currentQty > 1) {
        currentQty--;
        qtyInput.value = currentQty;
      }
    });

    qtyPlus.addEventListener('click', () => {
      if (currentQty < bookStock) {
        currentQty++;
        qtyInput.value = currentQty;
      } else {
        showToast(`Cannot select more than ${bookStock} items (stock limit)`, 'warning');
      }
    });
  }

  // Add to Cart
  const addCartBtn = document.getElementById('btn-add-to-cart');
  if (addCartBtn) {
    addCartBtn.addEventListener('click', async () => {
      await addToCartAction(false);
    });
  }

  // Buy Now
  const buyNowBtn = document.getElementById('btn-buy-now');
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', async () => {
      await addToCartAction(true);
    });
  }

  // Review Stars Selector
  const starIcons = document.querySelectorAll('#rating-select-stars i');
  starIcons.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = Number(star.getAttribute('data-rating'));
      
      // Update star styles
      starIcons.forEach(s => {
        const rating = Number(s.getAttribute('data-rating'));
        if (rating <= selectedRating) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });

      document.getElementById('review-rating-value').value = selectedRating;
    });
  });

  // Submit Review Form
  const reviewForm = document.getElementById('submit-review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!isAuthenticated()) {
        showToast('Please login to submit a review', 'warning');
        return;
      }

      if (selectedRating === 0) {
        showToast('Please select a rating star', 'warning');
        return;
      }

      const comment = document.getElementById('review-comment').value.trim();

      try {
        const response = await apiCall(`/books/${bookId}/reviews`, 'POST', {
          rating: selectedRating,
          comment
        });

        if (response.success) {
          showToast('Review submitted successfully!', 'success');
          reviewForm.reset();
          resetStarSelection();
          // Reload page sections
          loadBookDetails();
          loadBookReviews();
        }
      } catch (error) {
        showToast(error.message || 'Failed to submit review', 'error');
      }
    });
  }
});

// Load Book details
async function loadBookDetails() {
  const loader = document.getElementById('details-loader');
  const view = document.getElementById('details-view');

  try {
    const data = await apiCall(`/books/${bookId}`, 'GET', null, false);
    if (data.success && data.book) {
      const book = data.book;
      bookStock = book.stock;

      // Populate elements
      document.getElementById('book-cover').src = book.coverImage;
      document.getElementById('book-cover').alt = book.title;
      document.getElementById('book-category').textContent = book.category;
      document.getElementById('book-title').textContent = book.title;
      document.getElementById('book-author').textContent = `by ${book.author}`;
      document.getElementById('book-publisher').textContent = book.publisher;
      document.getElementById('book-isbn').textContent = book.isbn;
      document.getElementById('book-description').textContent = book.description;
      
      // Ratings
      document.getElementById('book-stars').innerHTML = getRatingStarsHTML(book.rating);
      document.getElementById('book-review-count').textContent = `(${book.reviewCount} customer reviews)`;

      // Pricing
      const finalPrice = Math.round(book.price * (1 - book.discount / 100));
      document.getElementById('book-price').textContent = `₹${finalPrice}`;

      const origPriceEl = document.getElementById('book-original-price');
      const discBadgeEl = document.getElementById('book-discount-badge');
      if (book.discount > 0) {
        origPriceEl.style.display = 'inline';
        origPriceEl.textContent = `₹${book.price}`;
        discBadgeEl.style.display = 'inline-block';
        discBadgeEl.textContent = `-${book.discount}%`;
      } else {
        origPriceEl.style.display = 'none';
        discBadgeEl.style.display = 'none';
      }

      // Stock Label
      const stockLabel = document.getElementById('book-stock-status');
      const addCartBtn = document.getElementById('btn-add-to-cart');
      const buyNowBtn = document.getElementById('btn-buy-now');

      if (book.stock === 0) {
        stockLabel.className = 'stock-status out-of-stock';
        stockLabel.innerHTML = '<i class="fas fa-times-circle"></i> Out of Stock';
        if (addCartBtn) addCartBtn.disabled = true;
        if (buyNowBtn) buyNowBtn.disabled = true;
      } else if (book.stock <= 5) {
        stockLabel.className = 'stock-status low-stock';
        stockLabel.innerHTML = `<i class="fas fa-exclamation-circle"></i> Low Stock (Only ${book.stock} left!)`;
      } else {
        stockLabel.className = 'stock-status in-stock';
        stockLabel.innerHTML = '<i class="fas fa-check-circle"></i> In Stock';
      }

      // Show view
      if (loader) loader.style.display = 'none';
      if (view) view.style.display = 'block';
    }
  } catch (error) {
    console.error('Error fetching book details:', error);
    if (loader) {
      loader.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; border: none; box-shadow: none;">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to load book details</h3>
          <p>${error.message || 'There was a connection issue.'}</p>
          <a href="/books.html" class="btn btn-secondary" style="margin-top:16px;">Back to Catalog</a>
        </div>
      `;
    }
  }
}

// Load reviews
async function loadBookReviews() {
  const list = document.getElementById('reviews-list');
  if (!list) return;

  try {
    const data = await apiCall(`/books/${bookId}/reviews`, 'GET', null, false);
    if (data.success && data.reviews && data.reviews.length > 0) {
      list.innerHTML = data.reviews.map(review => `
        <div class="review-item">
          <div class="review-header">
            <span class="review-user">${review.userId.name}</span>
            <span class="review-date">${new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div class="rating-stars" style="margin-bottom:8px;">
            ${getRatingStarsHTML(review.rating)}
          </div>
          <p style="font-size:14px; color:var(--text-main); line-height:1.5;">${review.comment}</p>
        </div>
      `).join('');
    } else {
      list.innerHTML = `
        <div class="empty-state" style="border:1px dashed var(--border); box-shadow:none;">
          <i class="far fa-star"></i>
          <h3>No reviews yet</h3>
          <p>Be the first to review this book!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
    list.innerHTML = `<p style="color:var(--danger); font-size:14px;">Failed to load reviews.</p>`;
  }
}

// Handle Add to Cart action
async function addToCartAction(redirectToCheckout = false) {
  if (!isAuthenticated()) {
    showToast('Please login to buy books', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1200);
    return;
  }

  const btn = redirectToCheckout ? document.getElementById('btn-buy-now') : document.getElementById('btn-add-to-cart');
  
  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    }

    const data = await apiCall('/cart', 'POST', {
      bookId,
      quantity: currentQty
    });

    if (data.success) {
      showToast(redirectToCheckout ? 'Proceeding to checkout' : 'Added to cart successfully!', 'success');
      updateCartBadge();
      
      if (redirectToCheckout) {
        setTimeout(() => {
          window.location.href = '/checkout.html';
        }, 800);
      }
    }
  } catch (error) {
    showToast(error.message || 'Failed to update cart', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = redirectToCheckout ? '<i class="fas fa-bolt"></i> Buy Now' : '<i class="fas fa-shopping-cart"></i> Add to Cart';
    }
  }
}

function resetStarSelection() {
  selectedRating = 0;
  document.getElementById('review-rating-value').value = 0;
  const starIcons = document.querySelectorAll('#rating-select-stars i');
  starIcons.forEach(s => s.classList.remove('active'));
}
