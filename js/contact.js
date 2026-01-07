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

async function handleLogout() {
    await window.logoutUser();
    updateProfileDropdown(false);
}

// Contact Form Submission
async function submitContactForm(event) {
    event.preventDefault();
    const errorDiv = document.getElementById('contact-error');
    const successDiv = document.getElementById('contact-success');

    errorDiv.classList.add('hidden');
    successDiv.classList.add('hidden');

    const name = document.getElementById('contact-name').value;
    const email = document.getElementById('contact-email').value;
    const phone = document.getElementById('contact-phone').value;
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;

    // Create mailto link
    const subjectLine = `Sri Pickles Contact: ${subject}`;
    const body = `Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject}

Message:
${message}`;

    const mailtoLink = `mailto:namaste@acharheritage.com?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;

    // Show success message
    successDiv.textContent = 'Opening your email client...';
    successDiv.classList.remove('hidden');

    // Reset form after a delay
    setTimeout(() => {
        document.getElementById('contact-form').reset();
        successDiv.classList.add('hidden');
    }, 3000);
}

// Initialize dropdown
window.onSupabaseReady = function () {
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
