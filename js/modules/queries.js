// Queries Management Module
// Handles customer contact form submissions

const QueriesModule = {
    queries: [],

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        if (document.getElementById('view-queries').querySelector('h2')) {
            this.renderStructure();
        }
        console.log('Initializing Queries Module...');
        await this.fetchQueries();

        // Periodic Background Sync (every 2 minutes)
        if (!this.syncInterval) {
            this.syncInterval = setInterval(() => {
                console.log('QueriesModule: Background sync...');
                this.fetchQueries();
            }, 120000);
        }
    },

    renderStructure() {
        const viewContainer = document.getElementById('view-queries');
        viewContainer.innerHTML = `
            <div class="flex flex-col h-[calc(100vh-140px)] gap-6">
                
                <!-- Active Inquiries Section -->
                <div class="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0">
                     <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <div class="flex items-center gap-2">
                             <div class="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                             <h3 class="text-lg font-serif font-bold text-gray-800">Active Inquiries</h3>
                             <span id="active-inquiries-badge" class="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full hidden">0</span>
                        </div>
                        <div class="flex gap-2">
                            <div class="relative">
                                <input type="text" placeholder="Search..." onkeyup="QueriesModule.search(this.value)"
                                    class="pl-7 pr-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:border-purple-500 shadow-sm w-44">
                                <i data-lucide="search" class="w-3 h-3 text-gray-400 absolute left-2 top-2"></i>
                            </div>
                            <button onclick="QueriesModule.exportCSV()" 
                                class="bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1">
                                <i data-lucide="download" class="w-3 h-3"></i> Export
                            </button>
                        </div>
                    </div>
                    
                    <div id="active-queries-container" class="flex-1 overflow-y-auto relative no-scrollbar">
                        <table class="w-full text-left text-sm relative">
                             <thead class="bg-white text-gray-500 uppercase tracking-wider font-bold text-xs sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Status</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Subject</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">From</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Date</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="active-queries-body" class="divide-y divide-gray-100">
                                 <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Loading active inquiries...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Past Inquiries Section -->
                <div class="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col min-h-0">
                     <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 flex-shrink-0">
                        <div class="flex items-center gap-2">
                            <div class="w-1.5 h-6 bg-gray-400 rounded-full"></div>
                            <h3 class="text-lg font-serif font-bold text-gray-800">Past Inquiries</h3>
                        </div>
                    </div>
                    
                    <div id="past-queries-container" class="flex-1 overflow-y-auto relative no-scrollbar">
                        <table class="w-full text-left text-sm relative">
                             <thead class="bg-white text-gray-500 uppercase tracking-wider font-bold text-xs sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Status</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Subject</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">From</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur">Date</th>
                                    <th class="px-6 py-3 bg-gray-50/95 backdrop-blur text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="past-queries-body" class="divide-y divide-gray-100">
                                 <tr><td colspan="5" class="px-6 py-8 text-center text-gray-500">Loading past inquiries...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div id="query-modal-container" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center backdrop-blur-sm"></div>
            </div>
        `;
        lucide.createIcons();
    },

    async fetchQueries() {
        try {
            const { data, error } = await window.supabaseAdmin
                .from('customer_queries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.queries = data || [];
            this.renderQueries();

            // Update Sidebar Badge (Pending only)
            const badge = document.getElementById('inquiries-count-badge');
            if (badge) {
                const pendingCount = this.queries.filter(q => q.status === 'pending').length;
                badge.innerText = pendingCount;
                if (pendingCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

        } catch (err) {
            console.error('Error fetching queries:', err);
            const tbody = document.getElementById('queries-table-body');
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Failed to load inquiries. <br><span class="text-xs text-gray-400">${err.message}</span></td></tr>`;
        }
    },

    renderQueries() {
        const activeTbody = document.getElementById('active-queries-body');
        const pastTbody = document.getElementById('past-queries-body');

        if (!activeTbody || !pastTbody) {
            this.renderStructure();
            return this.renderQueries();
        }

        const active = this.queries.filter(q => q.status === 'pending');
        const past = this.queries.filter(q => q.status !== 'pending');

        this.renderRows(active, 'active-queries-body');
        this.renderRows(past, 'past-queries-body');

        // Update Internal Badge
        const activeBadge = document.getElementById('active-inquiries-badge');
        if (activeBadge) {
            activeBadge.innerText = active.length;
            activeBadge.classList.toggle('hidden', active.length === 0);
        }

        lucide.createIcons();
    },

    search(query) {
        if (!query) {
            this.renderQueries();
            return;
        }
        const lower = query.toLowerCase();
        const filtered = this.queries.filter(q =>
            q.subject.toLowerCase().includes(lower) ||
            q.name.toLowerCase().includes(lower) ||
            q.email.toLowerCase().includes(lower)
        );

        const active = filtered.filter(q => q.status === 'pending');
        const past = filtered.filter(q => q.status !== 'pending');

        this.renderRows(active, 'active-queries-body');
        this.renderRows(past, 'past-queries-body');
    },

    // Removed filterStatus as it's now split by layout

    renderRows(list, containerId) {
        const tbody = document.getElementById(containerId);
        if (!tbody) return;

        if (!list.length) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No inquiries found.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(q => `
            <tr class="hover:bg-gray-50 transition-colors cursor-pointer group" onclick="QueriesModule.openQueryModal('${q.id}')">
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full text-xs font-bold uppercase ${q.status === 'pending' ? 'bg-purple-100 text-purple-700' :
                'bg-green-100 text-green-700'
            }">
                        ${q.status === 'pending' ? 'Pending' : 'Completed'}
                    </span>
                </td>
                <td class="px-6 py-4 font-bold text-gray-800">${q.subject}</td>
                <td class="px-6 py-4">
                    <div class="text-sm font-bold text-gray-700">${q.name}</div>
                    <div class="text-xs text-gray-500">${q.email}</div>
                </td>
                <td class="px-6 py-4 text-gray-500 text-sm">
                    ${new Date(q.created_at).toLocaleDateString()}
                    <div class="text-xs text-gray-400">${new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td class="px-6 py-4 text-right">
                    <button class="text-gray-400 group-hover:text-purple-600 p-2 rounded-full transition-colors">
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    openQueryModal(id) {
        const query = this.queries.find(q => q.id === id);
        if (!query) return;

        const container = document.getElementById('query-modal-container');
        container.innerHTML = `
            <div class="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl animate-fade-in mx-4 flex flex-col">
                <div class="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
                    <h3 class="font-bold text-lg text-gray-800">Inquiry Response</h3>
                    <button onclick="document.getElementById('query-modal-container').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <div class="p-6">
                    <!-- Original Message Context -->
                    <div class="bg-blue-50/50 p-4 rounded-lg border border-blue-100 mb-6">
                        <div class="flex justify-between items-start mb-2">
                             <h4 class="font-bold text-gray-800 text-sm">${query.subject}</h4>
                             <span class="text-xs text-gray-400">${new Date(query.created_at).toLocaleString()}</span>
                        </div>
                        <p class="text-gray-600 text-sm italic border-l-2 border-blue-200 pl-3 mb-2">
                            "${query.message}"
                        </p>
                        <div class="flex items-center gap-4 text-xs text-gray-500 font-medium">
                            <span class="flex items-center gap-1"><i data-lucide="user" class="w-3 h-3"></i> ${query.name} &lt;${query.email}&gt;</span>
                            ${query.phone ? `<span class="flex items-center gap-1 border-l pl-3 border-gray-300"><i data-lucide="phone" class="w-3 h-3"></i> ${query.phone}</span>` : ''}
                        </div>
                    </div>

                    <!-- Reply Form -->
                    <div id="reply-section">
                        <label class="block text-sm font-bold text-gray-700 mb-2">Your Reply</label>
                        <textarea id="reply-message" rows="5" 
                            class="w-full border border-gray-300 rounded-lg p-3 text-sm focus:border-spice-red outline-none shadow-sm resize-none"
                            placeholder="Type your response here..."></textarea>
                        
                        <div class="flex justify-between items-center mt-4">
                            <div class="text-xs text-gray-400">
                                Sending to <span class="font-bold text-gray-600">${query.email}</span>
                            </div>
                            <div class="flex gap-2">
                                ${query.status === 'pending' ? `
                                    <button onclick="QueriesModule.markAsReplied('${query.id}')"
                                        class="px-4 py-2 border border-gray-300 text-gray-600 font-bold hover:bg-gray-50 rounded text-xs flex items-center gap-1">
                                        <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Mark Completed
                                    </button>
                                ` : ''}
                                <button onclick="QueriesModule.handleSendReply('${query.id}', '${query.email}', '${query.subject.replace(/'/g, "\\'")}', '${query.name.replace(/'/g, "\\'")}')" 
                                    class="flex items-center gap-2 px-6 py-2 bg-spice-red text-white font-bold rounded hover:bg-red-700 transition-colors shadow-md text-sm">
                                    <i data-lucide="send" class="w-4 h-4"></i> Send Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
        lucide.createIcons();
    },

    async handleSendReply(id, toEmail, subject, name) {
        const message = document.getElementById('reply-message').value;
        if (!message || message.trim().length < 5) {
            alert('Please enter a valid reply message.');
            return;
        }

        const btn = document.querySelector('#reply-section button.bg-spice-red');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sending...`;
        lucide.createIcons();

        try {
            // 1. Invoke Supabase Edge Function to send email
            const { data, error } = await window.supabaseAdmin.functions.invoke('send-reply', {
                body: {
                    to: toEmail,
                    subject: `Re: ${subject}`,
                    message: message,
                    customerName: name
                }
            });

            if (error) throw error;

            showToast('Email sent successfully!');

            // 2. Mark as Replied in DB
            await this.markAsReplied(id);

        } catch (err) {
            console.error('Failed to send email:', err);

            // Check for Resend Sandbox Limitation
            if (err.message && err.message.toLowerCase().includes('validation_error')) {
                alert('⚠️ Resend Sandbox Error:\n\nYou can only send emails to yourself (sripickleshop@gmail.com) until you verify a domain on Resend.\n\nPlease change the customer email to your own email for testing.');
                return;
            }

            // Fallback: If function doesn't exist yet, ask user what to do?
            // For now, alert the error.
            if (err.message && err.message.includes('Functions')) {
                alert('Error: The "send-reply" Edge Function is not deployed. Please check the setup instructions.');
            } else {
                alert(`Failed to send email: ${err.message}`);
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
                lucide.createIcons();
            }
        }
    },

    async markAsReplied(id) {
        try {
            const { error } = await window.supabaseAdmin
                .from('customer_queries')
                .update({ status: 'replied', responded_at: new Date() })
                .eq('id', id);

            if (error) throw error;

            showToast('Inquiry marked as completed!');
            document.getElementById('query-modal-container').classList.add('hidden');

            // Update Local
            const idx = this.queries.findIndex(q => q.id === id);
            if (idx !== -1) {
                this.queries[idx].status = 'replied';
                this.renderQueries();

                // Update Sidebar Badge
                this.updateSidebarBadge();
            }

        } catch (err) {
            console.error('Error marking as replied:', err);
            alert('Failed to update status.');
        }
    },

    updateSidebarBadge() {
        const badge = document.getElementById('inquiries-count-badge');
        if (badge) {
            const pendingCount = this.queries.filter(q => q.status === 'pending').length;
            badge.innerText = pendingCount;
            badge.classList.toggle('hidden', pendingCount === 0);
        }
    },

    exportCSV() {
        if (!this.queries || !this.queries.length) {
            alert("No inquiries to export.");
            return;
        }

        const headers = ["ID", "Name", "Email", "Phone", "Subject", "Status", "Date"];
        const rows = this.queries.map(q => [
            q.id,
            `"${q.name}"`,
            q.email,
            q.phone || "N/A",
            `"${q.subject}"`,
            q.status,
            new Date(q.created_at).toLocaleDateString()
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sri_pickles_inquiries_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.QueriesModule = QueriesModule;
