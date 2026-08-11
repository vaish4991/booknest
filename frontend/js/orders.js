document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    showToast('Please login to view orders', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
    return;
  }

  loadUserOrders();
});

// Load user orders
async function loadUserOrders() {
  const loader = document.getElementById('orders-loader');
  const container = document.getElementById('orders-list-wrapper');
  const emptyView = document.getElementById('orders-empty-view');

  try {
    const data = await apiCall('/orders', 'GET');
    if (data.success) {
      const orders = data.orders;

      if (orders.length > 0) {
        if (loader) loader.style.display = 'none';
        if (emptyView) emptyView.style.display = 'none';
        
        container.innerHTML = orders.map(order => renderOrderCard(order)).join('');
      } else {
        if (loader) loader.style.display = 'none';
        if (container) container.innerHTML = '';
        if (emptyView) emptyView.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    showToast('Failed to load orders', 'error');
    if (loader) {
      loader.innerHTML = `
        <div class="empty-state" style="border: none; box-shadow: none;">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Failed to load orders</h3>
          <p>${error.message || 'There was a connection issue.'}</p>
        </div>
      `;
    }
  }
}

// Render Order Card with Tracking Timeline
function renderOrderCard(order) {
  const dateStr = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const status = order.orderStatus;
  
  // Status mapping to timeline steps
  const statuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
  const statusIndex = statuses.indexOf(status);

  let timelineHTML = '';
  
  if (status === 'Cancelled') {
    timelineHTML = `
      <div style="background-color:#fee2e2; border:1px solid #fecaca; border-radius:var(--radius-sm); padding:12px; margin-top:20px; display:flex; align-items:center; gap:10px; color:#b91c1c; font-size:14px;">
        <i class="fas fa-times-circle" style="font-size:18px;"></i>
        <span>This order was cancelled. Please contact customer support if you have questions.</span>
      </div>
    `;
  } else {
    // Generate timeline steps
    timelineHTML = `
      <div class="order-timeline">
        ${statuses.map((step, idx) => {
          let stepClass = '';
          let icon = '<i class="fas fa-circle"></i>';

          if (idx < statusIndex) {
            stepClass = 'completed';
            icon = '<i class="fas fa-check"></i>';
          } else if (idx === statusIndex) {
            stepClass = 'active';
            icon = '<i class="fas fa-spinner fa-spin"></i>';
            if (status === 'Delivered') icon = '<i class="fas fa-check"></i>';
          }

          return `
            <div class="timeline-step ${stepClass}">
              <div class="timeline-dot">${icon}</div>
              <div class="timeline-label">${step}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // Items lists
  const itemsHTML = order.items.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed var(--border); font-size:14px;">
      <span style="max-width:80%; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
        <strong>${item.title}</strong> <span style="color:var(--text-muted);">x ${item.quantity}</span>
      </span>
      <span style="font-weight:600;">₹${Math.round(item.price * (1 - item.discount/100)) * item.quantity}</span>
    </div>
  `).join('');

  return `
    <div class="order-card">
      <div class="order-header">
        <div class="order-info">
          <h3>Order ID: <span style="font-family:monospace; color:var(--primary);">${order._id}</span></h3>
          <p>Ordered on: ${dateStr}</p>
          <p>Payment: ${order.paymentMethod === 'Online' ? 'Online Payment' : 'Cash on Delivery (COD)'} (${order.paymentStatus})</p>
        </div>
        <div class="order-total-status">
          <div style="font-size: 18px; font-weight: 800; color: var(--secondary); margin-bottom: 8px;">₹${Math.round(order.totalAmount)}</div>
          <span class="status-badge ${status.toLowerCase().replace(/\s+/g, '-')}">${status}</span>
        </div>
      </div>

      <div style="margin-top:16px;">
        <h4 style="font-size:13px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Items Ordered</h4>
        <div style="border:1px solid var(--border); border-radius:var(--radius-sm); padding:0 16px;">
          ${itemsHTML}
        </div>
      </div>

      <div style="margin-top:16px; font-size:13px; color:var(--text-muted);">
        <p><strong>Shipping Address:</strong> ${order.shippingAddress.fullName}, ${order.shippingAddress.addressLine}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode} (Mobile: ${order.shippingAddress.mobile})</p>
      </div>

      ${timelineHTML}
    </div>
  `;
}
