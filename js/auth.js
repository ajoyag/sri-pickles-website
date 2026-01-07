// Authentication functions for customer login/signup
// Uses Supabase Auth

class AuthManager {
    constructor() {
        this.supabase = window.supabaseClient;
        this.checkSupabaseReady();
    }

    async checkSupabaseReady() {
        // Wait for Supabase to be ready
        let attempts = 0;
        while (!this.supabase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.supabase = window.supabaseClient;
            attempts++;
        }
    }

    // Sign up new user
    async signUp(email, password, name, phone) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized. Please refresh the page.');
        }

        try {
            // Create user account
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        phone: phone
                    }
                }
            });

            if (authError) throw authError;

            // Update profile with name and phone
            if (authData.user) {
                const { error: profileError } = await this.supabase
                    .from('profiles')
                    .update({
                        name: name,
                        phone: phone
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Error updating profile:', profileError);
                }
            }

            return { user: authData.user, error: null };
        } catch (error) {
            console.error('Sign up error:', error);
            return { user: null, error: error.message };
        }
    }

    // Sign in existing user
    async signIn(email, password) {
        if (!this.supabase) {
            throw new Error('Supabase not initialized. Please refresh the page.');
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            return { user: data.user, error: null };
        } catch (error) {
            console.error('Sign in error:', error);
            return { user: null, error: error.message };
        }
    }

    // Sign out
    async signOut() {
        if (!this.supabase) {
            throw new Error('Supabase not initialized. Please refresh the page.');
        }

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            window.currentUser = null;
            return { error: null };
        } catch (error) {
            console.error('Sign out error:', error);
            return { error: error.message };
        }
    }

    // Get current user session
    async getSession() {
        if (!this.supabase) {
            return { session: null, user: null };
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;
            return { session, user: session?.user || null };
        } catch (error) {
            console.error('Get session error:', error);
            return { session: null, user: null };
        }
    }

    // Get user profile
    async getUserProfile() {
        if (!this.supabase) {
            return { profile: null, error: 'Supabase not initialized' };
        }

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) {
                return { profile: null, error: 'Not authenticated' };
            }

            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            return { profile, error: null };
        } catch (error) {
            console.error('Get profile error:', error);
            return { profile: null, error: error.message };
        }
    }
}

// Initialize auth manager
window.authManager = new AuthManager();

// Helper functions for use in HTML
window.loginUser = async function(email, password) {
    const result = await window.authManager.signIn(email, password);
    if (result.error) {
        return { success: false, message: result.error };
    }
    return { success: true, message: 'Logged in successfully!' };
};

window.signupUser = async function(email, password, name, phone) {
    const result = await window.authManager.signUp(email, password, name, phone);
    if (result.error) {
        return { success: false, message: result.error };
    }
    return { success: true, message: 'Account created successfully! Please check your email to verify your account.' };
};

window.logoutUser = async function() {
    const result = await window.authManager.signOut();
    if (result.error) {
        return { success: false, message: result.error };
    }
    window.location.href = 'shop.html'; // Redirect to shop
    return { success: true, message: 'Logged out successfully!' };
};