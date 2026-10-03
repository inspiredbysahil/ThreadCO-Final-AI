/**
 * ThreadCo - Cart Domain Logic
 * Handles variant separation, quantity clamping, shipping threshold calculations,
 * and extensible coupon validation.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./products.js', './storage.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./products.js'), require('./storage.js'));
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo, root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (productsModule, storageModule) {
  'use strict';

  const config = (productsModule && productsModule.STORE_CONFIG) || {
    freeShippingThreshold: 499,
    standardShippingFee: 79,
    maxCartQuantity: 10,
    coupons: []
  };

  const getProductById = productsModule && productsModule.getProductById
    ? productsModule.getProductById
    : function () { return null; };

  const storage = storageModule || {
    getCart: () => [],
    saveCart: () => {},
    clearCart: () => {},
    getAppliedCoupon: () => null,
    saveAppliedCoupon: () => {},
    clearAppliedCoupon: () => {}
  };

  /**
   * Generates a unique line item key for variant separation
   * Tee / M and Tee / L are treated as distinct cart entries.
   */
  function getLineKey(item) {
    const pId = item.productId || '';
    const size = (item.size || 'default').toLowerCase().trim();
    const color = (item.color || 'default').toLowerCase().trim();
    return `${pId}__${size}__${color}`;
  }

  /**
   * Dispatches a custom event to keep UI components automatically synchronized
   */
  function dispatchCartEvent(eventName, detail) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        const evt = new CustomEvent(eventName, { detail: detail || {} });
        window.dispatchEvent(evt);
      } catch (e) {
        // Fallback for older browsers
        const evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(eventName, true, true, detail || {});
        window.dispatchEvent(evt);
      }
    }
  }

  /**
   * Retrieves enriched cart items with verified product data
   */
  function getCartLines() {
    const rawItems = storage.getCart();
    const lines = [];

    rawItems.forEach((item) => {
      const product = getProductById(item.productId);
      if (!product) {
        console.warn(`[ThreadCo Cart] Product ID "${item.productId}" no longer exists. Omitting from active cart.`);
        return;
      }
      const lineKey = getLineKey(item);
      const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, config.maxCartQuantity));
      const lineTotal = product.price * quantity;

      lines.push({
        lineKey,
        productId: product.id,
        product,
        size: item.size || null,
        color: item.color || null,
        quantity,
        lineTotal
      });
    });

    return lines;
  }

  /**
   * Calculates complete financial totals
   */
  function getCartTotals() {
    const lines = getCartLines();
    let subtotal = 0;
    let totalUnits = 0;

    lines.forEach((line) => {
      subtotal += line.lineTotal;
      totalUnits += line.quantity;
    });

    // Stated rule: Free delivery on orders >= ₹499
    let shipping = 0;
    let freeShippingRemaining = 0;

    if (subtotal > 0) {
      if (subtotal >= config.freeShippingThreshold) {
        shipping = 0;
      } else {
        shipping = config.standardShippingFee;
        freeShippingRemaining = config.freeShippingThreshold - subtotal;
      }
    }

    // Coupon calculation
    let discount = 0;
    let appliedCoupon = storage.getAppliedCoupon();
    let couponMessage = '';

    if (appliedCoupon && subtotal > 0) {
      // Find configured coupon rule
      const rule = (config.coupons || []).find(
        (c) => c.code.toUpperCase() === appliedCoupon.code.toUpperCase()
      );

      if (rule) {
        if (rule.minOrder && subtotal < rule.minOrder) {
          couponMessage = `Minimum order of ₹${rule.minOrder} required for ${rule.code}.`;
          discount = 0;
        } else {
          if (rule.type === 'percentage') {
            discount = Math.round((subtotal * rule.value) / 100);
          } else if (rule.type === 'flat') {
            discount = Math.min(rule.value, subtotal);
          }
        }
      } else {
        // Unknown coupon, clear it
        storage.clearAppliedCoupon();
        appliedCoupon = null;
      }
    } else if (!subtotal) {
      discount = 0;
    }

    // Ensure discount does not exceed subtotal
    discount = Math.min(discount, subtotal);
    const grandTotal = Math.max(0, subtotal - discount + shipping);

    return {
      subtotal,
      shipping,
      discount,
      grandTotal,
      totalUnits,
      freeShippingThreshold: config.freeShippingThreshold,
      freeShippingRemaining,
      isFreeShipping: subtotal >= config.freeShippingThreshold && subtotal > 0,
      appliedCoupon,
      couponMessage,
      itemCount: lines.length
    };
  }

  /**
   * Add Item to Cart
   */
  function addItem(productId, quantity, size, color) {
    const product = getProductById(productId);
    if (!product) {
      return { success: false, message: 'Product not found.' };
    }

    if (!product.available || product.stockStatus === 'out_of_stock') {
      return { success: false, message: 'Sorry, this product is currently out of stock.' };
    }

    // Size requirement validation
    if (product.sizes && product.sizes.length > 0 && !product.sizes.includes('One Size')) {
      if (!size || size === '--Choose Size--' || size === '') {
        return { success: false, message: 'Please select a size to continue.', requireSize: true };
      }
    } else if (product.sizes && product.sizes.includes('One Size') && !size) {
      size = 'One Size';
    }

    const qty = Math.max(1, Math.min(Number(quantity) || 1, config.maxCartQuantity));
    const targetKey = getLineKey({ productId, size, color });

    const rawItems = storage.getCart();
    let existingIndex = -1;

    for (let i = 0; i < rawItems.length; i++) {
      if (getLineKey(rawItems[i]) === targetKey) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex > -1) {
      const currentQty = rawItems[existingIndex].quantity;
      const newQty = Math.min(currentQty + qty, config.maxCartQuantity);
      if (currentQty >= config.maxCartQuantity) {
        return {
          success: false,
          message: `Maximum allowed quantity (${config.maxCartQuantity} units) reached for this item.`
        };
      }
      rawItems[existingIndex].quantity = newQty;
    } else {
      rawItems.push({
        productId,
        quantity: qty,
        size: size || null,
        color: color || null
      });
    }

    storage.saveCart(rawItems);
    const totals = getCartTotals();
    dispatchCartEvent('threadco:cart-updated', { action: 'add', productId, totals });

    return {
      success: true,
      message: `Added ${product.name} to cart.`,
      totals
    };
  }

  /**
   * Update quantity of a specific line item
   */
  function updateQuantity(lineKey, newQuantity) {
    const targetQty = Number(newQuantity);
    const rawItems = storage.getCart();

    if (isNaN(targetQty) || targetQty <= 0) {
      return removeItem(lineKey);
    }

    const clampedQty = Math.min(Math.max(1, targetQty), config.maxCartQuantity);
    let found = false;

    for (let i = 0; i < rawItems.length; i++) {
      if (getLineKey(rawItems[i]) === lineKey) {
        rawItems[i].quantity = clampedQty;
        found = true;
        break;
      }
    }

    if (found) {
      storage.saveCart(rawItems);
      const totals = getCartTotals();
      dispatchCartEvent('threadco:cart-updated', { action: 'update', lineKey, totals });
      return { success: true, totals };
    }

    return { success: false, message: 'Item not found in cart.' };
  }

  /**
   * Remove item from cart by line key
   */
  function removeItem(lineKey) {
    const rawItems = storage.getCart();
    const updated = rawItems.filter((item) => getLineKey(item) !== lineKey);

    storage.saveCart(updated);
    const totals = getCartTotals();
    dispatchCartEvent('threadco:cart-updated', { action: 'remove', lineKey, totals });

    return { success: true, totals };
  }

  /**
   * Clear entire cart
   */
  function clearCart() {
    storage.clearCart();
    const totals = getCartTotals();
    dispatchCartEvent('threadco:cart-updated', { action: 'clear', totals });
    return { success: true, totals };
  }

  /**
   * Apply coupon code
   */
  function applyCoupon(code) {
    if (!code || typeof code !== 'string') {
      return { success: false, message: 'Please enter a valid coupon code.' };
    }

    const cleanCode = code.trim().toUpperCase();
    const rule = (config.coupons || []).find((c) => c.code.toUpperCase() === cleanCode);

    if (!rule) {
      return { success: false, message: `Coupon code "${cleanCode}" is invalid.` };
    }

    const currentTotals = getCartTotals();
    if (rule.minOrder && currentTotals.subtotal < rule.minOrder) {
      return {
        success: false,
        message: `Coupon "${cleanCode}" requires a minimum order of ₹${rule.minOrder}.`
      };
    }

    storage.saveAppliedCoupon({
      code: rule.code,
      type: rule.type,
      value: rule.value,
      description: rule.description
    });

    const newTotals = getCartTotals();
    dispatchCartEvent('threadco:cart-updated', { action: 'coupon_applied', coupon: rule, totals: newTotals });

    return {
      success: true,
      message: `Coupon "${cleanCode}" applied successfully!`,
      totals: newTotals
    };
  }

  /**
   * Remove active coupon
   */
  function removeCoupon() {
    storage.clearAppliedCoupon();
    const totals = getCartTotals();
    dispatchCartEvent('threadco:cart-updated', { action: 'coupon_removed', totals });
    return { success: true, totals };
  }

  return {
    getLineKey,
    getCartLines,
    getCartTotals,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon
  };
});
