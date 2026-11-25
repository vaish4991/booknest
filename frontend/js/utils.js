// API Base URL
// Can be customized or pointed to a deployed Render backend via localStorage.setItem('booknest_api_url', 'https://...')
const API_URL = localStorage.getItem('booknest_api_url') || '/api';

// Helper to determine relative path prefix based on whether current page is in admin/ folder
function getPrefix() {
  return window.location.pathname.includes('/admin/') ? '../' : '';
}

// Toast Notification
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-exclamation-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  if (type === 'info') icon = 'fa-info-circle';

  toast.innerHTML = `
    <i class="fas ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Remove toast after animation completes (4 seconds total)
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Authentication Helpers
function getAuthToken() {
  return localStorage.getItem('booknest_token');
}

function getAuthUser() {
  const user = localStorage.getItem('booknest_user');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
  localStorage.setItem('booknest_token', token);
  localStorage.setItem('booknest_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('booknest_token');
  localStorage.removeItem('booknest_user');
}

function isAuthenticated() {
  return !!getAuthToken();
}

function isAdmin() {
  const user = getAuthUser();
  return user && user.role === 'admin';
}

// Cache for static books.json fallback
let cachedStaticBooks = null;
async function getStaticBooks() {
  if (cachedStaticBooks) return cachedStaticBooks;
  try {
    const res = await fetch(`${getPrefix()}data/books.json`);
    if (res.ok) {
      cachedStaticBooks = await res.json();
      return cachedStaticBooks;
    }
  } catch (err) {
    console.warn('Could not load static books.json fallback:', err);
  }
  return [];
}

// Fallback Mock API Handler for static hosting environments (e.g. GitHub Pages)
async function mockApiResponse(endpoint, method = 'GET', body = null) {
  const [urlPath, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');

  // 1. Books API
  if (urlPath === '/books' || urlPath === '/books/') {
    let books = await getStaticBooks();
    
    // Filter by Category
    const category = params.get('category');
    if (category && category !== 'All') {
      books = books.filter(b => b.category.toLowerCase() === category.toLowerCase());
    }

    // Search query
    const search = params.get('search');
    if (search) {
      const q = search.toLowerCase();
      books = books.filter(b => 
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.includes(q))
      );
    }

    // Min & Max Price
    const minPrice = parseFloat(params.get('minPrice'));
    const maxPrice = parseFloat(params.get('maxPrice'));
    if (!isNaN(minPrice)) books = books.filter(b => b.price >= minPrice);
    if (!isNaN(maxPrice)) books = books.filter(b => b.price <= maxPrice);

    // Rating
    const rating = parseFloat(params.get('rating'));
    if (!isNaN(rating)) books = books.filter(b => (b.rating || 0) >= rating);

    // In Stock
    const inStock = params.get('inStock');
    if (inStock === 'true') books = books.filter(b => b.stock > 0);

    // Sorting
    const sortBy = params.get('sortBy');
    if (sortBy === 'priceAsc') books.sort((a, b) => a.price - b.price);
    else if (sortBy === 'priceDesc') books.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') books.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'bestSelling') books.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    else if (sortBy === 'newest') books.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Pagination
    const page = parseInt(params.get('page')) || 1;
    const limit = parseInt(params.get('limit')) || books.length;
    const startIndex = (page - 1) * limit;
    const paginatedBooks = books.slice(startIndex, startIndex + limit);

    return {
      success: true,
      count: paginatedBooks.length,
      total: books.length,
      page,
      pages: Math.ceil(books.length / limit) || 1,
      books: paginatedBooks
    };
  }

  // Single Book Details: /books/:id
  const singleBookMatch = urlPath.match(/^\/books\/([a-zA-Z0-9_-]+)/);
  if (singleBookMatch) {
    const bookId = singleBookMatch[1];
    const books = await getStaticBooks();
    const book = books.find(b => b._id === bookId || b.isbn === bookId) || books[0];
    if (book) {
      return { success: true, book };
    }
    throw new Error('Book not found');
  }

  // Categories list
  if (urlPath === '/books/categories') {
    const books = await getStaticBooks();
    const categories = [...new Set(books.map(b => b.category))];
    return { success: true, categories };
  }

  // 2. Auth: Login
  if (urlPath === '/auth/login') {
    const { email, password } = body || {};
    if (email === 'admin@booknest.com') {
      return {
        success: true,
        token: 'mock_jwt_token_admin_987654321',
        user: { _id: 'admin_001', name: 'BookNest Admin', email: 'admin@booknest.com', role: 'admin' }
      };
    }
    return {
      success: true,
      token: 'mock_jwt_token_user_123456789',
      user: { _id: 'cust_001', name: email ? email.split('@')[0] : 'Demo Customer', email: email || 'customer@booknest.com', role: 'customer' }
    };
  }

  // Auth: Register
  if (urlPath === '/auth/register') {
    return {
      success: true,
      token: 'mock_jwt_token_user_' + Date.now(),
      user: { _id: 'user_' + Date.now(), name: body?.name || 'Customer', email: body?.email || 'customer@booknest.com', role: 'customer' }
    };
  }

  // 3. Cart API
  if (urlPath === '/cart' || urlPath.startsWith('/cart')) {
    let mockCart = JSON.parse(localStorage.getItem('booknest_mock_cart') || '[]');
    const books = await getStaticBooks();

    // Helper to find / hydrate book object
    const resolveBook = (rawBookId, existingBook) => {
      if (existingBook && typeof existingBook === 'object' && existingBook.title && existingBook.price) {
        return existingBook;
      }
      const bId = rawBookId || (existingBook && (existingBook._id || existingBook.isbn));
      const found = books.find(b => b._id === bId || b.isbn === bId);
      return found || existingBook || { _id: bId, title: 'Selected Book', price: 499, discount: 0, stock: 10, coverImage: 'https://covers.openlibrary.org/b/id/8291585-L.jpg' };
    };

    // Normalize any existing cart items in mockCart
    mockCart = mockCart.map(item => {
      const b = resolveBook(item.bookId, item.bookId || item.book);
      return {
        bookId: b,
        book: b,
        quantity: Number(item.quantity) || 1,
        price: Number(b.price) || item.price || 0
      };
    });

    if (method === 'GET') {
      localStorage.setItem('booknest_mock_cart', JSON.stringify(mockCart));
      return { success: true, items: mockCart };
    }
    
    if (method === 'POST') {
      const { bookId, quantity } = body || {};
      const book = resolveBook(bookId, null);
      
      const existing = mockCart.find(i => {
        const id = (i.bookId && (i.bookId._id || i.bookId)) || (i.book && (i.book._id || i.book));
        return id === bookId || id === book._id;
      });

      if (existing) {
        existing.quantity += (Number(quantity) || 1);
      } else {
        mockCart.push({
          bookId: book,
          book: book,
          quantity: Number(quantity) || 1,
          price: Number(book.price) || 0
        });
      }
      localStorage.setItem('booknest_mock_cart', JSON.stringify(mockCart));
      return { success: true, items: mockCart };
    }

    if (method === 'PUT') {
      const targetId = body?.bookId || urlPath.match(/\/cart\/(?:update\/)?([a-zA-Z0-9_-]+)/)?.[1] || urlPath.split('/')[2];
      const qty = Number(body?.quantity) || 1;
      const item = mockCart.find(i => {
        const id = (i.bookId && (i.bookId._id || i.bookId)) || (i.book && (i.book._id || i.book));
        return id === targetId;
      });
      if (item) {
        item.quantity = qty;
      }
      localStorage.setItem('booknest_mock_cart', JSON.stringify(mockCart));
      return { success: true, items: mockCart };
    }

    if (method === 'DELETE') {
      const deleteMatch = urlPath.match(/\/cart\/(?:remove\/)?([a-zA-Z0-9_-]+)/) || urlPath.split('/')[2];
      const idToRemove = (typeof deleteMatch === 'string' ? deleteMatch : deleteMatch?.[1]) || body?.bookId;
      if (idToRemove) {
        mockCart = mockCart.filter(i => {
          const id = (i.bookId && (i.bookId._id || i.bookId)) || (i.book && (i.book._id || i.book));
          return id !== idToRemove;
        });
        localStorage.setItem('booknest_mock_cart', JSON.stringify(mockCart));
      }
      return { success: true, items: mockCart };
    }
  }

  // 4. Orders API
  if (urlPath === '/orders' || urlPath === '/orders/my' || urlPath.startsWith('/orders')) {
    let mockOrders = JSON.parse(localStorage.getItem('booknest_mock_orders') || '[]');
    if (method === 'GET') {
      return { success: true, orders: mockOrders };
    }
    if (method === 'POST') {
      const newOrder = {
        _id: 'ORD' + Math.floor(100000 + Math.random() * 900000),
        items: body?.items || [],
        shippingAddress: body?.shippingAddress || {},
        paymentMethod: body?.paymentMethod || 'Online Card',
        paymentStatus: 'Paid',
        totalAmount: body?.totalAmount || 899,
        status: 'Processing',
        createdAt: new Date().toISOString()
      };
      mockOrders.unshift(newOrder);
      localStorage.setItem('booknest_mock_orders', JSON.stringify(mockOrders));
      localStorage.removeItem('booknest_mock_cart'); // clear cart after order
      return { success: true, order: newOrder };
    }
  }

  // 5. Admin API Mock
  if (urlPath.startsWith('/admin')) {
    const books = await getStaticBooks();
    return {
      success: true,
      stats: {
        totalRevenue: 154200,
        totalOrders: 48,
        totalUsers: 32,
        totalBooks: books.length
      },
      books: books,
      users: [
        { _id: 'u1', name: 'Demo Customer', email: 'customer@booknest.com', role: 'customer', createdAt: new Date().toISOString() },
        { _id: 'u2', name: 'Admin User', email: 'admin@booknest.com', role: 'admin', createdAt: new Date().toISOString() }
      ],
      orders: JSON.parse(localStorage.getItem('booknest_mock_orders') || '[]')
    };
  }

  // Default Fallback
  return { success: true, message: 'Simulated operation succeeded' };
}

// API Call Wrapper
async function apiCall(endpoint, method = 'GET', body = null, requireAuth = true) {
  const headers = {
    'Content-Type': 'application/json'
  };

  const prefix = getPrefix();

  if (requireAuth) {
    const token = getAuthToken();
    if (!token) {
      window.location.href = `${prefix}login.html`;
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config = {
    method,
    headers
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    // Check if endpoint exists on current server
    if (response.ok) {
      return await response.json();
    }

    // If 404 and on static host or unconfigured API, fallback to mock data
    if (response.status === 404 || response.status === 405) {
      console.info(`Backend endpoint ${endpoint} returned ${response.status}. Using client simulation fallback.`);
      return await mockApiResponse(endpoint, method, body);
    }

    if (response.status === 401 && requireAuth) {
      clearAuth();
      window.location.href = `${prefix}login.html`;
    }

    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Something went wrong');
  } catch (error) {
    // If network error (fetch failed, e.g. static site with no backend at /api)
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.info(`No active backend reached at ${API_URL}${endpoint}. Serving from client simulation fallback.`);
      return await mockApiResponse(endpoint, method, body);
    }
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Initialize Navigation Bar
function initNavbar() {
  const navContainer = document.getElementById('main-nav');
  if (!navContainer) return;

  const prefix = getPrefix();
  const currentPath = window.location.pathname;
  const user = getAuthUser();
  const loggedIn = isAuthenticated();

  let authSection = '';
  if (loggedIn) {
    authSection = `
      <div class="nav-profile" id="nav-profile-trigger">
        <i class="fas fa-user-circle"></i>
        <span class="nav-profile-name">${user.name ? user.name.split(' ')[0] : 'User'}</span>
        <ul class="dropdown-menu" id="nav-profile-menu">
          <li><a href="${prefix}profile.html"><i class="fas fa-id-badge"></i> My Profile</a></li>
          <li><a href="${prefix}orders.html"><i class="fas fa-shopping-bag"></i> My Orders</a></li>
          ${user.role === 'admin' ? `<li><a href="${prefix}admin/dashboard.html"><i class="fas fa-lock"></i> Admin Panel</a></li>` : ''}
          <li><button id="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button></li>
        </ul>
      </div>
    `;
  } else {
    authSection = `
      <a href="${prefix}login.html" class="auth-btn">Login / Register</a>
    `;
  }

  navContainer.innerHTML = `
    <div class="nav-container">
      <a href="${prefix}index.html" class="logo">
        <i class="fas fa-book-reader"></i> Book<span>Nest</span>
      </a>

      <button class="menu-toggle" id="menu-toggle">
        <i class="fas fa-bars"></i>
      </button>

      <ul class="nav-links" id="nav-links">
        <li><a href="${prefix}index.html" class="${currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath.endsWith('booknest') ? 'active' : ''}">Home</a></li>
        <li><a href="${prefix}books.html" class="${currentPath.endsWith('books.html') ? 'active' : ''}">Books</a></li>
        <li><a href="${prefix}index.html#categories" class="">Categories</a></li>
        <li><a href="${prefix}index.html#about" class="">About</a></li>
        <li><a href="${prefix}index.html#contact" class="">Contact</a></li>
      </ul>

      <div class="nav-search">
        <form id="nav-search-form">
          <i class="fas fa-search"></i>
          <input type="text" id="nav-search-input" placeholder="Search by title, author, ISBN..." value="${new URLSearchParams(window.location.search).get('search') || ''}">
        </form>
      </div>

      <div class="nav-actions">
        <a href="${prefix}cart.html" class="nav-btn">
          <i class="fas fa-shopping-cart"></i>
          <span class="badge" id="cart-badge" style="display: none;">0</span>
        </a>
        ${authSection}
      </div>
    </div>
  `;

  // Wire up mobile hamburger menu
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.getElementById('nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('show');
    });
  }

  // Wire up search form
  const searchForm = document.getElementById('nav-search-form');
  const searchInput = document.getElementById('nav-search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = searchInput.value.trim();
      if (val) {
        window.location.href = `${prefix}books.html?search=${encodeURIComponent(val)}`;
      } else {
        window.location.href = `${prefix}books.html`;
      }
    });
  }

  // Wire up profile dropdown
  const profileTrigger = document.getElementById('nav-profile-trigger');
  const profileMenu = document.getElementById('nav-profile-menu');
  if (profileTrigger && profileMenu) {
    profileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => {
      profileMenu.classList.remove('show');
    });
  }

  // Wire up logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearAuth();
      showToast('Logged out successfully');
      setTimeout(() => {
        window.location.href = `${prefix}index.html`;
      }, 1000);
    });
  }

  // Load cart badge count
  updateCartBadge();
}

// Update Cart Badge Count
async function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  if (!isAuthenticated()) {
    badge.style.display = 'none';
    return;
  }

  try {
    const data = await apiCall('/cart', 'GET', null, false);
    if (data.success && data.items && data.items.length > 0) {
      const count = data.items.reduce((total, item) => total + (item.quantity || 1), 0);
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (error) {
    console.error('Error fetching cart badge:', error);
    badge.style.display = 'none';
  }
}

// Initialize Footer
function initFooter() {
  const footerContainer = document.getElementById('main-footer');
  if (!footerContainer) return;

  const prefix = getPrefix();
  footerContainer.className = 'footer';
  footerContainer.innerHTML = `
    <div class="footer-grid">
      <div class="footer-col footer-about" id="about">
        <h3>BookNest</h3>
        <p>BookNest is your ultimate destination for exploring, finding, and purchasing your favorite books across countless genres.</p>
        <div class="social-links">
          <a href="#"><i class="fab fa-facebook-f"></i></a>
          <a href="#"><i class="fab fa-twitter"></i></a>
          <a href="#"><i class="fab fa-instagram"></i></a>
          <a href="#"><i class="fab fa-github"></i></a>
        </div>
      </div>
      <div class="footer-col">
        <h3>Quick Links</h3>
        <ul>
          <li><a href="${prefix}index.html">Home</a></li>
          <li><a href="${prefix}books.html">Browse Books</a></li>
          <li><a href="${prefix}orders.html">Track Orders</a></li>
          <li><a href="${prefix}profile.html">My Account</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>Categories</h3>
        <ul>
          <li><a href="${prefix}books.html?category=Programming">Programming</a></li>
          <li><a href="${prefix}books.html?category=Fiction">Fiction</a></li>
          <li><a href="${prefix}books.html?category=Novels">Novels</a></li>
          <li><a href="${prefix}books.html?category=Business">Business</a></li>
        </ul>
      </div>
      <div class="footer-col" id="contact">
        <h3>Contact Info</h3>
        <ul>
          <li><i class="fas fa-map-marker-alt"></i> 123 Reading Street, Mumbai, India</li>
          <li><i class="fas fa-phone"></i> +91 77568 29319</li>
          <li><i class="fas fa-envelope"></i> support@booknest.com</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; ${new Date().getFullYear()} BookNest. All rights reserved.</p>
      <p>Designed with <i class="fas fa-heart" style="color: var(--accent);"></i> for Book Lovers</p>
    </div>
  `;
}

// Check if admin page is accessed by non-admin, redirect if so
function checkAdminAccess() {
  const prefix = getPrefix();
  if (!isAuthenticated()) {
    showToast('Please login as administrator', 'warning');
    setTimeout(() => {
      window.location.href = `${prefix}login.html`;
    }, 1500);
  } else if (!isAdmin()) {
    showToast('Access denied. Admin permissions required.', 'error');
    setTimeout(() => {
      window.location.href = `${prefix}index.html`;
    }, 1500);
  }
}

// Format rating stars
function getRatingStarsHTML(rating) {
  const fullStars = Math.floor(rating || 0);
  const halfStar = (rating || 0) % 1 >= 0.5 ? 1 : 0;
  const emptyStars = Math.max(0, 5 - fullStars - halfStar);
  
  let html = '';
  for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
  if (halfStar) html += '<i class="fas fa-star-half-alt"></i>';
  for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star"></i>';
  
  return html;
}

// Load fonts and FontAwesome on page load
document.addEventListener('DOMContentLoaded', () => {
  // Add FontAwesome dynamically
  if (!document.querySelector('link[href*="font-awesome"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(link);
  }

  // Initialize UI parts
  initNavbar();
  initFooter();
});
