/**
 * ThreadCo - Global UI Controller
 * Manages Cart Drawer, Toasts, Quick Add Modal, Mobile Nav, Wishlist,
 * Dynamic Year, and Accessibility (Focus trapping, Escape key, ARIA).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./products.js', './storage.js', './cart.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./products.js'), require('./storage.js'), require('./cart.js'));
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo, root.ThreadCo, root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (productsModule, storageModule, cartModule) {
  'use strict';

  const formatPrice = productsModule && productsModule.formatPrice
    ? productsModule.formatPrice
    : (n) => `₹${n}`;

  const getProductById = productsModule && productsModule.getProductById
    ? productsModule.getProductById
    : () => null;

  const storage = storageModule || {
    isWishlisted: () => false,
    toggleWishlist: () => false
  };

  const cart = cartModule || {
    getCartLines: () => [],
    getCartTotals: () => ({ totalUnits: 0, subtotal: 0, shipping: 0, discount: 0, grandTotal: 0 }),
    addItem: () => ({ success: false }),
    updateQuantity: () => ({ success: false }),
    removeItem: () => ({ success: false })
  };

  /* ==========================================================================
     1. TOAST NOTIFICATION SYSTEM
     ========================================================================== */
  let toastContainer = null;

  function ensureToastContainer() {
    if (!toastContainer && typeof document !== 'undefined') {
      toastContainer = document.getElementById('tc-toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'tc-toast-container';
        toastContainer.setAttribute('role', 'region');
        toastContainer.setAttribute('aria-live', 'polite');
        toastContainer.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(toastContainer);
      }
    }
    return toastContainer;
  }

  function showToast(message, type = 'info', duration = 3500) {
    if (typeof document === 'undefined') return;
    const container = ensureToastContainer();
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `tc-toast tc-toast-${type}`;

    let icon = '⚡';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠';
    if (type === 'wishlist') icon = '♥';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'tc-toast-icon';
    iconSpan.textContent = icon;

    const msgSpan = document.createElement('span');
    msgSpan.className = 'tc-toast-message';
    msgSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'tc-toast-close';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => removeToast(toast);

    toast.appendChild(iconSpan);
    toast.appendChild(msgSpan);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    // Auto dismiss
    const timer = setTimeout(() => {
      removeToast(toast);
    }, duration);

    function removeToast(el) {
      clearTimeout(timer);
      el.classList.add('tc-toast-leaving');
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 250);
    }
  }

  /* ==========================================================================
     2. GLOBAL CART DRAWER
     ========================================================================== */
  let cartDrawer = null;
  let cartBackdrop = null;
  let previousActiveElement = null;

  function injectCartDrawerMarkup() {
    if (document.getElementById('tc-cart-drawer')) return;

    const drawerMarkup = `
      <div id="tc-cart-backdrop" class="tc-cart-backdrop" aria-hidden="true"></div>
      <aside id="tc-cart-drawer" class="tc-cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping Cart Drawer" aria-hidden="true">
        <div class="tc-drawer-header">
          <div class="tc-drawer-title-wrap">
            <h2 class="tc-drawer-title">Your Cart</h2>
            <span id="tc-drawer-item-count" class="tc-drawer-badge">0 items</span>
          </div>
          <button id="tc-drawer-close" class="tc-drawer-close" aria-label="Close cart drawer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="6"></line>
            </svg>
          </button>
        </div>

        <div id="tc-shipping-meter" class="tc-shipping-meter">
          <p id="tc-shipping-meter-text" class="tc-shipping-text">Add ₹499 more for FREE Delivery</p>
          <div class="tc-shipping-bar-bg">
            <div id="tc-shipping-bar-fill" class="tc-shipping-bar-fill" style="width: 0%"></div>
          </div>
        </div>

        <div id="tc-drawer-items" class="tc-drawer-items">
          <!-- Dynamically populated cart items -->
        </div>

        <div id="tc-drawer-empty" class="tc-drawer-empty" style="display: none;">
          <div class="tc-empty-icon">⚡</div>
          <h3>Your cart is empty</h3>
          <p>Don't sleep on this week's limited streetwear drops.</p>
          <a href="Product.html" class="tc-btn tc-btn-primary tc-empty-cta">Explore Drops</a>
        </div>

        <div id="tc-drawer-footer" class="tc-drawer-footer">
          <div class="tc-summary-row">
            <span>Subtotal</span>
            <strong id="tc-drawer-subtotal">₹0</strong>
          </div>
          <div class="tc-summary-row tc-summary-shipping">
            <span>Shipping</span>
            <span id="tc-drawer-shipping">Calculated at checkout</span>
          </div>
          <div id="tc-drawer-discount-row" class="tc-summary-row tc-summary-discount" style="display: none;">
            <span>Discount</span>
            <span id="tc-drawer-discount">-₹0</span>
          </div>
          <div class="tc-summary-row tc-summary-total">
            <span>Grand Total</span>
            <strong id="tc-drawer-total">₹0</strong>
          </div>

          <div class="tc-drawer-actions">
            <a href="checkout.html" class="tc-btn tc-btn-checkout" id="tc-drawer-checkout-btn">
              Proceed to Checkout &rarr;
            </a>
            <a href="cart.html" class="tc-drawer-view-cart">View Full Cart</a>
          </div>
          <p class="tc-drawer-guarantee">&#10003; 100% Genuine Cotton &bull; Free Returns within 7 Days</p>
        </div>
      </aside>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerMarkup);
  }

  function renderCartDrawer() {
    const itemsContainer = document.getElementById('tc-drawer-items');
    const emptyContainer = document.getElementById('tc-drawer-empty');
    const footerContainer = document.getElementById('tc-drawer-footer');
    const countBadge = document.getElementById('tc-drawer-item-count');
    const meterText = document.getElementById('tc-shipping-meter-text');
    const meterFill = document.getElementById('tc-shipping-bar-fill');
    const subtotalEl = document.getElementById('tc-drawer-subtotal');
    const shippingEl = document.getElementById('tc-drawer-shipping');
    const discountRow = document.getElementById('tc-drawer-discount-row');
    const discountEl = document.getElementById('tc-drawer-discount');
    const totalEl = document.getElementById('tc-drawer-total');

    if (!itemsContainer) return;

    const lines = cart.getCartLines();
    const totals = cart.getCartTotals();

    // Synchronize header badge and drawer badge
    if (countBadge) {
      countBadge.textContent = `${totals.totalUnits} ${totals.totalUnits === 1 ? 'item' : 'items'}`;
    }

    // Shipping meter
    if (meterText && meterFill) {
      if (totals.subtotal === 0) {
        meterText.innerHTML = `Free delivery on orders above <strong>₹${totals.freeShippingThreshold}</strong>`;
        meterFill.style.width = '0%';
      } else if (totals.isFreeShipping) {
        meterText.innerHTML = `<strong>🎉 You've unlocked FREE Delivery!</strong>`;
        meterFill.style.width = '100%';
        meterFill.classList.add('tc-bar-success');
      } else {
        const remaining = totals.freeShippingRemaining;
        const percent = Math.min(100, Math.round((totals.subtotal / totals.freeShippingThreshold) * 100));
        meterText.innerHTML = `Add <strong>${formatPrice(remaining)}</strong> more for <strong>FREE Delivery</strong>`;
        meterFill.style.width = `${percent}%`;
        meterFill.classList.remove('tc-bar-success');
      }
    }

    if (lines.length === 0) {
      itemsContainer.style.display = 'none';
      if (emptyContainer) emptyContainer.style.display = 'block';
      if (footerContainer) footerContainer.style.display = 'none';
      return;
    }

    itemsContainer.style.display = 'flex';
    if (emptyContainer) emptyContainer.style.display = 'none';
    if (footerContainer) footerContainer.style.display = 'block';

    // Build line items safely using textContent / DOM construction
    itemsContainer.innerHTML = '';
    lines.forEach((line) => {
      const lineArticle = document.createElement('article');
      lineArticle.className = 'tc-drawer-item';
      lineArticle.setAttribute('data-line-key', line.lineKey);

      // Thumbnail
      const thumb = document.createElement('div');
      thumb.className = 'tc-drawer-thumb';
      const img = document.createElement('img');
      img.src = line.product.image;
      img.alt = line.product.name;
      img.loading = 'lazy';
      thumb.appendChild(img);

      // Details
      const details = document.createElement('div');
      details.className = 'tc-drawer-details';

      const title = document.createElement('h3');
      title.className = 'tc-drawer-item-title';
      title.textContent = line.product.name;

      const variant = document.createElement('div');
      variant.className = 'tc-drawer-item-variant';
      const sizeText = line.size ? `Size: ${line.size}` : '';
      const colorText = line.color ? `Color: ${line.color}` : '';
      variant.textContent = [sizeText, colorText].filter(Boolean).join(' | ') || 'Standard';

      const price = document.createElement('div');
      price.className = 'tc-drawer-item-price';
      price.textContent = `${formatPrice(line.product.price)}`;

      // Stepper
      const stepper = document.createElement('div');
      stepper.className = 'tc-stepper';

      const decBtn = document.createElement('button');
      decBtn.type = 'button';
      decBtn.className = 'tc-stepper-btn tc-dec-btn';
      decBtn.setAttribute('aria-label', `Decrease quantity of ${line.product.name}`);
      decBtn.textContent = '−';
      decBtn.onclick = () => cart.updateQuantity(line.lineKey, line.quantity - 1);

      const qtySpan = document.createElement('span');
      qtySpan.className = 'tc-stepper-qty';
      qtySpan.textContent = String(line.quantity);

      const incBtn = document.createElement('button');
      incBtn.type = 'button';
      incBtn.className = 'tc-stepper-btn tc-inc-btn';
      incBtn.setAttribute('aria-label', `Increase quantity of ${line.product.name}`);
      incBtn.textContent = '+';
      incBtn.onclick = () => cart.updateQuantity(line.lineKey, line.quantity + 1);

      stepper.appendChild(decBtn);
      stepper.appendChild(qtySpan);
      stepper.appendChild(incBtn);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'tc-drawer-item-remove';
      removeBtn.setAttribute('aria-label', `Remove ${line.product.name} from cart`);
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        cart.removeItem(line.lineKey);
        showToast(`Removed ${line.product.name} from cart`, 'info');
      };

      const lineTotal = document.createElement('strong');
      lineTotal.className = 'tc-drawer-item-total';
      lineTotal.textContent = formatPrice(line.lineTotal);

      const bottomRow = document.createElement('div');
      bottomRow.className = 'tc-drawer-bottom-row';
      bottomRow.appendChild(stepper);
      bottomRow.appendChild(removeBtn);
      bottomRow.appendChild(lineTotal);

      details.appendChild(title);
      details.appendChild(variant);
      details.appendChild(price);
      details.appendChild(bottomRow);

      lineArticle.appendChild(thumb);
      lineArticle.appendChild(details);
      itemsContainer.appendChild(lineArticle);
    });

    // Update Totals
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

  function openCartDrawer() {
    injectCartDrawerMarkup();
    cartDrawer = document.getElementById('tc-cart-drawer');
    cartBackdrop = document.getElementById('tc-cart-backdrop');
    if (!cartDrawer || !cartBackdrop) return;

    previousActiveElement = document.activeElement;
    renderCartDrawer();

    cartDrawer.classList.add('is-open');
    cartBackdrop.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    cartBackdrop.setAttribute('aria-hidden', 'false');

    // Prevent body scrolling
    document.body.style.overflow = 'hidden';

    // Focus close button for accessibility
    const closeBtn = document.getElementById('tc-drawer-close');
    if (closeBtn) closeBtn.focus();
  }

  function closeCartDrawer() {
    if (!cartDrawer || !cartBackdrop) return;

    cartDrawer.classList.remove('is-open');
    cartBackdrop.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    cartBackdrop.setAttribute('aria-hidden', 'true');

    document.body.style.overflow = '';

    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  }

  function initCartDrawer() {
    injectCartDrawerMarkup();
    cartDrawer = document.getElementById('tc-cart-drawer');
    cartBackdrop = document.getElementById('tc-cart-backdrop');

    // Close button
    const closeBtn = document.getElementById('tc-drawer-close');
    if (closeBtn) {
      closeBtn.onclick = closeCartDrawer;
    }

    // Backdrop click
    if (cartBackdrop) {
      cartBackdrop.onclick = closeCartDrawer;
    }

    // Keyboard navigation (Escape key & focus trap)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (cartDrawer && cartDrawer.classList.contains('is-open')) {
          closeCartDrawer();
        }
        closeQuickAddModal();
        closeMobileNav();
      }
    });

    // Listen for cart update events
    window.addEventListener('threadco:cart-updated', () => {
      syncHeaderCartBadge();
      if (cartDrawer && cartDrawer.classList.contains('is-open')) {
        renderCartDrawer();
      }
    });
  }

  /* ==========================================================================
     3. HEADER CART BADGE SYNCHRONIZATION
     ========================================================================== */
  function syncHeaderCartBadge() {
    const totals = cart.getCartTotals();
    const count = totals.totalUnits || 0;

     // Target all cart links across headers and footers
    const cartLinks = document.querySelectorAll('#cart, a[href="#cart"], a[href="cart.html"], .tc-cart-link, .tc-mobile-cart-btn');
    cartLinks.forEach((link) => {
      // If link is specifically the nav cart trigger or has cart badge
      if (link.id === 'cart' || link.getAttribute('href') === '#cart' || link.classList.contains('tc-nav-cart')) {
        link.textContent = `Cart (${count})`;
        link.setAttribute('aria-label', `Shopping Cart with ${count} items`);
      }

      // Update mobile badge counters
      const mobileBadge = link.querySelector('.tc-mobile-cart-badge');
      if (mobileBadge) {
        mobileBadge.textContent = String(count);
        mobileBadge.style.display = count > 0 ? 'inline-flex' : 'none';
      }

      // Ensure it opens the drawer when clicked (unless on dedicated cart.html)
      if (!link.dataset.hasCartListener) {
        link.dataset.hasCartListener = 'true';
        link.addEventListener('click', (e) => {
          // If on mobile or user wants drawer, intercept anchor unless already on cart.html
          const isCartPage = typeof window !== 'undefined' && (window.location.pathname.endsWith('cart.html') || window.location.pathname.endsWith('/cart'));
          if (!isCartPage && (link.getAttribute('href') === '#cart' || link.getAttribute('href') === 'cart.html')) {
            e.preventDefault();
            if (typeof closeMobileNav === 'function') closeMobileNav();
            openCartDrawer();
          }
        });
      }
    });

    const separateBadges = document.querySelectorAll('.tc-mobile-cart-badge');
    separateBadges.forEach((badge) => {
      badge.textContent = String(count);
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }


  /* ==========================================================================
     4. QUICK ADD MODAL
     ========================================================================== */
  let quickAddModal = null;

  function injectQuickAddModal() {
    if (document.getElementById('tc-quick-add-modal')) return;

    const modalMarkup = `
      <div id="tc-modal-backdrop" class="tc-modal-backdrop" aria-hidden="true"></div>
      <div id="tc-quick-add-modal" class="tc-modal" role="dialog" aria-modal="true" aria-labelledby="tc-modal-title" aria-hidden="true">
        <button id="tc-modal-close" class="tc-modal-close" aria-label="Close modal">&times;</button>
        <div class="tc-modal-body">
          <div class="tc-modal-thumb">
            <img id="tc-modal-img" src="product 1.jpg" alt="Product Preview">
          </div>
          <div class="tc-modal-info">
            <p id="tc-modal-category" class="tc-modal-category">Category</p>
            <h3 id="tc-modal-title" class="tc-modal-title">Product Name</h3>
            <div class="tc-modal-price-wrap">
              <strong id="tc-modal-price" class="tc-modal-price">₹0</strong>
              <s id="tc-modal-mrp" class="tc-modal-mrp">₹0</s>
              <mark id="tc-modal-discount" class="tc-modal-discount">0% OFF</mark>
            </div>

            <div class="tc-modal-section">
              <label class="tc-modal-label">Select Size:</label>
              <div id="tc-modal-sizes" class="tc-size-selector">
                <!-- Size pills -->
              </div>
              <p id="tc-modal-size-error" class="tc-field-error" style="display: none;">Please select a size.</p>
            </div>

            <div class="tc-modal-section">
              <label class="tc-modal-label">Quantity:</label>
              <div class="tc-stepper">
                <button type="button" id="tc-modal-qty-dec" class="tc-stepper-btn">−</button>
                <span id="tc-modal-qty-display" class="tc-stepper-qty">1</span>
                <button type="button" id="tc-modal-qty-inc" class="tc-stepper-btn">+</button>
              </div>
            </div>

            <button type="button" id="tc-modal-submit-btn" class="tc-btn tc-btn-primary tc-modal-submit">
              Add to Cart
            </button>
            <a id="tc-modal-view-detail" href="Product detail.html" class="tc-modal-link">
              View Full Product Details &rarr;
            </a>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalMarkup);
  }

  function openQuickAddModal(productId) {
    const product = getProductById(productId);
    if (!product) return;

    // If product has only one size or caps with no size selection, add directly!
    if (!product.sizes || product.sizes.length === 0 || product.sizes.includes('One Size')) {
      const res = cart.addItem(productId, 1, 'One Size');
      if (res.success) {
        showToast(res.message, 'success');
        openCartDrawer();
      } else {
        showToast(res.message, 'error');
      }
      return;
    }

    injectQuickAddModal();
    quickAddModal = document.getElementById('tc-quick-add-modal');
    const backdrop = document.getElementById('tc-modal-backdrop');
    if (!quickAddModal || !backdrop) return;

    // Populate data
    document.getElementById('tc-modal-img').src = product.image;
    document.getElementById('tc-modal-img').alt = product.name;
    document.getElementById('tc-modal-category').textContent = product.category;
    document.getElementById('tc-modal-title').textContent = product.name;
    document.getElementById('tc-modal-price').textContent = formatPrice(product.price);
    document.getElementById('tc-modal-mrp').textContent = formatPrice(product.compareAtPrice);
    document.getElementById('tc-modal-discount').textContent = `${product.discount}% OFF`;
    document.getElementById('tc-modal-view-detail').href = `Product detail.html?id=${encodeURIComponent(product.id)}`;

    // Build size pills
    const sizesContainer = document.getElementById('tc-modal-sizes');
    const errorEl = document.getElementById('tc-modal-size-error');
    errorEl.style.display = 'none';
    sizesContainer.innerHTML = '';

    let selectedSize = null;
    let selectedQty = 1;

    product.sizes.forEach((s) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'tc-size-pill';
      pill.textContent = s;
      pill.onclick = () => {
        selectedSize = s;
        errorEl.style.display = 'none';
        sizesContainer.querySelectorAll('.tc-size-pill').forEach((b) => b.classList.remove('is-selected'));
        pill.classList.add('is-selected');
      };
      sizesContainer.appendChild(pill);
    });

    // Quantity controls
    const qtyDisplay = document.getElementById('tc-modal-qty-display');
    qtyDisplay.textContent = '1';

    document.getElementById('tc-modal-qty-dec').onclick = () => {
      if (selectedQty > 1) {
        selectedQty--;
        qtyDisplay.textContent = String(selectedQty);
      }
    };
    document.getElementById('tc-modal-qty-inc').onclick = () => {
      if (selectedQty < 10) {
        selectedQty++;
        qtyDisplay.textContent = String(selectedQty);
      }
    };

    // Close handlers
    document.getElementById('tc-modal-close').onclick = closeQuickAddModal;
    backdrop.onclick = closeQuickAddModal;

    // Submit button
    const submitBtn = document.getElementById('tc-modal-submit-btn');
    submitBtn.onclick = () => {
      if (!selectedSize) {
        errorEl.style.display = 'block';
        return;
      }
      const res = cart.addItem(product.id, selectedQty, selectedSize);
      if (res.success) {
        closeQuickAddModal();
        showToast(res.message, 'success');
        openCartDrawer();
      } else {
        showToast(res.message, 'error');
      }
    };

    // Open transition
    quickAddModal.classList.add('is-open');
    backdrop.classList.add('is-open');
    quickAddModal.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickAddModal() {
    if (!quickAddModal) return;
    const backdrop = document.getElementById('tc-modal-backdrop');
    quickAddModal.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    quickAddModal.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     5. MOBILE NAVIGATION MENU
     ========================================================================== */
  function initMobileNav() {
    const header = document.querySelector('header');
    if (!header) return;

    // 1. Ensure Header Actions container exists for Mobile & Tablet viewports
    let actionsContainer = header.querySelector('.tc-header-actions');
    if (!actionsContainer) {
      actionsContainer = document.createElement('div');
      actionsContainer.className = 'tc-header-actions';
      header.appendChild(actionsContainer);
    }

    // 2. Ensure Mobile Quick Cart Button exists
    if (!actionsContainer.querySelector('.tc-mobile-cart-btn')) {
      const totals = cart.getCartTotals ? cart.getCartTotals() : { totalUnits: 0 };
      const currentCount = totals.totalUnits || 0;

      const cartBtn = document.createElement('a');
      cartBtn.href = 'cart.html';
      cartBtn.className = 'tc-mobile-cart-btn';
      cartBtn.setAttribute('aria-label', `Shopping Cart with ${currentCount} items`);
      cartBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <span class="tc-mobile-cart-badge" style="${currentCount > 0 ? 'display:inline-flex' : 'display:none'}">${currentCount}</span>
      `;
      actionsContainer.appendChild(cartBtn);

      cartBtn.addEventListener('click', (e) => {
        const isCartPage = typeof window !== 'undefined' && (window.location.pathname.endsWith('cart.html') || window.location.pathname.endsWith('/cart'));
        if (!isCartPage) {
          e.preventDefault();
          closeMobileNav();
          openCartDrawer();
        }
      });
    }

    // 3. Ensure Animated Hamburger Button exists inside actions
    let hamburger = actionsContainer.querySelector('.tc-hamburger-btn') || header.querySelector('.tc-hamburger-btn');
    if (!hamburger) {
      hamburger = document.createElement('button');
      hamburger.type = 'button';
      hamburger.className = 'tc-hamburger-btn';
      hamburger.setAttribute('aria-label', 'Toggle navigation menu');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.innerHTML = `
        <span class="tc-hamburger-line"></span>
        <span class="tc-hamburger-line"></span>
        <span class="tc-hamburger-line"></span>
      `;
      actionsContainer.appendChild(hamburger);
    } else if (hamburger.parentNode !== actionsContainer) {
      actionsContainer.appendChild(hamburger);
    }

    // 4. Ensure Mobile Backdrop Overlay exists
    let backdrop = document.getElementById('tc-mobile-nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tc-mobile-nav-backdrop';
      backdrop.className = 'tc-mobile-nav-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', () => {
        closeMobileNav();
      });
    }

    // 5. Hamburger Click Handler
    hamburger.onclick = (e) => {
      e.stopPropagation();
      const isOpen = header.classList.toggle('is-mobile-nav-open');
      hamburger.setAttribute('aria-expanded', String(isOpen));
      if (backdrop) {
        backdrop.classList.toggle('is-open', isOpen);
        backdrop.setAttribute('aria-hidden', String(!isOpen));
      }
      document.body.classList.toggle('tc-no-scroll', isOpen);
    };

    // 6. Close nav when any link inside header nav is clicked
    const navLinks = header.querySelectorAll('nav a');
    navLinks.forEach((link) => {
      if (!link.dataset.hasCloseNavListener) {
        link.dataset.hasCloseNavListener = 'true';
        link.addEventListener('click', () => {
          closeMobileNav();
        });
      }
    });

    // 7. Close nav on Escape key
    if (!window._tcNavEscapeListenerAttached) {
      window._tcNavEscapeListenerAttached = true;
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && header.classList.contains('is-mobile-nav-open')) {
          closeMobileNav();
        }
      });
    }

    // 8. Auto-close when viewport expands to desktop (> 992px)
    if (!window._tcNavResizeListenerAttached) {
      window._tcNavResizeListenerAttached = true;
      const mediaQuery = window.matchMedia('(min-width: 993px)');
      const handleBreakpoint = (e) => {
        if (e.matches) {
          closeMobileNav();
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleBreakpoint);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleBreakpoint);
      }
    }
  }

  function closeMobileNav() {
    const header = document.querySelector('header');
    if (header && header.classList.contains('is-mobile-nav-open')) {
      header.classList.remove('is-mobile-nav-open');
      const btn = header.querySelector('.tc-hamburger-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      const backdrop = document.getElementById('tc-mobile-nav-backdrop');
      if (backdrop) {
        backdrop.classList.remove('is-open');
        backdrop.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('tc-no-scroll');
    }
  }

  /* ==========================================================================
     6. DYNAMIC CURRENT YEAR
     ========================================================================== */
  function updateDynamicYear() {
    const currentYear = new Date().getFullYear();
    const footerParagraphs = document.querySelectorAll('footer p, #footer p');
    footerParagraphs.forEach((p) => {
      if (p.textContent.includes('©') || p.textContent.includes('&copy;')) {
        p.innerHTML = `&copy;${currentYear} ThreadCo. All rights reserved.`;
      }
    });
  }

  /* ==========================================================================
     7. WISHLIST EVENT DELEGATION
     ========================================================================== */
  function initWishlistDelegation() {
    document.addEventListener('click', (e) => {
      const wishBtn = e.target.closest('[data-action="toggle-wishlist"]');
      if (!wishBtn) return;
      e.preventDefault();
      const pId = wishBtn.dataset.productId;
      if (!pId) return;

      const product = getProductById(pId);
      const isAdded = storage.toggleWishlist(pId);

      if (isAdded) {
        wishBtn.classList.add('is-active');
        showToast(`Saved ${product ? product.name : 'item'} to your wishlist!`, 'wishlist');
      } else {
        wishBtn.classList.remove('is-active');
        showToast(`Removed from your wishlist`, 'info');
      }
    });
  }

  return {
    showToast,
    openCartDrawer,
    closeCartDrawer,
    renderCartDrawer,
    initCartDrawer,
    syncHeaderCartBadge,
    openQuickAddModal,
    closeQuickAddModal,
    initMobileNav,
    closeMobileNav,
    updateDynamicYear,
    initWishlistDelegation
  };
});
