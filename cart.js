/* ============================================================
   TECHKITCH — CART SYSTEM
   Handles all cart storage & math. Shared by every page.
   ============================================================ */

const CART_KEY = "techkitch_cart_v1";

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Cart read error:", e);
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function findProduct(id) {
  return PRODUCTS.find((p) => Number(p.id) === Number(id) || String(p.id) === String(id));
}

function addToCart(productId, qty = 1) {
  const product = findProduct(productId);
  if (!product || product.stock <= 0) return;

  const cart = getCart();
  const existing = cart.find((i) => i.id === productId);

  if (existing) {
    existing.qty = Math.min(existing.qty + qty, product.stock);
  } else {
    cart.push({ id: productId, qty: Math.min(qty, product.stock) });
  }
  saveCart(cart);
  showToast(`${product.name} added to cart`);
}

function removeFromCart(productId) {
  const cart = getCart().filter((i) => i.id !== productId);
  saveCart(cart);
}

function setQty(productId, qty) {
  const product = findProduct(productId);
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }
  item.qty = Math.min(qty, product ? product.stock : qty);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartDetails() {
  const cart = getCart();
  const items = cart
    .map((i) => {
      const product = findProduct(i.id);
      if (!product) return null;
      return { ...product, qty: i.qty, lineTotal: +(product.price * i.qty).toFixed(2) };
    })
    .filter(Boolean);

  const subtotal = +items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2);
  const shipping =
    items.length === 0 || subtotal >= (STORE_SETTINGS.freeShippingThreshold || 2000)
      ? 0
      : STORE_SETTINGS.shippingFee;
  const tax = +(subtotal * STORE_SETTINGS.taxRate).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, subtotal, shipping, tax, total, itemCount };
}

function formatMoney(n) {
  return STORE_SETTINGS.currencySymbol + (Number(n) || 0).toFixed(2);
}

function updateCartBadge() {
  const badge = document.querySelectorAll(".js-cart-count");
  const { itemCount } = getCartDetails();
  badge.forEach((el) => {
    el.textContent = itemCount;
    el.style.display = itemCount > 0 ? "flex" : "none";
  });
}

/* Simple toast notification */
function showToast(message) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--show"));

  setTimeout(() => {
    toast.classList.remove("toast--show");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
