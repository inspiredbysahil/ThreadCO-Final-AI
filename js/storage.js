/**
 * ThreadCo - Storage Abstraction Module
 * Provides safe, versioned persistence across sessions with corruption recovery.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./products.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./products.js'));
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (ThreadCo) {
  'use strict';

  const config = ThreadCo && ThreadCo.STORE_CONFIG ? ThreadCo.STORE_CONFIG : {
    storageKeys: {
      cart: 'threadco_cart_v1',
      wishlist: 'threadco_wishlist_v1',
      lastOrder: 'threadco_last_order_v1',
      appliedCoupon: 'threadco_applied_coupon_v1'
    }
  };

  // In-memory fallback if localStorage is disabled or restricted
  const memoryStorage = {};

  function isStorageAvailable() {
    try {
      const testKey = '__threadco_test__';
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  const hasLocalStorage = typeof window !== 'undefined' && isStorageAvailable();

  function getItem(key) {
    try {
      if (hasLocalStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStorage[key] || null;
    } catch (e) {
      console.warn(`[ThreadCo Storage] Read error for key "${key}":`, e);
      return memoryStorage[key] || null;
    }
  }

  function setItem(key, value) {
    try {
      if (hasLocalStorage) {
        window.localStorage.setItem(key, value);
      }
      memoryStorage[key] = value;
      return true;
    } catch (e) {
      console.warn(`[ThreadCo Storage] Write error for key "${key}":`, e);
      memoryStorage[key] = value;
      return false;
    }
  }

  function removeItem(key) {
    try {
      if (hasLocalStorage) {
        window.localStorage.removeItem(key);
      }
      delete memoryStorage[key];
    } catch (e) {
      console.warn(`[ThreadCo Storage] Remove error for key "${key}":`, e);
      delete memoryStorage[key];
    }
  }

  /**
   * Cart Storage
   * Returns array of cart items: [ { productId, quantity, size, color } ]
   */
  function getCart() {
    const raw = getItem(config.storageKeys.cart);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('[ThreadCo Storage] Cart data was not an array. Resetting.');
        saveCart([]);
        return [];
      }
      // Defensive sanitization: verify each item has valid structure
      return parsed.filter((item) => item && typeof item === 'object' && item.productId && item.quantity > 0);
    } catch (e) {
      console.error('[ThreadCo Storage] Corrupted cart JSON in localStorage. Resetting to empty cart.', e);
      saveCart([]);
      return [];
    }
  }

  function saveCart(cartItems) {
    if (!Array.isArray(cartItems)) cartItems = [];
    setItem(config.storageKeys.cart, JSON.stringify(cartItems));
  }

  function clearCart() {
    removeItem(config.storageKeys.cart);
    removeItem(config.storageKeys.appliedCoupon);
  }

  /**
   * Wishlist Storage
   * Array of product IDs: [ "tc-ot-vol3-blk", ... ]
   */
  function getWishlist() {
    const raw = getItem(config.storageKeys.wishlist);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveWishlist(list) {
    if (!Array.isArray(list)) list = [];
    setItem(config.storageKeys.wishlist, JSON.stringify(list));
  }

  function isWishlisted(productId) {
    if (!productId) return false;
    const list = getWishlist();
    return list.includes(String(productId));
  }

  function toggleWishlist(productId) {
    if (!productId) return false;
    const list = getWishlist();
    const strId = String(productId);
    const index = list.indexOf(strId);
    let added = false;
    if (index === -1) {
      list.push(strId);
      added = true;
    } else {
      list.splice(index, 1);
      added = false;
    }
    saveWishlist(list);
    return added;
  }

  /**
   * Applied Coupon Storage
   */
  function getAppliedCoupon() {
    const raw = getItem(config.storageKeys.appliedCoupon);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveAppliedCoupon(coupon) {
    if (!coupon) {
      removeItem(config.storageKeys.appliedCoupon);
    } else {
      setItem(config.storageKeys.appliedCoupon, JSON.stringify(coupon));
    }
  }

  function clearAppliedCoupon() {
    removeItem(config.storageKeys.appliedCoupon);
  }

  /**
   * Last Order (for order-success page demo mode)
   */
  function getLastOrder() {
    const raw = getItem(config.storageKeys.lastOrder);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveLastOrder(order) {
    if (!order) {
      removeItem(config.storageKeys.lastOrder);
    } else {
      setItem(config.storageKeys.lastOrder, JSON.stringify(order));
    }
  }

  return {
    isStorageAvailable,
    getCart,
    saveCart,
    clearCart,
    getWishlist,
    saveWishlist,
    isWishlisted,
    toggleWishlist,
    getAppliedCoupon,
    saveAppliedCoupon,
    clearAppliedCoupon,
    getLastOrder,
    saveLastOrder
  };
});
