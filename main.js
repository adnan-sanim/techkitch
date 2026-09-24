/* ============================================================
   TECHKITCH — SHOP PAGE BEHAVIOR
   Renders products from products.js, handles search/filter/sort.
   ============================================================ */

let activeCategory = "All";
let searchTerm = "";
let sortMode = "featured";

function getCategories() {
  const cats = new Set(PRODUCTS.map((p) => p.category));
  return ["All", ...Array.from(cats).sort()];
}

function renderCategoryChips() {
  const wrap = document.querySelector(".js-categories");
  if (!wrap) return;
  wrap.innerHTML = getCategories()
    .map(
      (cat) => `
      <button class="chip ${cat === activeCategory ? "chip--active" : ""}" data-category="${cat}">
        ${cat}
      </button>`
    )
    .join("");

  wrap.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderCategoryChips();
      renderProducts();
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

function productCard(p) {
  const outOfStock = p.stock <= 0;
  const discount = p.oldPrice ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
  const mainImage = (p.images && p.images.length > 0) ? p.images[0] : p.image;

  return `
    <article class="product-card ${outOfStock ? "product-card--oos" : ""}">
      <a href="#" class="product-card__media" data-view="${p.id}">
        <img src="${mainImage}" alt="${p.name}" loading="lazy" />
        ${p.badge ? `<span class="tag tag--${p.badge.toLowerCase().replace(/\s/g, "-")}">${p.badge}</span>` : ""}
        ${outOfStock ? `<span class="tag tag--oos">Out of stock</span>` : ""}
      </a>
      <div class="product-card__body">
        <p class="product-card__category">${p.category}</p>
        <h3 class="product-card__name"><a href="#" data-view="${p.id}">${p.name}</a></h3>
        <div class="product-card__price-row">
          <span class="price-tag">${formatMoney(p.price)}</span>
          ${p.oldPrice ? `<span class="price-tag price-tag--old">${formatMoney(p.oldPrice)}</span>` : ""}
          ${discount ? `<span class="price-tag price-tag--discount">-${discount}%</span>` : ""}
        </div>
        <button class="btn btn--full ${outOfStock ? "btn--disabled" : "btn--primary"}"
          data-add="${p.id}" ${outOfStock ? "disabled" : ""}>
          ${outOfStock ? "Out of stock" : "Add to cart"}
        </button>
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

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(Number(btn.dataset.add)));
  });
  grid.querySelectorAll("[data-view]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openQuickView(Number(el.dataset.view));
    });
  });
}

/* ============================================================
   UPDATED PRODUCT DETAILS & SUGGESTIONS QUICK VIEW
   ============================================================ */
function openQuickView(id) {
  const p = findProduct(id);
  if (!p) return;
  const modal = document.querySelector(".js-quickview");
  const outOfStock = p.stock <= 0;
  const discount = p.oldPrice ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;

  const images = (p.images && p.images.length > 0) ? p.images : [p.image];
  const mainImage = images[0];

  let galleryThumbnailsHTML = "";
  if (images.length > 1) {
    galleryThumbnailsHTML = `
      <div class="qv-thumbnails" style="display: flex; gap: 8px; margin-top: 12px; justify-content: center; flex-wrap: wrap;">
        ${images
          .map(
            (imgSrc, index) => `
          <button type="button" class="qv-thumb-btn ${index === 0 ? "active" : ""}" data-img="${imgSrc}" style="border: ${index === 0 ? "2px solid var(--teal)" : "1px solid var(--line)"}; background: #fff; padding: 2px; border-radius: var(--radius-sm); cursor: pointer; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
            <img src="${imgSrc}" alt="${p.name}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;" />
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  const relatedProducts = PRODUCTS.filter(
    (item) => item.category === p.category && item.id !== p.id
  );

  let relatedHTML = "";
  if (relatedProducts.length > 0) {
    relatedHTML = `
      <div style="grid-column: 1 / -1; padding: 20px; border-top: 1px dashed var(--line); background: var(--surface);">
        <h3 style="margin-bottom: 14px; font-size: 1.15rem; color: var(--navy);">Frequently Bought Together</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px;">
          ${relatedProducts
            .slice(0, 4)
            .map(
              (item) => `
            <div style="background: var(--surface-2); border-radius: var(--radius-md); padding: 10px; border: 1px solid var(--line); display: flex; flex-direction: column; justify-content: space-between;">
              <a href="#" data-view="${item.id}" class="js-related-item" style="display: block; text-align: center;">
                <img src="${item.images && item.images.length > 0 ? item.images[0] : item.image}" alt="${item.name}" style="width: 100%; height: 90px; object-fit: contain; border-radius: var(--radius-sm); margin-bottom: 8px; background: #fff;" />
                <h4 style="font-size: 0.82rem; margin: 0 0 4px; color: var(--navy); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.2;">${item.name}</h4>
                <p style="font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; color: var(--navy); margin: 0 0 8px;">${formatMoney(item.price)}</p>
              </a>
              <button class="btn btn--primary btn--sm" data-add="${item.id}" style="width: 100%; font-size: 0.75rem; padding: 6px 8px;">
                Add
              </button>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  modal.querySelector(".js-qv-content").innerHTML = `
    <div style="padding: 20px; background: var(--surface-2); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
      <img src="${mainImage}" alt="${p.name}" class="quickview__img js-qv-main-img" style="max-height: 280px; border-radius: var(--radius-md); object-fit: contain;" />
      ${p.badge ? `<span class="tag tag--new" style="top: 16px; left: 16px;">${p.badge}</span>` : ""}
      ${galleryThumbnailsHTML}
    </div>

    <div class="quickview__info">
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
        <span class="tag tag--new" style="position: static;">${p.badge || "NEW ARRIVAL"}</span>
      </div>

      <h2 style="font-size: 1.35rem; margin-bottom: 4px;">${p.name}</h2>
      <p class="product-card__category" style="margin-bottom: 12px;">${p.category}</p>

      <div class="product-card__price-row" style="margin-bottom: 16px;">
        ${p.oldPrice ? `<span class="price-tag price-tag--old">${formatMoney(p.oldPrice)}</span>` : ""}
        ${discount ? `<span class="price-tag price-tag--discount">-${discount}% OFF</span>` : ""}
        <span class="price-tag price-tag--lg" style="color: var(--teal-dark);">${formatMoney(p.price)}</span>
      </div>

      <div style="background: var(--surface-2); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--line); margin-bottom: 16px;">
        <h4 style="font-size: 0.92rem; margin-bottom: 6px;">Product Overview & Specifications</h4>
        <p class="quickview__desc" style="font-size: 0.85rem; margin: 0 0 12px; line-height: 1.5; white-space: pre-line;">${p.description}</p>

        <table style="width: 100%; font-size: 0.78rem; border-collapse: collapse; font-family: var(--font-mono);">
          <tr style="border-bottom: 1px solid var(--line);">
            <td style="padding: 6px 0; color: var(--muted); font-weight: 600; vertical-align: top;">WARRANTY</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: var(--teal-dark); line-height: 1.4;">
              7 Days Replacement Warranty<br>(Unboxing Video Needed)
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: var(--muted); font-weight: 600;">AVAILABILITY</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${outOfStock ? 'var(--coral)' : 'var(--success)'};">
              ${outOfStock ? "Out of stock" : `${p.stock} In Stock`}
            </td>
          </tr>
        </table>
      </div>

      <button class="btn ${outOfStock ? "btn--disabled" : "btn--primary"} btn--full" data-qv-add="${p.id}" ${outOfStock ? "disabled" : ""}>
        ${outOfStock ? "Out of stock" : "Add to cart"}
      </button>
    </div>

    ${relatedHTML}
  `;

  const mainImgEl = modal.querySelector(".js-qv-main-img");
  modal.querySelectorAll(".qv-thumb-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".qv-thumb-btn").forEach((b) => {
        b.style.border = "1px solid var(--line)";
        b.classList.remove("active");
      });
      btn.style.border = "2px solid var(--teal)";
      btn.classList.add("active");
      if (mainImgEl) {
        mainImgEl.src = btn.dataset.img;
      }
    });
  });

  modal.querySelector("[data-qv-add]")?.addEventListener("click", () => {
    addToCart(p.id);
    closeQuickView();
  });

  modal.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      addToCart(Number(btn.dataset.add));
    });
  });

  modal.querySelectorAll(".js-related-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openQuickView(Number(link.dataset.view));
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
