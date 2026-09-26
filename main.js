/* ============================================================
   TECHKITCH — SHOP PAGE BEHAVIOR
   Renders products from products.js, handles search/filter/sort.
   ============================================================ */

let activeCategory = "All";
let searchTerm = "";
let sortMode = "featured";
let chipDragDist = 0;
let isChipDragActive = false;

function getCategories() {
  const cats = new Set(PRODUCTS.map((p) => p.category));
  return ["All", ...Array.from(cats).sort()];
}

function initCategoryDragScroll() {
  const wrap = document.querySelector(".js-categories");
  if (!wrap || wrap.dataset.dragInit) return;
  wrap.dataset.dragInit = "true";

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  wrap.addEventListener("mousedown", (e) => {
    isDown = true;
    chipDragDist = 0;
    isChipDragActive = false;
    startX = e.pageX - wrap.offsetLeft;
    scrollLeft = wrap.scrollLeft;
  });

  window.addEventListener("mouseup", () => {
    if (!isDown) return;
    isDown = false;
    wrap.classList.remove("is-dragging");
    setTimeout(() => {
      chipDragDist = 0;
      isChipDragActive = false;
    }, 60);
  });

  wrap.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    const x = e.pageX - wrap.offsetLeft;
    const diff = Math.abs(x - startX);
    if (diff > 4) {
      isChipDragActive = true;
      chipDragDist = diff;
      wrap.classList.add("is-dragging");
      e.preventDefault();
      wrap.scrollLeft = scrollLeft - (x - startX) * 1.4;
    }
  });
}

function renderCategoryChips() {
  const wrap = document.querySelector(".js-categories");
  if (!wrap) return;
  wrap.innerHTML = getCategories()
    .map(
      (cat) => `
      <button type="button" class="chip ${cat === activeCategory ? "chip--active" : ""}" data-category="${escapeHtml(cat)}">
        ${escapeHtml(cat)}
      </button>`
    )
    .join("");

  initCategoryDragScroll();

  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isChipDragActive || chipDragDist > 5) return;
      activeCategory = btn.dataset.category;
      renderCategoryChips();
      renderProducts();
      setTimeout(() => {
        const activeBtn = wrap.querySelector(".chip--active");
        if (activeBtn) {
          activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        }
      }, 50);
    });
  });
}

function getFilteredProducts() {
  let list = PRODUCTS.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (sortMode === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (sortMode === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (sortMode === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

function escapeHtml(str) {
  if (typeof str !== "string") return str;
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function productCard(p) {
  const outOfStock = p.stock <= 0;
  const discount = p.oldPrice ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
  const mainImage = (p.images && p.images.length > 0) ? p.images[0] : p.image;

  return `
    <article class="product-card ${outOfStock ? "product-card--oos" : ""}" data-card-id="${p.id}" tabindex="0" role="button" aria-label="View details for ${escapeHtml(p.name)}">
      <div class="product-card__media">
        <img src="${mainImage}" alt="${escapeHtml(p.name)}" loading="lazy" />
        ${p.badge ? `<span class="tag tag--${p.badge.toLowerCase().replace(/\s/g, "-")}">${escapeHtml(p.badge)}</span>` : ""}
        ${discount ? `<span class="product-card__discount-badge">-${discount}%</span>` : ""}
        ${outOfStock ? `<span class="tag tag--oos">Out of stock</span>` : ""}
        <div class="product-card__quick-overlay">
          <span class="product-card__view-hint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View Details
          </span>
        </div>
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${escapeHtml(p.category)}</span>
        <h3 class="product-card__name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
        <div class="product-card__footer">
          <div class="product-card__price-row">
            <span class="price-tag">${formatMoney(p.price)}</span>
            ${p.oldPrice ? `<span class="price-tag price-tag--old">${formatMoney(p.oldPrice)}</span>` : ""}
          </div>
          <button type="button" class="product-card__quick-add ${outOfStock ? "btn--disabled" : ""}"
            data-add="${p.id}" title="${outOfStock ? "Out of stock" : "Quick Add to Cart"}" ${outOfStock ? "disabled" : ""} aria-label="Add ${escapeHtml(p.name)} to cart">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>
    </article>`;
}

function renderProducts() {
  const grid = document.querySelector(".js-product-grid");
  const empty = document.querySelector(".js-empty-state");
  const count = document.querySelector(".js-result-count");
  if (!grid) return;

  const list = getFilteredProducts();
  grid.innerHTML = list.map(productCard).join("");

  if (count) count.textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
  if (empty) empty.style.display = list.length === 0 ? "block" : "none";

  // Card click opens the large card (Boro Card)
  grid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return;
      openQuickView(Number(card.dataset.cardId));
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        if (e.target.closest("[data-add]")) return;
        e.preventDefault();
        openQuickView(Number(card.dataset.cardId));
      }
    });
  });

  // Dedicated quick-add (+) button
  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      addToCart(Number(btn.dataset.add));
    });
  });
}

