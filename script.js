// ================== CONFIG ==================
// Put your WhatsApp business number here. If you use only 10 digits (India), script will prepend '91'.
const BUSINESS_WHATSAPP_NUMBER = "9821357880"; // keep digits only

// ================ STATE & DOM ================
let cart = []; // items: { id, name, price, size, color, quantity, front }
const productGrid = document.getElementById("product-grid");
const cartItemsEl = document.getElementById("cart-items");
const cartTotalEl = document.getElementById("cart-total");
const cartCountEl = document.getElementById("cart-count");
const checkoutBtn = document.getElementById("checkout-btn");
const orderModal = document.getElementById("order-modal");
const modalClose = document.getElementById("modal-close");
const backToCartBtn = document.getElementById("back-to-cart");
const orderForm = document.getElementById("orderForm");
const orderStatus = document.getElementById("order-status");
const cartToggle = document.getElementById("cart-toggle");
const cartPanel = document.getElementById("cart-panel");
const closeCartBtn = document.getElementById("close-cart");
const orderSummaryModal = document.getElementById("orderSummaryModal");
const summaryDetails = document.getElementById("summaryDetails");
const downloadPDFBtn = document.getElementById("downloadPDF");
const finalWhatsAppBtn = document.getElementById("finalWhatsApp");
const closeSummaryBtn = document.getElementById("closeSummary");

// storage key
const STORAGE_KEY = "myts_cart_v2";

// ================ INIT ================
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
  loadCart();
  updateCartUI();
  setupListeners();
  document.getElementById("year").textContent = new Date().getFullYear();
});

function setupListeners(){
  // cart toggle (header)
  cartToggle?.addEventListener("click", () => {
    openCartPanel();
  });
  closeCartBtn?.addEventListener("click", () => closeCartPanel());
  document.getElementById("paymentMethod")?.addEventListener("change", function() {
    const uploadArea = document.getElementById("screenshot-upload-area");
    if (this.value === "UPI / QR Code") {
      uploadArea.style.display = "block";
    } else {
      uploadArea.style.display = "none";
    }
  });
  // checkout & modals
  checkoutBtn?.addEventListener("click", openOrderModal);
  modalClose?.addEventListener("click", closeOrderModal);
  backToCartBtn?.addEventListener("click", closeOrderModal);
  orderForm?.addEventListener("submit", handleSubmitOrder);
  downloadPDFBtn?.addEventListener("click", handleDownloadPDF);
  finalWhatsAppBtn?.addEventListener("click", sendWhatsAppFromSummary);
  closeSummaryBtn?.addEventListener("click", ()=> closeSummary());
  // close summary if clicking outside
  orderSummaryModal?.addEventListener("click", (e)=>{ if(e.target === orderSummaryModal) closeSummary(); });
  orderModal?.addEventListener("click", (e)=>{ if(e.target === orderModal) closeOrderModal(); });

}

