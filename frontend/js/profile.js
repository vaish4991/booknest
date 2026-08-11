let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!isAuthenticated()) {
    showToast('Please login to access profile', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
    return;
  }

  loadProfileData();

  // Edit Profile Form Submit
  const editProfileForm = document.getElementById('edit-profile-form');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', handleProfileUpdate);
  }

  // Change Password Form Submit
  const changePassForm = document.getElementById('change-password-form');
  if (changePassForm) {
    changePassForm.addEventListener('submit', handlePasswordChange);
  }

  // Address Modal Toggle
  const addAddrBtn = document.getElementById('btn-add-address');
  const addrModal = document.getElementById('address-modal');
  const closeAddrModal = document.getElementById('close-address-modal');

  if (addAddrBtn && addrModal && closeAddrModal) {
    addAddrBtn.addEventListener('click', () => {
      addrModal.classList.add('show');
    });

    closeAddrModal.addEventListener('click', () => {
      addrModal.classList.remove('show');
      document.getElementById('add-address-form').reset();
    });

    window.addEventListener('click', (e) => {
      if (e.target === addrModal) {
        addrModal.classList.remove('show');
        document.getElementById('add-address-form').reset();
      }
    });
  }

  // Add Address Form Submit
  const addAddrForm = document.getElementById('add-address-form');
  if (addAddrForm) {
    addAddrForm.addEventListener('submit', handleAddAddress);
  }
});

// Load profile data
async function loadProfileData() {
  try {
    const data = await apiCall('/auth/me', 'GET');
    if (data.success && data.user) {
      currentUser = data.user;
      
      // Update local storage just in case
      localStorage.setItem('booknest_user', JSON.stringify(currentUser));

      // Prefill Profile fields
      document.getElementById('aside-user-name').textContent = currentUser.name;
      document.getElementById('aside-user-email').textContent = currentUser.email;
      document.getElementById('profile-user-mobile').textContent = currentUser.mobile;
      document.getElementById('profile-name').value = currentUser.name;
      document.getElementById('profile-mobile').value = currentUser.mobile;

      // Render Addresses
      renderAddresses();
    }

    // Load total orders
    const ordersData = await apiCall('/orders', 'GET');
    if (ordersData.success) {
      document.getElementById('profile-total-orders').textContent = ordersData.count || 0;
    }

  } catch (error) {
    console.error('Error loading profile data:', error);
    showToast('Failed to load profile details', 'error');
  }
}

// Render addresses list
function renderAddresses() {
  const container = document.getElementById('addresses-list');
  if (!container) return;

  if (!currentUser.addresses || currentUser.addresses.length === 0) {
    container.innerHTML = `
      <p style="font-size:14px; color:var(--text-muted); text-align:center; padding:16px; border:1px dashed var(--border); border-radius:var(--radius-sm);">No saved addresses found.</p>
    `;
    return;
  }

  container.innerHTML = currentUser.addresses.map((addr, idx) => {
    const defaultBadge = addr.isDefault ? `<span class="status-badge delivered" style="font-size: 9px; padding: 2px 6px;">Default</span>` : '';
    const setDefButton = !addr.isDefault ? `<button class="btn-action toggle-active set-default-address" data-id="${addr._id}">Set Default</button>` : '';

    return `
      <div style="background-color: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; display: flex; justify-content: space-between; align-items: start; gap: 16px;">
        <div style="font-size: 14px;">
          <div style="font-weight: 600; margin-bottom: 4px; display:flex; align-items:center; gap:8px;">
            ${addr.fullName} ${defaultBadge}
          </div>
          <p style="color: var(--text-muted); margin-bottom: 2px;">${addr.addressLine}</p>
          <p style="color: var(--text-muted); margin-bottom: 4px;">${addr.city}, ${addr.state} - ${addr.pincode}</p>
          <p style="color: var(--text-muted);">Mobile: ${addr.mobile}</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
          <button class="btn-remove delete-address" data-id="${addr._id}" style="font-size: 13px; color:var(--danger);"><i class="far fa-trash-alt"></i> Delete</button>
          ${setDefButton}
        </div>
      </div>
    `;
  }).join('');

  attachAddressActions();
}

