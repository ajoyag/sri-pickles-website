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

// Profile dropdown logic handled by common-auth-ui.js

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
// common-auth-ui.js handles auth state
