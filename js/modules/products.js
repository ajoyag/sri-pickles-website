// Product Management Module (Advanced Inventory)

const ProductsModule = {
    products: [],

    initialized: false,

    async init() {
        if (this.initialized) {
            console.log('Products Module already initialized, refreshing data...');
            await this.fetchProducts();
            return;
        }
        console.log('Initializing Advanced Products Module...');
        this.bindEvents();
        this.initialized = true;
        await this.fetchProducts();

        // Periodic Background Sync (every 2 minutes)
        if (!this.syncInterval) {
            this.syncInterval = setInterval(() => {
                console.log('ProductsModule: Background sync...');
                this.fetchProducts();
            }, 120000);
        }
    },

    bindEvents() {
        document.getElementById('product-form')?.addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('product-category-filter')?.addEventListener('change', (e) => this.filterProducts(e.target.value));
    },

    async fetchProducts() {
        try {
            const { data, error } = await window.supabaseAdmin
                .from('shop_products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.products = data || [];
            this.renderProducts(this.products);
            this.updateDashboardStock(this.products);

            // Update Sidebar Badge
            const badge = document.getElementById('products-count-badge');
            if (badge) {
                badge.innerText = this.products.length;
                badge.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Error fetching products:', err);
            document.getElementById('products-table-body').innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Failed to load inventory.</td></tr>`;
        }
    },

    renderProducts(productList) {
        const tbody = document.getElementById('products-table-body');
        if (!productList.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No products found. Add one to get started.</td></tr>`;
            return;
        }

        tbody.innerHTML = productList.map(prod => {
            const isActive = prod.active !== false;

            // Variants Logic
            let variants = prod.variants;
            if (typeof variants === 'string') {
                try { variants = JSON.parse(variants); } catch (e) { variants = []; }
            }
            if (!Array.isArray(variants)) variants = [];

            let hasVariants = variants.length > 0;
            let displayPrice = `₹${prod.price}`;
            let displayStock = prod.stock_quantity;
            let variantsHtml = '';

            if (hasVariants) {
                // Calculate Price Range
                const fees = variants.map(v => parseFloat(v.price));
                const minPrice = Math.min(...fees);
                const maxPrice = Math.max(...fees);
                displayPrice = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;

                // Calculate Total Stock
                displayStock = variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0);

                // Generate Badges
                variantsHtml = `<div class="flex flex-wrap gap-1 mt-1">
                    ${variants.map(v =>
                    `<span class="text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600 font-medium whitespace-nowrap" title="Stock: ${v.stock}">
                           ${v.label}
                        </span>`
                ).join('')}
                </div>`;
            }

            const isLowStock = displayStock < 5;
            const isOOS = displayStock <= 0;

            return `
            <tr onclick="ProductsModule.openProductModal('${prod.id}')" class="hover:bg-gray-50 transition-colors group cursor-pointer ${!isActive ? 'opacity-50' : ''}">
                <td class="px-6 py-4 flex items-center gap-3">
                    <div class="relative flex-shrink-0">
                        <img src="${prod.image_url || 'https://via.placeholder.com/40'}" class="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm" alt="${prod.name}">
                        ${!isActive ? '<div class="absolute inset-0 bg-gray-200/50 flex items-center justify-center rounded"><i data-lucide="eye-off" class="w-4 h-4 text-gray-600"></i></div>' : ''}
                    </div>
                    <div>
                        <p class="font-bold text-gray-800 text-sm">${prod.name}</p>
                        ${variantsHtml}
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm">
                    <span class="px-2 py-1 rounded-full text-xs font-bold ${prod.category === 'Non-Vegetarian' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}">
                        ${prod.category || 'General'}
                    </span>
                </td>
                <td class="px-6 py-4 font-bold text-gray-800 text-sm whitespace-nowrap">${displayPrice}</td>
                <td class="px-6 py-4" onclick="event.stopPropagation()">
                    <div class="flex flex-col gap-2">
                ${!hasVariants ?
                    `<div class="text-[10px] font-bold text-gray-500 mb-1 flex justify-end items-center">
                                <span>Qty: ${displayStock}</span>
                            </div>
                            <div class="flex items-center gap-1 w-full">
                                <button onclick="ProductsModule.setStockStatus('${prod.id}', 'in_stock')" class="flex-1 px-1 py-1 text-[9px] uppercase font-bold text-white bg-green-500 rounded hover:bg-green-600 ${displayStock >= 20 ? 'ring-1 ring-green-300' : 'opacity-30'}">In</button>
                                <button onclick="ProductsModule.setStockStatus('${prod.id}', 'limited')" class="flex-1 px-1 py-1 text-[9px] uppercase font-bold text-white bg-orange-500 rounded hover:bg-orange-600 ${displayStock > 0 && displayStock < 20 ? 'ring-1 ring-orange-300' : 'opacity-30'}">Low</button>
                                <button onclick="ProductsModule.setStockStatus('${prod.id}', 'out')" class="flex-1 px-1 py-1 text-[9px] uppercase font-bold text-white bg-red-500 rounded hover:bg-red-600 ${displayStock <= 0 ? 'ring-1 ring-red-300' : 'opacity-30'}">Out</button>
                            </div>
                            ` :
                    `<div class="flex flex-col gap-2">
                        ${variants.map((v, idx) => `
                            <div class="border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                <div class="text-[10px] font-bold text-gray-500 mb-1 flex justify-between items-center">
                                    <span class="truncate max-w-[80px]" title="${v.label}">${v.label}</span>
                                    <span>Qty: ${v.stock || 0}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <button onclick="ProductsModule.setVariantStockStatus('${prod.id}', ${idx}, 'in_stock')" class="flex-1 px-1 py-1 text-[9px] uppercase font-bold text-white bg-green-500 rounded hover:bg-green-600 ${(v.stock || 0) >= 20 ? 'ring-1 ring-green-300' : 'opacity-30'}">In</button>
                                    <button onclick="ProductsModule.setVariantStockStatus('${prod.id}', ${idx}, 'limited')" class="flex-1 px-1 py-1 text-[9px] uppercase font-bold text-white bg-orange-500 rounded hover:bg-orange-600 ${(v.stock || 0) > 0 && (v.stock || 0) < 20 ? 'ring-1 ring-orange-300' : 'opacity-30'}">Low</button>
                                    <button onclick="ProductsModule.setVariantStockStatus('${prod.id}', ${idx}, 'out')" class="flex-1 px-1 py-1 text-[9px] uppercase font-bold text-white bg-red-500 rounded hover:bg-red-600 ${(v.stock || 0) <= 0 ? 'ring-1 ring-red-300' : 'opacity-30'}">Out</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
                }
                    </div>
                </td>
                <td class="px-6 py-4 text-right flex justify-end gap-2" onclick="event.stopPropagation()">
                    <button onclick="ProductsModule.toggleVisibility('${prod.id}', ${isActive})" class="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500" title="${isActive ? 'Hide Product' : 'Show Product'}">
                        <i data-lucide="${isActive ? 'eye' : 'eye-off'}" class="w-4 h-4"></i>
                    </button>
                    <button onclick="ProductsModule.openProductModal('${prod.id}')" class="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors" title="Edit Details">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="ProductsModule.deleteProduct('${prod.id}')" class="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
        lucide.createIcons();
    },

    filterProducts(category) {
        if (category === 'all') {
            this.renderProducts(this.products);
        } else {
            const filtered = this.products.filter(p => p.category === category);
            this.renderProducts(filtered);
        }
    },

    setStockStatus(id, status) {
        let qty = 0;
        if (status === 'in_stock') qty = 100;
        if (status === 'limited') qty = 10;
        if (status === 'out') qty = 0;
        this.updateStock(id, qty);
    },

    async updateStock(id, newValue) {
        const val = parseInt(newValue);
        if (isNaN(val) || val < 0) return;

        try {
            const { error } = await window.supabaseAdmin
                .from('shop_products')
                .update({ stock_quantity: val })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            const prod = this.products.find(p => p.id == id);
            if (prod) prod.stock_quantity = val;
            this.renderProducts(this.products);
            this.updateDashboardStock(this.products);

        } catch (err) {
            console.error('Stock update failed:', err);
            alert(`Error updating stock: ${err.message || JSON.stringify(err)}. \nCheck console for details.`);
        }
    },

    setVariantStockStatus(id, index, status) {
        let qty = 0;
        if (status === 'in_stock') qty = 100;
        if (status === 'limited') qty = 10;
        if (status === 'out') qty = 0;
        this.updateVariantStock(id, index, qty);
    },

    async updateVariantStock(id, index, newValue) {
        const prod = this.products.find(p => p.id == id);
        if (!prod) return;

        // Ensure variants available (should be handled by render parsing but good to be safe)
        let variants = prod.variants;
        if (typeof variants === 'string') {
            try { variants = JSON.parse(variants); } catch (e) { variants = []; }
        }

        if (!variants || !variants[index]) return;

        // Update local object structure
        variants[index].stock = parseInt(newValue);

        // Recalculate Total Stock for the Product
        const newTotal = variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0);

        try {
            const { error } = await window.supabaseAdmin
                .from('shop_products')
                .update({
                    variants: variants, // This saves the updated pricing/stock JSONB
                    stock_quantity: newTotal // Keeps the optimized search column in sync
                })
                .eq('id', id);

            if (error) throw error;

            // Optimistic Update
            prod.variants = variants;
            prod.stock_quantity = newTotal;
            this.renderProducts(this.products);
            this.updateDashboardStock(this.products);

        } catch (err) {
            console.error('Variant stock update failed:', err);
            alert('Failed to update variant stock.');
        }
    },

    async toggleVisibility(id, currentStatus) {
        try {
            const { error } = await window.supabaseAdmin
                .from('shop_products')
                .update({ active: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            const prod = this.products.find(p => p.id == id);
            if (prod) prod.active = !currentStatus;
            this.renderProducts(this.products);

        } catch (err) {
            console.error('Visibility toggle failed:', err);
            alert('Failed to toggle visibility.');
        }
    },

    // --- VARIANT UI LOGIC ---

    toggleVariationsMode() {
        const hasVariants = document.getElementById('has-variations').checked;
        const simpleInputs = document.getElementById('simple-product-inputs');
        const variantsSection = document.getElementById('variants-section');

        if (hasVariants) {
            simpleInputs.classList.add('hidden');
            variantsSection.classList.remove('hidden');

            // If empty, add one row
            const container = document.getElementById('variants-container');
            if (container.children.length === 0) {
                this.addVariantRow();
            }
        } else {
            simpleInputs.classList.remove('hidden');
            variantsSection.classList.add('hidden');
        }
    },

    addVariantRow(data = null) {
        const container = document.getElementById('variants-container');
        const rowId = 'variant-' + Date.now();

        const label = data ? data.label : '';
        const price = data ? data.price : '';
        const stock = data ? data.stock : '';

        const row = document.createElement('div');
        row.className = 'grid grid-cols-7 gap-2 items-center bg-white p-2 rounded border border-gray-100 shadow-sm slide-in';
        row.id = rowId;
        row.innerHTML = `
            <div class="col-span-3">
                <input type="text" placeholder="Size/Label (e.g. 250g)" value="${label}" class="var-label w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-spice-red outline-none">
            </div>
            <div class="col-span-2">
                <input type="number" placeholder="Price" value="${price}" class="var-price w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-spice-red outline-none">
            </div>
            <div class="col-span-1">
                <input type="number" placeholder="Qty" value="${stock}" class="var-stock w-full border border-gray-300 rounded px-2 py-1 text-sm focus:border-spice-red outline-none">
                <div class="flex gap-1 mt-1 justify-between">
                     <button type="button" onclick="this.closest('.col-span-1').querySelector('.var-stock').value=100" class="flex-1 bg-green-100 hover:bg-green-200 text-green-700 text-[10px] py-0.5 rounded font-bold transition-colors">In</button>
                     <button type="button" onclick="this.closest('.col-span-1').querySelector('.var-stock').value=10" class="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] py-0.5 rounded font-bold transition-colors">Low</button>
                     <button type="button" onclick="this.closest('.col-span-1').querySelector('.var-stock').value=0" class="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] py-0.5 rounded font-bold transition-colors">Out</button>
                </div>
            </div>
            <div class="col-span-1 text-right">
                <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-red-400 hover:text-red-600 p-1">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
        lucide.createIcons();
    },

    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');

        form.reset();
        document.getElementById('variants-container').innerHTML = ''; // Clear variants
        document.getElementById('prod-id').value = '';

        if (productId) {
            // Edit Mode
            const prod = this.products.find(p => p.id == productId);
            if (!prod) return;

            title.innerText = 'Edit Product';
            document.getElementById('prod-id').value = prod.id;
            document.getElementById('prod-name').value = prod.name;
            document.getElementById('prod-category').value = prod.category;
            document.getElementById('prod-image').value = prod.image_url || '';
            document.getElementById('prod-desc').value = prod.description || '';
            document.getElementById('prod-rating').value = prod.rating || 4.5;

            // Handle Variations
            const hasVariants = prod.variants && prod.variants.length > 0;
            document.getElementById('has-variations').checked = hasVariants;

            this.toggleVariationsMode();

            if (hasVariants) {
                prod.variants.forEach(v => this.addVariantRow(v));
            } else {
                // Populate simple inputs
                document.getElementById('prod-price').value = prod.price;
                document.getElementById('prod-stock').value = prod.stock_quantity;
            }

        } else {
            // Add Mode
            title.innerText = 'Add New Product';
            document.getElementById('has-variations').checked = false;
            document.getElementById('prod-stock').value = 100; // Default to In Stock
            document.getElementById('prod-rating').value = 4.5;
            this.toggleVariationsMode();
        }

        modal.classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('product-modal').classList.add('hidden');
    },

    async handleSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('prod-id').value;
        const hasVariants = document.getElementById('has-variations').checked;

        // Base Data
        const productData = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            image_url: document.getElementById('prod-image').value,
            description: document.getElementById('prod-desc').value,
            rating: parseFloat(document.getElementById('prod-rating').value) || 4.5,
            active: true
        };

        if (productData.rating > 5) productData.rating = 5;
        if (productData.rating < 0) productData.rating = 0;

        // Determine Price/Stock/Variants
        if (hasVariants) {
            const container = document.getElementById('variants-container');
            const rows = container.querySelectorAll('.grid'); // Get all rows
            const variants = [];

            rows.forEach(row => {
                const label = row.querySelector('.var-label').value;
                const price = parseFloat(row.querySelector('.var-price').value) || 0;
                const stock = parseInt(row.querySelector('.var-stock').value) || 0;

                if (label) {
                    variants.push({ label, price, stock });
                }
            });

            if (variants.length === 0) {
                alert('Please add at least one variant.');
                return;
            }

            productData.variants = variants; // JSONB column takes array automatically via Supabase JS

            // Set Base Price (Min) and Total Stock for filtering/sorting
            const prices = variants.map(v => v.price);
            productData.price = Math.min(...prices);
            productData.stock_quantity = variants.reduce((acc, v) => acc + v.stock, 0);

        } else {
            productData.variants = []; // Clear variants
            productData.price = parseFloat(document.getElementById('prod-price').value) || 0;
            productData.stock_quantity = parseInt(document.getElementById('prod-stock').value) || 0;
        }

        try {
            let error;
            if (id) {
                // Update
                const res = await window.supabaseAdmin
                    .from('shop_products')
                    .update(productData)
                    .eq('id', id);
                error = res.error;
            } else {
                // Insert New
                const res = await window.supabaseAdmin
                    .from('shop_products')
                    .insert([productData]);
                error = res.error;
            }

            if (error) throw error;

            this.closeModal();
            this.fetchProducts();

        } catch (err) {
            console.error('Error saving product:', err);
            alert(`Failed to save product: ${err.message || JSON.stringify(err)}`);
        }
    },

    async deleteProduct(id) {
        if (!confirm('Delete this product permanently?')) return;
        try {
            const { error } = await window.supabaseAdmin
                .from('shop_products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            this.fetchProducts();
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete.');
        }
    },

    updateDashboardStock(products) {
        // Updated to count based on stock quantity (which covers simple and variant-total)
        const lowStockCount = products.filter(p => p.stock_quantity < 5).length;
        const lowStockEl = document.getElementById('dash-low-stock');
        if (lowStockEl) lowStockEl.innerText = lowStockCount;

        this.updateCategoryOptions();
    },

    updateCategoryOptions() {
        const categories = new Set(['Vegetarian', 'Non-Vegetarian']); // Defaults
        this.products.forEach(p => {
            if (p.category) categories.add(p.category);
        });

        // 1. Update Form Datalist
        const datalist = document.getElementById('category-options');
        if (datalist) {
            datalist.innerHTML = Array.from(categories).sort().map(c => `<option value="${c}"></option>`).join('');
        }

        // 2. Update Filter Dropdown (preserve selection if possible)
        const filterSelect = document.getElementById('product-category-filter');
        if (filterSelect) {
            const currentVal = filterSelect.value;
            let html = `<option value="all">All Categories</option>`;
            Array.from(categories).sort().forEach(c => {
                html += `<option value="${c}">${c}</option>`;
            });
            filterSelect.innerHTML = html;
            filterSelect.value = currentVal; // Restore selection
        }
    },

    exportCSV() {
        if (!this.products || !this.products.length) {
            alert("No products to export.");
            return;
        }

        const headers = ["ID", "Name", "Category", "Base Price", "Total Stock", "Active", "Variations"];
        const rows = this.products.map(p => {
            const isActive = p.active !== false ? "Yes" : "No";

            // Format variants for CSV
            let variants = p.variants;
            if (typeof variants === 'string') try { variants = JSON.parse(variants); } catch (e) { variants = []; }
            const variantStr = (variants || []).map(v => `${v.label}(₹${v.price}/qty:${v.stock})`).join(' | ');

            return [
                p.id,
                `"${p.name}"`,
                p.category || "General",
                p.price,
                p.stock_quantity,
                isActive,
                `"${variantStr}"`
            ];
        });

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sri_pickles_inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.ProductsModule = ProductsModule;
