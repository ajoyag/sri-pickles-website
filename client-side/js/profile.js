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

let currentEditingAddressId = null;
let currentSection = 'profile';

// Profile dropdown logic handled by common-auth-ui.js

// Check authentication on page load
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
    loadProfile();
}

async function handleLogout() {
    await window.logoutUser();
    if (window.updateProfileDropdown) {
        window.updateProfileDropdown(false);
    }
    window.location.href = 'index.html';
}

// Load user profile
async function loadProfile() {
    try {
        const { profile, error } = await window.authManager.getUserProfile();
        if (error) throw error;

        if (profile) {
            document.getElementById('profile-name').value = profile.name || '';
            document.getElementById('profile-phone').value = profile.phone || '';

            // Get email from auth
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (user) {
                document.getElementById('profile-email').value = user.email || '';
                const userName = document.getElementById('user-name');
                if (userName) userName.textContent = profile.name || user.email || 'Account';
            }

            document.getElementById('profile-loading').classList.add('hidden');
            document.getElementById('profile-content').classList.remove('hidden');

            // Update sidebar name
            const sidebarName = document.getElementById('profile-sidebar-name');
            if (sidebarName) {
                sidebarName.textContent = profile.name || user.email?.split('@')[0] || 'Account';
            }

            // Update Avatars
            if (profile.avatar_url) {
                const sidebarAvatar = document.getElementById('profile-sidebar-avatar');
                const headerAvatar = document.getElementById('profile-header-avatar');

                // Sidebar: Image only
                if (sidebarAvatar) {
                    sidebarAvatar.innerHTML = `<img src="${profile.avatar_url}" class="w-full h-full object-cover">`;
                }

                // Header: Image + Overlay
                if (headerAvatar) {
                    headerAvatar.innerHTML = `
                        <img src="${profile.avatar_url}" class="w-full h-full object-cover">
                        <div onclick="triggerAvatarUpload()" 
                             class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-opacity z-10">
                             <i data-lucide="camera" class="w-4 h-4 text-white"></i>
                        </div>
                    `;
                    lucide.createIcons();
                }
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('profile-loading').innerHTML = '<p class="text-red-600">Error loading profile. Please refresh the page.</p>';
    }
}

// Update profile (Name & Phone)
async function updateProfile(event) {
    event.preventDefault();
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const errorDiv = document.getElementById('profile-error');

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Check if an avatar file was selected
        const fileInput = document.getElementById('avatar-upload-input');
        let avatarUrl = null;

        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            errorDiv.textContent = "Uploading image...";
            errorDiv.classList.remove('hidden', 'text-red-600');
            errorDiv.classList.add('text-blue-600');

            // Upload
            const { error: uploadError } = await window.supabaseClient.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);

            avatarUrl = publicUrl;
        }

        // Prepare Update Object
        const updates = {
            name,
            phone,
            updated_at: new Date(),
        };
        if (avatarUrl) updates.avatar_url = avatarUrl;

        const { error } = await window.supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (error) throw error;

        errorDiv.classList.add('hidden');
        showToast('Profile updated successfully!');
        loadProfile(); // Reload
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden', 'text-blue-600');
        errorDiv.classList.add('text-red-600');
    }
}

// Trigger file input click
function triggerAvatarUpload() {
    document.getElementById('avatar-upload-input').click();
}

// Preview Avatar on Select
function handleAvatarSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        // Preview in the header avatar area temporarily
        const headerAvatar = document.getElementById('profile-header-avatar');
        if (headerAvatar) {
            headerAvatar.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover opacity-75">`;
        }
    };
    reader.readAsDataURL(file);
}

// Change password
async function changePassword(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const errorDiv = document.getElementById('password-error');

    try {
        // Verify current password by attempting to sign in
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Update password
        const { error } = await window.supabaseClient.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        errorDiv.classList.add('hidden');
        document.getElementById('password-form').reset();
        showToast('Password changed successfully!');
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to change password';
        errorDiv.classList.remove('hidden');
    }
}

