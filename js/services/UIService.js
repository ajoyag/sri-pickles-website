
window.UIService = {
    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return; // Guard clause

        const toast = document.createElement('div');
        toast.className = "bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-toast-slide border-l-4 border-gold";
        toast.innerHTML = `
            <i data-lucide="check-circle" class="w-5 h-5 text-green-400"></i>
            <span class="text-sm font-semibold">${message}</span>
        `;
        container.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    renderStars(rating) {
        let stars = '';
        const fullStar = `<svg class="w-3 h-3 text-gold fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        const halfStar = `<svg class="w-3 h-3 text-gold fill-current opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        const emptyStar = `<svg class="w-3 h-3 text-gray-300 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += fullStar;
            } else if (i - 0.5 === rating) {
                stars += halfStar;
            } else {
                stars += emptyStar;
            }
        }
        return `<div class="flex items-center justify-center gap-0.5 mt-1 mb-2">${stars}</div>`;
    },

    initIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('active');
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        return observer; // return if needed
    }
};
