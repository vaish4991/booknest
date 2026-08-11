// API Base URL
const API_URL = '/api';

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

// API Call Wrapper
async function apiCall(endpoint, method = 'GET', body = null, requireAuth = true) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (requireAuth) {
    const token = getAuthToken();
    if (!token) {
      // Redirect to login if auth is strictly required
      window.location.href = '/login.html';
      throw new Error('Not authenticated');
    }
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Optional Auth: add token if available
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
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && requireAuth) {
        clearAuth();
        window.location.href = '/login.html';
      }
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Initialize Navigation Bar
function initNavbar() {
  const navContainer = document.getElementById('main-nav');
  if (!navContainer) return;

  const currentPath = window.location.pathname;
  const user = getAuthUser();
  const loggedIn = isAuthenticated();

  let authSection = '';
  if (loggedIn) {
    authSection = `
      <div class="nav-profile" id="nav-profile-trigger">
        <i class="fas fa-user-circle"></i>
        <span class="nav-profile-name">${user.name.split(' ')[0]}</span>
        <ul class="dropdown-menu" id="nav-profile-menu">
          <li><a href="/profile.html"><i class="fas fa-id-badge"></i> My Profile</a></li>
          <li><a href="/orders.html"><i class="fas fa-shopping-bag"></i> My Orders</a></li>
          ${user.role === 'admin' ? '<li><a href="/admin/dashboard.html"><i class="fas fa-lock"></i> Admin Panel</a></li>' : ''}
          <li><button id="logout-btn"><i class="fas fa-sign-out-alt"></i> Logout</button></li>
        </ul>
      </div>
    `;
  } else {
    authSection = `
      <a href="/login.html" class="auth-btn">Login / Register</a>
    `;
  }

  navContainer.innerHTML = `
    <div class="nav-container">
      <a href="/index.html" class="logo">
        <i class="fas fa-book-reader"></i> Book<span>Nest</span>
      </a>

      <button class="menu-toggle" id="menu-toggle">
        <i class="fas fa-bars"></i>
      </button>

      <ul class="nav-links" id="nav-links">
        <li><a href="/index.html" class="${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a></li>
        <li><a href="/books.html" class="${currentPath.endsWith('books.html') ? 'active' : ''}">Books</a></li>
        <li><a href="/index.html#categories" class="">Categories</a></li>
        <li><a href="/index.html#about" class="">About</a></li>
        <li><a href="/index.html#contact" class="">Contact</a></li>
      </ul>

      <div class="nav-search">
        <form id="nav-search-form">
          <i class="fas fa-search"></i>
          <input type="text" id="nav-search-input" placeholder="Search by title, author, ISBN..." value="${new URLSearchParams(window.location.search).get('search') || ''}">
        </form>
      </div>

      <div class="nav-actions">
        <a href="/cart.html" class="nav-btn">
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
        window.location.href = `/books.html?search=${encodeURIComponent(val)}`;
      } else {
        window.location.href = `/books.html`;
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
        window.location.href = '/index.html';
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
      const count = data.items.reduce((total, item) => total + item.quantity, 0);
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
          <li><a href="/index.html">Home</a></li>
          <li><a href="/books.html">Browse Books</a></li>
          <li><a href="/orders.html">Track Orders</a></li>
          <li><a href="/profile.html">My Account</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h3>Categories</h3>
        <ul>
          <li><a href="/books.html?category=Programming">Programming</a></li>
          <li><a href="/books.html?category=Fiction">Fiction</a></li>
          <li><a href="/books.html?category=Novels">Novels</a></li>
          <li><a href="/books.html?category=Business">Business</a></li>
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
  if (!isAuthenticated()) {
    showToast('Please login as administrator', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
  } else if (!isAdmin()) {
    showToast('Access denied. Admin permissions required.', 'error');
    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1500);
  }
}

// Format rating stars
function getRatingStarsHTML(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
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