function attachAddressActions() {
  const container = document.getElementById('addresses-list');
  if (!container) return;

  // Delete address
  container.querySelectorAll('.delete-address').forEach(btn => {
    btn.addEventListener('click', async () => {
      const addrId = btn.getAttribute('data-id');
      const updatedAddresses = currentUser.addresses.filter(a => a._id !== addrId);
      
      await updateAddressesAPI(updatedAddresses, 'Address deleted successfully');
    });
  });

  // Set default address
  container.querySelectorAll('.set-default-address').forEach(btn => {
    btn.addEventListener('click', async () => {
      const addrId = btn.getAttribute('data-id');
      const updatedAddresses = currentUser.addresses.map(a => {
        a.isDefault = a._id === addrId;
        return a;
      });

      await updateAddressesAPI(updatedAddresses, 'Default address updated');
    });
  });
}

// API updates address list
async function updateAddressesAPI(addresses, successMsg) {
  try {
    const data = await apiCall('/auth/profile', 'PUT', { addresses });
    if (data.success) {
      showToast(successMsg, 'success');
      currentUser = data.user;
      renderAddresses();
    }
  } catch (error) {
    showToast(error.message || 'Failed to update addresses', 'error');
  }
}

// Edit Profile Form Submit
async function handleProfileUpdate(e) {
  e.preventDefault();
  const name = document.getElementById('profile-name').value.trim();
  const mobile = document.getElementById('profile-mobile').value.trim();

  if (mobile.length !== 10 || isNaN(mobile)) {
    showToast('Please enter a valid 10-digit mobile number', 'error');
    return;
  }

  const submitBtn = document.getElementById('edit-profile-form').querySelector('button[type="submit"]');

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const data = await apiCall('/auth/profile', 'PUT', { name, mobile });
    if (data.success) {
      showToast('Profile updated successfully', 'success');
      currentUser = data.user;
      document.getElementById('aside-user-name').textContent = currentUser.name;
      document.getElementById('profile-user-mobile').textContent = currentUser.mobile;
      initNavbar(); // Re-trigger navbar state
    }
  } catch (error) {
    showToast(error.message || 'Failed to update profile', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Changes';
  }
}

// Change Password
async function handlePasswordChange(e) {
  e.preventDefault();
  const oldPassword = document.getElementById('pass-old').value;
  const newPassword = document.getElementById('pass-new').value;
  const confirmPassword = document.getElementById('pass-confirm').value;

  if (newPassword !== confirmPassword) {
    showToast('New passwords do not match', 'error');
    return;
  }

  const submitBtn = document.getElementById('change-password-form').querySelector('button[type="submit"]');

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';

    const data = await apiCall('/auth/change-password', 'PUT', { oldPassword, newPassword });
    if (data.success) {
      showToast('Password updated successfully!', 'success');
      document.getElementById('change-password-form').reset();
    }
  } catch (error) {
    showToast(error.message || 'Failed to update password', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update Password';
  }
}

// Add Address
async function handleAddAddress(e) {
  e.preventDefault();
  const fullName = document.getElementById('addr-name').value.trim();
  const mobile = document.getElementById('addr-mobile').value.trim();
  const addressLine = document.getElementById('addr-line').value.trim();
  const city = document.getElementById('addr-city').value.trim();
  const state = document.getElementById('addr-state').value.trim();
  const pincode = document.getElementById('addr-pincode').value.trim();
  const isDefault = document.getElementById('addr-default').checked;

  if (mobile.length !== 10 || isNaN(mobile)) {
    showToast('Please enter a 10-digit mobile number', 'error');
    return;
  }
  if (pincode.length !== 6 || isNaN(pincode)) {
    showToast('Please enter a 6-digit pincode', 'error');
    return;
  }

  try {
    const newAddress = {
      fullName,
      mobile,
      addressLine,
      city,
      state,
      pincode,
      isDefault
    };

    // If setting default, toggle others
    let updatedAddresses = [...(currentUser.addresses || [])];
    if (isDefault) {
      updatedAddresses = updatedAddresses.map(a => {
        a.isDefault = false;
        return a;
      });
    }

    updatedAddresses.push(newAddress);
    
    const data = await apiCall('/auth/profile', 'PUT', { addresses: updatedAddresses });
    if (data.success) {
      showToast('Address added successfully', 'success');
      currentUser = data.user;
      renderAddresses();

      // Close modal
      document.getElementById('address-modal').classList.remove('show');
      document.getElementById('add-address-form').reset();
    }
  } catch (error) {
    showToast(error.message || 'Failed to add address', 'error');
  }
}
