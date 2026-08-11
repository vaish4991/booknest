let salesChart = null; // Global chart reference

document.addEventListener('DOMContentLoaded', () => {
  // Check admin rights
  checkAdminAccess();

  // Populate admin info
  const user = getAuthUser();
  const nameEl = document.getElementById('admin-name');
  if (user && nameEl) {
    nameEl.textContent = user.name;
  }

  // Detect current active admin page
  const path = window.location.pathname;

  if (path.includes('dashboard.html')) {
    initAdminDashboard();
  } else if (path.includes('books.html')) {
    initAdminBooks();
  } else if (path.includes('users.html')) {
    initAdminUsers();
  } else if (path.includes('orders.html')) {
    initAdminOrders();
  }
});

// ==========================================
// 1. ADMIN DASHBOARD PAGE
// ==========================================
async function initAdminDashboard() {
  const popularContainer = document.getElementById('popular-books-container');
  
  try {
    const data = await apiCall('/admin/dashboard', 'GET');
    if (data.success) {
      // 1. Render Stats
      const stats = data.stats;
      const statsHTML = `
        <div class="stat-card">
          <div class="stat-info">
            <h3>Total Revenue</h3>
            <p>₹${Math.round(stats.totalRevenue)}</p>
          </div>
          <div class="stat-icon"><i class="fas fa-indian-rupee-sign"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <h3>Total Orders</h3>
            <p>${stats.totalOrders}</p>
          </div>
          <div class="stat-icon"><i class="fas fa-shopping-bag"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <h3>Customers</h3>
            <p>${stats.totalUsers}</p>
          </div>
          <div class="stat-icon"><i class="fas fa-users"></i></div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <h3>Low Stock</h3>
            <p style="color:${stats.lowStockBooks > 0 ? 'var(--danger)' : 'inherit'};">${stats.lowStockBooks}</p>
          </div>
          <div class="stat-icon" style="color:var(--danger); background-color:rgba(239,68,68,0.1);"><i class="fas fa-exclamation-triangle"></i></div>
        </div>
      `;
      document.getElementById('stats-container').innerHTML = statsHTML;

      // 2. Render Popular Books
      if (data.popularBooks && data.popularBooks.length > 0) {
        popularContainer.innerHTML = data.popularBooks.map(book => `
          <div class="popular-book-item">
            <img src="${book.coverImage}" alt="${book.title}">
            <div class="popular-book-details">
              <div class="popular-book-title">${book.title}</div>
              <div class="popular-book-sales">Sales: ${book.salesCount} units</div>
            </div>
            <div style="font-weight:700; font-size:14px;">₹${book.price}</div>
          </div>
        `).join('');
      } else {
        popularContainer.innerHTML = '<p style="font-size:13px; color:var(--text-muted); text-align:center;">No sales data available</p>';
      }

      // 3. Render Chart
      renderDashboardChart(data.salesChart);
    }
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    showToast('Failed to load dashboard analytics', 'error');
  }
}

function renderDashboardChart(chartData) {
  const ctx = document.getElementById('salesChartCanvas');
  if (!ctx) return;

  const labels = chartData.map(item => {
    // Format date string to display short month name
    const d = new Date(item.date);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  });
  const revenues = chartData.map(item => item.revenue);
  const orders = chartData.map(item => item.orders);

  if (salesChart) {
    salesChart.destroy();
  }

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenue (₹)',
          data: revenues,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Orders Count',
          data: orders,
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { drawOnChartArea: true },
          title: { display: true, text: 'Revenue (₹)' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Orders Count' }
        }
      }
    }
  });
}

// ==========================================
// 2. ADMIN BOOKS CRUD PAGE
// ==========================================
let booksSearchVal = '';

function initAdminBooks() {
  loadAdminBooksTable();

  // Search input
  const searchInput = document.getElementById('admin-books-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      booksSearchVal = e.target.value.trim();
      loadAdminBooksTable();
    });
  }

  // Modal actions
  const addBtn = document.getElementById('btn-add-book');
  const bookModal = document.getElementById('book-modal');
  const closeBtn = document.getElementById('close-book-modal');

  if (addBtn && bookModal && closeBtn) {
    addBtn.addEventListener('click', () => {
      document.getElementById('book-modal-title').textContent = 'Add New Book';
      document.getElementById('book-form-id').value = '';
      document.getElementById('book-form').reset();
      
      bookModal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
      bookModal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
      if (e.target === bookModal) bookModal.classList.remove('show');
    });
  }

  // Save/Create Book Form
  const form = document.getElementById('book-form');
  if (form) {
    form.addEventListener('submit', handleSaveBook);
  }
}

