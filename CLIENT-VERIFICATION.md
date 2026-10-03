# ThreadCo — Client Verification & Launch Checklist

> **CRITICAL PRE-LAUNCH NOTICE FOR THE THREADCO TEAM:**  
> Before connecting payment gateways or driving public advertising traffic to this store, the following business-specific claims, policies, and credentials must be confirmed and updated.

---

## 1. Business & Contact Information
- [ ] **Physical Address:** Currently listed as `42, Street Level, Hauz Khas Village, New Delhi — 110016`. Confirm if this is the registered business address or if the registered GST address must be displayed.
- [ ] **Customer Support Phone:** Currently listed as `+91 9876543210`. Replace with official toll-free or dedicated customer care WhatsApp / phone line.
- [ ] **Customer Support Email:** Currently listed as `hello@thread.co`. Verify mailbox is active and monitored.
- [ ] **Social Handles:**
  - Instagram: Check target URL in footer.
  - Threads: Confirm target profile URL.
  - YouTube: Confirm target channel URL.
- [ ] **Store Hours:** Currently displayed as Mon–Fri 10:00 AM – 7:00 PM, Sat 11:00 AM – 5:00 PM, Sun Closed. Verify whether walk-in retail visits are accepted at Hauz Khas.

---

## 2. Fulfillment, Shipping & Delivery Promises
- [ ] **Free Delivery Threshold:** Configured at **₹499**. Confirm whether free delivery threshold should remain ₹499 or be adjusted (e.g., ₹999 or ₹1499).
- [ ] **Standard Shipping Fee:** Configured at **₹79** for orders under ₹499. Confirm fee.
- [ ] **Dispatch Promise:** Website claims *"Ships within 48 hours"*. Confirm warehouse capacity can fulfill this guarantee during high-volume drops.
- [ ] **Delivery Timelines:** Currently stated as 3–5 business days standard, 1–2 days express. Confirm courier SLA agreements (Delhivery, BlueDart, Xpressbees).
- [ ] **Cash on Delivery (COD):** Confirm COD is enabled across all serviceable PIN codes, and whether an additional COD collection fee applies.
- [ ] **International Shipping:** Site currently states *"International shipping planned for early 2026"*. Confirm if cross-border orders should be blocked at checkout.

---

## 3. Returns & Exchange Terms
- [ ] **Return Window:** Currently stated as *"Free returns within 7 days, no questions asked"*. Confirm reverse-logistics arrangements and whether return courier costs are borne by ThreadCo.
- [ ] **Exchange Policy:** Due to limited drops, confirm policy if a customer requests a size exchange on a sold-out item (refund vs store credit).

---

## 4. Product Catalog & Specifications
- [ ] **Oversized Drop Tee Vol.3:**
  - SKU: `TC-OT-VOL3-BLK`
  - Price: ₹799 | MRP: ₹1199 | Discount: 33%
  - Fabric: 100% Cotton, 240 GSM heavyweight
  - Sizes: S, M, L, XL, XXL
  - Colors listed: Black, White, Washed Grey, Olive. Confirm whether additional colorways are being launched simultaneously.
  - Artist Credit: Currently attributed to *"Delhi-based artist Arjun Mehra"*. Verify agreement and attribution naming.
- [ ] **Street Hoodie - Olive:**
  - Price: ₹1499 | MRP: ₹1999 | Discount: 25%
  - Fabric: Currently listed as 80% Cotton, 20% Polyester. Confirm exact fabric composition.
  - Available Sizes: S, M, L, XL.
  - Colors: Confirm Olive only or upcoming colorways.
- [ ] **Utility Cargo - Beige:**
  - Price: ₹1799 | MRP: ₹2499 | Discount: 28%
  - Fabric: 100% Cotton Twill.
  - Available Sizes: 28, 30, 32, 34, 36.
- [ ] **TC 6-Panel Cap:**
  - Price: ₹499 | MRP: ₹699 | Discount: 28%
  - Fabric & Buckle Material: Currently marked as *"Client to confirm"*. Provide exact material specs.
  - Naming: Standardized to "TC 6-Panel Cap" (corrected from "Cape").
- [ ] **Inventory / Stock Quantities:** Actual inventory is currently set to `stock: null` (handled safely in frontend). Real-time inventory deduction must be connected via backend database.

---

## 5. Reviews & Ratings
- [ ] **Drop Tee Reviews:** The 3 reviews on `Product detail.html` (Rahul K., Priya S., Aryan M. rating 4.9/5) are currently preserved as initial content. Client must confirm whether to retain these initial verified reviews or connect an automated post-purchase review collection service (e.g., Judge.me / Stamped / custom DB).
- [ ] **Other Products Reviews:** Hoodies, Cargos, and Caps currently display *"No reviews yet"*. Maintain until real customers submit verified reviews.

---

## 6. Marketing & Sustainability Claims
- [ ] **"Made in India":** Confirm all manufacturing, dyeing, and stitching takes place in domestic facilities.
- [ ] **"GOTS-Certified Cotton":** Website claims GOTS-certified organic cotton in the "Our Promise" section. Confirm certificates are on file with the compliance department.
- [ ] **Artist Support:** Site claims *"Every drop supports an independent Indian artist"*. Verify royalty/licensing contracts.

---

## 7. Legal Policies (Must Be Approved by Legal Counsel)
- [ ] **Privacy Policy (`privacy.html`):** Replace template text with company's registered entity privacy policy compliant with Indian DPDP (Digital Personal Data Protection) Act 2023.
- [ ] **Terms & Conditions (`terms.html`):** Replace template text with approved terms of service.
- [ ] **Shipping Policy (`shipping.html`):** Confirm final courier SLAs.
- [ ] **Returns Policy (`returns.html`):** Confirm refund processing timelines.

---

## 8. Backend & Payment Gateway Credentials
- [ ] **Payment Gateway Account:** Sign up with Razorpay or Cashfree.
- [ ] **Server Endpoints:** Connect real endpoints for:
  - `POST /api/orders/create`
  - `POST /api/orders/verify`
  - `POST /api/contact`
  - `POST /api/newsletter`
- [ ] **Toggle Demo Mode:** Once backend is live, update `demoMode: false` in `js/products.js`.
