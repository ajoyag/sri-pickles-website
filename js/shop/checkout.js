/* =========================================================
   Checkout
   Responsibility:
   - Shipping & billing address
   - Checkout steps
   - Promo codes
   - Payment selection
   - Order creation
   - Checkout state persistence
   ========================================================= */

/* ---------- STATE ---------- */
let shippingData = {};
let savedAddresses = [];
let selectedAddressId = 'new';
let appliedPromo = null;
let selectedPaymentMethod = null;

const CHECKOUT_STATE_KEY = 'checkout_state';

/* ---------- OPEN / CLOSE ---------- */
window.openCheckout = function () {
    if (CartService.isEmpty()) {
        UIService.showToast('Your cart is empty!');
        return;
    }

    ShopCartUI.toggle();

    document.getElementById('checkout-modal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    resetCheckoutUI();
    loadSavedAddresses();
    updateCheckoutTotals();
};

window.closeCheckout = function () {
    document.getElementById('checkout-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
    clearCheckoutState();
};

/* ---------- RESET ---------- */
function resetCheckoutUI() {
    ['checkout-step-1', 'checkout-step-2', 'checkout-step-3', 'checkout-step-failed']
        .forEach(id => document.getElementById(id)?.classList.add('hidden'));

    document.getElementById('checkout-step-1')?.classList.remove('hidden');

    appliedPromo = null;
    selectedPaymentMethod = null;

    const promoInput = document.getElementById('promo-code-input');
    if (promoInput) {
        promoInput.value = '';
        promoInput.readOnly = false;
        promoInput.className = promoInput.className.replace(/border-\S+/g, '');
    }

    document.getElementById('promo-message')?.classList.add('hidden');
}

/* ---------- ADDRESS ---------- */
async function loadSavedAddresses() {
    if (!window.apiHelpers) return;

    const container = document.getElementById('saved-addresses-container');
    if (!container) return;

    container.innerHTML = 'Loading addresses...';

    const { data, error } = await apiHelpers.getUserAddresses();
    if (error || !data || data.length === 0) {
        savedAddresses = [];
        selectedAddressId = 'new';
        container.classList.add('hidden');
        document.getElementById('new-address-form')?.classList.remove('hidden');
        return;
    }

    savedAddresses = data;
    selectedAddressId = data[0].id;
    renderSavedAddresses();
}

function renderSavedAddresses() {
    const container = document.getElementById('saved-addresses-container');
    if (!container) return;

    container.innerHTML = savedAddresses.map(addr => `
        <div onclick="selectAddress('${addr.id}')"
             class="p-3 border rounded cursor-pointer ${selectedAddressId === addr.id ? 'border-spice-red bg-red-50' : ''}">
            <div class="font-bold">${addr.name}</div>
            <div class="text-xs">${addr.address}, ${addr.city}</div>
        </div>
    `).join('');

    container.classList.remove('hidden');
}

window.selectAddress = function (id) {
    selectedAddressId = id;
    renderSavedAddresses();

    const form = document.getElementById('new-address-form');
    if (!form) return;

    if (id === 'new') {
        form.classList.remove('hidden');
    } else {
        form.classList.add('hidden');
    }
};

/* ---------- GO TO REVIEW ---------- */
window.goToPayment = async function (e) {
    if (e) e.preventDefault();

    if (selectedAddressId === 'new') {
        shippingData = collectShippingForm();
        if (!shippingData) return;

        try {
            await apiHelpers.saveAddress({
                ...shippingData,
                is_default: savedAddresses.length === 0
            });
        } catch { }
    } else {
        const addr = savedAddresses.find(a => a.id === selectedAddressId);
        if (!addr) {
            UIService.showToast('Select address');
            return;
        }

        shippingData = {
            ...addr,
            email: document.getElementById('shipping-email')?.value || ''
        };
    }

    showReviewStep();
    saveCheckoutState();
};

function collectShippingForm() {
    const required = ['shipping-name', 'shipping-phone', 'shipping-address', 'shipping-city', 'shipping-pincode'];
    for (const id of required) {
        if (!document.getElementById(id)?.value) {
            UIService.showToast('Fill all required fields');
            return null;
        }
    }

    return {
        name: document.getElementById('shipping-name').value,
        phone: document.getElementById('shipping-phone').value,
        email: document.getElementById('shipping-email').value,
        address: document.getElementById('shipping-address').value,
        city: document.getElementById('shipping-city').value,
        state: document.getElementById('shipping-state').value,
        pincode: document.getElementById('shipping-pincode').value
    };
}

/* ---------- REVIEW ---------- */
function showReviewStep() {
    document.getElementById('checkout-step-1')?.classList.add('hidden');
    document.getElementById('checkout-step-2')?.classList.remove('hidden');

    const items = CartService.getItems();
    const container = document.getElementById('review-items-container');

    if (container) {
        container.innerHTML = items.map(i => `
            <div class="flex justify-between text-sm">
                <span>${i.qty} × ${i.name}</span>
                <span>₹${(i.qty * i.price).toFixed(2)}</span>
            </div>
        `).join('');
    }

    const ship = document.getElementById('review-shipping-info');
    if (ship) {
        ship.innerHTML = `
            <strong>${shippingData.name}</strong><br>
            ${shippingData.address}<br>
            ${shippingData.city} - ${shippingData.pincode}
        `;
    }

    updateCheckoutTotals();
}

/* ---------- TOTALS ---------- */
function updateCheckoutTotals() {
    const { subtotal, gst, shipping, total } = CartService.getTotals();
    let discount = appliedPromo ? (subtotal * appliedPromo.discount_percent) / 100 : 0;
    const finalTotal = total - discount;

    setText('checkout-subtotal', subtotal);
    setText('checkout-gst', gst);
    setText('checkout-shipping', shipping);
    setText('checkout-total', finalTotal);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerText = `₹${val.toFixed(2)}`;
}

/* ---------- PROMO ---------- */
window.applyPromoCode = async function () {
    const input = document.getElementById('promo-code-input');
    if (!input?.value) return;

    const { data, error } = await apiHelpers.validatePromoCode(input.value.trim());
    if (error) {
        UIService.showToast(error);
        appliedPromo = null;
    } else {
        appliedPromo = data;
        UIService.showToast(`Promo applied (${data.discount_percent}%)`);
    }

    updateCheckoutTotals();
};

window.removePromoCode = function () {
    appliedPromo = null;
    updateCheckoutTotals();
};

/* ---------- PAYMENT ---------- */
window.startPhonePePayment = function () {
    selectedPaymentMethod = 'UPI';
    UIService.showToast('Opening UPI app...');
};

window.startPhonePeGatewayPayment = function () {
    selectedPaymentMethod = 'PhonePe Gateway';
    confirmPayment(`MOCK-${Date.now()}`);
};

/* ---------- CONFIRM ORDER ---------- */
window.confirmPayment = async function (paymentId) {
    const snapshot = CartService.getTotals();
    const items = CartService.getItems();

    const orderData = {
        subtotal: snapshot.subtotal,
        gst: snapshot.gst,
        shipping: snapshot.shipping,
        total: snapshot.total,
        discount: appliedPromo ? (snapshot.subtotal * appliedPromo.discount_percent) / 100 : 0,
        promo_code: appliedPromo?.code || null,
        shippingAddress: shippingData,
        items: items.map(i => ({
            product_id: i.id,
            name: i.name,
            variantLabel: i.variantLabel,
            quantity: i.qty,
            price: i.price
        })),
        paymentMethod: selectedPaymentMethod,
        paymentId,
        paymentStatus: paymentId ? 'completed' : 'pending'
    };

    let orderNumber = 'ORDER-' + Date.now();

    try {
        const { data } = await apiHelpers.createOrder(orderData);
        if (data) orderNumber = data.order_number;
    } catch (e) {
        console.error(e);
    }

    document.getElementById('order-id').innerText = orderNumber;
    document.getElementById('order-total').innerText = `₹${snapshot.total.toFixed(2)}`;

    document.getElementById('checkout-step-2')?.classList.add('hidden');
    document.getElementById('checkout-step-3')?.classList.remove('hidden');

    CartService.clear();
    ShopCartUI.update();
    clearCheckoutState();
};

/* ---------- STATE PERSISTENCE ---------- */
function saveCheckoutState() {
    localStorage.setItem(
        CHECKOUT_STATE_KEY,
        JSON.stringify({ shippingData, timestamp: Date.now() })
    );
}

function clearCheckoutState() {
    localStorage.removeItem(CHECKOUT_STATE_KEY);
    shippingData = {};
    appliedPromo = null;
}

(function restoreCheckoutState() {
    const raw = localStorage.getItem(CHECKOUT_STATE_KEY);
    if (!raw) return;

    const state = JSON.parse(raw);
    if (Date.now() - state.timestamp > 86400000) {
        clearCheckoutState();
        return;
    }

    shippingData = state.shippingData || {};
})();