async function loadAdminBooksTable() {
  const tbody = document.getElementById('admin-books-table-body');
  if (!tbody) return;

  try {
    const params = new URLSearchParams({ limit: 100 }); // Retrieve all books for easy CRUD
    if (booksSearchVal) params.append('search', booksSearchVal);

    const data = await apiCall(`/books?${params.toString()}`, 'GET', null, false);
    if (data.success) {
      if (data.books && data.books.length > 0) {
        tbody.innerHTML = data.books.map(book => {
          const finalPrice = Math.round(book.price * (1 - book.discount / 100));
          
          let stockLabel = '';
          if (book.stock === 0) {
            stockLabel = `<span class="status-badge cancelled">Out of Stock</span>`;
          } else if (book.stock <= 5) {
            stockLabel = `<span class="status-badge pending">Low Stock (${book.stock})</span>`;
          } else {
            stockLabel = `<span class="status-badge delivered">In Stock (${book.stock})</span>`;
          }

          return `
            <tr>
              <td><img src="${book.coverImage}" alt="${book.title}" style="width:36px; aspect-ratio:2/3; object-fit:cover; border-radius:var(--radius-sm);"></td>
              <td>
                <div style="font-weight:700; color:var(--secondary);">${book.title}</div>
                <div style="font-size:12px; color:var(--text-muted);">by ${book.author}</div>
              </td>
              <td>${book.category}</td>
              <td>
                <div style="font-weight:600;">₹${finalPrice}</div>
                ${book.discount > 0 ? `<div style="font-size:11px; text-decoration:line-through; color:var(--text-muted);">₹${book.price} (-${book.discount}%)</div>` : ''}
              </td>
              <td>${stockLabel}</td>
              <td>
                <div class="table-actions">
                  <button class="btn-action edit edit-book-trigger" data-id="${book._id}"><i class="fas fa-edit"></i> Edit</button>
                  <button class="btn-action delete delete-book-trigger" data-id="${book._id}"><i class="far fa-trash-alt"></i> Delete</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        attachAdminBooksActions();
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
              <i class="fas fa-search-minus" style="font-size:24px;"></i>
              <p style="margin-top:10px;">No books found matching search.</p>
            </td>
          </tr>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading admin books:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--danger);">
          <i class="fas fa-exclamation-triangle" style="font-size:24px;"></i>
          <p style="margin-top:10px;">Failed to load book inventory.</p>
        </td>
      </tr>
    `;
  }
}

function attachAdminBooksActions() {
  // Edit Trigger
  document.querySelectorAll('.edit-book-trigger').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        const data = await apiCall(`/books/${id}`, 'GET', null, false);
        if (data.success && data.book) {
          const book = data.book;
          
          document.getElementById('book-modal-title').textContent = 'Edit Book Details';
          document.getElementById('book-form-id').value = book._id;
          document.getElementById('book-form-title').value = book.title;
          document.getElementById('book-form-author').value = book.author;
          document.getElementById('book-form-publisher').value = book.publisher;
          document.getElementById('book-form-isbn').value = book.isbn;
          document.getElementById('book-form-category').value = book.category;
          document.getElementById('book-form-price').value = book.price;
          document.getElementById('book-form-discount').value = book.discount;
          document.getElementById('book-form-stock').value = book.stock;
          document.getElementById('book-form-cover').value = book.coverImage;
          document.getElementById('book-form-description').value = book.description;

          document.getElementById('book-modal').classList.add('show');
        }
      } catch (error) {
        showToast('Failed to retrieve book details', 'error');
      }
    });
  });

  // Delete Trigger
  document.querySelectorAll('.delete-book-trigger').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this book permanently? This action cannot be undone.')) {
        try {
          const data = await apiCall(`/books/${id}`, 'DELETE');
          if (data.success) {
            showToast('Book deleted successfully', 'success');
            loadAdminBooksTable();
          }
        } catch (error) {
          showToast(error.message || 'Failed to delete book', 'error');
        }
      }
    });
  });
}

