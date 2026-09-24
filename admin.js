/* ============================================================
   TECHKITCH — ADMIN PORTAL CONTROLLER
   Full control: Products CRUD, Direct Image Upload, Hero Slider,
   Orders & Settings Management
   ============================================================ */

(function () {
  // Application State
  let state = {
    activeTab: "products",
    products: [],
    heroSlides: [],
    orders: [],
    settings: {},
    searchTerm: "",
    categoryFilter: "All",
    stockFilter: "All",
    orderStatusFilter: "All",
    editingProductId: null,
    stagedImages: [], // holds base64 or url strings for currently open product modal
    adminSliderInterval: null
  };

  const ORDERS_KEY = "techkitch_orders_v1";

  // DOM Elements
  const tabs = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  const productModal = document.getElementById("productModal");
  const invoiceModal = document.getElementById("invoiceModal");
  const toastContainer = document.getElementById("adminToastContainer");

  // Initialize
  function init() {
    loadData();
    bindEvents();
    renderAll();
  }

  function loadData() {
    state.products = window.loadProducts ? window.loadProducts() : (window.PRODUCTS || []);
    state.settings = window.loadStoreSettings ? window.loadStoreSettings() : (window.STORE_SETTINGS || {});
    state.heroSlides = window.loadHeroSlides ? window.loadHeroSlides() : [];
    
    try {
      const rawOrders = localStorage.getItem(ORDERS_KEY);
      state.orders = rawOrders ? JSON.parse(rawOrders) : [];
      if (!Array.isArray(state.orders)) state.orders = [];
    } catch (e) {
      console.error("Failed to read orders:", e);
      state.orders = [];
    }
  }

  function saveData() {
    if (window.saveStoredProducts) {
      window.saveStoredProducts(state.products);
    }
    renderKPIs();
  }

  function saveOrders() {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(state.orders));
    } catch (e) {
      console.error("Failed to save orders:", e);
    }
    renderKPIs();
  }

  // Toast notification helper
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `admin-toast admin-toast--${type}`;
    const icon = type === "success" 
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    
    toast.innerHTML = `${icon}<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(20px)";
      toast.style.transition = "all 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatMoney(amount) {
    const sym = state.settings.currencySymbol || "৳";
    return sym + (Number(amount) || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Direct Image Compression using HTML5 Canvas (Preserves clarity while keeping file size ~40KB - 80KB)
  function compressImageFile(file, maxWidth = 1000, maxHeight = 1000, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Try WebP, fallback to JPEG
          let dataUrl;
          try {
            dataUrl = canvas.toDataURL("image/webp", quality);
            if (!dataUrl.startsWith("data:image/webp")) {
              dataUrl = canvas.toDataURL("image/jpeg", quality);
            }
          } catch (e) {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Render Functions
  function renderAll() {
    renderKPIs();
    renderCategoryOptions();
    renderProductsTable();
    renderHeroManager();
    renderOrdersTable();
    renderSettingsForm();
  }

  function renderKPIs() {
    const totalProds = state.products.length;
    const inStockProds = state.products.filter(p => p.stock > 0).length;
    const outStockProds = totalProds - inStockProds;
    
    const categories = new Set(state.products.map(p => p.category)).size;
    const totalOrders = state.orders.length;
    const totalRev = state.orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    document.getElementById("kpiTotalProducts").textContent = totalProds;
    document.getElementById("kpiStockStatus").textContent = `${inStockProds} In Stock · ${outStockProds} Out`;
    document.getElementById("kpiCategories").textContent = `${categories} Active`;
    document.getElementById("kpiTotalOrders").textContent = totalOrders;
    document.getElementById("kpiTotalRevenue").textContent = formatMoney(totalRev);

    document.getElementById("tabProductsCount").textContent = totalProds;
    document.getElementById("tabHeroCount").textContent = state.heroSlides.length;
    document.getElementById("tabOrdersCount").textContent = totalOrders;
  }

  function renderCategoryOptions() {
    const cats = Array.from(new Set(state.products.map(p => p.category).filter(Boolean))).sort();
    
    // Filter dropdown
    const filterSelect = document.getElementById("productCategoryFilter");
    if (filterSelect) {
      const current = state.categoryFilter;
      filterSelect.innerHTML = `<option value="All">All Categories</option>` + 
        cats.map(c => `<option value="${escapeHtml(c)}" ${c === current ? "selected" : ""}>${escapeHtml(c)}</option>`).join("");
    }

    // Modal category select
    const formCatSelect = document.getElementById("productCategoryInput");
    if (formCatSelect) {
      formCatSelect.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("") + 
        `<option value="__NEW__">+ Add New Category...</option>`;
    }
  }

  function getFilteredProducts() {
    return state.products.filter(p => {
      const matchesSearch = !state.searchTerm || 
        p.name.toLowerCase().includes(state.searchTerm.toLowerCase()) || 
        (p.description && p.description.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        p.category.toLowerCase().includes(state.searchTerm.toLowerCase());
      
      const matchesCat = state.categoryFilter === "All" || p.category === state.categoryFilter;
      
      let matchesStock = true;
      if (state.stockFilter === "in-stock") matchesStock = p.stock > 0;
      if (state.stockFilter === "out-of-stock") matchesStock = p.stock <= 0;

      return matchesSearch && matchesCat && matchesStock;
    });
  }

  function renderProductsTable() {
    const list = getFilteredProducts();
    const tbody = document.getElementById("productsTableBody");
    const emptyState = document.getElementById("productsEmptyState");

    if (list.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    tbody.innerHTML = list.map(p => {
      const isOOS = p.stock <= 0;
      const discount = p.oldPrice && p.oldPrice > p.price ? Math.round(100 - (p.price / p.oldPrice) * 100) : null;
      const mainImg = (p.images && p.images.length > 0) ? p.images[0] : (p.image || "https://placehold.co/100x100?text=No+Img");
      const imgCount = (p.images && p.images.length) || 1;

      return `
        <tr data-product-id="${p.id}">
          <td>
            <div class="table-product">
              <img src="${mainImg}" alt="${escapeHtml(p.name)}" class="table-product__img" loading="lazy" />
              <div>
                <div class="table-product__title">${escapeHtml(p.name)}</div>
                <div class="table-product__id">ID: #${p.id} · ${imgCount} image${imgCount > 1 ? "s" : ""}</div>
              </div>
            </div>
          </td>
          <td>
            <span class="table-badge">${escapeHtml(p.category)}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: #fff; font-family: var(--admin-font-mono);">${formatMoney(p.price)}</div>
            ${p.oldPrice ? `<div style="font-size: 0.76rem; color: var(--admin-muted); text-decoration: line-through;">${formatMoney(p.oldPrice)}</div>` : ""}
            ${discount ? `<div style="font-size: 0.72rem; color: var(--admin-accent); font-weight: 600;">-${discount}%</div>` : ""}
          </td>
          <td>
            <button class="stock-toggle-btn ${isOOS ? "out-of-stock" : "in-stock"}" data-action="toggle-stock" data-id="${p.id}" title="Click to toggle stock status">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;"></span>
              ${isOOS ? "Out of Stock" : `${p.stock} In Stock`}
            </button>
          </td>
          <td>
            ${p.badge ? `<span class="table-badge table-badge--bestseller">${escapeHtml(p.badge)}</span>` : `<span style="color:var(--admin-muted);font-size:0.75rem;">—</span>`}
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-admin btn-admin--outline btn-admin--sm" data-action="edit" data-id="${p.id}" title="Edit Product">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Edit
              </button>
              <button class="btn-admin btn-admin--outline btn-admin--icon btn-admin--sm" data-action="duplicate" data-id="${p.id}" title="Duplicate Product">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
              <button class="btn-admin btn-admin--danger btn-admin--icon btn-admin--sm" data-action="delete" data-id="${p.id}" title="Delete Product">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // ============================================================
  // HERO BANNER SLIDER CONTROLLER
  // ============================================================
  function renderHeroManager() {
    const listEl = document.getElementById("heroSlidesList");
    const countEl = document.getElementById("heroSlidesListCount");
    const tabCount = document.getElementById("tabHeroCount");
    const previewEl = document.getElementById("adminHeroSliderPreview");
    const titleInput = document.getElementById("heroBadgeTitleInput");
    const subInput = document.getElementById("heroBadgeSubInput");
    const previewTitle = document.getElementById("previewCornerTitle");
    const previewSub = document.getElementById("previewCornerSub");

    if (countEl) countEl.textContent = state.heroSlides.length;
    if (tabCount) tabCount.textContent = state.heroSlides.length;

    // Corner badge values
    const bTitle = state.settings.heroBadgeTitle || "10% Off";
    const bSub = state.settings.heroBadgeSubtitle || "Limited Time Offer";
    if (titleInput && !titleInput.matches(":focus")) titleInput.value = bTitle;
    if (subInput && !subInput.matches(":focus")) subInput.value = bSub;
    if (previewTitle) previewTitle.textContent = bTitle;
    if (previewSub) previewSub.textContent = bSub;

    // Live preview slider
    if (previewEl) {
      if (state.heroSlides.length === 0) {
        previewEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--admin-muted);font-size:0.85rem;">No slides added</div>`;
      } else {
        previewEl.innerHTML = state.heroSlides.map((s, idx) => `
          <img src="${s.image}" alt="${escapeHtml(s.alt || '')}" class="slide ${idx === 0 ? 'active' : ''}" />
        `).join("");

        // Set up live rotation
        if (state.adminSliderInterval) clearInterval(state.adminSliderInterval);
        const slides = previewEl.querySelectorAll(".slide");
        if (slides.length > 1) {
          let cur = 0;
          state.adminSliderInterval = setInterval(() => {
            slides[cur].classList.remove("active");
            cur = (cur + 1) % slides.length;
            slides[cur].classList.add("active");
          }, 2400);
        }
      }
    }

    // Slides List in Admin
    if (listEl) {
      if (state.heroSlides.length === 0) {
        listEl.innerHTML = `<p style="color:var(--admin-muted); font-size:0.85rem; padding: 12px 0;">No hero slides active. Drag & drop images above to add slides.</p>`;
        return;
      }

      listEl.innerHTML = state.heroSlides.map((slide, index) => {
        const isFirst = index === 0;
        const isLast = index === state.heroSlides.length - 1;

        return `
          <div class="hero-slide-card" data-index="${index}">
            <img src="${slide.image}" alt="${escapeHtml(slide.alt || 'Slide')}" class="hero-slide-thumb" />
            <div class="hero-slide-info">
              <input type="text" class="admin-input admin-input--no-icon hero-slide-alt-input" data-index="${index}" value="${escapeHtml(slide.alt || '')}" placeholder="Slide label / alt text" style="padding:6px 10px; font-size:0.82rem;" />
              <div style="font-size:0.72rem; color:var(--admin-muted); margin-top:4px;">Slide #${index + 1} ${isFirst ? '· First Slide' : ''}</div>
            </div>
            <div class="hero-slide-actions">
              <button type="button" class="btn-admin btn-admin--outline btn-admin--icon btn-admin--sm" data-action="move-up-slide" data-index="${index}" ${isFirst ? 'disabled style="opacity:0.3;"' : ''} title="Move Up">
                ↑
              </button>
              <button type="button" class="btn-admin btn-admin--outline btn-admin--icon btn-admin--sm" data-action="move-down-slide" data-index="${index}" ${isLast ? 'disabled style="opacity:0.3;"' : ''} title="Move Down">
                ↓
              </button>
              <button type="button" class="btn-admin btn-admin--danger btn-admin--icon btn-admin--sm" data-action="delete-slide" data-index="${index}" title="Remove Slide">
                ✕
              </button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  function getFilteredOrders() {
    return state.orders.filter(o => {
      if (state.orderStatusFilter === "All") return true;
      return (o.status || "Processing").toLowerCase() === state.orderStatusFilter.toLowerCase();
    });
  }

  function renderOrdersTable() {
    const list = getFilteredOrders();
    const tbody = document.getElementById("ordersTableBody");
    const emptyState = document.getElementById("ordersEmptyState");

    if (list.length === 0) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    tbody.innerHTML = list.map((order, idx) => {
      const orderDate = order.date ? new Date(order.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Recent";
      const customer = order.customer || {};
      const itemCount = (order.items && order.items.reduce((s, i) => s + (i.qty || 1), 0)) || 0;
      const status = order.status || "Processing";

      return `
        <tr data-order-id="${order.id}">
          <td>
            <div style="font-family: var(--admin-font-mono); font-weight: 700; color: #fff;">${order.id}</div>
            <div style="font-size: 0.75rem; color: var(--admin-muted);">${orderDate}</div>
          </td>
          <td>
            <div style="font-weight: 600; color: #fff;">${escapeHtml(customer.name || "Customer")}</div>
            <div style="font-size: 0.78rem; color: var(--admin-muted); font-family: var(--admin-font-mono);">${escapeHtml(customer.phone || "")}</div>
          </td>
          <td>
            <div style="font-size: 0.82rem; color: #d1d5db; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(customer.address || "")}, ${escapeHtml(customer.city || "")}</div>
          </td>
          <td>
            <span class="table-badge">${itemCount} item${itemCount > 1 ? "s" : ""}</span>
          </td>
          <td>
            <div style="font-family: var(--admin-font-mono); font-weight: 700; color: #fff;">${formatMoney(order.total || 0)}</div>
            <div style="font-size: 0.72rem; color: var(--admin-muted);">${escapeHtml(order.paymentMethod || "COD")}</div>
          </td>
          <td>
            <select class="admin-select order-status-select" data-order-id="${order.id}" style="padding: 4px 8px; font-size: 0.76rem;">
              <option value="Processing" ${status === "Processing" ? "selected" : ""}>⏳ Processing</option>
              <option value="Confirmed" ${status === "Confirmed" ? "selected" : ""}>✓ Confirmed</option>
              <option value="Shipped" ${status === "Shipped" ? "selected" : ""}>🚚 Shipped</option>
              <option value="Delivered" ${status === "Delivered" ? "selected" : ""}>★ Delivered</option>
              <option value="Cancelled" ${status === "Cancelled" ? "selected" : ""}>✕ Cancelled</option>
            </select>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-admin btn-admin--outline btn-admin--sm" data-action="view-order" data-id="${order.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                View
              </button>
              <button class="btn-admin btn-admin--danger btn-admin--icon btn-admin--sm" data-action="delete-order" data-id="${order.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderSettingsForm() {
    const s = state.settings;
    document.getElementById("settingStoreName").value = s.storeName || "TechKitch";
    document.getElementById("settingCurrency").value = s.currencySymbol || "৳";
    document.getElementById("settingShippingFee").value = s.shippingFee !== undefined ? s.shippingFee : 150;
    document.getElementById("settingFreeShipping").value = s.freeShippingThreshold !== undefined ? s.freeShippingThreshold : 2000;
    document.getElementById("settingMessengerId").value = s.messengerPageId || "61591512496468";
    document.getElementById("settingPhone").value = s.supportPhone || "+880 1700-000000";
    document.getElementById("settingEmail").value = s.supportEmail || "support@techkitch.com";
  }

  // Staged Images Preview inside Product Modal
  function renderStagedImages() {
    const container = document.getElementById("productImagesPreview");
    if (!container) return;

    if (state.stagedImages.length === 0) {
      container.innerHTML = `<p style="font-size:0.8rem; color:var(--admin-muted); margin-top:8px;">No images uploaded yet. Select images above or drop them in the box.</p>`;
      return;
    }

    container.innerHTML = state.stagedImages.map((src, index) => {
      const isCover = index === 0;
      return `
        <div class="image-preview-card ${isCover ? "is-primary" : ""}" data-index="${index}">
          <img src="${src}" alt="Preview ${index + 1}" />
          ${isCover ? `<span class="primary-tag">Cover</span>` : ""}
          <div class="card-actions">
            ${!isCover ? `<button type="button" class="card-btn" data-action="make-cover" data-index="${index}" title="Set as Main Cover">★</button>` : ""}
            <button type="button" class="card-btn card-btn--delete" data-action="remove-image" data-index="${index}" title="Remove">✕</button>
          </div>
        </div>
      `;
    }).join("");
  }

  // Open Product Modal for Add / Edit
  function openProductModal(productId = null) {
    state.editingProductId = productId;
    const isEdit = productId !== null;
    const titleEl = document.getElementById("productModalTitle");
    titleEl.textContent = isEdit ? "Edit Product" : "Add New Product";

    const customCatGroup = document.getElementById("customCategoryGroup");
    customCatGroup.style.display = "none";

    if (isEdit) {
      const p = state.products.find(item => Number(item.id) === Number(productId));
      if (!p) return;

      document.getElementById("productNameInput").value = p.name || "";
      document.getElementById("productPriceInput").value = p.price || "";
      document.getElementById("productOldPriceInput").value = p.oldPrice || "";
      document.getElementById("productStockInput").value = p.stock !== undefined ? p.stock : 10;
      document.getElementById("productBadgeInput").value = p.badge || "";
      document.getElementById("productDescriptionInput").value = p.description || "";

      // Category matching
      const catSelect = document.getElementById("productCategoryInput");
      const foundOption = Array.from(catSelect.options).find(o => o.value === p.category);
      if (foundOption) {
        catSelect.value = p.category;
      } else {
        catSelect.value = "__NEW__";
        customCatGroup.style.display = "flex";
        document.getElementById("customCategoryInput").value = p.category;
      }

      state.stagedImages = (p.images && p.images.length > 0) ? [...p.images] : (p.image ? [p.image] : []);
    } else {
      document.getElementById("productForm").reset();
      document.getElementById("productStockInput").value = "10";
      state.stagedImages = [];
    }

    renderStagedImages();
    productModal.classList.add("admin-modal--open");
    document.getElementById("productNameInput").focus();
  }

  function closeProductModal() {
    productModal.classList.remove("admin-modal--open");
    state.editingProductId = null;
    state.stagedImages = [];
  }

  // Save Product (Add or Edit)
  async function handleSaveProduct(e) {
    e.preventDefault();
    const name = document.getElementById("productNameInput").value.trim();
    const price = parseFloat(document.getElementById("productPriceInput").value);
    const oldPriceVal = document.getElementById("productOldPriceInput").value.trim();
    const oldPrice = oldPriceVal ? parseFloat(oldPriceVal) : undefined;
    const stock = parseInt(document.getElementById("productStockInput").value, 10) || 0;
    const badge = document.getElementById("productBadgeInput").value.trim();
    const description = document.getElementById("productDescriptionInput").value.trim();

    let category = document.getElementById("productCategoryInput").value;
    if (category === "__NEW__") {
      category = document.getElementById("customCategoryInput").value.trim() || "General";
    }

    if (!name) {
      showToast("Please enter a product title", "danger");
      return;
    }
    if (isNaN(price) || price < 0) {
      showToast("Please enter a valid price", "danger");
      return;
    }

    const images = state.stagedImages.length > 0 
      ? [...state.stagedImages] 
      : ["https://placehold.co/600x600/181818/ffffff?text=" + encodeURIComponent(name.slice(0, 16))];

    const productPayload = {
      name,
      category,
      price,
      oldPrice,
      stock,
      badge,
      description,
      images,
      image: images[0]
    };

    try {
      if (state.editingProductId !== null) {
        window.updateProduct(state.editingProductId, productPayload);
        showToast(`Product "${name}" updated successfully!`);
      } else {
        window.addProduct(productPayload);
        showToast(`Product "${name}" created successfully!`);
      }

      loadData();
      renderAll();
      closeProductModal();
    } catch (err) {
      console.error(err);
      showToast("Failed to save product: " + err.message, "danger");
    }
  }

  // View Invoice Modal
  function openInvoiceModal(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;

    const content = document.getElementById("invoiceModalContent");
    const customer = order.customer || {};
    const items = order.items || [];
    const dateStr = order.date ? new Date(order.date).toLocaleString() : "N/A";

    content.innerHTML = `
      <div style="background: #111; border: 1px solid var(--admin-border); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px; margin-bottom: 14px;">
          <div>
            <h2 style="font-size: 1.4rem; font-style: italic; color: #fff; margin-bottom: 4px;">Tech<span style="color:#a3a3a3; font-weight:300;">Kitch</span></h2>
            <p style="font-size: 0.78rem; color: var(--admin-muted);">Order Invoice / Receipt</p>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--admin-font-mono); font-weight: 700; color: var(--admin-accent); font-size: 1.1rem;">${order.id}</div>
            <div style="font-size: 0.75rem; color: var(--admin-muted);">${dateStr}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; font-size: 0.85rem;">
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-muted); font-weight: 700; margin-bottom: 4px;">Customer Info:</div>
            <div style="font-weight: 600; color: #fff;">${escapeHtml(customer.name || "N/A")}</div>
            <div>Phone: <span style="font-family: var(--admin-font-mono); color: #fff;">${escapeHtml(customer.phone || "N/A")}</span></div>
            <div>Email: ${escapeHtml(customer.email || "N/A")}</div>
          </div>
          <div>
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--admin-muted); font-weight: 700; margin-bottom: 4px;">Delivery Address:</div>
            <div style="color: #fff;">${escapeHtml(customer.address || "N/A")}</div>
            <div style="color: var(--admin-muted);">${escapeHtml(customer.city || "")} ${customer.zip ? "- " + customer.zip : ""}</div>
            <div style="margin-top: 4px; color: var(--admin-accent); font-weight: 600;">Payment: ${escapeHtml(order.paymentMethod || "COD")}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 16px;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: var(--admin-muted); text-align: left;">
              <th style="padding: 8px 0;">Item</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px 0; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(i => `
              <tr style="border-bottom: 1px dashed rgba(255,255,255,0.06);">
                <td style="padding: 10px 0;">
                  <div style="font-weight: 600; color: #fff;">${escapeHtml(i.name)}</div>
                  <div style="font-size: 0.72rem; color: var(--admin-muted);">ID: #${i.id}</div>
                </td>
                <td style="padding: 10px; text-align: center;">${i.qty}</td>
                <td style="padding: 10px; text-align: right; font-family: var(--admin-font-mono);">${formatMoney(i.price)}</td>
                <td style="padding: 10px 0; text-align: right; font-family: var(--admin-font-mono); font-weight: 600; color: #fff;">${formatMoney(i.lineTotal || (i.price * i.qty))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; font-size: 0.86rem;">
          <div style="display: flex; justify-content: space-between; color: var(--admin-muted);">
            <span>Subtotal</span>
            <span style="font-family: var(--admin-font-mono);">${formatMoney(order.subtotal || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; color: var(--admin-muted);">
            <span>Shipping</span>
            <span style="font-family: var(--admin-font-mono);">${(order.shipping === 0) ? "Free" : formatMoney(order.shipping || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700; color: #fff; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.15);">
            <span>Total Order Amount</span>
            <span style="font-family: var(--admin-font-mono); color: var(--admin-accent);">${formatMoney(order.total || 0)}</span>
          </div>
        </div>
      </div>
    `;

    invoiceModal.classList.add("admin-modal--open");
  }

  // Demo Order Generator
  function generateSampleOrder() {
    const sampleNames = ["Rahim Ahmed", "Sumaiya Akter", "Tanvir Hasan", "Nafis Mahmud", "Anika Tabassum"];
    const cities = ["Dhaka", "Chattogram", "Sylhet", "Rajshahi", "Khulna"];
    const randName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    const randCity = cities[Math.floor(Math.random() * cities.length)];
    const randPhone = "017" + Math.floor(10000000 + Math.random() * 89999999);
    const randOrderNum = Math.floor(10000 + Math.random() * 89999);

    const prods = state.products.slice(0, 2);
    const items = prods.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      qty: 1,
      lineTotal: p.price,
      image: p.image
    }));

    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const shipping = subtotal >= (state.settings.freeShippingThreshold || 2000) ? 0 : (state.settings.shippingFee || 150);
    const total = subtotal + shipping;

    const newOrder = {
      id: `TK-${randOrderNum}`,
      date: new Date().toISOString(),
      customer: {
        name: randName,
        phone: randPhone,
        email: `${randName.toLowerCase().replace(/\s+/g, "")}@example.com`,
        address: `House 42, Road 7, Sector 3, Uttara`,
        city: randCity,
        zip: "1230"
      },
      paymentMethod: "Cash On Delivery",
      items,
      subtotal,
      shipping,
      tax: 0,
      total,
      status: "Processing"
    };

    state.orders.unshift(newOrder);
    saveOrders();
    renderOrdersTable();
    showToast(`Sample order ${newOrder.id} generated!`);
  }

  // Event Listeners
  function bindEvents() {
    // Tab switching
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("tab-btn--active"));
        panels.forEach(p => p.classList.remove("tab-panel--active"));

        btn.classList.add("tab-btn--active");
        state.activeTab = btn.dataset.tab;
        const panel = document.getElementById(`panel-${state.activeTab}`);
        if (panel) panel.classList.add("tab-panel--active");

        if (state.activeTab === "hero") {
          renderHeroManager();
        }
      });
    });

    // Product search & filters
    const searchInput = document.getElementById("productSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchTerm = e.target.value;
        renderProductsTable();
      });
    }

    const catFilter = document.getElementById("productCategoryFilter");
    if (catFilter) {
      catFilter.addEventListener("change", (e) => {
        state.categoryFilter = e.target.value;
        renderProductsTable();
      });
    }

    const stockFilter = document.getElementById("productStockFilter");
    if (stockFilter) {
      stockFilter.addEventListener("change", (e) => {
        state.stockFilter = e.target.value;
        renderProductsTable();
      });
    }

    // Open add product modal
    const openAddBtn = document.getElementById("btnOpenAddProduct");
    if (openAddBtn) {
      openAddBtn.addEventListener("click", () => openProductModal(null));
    }
    const emptyAddBtn = document.getElementById("btnEmptyAddProduct");
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener("click", () => openProductModal(null));
    }

    // Modal close buttons
    document.querySelectorAll(".js-close-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        productModal.classList.remove("admin-modal--open");
        invoiceModal.classList.remove("admin-modal--open");
      });
    });

    // Category select custom toggler
    const catInput = document.getElementById("productCategoryInput");
    const customCatGroup = document.getElementById("customCategoryGroup");
    if (catInput && customCatGroup) {
      catInput.addEventListener("change", (e) => {
        if (e.target.value === "__NEW__") {
          customCatGroup.style.display = "flex";
          document.getElementById("customCategoryInput").focus();
        } else {
          customCatGroup.style.display = "none";
        }
      });
    }

    // ==========================================
    // DIRECT PRODUCT IMAGE UPLOAD & DROPZONE
    // ==========================================
    const uploadZone = document.getElementById("productImageUploadZone");
    const fileInput = document.getElementById("productFileInput");

    if (uploadZone && fileInput) {
      ["dragenter", "dragover"].forEach(name => {
        uploadZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadZone.classList.add("dragover");
        });
      });

      ["dragleave", "drop"].forEach(name => {
        uploadZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          uploadZone.classList.remove("dragover");
        });
      });

      uploadZone.addEventListener("drop", async (e) => {
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (files.length > 0) {
          await processUploadedFiles(files);
        }
      });

      fileInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
        if (files.length > 0) {
          await processUploadedFiles(files);
        }
        fileInput.value = "";
      });
    }

    async function processUploadedFiles(files) {
      showToast(`Optimizing & uploading ${files.length} product image(s)...`, "success");
      for (const file of files) {
        try {
          const compressed = await compressImageFile(file);
          state.stagedImages.push(compressed);
        } catch (err) {
          console.error("Image processing error:", err);
          showToast(`Error processing ${file.name}`, "danger");
        }
      }
      renderStagedImages();
    }

    const btnAddUrl = document.getElementById("btnAddImageUrl");
    const inputUrl = document.getElementById("productImageUrlInput");
    if (btnAddUrl && inputUrl) {
      btnAddUrl.addEventListener("click", () => {
        const url = inputUrl.value.trim();
        if (url) {
          state.stagedImages.push(url);
          inputUrl.value = "";
          renderStagedImages();
        }
      });
    }

    const stagedGallery = document.getElementById("productImagesPreview");
    if (stagedGallery) {
      stagedGallery.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index, 10);

        if (action === "make-cover") {
          const [selected] = state.stagedImages.splice(index, 1);
          state.stagedImages.unshift(selected);
          renderStagedImages();
        } else if (action === "remove-image") {
          state.stagedImages.splice(index, 1);
          renderStagedImages();
        }
      });
    }

    // Product Form Submit
    const productForm = document.getElementById("productForm");
    if (productForm) {
      productForm.addEventListener("submit", handleSaveProduct);
    }

    // Product Table Actions Delegation
    const productTable = document.getElementById("productsTableBody");
    if (productTable) {
      productTable.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const id = Number(btn.dataset.id);

        if (action === "edit") {
          openProductModal(id);
        } else if (action === "duplicate") {
          const original = state.products.find(p => Number(p.id) === id);
          if (original) {
            const copy = { ...original, name: `${original.name} (Copy)` };
            delete copy.id;
            window.addProduct(copy);
            loadData();
            renderAll();
            showToast("Product duplicated successfully!");
          }
        } else if (action === "delete") {
          if (confirm("Are you sure you want to delete this product?")) {
            window.deleteProduct(id);
            loadData();
            renderAll();
            showToast("Product deleted.");
          }
        } else if (action === "toggle-stock") {
          const p = state.products.find(item => Number(item.id) === id);
          if (p) {
            const newStock = p.stock > 0 ? 0 : 15;
            window.updateProduct(id, { stock: newStock });
            loadData();
            renderAll();
            showToast(`Product marked as ${newStock > 0 ? "In Stock" : "Out of Stock"}`);
          }
        }
      });
    }

    // ============================================================
    // HERO SLIDER DIRECT UPLOADS & ACTIONS (No link required)
    // ============================================================
    const heroUploadZone = document.getElementById("heroSlideUploadZone");
    const heroFileInput = document.getElementById("heroSlideFileInput");

    if (heroUploadZone && heroFileInput) {
      ["dragenter", "dragover"].forEach(name => {
        heroUploadZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          heroUploadZone.classList.add("dragover");
        });
      });

      ["dragleave", "drop"].forEach(name => {
        heroUploadZone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          heroUploadZone.classList.remove("dragover");
        });
      });

      heroUploadZone.addEventListener("drop", async (e) => {
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
        if (files.length > 0) {
          await processHeroUploadFiles(files);
        }
      });

      heroFileInput.addEventListener("change", async (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/"));
        if (files.length > 0) {
          await processHeroUploadFiles(files);
        }
        heroFileInput.value = "";
      });
    }

    async function processHeroUploadFiles(files) {
      showToast(`Optimizing & adding ${files.length} hero banner image(s)...`, "success");
      for (const file of files) {
        try {
          const compressed = await compressImageFile(file, 1200, 1200, 0.85);
          const cleanName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
          state.heroSlides.push({
            image: compressed,
            alt: cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
          });
        } catch (err) {
          console.error("Hero image error:", err);
          showToast(`Error processing ${file.name}`, "danger");
        }
      }
      window.saveHeroSlides(state.heroSlides);
      renderHeroManager();
      renderKPIs();
      showToast("Hero slider updated with your new uploaded images!");
    }

    // Hero Add URL button
    const btnAddHeroUrl = document.getElementById("btnAddHeroUrl");
    const inputHeroUrl = document.getElementById("heroSlideUrlInput");
    if (btnAddHeroUrl && inputHeroUrl) {
      btnAddHeroUrl.addEventListener("click", () => {
        const url = inputHeroUrl.value.trim();
        if (url) {
          state.heroSlides.push({
            image: url,
            alt: "Featured Product"
          });
          inputHeroUrl.value = "";
          window.saveHeroSlides(state.heroSlides);
          renderHeroManager();
          renderKPIs();
          showToast("Image URL added to hero slider!");
        }
      });
    }

    // Hero Slides List delegation (Move Up, Move Down, Delete, change Alt label)
    const heroListEl = document.getElementById("heroSlidesList");
    if (heroListEl) {
      heroListEl.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const index = parseInt(btn.dataset.index, 10);

        if (action === "move-up-slide" && index > 0) {
          const temp = state.heroSlides[index];
          state.heroSlides[index] = state.heroSlides[index - 1];
          state.heroSlides[index - 1] = temp;
          window.saveHeroSlides(state.heroSlides);
          renderHeroManager();
        } else if (action === "move-down-slide" && index < state.heroSlides.length - 1) {
          const temp = state.heroSlides[index];
          state.heroSlides[index] = state.heroSlides[index + 1];
          state.heroSlides[index + 1] = temp;
          window.saveHeroSlides(state.heroSlides);
          renderHeroManager();
        } else if (action === "delete-slide") {
          if (state.heroSlides.length <= 1) {
            showToast("You need at least 1 image in the hero slider", "danger");
            return;
          }
          state.heroSlides.splice(index, 1);
          window.saveHeroSlides(state.heroSlides);
          renderHeroManager();
          renderKPIs();
          showToast("Slide removed from hero banner.");
        }
      });

      heroListEl.addEventListener("input", (e) => {
        if (e.target.classList.contains("hero-slide-alt-input")) {
          const index = parseInt(e.target.dataset.index, 10);
          if (state.heroSlides[index]) {
            state.heroSlides[index].alt = e.target.value.trim();
          }
        }
      });
    }

    // Hero Save Slider button
    const btnSaveHero = document.getElementById("btnSaveHeroSlider");
    if (btnSaveHero) {
      btnSaveHero.addEventListener("click", () => {
        const bTitle = document.getElementById("heroBadgeTitleInput")?.value.trim() || "10% Off";
        const bSub = document.getElementById("heroBadgeSubInput")?.value.trim() || "Limited Time Offer";
        
        window.saveHeroSlides(state.heroSlides);
        window.saveStoreSettings({
          ...state.settings,
          heroBadgeTitle: bTitle,
          heroBadgeSubtitle: bSub
        });

        state.settings.heroBadgeTitle = bTitle;
        state.settings.heroBadgeSubtitle = bSub;

        renderHeroManager();
        showToast("Hero visual slider & offer badge saved successfully!");
      });
    }

    // Hero Reset to Default Slides
    const btnResetHero = document.getElementById("btnResetHeroSlides");
    if (btnResetHero) {
      btnResetHero.addEventListener("click", () => {
        if (confirm("Reset the hero slider images back to original default tech gear?")) {
          state.heroSlides = window.resetHeroSlides();
          renderHeroManager();
          renderKPIs();
          showToast("Hero slider restored to default products!");
        }
      });
    }

    // Live update corner tag text preview when typing
    const titleInput = document.getElementById("heroBadgeTitleInput");
    const subInput = document.getElementById("heroBadgeSubInput");
    if (titleInput) {
      titleInput.addEventListener("input", (e) => {
        const el = document.getElementById("previewCornerTitle");
        if (el) el.textContent = e.target.value || "10% Off";
      });
    }
    if (subInput) {
      subInput.addEventListener("input", (e) => {
        const el = document.getElementById("previewCornerSub");
        if (el) el.textContent = e.target.value || "Limited Time Offer";
      });
    }

    // Orders Filter
    const orderStatusFilter = document.getElementById("orderStatusFilter");
    if (orderStatusFilter) {
      orderStatusFilter.addEventListener("change", (e) => {
        state.orderStatusFilter = e.target.value;
        renderOrdersTable();
      });
    }

    // Order table actions
    const ordersTable = document.getElementById("ordersTableBody");
    if (ordersTable) {
      ordersTable.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;

        if (action === "view-order") {
          openInvoiceModal(id);
        } else if (action === "delete-order") {
          if (confirm(`Delete order ${id}?`)) {
            state.orders = state.orders.filter(o => o.id !== id);
            saveOrders();
            renderOrdersTable();
            showToast(`Order ${id} deleted.`);
          }
        }
      });

      ordersTable.addEventListener("change", (e) => {
        if (e.target.classList.contains("order-status-select")) {
          const orderId = e.target.dataset.orderId;
          const newStatus = e.target.value;
          const order = state.orders.find(o => o.id === orderId);
          if (order) {
            order.status = newStatus;
            saveOrders();
            renderOrdersTable();
            showToast(`Order ${orderId} marked as ${newStatus}`);
          }
        }
      });
    }

    // Print Invoice
    const printBtn = document.getElementById("btnPrintInvoice");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print();
      });
    }

    // Sample order button
    const sampleOrderBtn = document.getElementById("btnGenerateSampleOrder");
    if (sampleOrderBtn) {
      sampleOrderBtn.addEventListener("click", generateSampleOrder);
    }

    // Store Settings Save
    const settingsForm = document.getElementById("settingsForm");
    if (settingsForm) {
      settingsForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const updated = {
          storeName: document.getElementById("settingStoreName").value.trim(),
          currencySymbol: document.getElementById("settingCurrency").value.trim(),
          shippingFee: parseFloat(document.getElementById("settingShippingFee").value) || 0,
          freeShippingThreshold: parseFloat(document.getElementById("settingFreeShipping").value) || 0,
          messengerPageId: document.getElementById("settingMessengerId").value.trim(),
          supportPhone: document.getElementById("settingPhone").value.trim(),
          supportEmail: document.getElementById("settingEmail").value.trim()
        };

        window.saveStoreSettings(updated);
        state.settings = { ...state.settings, ...updated };
        renderKPIs();
        showToast("Store settings saved successfully!");
      });
    }

    // Backup & Restore (Now also includes heroSlides!)
    const btnExportData = document.getElementById("btnExportData");
    if (btnExportData) {
      btnExportData.addEventListener("click", () => {
        const fullBackup = {
          version: "2.1",
          exportDate: new Date().toISOString(),
          products: state.products,
          heroSlides: state.heroSlides,
          orders: state.orders,
          settings: state.settings
        };
        const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `techkitch-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast("Complete store & hero banner backup exported!");
      });
    }

    const importInput = document.getElementById("importDataInput");
    if (importInput) {
      importInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            if (data.products && Array.isArray(data.products)) {
              window.saveStoredProducts(data.products);
            }
            if (data.heroSlides && Array.isArray(data.heroSlides)) {
              window.saveHeroSlides(data.heroSlides);
            }
            if (data.orders && Array.isArray(data.orders)) {
              state.orders = data.orders;
              saveOrders();
            }
            if (data.settings && typeof data.settings === "object") {
              window.saveStoreSettings(data.settings);
            }
            loadData();
            renderAll();
            showToast("Backup restored successfully!");
          } catch (err) {
            console.error(err);
            showToast("Invalid JSON backup file", "danger");
          }
        };
        reader.readAsText(file);
      });
    }

    // Factory Reset
    const btnResetFactory = document.getElementById("btnResetFactory");
    if (btnResetFactory) {
      btnResetFactory.addEventListener("click", () => {
        if (confirm("Reset catalog back to the original 8 default products? Custom products will be replaced.")) {
          window.resetStoredProducts();
          window.resetHeroSlides();
          loadData();
          renderAll();
          showToast("Products and hero slider reset to factory default catalog.");
        }
      });
    }
  }

  // Boot when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
