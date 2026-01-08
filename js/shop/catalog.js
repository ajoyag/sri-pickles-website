/* =========================================================
   Catalog Logic
   Responsibility:
   - Load products from ProductService
   - Search / filter / sort
   - Render product cards
   ========================================================= */

/* ---------- FALLBACK IMAGE ---------- */
const fallbackImg =
    window.fallbackImg ||
    "https://placehold.co/600x400/B9382E/FFF?text=Achar+Heritage";

/* ---------- OBSERVER FOR REVEAL ---------- */
const catalogObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    },
    { threshold: 0.1 }
);

/* ---------- LOAD PRODUCTS ---------- */
async function loadProducts() {
    if (window.ProductService.productsLoaded) return;

    const grid = document.getElementById('product-grid');
    if (grid) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="inline-block loader"></div>
                <p class="mt-4 text-gray-500">Loading products...</p>
            </div>`;
    }

    try {
        if (!window.apiHelpers) {
            await waitForApiHelpers();
        }

        const products = await window.ProductService.loadProducts();

        applyFilters();

        if (!products || products.length === 0) {
            window.UIService.showToast('No products available right now.');
        }
    } catch (err) {
        console.error('Error loading products:', err);
        if (grid) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 text-red-600">
                    Failed to load products. Please refresh.
                </div>`;
        }
    }
}

/* ---------- WAIT FOR API HELPERS ---------- */
async function waitForApiHelpers() {
    let attempts = 0;
    while (!window.apiHelpers && attempts < 100) {
        await new Promise(res => setTimeout(res, 100));
        attempts++;
    }
}

/* ---------- FILTER / SORT ---------- */
function applyFilters() {
    const search =
        document.getElementById('search-input')?.value || '';

    const category =
        document.querySelector('input[name="category"]:checked')
            ?.value || 'all';

    const sort =
        document.getElementById('sort-select')?.value || 'featured';

    const filtered = window.ProductService.filterProducts(
        search,
        category,
        sort
    );

    renderProducts(filtered);
}

/* ---------- RESET FILTERS ---------- */
window.resetFilters = function () {
    const search = document.getElementById('search-input');
    const sort = document.getElementById('sort-select');
    const radio = document.querySelector(
        'input[name="category"][value="all"]'
    );

    if (search) search.value = '';
    if (sort) sort.value = 'featured';
    if (radio) radio.checked = true;

    applyFilters();
};

/* ---------- SET CATEGORY ---------- */
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

    grid.innerHTML = items.map((product, index) => {
        let variants = product.variants;
        if (typeof variants === 'string') {
            try { variants = JSON.parse(variants); } catch { variants = []; }
        }
        if (!Array.isArray(variants)) variants = [];

        const basePrice = variants[0]?.price || product.price || 0;
        const selections = window.ShopModal
            ? null
            : null; // placeholder (selection handled by modal)

        return `
            <div class="bg-white rounded-lg overflow-hidden shadow-md card-hover indian-border reveal"
                 style="animation-delay:${index * 100}ms">

                <div class="relative h-56 overflow-hidden bg-gray-200 group cursor-pointer"
                     onclick="ShopModal.open('${product.id}')">

                    <img src="${product.image || fallbackImg}"
                         onerror="this.src='${fallbackImg}'"
                         class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">

                    <div class="absolute top-2 right-2">
                        <span class="bg-gold text-white text-xs font-bold px-2 py-1 rounded">
                            ${product.tag || product.category || ''}
                        </span>
                    </div>
                </div>

                <div class="p-4 text-center">
                    <div class="text-xs text-gray-500 uppercase mb-1">
                        ${product.category || ''}
                    </div>

                    <h3 class="font-serif text-lg font-bold text-gray-800 hover:text-spice-red cursor-pointer"
                        onclick="ShopModal.open('${product.id}')">
                        ${product.name}
                    </h3>

                    ${window.UIService.renderStars(product.rating || 4.5)}

                    <div id="card-selection-${product.id}"
                         class="text-xs text-emerald-700 mt-1 mb-2 min-h-[1rem]"></div>

                    <div class="flex items-center justify-center gap-3 mt-2">
                        <div class="flex items-baseline gap-1">
                            <span class="text-sm text-gray-600">From</span>
                            <span class="text-xl font-bold text-spice-red">
                                ₹${basePrice}
                            </span>
                        </div>

                        <button onclick="event.stopPropagation(); ShopModal.open('${product.id}')"
                                class="bg-spice-red text-white px-4 py-2 rounded-full font-bold shadow hover:scale-105 transition flex items-center gap-1 text-sm">
                            Add to Cart
                            <i data-lucide="plus" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');

    document.querySelectorAll('.reveal')
        .forEach(el => catalogObserver.observe(el));

    if (window.lucide) window.lucide.createIcons();
}

/* ---------- FILTER TOGGLE (MOBILE) ---------- */
window.toggleFilters = function () {
    const el = document.getElementById('filter-content');
    if (el) el.classList.toggle('hidden');
};

/* ---------- INITIAL LOAD ---------- */
window.onSupabaseReady = (function (original) {
    return function () {
        if (original) original();
        setTimeout(loadProducts, 500);
    };
})(window.onSupabaseReady);

/* ---------- FALLBACK DOM LOAD ---------- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(loadProducts, 800);
    });
} else {
    setTimeout(loadProducts, 800);
}

/* ---------- PUBLIC API ---------- */
window.ShopCatalog = {
    load: loadProducts,
    applyFilters
};
