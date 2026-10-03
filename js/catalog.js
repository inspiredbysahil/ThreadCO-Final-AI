/**
 * ThreadCo - Catalog Controller (Product.html)
 * Manages product rendering, case-insensitive search with '/' shortcut,
 * category filtering, price range filter, sorting, dynamic counts, and empty states.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['./products.js', './storage.js', './ui.js'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./products.js'), require('./storage.js'), require('./ui.js'));
  } else {
    root.ThreadCo = root.ThreadCo || {};
    Object.assign(root.ThreadCo, factory(root.ThreadCo, root.ThreadCo, root.ThreadCo));
  }
})(typeof self !== 'undefined' ? self : this, function (productsModule, storageModule, uiModule) {
  'use strict';

  const getAllProducts = productsModule && productsModule.getAllProducts
    ? productsModule.getAllProducts
    : () => [];

  const formatPrice = productsModule && productsModule.formatPrice
    ? productsModule.formatPrice
    : (n) => `₹${n}`;

  const storage = storageModule || {
    isWishlisted: () => false
  };

  const ui = uiModule || {
    openQuickAddModal: () => {}
  };

  function initCatalog() {
    const grid = document.getElementById('grid');
    if (!grid) return; // Not on catalogue page

    const catalogueSection = document.getElementById('catalogue');
    const sidebar = document.getElementById('sidebar');

    // 1. Add Search bar if not already present
    injectSearchBar(catalogueSection || sidebar);

    // 2. Add Mobile Filter toggle button for tablets & mobile
    injectMobileFilterToggle(sidebar);

    // 3. Setup Filter inputs
    setupFilterListeners();

    // 4. Initial Render
    applyFiltersAndRender();

    // 4. Setup Keyboard Shortcut '/' to focus search
    document.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (e.key === '/' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        const searchInput = document.getElementById('tc-search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }
    });

    // 5. Grid button delegation
    grid.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-action="quick-add"]');
      if (addBtn) {
        e.preventDefault();
        const pId = addBtn.dataset.productId;
        if (pId) ui.openQuickAddModal(pId);
      }
    });
  }

  function injectSearchBar(parentSection) {
    if (document.getElementById('tc-search-wrap')) return;

    const searchWrap = document.createElement('div');
    searchWrap.id = 'tc-search-wrap';
    searchWrap.className = 'tc-search-wrap';
    searchWrap.innerHTML = `
      <div class="tc-search-inner">
        <svg class="tc-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="tc-search-input" class="tc-search-input" placeholder="Search by drop name, category, or SKU... (Press '/' to focus)" aria-label="Search products">
        <button type="button" id="tc-search-clear" class="tc-search-clear" aria-label="Clear search" style="display: none;">&times;</button>
      </div>
    `;

    if (parentSection && parentSection.id === 'catalogue') {
      parentSection.appendChild(searchWrap);
    } else {
      const mainProd = document.getElementById('main-product');
      if (mainProd) mainProd.insertBefore(searchWrap, mainProd.querySelector('h2').nextSibling);
    }

    const searchInput = document.getElementById('tc-search-input');
    const clearBtn = document.getElementById('tc-search-clear');

    if (searchInput && clearBtn) {
      searchInput.addEventListener('input', () => {
        clearBtn.style.display = searchInput.value.trim() ? 'block' : 'none';
        applyFiltersAndRender();
      });

      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.focus();
        applyFiltersAndRender();
      });
    }
  }

  function injectMobileFilterToggle(sidebar) {
    if (!sidebar || document.getElementById('tc-mobile-filter-toggle')) return;
    const layout = document.getElementById('product-layout');
    if (!layout) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'tc-mobile-filter-toggle';
    toggleBtn.className = 'tc-mobile-filter-btn';
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-controls', 'sidebar');
    toggleBtn.innerHTML = `
      <div class="tc-mobile-filter-btn-inner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
        </svg>
        <span>Filter & Sort Products</span>
      </div>
      <span class="tc-filter-indicator" aria-hidden="true">▾</span>
    `;

    layout.parentNode.insertBefore(toggleBtn, layout);

    toggleBtn.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('is-mobile-filter-open');
      toggleBtn.classList.toggle('is-active', isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      const indicator = toggleBtn.querySelector('.tc-filter-indicator');
      if (indicator) indicator.textContent = isOpen ? '▴' : '▾';
    });
  }

  function setupFilterListeners() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // Category checkboxes
    const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => applyFiltersAndRender());
    });

    // Min / Max inputs
    const minInput = document.getElementById('Minimum');
    const maxInput = document.getElementById('Maximum');
    if (minInput) minInput.addEventListener('input', () => applyFiltersAndRender());
    if (maxInput) maxInput.addEventListener('input', () => applyFiltersAndRender());

    // Sort select
    const sortSelect = document.getElementById('sort By') || sidebar.querySelector('select');
    if (sortSelect) sortSelect.addEventListener('change', () => applyFiltersAndRender());

    // Apply button
    const applyBtn = sidebar.querySelector('button[type="button"]');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => applyFiltersAndRender());
    }

    // Clear All button
    const clearBtn = sidebar.querySelector('button[type="reset"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearAllFilters();
      });
    }
  }

  function clearAllFilters() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const checkboxes = sidebar.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => { cb.checked = false; });

      const minInput = document.getElementById('Minimum');
      const maxInput = document.getElementById('Maximum');
      if (minInput) minInput.value = '';
      if (maxInput) maxInput.value = '';

      const sortSelect = document.getElementById('sort By') || sidebar.querySelector('select');
      if (sortSelect) sortSelect.selectedIndex = 0;
    }

    const searchInput = document.getElementById('tc-search-input');
    const clearBtn = document.getElementById('tc-search-clear');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    applyFiltersAndRender();
  }

  function applyFiltersAndRender() {
    const all = getAllProducts();
    const searchInput = document.getElementById('tc-search-input');
    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // 1. Gather active categories
    const selectedCategories = [];
    const cbTshirt = document.getElementById('tshirt');
    const cbHoodies = document.getElementById('hoodies');
    const cbCargo = document.getElementById('Cargo Pants');
    const cbCaps = document.getElementById('caps');
    const cbAcc = document.getElementById('Accessories');

    if (cbTshirt && cbTshirt.checked) selectedCategories.push('T-Shirts');
    if (cbHoodies && cbHoodies.checked) selectedCategories.push('Hoodies');
    if (cbCargo && cbCargo.checked) selectedCategories.push('Cargo Pants');
    if (cbCaps && cbCaps.checked) selectedCategories.push('Caps');
    if (cbAcc && cbAcc.checked) selectedCategories.push('Accessories');

    // 2. Gather Price Range
    const minInput = document.getElementById('Minimum');
    const maxInput = document.getElementById('Maximum');
    const minPrice = minInput && minInput.value !== '' ? Number(minInput.value) : 0;
    const maxPrice = maxInput && maxInput.value !== '' ? Number(maxInput.value) : Infinity;

    // 3. Filter products
    let filtered = all.filter((p) => {
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category)) {
        return false;
      }

      // Price filter
      if (p.price < minPrice || p.price > maxPrice) {
        return false;
      }

      // Search query (case-insensitive across name, category, SKU)
      if (searchQuery) {
        const matchName = (p.name || '').toLowerCase().includes(searchQuery);
        const matchCategory = (p.category || '').toLowerCase().includes(searchQuery);
        const matchSku = (p.sku || '').toLowerCase().includes(searchQuery);
        if (!matchName && !matchCategory && !matchSku) {
          return false;
        }
      }

      return true;
    });

    // 4. Sort products
    const sortSelect = document.getElementById('sort By') || document.querySelector('#sidebar select');
    const sortVal = sortSelect ? sortSelect.value : 'Most Popular';

    if (sortVal === 'Price : Low to High') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortVal === 'Price : High to Low') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortVal === 'Newest First') {
      filtered.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    } else {
      // Default: Most Popular
      filtered.sort((a, b) => (a.rank || 99) - (b.rank || 99));
    }

    // 5. Update count badge in header
    updateCountDisplay(filtered.length, all.length);

    // 6. Render product cards in grid
    renderGrid(filtered);
  }

  function updateCountDisplay(filteredCount, totalCount) {
    const catalogueSection = document.getElementById('catalogue');
    if (!catalogueSection) return;

    let countP = catalogueSection.querySelector('.tc-count-text');
    if (!countP) {
      // Target existing "Showing 8 products" paragraph
      const paragraphs = catalogueSection.querySelectorAll('p');
      paragraphs.forEach((p) => {
        if (p.textContent.includes('Showing')) {
          countP = p;
          countP.classList.add('tc-count-text');
        }
      });
    }

    if (countP) {
      if (filteredCount === totalCount) {
        countP.innerHTML = `Showing <strong>${filteredCount} ${filteredCount === 1 ? 'product' : 'products'}</strong>`;
      } else {
        countP.innerHTML = `Showing <strong>${filteredCount} of ${totalCount} products</strong>`;
      }
    }
  }

  function renderGrid(products) {
    const grid = document.getElementById('grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (products.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'tc-catalog-empty';
      emptyState.innerHTML = `
        <div class="tc-empty-icon">🔍</div>
        <h3>No products found</h3>
        <p>No drops match your selected filters. Try broadening your criteria.</p>
        <button type="button" class="tc-btn tc-btn-primary" id="tc-clear-filters-btn">Clear All Filters</button>
      `;
      grid.appendChild(emptyState);

      const btn = emptyState.querySelector('#tc-clear-filters-btn');
      if (btn) btn.onclick = clearAllFilters;
      return;
    }

    products.forEach((p) => {
      const article = document.createElement('article');
      article.setAttribute('data-product-id', p.id);

      const isWish = storage.isWishlisted(p.id);

      // Figure & Image
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      figure.appendChild(img);

      // Wishlist toggle button
      const wishBtn = document.createElement('button');
      wishBtn.type = 'button';
      wishBtn.className = `tc-wishlist-toggle ${isWish ? 'is-active' : ''}`;
      wishBtn.setAttribute('data-action', 'toggle-wishlist');
      wishBtn.setAttribute('data-product-id', p.id);
      wishBtn.setAttribute('aria-label', `Save ${p.name} to wishlist`);
      wishBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
      figure.appendChild(wishBtn);

      // Discount badge
      if (p.discount) {
        const mark = document.createElement('mark');
        mark.textContent = `${p.discount}% OFF`;
        figure.appendChild(mark);
      }

      // Title
      const h3 = document.createElement('h3');
      h3.textContent = p.name;

      // Category
      const pCat = document.createElement('p');
      pCat.innerHTML = `Category: <span>${p.category}</span>`;

      // Price
      const pPrice = document.createElement('p');
      pPrice.innerHTML = `Price : <strong>${formatPrice(p.price)}</strong> <s>${formatPrice(p.compareAtPrice)}</s>`;

      // Actions
      const viewLink = document.createElement('a');
      viewLink.href = `Product detail.html?id=${encodeURIComponent(p.id)}`;
      viewLink.textContent = 'View Detail';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.setAttribute('data-action', 'quick-add');
      addBtn.setAttribute('data-product-id', p.id);
      addBtn.textContent = 'Add to Cart';

      article.appendChild(figure);
      article.appendChild(h3);
      article.appendChild(pCat);
      article.appendChild(pPrice);
      article.appendChild(viewLink);
      article.appendChild(addBtn);

      grid.appendChild(article);
    });
  }

  return {
    initCatalog,
    applyFiltersAndRender,
    clearAllFilters
  };
});
