tailwind.config = {
    theme: {
        extend: {
            colors: {
                'spice-red': '#B9382E',
                'turmeric': '#EUA904',
                'saffron': '#FF9933',
                'mango-green': '#586E37',
                'clay': '#8D5B4C',
                'sand': '#FDFBF7',
                'gold': '#D4AF37',
            },
            fontFamily: {
                serif: ['"Crimson Text"', 'serif'],
                sans: ['"Lato"', 'sans-serif'],
            },
            backgroundImage: {
                'mandala-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            },
            animation: {
                'spin-slow': 'spin 12s linear infinite',
                'float': 'float 6s ease-in-out infinite',
                'fade-up': 'fadeUp 0.8s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        }
    }
}

// Initialize Lucide Icons (First pass for static content)
lucide.createIcons();

// Products will be loaded from Supabase database
let products = [];
let productsLoaded = false;

// Placeholder images fallbacks for demonstration
const fallbackImg = "https://placehold.co/600x400/B9382E/FFF?text=Indian+Pickle";

// Helper to generate stars
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            // Full Star
            stars += `<svg class="w-3 h-3 text-gold fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        } else if (i - 0.5 === rating) {
            // Half Star
            stars += `<svg class="w-3 h-3 text-gold fill-current opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        } else {
            // Empty Star
            stars += `<svg class="w-3 h-3 text-gray-300 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        }
    }
    return `<div class="flex items-center justify-center gap-0.5 mt-1 mb-2">${stars}</div>`;
}

// Load products from Supabase database
async function loadProducts() {
    if (productsLoaded) return;
    
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    // Show loading state
    productGrid.innerHTML = '<div class="col-span-full text-center py-12"><div class="inline-block loader"></div><p class="mt-4 text-gray-500">Loading products...</p></div>';
    
    try {
        // Wait for apiHelpers to be ready
        if (!window.apiHelpers) {
            await waitForApiHelpers();
        }
        
        if (!window.apiHelpers || !window.apiHelpers.supabase) {
            throw new Error('Supabase not initialized');
        }
        
        const { data, error } = await window.apiHelpers.getProducts();
        
        if (error) {
            throw error;
        }
        
        products = data || [];
        productsLoaded = true;
        
        // Limit to 8 products for homepage (show featured)
        const featuredProducts = products.slice(0, 8);
        
        // Render products
        renderProducts(featuredProducts);
        
    } catch (error) {
        console.error('Error loading products:', error);
        productGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500">Products will appear here once loaded from the database.</p>
            </div>
        `;
    }
}

// Wait for API helpers
async function waitForApiHelpers() {
    let attempts = 0;
    while (!window.apiHelpers && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (window.apiHelpers && !window.apiHelpers.supabase) {
        attempts = 0;
        while (!window.apiHelpers.supabase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (window.supabaseClient) {
                window.apiHelpers.supabase = window.supabaseClient;
                break;
            }
            attempts++;
        }
    }
}

// Render Products with Staggered Animation
function renderProducts(productsToRender) {
    const productGrid = document.getElementById('product-grid');
    if (!productGrid) return;
    
    productGrid.innerHTML = ''; // Clear loading state
    
    if (productsToRender.length === 0) {
        productGrid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500">No products available.</p></div>';
        return;
    }
    
    productsToRender.forEach((product, index) => {
        const card = document.createElement('div');
        const basePrice = product.variants[0]?.price || 0;
        card.className = `bg-white rounded-lg overflow-hidden shadow-md card-hover indian-border bg-white reveal delay-${(index % 8 + 1) * 100}`;
        card.innerHTML = `
            <div class="relative h-48 overflow-hidden bg-gray-200 group cursor-pointer" onclick="window.location.href='shop.html?product=${product.id}'">
                <img src="${product.image}" onerror="this.src='${fallbackImg}'" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out">
                <div class="absolute top-2 right-2 flex flex-col items-end gap-1">
                    <span class="bg-gold text-white text-xs font-bold px-2 py-1 rounded shadow">${product.tag}</span>
                </div>
            </div>
            <div class="p-4 text-center">
                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">${product.category}</div>
                <h3 class="font-serif text-lg font-bold text-gray-800 leading-tight hover:text-spice-red transition-colors cursor-pointer" onclick="window.location.href='shop.html?product=${product.id}'">${product.name}</h3>
                ${renderStars(product.rating)}
                <div class="flex items-center justify-center gap-1 mt-2">
                    <span class="text-sm text-gray-600">From</span>
                    <span class="text-xl font-bold text-spice-red">₹${basePrice}</span>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
    
    // Re-initialize icons and animations
    lucide.createIcons();
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Initialize when Supabase is ready
window.onSupabaseReady = function() {
    setTimeout(loadProducts, 500);
    // Also check auth state for profile dropdown
    setTimeout(async () => {
        const { session } = await window.authManager.getSession();
        if (session && session.user) {
            const { profile } = await window.authManager.getUserProfile();
            const name = profile?.name || session.user.email || 'User';
            updateProfileDropdown(true, name);
        } else {
            updateProfileDropdown(false);
        }
    }, 700);
};

// Also try loading when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(loadProducts, 1000);
    });
} else {
    setTimeout(loadProducts, 1000);
}

// Intersection Observer for Scroll Animations
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

// Observe all elements with .reveal class
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Profile Dropdown Functions
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('profile-dropdown');
    const button = document.getElementById('profile-button');
    const iconButton = document.getElementById('profile-icon-button');
    
    if (dropdown && !dropdown.contains(event.target) && 
        !button?.contains(event.target) && 
        !iconButton?.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Update profile dropdown based on auth state
function updateProfileDropdown(isLoggedIn, userName) {
    const profileButton = document.getElementById('profile-button');
    const profileIconButton = document.getElementById('profile-icon-button');
    const dropdownNotLoggedIn = document.getElementById('dropdown-not-logged-in');
    const dropdownLoggedIn = document.getElementById('dropdown-logged-in');
    const profileNameDisplay = document.getElementById('profile-name-display');

    if (isLoggedIn) {
        profileButton.classList.remove('hidden');
        profileIconButton.classList.add('hidden');
        dropdownNotLoggedIn.classList.add('hidden');
        dropdownLoggedIn.classList.remove('hidden');
        if (profileNameDisplay) {
            profileNameDisplay.textContent = userName || 'Account';
        }
    } else {
        profileButton.classList.add('hidden');
        profileIconButton.classList.remove('hidden');
        dropdownNotLoggedIn.classList.remove('hidden');
        dropdownLoggedIn.classList.add('hidden');
    }
}

// Override the default auth UI update functions
const originalUpdateUIForLoggedInUser = window.updateUIForLoggedInUser;
const originalUpdateUIForLoggedOutUser = window.updateUIForLoggedOutUser;

window.updateUIForLoggedInUser = function(user) {
    if (originalUpdateUIForLoggedInUser) originalUpdateUIForLoggedInUser(user);
    const name = user.user_metadata?.name || user.email || 'User';
    updateProfileDropdown(true, name);
};

window.updateUIForLoggedOutUser = function() {
    if (originalUpdateUIForLoggedOutUser) originalUpdateUIForLoggedOutUser();
    updateProfileDropdown(false);
};

// Handle logout
async function handleLogout() {
    await window.logoutUser();
    updateProfileDropdown(false);
    document.getElementById('profile-dropdown').classList.add('hidden');
}

// Redirect to shop for login/signup (shop.html has the modals)
function openLoginModal() {
    window.location.href = 'shop.html';
}

function openSignupModal() {
    window.location.href = 'shop.html';
}