// ================ PRODUCTS RENDER ================
function renderProducts(){
  productGrid.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product";

    const sizeOptions = p.sizes.map(s => `<option value="${s}">${s}</option>`).join("");
    const colorOptions = (p.colors || ["Default"]).map(c => `<option value="${c}">${c}</option>`).join("");

    card.innerHTML = `
      <div class="product-image">
       <img id="img-${p.id}" src="${p.images.front}" alt="${escapeHtml(p.name)}" style="cursor: zoom-in;"> 
      </div>

      <h3>${escapeHtml(p.name)}</h3>
      <p class="product-price">₹${p.price.toFixed(0)}</p>

      <div class="controls">
        <select id="size-${p.id}" class="select">${sizeOptions}</select>
        <select id="color-${p.id}" class="select">${colorOptions}</select>

        <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
          <button class="toggle-view btn-secondary" data-id="${p.id}" data-view="front">Front</button>
          <button class="toggle-view btn-secondary" data-id="${p.id}" data-view="back">Back</button>
        </div>
      </div>

      <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
        <button class="add-to-cart btn-primary" data-id="${p.id}">Add to Cart</button>
      </div>
    `;

    productGrid.appendChild(card);

    // attach listeners
    const addBtn = card.querySelector(".add-to-cart");
    addBtn.addEventListener("click", () => addToCartFromUI(p.id));

    const frontBtn = card.querySelector(".toggle-view[data-view='front']");
    const backBtn = card.querySelector(".toggle-view[data-view='back']");
    frontBtn.addEventListener("click", () => changeImage(p.id, "front"));
    backBtn.addEventListener("click", () => changeImage(p.id, "back"));

    const imgEl = card.querySelector(`#img-${p.id}`);
    imgEl.addEventListener("click", () => openZoomModal(imgEl.src));
  });

  productGrid.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product";

    // 1. Check if the product is sold out
    const isSoldOut = p.soldOut === true;

    const sizeOptions = p.sizes.map(s => `<option value="${s}">${s}</option>`).join("");
    const colorOptions = (p.colors || ["Default"]).map(c => `<option value="${c}">${c}</option>`).join("");

    // 2. Define the middle section (Controls)
    let controlsContent = "";
    if (isSoldOut) {
      controlsContent = `
        <div style="width:100%; text-align:center; padding: 12px; background:linear-gradient(145deg, #fff5f5, #fed7d7);; border: 2px solid #feb2b2; border-radius:12px;">
          <span style="color:#c53030; font-weight:900; font-size:20px; letter-spacing:2px;">SOLD OUT</span>
        </div>`;
    } else {
      controlsContent = `
        <div class="controls">
          <select id="size-${p.id}" class="select">${sizeOptions}</select>
          <select id="color-${p.id}" class="select">${colorOptions}</select>

          <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
            <button class="toggle-view btn-secondary" data-id="${p.id}" data-view="front">Front</button>
            <button class="toggle-view btn-secondary" data-id="${p.id}" data-view="back">Back</button>
          </div>
        </div>`;
    }

    // 3. Define the bottom section (Button)
    let actionButton = "";
    if (!isSoldOut) {
      actionButton = `
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
          <button class="add-to-cart btn-primary" data-id="${p.id}">Add to Cart</button>
        </div>`;
    }

    card.innerHTML = `
      <div class="product-image">
       <img id="img-${p.id}" src="${p.images.front}" alt="${escapeHtml(p.name)}" 
            style="cursor: zoom-in; ${isSoldOut ? 'opacity: 0.7;' : ''}"> 
      </div>

      <h3>${escapeHtml(p.name)}</h3>
      <p class="product-price">₹${p.price.toFixed(0)}</p>

      ${controlsContent}
      ${actionButton}
    `;

    productGrid.appendChild(card);

    // 4. Attach listeners ONLY if NOT sold out
    if (!isSoldOut) {
      const addBtn = card.querySelector(".add-to-cart");
      addBtn.addEventListener("click", () => addToCartFromUI(p.id));

      const frontBtn = card.querySelector(".toggle-view[data-view='front']");
      const backBtn = card.querySelector(".toggle-view[data-view='back']");
      frontBtn.addEventListener("click", () => changeImage(p.id, "front"));
      backBtn.addEventListener("click", () => changeImage(p.id, "back"));
    }

    const imgEl = card.querySelector(`#img-${p.id}`);
    imgEl.addEventListener("click", () => openZoomModal(imgEl.src));
  });
}

// image controls
function changeImage(id, which){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  const img = document.getElementById(`img-${id}`);
  img.src = which === "back" ? p.images.back : p.images.front;
}
function toggleImage(id){
  const p = products.find(x=>x.id===id);
  if(!p) return;
  const img = document.getElementById(`img-${id}`);
  img.src = img.src.includes(p.images.front) ? p.images.back : p.images.front;
}

// ================ ZOOM MODAL LOGIC ================
function openZoomModal(src) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("imgFull");
    if (!modal || !modalImg) return;

    modalImg.src = src;
    modal.style.display = "flex"; // Shows the modal
    
    // Close modal if clicking outside the image
    modal.onclick = (e) => {
        if (e.target === modal) closeZoomModal();
    };
}

function closeZoomModal() {
    const modal = document.getElementById("imageModal");
    if (modal) modal.style.display = "none";
}

// ================ CART LOGIC ================
function addToCartFromUI(productId){
  const p = products.find(x=>x.id===productId);
  if(!p) return;

  const size = document.getElementById(`size-${productId}`).value || (p.sizes && p.sizes[0]) || "";
  const color = document.getElementById(`color-${productId}`).value || (p.colors && p.colors[0]) || "";

  const existing = cart.find(it => it.id===productId && it.size===size && it.color===color);
  if(existing){
    existing.quantity += 1;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: p.price,
      size: size,
      color: color,
      quantity: 1,
      front: p.images.front
    });
  }

  saveCart();
  updateCartUI();
  openCartPanel();

  // quick feedback
  const btn = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
  if(btn){
    const orig = btn.textContent;
    btn.textContent = "Added!";
    btn.classList.add("added");
    setTimeout(()=>{ btn.textContent = orig; btn.classList.remove("added"); }, 800);
  }
}

