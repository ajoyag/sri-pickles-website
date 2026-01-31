// Orders Module for Admin Dashboard

const OrdersModule = {
    // State
    activeOrders: [],
    historyOrders: [],

    // Pagination State
    pagination: {
        active: { page: 0, itemsPerPage: 10, hasMore: true, isLoading: false },
        history: { page: 0, itemsPerPage: 10, hasMore: true, isLoading: false }
    },

    initialized: false,

    init() {
        if (this.initialized) {
            console.log('Orders Module already initialized, refreshing data...');
            this.refreshActive(true);
            return;
        }

        if (!window.supabaseAdmin) {
            console.warn('OrdersModule: Supabase not ready yet, waiting...');
            return;
        }

        console.log('Initializing Orders Module with Split Layout & Infinite Scroll...');
        this.initialized = true;
        this.renderTableSkeleton();

        // Initial Fetch (Non-blocking so interval starts)
        this.fetchActiveOrders().catch(e => console.error('Initial active fetch failed', e));
        this.fetchHistoryOrders().catch(e => console.error('Initial history fetch failed', e));

        // Periodic Background Sync (every 60 seconds)
        if (!this.syncInterval) {
            this.syncInterval = setInterval(() => {
                console.log('OrdersModule: Background sync...');
                // Silently refresh active orders
                this.refreshActive(true);
            }, 120000);
        }
    },

    renderTableSkeleton() {
        const container = document.getElementById('view-orders');
        // Main Container: Flex Column, Full Height (managed via parent normally, here we enforce spacing)
        // We use h-[calc(100vh-140px)] to fit within dashboard main view roughly
        container.innerHTML = `
            <div class="flex flex-col h-[calc(100vh-140px)] gap-6">
                
                <!-- Active Orders Section (Flex-1 for equal height) -->
                <div class="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0">
                     <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <div class="flex items-center gap-2">
                             <div class="w-1.5 h-6 bg-green-500 rounded-full"></div>
                             <h3 class="text-lg font-serif font-bold text-gray-800">Active Orders</h3>
                             <span id="active-count-badge" class="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full hidden">0</span>
                        </div>
                        <div class="flex gap-2">
                            <div class="relative">
                                <input type="text" id="active-order-search" placeholder="Search Active..." 
                                    class="pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-green-500 shadow-sm w-40">
                                <i data-lucide="search" class="w-3 h-3 text-gray-400 absolute left-2 top-2"></i>
                            </div>
                            <button onclick="OrdersModule.refreshActive()" class="text-gray-400 hover:text-green-600 transition-colors" title="Refresh Active">
                                <i id="refresh-active-icon" data-lucide="refresh-cw" class="w-4 h-4"></i>
                            </button>
                            <button onclick="OrdersModule.exportCSV()" class="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1">
                                <i data-lucide="download" class="w-3 h-3"></i> Export
                            </button>
                        </div>
                    </div>
                    
                    <!-- Scrollable Content -->
                    <div id="active-orders-container" class="flex-1 overflow-y-auto relative no-scrollbar">
                        <table class="w-full text-left text-sm relative">
                             <thead class="bg-white text-gray-500 uppercase tracking-wider font-bold text-xs sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Order ID</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Date</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Customer</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Total</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Status</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="active-orders-body" class="divide-y divide-gray-100">
                                 <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Loading active orders...</td></tr>
                            </tbody>
                        </table>
                        <div id="active-loader" class="hidden py-4 text-center text-xs text-gray-400">Loading more...</div>
                    </div>
                </div>

                <!-- Order History Section (Flex-1 for equal height) -->
                <div class="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0">
                     <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <div class="flex items-center gap-2">
                            <div class="w-1.5 h-6 bg-gray-400 rounded-full"></div>
                            <h3 class="text-lg font-serif font-bold text-gray-800">Order History</h3>
                        </div>
                        <div class="flex gap-2">
                            <div class="relative">
                                <input type="text" id="history-order-search" placeholder="Search History..." 
                                    class="pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-spice-red shadow-sm w-40">
                                <i data-lucide="search" class="w-3 h-3 text-gray-400 absolute left-2 top-2"></i>
                            </div>
                             <button onclick="OrdersModule.refreshHistory()" class="text-gray-400 hover:text-blue-600 transition-colors" title="Refresh History">
                                <i id="refresh-history-icon" data-lucide="refresh-cw" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Scrollable Content -->
                     <div id="history-orders-container" class="flex-1 overflow-y-auto relative no-scrollbar">
                        <table class="w-full text-left text-sm relative">
                             <thead class="bg-white text-gray-500 uppercase tracking-wider font-bold text-xs sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Order ID</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Date</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Customer</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Total</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Status</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur text-right">Actions</th>
                                </tr>
                            </thead>
                             <tbody id="history-orders-body" class="divide-y divide-gray-100">
                                 <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">Loading history...</td></tr>
                            </tbody>
                        </table>
                         <div id="history-loader" class="hidden py-4 text-center text-xs text-gray-400">Loading more...</div>
                    </div>
                </div>

            </div>
        `;
        lucide.createIcons();

        // Bind Infinite Scroll
        this.bindScroll('active-orders-container', () => this.fetchActiveOrders());
        this.bindScroll('history-orders-container', () => this.fetchHistoryOrders());

        // Bind Search
        document.getElementById('active-order-search').addEventListener('keyup', (e) => this.searchActive(e.target.value));
        document.getElementById('history-order-search').addEventListener('keyup', (e) => this.searchHistory(e.target.value));
    },

    bindScroll(elementId, callback) {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.addEventListener('scroll', () => {
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) { // 50px threshold
                callback();
            }
        });
    },

    async fetchActiveOrders() {
        const state = this.pagination.active;
        if (state.isLoading || !state.hasMore) return;
        state.isLoading = true;
        document.getElementById('active-loader').classList.remove('hidden');

        try {
            const start = state.page * state.itemsPerPage;
            const end = start + state.itemsPerPage - 1;

            const { data, error, count } = await window.supabaseAdmin
                .from('shop_orders')
                .select('*', { count: 'exact' })
                .in('status', ['pending', 'processing', 'shipped']) // Active Statuses
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;
            const orders = data || [];

            if (data.length < state.itemsPerPage) state.hasMore = false;

            if (state.page === 0) {
                this.activeOrders = orders;
                const tbody = document.getElementById('active-orders-body');
                if (tbody) tbody.innerHTML = ''; // Clear loading/old
            } else {
                this.activeOrders = [...this.activeOrders, ...orders];
            }

            this.appendRows(orders, 'active-orders-body');
            state.page++;

            // Update Badges
            const badge = document.getElementById('active-count-badge');
            const sideBadge = document.getElementById('pending-count-badge');
            const countVal = count || orders.length;

            if (badge) {
                badge.innerText = countVal;
                badge.classList.remove('hidden');
            }
            if (sideBadge) {
                sideBadge.innerText = countVal;
                sideBadge.classList.remove('hidden');
            }

        } catch (err) {
            console.error('Fetch Active Error:', err);
            const tbody = document.getElementById('active-orders-body');
            if (tbody && state.page === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500 text-xs">Error loading orders: ${err.message || 'Unknown error'}</td></tr>`;
            }
        } finally {
            state.isLoading = false;
            document.getElementById('active-loader').classList.add('hidden');
        }
    },

    async fetchHistoryOrders() {
        const state = this.pagination.history;
        if (state.isLoading || !state.hasMore) return;
        state.isLoading = true;
        document.getElementById('history-loader').classList.remove('hidden');

        try {
            const start = state.page * state.itemsPerPage;
            const end = start + state.itemsPerPage - 1;

            const { data, error } = await window.supabaseAdmin
                .from('shop_orders')
                .select('*')
                .in('status', ['delivered', 'cancelled']) // History Statuses
                .order('created_at', { ascending: false })
                .range(start, end);

            if (error) throw error;
            const orders = data || [];

            if (orders.length < state.itemsPerPage) state.hasMore = false;

            if (state.page === 0) {
                this.historyOrders = orders;
                const tbody = document.getElementById('history-orders-body');
                if (tbody) tbody.innerHTML = '';
            } else {
                this.historyOrders = [...this.historyOrders, ...orders];
            }

            this.appendRows(orders, 'history-orders-body');
            state.page++;

        } catch (err) {
            console.error('Fetch History Error:', err);
            const tbody = document.getElementById('history-orders-body');
            if (tbody && state.page === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500 text-xs">Error loading history: ${err.message || 'Unknown error'}</td></tr>`;
            }
        } finally {
            state.isLoading = false;
            document.getElementById('history-loader').classList.add('hidden');
        }
    },

    appendRows(orders, tableBodyId) {
        const tbody = document.getElementById(tableBodyId);
        if (orders.length === 0 && tbody.children.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-gray-400 text-xs">No orders found.</td></tr>`;
            return;
        }

        const html = orders.map(order => {
            const date = new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

            let customerName = "Guest";
            let addr = order.shipping_address || {};
            if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch (e) { addr = {}; } }
            if (addr && addr.name) customerName = addr.name;

            const statusClass = `status-${order.status || 'pending'}`;

            // Badge Logic
            let paymentBadge = '';
            if (order.payment_status === 'completed') paymentBadge = '<span class="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded ml-1 font-bold">PAID</span>';
            else if (order.payment_method === 'UPI Gateway') paymentBadge = '<span class="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded ml-1 font-bold">UPI CHECK</span>';
            else paymentBadge = '<span class="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded ml-1 font-bold">UNPAID</span>';

            return `
                <tr class="hover:bg-blue-50/30 transition-colors group border-b border-gray-100 cursor-pointer text-xs" onclick="OrdersModule.viewOrderDetails('${order.id}')">
                    <td class="px-6 py-3 font-bold text-gray-700 font-mono">
                        ${order.order_number || order.id.slice(0, 8)}
                    </td>
                    <td class="px-6 py-3 text-gray-500">${date}</td>
                    <td class="px-6 py-3">
                        <div class="font-bold text-gray-800">${customerName}</div>
                        <div class="text-[10px] text-gray-400 uppercase tracking-wide">${addr.city || ''}</div>
                    </td>
                    <td class="px-6 py-3 font-bold text-gray-800">
                        ₹${parseFloat(order.total_amount).toFixed(2)}
                        ${paymentBadge}
                    </td>
                    <td class="px-6 py-3">
                        <span class="status-badge ${statusClass} uppercase text-[10px] tracking-wider font-bold block w-fit px-2 py-0.5">
                            ${(order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending')}
                        </span>
                    </td>
                    <td class="px-6 py-3 text-right">
                         <button onclick="event.stopPropagation(); OrdersModule.viewOrderDetails('${order.id}')" class="text-gray-400 hover:text-blue-600 p-1 rounded-full transition-colors">
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.insertAdjacentHTML('beforeend', html);
        lucide.createIcons();
    },

    async refreshActive(silent = false) {
        if (this.pagination.active.isLoading) {
            console.log('RefreshActive: Already loading, skipping...');
            return;
        }

        const icon = document.getElementById('refresh-active-icon');
        if (icon && !silent) icon.classList.add('animate-spin');

        this.pagination.active = { page: 0, itemsPerPage: 10, hasMore: true, isLoading: false };
        await this.fetchActiveOrders();

        if (icon) icon.classList.remove('animate-spin');
    },

    async refreshHistory(silent = false) {
        if (this.pagination.history.isLoading) return;

        const icon = document.getElementById('refresh-history-icon');
        if (icon && !silent) icon.classList.add('animate-spin');

        this.pagination.history = { page: 0, itemsPerPage: 10, hasMore: true, isLoading: false };
        await this.fetchHistoryOrders();

        if (icon) icon.classList.remove('animate-spin');
    },

    // Search Functions (Local Filter)
    searchActive(query) {
        if (!query && query !== '') return; // Allow empty string to reset
        const lower = query.toLowerCase();
        // Filter currently loaded
        const rows = document.getElementById('active-orders-body').querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(lower) ? '' : 'none';
        });
    },

    searchHistory(query) {
        // Simple debounce could be added
        if (!query && query !== '') return;

        const lower = query.toLowerCase();
        // Filter currently loaded
        const rows = document.getElementById('history-orders-body').querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(lower) ? '' : 'none';
        });
    },

    async viewOrderDetails(orderId) {
        // Search in both lists
        const order = this.activeOrders.find(o => o.id == orderId) || this.historyOrders.find(o => o.id == orderId);
        if (!order) return;

        const modalId = 'order-detail-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 hidden';
            document.body.appendChild(modal);
        }

        // Parsing Data
        let sAddr = {};
        if (order.shipping_address) {
            try {
                sAddr = typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
            } catch (e) { console.warn('Addr Parse Error', e); }
        }

        let items = [];
        if (order.items) {
            try {
                items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
            } catch (e) { console.warn('Items Parse Error', e); }
        }

        // Calculations
        const total = parseFloat(order.total_amount) || 0;
        // Mock gst/shipping if missing (Assuming generic structure)
        const shipping = 50;
        const subtotal = total - shipping; // Simple reverse calc for display

        // Status Logic
        const isPending = order.status === 'pending';
        const isProcessed = order.status === 'processed' || order.status === 'processing';
        const isShipped = order.status === 'shipped';
        const isDelivered = order.status === 'delivered';
        const isCancelled = order.status === 'cancelled';

        // Payment Logic
        const isUPI = order.payment_method === 'UPI Gateway';
        const isPhonePe = order.payment_method === 'PhonePe Gateway';
        const isPaymentVerified = order.payment_status === 'completed';

        modal.innerHTML = `
            <div class="bg-gray-100 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-200">
                
                <!-- Sidebar Info -->
                <div class="w-full md:w-1/3 bg-white p-6 border-r border-gray-200 overflow-y-auto">
                    <div class="mb-6">
                         <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Customer</h4>
                         <div class="flex items-start gap-3">
                             <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                 ${(sAddr.name || 'G')[0]}
                             </div>
                             <div>
                                 <p class="font-bold text-gray-800">${sAddr.name || 'Guest'}</p>
                                 <div class="text-sm text-gray-500 flex flex-col gap-1 mt-1">
                                     <a href="tel:${sAddr.phone}" class="hover:text-indigo-600 flex items-center gap-1"><i data-lucide="phone" class="w-3 h-3"></i> ${sAddr.phone || 'N/A'}</a>
                                     <a href="mailto:${sAddr.email}" class="hover:text-indigo-600 flex items-center gap-1"><i data-lucide="mail" class="w-3 h-3"></i> ${sAddr.email || 'N/A'}</a>
                                 </div>
                             </div>
                         </div>
                    </div>

                    <div class="mb-6">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shipping Address</h4>
                        <div class="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 leading-relaxed border border-gray-100">
                            ${sAddr.address},<br>
                            <span class="font-bold text-gray-800">${sAddr.city}, ${sAddr.state} - ${sAddr.pincode}</span>
                        </div>
                    </div>

                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Payment Details</h4>
                         <div class="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                            <div class="flex justify-between items-center mb-2">
                                <span class="text-xs text-indigo-700 font-bold">${order.payment_method}</span>
                                ${isPaymentVerified
                ? '<i data-lucide="check-circle-2" class="w-4 h-4 text-green-600"></i>'
                : '<i data-lucide="clock" class="w-4 h-4 text-orange-600"></i>'}
                            </div>
                            <div class="text-2xl font-bold text-indigo-900 mb-1">₹${total.toFixed(2)}</div>
                            <div class="text-xs text-indigo-600/70 uppercase font-bold tracking-wider">${order.payment_status}</div>
                            
                            <!-- Payment Proof for UPI -->
                            ${order.payment_proof_url ? `
                                <a href="${order.payment_proof_url}" target="_blank" class="mt-4 block text-center bg-white border border-indigo-200 text-indigo-700 py-2 rounded text-xs font-bold hover:bg-indigo-100 transition-colors">
                                    <i data-lucide="image" class="w-3 h-3 inline mr-1"></i> View Transaction Screenshot
                                </a>
                            ` : (isUPI && !isPaymentVerified ? `<div class="mt-2 text-[10px] text-red-500 italic">* No proof uploaded yet</div>` : '')}
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="w-full md:w-2/3 bg-gray-50 flex flex-col max-h-[90vh]">
                    <!-- Header -->
                    <div class="bg-white px-8 py-6 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
                        <div>
                             <div class="flex items-center gap-3">
                                 <h2 class="text-2xl font-serif font-bold text-gray-800">Order ${order.order_number?.startsWith('#') ? order.order_number : '#' + (order.order_number || order.id.slice(0, 5))}</h2>
                                 <span class="status-badge status-${order.status} uppercase text-xs px-2 py-1">${order.status}</span>
                             </div>
                             <p class="text-xs text-gray-400 mt-1">Placed on ${new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <button onclick="document.getElementById('${modalId}').classList.add('hidden')" class="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">
                            <i data-lucide="x" class="w-5 h-5 text-gray-600"></i>
                        </button>
                    </div>

                    <!-- Workflow Actions -->
                    <div class="px-8 py-6">
                        ${isUPI && isPending ? `
                             <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center justify-between shadow-sm mb-6">
                                <div>
                                    <p class="text-blue-900 font-bold text-sm">Review Manual Payment</p>
                                    <p class="text-blue-600 text-xs mt-0.5">Check transaction proof before accepting.</p>
                                </div>
                                <div class="flex gap-2">
                                     <button onclick="OrdersModule.updateStatus('${order.id}', 'cancelled')" class="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50">Cancel</button>
                                     <button onclick="OrdersModule.acceptOrder('${order.id}')" class="px-6 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-md">Accept Order</button>
                                </div>
                             </div>
                        ` : ''}

                        ${!isCancelled ? `
                            <div class="mb-2">
                                <label class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Update Status</label>
                                <div class="flex rounded-lg shadow-sm border border-gray-200 bg-white p-1 gap-1">
                                    ${['processed', 'shipped', 'delivered', 'cancelled'].map(st => {
                    const isActive = order.status === st || (st === 'processed' && order.status === 'processing');
                    let label = st.charAt(0).toUpperCase() + st.slice(1);
                    if (st === 'processed') label = 'Processed';

                    // Color mapping
                    const activeClass = st === 'cancelled' ? 'bg-red-500 text-white' : (st === 'delivered' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white');
                    const baseClass = isActive ? activeClass : 'text-gray-500 hover:bg-gray-50';

                    return `<button onclick="OrdersModule.updateStatus('${order.id}', '${st}', event)" class="flex-1 py-2 text-xs font-bold rounded ${baseClass} transition-all">${label}</button>`;
                }).join('')}
                                </div>
                            </div>
                        ` : '<div class="bg-red-50 p-4 rounded text-red-600 font-bold text-center border border-red-100 text-sm">Order Cancelled</div>'}
                    </div>

                    <!-- Items List -->
                    <div class="flex-1 overflow-y-auto px-8 pb-8">
                        <label class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Order Items</label>
                        <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            ${items.map(item => `
                                <div class="flex items-center gap-4 p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                    <div class="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400">
                                        <i data-lucide="package" class="w-6 h-6"></i>
                                    </div>
                                    <div class="flex-1">
                                        <p class="font-bold text-gray-800 text-sm">${item.product_name || item.name}</p>
                                        <p class="text-xs text-gray-500">${item.variant_label || item.variantLabel || 'Standard'}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-bold text-gray-800 text-sm">₹${(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
                                        <p class="text-xs text-gray-500">Qty: ${item.quantity}</p>
                                    </div>
                                </div>
                            `).join('')}
                            
                            <!-- Summary -->
                             <div class="bg-gray-50 p-4 text-sm space-y-2">
                                <div class="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>₹${subtotal.toFixed(2)}</span>
                                </div>
                                ${order.discount > 0 ? `
                                <div class="flex justify-between text-green-600">
                                    <span>Discount ${order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                                    <span>-₹${parseFloat(order.discount).toFixed(2)}</span>
                                </div>` : ''}
                                <div class="flex justify-between text-gray-500">
                                    <span>Shipping</span>
                                    <span>₹${shipping.toFixed(2)}</span>
                                </div>
                                <div class="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
                                    <span>Grand Total</span>
                                    <span class="text-spice-red">₹${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        lucide.createIcons();
    },

    async acceptOrder(orderId) {
        if (!confirm('Accept this manual payment order? This will mark it as Processed.')) return;
        try {
            const { data, error, count } = await window.supabaseAdmin
                .from('shop_orders')
                .update({
                    status: 'processing',
                    payment_status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .select(); // MUST select to get updated rows back

            if (error) throw error;

            if (!data || data.length === 0) {
                alert('Warning: No rows were updated. This is likely due to RLS Permissions (try logging in properly instead of Dev Bypass).');
                return;
            }

            await this.refreshActive();
            document.getElementById('order-detail-modal').classList.add('hidden');
            alert('Order accepted successfully!');
        } catch (e) {
            console.error(e);
            alert('Error accepting order: ' + (e.message || 'Unknown error'));
        }
    },

    async updateStatus(orderId, newStatus, btnEvent) {
        const confirmMsg = newStatus === 'cancelled'
            ? 'Are you sure you want to CANCEL this order? This cannot be undone.'
            : `Update status to ${newStatus.toUpperCase()}?`;

        if (!confirm(confirmMsg)) return;

        // Visual Feedback
        const originalText = btnEvent?.target?.innerText;
        if (btnEvent && btnEvent.target) {
            btnEvent.target.innerText = 'Updating...';
            btnEvent.target.disabled = true;
        }

        // Map status
        let dbStatus = newStatus;
        if (newStatus === 'processed') dbStatus = 'processing'; // Map UI Processed -> DB processing

        try {
            const { data, error } = await window.supabaseAdmin
                .from('shop_orders')
                .update({
                    status: dbStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .select(); // Select to verify update

            if (error) throw error;

            if (!data || data.length === 0) {
                alert('Update Failed: No rows were modified. Ensure you have Admin permissions (RLS).');
                if (btnEvent && btnEvent.target) {
                    btnEvent.target.innerText = originalText;
                    btnEvent.target.disabled = false;
                }
                return;
            }

            await Promise.all([this.refreshActive(), this.refreshHistory()]);

            // Close modal active
            document.getElementById('order-detail-modal').classList.add('hidden');
            alert(`Order status updated to ${newStatus.toUpperCase()}`);

        } catch (err) {
            console.error('Update failed', err);
            alert('Failed to update status: ' + (err.message || 'Database error'));
            if (btnEvent && btnEvent.target) {
                btnEvent.target.innerText = originalText;
                btnEvent.target.disabled = false;
            }
        }
    },

    updateDashboardStats(orders) {
        // Mock Stats Logic (same as before)
        const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
        const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'processed' || o.status === 'pending_payment').length;

        const revEl = document.getElementById('dash-revenue');
        if (revEl) revEl.innerText = `₹${totalRevenue.toLocaleString('en-IN')}`;

        const actEl = document.getElementById('dash-orders-count');
        if (actEl) actEl.innerText = activeCount;

        const recentBody = document.getElementById('recent-orders-body');
        if (recentBody) {
            const recent5 = orders.slice(0, 5);
            recentBody.innerHTML = recent5.map(o => {
                let addr = o.shipping_address;
                if (typeof addr === 'string') try { addr = JSON.parse(addr); } catch (e) { }
                return `
                <tr>
                    <td class="px-6 py-4 text-gray-700 font-medium">${o.order_number || o.id}</td>
                    <td class="px-6 py-4 text-gray-600">
                        ${addr ? addr.name : 'Guest'}
                    </td>
                    <td class="px-6 py-4"><span class="status-badge status-${o.status || 'pending'} text-[10px]">${(o.status || 'Pending').toUpperCase()}</span></td>
                    <td class="px-6 py-4 font-bold">₹${o.total_amount}</td>
                    <td class="px-6 py-4 text-right">
                         <button onclick="switchTab('orders'); setTimeout(() => OrdersModule.viewOrderDetails('${o.id}'), 100)" class="text-blue-600 hover:text-blue-800"><i data-lucide="eye" class="w-4 h-4"></i></button>
                    </td>
                </tr>
             `}).join('');
            lucide.createIcons();
        }
    },

    async exportCSV() {
        console.log('Exporting Orders CSV...');
        try {
            // Fetch ALL orders for export (not just paginated ones)
            const { data, error } = await window.supabaseAdmin
                .from('shop_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) {
                alert('No orders found to export.');
                return;
            }

            const headers = ["Order#", "Date", "Customer", "Phone", "Email", "Total", "Payment Status", "Order Status", "Payment Method"];
            const rows = data.map(order => {
                let addr = order.shipping_address || {};
                if (typeof addr === 'string') { try { addr = JSON.parse(addr); } catch (e) { addr = {}; } }

                return [
                    order.order_number || order.id,
                    new Date(order.created_at).toLocaleDateString(),
                    `"${addr.name || 'Guest'}"`,
                    addr.phone || "N/A",
                    addr.email || "N/A",
                    order.total_amount,
                    order.payment_status,
                    order.status,
                    order.payment_method
                ];
            });

            const csvContent = [
                headers.join(","),
                ...rows.map(r => r.join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `sri_pickles_orders_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export Error:', err);
            alert('Failed to export CSV: ' + err.message);
        }
    }
};

// Initialize only when tab is active or app loads
// For simplicity in this structure, we expose it globally
window.OrdersModule = OrdersModule;