/* ============================================================
   EXPANDED PRODUCT DETAILS & SUGGESTIONS (BORO CARD MODAL)
   ============================================================ */
function openQuickView(id) {
  const p = findProduct(id);
  if (!p) return;
  const modal = document.querySelector(".js-quickview");
  if (!modal) return;
  const outOfStock = p.stock <= 0;
  const discount = p.oldPrice ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
  const savings = p.oldPrice ? (p.oldPrice - p.price) : 0;
  let selectedQty = 1;

  const images = (p.images && p.images.length > 0) ? p.images : [p.image];
  const mainImage = images[0];

  let galleryThumbnailsHTML = "";
  if (images.length > 1) {
    galleryThumbnailsHTML = `
      <div class="qv-thumbnails">
        ${images
          .map(
            (imgSrc, index) => `
          <button type="button" class="qv-thumb-btn ${index === 0 ? "active" : ""}" data-img="${imgSrc}" aria-label="Photo ${index + 1}">
            <img src="${imgSrc}" alt="${escapeHtml(p.name)} thumbnail" />
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  const relatedProducts = PRODUCTS.filter(
    (item) => item.category === p.category && String(item.id) !== String(p.id)
  );

  let relatedHTML = "";
  if (relatedProducts.length > 0) {
    relatedHTML = `
      <div class="qv-related-section">
        <h4 class="qv-related-title">You Might Also Need (Accessories & Related)</h4>
        <div class="qv-related-grid">
          ${relatedProducts
            .slice(0, 4)
            .map(
              (item) => {
                const itemImg = (item.images && item.images.length > 0) ? item.images[0] : item.image;
                return `
                <div class="qv-related-card" data-rel-id="${item.id}">
                  <img src="${itemImg}" alt="${escapeHtml(item.name)}" loading="lazy" />
                  <div class="qv-related-info">
                    <h5>${escapeHtml(item.name)}</h5>
                    <p class="qv-related-price">${formatMoney(item.price)}</p>
                  </div>
                  <button type="button" class="btn-related-add" data-add="${item.id}" title="Quick Add">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add
                  </button>
                </div>
              `;
              }
            )
            .join("")}
        </div>
      </div>
    `;
  }

  modal.querySelector(".js-qv-content").innerHTML = `
    <div class="qv-gallery-col">
      <div class="qv-main-image-wrap">
        <img src="${mainImage}" alt="${escapeHtml(p.name)}" class="qv-main-image js-qv-main-img" />
        ${p.badge ? `<span class="tag tag--new qv-badge">${escapeHtml(p.badge)}</span>` : ""}
        ${discount ? `<span class="qv-discount-pill">SAVE ${formatMoney(savings)} (-${discount}%)</span>` : ""}
      </div>
      ${galleryThumbnailsHTML}
    </div>

    <div class="qv-details-col">
      <div class="qv-header-row">
        <span class="qv-category">${escapeHtml(p.category)}</span>
        <span class="qv-stock-status ${outOfStock ? "qv-stock--oos" : "qv-stock--in"}">
          <span class="qv-stock-dot"></span>
          ${outOfStock ? "Out of Stock" : `In Stock (${p.stock} available)`}
        </span>
      </div>

      <h2 class="qv-title">${escapeHtml(p.name)}</h2>

      <div class="qv-price-block">
        <div class="qv-price-main">${formatMoney(p.price)}</div>
        ${p.oldPrice ? `<div class="qv-price-old">${formatMoney(p.oldPrice)}</div>` : ""}
        ${discount ? `<span class="qv-discount-tag">-${discount}% OFF</span>` : ""}
      </div>

      <div class="qv-overview-box">
        <h4 class="qv-overview-heading">Product Overview & Features</h4>
        <div class="qv-desc-text">${p.description}</div>
      </div>

      <!-- Trust Badges -->
      <div class="qv-trust-pills">
        <div class="qv-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff5500" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>7 Days Warranty</span>
        </div>
        <div class="qv-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Fast Delivery</span>
        </div>
        <div class="qv-trust-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Cash on Delivery</span>
        </div>
      </div>

      <!-- Purchasing Controls -->
      <div class="qv-actions-box">
        <div class="qv-qty-selector">
          <button type="button" class="qv-qty-btn js-qv-qty-minus" aria-label="Decrease quantity" ${outOfStock ? "disabled" : ""}>−</button>
          <span class="qv-qty-val js-qv-qty-val">1</span>
          <button type="button" class="qv-qty-btn js-qv-qty-plus" aria-label="Increase quantity" ${outOfStock ? "disabled" : ""}>+</button>
        </div>

        <button type="button" class="btn btn--primary qv-btn-cart js-qv-add-btn ${outOfStock ? "btn--disabled" : ""}" ${outOfStock ? "disabled" : ""}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          ${outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>

        <button type="button" class="btn btn--buy-now js-qv-buy-btn ${outOfStock ? "btn--disabled" : ""}" ${outOfStock ? "disabled" : ""}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Buy Now
        </button>
      </div>
    </div>

    ${relatedHTML}
  `;

  // Gallery Thumbnails listener
  const mainImgEl = modal.querySelector(".js-qv-main-img");
  modal.querySelectorAll(".qv-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".qv-thumb-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (mainImgEl) {
        mainImgEl.style.opacity = "0.5";
        setTimeout(() => {
          mainImgEl.src = btn.dataset.img;
          mainImgEl.style.opacity = "1";
        }, 80);
      }
    });
  });

  // Quantity stepper
  const qtyValEl = modal.querySelector(".js-qv-qty-val");
  const minusBtn = modal.querySelector(".js-qv-qty-minus");
  const plusBtn = modal.querySelector(".js-qv-qty-plus");

  minusBtn?.addEventListener("click", () => {
    if (selectedQty > 1) {
      selectedQty--;
      if (qtyValEl) qtyValEl.textContent = selectedQty;
    }
  });

  plusBtn?.addEventListener("click", () => {
    if (selectedQty < p.stock) {
      selectedQty++;
      if (qtyValEl) qtyValEl.textContent = selectedQty;
    } else {
      showToast(`Only ${p.stock} units available in stock.`, "info");
    }
  });

  // Add to cart listener
  modal.querySelector(".js-qv-add-btn")?.addEventListener("click", () => {
    if (outOfStock) return;
    addToCart(p.id, selectedQty);
    closeQuickView();
  });

  // Buy now listener (Adds to cart & opens drawer)
  modal.querySelector(".js-qv-buy-btn")?.addEventListener("click", () => {
    if (outOfStock) return;
    addToCart(p.id, selectedQty);
    closeQuickView();
    if (typeof openDrawer === "function") {
      setTimeout(() => openDrawer(), 150);
    }
  });

  // Related items listener
  modal.querySelectorAll(".qv-related-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return;
      openQuickView(Number(card.dataset.relId));
    });
  });

  modal.querySelectorAll(".btn-related-add").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.add));
    });
  });

  modal.classList.add("modal--open");
  document.body.classList.add("modal-open");
}

