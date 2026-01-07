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
        }
    }
}

lucide.createIcons();

// Profile Dropdown Functions
function toggleProfileDropdown() {
    document.getElementById('profile-dropdown').classList.toggle('hidden');
}

function closeProfileDropdown() {
    document.getElementById('profile-dropdown').classList.add('hidden');
}

document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('profile-dropdown');
    const button = document.getElementById('profile-button');
    const iconButton = document.getElementById('profile-icon-button');

    if (dropdown && !dropdown.contains(event.target) &&
        !button?.contains(event.target) &&
        !iconButton?.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Check authentication
async function checkAuth() {
    const { session } = await window.authManager.getSession();
    if (!session) {
        window.location.href = 'shop.html';
        return;
    }
    // Update dropdown to show logged in state
    if (window.updateProfileDropdown) {
        const { data: profile } = await window.authManager.getUserProfile();
        const name = profile?.name || session.user.email?.split('@')[0] || 'User';
        window.updateProfileDropdown(true, name);
    }
    loadOrders();
}

// Get status badge class
function getStatusClass(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending')) return 'status-pending';
    if (statusLower.includes('processing')) return 'status-processing';
    if (statusLower.includes('shipped')) return 'status-shipped';
    if (statusLower.includes('delivered')) return 'status-delivered';
    if (statusLower.includes('cancel')) return 'status-cancelled';
    return 'status-pending';
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load orders
async function loadOrders() {
    try {
        const { data: orders, error } = await window.apiHelpers.getUserOrders();

        if (error) throw error;

        document.getElementById('orders-loading').classList.add('hidden');

        if (!orders || orders.length === 0) {
            document.getElementById('orders-empty').classList.remove('hidden');
            return;
        }

        document.getElementById('orders-empty').classList.add('hidden');

        const ordersList = document.getElementById('orders-list');
        ordersList.innerHTML = orders.map(order => {
            const orderDate = formatDate(order.created_at);
            const statusClass = getStatusClass(order.status);

            // Calculate total items
            const totalItems = order.order_items ? order.order_items.reduce((sum, item) => sum + item.quantity, 0) : 0;

            return `
                        <div class="bg-gradient-to-br from-white to-orange-50/20 rounded-lg indian-border shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1">
                            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div class="flex-1">
                                    <div class="flex flex-wrap items-center gap-3 mb-3">
                                        <h3 class="font-serif text-2xl font-bold text-spice-red">${order.order_number || 'N/A'}</h3>
                                        <span class="status-badge ${statusClass} text-xs px-3 py-1">${order.status}</span>
                                    </div>
                                    <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                                        <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-4 h-4"></i> ${orderDate}</span>
                                        <span class="flex items-center gap-1"><i data-lucide="package" class="w-4 h-4"></i> ${totalItems} item(s)</span>
                                    </div>
                                    <p class="text-lg font-bold text-spice-red">Total: ₹${parseFloat(order.total_amount).toFixed(2)}</p>
                                </div>
                                <div class="flex gap-3">
                                    <button onclick="viewOrderDetails('${order.id}')" class="bg-gradient-to-r from-spice-red to-red-700 text-white px-6 py-2.5 rounded-lg font-bold hover:shadow-lg transition-all hover:scale-105 text-sm flex items-center gap-2">
                                        <i data-lucide="eye" class="w-4 h-4"></i> View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
        }).join('');

        lucide.createIcons();
    } catch (error) {
        console.error('Error loading orders:', error);
        document.getElementById('orders-loading').innerHTML = `
                    <p class="text-red-600">Error loading orders. Please refresh the page.</p>
                `;
    }
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const { data: order, error } = await window.apiHelpers.getOrder(orderId);
        if (error) throw error;

        const modal = document.getElementById('order-modal');
        const content = document.getElementById('order-detail-content');

        const orderDate = formatDate(order.created_at);
        const statusClass = getStatusClass(order.status);
        const shippingAddress = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : order.shipping_address;

        content.innerHTML = `
                    <div class="space-y-6">
                        <div class="flex items-center justify-between pb-4 border-b">
                            <div>
                                <h4 class="font-bold text-gray-800">${order.order_number}</h4>
                                <p class="text-sm text-gray-600">${orderDate}</p>
                            </div>
                            <span class="status-badge ${statusClass}">${order.status}</span>
                        </div>

                        <div>
                            <h5 class="font-bold text-gray-800 mb-3">Order Items</h5>
                            <div class="space-y-2">
                                ${order.order_items ? order.order_items.map(item => `
                                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                                        <div>
                                            <p class="font-semibold">${item.product_name}</p>
                                            <p class="text-sm text-gray-600">${item.variant_label} × ${item.quantity}</p>
                                        </div>
                                        <p class="font-bold">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                                    </div>
                                `).join('') : '<p class="text-gray-500">No items found</p>'}
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                                <p class="text-sm text-gray-600">Subtotal</p>
                                <p class="font-bold">₹${parseFloat(order.subtotal || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">GST (18%)</p>
                                <p class="font-bold">₹${parseFloat(order.gst || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Shipping</p>
                                <p class="font-bold">₹${parseFloat(order.shipping_cost || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p class="text-sm text-gray-600">Total</p>
                                <p class="font-bold text-spice-red text-lg">₹${parseFloat(order.total_amount).toFixed(2)}</p>
                            </div>
                        </div>

                        <div class="pt-4 border-t">
                            <h5 class="font-bold text-gray-800 mb-3">Shipping Address</h5>
                            <div class="bg-gray-50 p-4 rounded">
                                <p class="font-semibold">${shippingAddress.name || 'N/A'}</p>
                                <p class="text-sm text-gray-600">${shippingAddress.address || ''}</p>
                                <p class="text-sm text-gray-600">${shippingAddress.city || ''}, ${shippingAddress.state || ''} - ${shippingAddress.pincode || ''}</p>
                                <p class="text-sm text-gray-600">Phone: ${shippingAddress.phone || 'N/A'}</p>
                            </div>
                        </div>

                        ${order.payment_method ? `
                            <div class="pt-4 border-t">
                                <p class="text-sm text-gray-600">Payment Method</p>
                                <p class="font-semibold">${order.payment_method}</p>
                                ${order.payment_status ? `<p class="text-xs text-gray-500 mt-1">Status: ${order.payment_status}</p>` : ''}
                            </div>
                        ` : ''}
                    </div>
                `;

        modal.classList.remove('hidden');
        lucide.createIcons();
    } catch (error) {
        console.error('Error loading order details:', error);
        alert('Error loading order details: ' + error.message);
    }
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

async function handleLogout() {
    await window.logoutUser();
    if (window.updateProfileDropdown) {
        window.updateProfileDropdown(false);
    }
    window.location.href = 'shop.html';
}

// Initialize
window.onSupabaseReady = function () {
    setTimeout(checkAuth, 500);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        setTimeout(checkAuth, 1000);
    });
} else {
    setTimeout(checkAuth, 1000);
}

// Close modal on overlay click
document.getElementById('order-modal').addEventListener('click', function (e) {
    if (e.target === this) {
        closeOrderModal();
    }
});
