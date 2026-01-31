// Core Admin Dashboard Logic

// --- Tab Switching ---
window.switchTab = function (tabName) {
    // 1. Hide all views
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // 2. Show selected view
    document.getElementById(`view-${tabName}`).classList.remove('hidden');

    // 3. Update Nav State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');

    // 4. Update Header Title
    const titles = {
        'dashboard': 'Overview',
        'growth': 'Business Growth Analysis',
        'orders': 'Order Management',
        'products': 'Product Inventory',
        'customers': 'Customer Insights',
        'queries': 'Customer Inquiries',
        'profile': 'Team Management'
    };
    document.getElementById('page-title').innerText = titles[tabName] || 'Dashboard';

    // Module Initialization triggers
    // Initialize Modules Lazily
    if (tabName === 'dashboard' && window.DashboardModule) window.DashboardModule.init();
    if (tabName === 'growth' && window.GrowthModule) window.GrowthModule.init();
    if (tabName === 'orders' && window.OrdersModule) window.OrdersModule.init();
    if (tabName === 'products' && window.ProductsModule) window.ProductsModule.init();
    if (tabName === 'customers' && window.CustomersModule) window.CustomersModule.init();
    if (tabName === 'queries' && window.QueriesModule) window.QueriesModule.init();
    if (tabName === 'profile' && window.ProfileModule) window.ProfileModule.init();
}

// --- Login Handler ---
document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');

    errorEl.classList.add('hidden');

    try {
        const { data, error } = await window.supabaseAdmin.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Success handled by auto-state check in supabase-admin.js
        console.log('Login successful');

    } catch (err) {
        console.error('Login error:', err);
        errorEl.textContent = "Invalid credentials or connection error.";
        errorEl.classList.remove('hidden');
    }
});

// --- Logout Handler ---
window.handleLogout = async function () {
    await window.supabaseAdmin.auth.signOut();
    window.location.reload();
}

// --- Data Loading ---
window.loadDashboardData = function () {
    console.log('Admin: Full Data Sync Initiated...');

    // Initialize ALL modules globally so badges populate immediately
    const modules = [
        { name: 'DashboardModule', trigger: () => window.DashboardModule.init() },
        { name: 'OrdersModule', trigger: () => window.OrdersModule.init() },
        { name: 'ProductsModule', trigger: () => window.ProductsModule.init() },
        { name: 'CustomersModule', trigger: () => window.CustomersModule.init() },
        { name: 'QueriesModule', trigger: () => window.QueriesModule.init() },
        { name: 'GrowthModule', trigger: () => window.GrowthModule.init() }
    ];

    modules.forEach(mod => {
        if (window[mod.name]) {
            try {
                mod.trigger();
            } catch (e) {
                console.warn(`Failed to init ${mod.name}:`, e);
            }
        }
    });

    // Default to Dashboard tab if not already on a specific one
    if (!document.querySelector('.nav-item.active')) {
        switchTab('dashboard');
    }
}

// Check initial state
document.addEventListener('DOMContentLoaded', () => {
    // Default to Dashboard tab
    switchTab('dashboard');
});

// --- Helper: Toast Notifications ---
window.showToast = function (message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 z-50 px-6 py-3 rounded shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0';

    // Style based on type
    if (type === 'success') toast.className += ' bg-gray-800 text-white';
    if (type === 'error') toast.className += ' bg-red-600 text-white';

    // Icon handling
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5"></i> ${message}`;

    document.body.appendChild(toast);

    // Refresh icons
    if (window.lucide) window.lucide.createIcons();

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // Remove after 3s
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