function removeFromCartKey(id,size,color){
  cart = cart.filter(it => !(it.id===id && it.size===size && it.color===color));
  saveCart();
  updateCartUI();
}

function changeQtyKey(id,size,color,delta){
  const item = cart.find(it => it.id===id && it.size===size && it.color===color);
  if(!item) return;
  item.quantity += delta;
  if(item.quantity < 1){
    removeFromCartKey(id,size,color);
  } else {
    saveCart();
    updateCartUI();
  }
}

function updateCartUI(){
  cartItemsEl.innerHTML = "";
  if(cart.length === 0){
    cartItemsEl.innerHTML = `<p id="empty-cart-message">Your cart is empty</p>`;
    cartTotalEl.textContent = "0.00";
    cartCountEl.textContent = "0";
    checkoutBtn.disabled = true;
    return;
  }

  let total = 0;
  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${item.front}" alt="${escapeHtml(item.name)}" />
      <div style="flex:1">
        <div class="cart-item-info">
          <h4>${escapeHtml(item.name)}</h4>
          <p>Size: ${escapeHtml(item.size)} • Color: ${escapeHtml(item.color)}</p>
          <p>₹${item.price.toFixed(0)} each</p>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
        <div class="quantity-controls">
          <button class="quantity-btn" data-action="dec">−</button>
          <span style="min-width:30px;text-align:center">${item.quantity}</span>
          <button class="quantity-btn" data-action="inc">+</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <p style="margin:0;font-weight:700">₹${(itemTotal).toFixed(0)}</p>
          <button class="remove-btn">Remove</button>
        </div>
      </div>
    `;

    // attach events
    const decBtn = row.querySelector(`.quantity-btn[data-action="dec"]`);
    const incBtn = row.querySelector(`.quantity-btn[data-action="inc"]`);
    const removeBtn = row.querySelector(".remove-btn");

    decBtn.addEventListener("click", ()=> changeQtyKey(item.id, item.size, item.color, -1));
    incBtn.addEventListener("click", ()=> changeQtyKey(item.id, item.size, item.color, +1));
    removeBtn.addEventListener("click", ()=> removeFromCartKey(item.id, item.size, item.color));

    cartItemsEl.appendChild(row);
  });

  cartTotalEl.textContent = total.toFixed(2);
  cartCountEl.textContent = cart.reduce((s,i)=>s+i.quantity,0);
  checkoutBtn.disabled = false;
}

// ================ PERSISTENCE ================
function saveCart(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch(e) {
    console.warn("Could not save cart", e);
  }
}
function loadCart(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) cart = JSON.parse(raw);
  } catch(e){
    cart = [];
  }
}

// ================ CART PANEL (open/close) ================
function openCartPanel(){
  if(!cartPanel) return;
  cartPanel.classList.add("open");
  cartPanel.setAttribute("aria-hidden","false");
}
function closeCartPanel(){
  if(!cartPanel) return;
  cartPanel.classList.remove("open");
  cartPanel.setAttribute("aria-hidden","true");
}
function toggleCart() {
    document.querySelector(".cart-panel").classList.toggle("active");
}

// ================ ORDER SUMMARY & PDF ================
document.getElementById("placeOrder")?.addEventListener("click", () => {
    // build summary from current cart
    const name = document.getElementById("custName")?.value || "";
    const phone = document.getElementById("custPhone")?.value || "";
    const address = document.getElementById("custAddress")?.value || "";
    const notes = document.getElementById("custNotes")?.value || "";

    let html = `<p><b>Name:</b> ${escapeHtml(name)}</p>
                <p><b>Phone:</b> ${escapeHtml(phone)}</p>
                <p><b>Address:</b> ${escapeHtml(address)}</p>
                <p><b>Notes:</b> ${escapeHtml(notes)}</p>
                <hr><h3>Items:</h3>`;

    if(cart.length === 0) html += "<p><i>Cart is empty</i></p>";
    cart.forEach(item => {
      html += `<p>${escapeHtml(item.name)} (Size: ${escapeHtml(item.size)}, Color: ${escapeHtml(item.color)}) — Qty: ${item.quantity} — ₹${item.price*item.quantity}</p>`;
    });

    summaryDetails.innerHTML = html;
    openSummary();
});

function openSummary(){
    closeOrderModal(); 
    orderSummaryModal.classList.add("open");
}
function closeSummary(){
  orderSummaryModal?.setAttribute("aria-hidden","true");
  orderSummaryModal?.classList.remove("open");
}

// PDF handler
function handleDownloadPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    let y = 12;

    // 1. PDF Header
    pdf.setFontSize(16);
    pdf.text("Invoice: 7V_STORE", 12, y);
    y += 10;

    // 2. Customer Details
    const name = document.getElementById("custName")?.value || document.getElementById("name")?.value || "";
    const phone = document.getElementById("custPhone")?.value || document.getElementById("phone")?.value || "";
    const address = document.getElementById("custAddress")?.value || document.getElementById("address")?.value || "";

    pdf.setFontSize(11);
    pdf.text(`Name: ${name}`, 12, y); y += 8;
    pdf.text(`Phone: ${phone}`, 12, y); y += 8;
    pdf.text(`Address: ${address}`, 12, y); y += 12;

    // 3. Order Details
    pdf.setFont("helvetica", "bold");
    pdf.text("Order Details:", 12, y); y += 8;
    pdf.setFont("helvetica", "normal");

    cart.forEach(item => {
        pdf.text(`${item.name} - Size: ${item.size} - Qty: ${item.quantity} - ₹${(item.price * item.quantity).toFixed(0)}`, 12, y);
        y += 8;
        if (y > 270) { pdf.addPage(); y = 12; }
    });

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(0);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Grand Total: ₹${total}`, 12, y + 5);
    y += 20;

    // 4. ATTACH SCREENSHOT TO PDF
    const fileInput = document.getElementById("summary-ss"); //
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const imgData = e.target.result;
            
            // Check if we need a new page for the image
            if (y > 200) { pdf.addPage(); y = 20; }
            
            pdf.text("Payment Proof (Screenshot):", 12, y);
            // addImage(data, type, x, y, width, height)
            pdf.addImage(imgData, 'JPEG', 12, y + 5, 80, 100); 
            
            pdf.save(`Invoice-7V_Store-${name}.pdf`);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        // If no image, just save the PDF immediately
        pdf.save(`Invoice-7V_Store-${name}.pdf`);
    }
}

