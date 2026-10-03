/**
 * ThreadCo - Central Product Data & Store Configuration
 * Single source of truth for products, pricing, discounts, and store rules.
 * 
 * Rules:
 * - No fabricated product specifications.
 * - Missing info is flagged as "Not specified" or "Client to confirm".
 * - All products have stable unique string IDs.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory());
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Global Store Configuration
  const STORE_CONFIG = {
    brandName: 'ThreadCo',
    tagline: 'Wear the Code. Live the Street.',
    currency: 'INR',
    currencySymbol: '₹',
    locale: 'en-IN',
    freeShippingThreshold: 499, // Free delivery on orders >= ₹499
    standardShippingFee: 79,    // Standard shipping fee if below threshold
    maxCartQuantity: 10,        // Max allowed units per cart line
    enableWishlist: true,
    enableCOD: true,            // Cash on Delivery
    enableOnlinePayment: true,  // Online Payment architecture (Demo/Integration ready)
    demoMode: true,             // Frontend demo mode active
    supportEmail: 'hello@thread.co',
    supportPhone: '+91 9876543210',
    storageKeys: {
      cart: 'threadco_cart_v1',
      wishlist: 'threadco_wishlist_v1',
      lastOrder: 'threadco_last_order_v1',
      appliedCoupon: 'threadco_applied_coupon_v1'
    },
    // Configurable coupons (Note: Production MUST revalidate discounts server-side)
    coupons: [
      {
        code: 'THREAD10',
        type: 'percentage',
        value: 10, // 10% off
        minOrder: 0,
        description: '10% off on all orders'
      },
      {
        code: 'STREET20',
        type: 'percentage',
        value: 20, // 20% off
        minOrder: 1000,
        description: '20% off on orders above ₹1,000'
      },
      {
        code: 'FIRSTDROP',
        type: 'flat',
        value: 150, // ₹150 flat discount
        minOrder: 500,
        description: 'Flat ₹150 off on orders above ₹500'
      }
    ]
  };

  /**
   * Verified Product Dataset
   * Derived strictly from existing supplied files (index.html, Product.html, Product detail.html)
   */
  const PRODUCTS = [
    {
      id: 'tc-ot-vol3-blk',
      name: 'Oversized Drop Tee Vol.3',
      slug: 'oversized-drop-tee-vol-3',
      category: 'T-Shirts',
      price: 799,
      compareAtPrice: 1199,
      discount: 33, // 33% OFF
      image: 'product 1.jpg',
      sku: 'TC-OT-VOL3-BLK',
      available: true,
      stockStatus: 'in_stock', // in_stock | low_stock | out_of_stock
      stock: null, // Actual inventory not specified; handled safely on frontend
      featured: true,
      rank: 1,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Black', 'White', 'Washed Grey', 'Olive'],
      rating: 4.9,
      reviewCount: 247,
      description:
        'The Vol.3 drops harder than the ones before it. Heavyweight 240 GSM cotton, a chest graphic designed by Delhi-based artist Arjun Mehra, and a boxy cut that pairs with everything. This is the one everyone is waiting for.',
      material: '100% Cotton - 240 GSM heavyweight',
      fit: 'Oversized / Boxy cut',
      neckline: 'Ribbed crew neck',
      care: 'Machine wash cold (30°C), inside out. Do not tumble dry.',
      countryOfOrigin: 'Made in India',
      artist: 'Graphic by Arjun Mehra, New Delhi',
      sizeChart: {
        headers: ['Size', 'Chest (inches)', 'Length (inches)', 'Shoulder (inches)'],
        rows: [
          ['S', '42', '28', '18'],
          ['M', '44', '29', '19'],
          ['L', '46', '30', '20'],
          ['XL', '48', '31', '21'],
          ['XXL', '50', '32', '22']
        ],
        note: 'Measurements are approximate and may vary by ± 0.5 inches.'
      },
      reviews: [
        {
          author: 'Rahul K.',
          location: 'Delhi',
          rating: 5,
          text: 'Bhai yeh tee bahut solid hai. The graphic is fire, quality is exactly what you expect at this price. Already ordered 2 more colors. Highly recommend.',
          date: 'October 12, 2025',
          size: 'L'
        },
        {
          author: 'Priya S.',
          location: 'Bangalore',
          rating: 5,
          text: "Obsessed with this tee. The oversized fit is perfect - not too boxy, not too loose. Wore it to a concert and got three compliments in one night. The fabric is soft and hasn't shrunk after 5 washes.",
          date: 'October 10, 2025',
          size: 'M'
        },
        {
          author: 'Aryan M.',
          location: 'Mumbai',
          rating: 4,
          text: 'Really good quality for the price. Shipping was fast, delivered in 2 days. Minus one star only because I wish there were more color options. Otherwise absolutely worth it.',
          date: 'October 8, 2025',
          size: 'XL'
        }
      ]
    },
    {
      id: 'tc-hd-olv',
      name: 'Street Hoodie - Olive',
      slug: 'street-hoodie-olive',
      category: 'Hoodies',
      price: 1499,
      compareAtPrice: 1999,
      discount: 25, // 25% OFF
      image: 'product 2.jpg',
      sku: 'TC-HD-OLV',
      available: true,
      stockStatus: 'in_stock',
      stock: null,
      featured: true,
      rank: 2,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Olive'],
      rating: 4.7,
      reviewCount: null, // Client to confirm
      description:
        'Heavyweight premium streetwear hoodie built for winter and layering. Features a relaxed cut, ribbed cuffs, and durable construction designed for the streets.',
      material: '80% Cotton, 20% Polyester',
      fit: 'Winter & layering / Relaxed fit',
      neckline: 'Drawstring hood with double-lined kangaroo pocket',
      care: 'Machine wash cold. Do not tumble dry. Iron inside out.',
      countryOfOrigin: 'Made in India',
      artist: 'Not specified (Client to confirm)',
      sizeChart: {
        headers: ['Size', 'Chest (inches)', 'Length (inches)', 'Sleeve (inches)'],
        rows: [
          ['S', '44', '27', '24'],
          ['M', '46', '28', '25'],
          ['L', '48', '29', '26'],
          ['XL', '50', '30', '27']
        ],
        note: 'Measurements are approximate and may vary by ± 0.5 inches.'
      },
      reviews: []
    },
    {
      id: 'tc-crg-bge',
      name: 'Utility Cargo - Beige',
      slug: 'utility-cargo-beige',
      category: 'Cargo Pants',
      price: 1799,
      compareAtPrice: 2499,
      discount: 28, // 28% OFF
      image: 'product 3.jpg',
      sku: 'TC-CRG-BGE',
      available: true,
      stockStatus: 'in_stock',
      stock: null,
      featured: true,
      rank: 3,
      sizes: ['28', '30', '32', '34', '36'],
      colors: ['Beige'],
      rating: 4.6,
      reviewCount: null, // Client to confirm
      description:
        'Functional utility cargo pants crafted from durable 100% cotton twill. Multi-pocket design built for street and utility style with reinforced seams.',
      material: '100% Cotton Twill',
      fit: 'Street & utility style / Relaxed straight leg',
      neckline: 'Not applicable',
      care: 'Machine wash cold with like colors. Tumble dry low.',
      countryOfOrigin: 'Made in India',
      artist: 'Not specified (Client to confirm)',
      sizeChart: {
        headers: ['Waist (inches)', 'Hip (inches)', 'Inseam (inches)', 'Length (inches)'],
        rows: [
          ['28', '38', '30', '40'],
          ['30', '40', '30.5', '41'],
          ['32', '42', '31', '41.5'],
          ['34', '44', '31.5', '42'],
          ['36', '46', '32', '42.5']
        ],
        note: 'Measurements are approximate and may vary by ± 0.5 inches.'
      },
      reviews: []
    },
    {
      id: 'tc-cap-6p',
      name: 'TC 6-Panel Cap',
      slug: 'tc-6-panel-cap',
      category: 'Caps',
      price: 499,
      compareAtPrice: 699,
      discount: 28, // 28% OFF
      image: 'product 4.jpg',
      sku: 'TC-CAP-6P',
      available: true,
      stockStatus: 'in_stock',
      stock: null,
      featured: true,
      rank: 4,
      sizes: ['One Size'],
      colors: ['Black'],
      rating: 4.5,
      reviewCount: null, // Client to confirm
      description:
        'Classic 6-panel unstructured streetwear cap with embroidered ThreadCo branding and adjustable brass buckle strap. One size fits most.',
      material: 'Not specified (Client to confirm)',
      fit: 'Adjustable 6-panel fit',
      neckline: 'Not applicable',
      care: 'Spot clean only with damp cloth.',
      countryOfOrigin: 'Made in India',
      artist: 'Not specified (Client to confirm)',
      sizeChart: {
        headers: ['Size', 'Circumference (inches)', 'Crown Height', 'Strap'],
        rows: [
          ['One Size', '21.5 - 23.5', '4.5 inches', 'Adjustable buckle']
        ],
        note: 'One size fits most heads with the adjustable back strap.'
      },
      reviews: []
    }
  ];

  /**
   * Validates product data integrity at runtime
   */
  function validateProductData(list) {
    const required = ['id', 'name', 'category', 'price', 'image'];
    list.forEach((p, idx) => {
      required.forEach((field) => {
        if (p[field] === undefined || p[field] === null || p[field] === '') {
          console.warn(`[ThreadCo Data Warning] Product index ${idx} is missing required field "${field}".`);
        }
      });
    });
  }

  validateProductData(PRODUCTS);

  /**
   * Helper functions
   */
  function getAllProducts() {
    return [...PRODUCTS];
  }

  function getProductById(id) {
    if (!id) return null;
    return PRODUCTS.find((p) => p.id === String(id).trim()) || null;
  }

  function getProductBySlug(slug) {
    if (!slug) return null;
    return PRODUCTS.find((p) => p.slug === String(slug).trim()) || null;
  }

  function getFeaturedProducts() {
    return PRODUCTS.filter((p) => p.featured);
  }

  function getCategories() {
    const cats = new Set(PRODUCTS.map((p) => p.category));
    return Array.from(cats);
  }

  /**
   * Formats currency according to Indian Rupee standard (e.g., ₹799, ₹1,499)
   */
  function formatPrice(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
    try {
      return new Intl.NumberFormat(STORE_CONFIG.locale, {
        style: 'currency',
        currency: STORE_CONFIG.currency,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      return `${STORE_CONFIG.currencySymbol}${amount.toLocaleString('en-IN')}`;
    }
  }

  return {
    STORE_CONFIG,
    PRODUCTS,
    getAllProducts,
    getProductById,
    getProductBySlug,
    getFeaturedProducts,
    getCategories,
    formatPrice
  };
});
