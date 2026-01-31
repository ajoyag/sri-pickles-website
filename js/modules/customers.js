// Derived from Order Data (CRM Style) + User Profiles

const safeHTML = window.safeHTML || ((str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
});

const CustomersModule = {
    customers: [],

    async init() {
        if (document.getElementById('view-customers').querySelector('h2')) {
            this.renderStructure();
        }
        console.log('Initializing Customers Module...');
        await this.fetchCustomerData();

        // Periodic Background Sync (every 2 minutes)
        if (!this.syncInterval) {
            this.syncInterval = setInterval(() => {
                console.log('CustomersModule: Background sync...');
                this.fetchCustomerData();
            }, 120000);
        }
    },

    renderStructure() {
        const viewContainer = document.getElementById('view-customers');
        viewContainer.innerHTML = `
            <div class="bg-white rounded-lg shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 class="text-lg font-bold text-gray-800">Customer Database</h3>
                    <div class="flex gap-2">
                            <input type="text" placeholder="Search customers..." class="border border-gray-300 rounded px-3 py-1.5 text-sm outline-none focus:border-spice-red" onkeyup="CustomersModule.search(this.value)">
                            <button onclick="CustomersModule.exportCSV()" class="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-50 flex items-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i> Export
                            </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-gray-50 text-gray-600 uppercase font-bold">
                            <tr>
                                <th class="px-6 py-3">Customer</th>
                                <th class="px-6 py-3">Location</th>
                                <th class="px-6 py-3">Orders</th>
                                <th class="px-6 py-3">Total Spend</th>
                                <th class="px-6 py-3 text-right">Last Active</th>
                            </tr>
                        </thead>
                        <tbody id="customers-table-body" class="divide-y divide-gray-100">
                            <tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">Loading customer data... <i data-lucide="loader-2" class="w-4 h-4 inline animate-spin ml-2"></i></td></tr>
                        </tbody>
                    </table>
                </div>
                </div>
                <div id="customer-modal-container" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm"></div>
        `;
        lucide.createIcons();
    },

    async fetchCustomerData() {
        try {
            // 1. Fetch Registered Profiles (CRM Base)
            let profiles = [];
            try {
                // Fetch from the EXISTING 'profiles' table shown in screenshot
                const { data, error } = await window.supabaseAdmin
                    .from('profiles')
                    .select('*');

                if (!error && data) profiles = data;
                else console.warn('Profiles fetch error:', error);
            } catch (e) {
                console.warn('Could not fetch profiles:', e);
            }

            // 2. Fetch Orders (Transaction History)
            const { data: orders, error: orderError } = await window.supabaseAdmin
                .from('shop_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (orderError) throw orderError;

            this.processCustomers(profiles, orders || []);
            this.renderCustomers();

            // Update Sidebar Badge
            const badge = document.getElementById('customers-count-badge');
            if (badge) {
                const count = Object.keys(this.customers || {}).length || (this.customers ? this.customers.length : 0);
                badge.innerText = count;
                badge.classList.remove('hidden');
            }

        } catch (err) {
            console.error('Error fetching customers:', err);
            const tbody = document.getElementById('customers-table-body');
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Failed to load customer insights. <br><span class="text-xs text-gray-400">${err.message}</span></td></tr>`;
        }
    },

    processCustomers(profiles, orders) {
        const customerMap = {};

        // A. Load Profiles First
        profiles.forEach(p => {
            customerMap[p.id] = {
                id: p.id,
                name: p.name || 'Registered User',
                email: p.email || '-',
                phone: p.phone,
                avatar_url: p.avatar_url, // Capture Avatar
                totalOrders: 0,
                totalSpend: 0,
                lastOrderDate: p.created_at || null,
                city: '-',
                fullAddress: '-',
                type: 'Registered',
                orders: []
            };
        });

        // B. Overlay Order Data
        orders.forEach(order => {
            const addr = order.shipping_address || {};
            const email = order.user_email || addr.email || 'Unknown';
            let userId = order.user_id;

            if (!userId && email !== 'Unknown') {
                const match = Object.values(customerMap).find(c => c.email.toLowerCase() === email.toLowerCase());
                if (match) userId = match.id;
                else userId = email;
            }
            if (!userId) userId = `guest_${Math.random()}`;

            if (!customerMap[userId]) {
                customerMap[userId] = {
                    id: userId,
                    name: addr.fullName || 'Guest User',
                    email: email,
                    totalOrders: 0,
                    totalSpend: 0,
                    lastOrderDate: order.created_at,
                    city: addr.city || '-',
                    fullAddress: addr.address || addr.streetAddress || '-',
                    type: 'Guest',
                    orders: []
                };
            }

            const c = customerMap[userId];
            if (c.email === '-' && email !== 'Unknown') c.email = email;
            c.totalOrders += 1;
            c.totalSpend += parseFloat(order.total_amount || 0);

            c.orders.push({
                id: order.id,
                date: order.created_at,
                amount: order.total_amount,
                status: order.status,
                items: order.order_items || []
            });

            const orderDate = new Date(order.created_at);
            const currentLast = c.lastOrderDate ? new Date(c.lastOrderDate) : new Date(0);
            if (orderDate > currentLast) {
                c.lastOrderDate = order.created_at;
                if (addr.city) c.city = addr.city;
                if (addr.address || addr.streetAddress) {
                    const fullAddr = [
                        addr.address || addr.streetAddress,
                        addr.city,
                        addr.state,
                        addr.pincode
                    ].filter(Boolean).join(', ');
                    c.fullAddress = fullAddr;
                }
            }
        });

        this.customers = Object.values(customerMap);
        this.customers.sort((a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate));
    },

    renderCustomers() {
        const tbody = document.getElementById('customers-table-body');

        // If renderStructure wasn't called (e.g. reload), call it
        if (!tbody) {
            this.renderStructure();
            return this.renderCustomers(); // Retry
        }

        if (!this.customers.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No customers found.</td></tr>`;
            return;
        }

        this.renderRows(this.customers);
        lucide.createIcons();
    },

    exportCSV() {
        if (!this.customers || !this.customers.length) {
            alert("No customer data to export.");
            return;
        }

        const headers = ["ID", "Name", "Email", "Phone", "Status", "City", "Total Orders", "Total Spend", "Last Active"];
        const rows = this.customers.map(c => [
            c.id,
            `"${c.name}"`, // Quote to handle commas in names
            c.email,
            c.phone || "",
            c.type,
            `"${c.city}"`,
            c.totalOrders,
            c.totalSpend.toFixed(2),
            new Date(c.lastOrderDate).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "sri_pickles_customers.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    search(query) {
        if (!query) {
            this.renderRows(this.customers);
            return;
        }
        const lower = query.toLowerCase();
        const filtered = this.customers.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.email.toLowerCase().includes(lower) ||
            (c.phone && c.phone.includes(query))
        );
        this.renderRows(filtered);
    },

    renderRows(list) {
        const tbody = document.getElementById('customers-table-body');
        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No matches found.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(cust => {
            // Avatar Logic
            const avatarHtml = cust.avatar_url
                ? `<img src="${cust.avatar_url}" class="w-10 h-10 rounded-full object-cover border border-gray-200" alt="${safeHTML(cust.name)}">`
                : `<div class="w-10 h-10 rounded-full ${cust.totalOrders > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'} flex items-center justify-center font-bold text-sm">
                        ${(safeHTML(cust.name) || '?').substring(0, 2).toUpperCase()}
                   </div>`;

            return `
            <tr class="hover:bg-gray-50 transition-colors cursor-pointer" onclick="CustomersModule.openCustomerModal('${cust.id}')">
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        ${avatarHtml}
                        <div>
                            <p class="font-bold text-gray-800">${safeHTML(cust.name)} ${cust.type === 'Guest' ? '<span class="text-xs font-normal text-gray-400 border border-gray-200 rounded px-1 ml-1">Guest</span>' : ''}</p>
                            <p class="text-xs text-gray-500 flex items-center gap-1">
                                ${cust.email !== '-' ? safeHTML(cust.email) : ''}
                                ${cust.phone ? `<span><i data-lucide="phone" class="w-3 h-3 inline"></i> ${safeHTML(cust.phone)}</span>` : ''}
                                ${(cust.email === '-' && !cust.phone) ? 'No Contact Info' : ''}
                            </p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-gray-600">${safeHTML(cust.city)}</td>
                <td class="px-6 py-4 font-bold ${cust.totalOrders === 0 ? 'text-gray-300' : 'text-gray-700'}">${cust.totalOrders}</td>
                <td class="px-6 py-4 font-bold text-spice-red">₹${cust.totalSpend.toFixed(2)}</td>
                <td class="px-6 py-4 text-right text-gray-500 text-xs">
                    ${new Date(cust.lastOrderDate).toLocaleDateString()}
                    <br><span class="text-gray-400">ID: ...${String(cust.id).slice(-4)}</span>
                </td>
            </tr>
        `}).join('');
    },

    openCustomerModal(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        // Modal Avatar Logic
        const avatarLargeHtml = customer.avatar_url
            ? `<img src="${customer.avatar_url}" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg">`
            : `<div class="w-20 h-20 rounded-full bg-spice-red text-white flex items-center justify-center text-3xl font-bold shadow-lg">
                    ${(customer.name || '?').substring(0, 2).toUpperCase()}
               </div>`;

        const container = document.getElementById('customer-modal-container');
        container.innerHTML = `
            <div class="bg-white w-11/12 h-5/6 rounded-xl shadow-2xl flex overflow-hidden animate-fade-in">
                <!-- Sidebar -->
                <div class="w-1/3 bg-gray-50 border-r border-gray-100 p-8 flex flex-col">
                    <div class="flex items-center gap-4 mb-8">
                        ${avatarLargeHtml}
                        <div>
                            <h2 class="text-2xl font-bold text-gray-800">${customer.name}</h2>
                            <span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold uppercase tracking-wide">${customer.type}</span>
                        </div>
                    </div>

                    <div class="space-y-6 flex-1">
                        <div>
                            <label class="text-xs font-bold text-gray-400 uppercase">Contact Info</label>
                            <div class="mt-2 space-y-2">
                                <div class="flex items-center gap-2 text-gray-700">
                                    <i data-lucide="mail" class="w-4 h-4 text-gray-400"></i>
                                    <span class="text-xs font-bold text-gray-400 uppercase w-12">Email:</span>
                                    <span class="truncate">${customer.email}</span>
                                </div>
                                <div class="flex items-center gap-2 text-gray-700">
                                    <i data-lucide="phone" class="w-4 h-4 text-gray-400"></i>
                                    <span class="text-xs font-bold text-gray-400 uppercase w-12">Phone:</span>
                                    <span>${customer.phone || 'N/A'}</span>
                                </div>
                                <div class="flex items-center gap-2 text-gray-700">
                                    <i data-lucide="map-pin" class="w-4 h-4 text-gray-400"></i>
                                    <span class="text-xs font-bold text-gray-400 uppercase w-12">City:</span>
                                    <span>${customer.city}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="text-xs font-bold text-gray-400 uppercase">Lifetime Stats</label>
                            <div class="grid grid-cols-2 gap-4 mt-2">
                                <div class="bg-white p-3 rounded border border-gray-100 text-center">
                                    <div class="text-2xl font-bold text-spice-red">₹${customer.totalSpend.toFixed(0)}</div>
                                    <div class="text-xs text-gray-500">Total Spent</div>
                                </div>
                                <div class="bg-white p-3 rounded border border-gray-100 text-center">
                                    <div class="text-2xl font-bold text-gray-800">${customer.totalOrders}</div>
                                    <div class="text-xs text-gray-500">Orders</div>
                                </div>
                            </div>
                            <div class="mt-4 bg-white p-4 rounded border border-gray-100">
                                <div class="text-xs font-bold text-gray-400 uppercase mb-2">Latest Address</div>
                                <div class="text-xs text-gray-600 leading-relaxed font-medium">
                                    ${customer.fullAddress || 'No address on file'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-auto pt-6 border-t border-gray-200">
                        <p class="text-xs text-gray-400">Customer ID: ${customer.id}</p>
                        <p class="text-xs text-gray-400">First Active: ${new Date(customer.lastOrderDate).toLocaleDateString()}</p>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="w-2/3 p-8 overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-gray-800">Order History</h3>
                        <button onclick="document.getElementById('customer-modal-container').classList.add('hidden')" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <i data-lucide="x" class="w-6 h-6 text-gray-500"></i>
                        </button>
                    </div>

                    ${customer.orders.length === 0
                ? `<div class="text-center py-20 text-gray-400">
                               <i data-lucide="shopping-bag" class="w-12 h-12 mx-auto mb-3 opacity-20"></i>
                               <p>No orders placed yet.</p>
                           </div>`
                : `<div class="space-y-4">
                                ${customer.orders.map(order => `
                                    <div class="bg-white border boundary-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center">
                                        <div>
                                            <div class="flex items-center gap-3">
                                                <span class="font-bold text-gray-800">#${String(order.id).slice(0, 8)}</span>
                                                <span class="px-2 py-0.5 rounded text-xs font-bold 
                                                    ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'} uppercase">
                                                    ${order.status}
                                                </span>
                                            </div>
                                            <div class="text-sm text-gray-500 mt-1">
                                                ${new Date(order.date).toLocaleString()}
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <div class="font-bold text-spice-red">₹${order.amount}</div>
                                            <div class="text-xs text-gray-400">${(order.items || []).length} items</div>
                                        </div>
                                    </div>
                                `).join('')}
                           </div>`
            }
                </div>
            </div>
        `;

        container.classList.remove('hidden');
        lucide.createIcons();
    }
};

window.CustomersModule = CustomersModule;
