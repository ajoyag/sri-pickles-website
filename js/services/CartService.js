
window.CartService = {
    cart: [],
    SHIPPING_COST: 50,

    init() {
        // 1. Initialize empty cart (in-memory only, no localStorage)
        this.cart = [];

        // 2. Check for logged in user and sync
        // If logged in, this will fetch the remote cart and populate this.cart
        this.checkAndSyncRemote();
    },

    async checkAndSyncRemote() {
        // Wait briefly for auth to initialize
        if (!window.authManager) return;

        let attempts = 0;
        // Wait for authManager to be ready (it waits for supabase)
        while (attempts < 10) {
            if (window.supabaseClient) break;
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        const { user } = await window.authManager.getSession();
        if (user) {
            // User is logged in, load from Supabase
            if (window.apiHelpers) {
                const { data: remoteCart, error } = await window.apiHelpers.getCart();
                if (!error) {
                    if (this.cart.length > 0 && remoteCart.length === 0) {
                        // We have local items (added before login completed), remote is empty. Sync UP.
                        await window.apiHelpers.saveCart(this.cart);
                    } else if (remoteCart.length > 0) {
                        // Remote has items.
                        // Merge remote into local, deduping by ID+Variant
                        remoteCart.forEach(rItem => {
                            const existingIdx = this.cart.findIndex(l => l.id === rItem.id && l.variantLabel === rItem.variantLabel);
                            if (existingIdx === -1) {
                                this.cart.push(rItem);
                            } else {
                                // Conflict: Remote wins to ensure consistency
                                this.cart[existingIdx] = rItem;
                            }
                        });

                        // Sync back up in case we merged
                        window.apiHelpers.saveCart(this.cart);
                    }

                    // Dispatch event for UI
                    window.dispatchEvent(new CustomEvent('cart-updated'));
                }
            }
        }
    },

    saveLocal() {
        // No-op: Local storage persistence disabled by user request
    },

    async syncRemote() {
        const { user } = await window.authManager.getSession();
        if (user && window.apiHelpers) {
            await window.apiHelpers.saveCart(this.cart);
        }
    },

    addItem(product, variant, qty, variantIndex) {
        const quantity = Math.max(1, qty || 1);
        const existing = this.cart.find(i => i.id === product.id && i.variantLabel === variant.label);

        if (existing) {
            existing.qty += quantity;
        } else {
            this.cart.push({
                ...product,
                qty: quantity,
                price: variant.price,
                variantLabel: variant.label,
                variantIndex: variantIndex !== undefined ? variantIndex : 0
            });
        }

        this.syncRemote(); // Sync to server
        return { product, variant, quantity };
    },

    updateQuantity(index, delta) {
        if (index < 0 || index >= this.cart.length) return;
        const item = this.cart[index];
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                this.cart.splice(index, 1);
            }
        }
        this.syncRemote();
    },

    removeItem(index) {
        if (index < 0 || index >= this.cart.length) return;
        this.cart.splice(index, 1);
        this.syncRemote();
    },

    getTotals() {
        const totalQty = this.cart.reduce((acc, i) => acc + i.qty, 0);
        const subtotal = this.cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
        const gst = Math.round((subtotal * 0.18) * 100) / 100;
        const shipping = this.cart.length > 0 ? this.SHIPPING_COST : 0;
        const total = subtotal + gst + shipping;

        return { totalQty, subtotal, gst, shipping, total };
    },

    isEmpty() {
        return this.cart.length === 0;
    },

    getItems() {
        return this.cart;
    },

    getItem(index) {
        return this.cart[index];
    },

    clear() {
        this.cart = [];
        this.syncRemote();
    }
};

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.CartService.init());
} else {
    window.CartService.init();
}
