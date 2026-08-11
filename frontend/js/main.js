document.addEventListener('DOMContentLoaded', () => {
  // Category cards click
  const categoryCards = document.querySelectorAll('.category-card');
  categoryCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      window.location.href = `/books.html?category=${encodeURIComponent(category)}`;
    });
  });

  // Newsletter form submission
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('newsletter-email').value.trim();
      if (email) {
        showToast('Thank you for subscribing to our newsletter!', 'success');
        newsletterForm.reset();
      }
    });
  }

  // Load Home page data
  loadFeaturedBooks();
  loadBestsellers();
});

// Load and render Featured Books
async function loadFeaturedBooks() {
  const container = document.getElementById('featured-books-container');
  if (!container) return;

  try {
    const data = await apiCall('/books?limit=4&sortBy=newest', 'GET', null, false);
    if (data.success && data.books && data.books.length > 0) {
      container.innerHTML = data.books.map(book => getBookCardHTML(book)).join('');
      attachCardEvents(container);
    } else {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-book-open"></i>
          <h3>No books available</h3>
          <p>We're adding books to our shelves soon!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading featured books:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load books</h3>
        <p>There was a connection issue. Please try again.</p>
      </div>
    `;
  }
}

// Load and render Bestsellers
async function loadBestsellers() {
  const container = document.getElementById('bestsellers-books-container');
  if (!container) return;

  try {
    const data = await apiCall('/books?limit=4&sortBy=bestSelling', 'GET', null, false);
    if (data.success && data.books && data.books.length > 0) {
      container.innerHTML = data.books.map(book => getBookCardHTML(book)).join('');
      attachCardEvents(container);
    } else {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-book-open"></i>
          <h3>No books available</h3>
          <p>We're adding books to our shelves soon!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading best sellers:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load books</h3>
        <p>There was a connection issue. Please try again.</p>
      </div>
    `;
  }
}

// Helper: Render Book Card HTML
function getBookCardHTML(book) {
  const finalPrice = Math.round(book.price * (1 - book.discount / 100));
  const discountBadge = book.discount > 0 ? `<div class="discount-badge">-${book.discount}%</div>` : '';
  const originalPriceHTML = book.discount > 0 ? `<span class="price-original">₹${book.price}</span>` : '';
  
  return `
    <div class="book-card" data-id="${book._id}">
      ${discountBadge}
      <div class="book-cover-wrapper">
        <img src="${book.coverImage}" alt="${book.title}" loading="lazy">
      </div>
      <div class="book-card-info">
        <div class="book-card-category">${book.category}</div>
        <h3 class="book-card-title">${book.title}</h3>
        <div class="book-card-author">${book.author}</div>
        <div class="rating-stars">
          ${getRatingStarsHTML(book.rating)}
          <span class="rating-count">(${book.reviewCount})</span>
        </div>
        <div class="book-card-price-row">
          <span class="price">₹${finalPrice}</span>
          ${originalPriceHTML}
        </div>
        <button class="btn-card add-to-cart-quick" data-id="${book._id}">
          <i class="fas fa-shopping-cart"></i> Add to Cart
        </button>
      </div>
    </div>
  `;
}

// Attach event listeners to newly rendered cards
function attachCardEvents(parentContainer) {
  // Click on card redirect to details (excluding Add to Cart click)
  const cards = parentContainer.querySelectorAll('.book-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart-quick')) {
        return; // Handled by cart logic below
      }
      const bookId = card.getAttribute('data-id');
      window.location.href = `/book-details.html?id=${bookId}`;
    });
  });

  // Quick Add to Cart
  const addBtns = parentContainer.querySelectorAll('.add-to-cart-quick');
  addBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const bookId = btn.getAttribute('data-id');

      if (!isAuthenticated()) {
        showToast('Please login to add items to cart', 'warning');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1200);
        return;
      }

      try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        
        const data = await apiCall('/cart', 'POST', { bookId, quantity: 1 });
        if (data.success) {
          showToast('Added to cart successfully', 'success');
          updateCartBadge();
        }
      } catch (error) {
        showToast(error.message || 'Failed to add item to cart', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
      }
    });
  });
}
