/* =========================================================
   Cart UI
   Responsibility:
   - Cart sidebar open/close
   - Render cart items
   - Quantity update / remove
   - Totals & badge updates
   ========================================================= */

/* ---------- TOGGLE CART ---------- */
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (!sidebar || !overlay) return;

    const isOpen = !sidebar.classList.contains('translate-x-full');

    if (!isOpen) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        document.body.style.overflow = 'hidden';
    } else {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        document.body.style.overflow = '';
    }
}

/* ---------- ADD TO CART FROM MODAL ---------- */
window.addToCartWithSelection = function (productId, variantIndex, qty) {
    const product = window.ProductService.getProductById(productId);
    if (!product) return;

    let variants = product.variants;
    if (typeof variants === 'string') {
        try { variants = JSON.parse(variants); } catch { variants = []; }
    }
    if (!Array.isArray(variants) || variants.length === 0) {
        variants = [{ label: 'Standard', price: product.price || 0 }];
    }

    const variant = variants[variantIndex] || variants[0];

    const { quantity } = window.CartService.addItem(
        product,
        variant,
        qty,
        variantIndex
    );

    updateCartUI();
    window.UIService.showToast(
        `Added ${product.name} (${variant.label} × ${quantity}) to cart`
    );

    const badge = document.getElementById('cart-badge');
    if (badge) {
        badge.classList.remove('scale-0', 'opacity-0');
        badge.classList.add('scale-125');
        setTimeout(() => badge.classList.remove('scale-125'), 200);
    }
};

/* ---------- UPDATE QTY ---------- */
function updateQty(index, delta) {
    window.CartService.updateQuantity(index, delta);
    updateCartUI();
}

/* ---------- REMOVE ITEM ---------- */
function confirmRemoveItem(index, event) {
    if (event) event.stopPropagation();
    const item = window.CartService.getItem(index);
    if (!item) return;

    if (
        confirm(
            `Are you sure you want to remove "${item.name} (${item.variantLabel || ''})" from your cart?`
        )
    ) {
        window.CartService.removeItem(index);
        updateCartUI();
        window.UIService.showToast(`${item.name} removed from cart`);
    }
}

/* ---------- RENDER CART ---------- */
function updateCartUI() {
    const container = document.getElementById('cart-items');
    const badge = document.getElementById('cart-badge');
    const totalEl = document.getElementById('cart-total');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const gstEl = document.getElementById('cart-gst');

    if (!container) return;

    const {
        totalQty,
        subtotal,
        gst,
        shipping,
        total
    } = window.CartService.getTotals();

    const cartItems = window.CartService.getItems();

    /* Badge */
    if (badge) {
        badge.innerText = totalQty;
        badge.classList.toggle('scale-0', totalQty === 0);
        badge.classList.toggle('opacity-0', totalQty === 0);
    }

    /* Totals */
    if (totalEl) totalEl.innerText = `₹${total.toFixed(2)}`;
    if (subtotalEl) subtotalEl.innerText = `₹${subtotal.toFixed(2)}`;
    if (gstEl) gstEl.innerText = totalQty ? `₹${gst.toFixed(2)}` : '₹0';
    if (shippingEl) shippingEl.innerText = totalQty ? `₹${shipping}` : '₹0';

    /* Empty cart */
    if (window.CartService.isEmpty()) {
        container.innerHTML = `
            <div class="text-center text-gray-500 mt-10">
                <i data-lucide="shopping-basket"
                   class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
                <p>Your cart is empty.</p>
                <button onclick="toggleCart()"
                        class="mt-4 text-spice-red font-bold hover:underline">
                    Keep Shopping
                </button>
            </div>`;
    } else {
        const fallbackImg =
            window.fallbackImg ||
            "https://placehold.co/100x100/B9382E/FFF?text=Item";

        container.innerHTML = cartItems
            .map((item, index) => `
                <div class="group relative flex items-center gap-4 bg-white p-3
                            rounded-md shadow-sm border border-gray-100
                            hover:border-spice-red/30 transition-all overflow-hidden">

                    <img src="${item.image}"
                         onerror="this.src='${fallbackImg}'"
                         class="w-14 h-14 object-cover rounded-md">

                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-gray-800 text-sm truncate">
                            ${item.name}
                        </h4>
                        <p class="text-xs text-gray-500">
                            ${item.variantLabel || ''} • ₹${item.price} × ${item.qty}
                        </p>
                    </div>

                    <div class="flex items-center bg-gray-100 rounded-lg">
                        <button onclick="updateQty(${index}, -1)"
                                class="px-2 py-1 hover:text-spice-red">-</button>
                        <span class="text-xs font-bold w-4 text-center">
                            ${item.qty}
                        </span>
                        <button onclick="updateQty(${index}, 1)"
                                class="px-2 py-1 hover:text-spice-red">+</button>
                    </div>

                    <button onclick="confirmRemoveItem(${index}, event)"
                            class="absolute right-2 top-1/2 -translate-y-1/2
                                   bg-spice-red text-white rounded-full p-2
                                   opacity-0 group-hover:opacity-100
                                   transition shadow">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            `)
            .join('');
    }

    if (window.lucide) window.lucide.createIcons();
}

/* ---------- LISTEN FOR CART EVENTS ---------- */
window.addEventListener('cart-updated', updateCartUI);

/* ---------- PUBLIC API ---------- */
window.ShopCartUI = {
    toggle: toggleCart,
    update: updateCartUI
};

/* ---------- EXPORT TO GLOBAL (BACKWARD COMPAT) ---------- */
window.toggleCart = toggleCart;
