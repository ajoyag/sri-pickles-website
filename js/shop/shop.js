/* =========================================================
   Shop Bootstrap
   Responsibility:
   - Page initialization
   - Product loading
   - Filter wiring
   - Global listeners
   ========================================================= */

/* ---------- SAFETY: GLOBAL ERROR LOG ---------- */
window.addEventListener(
    'error',
    (e) => {
        console.error(
            'Global Error:',
            e.message,
            e.filename,
            e.lineno
        );
    },
    true
);

/* ---------- FALLBACK IMAGE ---------- */
window.fallbackImg =
    'https://placehold.co/600x400/B9382E/FFF?text=Achar+Heritage';

/* ---------- INTERSECTION OBSERVER ---------- */
const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    },
    { threshold: 0.1 }
);

/* ---------- PRODUCT LOADING ---------- */
async function loadProducts() {
    if (ProductService.productsLoaded) return;

    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="inline-block loader"></div>
                <p class="mt-4 text-gray-500">Loading products...</p>
            </div>`;
    }

    try {
        console.log('Loading products...');
        const products = await ProductService.loadProducts();

        applyFilters();

        if (!products || products.length === 0) {
            UIService.showToast(
                'No products available right now'
            );
        }
    } catch (error) {
        console.error('Product load failed:', error);
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-red-600">
                    Failed to load products. Please refresh.
                </div>`;
        }
    }
}

/* ---------- FILTERS ---------- */
function applyFilters() {
    const search =
        document.getElementById('search-input')?.value || '';
    const category =
        document.querySelector(
            'input[name="category"]:checked'
        )?.value || 'all';
    const sort =
        document.getElementById('sort-select')?.value ||
        'featured';

    const filtered = ProductService.filterProducts(
        search,
        category,
        sort
    );

    renderProducts(filtered);
}

window.resetFilters = function () {
    const search = document.getElementById('search-input');
    const category = document.querySelector(
        'input[name="category"][value="all"]'
    );
    const sort = document.getElementById('sort-select');

    if (search) search.value = '';
    if (category) category.checked = true;
    if (sort) sort.value = 'featured';

    applyFilters();
};

window.setCategoryFilter = function (value) {
    const radio = document.querySelector(
        `input[name="category"][value="${value}"]`
    );
    if (radio) {
        radio.checked = true;
        applyFilters();
    }
};

/* ---------- RENDER PRODUCTS ---------- */
function renderProducts(items) {
    const grid = document.getElementById('product-grid');
    const noResults = document.getElementById('no-results');
    const count = document.getElementById('product-count');

    if (count) count.innerText = items.length;

    if (!items || items.length === 0) {
        if (grid) grid.innerHTML = '';
        if (noResults) noResults.classList.remove('hidden');
        return;
    }

    if (noResults) noResults.classList.add('hidden');

    if (!grid) return;

    grid.innerHTML = items
        .map((product, index) => {
            let variants = product.variants;
            if (typeof variants === 'string') {
                try {
                    variants = JSON.parse(variants);
                } catch {
                    variants = [];
                }
            }

            const basePrice =
                variants?.[0]?.price || product.price || 0;

            return `
            <div class="bg-white rounded-lg shadow-md reveal"
                 style="animation-delay:${index * 80}ms">

                <div class="relative h-56 cursor-pointer"
                     onclick="openProductModal('${product.id}')">
                    <img src="${product.image}"
                         onerror="this.src='${fallbackImg}'"
                         class="w-full h-full object-cover">
                </div>

                <div class="p-4 text-center">
                    <div class="text-xs text-gray-500 uppercase mb-1">
                        ${product.category || ''}
                    </div>

                    <h3 class="font-serif font-bold text-lg
                               hover:text-spice-red cursor-pointer"
                        onclick="openProductModal('${product.id}')">
                        ${product.name}
                    </h3>

                    ${UIService.renderStars(product.rating || 4.5)}

                    <div id="card-selection-${product.id}"
                         class="text-xs text-emerald-700 min-h-[1rem]"></div>

                    <div class="flex justify-center items-center gap-3 mt-2">
                        <span class="text-xl font-bold text-spice-red">
                            ₹${basePrice}
                        </span>
                        <button
                            onclick="openProductModal('${product.id}')"
                            class="bg-spice-red text-white px-4 py-2
                                   rounded-full font-bold">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>`;
        })
        .join('');

    document
        .querySelectorAll('.reveal')
        .forEach((el) => revealObserver.observe(el));

    if (window.lucide) lucide.createIcons();
}

/* ---------- EVENTS ---------- */
document.addEventListener('input', (e) => {
    if (
        e.target.id === 'search-input' ||
        e.target.id === 'sort-select'
    ) {
        applyFilters();
    }
});

/* ---------- CART EVENTS ---------- */
window.addEventListener('cart-updated', () => {
    if (window.ShopCartUI) {
        ShopCartUI.update();
    }
});

/* ---------- SUPABASE READY ---------- */
window.onSupabaseReady = (function (original) {
    return function () {
        if (original) original();

        console.log('Supabase ready');

        setTimeout(async () => {
            await loadProducts();

            const urlParams = new URLSearchParams(
                window.location.search
            );
            const productId = urlParams.get('product');
            if (productId) {
                setTimeout(
                    () => openProductModal(productId),
                    500
                );
            }
        }, 300);
    };
})(window.onSupabaseReady);

/* ---------- INITIAL LOAD ---------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadProducts);
} else {
    loadProducts();
}
