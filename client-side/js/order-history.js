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

// Profile dropdown logic handled by common-auth-ui.js

// Check authentication
async function checkAuth() {
    const { session } = await window.authManager.getSession();
    if (!session) {
        if (window.openLoginModal) { window.openLoginModal(); } else { window.location.href = 'shop.html'; }
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

        // --- REALTIME SUBSCRIPTION (The Bridge) ---
        // Subscribe to changes on shop_orders for this user
        if (window.supabaseClient && !window.orderSubscription) {
            window.orderSubscription = window.supabaseClient
                .channel('client_orders')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_orders' }, () => {
                    console.log('Order update received, refreshing...');
                    loadOrders(); // Recursive refresh (be careful of loops, but loadOrders is async and replaces HTML)
                    // Optionally show toast
                })
                .subscribe();
        }

        // Filter Orders
        const activeStatuses = ['pending', 'pending_payment', 'processing', 'shipped'];
        const activeOrders = orders.filter(o => !o.status || activeStatuses.includes(o.status.toLowerCase()));
        const pastOrders = orders.filter(o => o.status && !activeStatuses.includes(o.status.toLowerCase()));

        // Render Active Orders
        const activeSection = document.getElementById('active-orders-section');
        const activeGrid = document.getElementById('active-orders-grid');

        if (activeOrders.length > 0) {
            activeSection.classList.remove('hidden');
            activeGrid.innerHTML = activeOrders.map(order => {
                const orderDate = formatDate(order.created_at);
                const statusClass = getStatusClass(order.status);
                const totalItems = order.order_items ? order.order_items.reduce((sum, item) => sum + item.quantity, 0) : 0;

                // Determine Block Type Message
                let statusMsg = "Waiting for Confirmation";
                if (order.status === 'pending_payment') statusMsg = "Payment Pending";
                if (order.status === 'processing') statusMsg = "Processing Order";
                if (order.status === 'shipped') statusMsg = "On the way";

                return `
                    <div class="bg-white rounded-xl shadow-lg border-l-4 ${order.status === 'pending' ? 'border-orange-400' : 'border-spice-red'} p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        <div class="absolute top-0 right-0 p-4 opacity-10">
                            <i data-lucide="package" class="w-16 h-16 text-spice-red"></i>
                        </div>
                        
                        <div class="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <span class="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">Active</span>
                                <h3 class="font-bold text-xl text-gray-800">${order.order_number || 'Order #' + order.id.slice(0, 6)}</h3>
                            </div>
                             <span class="status-badge ${statusClass} text-xs px-3 py-1 font-bold shadow-sm">${order.status}</span>
                        </div>

                        <div class="space-y-2 mb-6 relative z-10">
                            <div class="flex items-center text-sm text-gray-600">
                                <i data-lucide="calendar" class="w-4 h-4 mr-2 text-gold"></i>
                                ${orderDate}
                            </div>
                            <div class="flex items-center text-sm text-gray-600">
                                <i data-lucide="shopping-bag" class="w-4 h-4 mr-2 text-gold"></i>
                                ${totalItems} Items
                            </div>
                            <div class="flex items-center text-sm font-bold text-spice-red">
                                <i data-lucide="credit-card" class="w-4 h-4 mr-2"></i>
                                ₹${parseFloat(order.total_amount).toFixed(2)}
                            </div>
                        </div>

                        <div class="pt-4 border-t border-gray-100 flex justify-between items-center relative z-10">
                            <span class="text-xs font-semibold text-gray-500 italic">${statusMsg}</span>
                            <button onclick="viewOrderDetails('${order.id}')" class="text-spice-red font-bold text-sm hover:underline flex items-center">
                                View Details <i data-lucide="arrow-right" class="w-4 h-4 ml-1"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            activeSection.classList.add('hidden');
        }

        // Render Past Orders (List)
        const pastSection = document.getElementById('past-orders-section');
        const pastList = document.getElementById('past-orders-list');

        if (pastOrders.length > 0) {
            pastSection.classList.remove('hidden');
            pastList.innerHTML = pastOrders.map(order => {
                const orderDate = formatDate(order.created_at);
                const statusClass = getStatusClass(order.status);
                const totalItems = order.order_items ? order.order_items.reduce((sum, item) => sum + item.quantity, 0) : 0;

                return `
                    <div class="bg-white rounded-lg border border-gray-100 p-4 flex flex-col md:flex-row items-center justify-between hover:bg-gray-50 transition-colors gap-4 shadow-sm">
                        <div class="flex items-center gap-4 flex-1 w-full md:w-auto">
                            <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0">
                                <i data-lucide="${order.status === 'delivered' ? 'check-circle' : 'x-circle'}" class="w-6 h-6"></i>
                            </div>
                            <div>
                                <h4 class="font-bold text-gray-800 text-lg">${order.order_number || 'Order #' + order.id.slice(0, 6)}</h4>
                                <p class="text-xs text-gray-500">${orderDate} • ${totalItems} Items</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <span class="font-bold text-gray-700">₹${parseFloat(order.total_amount).toFixed(2)}</span>
                            <span class="status-badge ${statusClass} text-xs px-2 py-1">${order.status}</span>
                            <button onclick="viewOrderDetails('${order.id}')" class="bg-white border border-gray-300 text-gray-700 hover:text-spice-red hover:border-spice-red px-4 py-2 rounded text-sm font-semibold transition-colors flex items-center gap-2">
                                <i data-lucide="eye" class="w-4 h-4"></i> View
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            // If active orders exist but no past, just hide past section
            if (activeOrders.length === 0) {
                // Empty state handles this globally
            } else {
                pastSection.classList.add('hidden');
            }
        }


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
    window.location.href = 'index.html';
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