function closeQuickView() {
  document.querySelector(".js-quickview")?.classList.remove("modal--open");
  document.body.classList.remove("modal-open");
}

function initShopControls() {
  const searchInput = document.querySelector(".js-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchTerm = e.target.value;
      renderProducts();
    });
  }

  const sortSelect = document.querySelector(".js-sort");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortMode = e.target.value;
      renderProducts();
    });
  }

  document.querySelector(".js-quickview .js-modal-close")?.addEventListener("click", closeQuickView);
  document.querySelector(".js-quickview .modal__backdrop")?.addEventListener("click", closeQuickView);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuickView();
  });
}

function initMobileNav() {
  // Navigation handling is managed centrally by nav.js
}

let heroSliderInterval = null;

function initHeroSlider() {
  const slider = document.querySelector('.hero-slider');
  if (!slider) return;

  const slidesData = window.loadHeroSlides ? window.loadHeroSlides() : [];
  if (slidesData && slidesData.length > 0) {
    slider.innerHTML = slidesData.map((s, idx) => `
      <img src="${s.image}" alt="${s.alt || 'Tech Product'}" class="slide ${idx === 0 ? 'active' : ''}" />
    `).join("");
  }

  // Update receipt corner banner text if defined in settings
  const corner = document.querySelector('.receipt-corner');
  if (corner && window.STORE_SETTINGS) {
    const bTitle = window.STORE_SETTINGS.heroBadgeTitle || "10% Off";
    const bSub = window.STORE_SETTINGS.heroBadgeSubtitle || "Limited Time Offer";
    corner.innerHTML = `<span>${bTitle}</span><span>${bSub}</span>`;
  }

  const slides = slider.querySelectorAll('.slide');
  if (slides.length <= 1) return;

  let currentSlide = 0;
  if (heroSliderInterval) {
    clearInterval(heroSliderInterval);
  }

  heroSliderInterval = setInterval(() => {
    slides[currentSlide].classList.remove('active');
    currentSlide = (currentSlide + 1) % slides.length;
    slides[currentSlide].classList.add('active');
  }, 2400);
}

// React to hero slider updates in real-time
window.addEventListener("techkitch:hero-updated", () => {
  initHeroSlider();
});

window.addEventListener("techkitch:settings-updated", () => {
  initHeroSlider();
});

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".js-product-grid")) {
    renderCategoryChips();
    renderProducts();
    initShopControls();
  }
  initMobileNav();
  initHeroSlider();
});