// Load addresses
async function loadAddresses() {
    const loadingDiv = document.getElementById('addresses-loading');
    const listDiv = document.getElementById('addresses-list');

    try {
        const { data: addresses, error } = await window.apiHelpers.getUserAddresses();
        if (error) throw error;

        loadingDiv.classList.add('hidden');

        if (!addresses || addresses.length === 0) {
            listDiv.innerHTML = '<p class="text-gray-500 text-center py-8">No addresses saved. Click "Add Address" to add one.</p>';
            return;
        }

        listDiv.innerHTML = addresses.map(addr => `
                    <div class="border border-gray-200 rounded-lg p-4 ${addr.is_default ? 'border-gold bg-orange-50' : ''}">
                        <div class="flex justify-between items-start">
                            <div class="flex-1">
                                ${addr.is_default ? '<span class="inline-block bg-gold text-white text-xs px-2 py-1 rounded mb-2">Default</span>' : ''}
                                <h4 class="font-bold text-gray-800 mb-1">${addr.name}</h4>
                                <p class="text-sm text-gray-600">${addr.address}</p>
                                <p class="text-sm text-gray-600">${addr.city}, ${addr.state} - ${addr.pincode}</p>
                                <p class="text-sm text-gray-600 mt-1">Phone: ${addr.phone}</p>
                            </div>
                            <div class="flex gap-2 ml-4">
                                <button onclick="editAddress('${addr.id}')" class="text-spice-red hover:text-red-700">
                                    <i data-lucide="edit" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteAddress('${addr.id}')" class="text-red-600 hover:text-red-800">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

        lucide.createIcons();
    } catch (error) {
        console.error('Error loading addresses:', error);
        loadingDiv.innerHTML = '<p class="text-red-600">Error loading addresses. Please refresh the page.</p>';
    }
}

// Show section
function showSection(section) {
    currentSection = section;

    // Update sidebar highlights
    document.querySelectorAll('aside nav a').forEach(el => {
        const href = el.getAttribute('href') || '';
        const isActive = (section === 'profile' && href === '#profile') ||
            (section === 'addresses' && href === '#addresses') ||
            (section === 'orders' && href === '#orders');

        if (isActive) {
            el.classList.add('text-spice-red', 'font-semibold', 'border-spice-red', 'bg-orange-50');
            el.classList.remove('text-gray-700', 'border-transparent');
        } else {
            el.classList.remove('text-spice-red', 'font-semibold', 'border-spice-red', 'bg-orange-50');
            el.classList.add('text-gray-700', 'border-transparent');
        }
    });

    // Show/hide sections
    document.getElementById('profile-section').classList.toggle('hidden', section !== 'profile');
    document.getElementById('addresses-section').classList.toggle('hidden', section !== 'addresses');
    document.getElementById('orders-section').classList.toggle('hidden', section !== 'orders');

    // Load orders when orders section is shown
    if (section === 'orders') {
        loadOrders();
    }

    if (section === 'addresses') {
        loadAddresses();
    }
}

// Address modal functions
function openAddAddressModal() {
    currentEditingAddressId = null;
    document.getElementById('address-modal-title').textContent = 'Add Address';
    document.getElementById('address-form').reset();
    document.getElementById('address-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeAddressModal() {
    document.getElementById('address-modal').classList.add('hidden');
    currentEditingAddressId = null;
}

async function editAddress(addressId) {
    const { data: addresses } = await window.apiHelpers.getUserAddresses();
    const address = addresses.find(a => a.id === addressId);

    if (!address) return;

    currentEditingAddressId = addressId;
    document.getElementById('address-modal-title').textContent = 'Edit Address';
    document.getElementById('address-name').value = address.name;
    document.getElementById('address-phone').value = address.phone;
    document.getElementById('address-street').value = address.address;
    document.getElementById('address-city').value = address.city;
    document.getElementById('address-state').value = address.state;
    document.getElementById('address-pincode').value = address.pincode;
    document.getElementById('address-default').checked = address.is_default;

    document.getElementById('address-modal').classList.remove('hidden');
    lucide.createIcons();
}

async function saveAddress(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('address-error');

    const addressData = {
        name: document.getElementById('address-name').value,
        phone: document.getElementById('address-phone').value,
        address: document.getElementById('address-street').value,
        city: document.getElementById('address-city').value,
        state: document.getElementById('address-state').value,
        pincode: document.getElementById('address-pincode').value,
        is_default: document.getElementById('address-default').checked
    };

    if (currentEditingAddressId) {
        addressData.id = currentEditingAddressId;
    }

    try {
        const { error } = await window.apiHelpers.saveAddress(addressData);
        if (error) throw error;

        closeAddressModal();
        showToast('Address saved successfully!');
        loadAddresses();
    } catch (error) {
        errorDiv.textContent = error.message || 'Failed to save address';
        errorDiv.classList.remove('hidden');
    }
}


// Load orders
async function loadOrders() {
    const loadingDiv = document.getElementById('orders-loading');
    const listDiv = document.getElementById('orders-list');
    const emptyDiv = document.getElementById('orders-empty');

    loadingDiv.classList.remove('hidden');
    listDiv.innerHTML = '';
    emptyDiv.classList.add('hidden');

    try {
        const { data: orders, error } = await window.apiHelpers.getUserOrders();
        if (error) throw error;

        loadingDiv.classList.add('hidden');

        if (!orders || orders.length === 0) {
            emptyDiv.classList.remove('hidden');
            return;
        }

        listDiv.innerHTML = orders.map(order => {
            const created = new Date(order.created_at).toLocaleDateString();
            const statusColor = getStatusColor(order.status);
            const itemCount = order.shop_order_items?.length || 0;
            const firstItem = order.shop_order_items?.[0]?.product_name || 'Item';
            const itemText = itemCount > 1 ? `${firstItem} + ${itemCount - 1} more` : firstItem;

            return `
                <div class="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onclick="openOrderModal('${order.id}')">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <span class="text-xs text-gray-500">Order #${order.id.slice(0, 8)}</span>
                            <div class="font-bold text-gray-800 text-lg">₹${order.total_amount}</div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColor}">
                            ${order.status}
                        </span>
                    </div>
                    <div class="text-sm text-gray-600 mb-2">
                        <i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i> ${created}
                    </div>
                    <div class="text-sm text-gray-800">
                        ${itemText}
                    </div>
                </div>
             `;
        }).join('');

        lucide.createIcons();

    } catch (error) {
        console.error('Error loading orders:', error);
        loadingDiv.innerHTML = '<p class="text-red-600">Error loading orders. Please refresh.</p>';
    }
}

function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'pending_payment': return 'bg-blue-100 text-blue-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'processing': return 'bg-indigo-100 text-indigo-800';
        case 'shipped': return 'bg-purple-100 text-purple-800';
        case 'delivered': return 'bg-emerald-100 text-emerald-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

async function openOrderModal(orderId) {
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-detail-content');
    modal.classList.remove('hidden');
    content.innerHTML = '<div class="text-center py-8"><div class="inline-block loader"></div></div>';

    try {
        const { data: order, error } = await window.apiHelpers.getOrder(orderId);
        if (error) throw error;

        if (!order) {
            content.innerHTML = '<p class="text-red-500">Order not found</p>';
            return;
        }

        const itemsHtml = (order.shop_order_items || []).map(item => `
            <div class="flex justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                    <div class="font-semibold text-gray-800">${item.product_name}</div>
                    <div class="text-xs text-gray-500">${item.variant_label || ''} x ${item.quantity}</div>
                </div>
                <div class="font-medium">₹${item.price * item.quantity}</div>
            </div>
        `).join('');

        const address = typeof order.shipping_address === 'string'
            ? JSON.parse(order.shipping_address)
            : (order.shipping_address || {});

        const addressHtml = `
            <div class="text-sm text-gray-600">
                <div class="font-bold text-gray-800">${address.name || 'N/A'}</div>
                <div>${address.address || ''}</div>
                <div>${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}</div>
                <div>Phone: ${address.phone || ''}</div>
            </div>
        `;

        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex justify-between items-center border-b pb-2">
                    <span class="text-sm text-gray-500">Order #${order.id}</span>
                    <span class="px-3 py-1 rounded-full text-xs font-bold uppercase ${getStatusColor(order.status)}">${order.status}</span>
                </div>
                
                <div>
                    <h4 class="font-bold text-spice-red mb-2">Items</h4>
                    <div class="bg-gray-50 rounded p-3">
                        ${itemsHtml}
                    </div>
                </div>

                <div class="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span>₹${order.total_amount}</span>
                </div>

                <div>
                    <h4 class="font-bold text-spice-red mb-2">Shipping Details</h4>
                    <div class="bg-gray-50 rounded p-3">
                        ${addressHtml}
                    </div>
                </div>
            </div>
        `;

    } catch (e) {
        console.error(e);
        content.innerHTML = '<p class="text-red-500">Failed to load details</p>';
    }
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

async function deleteAddress(addressId) {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
        const { error } = await window.supabaseClient
            .from('addresses')
            .delete()
            .eq('id', addressId);

        if (error) throw error;

        showToast('Address deleted successfully!');
        loadAddresses();
    } catch (error) {
        alert('Error deleting address: ' + error.message);
    }
}

function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize on page load
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
