// Authentication management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isInitialized = false;
        this.initPromise = this.initializeAuth();
    }

    // Initialize authentication state
    async initializeAuth() {
        // Check if we have a stored token
        const token = sessionStorage.getItem('access_token');
        if (!token) {
            this.currentUser = null;
            this.updateUIForUnauthenticatedUser();
            return;
        }
        
        try {
            // Verify token by calling the /me endpoint
            const userData = await api.getCurrentUser();
            this.currentUser = userData;
            this.updateUIForAuthenticatedUser();
        } catch (error) {
            // Token is invalid, clear it
            sessionStorage.removeItem('access_token');
            this.currentUser = null;
            this.updateUIForUnauthenticatedUser();
        }
        
        this.isInitialized = true;
    }

    // Login user
    async login(email, password) {
        try {
            const response = await api.login(email, password);
            
            // Store the token for Authorization header
            if (response.access_token) {
                sessionStorage.setItem('access_token', response.access_token);
            }
            
            // Get user data from response
            if (response.user) {
                this.currentUser = response.user;
            } else {
                this.currentUser = await api.getCurrentUser();
            }
            
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
    async logout() {
        try {
            await api.logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Clear stored token
        sessionStorage.removeItem('access_token');
        
        this.currentUser = null;
        this.updateUIForUnauthenticatedUser();
        showToast('Success', 'Logout successful!', 'success');
        showPage('home');
    }

    // Wait for auth initialization to complete
    async waitForInit() {
        await this.initPromise;
        return this.isInitialized;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Check if user is authenticated (async version that waits for init)
    async isAuthenticatedAsync() {
        await this.waitForInit();
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
            
            // Update current user data
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
async function logout() {
    await authManager.logout();
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
