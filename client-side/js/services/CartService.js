
window.CartService = {
    cart: [],
    SHIPPING_COST: 50,

    init() {
        console.log('CartService: Initializing...');
        // 1. Load from LocalStorage (Guest Persistence)
        this.loadLocal();

        // 2. Check for logged in user and sync
        // If logged in, this will fetch the remote cart and merge/sync
        this.checkAndSyncRemote();
    },

    loadLocal() {
        try {
            const raw = localStorage.getItem('sri_pickles_cart');
            if (raw) {
                this.cart = JSON.parse(raw);
                console.log('CartService: Loaded from local storage', this.cart.length, 'items');
                window.dispatchEvent(new CustomEvent('cart-updated'));
            }
        } catch (e) {
            console.error('CartService: Failed to load local cart', e);
            this.cart = [];
        }
    },

    saveLocal() {
        try {
            localStorage.setItem('sri_pickles_cart', JSON.stringify(this.cart));
        } catch (e) {
            console.error('CartService: Failed to save local cart', e);
        }
    },

    async checkAndSyncRemote() {
        // Wait briefly for auth to initialize
        let attempts = 0;
        while (attempts < 20) { // 4 seconds max
            if (window.authManager && window.apiHelpers && window.supabaseClient) break;
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        if (!window.authManager) return;

        try {
            const { user } = await window.authManager.getSession();
            if (user) {
                console.log('CartService: User logged in, syncing remote...');
                // User is logged in, load from Supabase
                const { data: remoteCart, error } = await window.apiHelpers.getCart();

                if (!error && remoteCart) {
                    let hasChanges = false;

                    if (this.cart.length > 0) {
                        // Merge Strategy:
                        // 1. If remote is empty, push local to remote.
                        // 2. If remote has items, merge local into remote (deduplicate).

                        remoteCart.forEach(rItem => {
                            const existingIdx = this.cart.findIndex(l => l.id === rItem.id && l.variantLabel === rItem.variantLabel);
                            if (existingIdx === -1) {
                                // Remote item not in local: Add it
                                this.cart.push(rItem);
                                hasChanges = true;
                            } else {
                                // Conflict: Remote wins? Or Local wins? 
                                // Taking Remote quantity usually safer, or max.
                                // Let's take Remote to be consistent with "Profile Source of Truth".
                                if (this.cart[existingIdx].qty !== rItem.qty) {
                                    this.cart[existingIdx] = rItem;
                                    hasChanges = true;
                                }
                            }
                        });

                        // Now check if local had items NOT in remote -> Upload them
                        const itemsUniqueToLocal = this.cart.filter(lItem =>
                            !remoteCart.some(r => r.id === lItem.id && r.variantLabel === lItem.variantLabel)
                        );

                        if (itemsUniqueToLocal.length > 0) {
                            // effectively we have merged them into this.cart already (since we started with local), 
                            // but we need to ensure the final merged state is saved to server.
                            console.log('CartService: Local items merged to server');
                            await window.apiHelpers.saveCart(this.cart);
                        } else if (hasChanges) {
                            // Just remote updates reflected locally
                            // No need to save to server, but need to save local
                        }

                    } else if (remoteCart.length > 0) {
                        // Local empty, Remote has items -> Load Remote
                        this.cart = remoteCart;
                    }

                    // Always sync final state back to local storage
                    this.saveLocal();

                    // Dispatch event for UI
                    window.dispatchEvent(new CustomEvent('cart-updated'));
                }
            }
        } catch (e) {
            console.error('CartService: Sync error', e);
        }
    },

    async syncRemote() {
        // Save to LocalStorage first (Always safe)
        this.saveLocal();

        // If logged in, save to Supabase
        if (window.authManager) {
            const { user } = await window.authManager.getSession();
            if (user && window.apiHelpers) {
                await window.apiHelpers.saveCart(this.cart);
            }
        }
    },

    addItem(product, variant, qty, variantIndex) {
        const quantity = Math.max(1, qty || 1);
        // Robust ID check
        const existing = this.cart.find(i => String(i.id) === String(product.id) && i.variantLabel === variant.label);

        if (existing) {
            existing.qty += quantity;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                image: product.image,
                image_url: product.image_url,
                category: product.category,
                qty: quantity,
                price: variant.price,
                variantLabel: variant.label,
                variantIndex: variantIndex !== undefined ? variantIndex : 0
            });
        }

        this.syncRemote(); // Sync to server & local
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
        const totalQty = this.cart.reduce((acc, i) => acc + (parseInt(i.qty) || 0), 0);
        const subtotal = this.cart.reduce((acc, i) => acc + ((parseFloat(i.price) || 0) * (parseInt(i.qty) || 0)), 0);
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
