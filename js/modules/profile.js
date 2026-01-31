// Team & Profile Management Module
// Handles list of admins, their roles (Teams), and permissions.

const ProfileModule = {
    currentFilter: 'all', // 'all', 'developer', 'manager', 'staff'

    async init() {
        console.log('Initializing Team Module...');
        this.renderToolbar(); // Add filter dropdown & Add Button
        await this.fetchTeam();
    },

    renderToolbar() {
        const container = document.querySelector('#view-profile .flex.justify-between');
        if (container) {
            // Check if toolbar is already setup
            if (!document.getElementById('profile-toolbar')) {
                const toolbar = document.createElement('div');
                toolbar.id = 'profile-toolbar';
                toolbar.className = 'flex items-center gap-3 mr-auto ml-4';
                toolbar.innerHTML = `
                    <div class="flex items-center gap-2">
                        <label class="text-sm font-bold text-gray-600">Team:</label>
                        <select id="team-filter" onchange="ProfileModule.filterTeam(this.value)" class="border border-gray-300 rounded p-1 text-sm outline-none focus:border-spice-red">
                            <option value="all">All Teams</option>
                            <option value="developer">Developers</option>
                            <option value="manager">Managers</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                    <button onclick="ProfileModule.exportCSV()" 
                             class="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-50 flex items-center gap-1 shadow-sm">
                             <i data-lucide="download" class="w-3.5 h-3.5"></i> Export
                    </button>
                `;

                // Add 'Add Master User' Button
                const addBtn = document.createElement('button');
                addBtn.className = 'bg-spice-red text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm ml-4';
                addBtn.innerHTML = `<i data-lucide="user-plus" class="w-4 h-4"></i> Add Master User`;
                addBtn.onclick = () => this.openAddAdminModal();

                toolbar.appendChild(addBtn);

                // Insert after title
                container.firstElementChild.insertAdjacentElement('afterend', toolbar);
            }
        }
    },

    async fetchTeam() {
        try {
            const { data: { user } } = await window.supabaseAdmin.auth.getUser();
            if (!user) return;

            // Fetch current user role to determine edit rights
            const { data: myProfile } = await window.supabaseAdmin
                .from('admin_profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            this.myRole = myProfile ? myProfile.role : 'staff';
            this.canEdit = (this.myRole === 'developer' || this.myRole === 'manager');

            // Fetch All Profiles
            const { data: profiles, error } = await window.supabaseAdmin
                .from('admin_profiles')
                .select('*')
                .order('role', { ascending: true }); // Group slightly by role

            if (error) throw error;

            this.team = profiles || [];
            this.filterTeam(this.currentFilter);

        } catch (err) {
            console.error('Error fetching team:', err);
            document.getElementById('admin-list-body').innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500">Failed to load team data.</td></tr>`;
        }
    },

    filterTeam(role) {
        this.currentFilter = role;
        const filtered = role === 'all' ? this.team : this.team.filter(m => m.role === role);
        this.renderTeam(filtered);
    },

    renderTeam(profiles) {
        const tbody = document.getElementById('admin-list-body');
        if (!profiles || profiles.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400">No team members found in this group.</td></tr>`;
            return;
        }

        // Update Header if needed
        const thead = document.querySelector('#view-profile thead tr');
        if (thead && thead.children.length === 4) {
            // Add Status Column Header if missing
            thead.innerHTML = `
                <th class="px-6 py-3">Employee</th>
                <th class="px-6 py-3">Role (Team)</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3">Key Access</th>
                <th class="px-6 py-3 text-right">Actions</th>
             `;
        }

        tbody.innerHTML = profiles.map(profile => {
            // Determine avatar
            const initials = profile.full_name ? profile.full_name.substring(0, 2).toUpperCase() : (profile.email ? profile.email.substring(0, 2).toUpperCase() : '??');
            const avatarHtml = profile.avatar_url
                ? `<img src="${profile.avatar_url}" class="w-10 h-10 rounded-full object-cover border border-gray-200" alt="${profile.full_name}">`
                : `<div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-inner">${initials}</div>`;

            // Role Badge Color
            const roleColors = {
                'developer': 'bg-purple-100 text-purple-800 border-purple-200',
                'manager': 'bg-blue-100 text-blue-800 border-blue-200',
                'staff': 'bg-gray-100 text-gray-800 border-gray-200'
            };
            const roleClass = roleColors[profile.role] || roleColors['staff'];

            // Access Badges
            let permissions = profile.permissions || {};
            // If permissions is string, parse it
            if (typeof permissions === 'string') try { permissions = JSON.parse(permissions); } catch (e) { }

            const accessList = Object.keys(permissions).filter(k => permissions[k]).map(k =>
                `<span class="text-[10px] uppercase bg-white border border-gray-200 px-1 rounded text-gray-500">${k}</span>`
            ).join(' ');

            const isActive = profile.is_active !== false; // Default true

            return `
                <tr class="hover:bg-gray-50 transition-colors group cursor-pointer" onclick="ProfileModule.openMemberDetails('${profile.id}')">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            ${avatarHtml}
                            <div>
                                <div class="font-bold text-gray-800 text-sm">${profile.full_name || 'Unnamed Staff'}</div>
                                <div class="text-xs text-gray-500">${profile.email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-full text-xs font-bold uppercase border ${roleClass}">
                            ${profile.role || 'Staff'}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                         <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}"></div>
                            <span class="text-xs font-medium text-gray-600">${isActive ? 'Active' : 'Inactive'}</span>
                         </div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="flex flex-wrap gap-1 max-w-[150px]">
                            ${accessList || '<span class="text-xs text-gray-300 italic">None</span>'}
                        </div>
                    </td>
                    <td class="px-6 py-4 text-right" onclick="event.stopPropagation()">
                        ${this.canEdit ? `
                            <button onclick="ProfileModule.toggleActive('${profile.id}', ${!isActive})" 
                                class="text-gray-400 hover:text-${isActive ? 'red' : 'green'}-600 p-2 hover:bg-gray-100 rounded transition-colors" 
                                title="${isActive ? 'Deactivate' : 'Activate'} User">
                                <i data-lucide="${isActive ? 'user-x' : 'user-check'}" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    },

    openAddAdminModal() {
        if (!this.canEdit) {
            alert("You do not have permission to add new users.");
            return;
        }

        // Create Modal HTML
        const modalHtml = `
            <div id="add-admin-modal" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm animate-in fade-in">
                <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
                    <button onclick="document.getElementById('add-admin-modal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                    
                    <h3 class="text-xl font-bold text-gray-800 mb-1">Add Master User</h3>
                    <p class="text-xs text-gray-500 mb-6">Create a new administrator account.</p>
                    
                    <form onsubmit="ProfileModule.handleCreateUser(event)" class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                            <input type="text" name="name" required class="w-full border border-gray-300 rounded p-2 focus:border-spice-red outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                            <input type="email" name="email" required class="w-full border border-gray-300 rounded p-2 focus:border-spice-red outline-none">
                        </div>
                         <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Password</label>
                            <input type="password" name="password" required minlength="6" class="w-full border border-gray-300 rounded p-2 focus:border-spice-red outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">Role</label>
                            <select name="role" class="w-full border border-gray-300 rounded p-2 focus:border-spice-red outline-none">
                                <option value="manager">Manager (Master)</option>
                                <option value="developer">Developer</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                        
                        <div id="create-user-error" class="text-red-500 text-xs hidden"></div>

                        <button type="submit" class="w-full bg-spice-red text-white font-bold py-2 rounded hover:bg-red-700 transition-colors flex justify-center items-center gap-2">
                             Create Account
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        lucide.createIcons();
    },

    async handleCreateUser(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const errorEl = document.getElementById('create-user-error');

        const formData = new FormData(e.target);
        const name = formData.get('name');
        const email = formData.get('email');
        const password = formData.get('password');
        const role = formData.get('role');

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Creating...`;
        errorEl.classList.add('hidden');
        lucide.createIcons();

        try {
            // 1. Create User using a Temporary Client (to avoid logging out current admin)
            // We use the same URL and Key, but disable session persistence
            const tempClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false }
            });

            const { data: authData, error: authError } = await tempClient.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Failed to create user object.");

            const newUserId = authData.user.id;

            // 2. Insert into admin_profiles
            // Now we use the REAL admin client to insert the profile row
            const { error: profileError } = await window.supabaseAdmin
                .from('admin_profiles')
                .insert([{
                    id: newUserId,
                    email: email,
                    full_name: name,
                    role: role,
                    is_active: true,
                    permissions: { all: true } // Default permissions
                }]);

            if (profileError) {
                // If profile fails, we might want to clean up auth user, but generally we can just show error
                // often it fails due to RLS if the logged in user isn't allowed to insert.
                throw new Error("User created, but failed to set Admin Profile: " + profileError.message);
            }

            // Success!
            document.getElementById('add-admin-modal').remove();
            showToast('Master User Created Successfully!');
            this.fetchTeam();

        } catch (err) {
            console.error('Create User Error:', err);
            errorEl.textContent = err.message || "Failed to create user.";
            errorEl.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = "Create Account";
        }
    },

    async toggleActive(id, newState) {
        if (!this.canEdit) {
            alert('Permission Denied.');
            return;
        }

        try {
            const { error } = await window.supabaseAdmin
                .from('admin_profiles')
                .update({ is_active: newState })
                .eq('id', id);

            if (error) throw error;
            showToast(`User ${newState ? 'Activated' : 'Deactivated'}`);
            this.fetchTeam();
        } catch (err) {
            console.error('Update failed:', err);
            alert('Failed to update status.');
        }
    },

    openMemberDetails(id) {
        if (!this.canEdit) return;
        const member = this.team.find(m => m.id === id);
        if (!member) return;

        const newRole = prompt(`Update Role for ${member.full_name || member.email}?\n(developer, manager, staff)`, member.role);
        if (newRole && newRole !== member.role) {
            this.updateRole(id, newRole);
        }
    },

    async updateRole(id, newRole) {
        try {
            const { error } = await window.supabaseAdmin
                .from('admin_profiles')
                .update({ role: newRole.toLowerCase() })
                .eq('id', id);

            if (error) throw error;
            showToast('Role updated!');
            this.fetchTeam();
        } catch (e) {
            alert('Failed to update role.');
        }
    },

    exportCSV() {
        if (!this.team || !this.team.length) {
            alert("No team members to export.");
            return;
        }

        const headers = ["Full Name", "Email", "Role", "Active"];
        const rows = this.team.map(m => [
            `"${m.full_name || 'N/A'}"`,
            m.email,
            m.role,
            m.is_active !== false ? "Yes" : "No"
        ]);

        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sri_pickles_team_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

window.ProfileModule = ProfileModule;
