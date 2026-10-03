# ThreadCo — Modern E-Commerce Frontend

> **Wear the Code. Live the Street.**  
> A production-ready, interactive vanilla JavaScript e-commerce frontend for ThreadCo, built with modern web standards, resilient state persistence, and responsive streetwear aesthetics.

---

## 1. Project Overview

ThreadCo is an independent Indian streetwear label based out of Hauz Khas Village, New Delhi, known for heavyweight 240 GSM cotton drops, boxy cuts, and weekly limited releases.

This codebase transforms the static HTML/CSS presentation into an interactive, client-handover-ready ecommerce experience using clean, modular vanilla JavaScript.

### Core Architecture Highlights
- **Framework-Free Vanilla JS:** Clean, modular ES/UMD architecture with zero runtime dependencies.
- **Single Source of Truth (`js/products.js`):** Unified product catalog feeding product cards, detail views, search, quick add, and cart calculations.
- **Cart Persistence:** Versioned `localStorage` (`threadco_cart_v1`) supporting variant line separation (e.g., Tee / M vs Tee / L) and defensive corruption auto-recovery.
- **Global Slide-Over Cart Drawer:** Interactive slide-over cart available across all pages with real-time free shipping threshold tracking.
- **Indian Ecommerce Ready:** Standard Indian currency formatting (`₹`), 10-digit mobile validation, 6-digit PIN code validation, Indian states selector, and Indian Payment Gateway integration interface.
- **SEO & Accessibility:** Valid JSON-LD Product Schema, Open Graph metadata, semantic markup, ARIA dialog roles, focus management, Escape key support, and `prefers-reduced-motion` compliance.

---

## 2. Directory Structure

```text
/
├── index.html               # Home landing page with hero, weekly drop, and newsletter
├── Product.html             # The Catalogue with search, filtering, and sorting
├── Product detail.html      # Dynamic Product Detail template (?id=tc-ot-vol3-blk)
├── cart.html                # Dedicated Shopping Bag page with promo code input
├── checkout.html            # Indian address checkout with COD & Online payment simulation
├── order-success.html       # Receipt and confirmation page with printable view
├── contact.html             # Contact form with file validation and FAQ accordion
├── privacy.html             # Privacy Policy (Template for legal review)
├── terms.html               # Terms & Conditions (Template for legal review)
├── shipping.html            # Shipping Policy (Free delivery above ₹499)
├── returns.html             # Returns & Refunds Policy (7-day window)
├── style.css                # Complete brand stylesheet with responsive breakpoints
├── robots.txt               # Search engine crawler directives
├── sitemap.xml              # XML Sitemap for search indexing
│
├── js/
│   ├── products.js          # Central product database & store config (STORE_CONFIG)
│   ├── storage.js           # Versioned localStorage abstraction & memory fallback
│   ├── cart.js              # Cart domain logic, variant keys, & financial calculations
│   ├── ui.js                # Toasts, Cart Drawer, Quick Add Modal, & Hamburger Nav
│   ├── catalog.js           # Catalogue filtering, search (shortcut '/'), & sorting
│   ├── product-page.js      # Product detail controller, size pills, & related drops
│   ├── checkout.js          # Checkout validation, payment architecture, & order creation
│   ├── forms.js             # Form validation (5MB file limits) & newsletter handler
│   └── app.js               # Application bootstrap, routing, & DOM lifecycle
│
├── product 1.jpg            # Oversized Drop Tee Vol.3 (product image)
├── product 2.jpg            # Street Hoodie - Olive (product image)
├── product 3.jpg            # Utility Cargo - Beige (product image)
├── product 4.jpg            # TC 6-Panel Cap (product image)
│
├── CLIENT-VERIFICATION.md   # Pre-launch business verification checklist
└── README.md                # Comprehensive engineer & client handbook
```

---

## 3. How to Run Locally

Because the project is built on standard web technologies, you can run it in multiple ways:

