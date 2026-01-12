
// Common Auth UI Manager
// Enables Login/Signup/Profile functionality across all pages without redirection.

(function () {
    // Modal HTML Templates
    const LOGIN_MODAL_HTML = `
    <div id="login-modal" class="fixed inset-0 z-[60] hidden flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative animate-in fade-in zoom-in">
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 border-b pb-2">
                <h3 class="font-serif text-2xl font-bold text-spice-red">Login</h3>
                <button onclick="closeLoginModal()" class="text-gray-400 hover:text-gray-700">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form id="login-form" onsubmit="handleLogin(event)" class="space-y-4 pt-2">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" id="login-email" required class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-spice-red">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <input type="password" id="login-password" required class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-spice-red">
                </div>
                <div id="login-error" class="text-red-600 text-sm hidden"></div>
                <button type="submit" class="w-full bg-spice-red text-white py-3 rounded-md font-bold hover:bg-red-700 transition-colors">
                    Login
                </button>
                <div class="relative flex py-2 items-center">
                    <div class="flex-grow border-t border-gray-300"></div>
                    <span class="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Or</span>
                    <div class="flex-grow border-t border-gray-300"></div>
                </div>
                <button type="button" onclick="window.loginWithGoogle()" class="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-md font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <img src="https://www.google.com/favicon.ico" alt="Google" class="w-5 h-5">
                    Sign in with Google
                </button>
            </form>
            <p class="mt-4 text-center text-sm text-gray-600">
                Don't have an account? <button onclick="closeLoginModal(); openSignupModal();" class="text-spice-red font-semibold hover:underline">Sign up</button>
            </p>
        </div>
    </div>`;

    const SIGNUP_MODAL_HTML = `
    <div id="signup-modal" class="fixed inset-0 z-[60] hidden flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div class="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 relative animate-in fade-in zoom-in">
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 border-b pb-2">
                <h3 class="font-serif text-2xl font-bold text-spice-red">Create Account</h3>
                <button onclick="closeSignupModal()" class="text-gray-400 hover:text-gray-700">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form id="signup-form" onsubmit="handleSignup(event)" class="space-y-4 pt-2">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                    <input type="text" id="signup-name" required class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-spice-red">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                    <input type="tel" id="signup-phone" required class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-spice-red">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input type="email" id="signup-email" required class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-spice-red">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                    <input type="password" id="signup-password" required minlength="6" class="w-full border border-gray-300 rounded p-2 focus:outline-none focus:border-spice-red">
                    <p class="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>
                <div id="signup-error" class="text-red-600 text-sm hidden"></div>
                <button type="submit" class="w-full bg-spice-red text-white py-3 rounded-md font-bold hover:bg-red-700 transition-colors">
                    Create Account
                </button>
                <div class="relative flex py-2 items-center">
                    <div class="flex-grow border-t border-gray-300"></div>
                    <span class="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase">Or</span>
                    <div class="flex-grow border-t border-gray-300"></div>
                </div>
                <button type="button" onclick="window.loginWithGoogle()" class="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-md font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                    <img src="https://www.google.com/favicon.ico" alt="Google" class="w-5 h-5">
                    Sign up with Google
                </button>
            </form>
            <p class="mt-4 text-center text-sm text-gray-600">
                Already have an account? <button onclick="closeSignupModal(); openLoginModal();" class="text-spice-red font-semibold hover:underline">Login</button>
            </p>
        </div>
    </div>`;

    // Inject styles for Lucide icons if not already present (sometimes Lucide doesn't auto-style dynamically injected icons)
    function ensureModalsExist() {
        if (!document.getElementById('login-modal')) {
            document.body.insertAdjacentHTML('beforeend', LOGIN_MODAL_HTML);
        }
        if (!document.getElementById('signup-modal')) {
            document.body.insertAdjacentHTML('beforeend', SIGNUP_MODAL_HTML);
        }

        // Re-initialize icons for the new content if Lucide is available
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // Modal Control Functions
    window.openLoginModal = function () {
        ensureModalsExist();
        const modal = document.getElementById('login-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.closeLoginModal = function () {
        const modal = document.getElementById('login-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            const form = document.getElementById('login-form');
            if (form) form.reset();
            const error = document.getElementById('login-error');
            if (error) error.classList.add('hidden');
        }
    };

    window.openSignupModal = function () {
        ensureModalsExist();
        const modal = document.getElementById('signup-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.closeSignupModal = function () {
        const modal = document.getElementById('signup-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            const form = document.getElementById('signup-form');
            if (form) form.reset();
            const error = document.getElementById('signup-error');
            if (error) error.classList.add('hidden');
        }
    };

    // Shared Auth Handlers
    window.handleLogin = async function (event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        if (errorDiv) errorDiv.classList.add('hidden');

        // Use global loginUser from auth.js
        if (window.loginUser) {
            const result = await window.loginUser(email, password);
            if (result.success) {
                closeLoginModal();
                showToast('Logged in successfully!');
                setTimeout(() => window.location.reload(), 500);
            } else {
                if (errorDiv) {
                    errorDiv.textContent = result.message;
                    errorDiv.classList.remove('hidden');
                } else {
                    alert(result.message);
                }
            }
        } else {
            console.error('auth.js not loaded');
        }
    };

    window.handleSignup = async function (event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value;
        const phone = document.getElementById('signup-phone').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const errorDiv = document.getElementById('signup-error');

        if (errorDiv) errorDiv.classList.add('hidden');

        if (window.signupUser) {
            const result = await window.signupUser(email, password, name, phone);
            if (result.success) {
                closeSignupModal();
                showToast(result.message);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                if (errorDiv) {
                    errorDiv.textContent = result.message;
                    errorDiv.classList.remove('hidden');
                } else {
                    alert(result.message);
                }
            }
        } else {
            console.error('auth.js not loaded');
        }
    };

    // Profile Dropdown Logic (Unified)
    window.toggleProfileDropdown = function () {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) dropdown.classList.toggle('hidden');
    };

    window.closeProfileDropdown = function () {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    };

    // Close dropdown when clicking outside
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

    // Unified Profile Update Logic
    window.updateProfileDropdown = function (isLoggedIn, userName) {
        const profileButton = document.getElementById('profile-button');
        const profileIconButton = document.getElementById('profile-icon-button');
        const dropdownNotLoggedIn = document.getElementById('dropdown-not-logged-in');
        const dropdownLoggedIn = document.getElementById('dropdown-logged-in');
        const profileNameDisplay = document.getElementById('profile-name-display');

        if (isLoggedIn) {
            if (profileButton) profileButton.classList.remove('hidden');
            if (profileIconButton) profileIconButton.classList.add('hidden');
            if (dropdownNotLoggedIn) dropdownNotLoggedIn.classList.add('hidden');
            if (dropdownLoggedIn) dropdownLoggedIn.classList.remove('hidden');
            if (profileNameDisplay) profileNameDisplay.textContent = userName || 'Account';
        } else {
            if (profileButton) profileButton.classList.add('hidden');
            if (profileIconButton) profileIconButton.classList.remove('hidden');
            if (dropdownNotLoggedIn) dropdownNotLoggedIn.classList.remove('hidden');
            if (dropdownLoggedIn) dropdownLoggedIn.classList.add('hidden');
        }
    };

    // Handle Logout
    window.handleLogout = async function () {
        if (window.logoutUser) {
            await window.logoutUser();
            updateProfileDropdown(false);
            closeProfileDropdown();
            showToast('Logged out');
            // Wait a bit and redirect to home if on a protected page, or just reload
            if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('order-history.html')) {
                window.location.href = 'index.html';
            } else {
                window.location.reload();
            }
        }
    };

    // Helper: Show Toast (Simple fallback if UIService not available)
    function showToast(message, type = 'success') {
        if (window.UIService && window.UIService.showToast) {
            window.UIService.showToast(message, type);
            return;
        }

        // Fallback Toast
        const container = document.getElementById('toast-container') || createToastContainer();
        const toast = document.createElement('div');
        toast.className = `bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl mb-3 transition-opacity duration-300 opacity-0 transform translate-y-2 flex items-center gap-2`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-2');
        });

        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function createToastContainer() {
        const div = document.createElement('div');
        div.id = 'toast-container';
        div.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[70] flex flex-col gap-2 items-center';
        document.body.appendChild(div);
        return div;
    }

    // Initialize Auth Listeners (Wait for Supabase)
    const initInterval = setInterval(async () => {
        if (window.authManager) {
            clearInterval(initInterval);
            const { session } = await window.authManager.getSession();
            if (session && session.user) {
                const { profile } = await window.authManager.getUserProfile();
                const name = profile?.name || session.user.email || 'User';
                updateProfileDropdown(true, name);
            } else {
                updateProfileDropdown(false);
            }
        }
    }, 500);

    // Also run ensureModalsExist on DOMContentLoaded to preload (optional, but good)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureModalsExist);
    } else {
        // If already loaded, we don't necessarily force inject yet, 
        // we wait for user action or just inject now if we want to be safe.
        // Let's inject on demand to keep DOM clean, OR inject now. 
        // Injecting now ensures no delay on first click.
        ensureModalsExist();
    }

})();
