/* ============================================================
   TECHKITCH — CHECKOUT / MESSENGER DIRECT ORDER SYSTEM
   ============================================================ */

const ORDERS_KEY = "techkitch_orders_v1";
const MESSENGER_PAGE_ID = "61591512496468";

function renderCheckoutSummary() {
  const el = document.querySelector(".js-checkout-summary");
  const layout = document.querySelector(".js-checkout-layout");
  const empty = document.querySelector(".js-checkout-empty");
  if (!el) return;

  const { items, subtotal, shipping, tax, total } = getCartDetails();

  if (items.length === 0) {
    if (layout) layout.style.display = "none";
    if (empty) empty.style.display = "block";
    return;
  }
  if (layout) layout.style.display = "grid";
  if (empty) empty.style.display = "none";

  el.innerHTML = `
    <div style="max-height:260px; overflow-y:auto; margin-bottom:16px;">
      ${items
        .map(
          (i) => `
        <div class="cart-line">
          <img src="${i.image}" alt="${i.name}" />
          <div class="cart-line__info">
            <div class="cart-line__name">${i.name}</div>
            <div style="font-size:0.82rem;color:var(--muted);">Qty ${i.qty}</div>
          </div>
          <div class="price-tag">${formatMoney(i.lineTotal)}</div>
        </div>`
        )
        .join("")}
    </div>
    <div class="summary-row"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "Free" : formatMoney(shipping)}</span></div>
    ${tax > 0 ? `<div class="summary-row"><span>Tax</span><span>${formatMoney(tax)}</span></div>` : ""}
    <div class="summary-row summary-row--total"><span>Total</span><span>${formatMoney(total)}</span></div>
  `;
}

function generateOrderId() {
  const rand = Math.floor(10000 + Math.random() * 89999);
  return `TK-${rand}`;
}

function saveOrder(order) {
  const raw = localStorage.getItem(ORDERS_KEY);
  const orders = raw ? JSON.parse(raw) : [];
  orders.push(order);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

  // Persist order in Firebase Firestore
  if (window.TechKitchDB && window.TechKitchDB.createOrderInFirestore) {
    window.TechKitchDB.createOrderInFirestore(order).catch((err) => {
      console.warn("Failed to create order in Firestore:", err);
    });
  }
}

function validateField(field, condition) {
  const wrapper = field.closest(".field");
  if (!wrapper) return condition;
  wrapper.classList.toggle("field--invalid", !condition);
  return condition;
}

function initCheckoutForm() {
  const form = document.querySelector(".js-checkout-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const fullName = form.querySelector("#fullName");
    const email = form.querySelector("#email");
    const phone = form.querySelector("#phone");
    const address = form.querySelector("#address");
    const city = form.querySelector("#city");
    const zip = form.querySelector("#zip");

    let valid = true;
    valid = validateField(fullName, fullName.value.trim().length > 1) && valid;
    valid = validateField(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) && valid;
    valid = validateField(phone, phone.value.trim().length >= 7) && valid;
    valid = validateField(address, address.value.trim().length > 4) && valid;
    valid = validateField(city, city.value.trim().length > 1) && valid;
    valid = validateField(zip, zip.value.trim().length >= 3) && valid;

    if (!valid) {
      form.querySelector(".field--invalid input")?.focus();
      return;
    }

    const { items, subtotal, shipping, tax, total } = getCartDetails();
    if (items.length === 0) return;

    const paymentMethod = form.querySelector('input[name="payment"]:checked')?.value || "Cash On Delivery";

    const order = {
      id: generateOrderId(),
      date: new Date().toISOString(),
      customer: {
        name: fullName.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        address: address.value.trim(),
        city: city.value.trim(),
        zip: zip.value.trim(),
      },
      paymentMethod,
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        price: i.price,
        lineTotal: i.lineTotal,
        image: window.location.origin + "/" + i.image
      })),
      subtotal,
      shipping,
      tax,
      total,
      status: "Processing",
    };

    saveOrder(order);
    sendOrderToMessenger(order);
    clearCart();
    showConfirmation(order);
  });
}

function sendOrderToMessenger(order) {
  let message = `🛒 NEW ORDER PLACED (${order.id})\n`;
  message += `-----------------------------------\n\n`;

  message += `👤 Customer Details:\n`;
  message += `• Name: ${order.customer.name}\n`;
  message += `• Phone: ${order.customer.phone}\n`;
  message += `• Email: ${order.customer.email}\n`;
  message += `• Address: ${order.customer.address}, ${order.customer.city} - ${order.customer.zip}\n\n`;

  message += `📦 Ordered Items:\n`;
  order.items.forEach((item, index) => {
    message += `${index + 1}. ${item.name}\n`;
    message += `   • Quantity: ${item.qty}\n`;
    message += `   • Price: ${formatMoney(item.lineTotal)}\n`;
    message += `   • Image: ${item.image}\n\n`;
  });

  message += `💰 Order Summary:\n`;
  message += `• Subtotal: ${formatMoney(order.subtotal)}\n`;
  message += `• Shipping Charge: ${order.shipping === 0 ? "Free" : formatMoney(order.shipping)}\n`;
  message += `• Total Payable: ${formatMoney(order.total)}\n\n`;

  message += `💳 Payment Method:\n`;
  message += `• ${order.paymentMethod}`;

  const encodedMessage = encodeURIComponent(message);
  const messengerUrl = `https://m.me/${MESSENGER_PAGE_ID}?text=${encodedMessage}`;

  window.open(messengerUrl, "_blank");
}

function showConfirmation(order) {
  document.querySelector(".js-checkout-form-view").style.display = "none";
  const confirm = document.querySelector(".js-order-confirm");
  confirm.style.display = "block";
  confirm.querySelector(".js-order-id").textContent = order.id;
  confirm.querySelector(".js-order-total").textContent = formatMoney(order.total);
  confirm.querySelector(".js-order-method").textContent = order.paymentMethod;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCheckoutSummary();
  initCheckoutForm();
});
