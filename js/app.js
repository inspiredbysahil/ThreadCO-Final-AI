/**
 * ThreadCo - Main Application Entrypoint
 * Coordinates modules, page-specific lifecycles, and global UI systems.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([
      './products.js',
      './storage.js',
      './cart.js',
      './ui.js',
      './catalog.js',
      './product-page.js',
      './checkout.js',
      './forms.js'
    ], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./products.js'),
      require('./storage.js'),
      require('./cart.js'),
      require('./ui.js'),
      require('./catalog.js'),
      require('./product-page.js'),
      require('./checkout.js'),
      require('./forms.js')
    );
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(
      root.ThreadCo,
      factory(
        root.ThreadCo,
        root.ThreadCo,
        root.ThreadCo,
        root.ThreadCo,
        root.ThreadCo,
        root.ThreadCo,
        root.ThreadCo,
        root.ThreadCo
      )
    );
  }
})(typeof self !== 'undefined' ? self : this, function (
  productsModule,
  storageModule,
  cartModule,
  uiModule,
  catalogModule,
  productPageModule,
  checkoutModule,
  formsModule
) {
  'use strict';

  function initApp() {
    console.log('[ThreadCo] Initializing frontend application...');

    // 1. Initialize Global UI Services
    if (uiModule) {
      if (typeof uiModule.initCartDrawer === 'function') uiModule.initCartDrawer();
      if (typeof uiModule.syncHeaderCartBadge === 'function') uiModule.syncHeaderCartBadge();
      if (typeof uiModule.initWishlistDelegation === 'function') uiModule.initWishlistDelegation();
      if (typeof uiModule.initMobileNav === 'function') uiModule.initMobileNav();
      if (typeof uiModule.updateDynamicYear === 'function') uiModule.updateDynamicYear();
    }

    // 2. Bind Home Page "This Week's Drop" cards if on index.html
    initHomePageCards();

    // 3. Page Specific Initializations
    if (document.getElementById('grid') && catalogModule && typeof catalogModule.initCatalog === 'function') {
      catalogModule.initCatalog();
    }

    if (document.getElementById('product-detail') && productPageModule && typeof productPageModule.initProductPage === 'function') {
      productPageModule.initProductPage();
    }

    if (document.getElementById('tc-checkout-container') && checkoutModule && typeof checkoutModule.initCheckout === 'function') {
      checkoutModule.initCheckout();
    }

    if (document.getElementById('tc-cart-page-container')) {
      initDedicatedCartPage();
    }

    if (formsModule && typeof formsModule.initForms === 'function') {
      formsModule.initForms();
    }

    // 4. Ensure no dead href="" or href="#" links remain
    sanitizeAnchorLinks();
  }

  /**
   * Binds home page cards with verified product IDs and real quick-add
   */
  function initHomePageCards() {
    const weekDropSection = document.getElementById('weekdrop');
    if (!weekDropSection) return;

    const cardArticles = weekDropSection.querySelectorAll('.cards article');
    const products = productsModule ? productsModule.getAllProducts() : [];

    cardArticles.forEach((article, index) => {
      const product = products[index];
      if (!product) return;

      article.setAttribute('data-product-id', product.id);

      // Ensure Wishlist toggle exists
      if (!article.querySelector('.tc-wishlist-toggle')) {
        const figure = article.querySelector('figure');
        if (figure) {
          const isWish = storageModule ? storageModule.isWishlisted(product.id) : false;
          const wishBtn = document.createElement('button');
          wishBtn.type = 'button';
          wishBtn.className = `tc-wishlist-toggle ${isWish ? 'is-active' : ''}`;
          wishBtn.setAttribute('data-action', 'toggle-wishlist');
          wishBtn.setAttribute('data-product-id', product.id);
          wishBtn.setAttribute('aria-label', `Save ${product.name} to wishlist`);
          wishBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          `;
          figure.appendChild(wishBtn);
        }
      }

      // Fix "View Details" link
      const viewLink = article.querySelector('a');
      if (viewLink) {
        viewLink.href = `Product detail.html?id=${encodeURIComponent(product.id)}`;
      }

      // Fix "Add to Cart" button
      const addBtn = article.querySelector('button');
      if (addBtn) {
        addBtn.type = 'button';
        addBtn.setAttribute('data-action', 'quick-add');
        addBtn.setAttribute('data-product-id', product.id);
        addBtn.onclick = (e) => {
          e.preventDefault();
          if (uiModule && typeof uiModule.openQuickAddModal === 'function') {
            uiModule.openQuickAddModal(product.id);
          }
        };
      }
    });
  }

  /**
   * Dedicated Cart Page (cart.html) Controller
   */
  function initDedicatedCartPage() {
    const container = document.getElementById('tc-cart-page-container');
    if (!container) return;

    function renderCartPage() {
      const lines = cartModule.getCartLines();
      const totals = cartModule.getCartTotals();
      const formatPrice = productsModule.formatPrice;

      if (lines.length === 0) {
        container.innerHTML = `
          <div class="tc-cart-empty-page">
            <div class="tc-empty-icon">🛒</div>
            <h2>Your Cart is Currently Empty</h2>
            <p>Looks like you haven't added any streetwear pieces yet.</p>
            <a href="Product.html" class="tc-btn tc-btn-primary">Explore Drops</a>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="tc-cart-page-layout">
          <div class="tc-cart-page-left">
            <div class="tc-cart-page-header">
              <h2>Shopping Bag (${totals.totalUnits} ${totals.totalUnits === 1 ? 'item' : 'items'})</h2>
              <button type="button" id="tc-page-clear-cart" class="tc-link-btn tc-clear-all-btn">Clear All</button>
            </div>

            <div class="tc-shipping-meter tc-page-shipping-meter">
              <p class="tc-shipping-text">
                ${
                  totals.isFreeShipping
                    ? '<strong>🎉 You have unlocked FREE Delivery!</strong>'
                    : `Add <strong>${formatPrice(totals.freeShippingRemaining)}</strong> more to get <strong>FREE Delivery</strong>`
                }
              </p>
              <div class="tc-shipping-bar-bg">
                <div class="tc-shipping-bar-fill ${totals.isFreeShipping ? 'tc-bar-success' : ''}" style="width: ${
                  totals.isFreeShipping ? '100%' : `${Math.min(100, Math.round((totals.subtotal / totals.freeShippingThreshold) * 100))}%`
                }"></div>
              </div>
            </div>

            <div class="tc-cart-table-wrap">
              <table class="tc-cart-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Subtotal</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="tc-cart-table-body">
                  <!-- Populated below -->
                </tbody>
              </table>
            </div>

            <div class="tc-cart-page-nav-row">
              <a href="Product.html" class="tc-btn tc-btn-secondary">&larr; Continue Shopping</a>
            </div>
          </div>

          <div class="tc-cart-page-right">
            <div class="tc-order-summary-box">
              <h3>Order Summary</h3>
              <div class="tc-summary-row">
                <span>Subtotal</span>
                <strong>${formatPrice(totals.subtotal)}</strong>
              </div>
              <div class="tc-summary-row">
                <span>Shipping</span>
                <span>${totals.shipping === 0 ? '<strong class="tc-free-tag">FREE</strong>' : formatPrice(totals.shipping)}</span>
              </div>
              ${
                totals.discount > 0
                  ? `
                <div class="tc-summary-row tc-summary-discount">
                  <span>Discount</span>
                  <span>-${formatPrice(totals.discount)}</span>
                </div>
              `
                  : ''
              }
              <div class="tc-summary-row tc-summary-total">
                <span>Total</span>
                <strong>${formatPrice(totals.grandTotal)}</strong>
              </div>

              <div class="tc-cart-coupon-wrap">
                <label for="tc-cart-coupon-input">Apply Promo Code</label>
                <div class="tc-coupon-input-group">
                  <input type="text" id="tc-cart-coupon-input" placeholder="e.g. THREAD10" value="${
                    totals.appliedCoupon ? totals.appliedCoupon.code : ''
                  }">
                  <button type="button" id="tc-cart-coupon-apply" class="tc-btn">Apply</button>
                </div>
                ${
                  totals.appliedCoupon
                    ? `<p class="tc-coupon-feedback tc-success">Coupon <strong>${totals.appliedCoupon.code}</strong> applied! <button type="button" id="tc-page-rm-coupon" class="tc-link-btn">Remove</button></p>`
                    : ''
                }
              </div>

              <a href="checkout.html" class="tc-btn tc-btn-primary tc-cart-checkout-btn">
                Proceed to Checkout &rarr;
              </a>

              <div class="tc-cart-badges">
                <small>🔒 Secure 256-bit Encrypted Checkout</small>
                <small>⚡ Fast 48h Dispatch from New Delhi</small>
              </div>
            </div>
          </div>
        </div>
      `;

      // Render Table Rows
      const tbody = document.getElementById('tc-cart-table-body');
      lines.forEach((line) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="tc-td-product">
            <img src="${line.product.image}" alt="${line.product.name}" class="tc-cart-row-thumb">
            <div>
              <strong>${line.product.name}</strong>
              <small class="tc-cart-row-variant">${line.size ? `Size: ${line.size}` : ''} ${line.color ? `&bull; ${line.color}` : ''}</small>
            </div>
          </td>
          <td class="tc-td-price">${formatPrice(line.product.price)}</td>
          <td class="tc-td-qty">
            <div class="tc-stepper">
              <button type="button" class="tc-stepper-btn tc-table-dec" aria-label="Decrease quantity">−</button>
              <span class="tc-stepper-qty">${line.quantity}</span>
              <button type="button" class="tc-stepper-btn tc-table-inc" aria-label="Increase quantity">+</button>
            </div>
          </td>
          <td class="tc-td-subtotal">${formatPrice(line.lineTotal)}</td>
          <td class="tc-td-remove">
            <button type="button" class="tc-link-btn tc-table-remove" aria-label="Remove item">Remove</button>
          </td>
        `;

        // Stepper bindings
        tr.querySelector('.tc-table-dec').onclick = () => {
          cartModule.updateQuantity(line.lineKey, line.quantity - 1);
        };
        tr.querySelector('.tc-table-inc').onclick = () => {
          cartModule.updateQuantity(line.lineKey, line.quantity + 1);
        };
        tr.querySelector('.tc-table-remove').onclick = () => {
          cartModule.removeItem(line.lineKey);
          uiModule.showToast(`Removed ${line.product.name}`, 'info');
        };

        tbody.appendChild(tr);
      });

      // Clear all
      const clearBtn = document.getElementById('tc-page-clear-cart');
      if (clearBtn) {
        clearBtn.onclick = () => {
          cartModule.clearCart();
          uiModule.showToast('Cart cleared', 'info');
        };
      }

      // Coupon apply
      const couponInput = document.getElementById('tc-cart-coupon-input');
      const couponBtn = document.getElementById('tc-cart-coupon-apply');
      if (couponBtn && couponInput) {
        couponBtn.onclick = () => {
          const val = couponInput.value.trim();
          if (!val) {
            uiModule.showToast('Please enter a coupon code', 'error');
            return;
          }
          const res = cartModule.applyCoupon(val);
          if (res.success) {
            uiModule.showToast(res.message, 'success');
          } else {
            uiModule.showToast(res.message, 'error');
          }
        };
      }

      // Remove coupon
      const rmCouponBtn = document.getElementById('tc-page-rm-coupon');
      if (rmCouponBtn) {
        rmCouponBtn.onclick = () => {
          cartModule.removeCoupon();
          uiModule.showToast('Coupon removed', 'info');
        };
      }
    }

    renderCartPage();
    window.addEventListener('threadco:cart-updated', renderCartPage);
  }

  /**
   * Sanitizes all anchor links to eliminate empty or broken URLs
   */
  function sanitizeAnchorLinks() {
    document.querySelectorAll('a').forEach((link) => {
      const href = link.getAttribute('href');
      if (href === '' || href === '#') {
        // Prevent jarring page jumps on empty links
        link.setAttribute('href', 'javascript:void(0)');
      }
    });
  }

  // Auto initialize on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initApp);
    } else {
      initApp();
    }
  }

  return {
    initApp
  };
});
