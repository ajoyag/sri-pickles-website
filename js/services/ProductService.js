
window.ProductService = {
    products: [],
    productsLoaded: false,

    async loadProducts() {
        if (this.productsLoaded) return this.products;

        try {
            if (!window.apiHelpers || !window.apiHelpers.supabase) {
                throw new Error('Supabase not initialized');
            }

            const { data, error } = await window.apiHelpers.getProducts();
            if (error) throw error;

            this.products = data || [];
            this.productsLoaded = true;
            return this.products;
        } catch (error) {
            console.error('Error loading products:', error);
            throw error;
        }
    },

    getProductById(id) {
        return this.products.find(p => p.id == id || p.id === id || String(p.id) === String(id));
    },

    filterProducts(search, category, sort) {
        let filtered = this.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = category === 'all' || p.category === category;
            return matchesSearch && matchesCategory;
        });

        if (sort === 'price-low') {
            filtered.sort((a, b) => (a.variants && a.variants[0]?.price || 0) - (b.variants && b.variants[0]?.price || 0));
        } else if (sort === 'price-high') {
            filtered.sort((a, b) => (b.variants && b.variants[0]?.price || 0) - (a.variants && a.variants[0]?.price || 0));
        }

        return filtered;
    }
};
