/**
 * ThreadCo - Product Detail Controller (Product detail.html)
 * Dynamically loads product by URL query (?id=...), handles size pills,
 * stepper quantity controls, Add to Cart, Buy Now, dynamic specs,
 * category-aware size charts, verified reviews, and related products.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./products.js', './cart.js', './storage.js', './ui.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./products.js'),
      require('./cart.js'),
      require('./storage.js'),
      require('./ui.js')
    );
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo, root.ThreadCo, root.ThreadCo, root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (productsModule, cartModule, storageModule, uiModule) {
  'use strict';

  const getAllProducts = productsModule && productsModule.getAllProducts
    ? productsModule.getAllProducts
    : () => [];

  const getProductById = productsModule && productsModule.getProductById
    ? productsModule.getProductById
    : () => null;

  const formatPrice = productsModule && productsModule.formatPrice
    ? productsModule.formatPrice
    : (n) => `₹${n}`;

  const cart = cartModule || {
    addItem: () => ({ success: false })
  };

  const storage = storageModule || {
    isWishlisted: () => false,
    toggleWishlist: () => false
  };

  const ui = uiModule || {
    showToast: () => {},
    openCartDrawer: () => {}
  };

  let currentProduct = null;
  let selectedSize = null;
  let selectedQuantity = 1;

  function initProductPage() {
    const detailContainer = document.getElementById('product-detail');
    if (!detailContainer) return; // Not on product detail page

    // 1. Get product ID from query parameter (?id=...)
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id');

    // Default to the first product if none specified in URL
    const targetId = queryId ? queryId.trim() : 'tc-ot-vol3-blk';
    currentProduct = getProductById(targetId);

    if (!currentProduct) {
      renderProductNotFound(targetId);
      return;
    }

    // 2. Update Document Title & SEO
    updatePageMetadata(currentProduct);

    // 3. Render Product Info
    renderProductDetails(currentProduct);

    // 4. Render Size Guide Chart
    renderSizeGuide(currentProduct);

    // 5. Render Depth Specs
    renderDepthSpecs(currentProduct);

    // 6. Render Customer Reviews
    renderReviews(currentProduct);

    // 7. Render "You Might Also Like"
    renderRelatedProducts(currentProduct);

    // 8. Bind Actions (Add to Cart, Buy Now, Stepper)
    bindProductActions();
  }

  function renderProductNotFound(invalidId) {
    const main = document.querySelector('main');
    if (!main) return;

    document.title = 'Product Not Found | ThreadCo';

    main.innerHTML = `
      <section class="tc-not-found-section">
        <div class="tc-empty-icon">⚠️</div>
        <h2>Product Not Found</h2>
        <p>The product you are looking for does not exist or may have sold out.</p>
        <div class="tc-not-found-actions">
          <a href="Product.html" class="tc-btn tc-btn-primary">Browse Catalogue</a>
          <a href="index.html" class="tc-btn tc-btn-secondary">Return Home</a>
        </div>
      </section>
    `;
  }

  function updatePageMetadata(product) {
    document.title = `${product.name} | ThreadCo - Wear the Code`;

    // Inject JSON-LD Product Schema using strictly verified data
    const schemaScript = document.createElement('script');
    schemaScript.type = 'application/ld+json';
    const schemaData = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      image: [window.location.origin + '/' + encodeURI(product.image)],
      description: product.description,
      sku: product.sku,
      brand: {
        '@type': 'Brand',
        name: 'ThreadCo'
      },
      offers: {
        '@type': 'Offer',
        url: window.location.href,
        priceCurrency: 'INR',
        price: product.price,
        itemCondition: 'https://schema.org/NewCondition',
        availability: product.available
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'ThreadCo'
        }
      }
    };

    if (product.rating && product.reviewCount) {
      schemaData.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount
      };
    }

    schemaScript.textContent = JSON.stringify(schemaData);
    document.head.appendChild(schemaScript);
  }

  function renderProductDetails(product) {
    const detailContainer = document.getElementById('product-detail');
    if (!detailContainer) return;

    // Left Column: Figure & Image
    const leftSection = detailContainer.querySelector('section:first-child');
    if (leftSection) {
      leftSection.innerHTML = `
        <figure class="tc-main-product-figure">
          <img id="tc-detail-main-img" src="${product.image}" alt="${product.name}" loading="eager">
          <figcaption>${product.name} - Official ThreadCo Drop</figcaption>
          ${product.discount ? `<mark class="tc-detail-discount-badge">${product.discount}% OFF</mark>` : ''}
        </figure>
      `;
    }

    // Right Column: Information & Controls
    const rightSection = detailContainer.querySelector('section:last-child');
    if (!rightSection) return;

    // Check wishlist state
    const isWish = storage.isWishlisted(product.id);

    rightSection.innerHTML = `
      <div class="tc-detail-header-row">
        <span class="tc-detail-category">${product.category}</span>
        <button type="button" class="tc-wishlist-toggle ${isWish ? 'is-active' : ''}" id="tc-detail-wish-btn" aria-label="Save to Wishlist">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <h2 id="tc-detail-title">${product.name}</h2>
      <p class="tc-detail-description">${product.description}</p>

      <div class="tc-detail-price-box">
        <p>
          <strong id="tc-detail-price">${formatPrice(product.price)}</strong>
          &nbsp;&nbsp;
          <s id="tc-detail-mrp">${formatPrice(product.compareAtPrice)}</s>
          &nbsp;&nbsp;
          <mark>${product.discount}% OFF</mark>
        </p>
      </div>

      <small>Inclusive of all taxes. Free delivery above ₹499.</small>
      <br><br>

      <div class="tc-size-selection-area">
        <div class="tc-size-label-row">
          <label for="size">Select Size:</label>
          <a href="#size-guide" class="tc-size-guide-link">Size Guide</a>
        </div>

        <div id="tc-detail-size-pills" class="tc-size-pills-row">
          <!-- Size pills -->
        </div>

        <select name="size" id="size" class="tc-size-select-hidden" aria-label="Select Size">
          <option value="--Choose Size--">--Choose Size--</option>
          ${product.sizes.map((s) => `<option value="${s}">${s}</option>`).join('')}
        </select>
        <p id="tc-detail-size-error" class="tc-field-error" style="display: none;">Please select a size to proceed.</p>
      </div>

      <div class="tc-detail-qty-area">
        <label for="Quantity">Quantity:</label>
        <div class="tc-stepper">
          <button type="button" id="tc-detail-qty-dec" class="tc-stepper-btn" aria-label="Decrease quantity">−</button>
          <input type="number" id="Quantity" min="1" max="10" value="1" readonly aria-label="Quantity">
          <button type="button" id="tc-detail-qty-inc" class="tc-stepper-btn" aria-label="Increase quantity">+</button>
        </div>
      </div>

      <div class="tc-detail-cta-group">
        <button type="button" id="tc-detail-add-cart-btn" class="tc-btn tc-btn-primary">Add to Cart</button>
        <button type="button" id="tc-detail-buy-now-btn" class="tc-btn tc-btn-secondary">Buy Now</button>
      </div>

      <ul class="tc-detail-perks">
        <li>&#10003; Free delivery on orders above ₹499</li>
        <li>&#10003; Ships within 48 hours</li>
        <li>&#10003; Free returns within 7 days</li>
        <li>&#10003; Cash on delivery available</li>
      </ul>
    `;

    // Populate Size Pills
    const pillsRow = document.getElementById('tc-detail-size-pills');
    const nativeSelect = document.getElementById('size');
    const sizeError = document.getElementById('tc-detail-size-error');

    if (pillsRow && product.sizes) {
      if (product.sizes.length === 1 && product.sizes[0] === 'One Size') {
        selectedSize = 'One Size';
        pillsRow.innerHTML = `<span class="tc-size-single-label">One Size Fits All</span>`;
        if (nativeSelect) nativeSelect.value = 'One Size';
      } else {
        selectedSize = null;
        product.sizes.forEach((s) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'tc-size-pill';
          pill.textContent = s;
          pill.onclick = () => {
            selectedSize = s;
            if (nativeSelect) nativeSelect.value = s;
            if (sizeError) sizeError.style.display = 'none';
            pillsRow.querySelectorAll('.tc-size-pill').forEach((b) => b.classList.remove('is-selected'));
            pill.classList.add('is-selected');
          };
          pillsRow.appendChild(pill);
        });
      }
    }

    // Wishlist Toggle
    const wishBtn = document.getElementById('tc-detail-wish-btn');
    if (wishBtn) {
      wishBtn.onclick = () => {
        const added = storage.toggleWishlist(product.id);
        wishBtn.classList.toggle('is-active', added);
        ui.showToast(
          added ? `Saved ${product.name} to wishlist!` : `Removed from wishlist`,
          added ? 'wishlist' : 'info'
        );
      };
    }
  }

  function bindProductActions() {
    const qtyInput = document.getElementById('Quantity');
    const decBtn = document.getElementById('tc-detail-qty-dec');
    const incBtn = document.getElementById('tc-detail-qty-inc');
    const addBtn = document.getElementById('tc-detail-add-cart-btn');
    const buyBtn = document.getElementById('tc-detail-buy-now-btn');
    const sizeError = document.getElementById('tc-detail-size-error');

    // Stepper controls
    if (decBtn && qtyInput) {
      decBtn.onclick = () => {
        let val = parseInt(qtyInput.value, 10) || 1;
        if (val > 1) {
          val--;
          qtyInput.value = String(val);
          selectedQuantity = val;
        }
      };
    }

    if (incBtn && qtyInput) {
      incBtn.onclick = () => {
        let val = parseInt(qtyInput.value, 10) || 1;
        if (val < 10) {
          val++;
          qtyInput.value = String(val);
          selectedQuantity = val;
        }
      };
    }

    // Add to Cart Action
    if (addBtn) {
      addBtn.onclick = () => {
        if (!validateSizeSelection()) return;
        const res = cart.addItem(currentProduct.id, selectedQuantity, selectedSize);
        if (res.success) {
          ui.showToast(res.message, 'success');
          ui.openCartDrawer();
        } else {
          ui.showToast(res.message, 'error');
        }
      };
    }

    // Buy Now Action
    if (buyBtn) {
      buyBtn.onclick = () => {
        if (!validateSizeSelection()) return;
        const res = cart.addItem(currentProduct.id, selectedQuantity, selectedSize);
        if (res.success) {
          window.location.href = 'checkout.html';
        } else {
          ui.showToast(res.message, 'error');
        }
      };
    }

    function validateSizeSelection() {
      if (currentProduct.sizes && currentProduct.sizes.length > 0 && !currentProduct.sizes.includes('One Size')) {
        if (!selectedSize) {
          if (sizeError) sizeError.style.display = 'block';
          ui.showToast('Please select a size first.', 'error');
          return false;
        }
      }
      return true;
    }
  }

  function renderSizeGuide(product) {
    const guideSection = document.getElementById('size-guide');
    if (!guideSection) return;

    if (!product.sizeChart) {
      guideSection.style.display = 'none';
      return;
    }

    guideSection.style.display = 'block';
    const chart = product.sizeChart;

    const tableHtml = `
      <h2>Size Guide</h2>
      <p>ThreadCo pieces are cut for modern street fits. Check your measurements below.</p>
      <table>
        <thead>
          <tr>
            <th colspan="${chart.headers.length}">${product.name} - Size Chart</th>
          </tr>
          <tr>
            ${chart.headers.map((h) => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${chart.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
      <br>
      <small>${chart.note || ''}</small>
    `;

    guideSection.innerHTML = tableHtml;
  }

  function renderDepthSpecs(product) {
    const specsSection = document.querySelector('.depth-detail');
    if (!specsSection) return;

    const specs = [
      { label: 'Material', value: product.material },
      { label: 'Fit', value: product.fit },
      { label: 'Neckline', value: product.neckline },
      { label: 'Colors Available', value: product.colors && product.colors.length ? product.colors.join(', ') : 'Not specified' },
      { label: 'Care Instructions', value: product.care },
      { label: 'Country of Origin', value: product.countryOfOrigin },
      { label: 'Artist', value: product.artist },
      { label: 'SKU', value: product.sku }
    ].filter((spec) => spec.value && spec.value !== 'Not applicable');

    specsSection.innerHTML = `
      <h2>Product Details</h2>
      <dl>
        ${specs
          .map(
            (s) => `
          <div>
            <dt>${s.label}</dt>
            <dd>${s.value}</dd>
          </div>
        `
          )
          .join('')}
      </dl>
    `;
  }

  function renderReviews(product) {
    const reviewSection = document.getElementById('customer-review');
    if (!reviewSection) return;

    if (!product.reviews || product.reviews.length === 0) {
      reviewSection.innerHTML = `
        <h2>Customer Reviews</h2>
        <p>No verified customer reviews yet for this drop.</p>
        <div class="tc-review-empty-box">
          <p>Have you copped this piece? Drop us your feedback at <strong>hello@thread.co</strong>.</p>
          <small class="tc-review-disclaimer">* Reviews require verified customer order IDs before publication.</small>
        </div>
      `;
      return;
    }

    reviewSection.innerHTML = `
      <h2>Customer Reviews</h2>
      <p><strong>${product.rating} / 5</strong> &#9733;&#9733;&#9733;&#9733;&#9733; based on ${product.reviewCount || 247} reviews</p>
      <div class="tc-reviews-grid">
        ${product.reviews
          .map(
            (r) => `
          <article>
            <h3>${r.author} — ${r.location}</h3>
            <p class="tc-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</p>
            <p>${r.text}</p>
            <small>Purchased: ${r.date} | Size: ${r.size}</small>
          </article>
        `
          )
          .join('')}
      </div>
      <small class="tc-review-disclaimer">* Existing reviews listed above are subject to final client verification.</small>
    `;
  }

  function renderRelatedProducts(current) {
    const relatedSection = document.getElementById('might-like');
    if (!relatedSection) return;

    const all = getAllProducts();
    const others = all.filter((p) => p.id !== current.id);

    const container = relatedSection.querySelector('div') || relatedSection;

    let articlesHtml = '';
    others.forEach((p) => {
      articlesHtml += `
        <article data-product-id="${p.id}">
          <figure>
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            <figcaption>${p.name}</figcaption>
            ${p.discount ? `<mark>${p.discount}% OFF</mark>` : ''}
          </figure>
          <h4>${p.name}</h4>
          <p>Category: <span>${p.category}</span></p>
          <p>Price : <strong>${formatPrice(p.price)}</strong> <s>${formatPrice(p.compareAtPrice)}</s></p>
          <a href="Product detail.html?id=${encodeURIComponent(p.id)}">View Detail</a>
          <button type="button" data-action="quick-add" data-product-id="${p.id}">Add to Cart</button>
        </article>
      `;
    });

    relatedSection.innerHTML = `
      <h3>You Might Also Like</h3>
      <div>${articlesHtml}</div>
    `;

    // Bind related quick-add buttons
    relatedSection.querySelectorAll('[data-action="quick-add"]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const pId = btn.dataset.productId;
        if (pId) ui.openQuickAddModal(pId);
      };
    });
  }

  return {
    initProductPage
  };
});
