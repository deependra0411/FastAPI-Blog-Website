// Authentication management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeAuth();
    }

    // Initialize authentication state
    initializeAuth() {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        const userData = localStorage.getItem(CONFIG.USER_KEY);
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.updateUIForAuthenticatedUser();
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        } else {
            this.updateUIForUnauthenticatedUser();
        }
    }

    // Login user
    async login(email, password) {
        try {
            const response = await api.login(email, password);
            
            // Store token
            localStorage.setItem(CONFIG.TOKEN_KEY, response.access_token);
            
            // Get user data
            const userData = await api.getCurrentUser();
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(userData));
            
            this.currentUser = userData;
            this.updateUIForAuthenticatedUser();
            
            showToast('Success', 'Login successful!', 'success');
            showPage('dashboard');
            
            return true;
        } catch (error) {
            showToast('Error', error.message || 'Login failed', 'error');
            return false;
        }
    }

    // Register user
    async register(name, email, password) {
        try {
            await api.register(name, email, password);
            showToast('Success', 'Registration successful! Please login.', 'success');
            showPage('login');
            return true;
        } catch (error) {
            showToast('Error', error.message || 'Registration failed', 'error');
            return false;
        }
    }

    // Logout user
    logout() {
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        this.currentUser = null;
        this.updateUIForUnauthenticatedUser();
        showToast('Success', 'Logout successful!', 'success');
        showPage('home');
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Check if user is admin
    isAdmin() {
        return this.isAuthenticated() && this.currentUser.is_admin;
    }

    // Update UI for authenticated user
    updateUIForAuthenticatedUser() {
        const authNav = document.getElementById('authNav');
        const dashboardNav = document.getElementById('dashboardNav');
        const logoutNav = document.getElementById('logoutNav');
        const userWelcome = document.getElementById('userWelcome');
        
        if (authNav) authNav.classList.add('d-none');
        if (dashboardNav) dashboardNav.classList.remove('d-none');
        if (logoutNav) logoutNav.classList.remove('d-none');
        
        if (userWelcome && this.currentUser) {
            userWelcome.textContent = `Welcome back, ${this.currentUser.name}!`;
        }
    }

    // Update UI for unauthenticated user
    updateUIForUnauthenticatedUser() {
        const authNav = document.getElementById('authNav');
        const dashboardNav = document.getElementById('dashboardNav');
        const logoutNav = document.getElementById('logoutNav');
        
        if (authNav) authNav.classList.remove('d-none');
        if (dashboardNav) dashboardNav.classList.add('d-none');
        if (logoutNav) logoutNav.classList.add('d-none');
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Form event handlers
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast('Error', 'Please fill in all fields', 'error');
                return;
            }
            
            const success = await authManager.login(email, password);
            if (success) {
                loginForm.reset();
            }
        });
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            
            if (!name || !email || !password) {
                showToast('Error', 'Please fill in all fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Error', 'Password must be at least 6 characters long', 'error');
                return;
            }
            
            const success = await authManager.register(name, email, password);
            if (success) {
                registerForm.reset();
            }
        });
    }
});

// Global logout function
function logout() {
    authManager.logout();
}