### Option A: Local HTTP Server (Recommended)
Using Node.js:
```bash
# Serve current directory using npx serve
npx --yes serve . -p 3000
```
Then open: `http://localhost:3000`

Using Python (if installed):
```bash
python -m http.server 8000
```
Then open: `http://localhost:8000`

Using VS Code / IDE:
- Right-click `index.html` and click **"Open with Live Server"**.

### Option B: Direct File Inspection
You can double-click `index.html` in Windows Explorer (`file:///C:/.../index.html`). The JavaScript architecture is built with UMD fallback wrappers so it does not trigger cross-origin restrictions when opened as a local file.

---

## 4. How the Cart System Works

1. **Guest Shopping:** No account or login is required to browse, add to cart, or proceed through the demo checkout.
2. **Variant Separation:** Products with different sizes are treated as distinct line items:
   ```javascript
   // Internal line key format:
   `${productId}__${size}__${color}`
   // Example: tc-ot-vol3-blk__m__default and tc-ot-vol3-blk__l__default
   ```
3. **Persistence:** Saved in `localStorage` under `threadco_cart_v1`.
4. **Data Corruption Recovery:** If a user's browser data contains malformed JSON or corrupted entries, `js/storage.js` safely catches the error, resets the state cleanly, and avoids crashing the website.
5. **Event Synchronization:** Every change emits `threadco:cart-updated`. The cart badge in the header (`Cart (X)`), the slide-over drawer, and dedicated `cart.html` synchronize instantly.

---

## 5. How Product Data Works & How to Add New Products

All product data is centralized in `js/products.js`. **Do not hardcode product cards into HTML.**

### Product Data Schema
```javascript
{
  id: "tc-ot-vol3-blk",                    // Unique immutable string ID
  name: "Oversized Drop Tee Vol.3",        // Display name
  slug: "oversized-drop-tee-vol-3",        // URL friendly slug
  category: "T-Shirts",                    // Category for filtering
  price: 799,                              // Selling price in INR
  compareAtPrice: 1199,                    // MRP in INR
  discount: 33,                            // % discount badge
  image: "product 1.jpg",                  // Image path
  sku: "TC-OT-VOL3-BLK",                   // Stock Keeping Unit
  available: true,                         // true = in stock, false = out of stock
  stockStatus: "in_stock",                 // "in_stock" | "low_stock" | "out_of_stock"
  featured: true,                          // Shown on homepage
  rank: 1,                                 // Popularity ranking
  sizes: ["S", "M", "L", "XL", "XXL"],     // Array of available sizes
  colors: ["Black", "White", "Washed Grey", "Olive"],
  rating: 4.9,                             // Verified rating or null
  reviewCount: 247,                        // Verified review count or null
  description: "...",                      // Editorial description
  material: "100% Cotton - 240 GSM",       // Fabric specification
  fit: "Oversized / Boxy cut",             // Fit specification
  neckline: "Ribbed crew neck",            // Collar / neck design
  care: "Machine wash cold...",            // Care instructions
  countryOfOrigin: "Made in India",
  artist: "Graphic by Arjun Mehra, New Delhi",
  sizeChart: { headers: [...], rows: [...] },
  reviews: [ ... ]
}
```

### To Add a New Product:
1. Open `js/products.js`.
2. Add a new object to the `PRODUCTS` array following the schema above.
3. Place the product image in the project root (or `assets/images/`).
4. The product will **automatically appear** in:
   - The Catalogue (`Product.html`) with search and category filtering.
   - Dynamic product detail pages via `Product detail.html?id=YOUR_NEW_ID`.
   - "You Might Also Like" cross-sell carousels.

---

## 6. Store Configuration & Rules

Store-wide financial and operational parameters are located at the top of `js/products.js`:

