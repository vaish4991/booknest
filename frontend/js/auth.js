document.addEventListener('DOMContentLoaded', () => {
  // --- LOGIN LOGIC ---
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';

        const data = await apiCall('/auth/login', 'POST', { email, password }, false);
        
        if (data.success) {
          setAuth(data.token, data.user);
          showToast(`Welcome back, ${data.user.name}!`, 'success');
          
          setTimeout(() => {
            if (data.user.role === 'admin') {
              window.location.href = '/admin/dashboard.html';
            } else {
              // Redirect back to referring page if applicable
              const referrer = document.referrer;
              if (referrer && (referrer.includes('cart.html') || referrer.includes('book-details.html'))) {
                window.location.href = referrer;
              } else {
                window.location.href = '/index.html';
              }
            }
          }, 1000);
        }
      } catch (error) {
        showToast(error.message || 'Login failed. Check credentials.', 'error');
      } finally {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Login';
        }
      }
    });
  }

  // --- REGISTER LOGIC ---
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const mobile = document.getElementById('reg-mobile').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;

      // Validations
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      if (mobile.length !== 10 || isNaN(mobile)) {
        showToast('Please enter a valid 10-digit mobile number', 'error');
        return;
      }

      try {
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';

        const data = await apiCall('/auth/register', 'POST', {
          name,
          email,
          mobile,
          password
        }, false);

        if (data.success) {
          setAuth(data.token, data.user);
          showToast('Registration successful! Welcome to BookNest.', 'success');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 1200);
        }
      } catch (error) {
        showToast(error.message || 'Registration failed. Try again.', 'error');
      } finally {
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Register';
        }
      }
    });
  }

  // --- FORGOT & RESET PASSWORD SIMULATION ---
  const forgotLink = document.getElementById('forgot-password-link');
  const forgotModal = document.getElementById('forgot-password-modal');
  const closeForgotModal = document.getElementById('close-forgot-modal');

  if (forgotLink && forgotModal && closeForgotModal) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      forgotModal.classList.add('show');
    });

    closeForgotModal.addEventListener('click', () => {
      forgotModal.classList.remove('show');
      resetForgotForms();
    });

    // Close on click outside
    window.addEventListener('click', (e) => {
      if (e.target === forgotModal) {
        forgotModal.classList.remove('show');
        resetForgotForms();
      }
    });
  }

  // Forgot Form Submit
  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');

  if (forgotForm && resetForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('forgot-email').value.trim();

      try {
        const data = await apiCall('/auth/forgot-password', 'POST', { email }, false);
        if (data.success) {
          showToast('Simulation: Token generated successfully', 'info');
          
          // Display the simulated token in the instruction form
          const tokenInput = document.getElementById('reset-token');
          if (tokenInput) {
            tokenInput.value = data.resetToken;
          }
          
          // Toggle forms
          forgotForm.style.display = 'none';
          resetForm.style.display = 'block';
        }
      } catch (error) {
        showToast(error.message || 'Error requesting reset token', 'error');
      }
    });
  }

  // Reset Form Submit
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('reset-token').value;
      const password = document.getElementById('reset-password').value;

      if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }

      try {
        const data = await apiCall('/auth/reset-password', 'POST', { token, password }, false);
        if (data.success) {
          showToast('Password reset successfully. You can now login.', 'success');
          forgotModal.classList.remove('show');
          resetForgotForms();
        }
      } catch (error) {
        showToast(error.message || 'Failed to reset password', 'error');
      }
    });
  }
});

function resetForgotForms() {
  const forgotForm = document.getElementById('forgot-form');
  const resetForm = document.getElementById('reset-form');
  if (forgotForm && resetForm) {
    forgotForm.reset();
    resetForm.reset();
    forgotForm.style.display = 'block';
    resetForm.style.display = 'none';
  }
}
