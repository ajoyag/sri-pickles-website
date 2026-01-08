/* =========================================================
   Product Modal
   Responsibility:
   - Product detail modal
   - Variant & quantity selection
   - Temporary selections before cart
   ========================================================= */

/* ---------- STATE ---------- */
let currentModalProductId = null;
let currentTempSelection = { variantIndex: null, qty: 1 };

// Selected combinations per product
const selectedOptions = {};

/* ---------- HELPERS ---------- */
function ensureSelection(productId) {
    if (!selectedOptions[productId]) {
        selectedOptions[productId] = [];
    }
}

/* ---------- PUBLIC ENTRY (used by cards) ---------- */
window.showProductDetails = function (id) {
    ShopModal.open(id);
};

/* ---------- OPEN MODAL ---------- */
function openProductModal(productId) {
    const product = window.ProductService.getProductById(productId);
    if (!product) {
        console.error('Product not found:', productId);
        return;
    }

    ensureSelection(productId);
    currentModalProductId = productId;
    currentTempSelection = { variantIndex: null, qty: 1 };

    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');

    /* --- Normalize variants --- */
    let variants = product.variants;
    if (typeof variants === 'string') {
        try { variants = JSON.parse(variants); } catch { variants = []; }
    }
    if (!Array.isArray(variants) || variants.length === 0) {
        variants = [{ label: 'Standard', price: product.price || 0 }];
    }
    product.variants = variants;

    const basePrice = variants[0]?.price || 0;
    const selections = selectedOptions[productId] || [];
    const fallbackImg =
        window.fallbackImg ||
        "https://placehold.co/600x400/B9382E/FFF?text=Achar+Heritage";

    content.innerHTML = `
        <div class="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
            <img src="${product.image || fallbackImg}"
                 onerror="this.src='${fallbackImg}'"
                 class="w-full h-full object-cover">
        </div>

        <div class="space-y-4">
            <h2 class="font-serif text-3xl font-bold text-spice-red">
                ${product.name}
            </h2>

            <p class="text-sm text-gray-500">
                Starting from <span class="font-bold text-spice-red">₹${basePrice}</span>
            </p>

            <!-- Variants -->
            <div>
                <h3 class="font-bold mb-2">Available Weights</h3>
                <div class="flex flex-wrap gap-2">
                    ${variants.map((v, i) => `
                        <button id="weight-${productId}-${i}"
                                onclick="selectVariant('${productId}', ${i})"
                                class="px-3 py-1 rounded-full border text-sm border-gray-300 hover:border-spice-red">
                            ${v.label} • ₹${v.price}
                        </button>
                    `).join('')}
                </div>
            </div>

            <!-- Quantity -->
            <div class="flex items-center gap-3">
                <span class="text-sm font-semibold">Quantity</span>
                <div class="flex items-center border rounded-lg overflow-hidden">
                    <button onclick="changeQtySelection('${productId}', -1)" class="px-3">-</button>
                    <input id="qty-input-${productId}"
                           type="number" min="1" value="1"
                           oninput="qtyInputChange('${productId}', this.value)"
                           class="w-14 text-center border-l border-r">
                    <button onclick="changeQtySelection('${productId}', 1)" class="px-3">+</button>
                </div>

                <button id="add-combination-${productId}"
                        onclick="addCombination('${productId}')"
                        class="px-4 py-1 bg-gold rounded font-bold opacity-50 cursor-not-allowed"
                        disabled>
                    Add
                </button>
            </div>

            <!-- Selected combinations -->
            <div id="selected-combinations-${productId}" class="space-y-1">
                ${selections.length ? `
                    <h4 class="font-semibold text-sm mt-2">Selected:</h4>
                    ${selections.map((sel, idx) => {
        const v = variants[sel.variantIndex];
        return `
                            <div class="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                <span>${v?.label || 'Item'} × ${sel.qty}</span>
                                <button onclick="removeCombination('${productId}', ${idx})"
                                        class="text-red-600 text-xs">
                                    Remove
                                </button>
                            </div>`;
    }).join('')}
                ` : ''}
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4">
                <button id="modal-add-${productId}"
                        onclick="modalAddToCart('${productId}')"
                        class="flex-1 bg-spice-red text-white py-2 rounded font-bold opacity-50"
                        disabled>
                    Add to Cart
                </button>

                <button id="modal-buy-${productId}"
                        onclick="modalBuyNow('${productId}')"
                        class="flex-1 bg-gold text-spice-red py-2 rounded font-bold opacity-50"
                        disabled>
                    Buy Now
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    updateModalSelectionUI(productId);
    if (window.lucide) window.lucide.createIcons();
}

/* ---------- CLOSE MODAL ---------- */
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentModalProductId = null;
    currentTempSelection = { variantIndex: null, qty: 1 };
}

/* ---------- UI STATE ---------- */
function updateModalSelectionUI(productId) {
    const product = window.ProductService.getProductById(productId);
    if (!product) return;

    const selections = selectedOptions[productId] || [];
    const variants = product.variants || [];

    // Variant highlight
    variants.forEach((_, i) => {
        const btn = document.getElementById(`weight-${productId}-${i}`);
        if (!btn) return;
        btn.className =
            currentTempSelection.variantIndex === i
                ? 'px-3 py-1 rounded-full bg-spice-red text-white'
                : 'px-3 py-1 rounded-full border text-sm border-gray-300 hover:border-spice-red';
    });

    // Qty input
    const qtyInput = document.getElementById(`qty-input-${productId}`);
    if (qtyInput) qtyInput.value = currentTempSelection.qty;

    // Enable add-combination
    const addBtn = document.getElementById(`add-combination-${productId}`);
    const valid = currentTempSelection.variantIndex !== null && currentTempSelection.qty > 0;
    if (addBtn) {
        addBtn.disabled = !valid;
        addBtn.classList.toggle('opacity-50', !valid);
        addBtn.classList.toggle('cursor-not-allowed', !valid);
    }

    // Enable main buttons
    const enableMain = selections.length > 0;
    ['modal-add-', 'modal-buy-'].forEach(prefix => {
        const btn = document.getElementById(`${prefix}${productId}`);
        if (!btn) return;
        btn.disabled = !enableMain;
        btn.classList.toggle('opacity-50', !enableMain);
    });
}

/* ---------- SELECTION ACTIONS ---------- */
window.selectVariant = function (productId, index) {
    currentTempSelection.variantIndex = index;
    updateModalSelectionUI(productId);
};

window.changeQtySelection = function (productId, delta) {
    currentTempSelection.qty = Math.max(1, (currentTempSelection.qty || 1) + delta);
    updateModalSelectionUI(productId);
};

window.qtyInputChange = function (productId, value) {
    const n = parseInt(value, 10);
    currentTempSelection.qty = isNaN(n) || n <= 0 ? 1 : n;
    updateModalSelectionUI(productId);
};

window.addCombination = function (productId) {
    if (currentTempSelection.variantIndex === null) return;
    ensureSelection(productId);
    selectedOptions[productId].push({ ...currentTempSelection });
    currentTempSelection = { variantIndex: null, qty: 1 };
    refreshModalSelections(productId);
};

window.removeCombination = function (productId, index) {
    ensureSelection(productId);
    selectedOptions[productId].splice(index, 1);
    refreshModalSelections(productId);
};

function refreshModalSelections(productId) {
    closeProductModal();
    openProductModal(productId);
}

/* ---------- FINAL ACTIONS ---------- */
window.modalAddToCart = function (productId) {
    const selections = selectedOptions[productId] || [];
    selections.forEach(sel => {
        window.addToCartWithSelection(productId, sel.variantIndex, sel.qty);
    });
    selectedOptions[productId] = [];
    updateCardSelectionDisplay(productId);
    closeProductModal();
};

window.modalBuyNow = function (productId) {
    window.modalAddToCart(productId);
    if (window.toggleCart) window.toggleCart();
};

/* ---------- CARD SELECTION TEXT ---------- */
function updateCardSelectionDisplay(productId) {
    const product = window.ProductService.getProductById(productId);
    const el = document.getElementById(`card-selection-${productId}`);
    if (!el || !product) return;

    const selections = selectedOptions[productId] || [];
    if (!selections.length) {
        el.textContent = '';
        return;
    }

    const variants = product.variants || [];
    el.textContent =
        'Selected: ' +
        selections.map(s => `${variants[s.variantIndex]?.label || 'Item'} × ${s.qty}`).join(', ');
}

/* ---------- BACKDROP CLOSE ---------- */
(function () {
    const modal = document.getElementById('product-modal');
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeProductModal();
        });
    }
})();

/* ---------- PUBLIC API ---------- */
window.ShopModal = {
    open: openProductModal,
    close: closeProductModal,
    updateCardSelectionDisplay
};
