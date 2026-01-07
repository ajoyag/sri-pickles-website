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

// Check authentication on page load
async function checkAuth() {
    const { session } = await window.authManager.getSession();
    if (!session) {
        window.location.href = 'shop.html'; // Redirect to shop if not logged in
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
    window.location.href = 'shop.html';
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
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        document.getElementById('profile-loading').innerHTML = '<p class="text-red-600">Error loading profile. Please refresh the page.</p>';
    }
}

// Update profile
async function updateProfile(event) {
    event.preventDefault();
    const name = document.getElementById('profile-name').value;
    const phone = document.getElementById('profile-phone').value;
    const errorDiv = document.getElementById('profile-error');

    try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await window.supabaseClient
            .from('profiles')
            .update({ name, phone })
            .eq('id', user.id);

        if (error) throw error;

        errorDiv.classList.add('hidden');
        showToast('Profile updated successfully!');
        loadProfile(); // Reload to show updated data
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    }
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