```javascript
const STORE_CONFIG = {
  brandName: 'ThreadCo',
  tagline: 'Wear the Code. Live the Street.',
  currency: 'INR',
  locale: 'en-IN',
  freeShippingThreshold: 499, // Orders >= ₹499 get free shipping
  standardShippingFee: 79,    // Shipping fee applied if subtotal < ₹499
  maxCartQuantity: 10,        // Max limit per cart line
  enableWishlist: true,
  enableCOD: true,
  enableOnlinePayment: true,
  demoMode: true,             // Set to false when connecting production backend
  coupons: [
    { code: 'THREAD10', type: 'percentage', value: 10, minOrder: 0 },
    { code: 'STREET20', type: 'percentage', value: 20, minOrder: 1000 },
    { code: 'FIRSTDROP', type: 'flat', value: 150, minOrder: 500 }
  ]
};
```

---

## 7. Payment Gateway Integration Architecture

In this frontend deliverable, checkout runs in **Development Demo Mode** with simulated order creation. **No secret keys are stored in frontend JavaScript.**

### Production Gateway Flow (e.g., Razorpay / Cashfree)

```text
Browser                       Backend Server                   Razorpay API
   │                                 │                              │
   │  1. POST /api/orders/create    │                              │
   │  { items, address, coupon }     │                              │
   ─────────────────────────────────>│                              │
   │                                 │ 2. Validate Prices & Stock   │
   │                                 │    Calculate Final Total     │
   │                                 │                              │
   │                                 │ 3. Create Gateway Order      │
   │                                 │─────────────────────────────>│
   │                                 │<─────────────────────────────│
   │                                 │    Returns gateway_order_id  │
   │  4. Returns { gatewayOrderId }  │                              │
   │<────────────────────────────────│                              │
   │                                                                │
   │  5. Open Razorpay Checkout Modal (using Public Key ONLY)       │
   │  User Completes Payment                                        │
   │                                                                │
   │  6. POST /api/orders/verify                                    │
   │  { payment_id, signature }      │                              │
   ─────────────────────────────────>│                              │
   │                                 │ 7. Verify Signature with     │
   │                                 │    Webhook / API Secret      │
   │  8. Returns Order Confirmation  │                              │
   │<────────────────────────────────│                              │
```

### Backend Contract Requirements:
- `POST /api/orders/create`:
  - Request: `{ items: [{ productId, size, quantity }], customer, shippingAddress, couponCode }`
  - Revalidates product prices, discounts, and inventory on the server.
  - Returns: `{ orderId, amount, currency: 'INR', gatewayOrderId }`
- `POST /api/orders/verify`:
  - Validates cryptographic signature using secret key on the server.
  - Updates order status to `PAID`.
- `POST /api/contact`:
  - Receives enquiry payload and optional file attachment.
  - Sends email via SendGrid, Resend, or AWS SES to `hello@thread.co`.
- `POST /api/newsletter`:
  - Adds email to Mailchimp, Klaviyo, or Brevo marketing list.

---

## 8. Deployment Instructions

This project is a static site with client-side routing and ES/vanilla JavaScript. It can be deployed in minutes on any modern static hosting platform:

### 1. Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` inside the project folder.
3. Accept defaults (Root directory `./`, Framework: `Other`).

### 2. Netlify
1. Drag and drop the project folder into [Netlify Drop](https://app.netlify.com/drop).
2. Or connect via GitHub repository with publish directory set to `./`.

### 3. GitHub Pages
1. Push repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Branch**, select `main` and `/ (root)`.
4. Click **Save**.

### 4. Cloudflare Pages
1. In Cloudflare Dashboard, select **Pages > Create a project**.
2. Connect your repository, set build command to empty, output directory to `./`.

---

## 9. Pre-Launch Client Verification

Refer to [`CLIENT-VERIFICATION.md`](CLIENT-VERIFICATION.md) for the mandatory pre-launch checklist covering legal policies, shipping guarantees, phone numbers, addresses, and artist attributions.
