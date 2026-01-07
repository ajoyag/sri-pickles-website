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
            backgroundImage: {
                'mandala-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            },
            animation: {
                'spin-slow': 'spin 12s linear infinite',
                'fade-up': 'fadeUp 0.8s ease-out forwards',
            },
            keyframes: {
                fadeUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                }
            }
        }
    }
}

lucide.createIcons();

// Intersection Observer for Scroll Animations (Reused)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Profile Dropdown Functions
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('hidden');
}

function closeProfileDropdown() {
    document.getElementById('profile-dropdown').classList.add('hidden');
}

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

// Update profile dropdown based on auth state
window.updateProfileDropdown = async function (isLoggedIn, userName) {
    const profileButton = document.getElementById('profile-button');
    const profileIconButton = document.getElementById('profile-icon-button');
    const dropdownNotLoggedIn = document.getElementById('dropdown-not-logged-in');
    const dropdownLoggedIn = document.getElementById('dropdown-logged-in');
    const profileNameDisplay = document.getElementById('profile-name-display');

    if (isLoggedIn) {
        profileButton.classList.remove('hidden');
        profileIconButton.classList.add('hidden');
        dropdownNotLoggedIn.classList.add('hidden');
        dropdownLoggedIn.classList.remove('hidden');
        if (profileNameDisplay) {
            profileNameDisplay.textContent = userName || 'Account';
        }
    } else {
        profileButton.classList.add('hidden');
        profileIconButton.classList.remove('hidden');
        dropdownNotLoggedIn.classList.remove('hidden');
        dropdownLoggedIn.classList.add('hidden');
    }
};

// Handle logout
async function handleLogout() {
    await window.logoutUser();
    updateProfileDropdown(false);
    document.getElementById('profile-dropdown').classList.add('hidden');
}

// Initialize dropdown state
window.onSupabaseReady = (function (original) {
    return function () {
        if (original) original();
        setTimeout(async () => {
            const { session } = await window.authManager.getSession();
            if (session && session.user) {
                const { profile } = await window.authManager.getUserProfile();
                const name = profile?.name || session.user.email || 'User';
                updateProfileDropdown(true, name);
            } else {
                updateProfileDropdown(false);
            }
        }, 700);
    };
})(window.onSupabaseReady);
