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
        const profileNav = document.getElementById('profileNav');
        const logoutNav = document.getElementById('logoutNav');
        const userWelcome = document.getElementById('userWelcome');
        
        if (authNav) authNav.classList.add('d-none');
        if (dashboardNav) dashboardNav.classList.remove('d-none');
        if (profileNav) profileNav.classList.remove('d-none');
        if (logoutNav) logoutNav.classList.remove('d-none');
        
        if (userWelcome && this.currentUser) {
            userWelcome.textContent = `Welcome back, ${this.currentUser.name}!`;
        }
    }

    // Update UI for unauthenticated user
    updateUIForUnauthenticatedUser() {
        const authNav = document.getElementById('authNav');
        const dashboardNav = document.getElementById('dashboardNav');
        const profileNav = document.getElementById('profileNav');
        const logoutNav = document.getElementById('logoutNav');
        
        if (authNav) authNav.classList.remove('d-none');
        if (dashboardNav) dashboardNav.classList.add('d-none');
        if (profileNav) profileNav.classList.add('d-none');
        if (logoutNav) logoutNav.classList.add('d-none');
    }

    // Update user profile
    async updateProfile(name, email) {
        try {
            const profileData = {};
            if (name && name !== this.currentUser.name) {
                profileData.name = name;
            }
            if (email && email !== this.currentUser.email) {
                profileData.email = email;
            }

            if (Object.keys(profileData).length === 0) {
                showToast('Info', 'No changes to save', 'info');
                return false;
            }

            const updatedUser = await api.updateUserProfile(profileData);
            
            // Update stored user data
            localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(updatedUser));
            this.currentUser = updatedUser;
            
            // Update UI
            this.updateUIForAuthenticatedUser();
            
            showToast('Success', 'Profile updated successfully!', 'success');
            return true;
        } catch (error) {
            showToast('Error', error.message || 'Failed to update profile', 'error');
            return false;
        }
    }

    // Change user password
    async changePassword(currentPassword, newPassword) {
        try {
            await api.changePassword(currentPassword, newPassword);
            showToast('Success', 'Password changed successfully!', 'success');
            return true;
        } catch (error) {
            showToast('Error', error.message || 'Failed to change password', 'error');
            return false;
        }
    }

    // Load current user data into profile form
    loadProfileData() {
        if (this.currentUser) {
            const nameInput = document.getElementById('profileName');
            const emailInput = document.getElementById('profileEmail');
            
            if (nameInput) nameInput.value = this.currentUser.name;
            if (emailInput) emailInput.value = this.currentUser.email;
        }
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

    // Profile form (name and email only)
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('profileName').value.trim();
            const email = document.getElementById('profileEmail').value.trim();
            
            if (!name || !email) {
                showToast('Error', 'Please fill in all fields', 'error');
                return;
            }
            
            const success = await authManager.updateProfile(name, email);
            if (success) {
                // Don't reset form, keep current values
            }
        });
    }

    // Password change validation
    const confirmPasswordModal = document.getElementById('confirmPasswordModal');
    const newPasswordModal = document.getElementById('newPasswordModal');
    const passwordMatchError = document.getElementById('passwordMatchError');

    if (confirmPasswordModal && newPasswordModal) {
        function validatePasswordMatch() {
            const newPassword = newPasswordModal.value;
            const confirmPassword = confirmPasswordModal.value;
            
            if (confirmPassword && newPassword !== confirmPassword) {
                passwordMatchError.style.display = 'block';
                confirmPasswordModal.classList.add('is-invalid');
                return false;
            } else {
                passwordMatchError.style.display = 'none';
                confirmPasswordModal.classList.remove('is-invalid');
                return true;
            }
        }

        confirmPasswordModal.addEventListener('input', validatePasswordMatch);
        newPasswordModal.addEventListener('input', validatePasswordMatch);
    }
});

// Global logout function
function logout() {
    authManager.logout();
}

// Global change password function
async function changePassword() {
    const currentPassword = document.getElementById('currentPasswordModal').value.trim();
    const newPassword = document.getElementById('newPasswordModal').value.trim();
    const confirmPassword = document.getElementById('confirmPasswordModal').value.trim();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Error', 'Please fill in all fields', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Error', 'Password must be at least 6 characters long', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Error', 'New passwords do not match', 'error');
        return;
    }
    
    const success = await authManager.changePassword(currentPassword, newPassword);
    if (success) {
        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
        modal.hide();
        document.getElementById('changePasswordForm').reset();
        document.getElementById('passwordMatchError').style.display = 'none';
        document.getElementById('confirmPasswordModal').classList.remove('is-invalid');
    }
}