// ================ WHATSAPP ORDER FLOW ================
// Helper: sanitize & ensure country code (assume India 91 if 10 digits)
function normalizePhone(number){
  if(!number) return "";
  let n = String(number).replace(/\D/g,""); // digits only
  if(n.length === 10){ n = "91" + n; } // assume India
  return n;
}

function sendWhatsAppMessageNumber(rawNumber, message){
  const to = normalizePhone(rawNumber);
  if(!to || to.length < 8){
    alert("Invalid WhatsApp number.");
    return;
  }
  const url = `https://wa.me/${to}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// called from finalWhatsAppBtn
function sendWhatsAppFromSummary(){
  // build message using cart and (optional) form fields
  const name = document.getElementById("custName")?.value || document.getElementById("name")?.value || "";
  const phone = document.getElementById("custPhone")?.value || document.getElementById("phone")?.value || "";
  const address = document.getElementById("custAddress")?.value || document.getElementById("address")?.value || "";
  const notes = document.getElementById("custNotes")?.value || document.getElementById("notes")?.value || "";
  const payment = document.getElementById("paymentMethod")?.value || "";
  const hasImage = document.getElementById("summary-ss")?.files.length > 0;
  if(!name || !phone || !address)
    {
    alert("Please fill name, phone and address in the checkout form first.");
    closeSummary();
    return;
  }

  const total = cart.reduce((s,i)=>s + i.price * i.quantity, 0).toFixed(0);

  let lines = [];
  lines.push("*New Order from 7V_Store*");
  lines.push(`*Name:* ${name}`);
  lines.push(`*Contact:* ${phone}`);
  lines.push(`*Address:* ${address}`);
  lines.push("");
  lines.push("*Items:*");
  cart.forEach(i => lines.push(`- ${i.name} | Size: ${i.size} | Color: ${i.color} | Qty: ${i.quantity} | ₹${(i.price*i.quantity).toFixed(0)}`));
  lines.push("");
  lines.push(`*Total:* ₹${total}`);
  if(notes){ lines.push(""); lines.push(`*Notes:* ${notes}`); }
  lines.push("");
  if (payment === "UPI / QR Code") {
        if (hasImage) {
            lines.push(`*Payment:* ONLINE Payment Done (Screenshot Uploaded)`);
        } else {
            lines.push(`*Payment:*ONLINE (Screenshot NOT uploaded)`);
        }
    } else {
        lines.push(`*Payment:* Cash on Delivery`);
    } 
  lines.push(`*Order time:* ${new Date().toLocaleString()}`);
  // send to business number (configured at top)
 const message = lines.join("\n");
 const waUrl = `https://wa.me/${normalizePhone(BUSINESS_WHATSAPP_NUMBER)}?text=${encodeURIComponent(message)}`;
 window.open(waUrl, "_blank");

  // 2. Validation Check
  if(!businessNumberNormalized){
    alert("Business WhatsApp number not configured correctly in script.js");
    return;
  }

  // clear cart & UI after send intent
  cart = [];
  saveCart();
  updateCartUI();
  closeSummary();
  closeOrderModal();
}

