let currentPage = 1;
let totalPages = 1;
let currentBooks = [];
const booksLimit = 12;

// Filter State
let filters = {
  search: '',
  category: 'All',
  minPrice: '',
  maxPrice: '',
  minRating: '0',
  stockStatus: '',
  sortBy: 'newest'
};

document.addEventListener('DOMContentLoaded', () => {
  // Parse initial query params from URL
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('search')) {
    filters.search = urlParams.get('search');
  }
  if (urlParams.has('category')) {
    filters.category = urlParams.get('category');
    // Select the category radio option
    const radio = document.querySelector(`input[name="category-radio"][value="${filters.category}"]`);
    if (radio) radio.checked = true;
  }
  if (urlParams.has('sortBy')) {
    filters.sortBy = urlParams.get('sortBy');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = filters.sortBy;
  }

  // Wire up filter controls
  // 1. Categories
  const categoryRadios = document.querySelectorAll('input[name="category-radio"]');
  categoryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      filters.category = e.target.value;
      triggerSearch();
    });
  });

  // 2. Price filter
  const applyPriceBtn = document.getElementById('apply-price-filter');
  if (applyPriceBtn) {
    applyPriceBtn.addEventListener('click', () => {
      filters.minPrice = document.getElementById('price-min').value;
      filters.maxPrice = document.getElementById('price-max').value;
      triggerSearch();
    });
  }

  // 3. Ratings
  const ratingRadios = document.querySelectorAll('input[name="rating-radio"]');
  ratingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      filters.minRating = e.target.value;
      triggerSearch();
    });
  });

  // 4. Availability
  const availRadios = document.querySelectorAll('input[name="availability-radio"]');
  availRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      filters.stockStatus = e.target.value;
      triggerSearch();
    });
  });

  // 5. Sorting
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      filters.sortBy = e.target.value;
      triggerSearch();
    });
  }

  // 6. Reset Filters
  const resetBtn = document.getElementById('reset-all-filters');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      filters = {
        search: '',
        category: 'All',
        minPrice: '',
        maxPrice: '',
        minRating: '0',
        stockStatus: '',
        sortBy: 'newest'
      };

      // Reset DOM Elements
      document.querySelector('input[name="category-radio"][value="All"]').checked = true;
      document.getElementById('price-min').value = '';
      document.getElementById('price-max').value = '';
      document.querySelector('input[name="rating-radio"][value="0"]').checked = true;
      document.querySelector('input[name="availability-radio"][value=""]').checked = true;
      document.getElementById('sort-select').value = 'newest';

      // Clear search input in nav
      const navSearchInput = document.getElementById('nav-search-input');
      if (navSearchInput) navSearchInput.value = '';

      // Clear URL params without reloading page
      window.history.pushState({}, '', '/books.html');

      triggerSearch();
    });
  }

  // 7. Load More
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        loadBooks(true);
      }
    });
  }

  // Load books initial
  loadBooks();
});

function triggerSearch() {
  currentPage = 1;
  loadBooks();
}

// Fetch books from API
async function loadBooks(append = false) {
  const container = document.getElementById('catalog-books-container');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const countText = document.getElementById('books-count-text');

  if (!container) return;

  if (!append) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary);"></i>
        <p>Loading books from database...</p>
      </div>
    `;
  }

  try {
    // Build query params
    const params = new URLSearchParams({
      page: currentPage,
      limit: booksLimit,
      sortBy: filters.sortBy
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (Number(filters.minRating) > 0) params.append('minRating', filters.minRating);
    if (filters.stockStatus) params.append('stockStatus', filters.stockStatus);

    const data = await apiCall(`/books?${params.toString()}`, 'GET', null, false);

    if (data.success) {
      totalPages = data.pages;
      
      if (append) {
        currentBooks = [...currentBooks, ...data.books];
      } else {
        currentBooks = data.books;
      }

      if (countText) {
        countText.textContent = `Showing ${currentBooks.length} of ${data.total} book(s) found`;
      }

      if (currentBooks.length > 0) {
        const cardsHTML = currentBooks.map(book => getBookCardHTML(book)).join('');
        container.innerHTML = cardsHTML;
        attachCardEvents(container);

        // Show/hide load more button
        if (currentPage < totalPages) {
          loadMoreBtn.style.display = 'inline-block';
        } else {
          loadMoreBtn.style.display = 'none';
        }
      } else {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <i class="fas fa-search-minus"></i>
            <h3>No books found</h3>
            <p>We couldn't find any books matching your criteria. Try widening your filters.</p>
          </div>
        `;
        loadMoreBtn.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error loading catalog books:', error);
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Failed to load books</h3>
        <p>${error.message || 'There was a connection issue. Please try again.'}</p>
      </div>
    `;
    loadMoreBtn.style.display = 'none';
  }
}

// Helper: Render Book Card HTML
function getBookCardHTML(book) {
  const finalPrice = Math.round(book.price * (1 - book.discount / 100));
  const discountBadge = book.discount > 0 ? `<div class="discount-badge">-${book.discount}%</div>` : '';
  const originalPriceHTML = book.discount > 0 ? `<span class="price-original">₹${book.price}</span>` : '';
  
  // Stock label styling
  let stockLabel = '';
  if (book.stock === 0) {
    stockLabel = `<span class="stock-status out-of-stock" style="font-size:11px; margin-bottom:8px;"><i class="fas fa-times-circle"></i> Out of Stock</span>`;
  } else if (book.stock <= 5) {
    stockLabel = `<span class="stock-status low-stock" style="font-size:11px; margin-bottom:8px;"><i class="fas fa-exclamation-circle"></i> Low Stock (${book.stock} left)</span>`;
  } else {
    stockLabel = `<span class="stock-status in-stock" style="font-size:11px; margin-bottom:8px;"><i class="fas fa-check-circle"></i> In Stock</span>`;
  }

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
        ${stockLabel}
        <div class="book-card-price-row">
          <span class="price">₹${finalPrice}</span>
          ${originalPriceHTML}
        </div>
        <button class="btn-card add-to-cart-quick" data-id="${book._id}" ${book.stock === 0 ? 'disabled style="cursor:not-allowed; opacity:0.6;"' : ''}>
          <i class="fas fa-shopping-cart"></i> ${book.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;
}

// Attach event listeners to catalog cards
function attachCardEvents(parentContainer) {
  const cards = parentContainer.querySelectorAll('.book-card');
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.add-to-cart-quick')) {
        return;
      }
      const bookId = card.getAttribute('data-id');
      window.location.href = `/book-details.html?id=${bookId}`;
    });
  });

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
