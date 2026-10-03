/**
 * ThreadCo - Checkout Controller (checkout.html)
 * Form validation (10-digit Indian phone, 6-digit PIN), Indian address fields,
 * live order summary, extensible coupon discounts, and Indian Payment Gateway integration architecture.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./products.js', './storage.js', './cart.js', './ui.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./products.js'),
      require('./storage.js'),
      require('./cart.js'),
      require('./ui.js')
    );
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo, root.ThreadCo, root.ThreadCo, root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (productsModule, storageModule, cartModule, uiModule) {
  'use strict';

  const formatPrice = productsModule && productsModule.formatPrice
    ? productsModule.formatPrice
    : (n) => `₹${n}`;

  const storage = storageModule || {
    saveLastOrder: () => {}
  };

  const cart = cartModule || {
    getCartLines: () => [],
    getCartTotals: () => ({ subtotal: 0, grandTotal: 0, totalUnits: 0 }),
    clearCart: () => {},
    applyCoupon: () => ({ success: false }),
    removeCoupon: () => {}
  };

  const ui = uiModule || {
    showToast: () => {}
  };

  /**
   * Indian Payment Gateway Integration Architecture
   * In production, the browser requests order creation from a secure backend.
   * The backend validates prices, stock, and coupons server-side, creates the order with
   * Razorpay/Cashfree/PayU, and returns an order_id. The frontend then opens the gateway.
   */
  const PaymentProvider = {
    // 1. Create order on backend (mock interface)
    async createOrder(orderPayload) {
      console.log('[ThreadCo Payment Architecture] Requesting order creation from backend:', orderPayload);
      // Production: const res = await fetch('/api/orders/create', { method: 'POST', body: JSON.stringify(orderPayload) });
      return {
        success: true,
        gatewayOrderId: 'order_demo_' + Math.random().toString(36).substring(7),
        amount: orderPayload.totals.grandTotal
      };
    },

    // 2. Verify signature on backend (mock interface)
    async verifyPayment(paymentResponse) {
      console.log('[ThreadCo Payment Architecture] Verifying payment signature on backend:', paymentResponse);
      // Production: const res = await fetch('/api/orders/verify', { method: 'POST', body: JSON.stringify(paymentResponse) });
      return { success: true, verified: true };
    }
  };

  function initCheckout() {
    const checkoutContainer = document.getElementById('tc-checkout-container');
    if (!checkoutContainer) return; // Not on checkout page

    const totals = cart.getCartTotals();
    const lines = cart.getCartLines();

    // 1. Check for empty cart
    if (lines.length === 0) {
      renderEmptyCheckout(checkoutContainer);
      return;
    }

    // 2. Render Order Summary
    renderOrderSummary();

    // 3. Setup Coupon Form
    setupCouponHandling();

    // 4. Setup Form Validation & Submission
    setupCheckoutForm();
  }

  function renderEmptyCheckout(container) {
    container.innerHTML = `
      <div class="tc-checkout-empty">
        <div class="tc-empty-icon">🛒</div>
        <h2>Your Cart is Empty</h2>
        <p>You need items in your cart to proceed with checkout.</p>
        <a href="Product.html" class="tc-btn tc-btn-primary">Browse Catalogue</a>
      </div>
    `;
  }

  function renderOrderSummary() {
    const linesContainer = document.getElementById('tc-summary-items');
    const subtotalEl = document.getElementById('tc-summary-subtotal');
    const shippingEl = document.getElementById('tc-summary-shipping');
    const discountRow = document.getElementById('tc-summary-discount-row');
    const discountEl = document.getElementById('tc-summary-discount');
    const totalEl = document.getElementById('tc-summary-total');

    if (!linesContainer) return;

    const lines = cart.getCartLines();
    const totals = cart.getCartTotals();

    linesContainer.innerHTML = '';
    lines.forEach((line) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'tc-summary-item-line';

      const thumb = document.createElement('img');
      thumb.src = line.product.image;
      thumb.alt = line.product.name;
      thumb.className = 'tc-summary-thumb';

      const info = document.createElement('div');
      info.className = 'tc-summary-info';
      info.innerHTML = `
        <span class="tc-summary-name">${line.product.name}</span>
        <span class="tc-summary-variant">${line.size ? `Size: ${line.size}` : ''} &bull; Qty: ${line.quantity}</span>
      `;

      const price = document.createElement('strong');
      price.className = 'tc-summary-item-total';
      price.textContent = formatPrice(line.lineTotal);

      itemEl.appendChild(thumb);
      itemEl.appendChild(info);
      itemEl.appendChild(price);
      linesContainer.appendChild(itemEl);
    });

    if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
    if (shippingEl) {
      if (totals.shipping === 0) {
        shippingEl.innerHTML = '<span class="tc-free-tag">FREE</span>';
      } else {
        shippingEl.textContent = formatPrice(totals.shipping);
      }
    }

    if (discountRow && discountEl) {
      if (totals.discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = `-${formatPrice(totals.discount)}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalEl) totalEl.textContent = formatPrice(totals.grandTotal);
  }

  function setupCouponHandling() {
    const applyBtn = document.getElementById('tc-coupon-apply-btn');
    const input = document.getElementById('tc-coupon-input');
    const feedback = document.getElementById('tc-coupon-feedback');

    if (!applyBtn || !input) return;

    const totals = cart.getCartTotals();
    if (totals.appliedCoupon) {
      input.value = totals.appliedCoupon.code;
      if (feedback) {
        feedback.className = 'tc-coupon-feedback tc-success';
        feedback.innerHTML = `Coupon <strong>${totals.appliedCoupon.code}</strong> applied! <button type="button" id="tc-remove-coupon-btn" class="tc-link-btn">Remove</button>`;
        const rmBtn = document.getElementById('tc-remove-coupon-btn');
        if (rmBtn) {
          rmBtn.onclick = () => {
            cart.removeCoupon();
            input.value = '';
            feedback.textContent = '';
            renderOrderSummary();
            ui.showToast('Coupon removed', 'info');
          };
        }
      }
    }

    applyBtn.onclick = () => {
      const code = input.value.trim();
      if (!code) {
        if (feedback) {
          feedback.className = 'tc-coupon-feedback tc-error';
          feedback.textContent = 'Please enter a coupon code.';
        }
        return;
      }

      const res = cart.applyCoupon(code);
      if (res.success) {
        if (feedback) {
          feedback.className = 'tc-coupon-feedback tc-success';
          feedback.innerHTML = `Coupon <strong>${code}</strong> applied! <button type="button" id="tc-remove-coupon-btn" class="tc-link-btn">Remove</button>`;
          const rmBtn = document.getElementById('tc-remove-coupon-btn');
          if (rmBtn) {
            rmBtn.onclick = () => {
              cart.removeCoupon();
              input.value = '';
              feedback.textContent = '';
              renderOrderSummary();
              ui.showToast('Coupon removed', 'info');
            };
          }
        }
        renderOrderSummary();
        ui.showToast(res.message, 'success');
      } else {
        if (feedback) {
          feedback.className = 'tc-coupon-feedback tc-error';
          feedback.textContent = res.message;
        }
        ui.showToast(res.message, 'error');
      }
    };
  }

  function setupCheckoutForm() {
    const form = document.getElementById('tc-checkout-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!validateCheckoutForm()) return;

      const submitBtn = document.getElementById('tc-place-order-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing Order...';
      }

      const paymentMethodRadio = document.querySelector('input[name="payment_method"]:checked');
      const paymentMethod = paymentMethodRadio ? paymentMethodRadio.value : 'cod';

      const customer = {
        name: document.getElementById('customer_name').value.trim(),
        email: document.getElementById('customer_email').value.trim(),
        phone: document.getElementById('customer_phone').value.trim()
      };

      const shippingAddress = {
        house: document.getElementById('address_house').value.trim(),
        street: document.getElementById('address_street').value.trim(),
        city: document.getElementById('address_city').value.trim(),
        state: document.getElementById('address_state').value.trim(),
        pincode: document.getElementById('address_pincode').value.trim(),
        country: 'India'
      };

      const orderNotes = (document.getElementById('order_notes')?.value || '').trim();

      const lines = cart.getCartLines();
      const totals = cart.getCartTotals();

      const orderId = `TC-ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const orderPayload = {
        orderId,
        date: new Date().toISOString(),
        customer,
        shippingAddress,
        notes: orderNotes,
        items: lines.map((l) => ({
          productId: l.productId,
          name: l.product.name,
          image: l.product.image,
          price: l.product.price,
          quantity: l.quantity,
          size: l.size,
          lineTotal: l.lineTotal
        })),
        totals,
        paymentMethod: paymentMethod === 'online' ? 'Online Payment (Demo Simulation)' : 'Cash on Delivery',
        paymentStatus: paymentMethod === 'online' ? 'Verified (Demo)' : 'Pending (Cash on Delivery)',
        estimatedDelivery: '3 — 5 business days'
      };

      try {
        if (paymentMethod === 'online') {
          // Simulate online payment verification flow
          await PaymentProvider.createOrder(orderPayload);
          await PaymentProvider.verifyPayment({ mockGatewayId: 'demo_success' });
        }

        // Save order to storage
        storage.saveLastOrder(orderPayload);

        // Clear cart
        cart.clearCart();

        // Redirect to order success page
        window.location.href = `order-success.html?orderId=${encodeURIComponent(orderId)}`;
      } catch (err) {
        console.error('[ThreadCo Checkout Error]:', err);
        ui.showToast('Failed to place order. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Place Order';
        }
      }
    });
  }

  function validateCheckoutForm() {
    let isValid = true;

    function checkField(id, errorId, validator, errorMsg) {
      const field = document.getElementById(id);
      const errEl = document.getElementById(errorId);
      if (!field || !errEl) return;

      const val = field.value.trim();
      if (!validator(val)) {
        errEl.textContent = errorMsg;
        errEl.style.display = 'block';
        field.classList.add('tc-input-error');
        isValid = false;
      } else {
        errEl.style.display = 'none';
        field.classList.remove('tc-input-error');
      }
    }

    // Name
    checkField(
      'customer_name',
      'error_customer_name',
      (v) => v.length >= 2,
      'Please enter your full name.'
    );

    // Email
    checkField(
      'customer_email',
      'error_customer_email',
      (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'Please enter a valid email address.'
    );

    // Phone: 10-digit Indian mobile number
    checkField(
      'customer_phone',
      'error_customer_phone',
      (v) => /^[6-9]\d{9}$/.test(v.replace(/\s+/g, '')),
      'Please enter a valid 10-digit Indian mobile number.'
    );

    // Address: House / Flat
    checkField(
      'address_house',
      'error_address_house',
      (v) => v.length >= 2,
      'House / Flat / Building is required.'
    );

    // Address: Street / Locality
    checkField(
      'address_street',
      'error_address_street',
      (v) => v.length >= 3,
      'Street / Locality is required.'
    );

    // City
    checkField(
      'address_city',
      'error_address_city',
      (v) => v.length >= 2,
      'City is required.'
    );

    // State
    checkField(
      'address_state',
      'error_address_state',
      (v) => v && v !== '--Select State--',
      'Please select your state.'
    );

    // Pincode: 6 digits
    checkField(
      'address_pincode',
      'error_address_pincode',
      (v) => /^\d{6}$/.test(v.trim()),
      'Please enter a valid 6-digit Indian PIN code.'
    );

    if (!isValid) {
      ui.showToast('Please correct the highlighted errors before continuing.', 'error');
    }

    return isValid;
  }

  return {
    initCheckout,
    PaymentProvider
  };
});