// ================ ORDER MODAL (open/close) ================
function openOrderModal() {
  document.querySelector('.modal').classList.add('open');
  document.querySelector('.cart-panel').classList.remove('open');
}

function closeOrderModal() {
  document.querySelector('.modal').classList.remove('open');
}

// handle form submit: show summary modal populated
function handleSubmitOrder(e) {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const payment = document.getElementById("paymentMethod").value;

    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(0);
    
    // REPLACE '9821357880@ibl' WITH YOUR ACTUAL UPI ID (GPay/PhonePe ID)
    const myUpiId = "saloni.ghugare04-3@okhdfcbank"; 
    const upiUrl = `upi://pay?pa=${myUpiId}&pn=7V_Store&am=${total}&cu=INR&tn=Order_from_${name.replace(/\s/g, '_')}`;

    let html = `
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Phone:</b> ${escapeHtml(phone)}</p>
        <p><b>Payment:</b> ${escapeHtml(payment)}</p>
        <hr>`;

    const uploadArea = document.getElementById("summaryUploadArea");
    uploadArea.innerHTML = ""; 

    if (payment === "UPI / QR Code") {
        html += `
            <div style="text-align:center; margin: 15px 0; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 10px;">
                <p style="font-weight:bold; color:#28a745; margin-bottom: 12px;">Step 1: Pay ₹${total}</p>
                
                <a href="${upiUrl}" class="btn-primary" style="background:#28a745; color:white; text-decoration:none; display:inline-block; padding:12px 20px; border-radius:5px; font-weight:bold; margin-bottom:15px;">
                    Pay Now via UPI App (GPay/PhonePe)
                </a>

                <p style="font-size:12px; color:#666; margin: 10px 0;">-- OR Scan QR --</p>
                <img src="images/QR.jpeg" alt="QR" style="width:150px; height:150px; display:block; margin: 0 auto;">
            </div>`;

        uploadArea.innerHTML = `
            <div style="margin-top:15px; padding:10px; border: 1px solid #eee; background:#fffdf0; border-radius:8px;">
                <label style="font-size:18px; font-weight:bold; display:block; margin-bottom:5px;">Step 2: Upload Payment Screenshot</label>
                <input type="file" id="summary-ss" accept="image/*" style="font-size:12px; width:100%;">
                <p style="font-size:13px; color:#d9534f; margin-top:5px;">Note: Attach this image in the next step (WhatsApp).</p>
                <p style="font-size: 12px; color: #666; margin-top: 8px;">
                You cannot send the WhatsApp order without attaching proof of payment.</p>
            
            </div>`;
    }

    html += `<h3>Items:</h3>`;
    cart.forEach(item => {
        html += `<p>${escapeHtml(item.name)} — Size: ${escapeHtml(item.size)} — Qty: ${item.quantity}</p>`;
    });

    summaryDetails.innerHTML = html;
    openSummary();
}

// Helper function for the preview
function handlePreview(event) {
    const container = document.getElementById("ss-preview-container");
    if (event.target.files && event.target.files[0]) {
        container.style.display = "block";
    }
}

// ================ HELPERS ================
function escapeHtml(str){
  if(!str) return "";
  return String(str).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}