// Handle Add/Edit Form Save
async function handleSaveBook(e) {
  e.preventDefault();

  const id = document.getElementById('book-form-id').value;
  const title = document.getElementById('book-form-title').value.trim();
  const author = document.getElementById('book-form-author').value.trim();
  const publisher = document.getElementById('book-form-publisher').value.trim();
  const isbn = document.getElementById('book-form-isbn').value.trim();
  const category = document.getElementById('book-form-category').value;
  const price = Number(document.getElementById('book-form-price').value);
  const discount = Number(document.getElementById('book-form-discount').value);
  const stock = Number(document.getElementById('book-form-stock').value);
  const coverImage = document.getElementById('book-form-cover').value.trim();
  const description = document.getElementById('book-form-description').value.trim();

  const body = { title, author, publisher, isbn, category, price, discount, stock, coverImage, description };
  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/books/${id}` : '/books';

  const submitBtn = document.getElementById('book-form-submit-btn');

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving details...';

    const data = await apiCall(endpoint, method, body);
    if (data.success) {
      showToast(id ? 'Book updated successfully' : 'Book added successfully', 'success');
      document.getElementById('book-modal').classList.remove('show');
      loadAdminBooksTable();
    }
  } catch (error) {
    showToast(error.message || 'Failed to save book', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Book';
  }
}

// ==========================================
// 3. ADMIN USERS PAGE
// ==========================================
let usersSearchVal = '';

function initAdminUsers() {
  loadAdminUsersTable();

  const searchInput = document.getElementById('admin-users-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      usersSearchVal = e.target.value.trim();
      loadAdminUsersTable();
    });
  }
}

async function loadAdminUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  try {
    const endpoint = usersSearchVal ? `/admin/users?search=${encodeURIComponent(usersSearchVal)}` : '/admin/users';
    const data = await apiCall(endpoint, 'GET');

    if (data.success) {
      if (data.users && data.users.length > 0) {
        tbody.innerHTML = data.users.map(user => {
          const dateStr = new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          const roleBadge = user.role === 'admin' ? '<span class="status-badge processing">Admin</span>' : '<span class="status-badge confirmed">Customer</span>';
          
          let statusBadge = '';
          if (user.isActive) {
            statusBadge = `<span class="status-badge delivered">Active</span>`;
          } else {
            statusBadge = `<span class="status-badge cancelled">Disabled</span>`;
          }

          const loggedInUser = getAuthUser();
          const isSelf = loggedInUser && loggedInUser.id === user._id;
          
          // Disable status/role toggle for self
          const roleSelectHTML = `
            <select class="user-role-select" data-id="${user._id}" ${isSelf ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''} style="padding: 4px; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px;">
              <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
              <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          `;

          const toggleStatusBtn = `
            <button class="btn-action ${user.isActive ? 'delete' : 'toggle-active'} user-status-toggle" data-id="${user._id}" data-active="${user.isActive}" ${isSelf ? 'disabled style="opacity:0.6; cursor:not-allowed;"' : ''}>
              ${user.isActive ? '<i class="fas fa-ban"></i> Disable' : '<i class="fas fa-check-circle"></i> Enable'}
            </button>
          `;

          return `
            <tr>
              <td style="font-family:monospace; font-size:12px;">${dateStr}</td>
              <td style="font-weight:600; color:var(--secondary);">${user.name} ${isSelf ? ' (You)' : ''}</td>
              <td>${user.email}</td>
              <td>${user.mobile}</td>
              <td>${roleBadge}</td>
              <td>${statusBadge}</td>
              <td>
                <div style="display:flex; align-items:center; gap:12px;">
                  ${roleSelectHTML}
                  ${toggleStatusBtn}
                </div>
              </td>
            </tr>
          `;
        }).join('');

        attachAdminUsersActions();
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
              <i class="fas fa-user-slash" style="font-size:24px;"></i>
              <p style="margin-top:10px;">No users found matching search.</p>
            </td>
          </tr>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading admin users:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--danger);">
          <i class="fas fa-exclamation-triangle" style="font-size:24px;"></i>
          <p style="margin-top:10px;">Failed to load user records.</p>
        </td>
      </tr>
    `;
  }
}

