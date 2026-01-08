/* =========================================================
   Auth UI
   Responsibility:
   - Login / Signup modal open & close
   - Login / Signup form handling
   - Logout
   - Profile dropdown UI updates
   - React to auth state changes
   ========================================================= */

/* ---------- LOGIN MODAL ---------- */
window.openLoginModal = function () {
    const modal = document.getElementById('login-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
};

window.closeLoginModal = function () {
    const modal = document.getElementById('login-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    document.body.style.overflow = '';

    const form = document.getElementById('login-form');
    const error = document.getElementById('login-error');
    if (form) form.reset();
    if (error) error.classList.add('hidden');
};

/* ---------- SIGNUP MODAL ---------- */
window.openSignupModal = function () {
    const modal = document.getElementById('signup-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (window.lucide) lucide.createIcons();
};

window.closeSignupModal = function () {
    const modal = document.getElementById('signup-modal');
    if (!modal) return;

    modal.classList.add('hidden');
    document.body.style.overflow = '';

    const form = document.getElementById('signup-form');
    const error = document.getElementById('signup-error');
    if (form) form.reset();
    if (error) error.classList.add('hidden');
};

/* ---------- LOGIN ---------- */
window.handleLogin = async function (event) {
    event.preventDefault();

    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    const errorDiv = document.getElementById('login-error');

    if (!email || !password) {
        showError(errorDiv, 'Please enter email and password');
        return;
    }

    const result = await window.loginUser(email, password);

    if (result?.success) {
        closeLoginModal();
        UIService.showToast('Logged in successfully!');
        updateProfileAfterAuth();
    } else {
        showError(errorDiv, result?.message || 'Login failed');
    }
};

/* ---------- SIGNUP ---------- */
window.handleSignup = async function (event) {
    event.preventDefault();

    const name = document.getElementById('signup-name')?.value;
    const phone = document.getElementById('signup-phone')?.value;
    const email = document.getElementById('signup-email')?.value;
    const password = document.getElementById('signup-password')?.value;
    const errorDiv = document.getElementById('signup-error');

    if (!name || !email || !password) {
        showError(errorDiv, 'Please fill all required fields');
        return;
    }

    const result = await window.signupUser(email, password, name, phone);

    if (result?.success) {
        closeSignupModal();
        UIService.showToast(result.message || 'Signup successful!');
        setTimeout(updateProfileAfterAuth, 500);
    } else {
        showError(errorDiv, result?.message || 'Signup failed');
    }
};

/* ---------- LOGOUT ---------- */
window.handleLogout = async function () {
    const result = await window.logoutUser();
    if (result?.success) {
        UIService.showToast('Logged out successfully!');
        updateProfileDropdown(false);
    }
};

/* ---------- PROFILE DROPDOWN ---------- */
window.toggleProfileDropdown = function () {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

window.closeProfileDropdown = function () {
    document.getElementById('profile-dropdown')?.classList.add('hidden');
};

/* ---------- PROFILE UI UPDATE ---------- */
window.updateProfileDropdown = function (isLoggedIn, userName) {
    const profileButton = document.getElementById('profile-button');
    const profileIconButton = document.getElementById('profile-icon-button');
    const dropdownNotLoggedIn = document.getElementById('dropdown-not-logged-in');
    const dropdownLoggedIn = document.getElementById('dropdown-logged-in');
    const profileNameDisplay = document.getElementById('profile-name-display');

    if (isLoggedIn) {
        profileButton?.classList.remove('hidden');
        profileIconButton?.classList.add('hidden');
        dropdownNotLoggedIn?.classList.add('hidden');
        dropdownLoggedIn?.classList.remove('hidden');
        if (profileNameDisplay) {
            profileNameDisplay.textContent = userName || 'Account';
        }
    } else {
        profileButton?.classList.add('hidden');
        profileIconButton?.classList.remove('hidden');
        dropdownNotLoggedIn?.classList.remove('hidden');
        dropdownLoggedIn?.classList.add('hidden');
    }
};

/* ---------- AUTH STATE SYNC ---------- */
async function updateProfileAfterAuth() {
    if (!window.authManager) return;

    const { session } = await window.authManager.getSession();

    if (session?.user) {
        const { profile } = await window.authManager.getUserProfile();
        const name =
            profile?.name ||
            session.user.email ||
            'User';

        updateProfileDropdown(true, name);
    } else {
        updateProfileDropdown(false);
    }
}

/* ---------- GLOBAL CLICK HANDLER ---------- */
document.addEventListener('click', function (event) {
    const dropdown = document.getElementById('profile-dropdown');
    const button = document.getElementById('profile-button');
    const iconButton = document.getElementById('profile-icon-button');

    if (
        dropdown &&
        !dropdown.contains(event.target) &&
        !button?.contains(event.target) &&
        !iconButton?.contains(event.target)
    ) {
        dropdown.classList.add('hidden');
    }
});

/* ---------- HELPERS ---------- */
function showError(container, message) {
    if (!container) return;
    container.textContent = message;
    container.classList.remove('hidden');
}

/* ---------- SUPABASE READY HOOK ---------- */
window.onSupabaseReady = (function (original) {
    return function () {
        if (original) original();
        setTimeout(updateProfileAfterAuth, 500);
    };
})(window.onSupabaseReady);
