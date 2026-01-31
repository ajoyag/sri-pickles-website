const SUPABASE_URL = 'https://krdhwyhbagecgliabhxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyZGh3eWhiYWdlY2dsaWFiaHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NjQ3MzcsImV4cCI6MjA4NTM0MDczN30.f9a_Gz9Wt8_nnt0Dslww4JsuSVOOdgAS_CO3Zo8LTzA';

let lastAdminActivity = Date.now();

// Initialize Supabase Client
function initAdminSupabase() {
    if (typeof supabase !== 'undefined') {
        window.supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        checkAdminAuth();
        setupAdminInactivityTracker();
    }
}

// Security: Inactivity Tracker (10 mins)
function setupAdminInactivityTracker() {
    const resetTimer = () => lastAdminActivity = Date.now();
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(e => document.addEventListener(e, resetTimer, { passive: true }));

    setInterval(async () => {
        if (Date.now() - lastAdminActivity > 30 * 60 * 1000) {
            const { data: { session } } = await window.supabaseAdmin.auth.getSession();
            if (session) {
                await window.supabaseAdmin.auth.signOut();
                window.location.href = 'login.html?session=expired';
            }
        }
    }, 60000);
}

// Check Admin Authentication
async function checkAdminAuth() {
    // Authenticate with Supabase

    const { data: { session } } = await window.supabaseAdmin.auth.getSession();

    if (!session) {
        if (!window.location.href.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return;
    }

    try {
        const { data: profile, error } = await window.supabaseAdmin
            .from('admin_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile || !profile.is_active) {
            throw new Error('Unauthorized access blocked.');
        }

        // --- UI Setup ---
        const loginContainer = document.getElementById('login-container');
        const appContainer = document.getElementById('app-container');
        const adminName = document.getElementById('admin-name');

        if (loginContainer) loginContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        if (adminName) adminName.textContent = profile.full_name || 'Administrator';

        // Trigger Data Load
        if (window.loadDashboardData) window.loadDashboardData();

    } catch (err) {
        await window.supabaseAdmin.auth.signOut();
        window.location.href = 'login.html?error=blocked';
    }
}

document.addEventListener('DOMContentLoaded', initAdminSupabase);