function attachAdminUsersActions() {
  // Role selector
  document.querySelectorAll('.user-role-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = select.getAttribute('data-id');
      const role = e.target.value;

      try {
        const data = await apiCall(`/admin/users/${id}/role`, 'PUT', { role });
        if (data.success) {
          showToast('User role updated successfully', 'success');
          loadAdminUsersTable();
        }
      } catch (error) {
        showToast(error.message || 'Failed to update user role', 'error');
        loadAdminUsersTable(); // Revert selection UI
      }
    });
  });

  // Toggle active status
  document.querySelectorAll('.user-status-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const isCurrentActive = btn.getAttribute('data-active') === 'true';
      const targetActive = !isCurrentActive;

      if (confirm(`Are you sure you want to ${targetActive ? 'enable' : 'disable'} this account?`)) {
        try {
          const data = await apiCall(`/admin/users/${id}/status`, 'PUT', { isActive: targetActive });
          if (data.success) {
            showToast(data.message, 'success');
            loadAdminUsersTable();
          }
        } catch (error) {
          showToast(error.message || 'Failed to change user status', 'error');
        }
      }
    });
  });
}

// ==========================================
// 4. ADMIN ORDERS PAGE
// ==========================================
let ordersSearchVal = '';
let ordersStatusVal = '';

function initAdminOrders() {
  loadAdminOrdersTable();

  // Search input
  const searchInput = document.getElementById('admin-orders-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      ordersSearchVal = e.target.value.trim();
      loadAdminOrdersTable();
    });
  }

  // Status Filter
  const statusFilter = document.getElementById('admin-orders-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      ordersStatusVal = e.target.value;
      loadAdminOrdersTable();
    });
  }
}

async function loadAdminOrdersTable() {
  const tbody = document.getElementById('admin-orders-table-body');
  if (!tbody) return;

  try {
    const params = new URLSearchParams();
    if (ordersSearchVal) params.append('search', ordersSearchVal);
    if (ordersStatusVal) params.append('status', ordersStatusVal);

    const data = await apiCall(`/admin/orders?${params.toString()}`, 'GET');
    if (data.success) {
      if (data.orders && data.orders.length > 0) {
        tbody.innerHTML = data.orders.map(order => {
          const dateStr = new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
          const itemsPreview = order.items.map(item => `${item.title} (x${item.quantity})`).join(', ');
          const status = order.orderStatus;
          
          const statusOptions = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

          const statusSelectHTML = `
            <select class="order-status-change" data-id="${order._id}" style="padding: 4px; border:1px solid var(--border); border-radius:var(--radius-sm); font-size:12px;">
              ${statusOptions.map(opt => `<option value="${opt}" ${status === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          `;

          return `
            <tr>
              <td style="font-family:monospace; font-size:12px;">${dateStr}</td>
              <td style="font-family:monospace; font-size:12px; font-weight:700; color:var(--primary);">${order._id}</td>
              <td>
                <div style="font-weight:600; color:var(--secondary);">${order.userId.name}</div>
                <div style="font-size:12px; color:var(--text-muted);">${order.userId.email}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Items: ${itemsPreview}</div>
              </td>
              <td style="font-weight:700;">₹${Math.round(order.totalAmount)}</td>
              <td>${order.paymentMethod} (${order.paymentStatus})</td>
              <td>
                <span class="status-badge ${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span>
              </td>
              <td>
                ${statusSelectHTML}
              </td>
            </tr>
          `;
        }).join('');

        attachAdminOrdersActions();
      } else {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
              <i class="fas fa-box-open" style="font-size:24px;"></i>
              <p style="margin-top:10px;">No orders found matching search criteria.</p>
            </td>
          </tr>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading admin orders:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--danger);">
          <i class="fas fa-exclamation-triangle" style="font-size:24px;"></i>
          <p style="margin-top:10px;">Failed to load order queue records.</p>
        </td>
      </tr>
    `;
  }
}

function attachAdminOrdersActions() {
  document.querySelectorAll('.order-status-change').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = select.getAttribute('data-id');
      const orderStatus = e.target.value;

      try {
        const data = await apiCall(`/admin/orders/${id}/status`, 'PUT', { orderStatus });
        if (data.success) {
          showToast('Order status updated successfully', 'success');
          loadAdminOrdersTable();
        }
      } catch (error) {
        showToast(error.message || 'Failed to update order status', 'error');
        loadAdminOrdersTable();
      }
    });
  });
}
