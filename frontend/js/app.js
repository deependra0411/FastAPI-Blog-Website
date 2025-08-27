// Main application logic and navigation
class App {
    constructor() {
        this.currentPage = 'home';
        this.init();
    }

    // Initialize the application
    init() {
        this.setupEventListeners();
        this.loadInitialPage();
    }

    // Setup global event listeners
    setupEventListeners() {
        // Contact form
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', this.handleContactForm.bind(this));
        }

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.showPage(event.state.page, false);
            }
        });

        // Close modals on escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    const modal = bootstrap.Modal.getInstance(openModal);
                    if (modal) modal.hide();
                }
            }
        });
    }

    // Load initial page based on URL or default to home
    loadInitialPage() {
        const hash = window.location.hash.slice(1) || 'home';
        this.showPage(hash, false);
    }

    // Show specific page
    showPage(pageName, addToHistory = true) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.add('d-none'));

        // Show requested page
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.remove('d-none');
            this.currentPage = pageName;

            // Update URL and history
            if (addToHistory) {
                const url = pageName === 'home' ? '/' : `/#${pageName}`;
                history.pushState({ page: pageName }, '', url);
            }

            // Load page-specific content
            this.loadPageContent(pageName);

            // Update active navigation
            this.updateActiveNavigation(pageName);

            // Scroll to top
            window.scrollTo(0, 0);
        }
    }

    // Load content for specific pages
    async loadPageContent(pageName) {
        switch (pageName) {
            case 'home':
                await postsManager.loadPosts(1);
                break;
            case 'dashboard':
                if (!authManager.isAuthenticated()) {
                    this.showPage('login');
                    showToast('Error', 'Please login to access dashboard', 'error');
                    return;
                }
                await postsManager.loadUserPosts();
                break;
            case 'profile':
                if (!authManager.isAuthenticated()) {
                    this.showPage('login');
                    showToast('Error', 'Please login to access profile', 'error');
                    return;
                }
                authManager.loadProfileData();
                break;
        }
    }

    // Update active navigation item
    updateActiveNavigation(pageName) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current page nav link
        const currentNavLink = document.querySelector(`.navbar-nav .nav-link[onclick="showPage('${pageName}')"]`);
        if (currentNavLink) {
            currentNavLink.classList.add('active');
        }
    }

    // Handle contact form submission
    async handleContactForm(event) {
        event.preventDefault();

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const message = document.getElementById('message').value.trim();

        // Validation
        if (!name || !email || !message) {
            showToast('Error', 'Please fill in all required fields', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            showToast('Error', 'Please enter a valid email address', 'error');
            return;
        }

        if (message.length < 10) {
            showToast('Error', 'Message must be at least 10 characters long', 'error');
            return;
        }

        const contactData = {
            name,
            email,
            phone: phone || null,
            message
        };

        try {
            await api.sendContactMessage(contactData);
            showToast('Success', 'Message sent successfully! We\'ll get back to you soon.', 'success');
            event.target.reset(); // Clear form
        } catch (error) {
            console.error('Error sending contact message:', error);
            showToast('Error', error.message || 'Failed to send message. Please try again.', 'error');
        }
    }

    // Email validation helper
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Get current page
    getCurrentPage() {
        return this.currentPage;
    }
}

// Create global app instance
const app = new App();

// Global function for navigation (used in onclick handlers)
function showPage(pageName) {
    app.showPage(pageName);
}

// Additional global functions
function refreshCurrentPage() {
    app.loadPageContent(app.getCurrentPage());
}

// Handle responsive navigation collapse
document.addEventListener('DOMContentLoaded', function() {
    // Auto-collapse navbar on mobile when link is clicked
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navbarCollapse.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                bsCollapse.hide();
            }
        });
    });

    // Toggle for showing unpublished posts
    const showUnpublishedToggle = document.getElementById('showUnpublished');
    if (showUnpublishedToggle) {
        showUnpublishedToggle.addEventListener('change', (e) => {
            console.log('Show unpublished toggle changed:', e.target.checked);
            if (app.getCurrentPage() === 'dashboard') {
                console.log('Reloading user posts due to toggle change');
                postsManager.loadUserPosts();
            }
        });
    }

    // Handle navbar scroll effect
    const navbar = document.getElementById('mainNav');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                navbar.classList.add('navbar-scrolled');
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            } else {
                navbar.classList.remove('navbar-scrolled');
                navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            }
        });
    }
});

// Service Worker registration (for future PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment when service worker is implemented
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => {
        //         console.log('SW registered: ', registration);
        //     })
        //     .catch(registrationError => {
        //         console.log('SW registration failed: ', registrationError);
        //     });
    });
}

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show toast for every error as it might be annoying
    // showToast('Error', 'An unexpected error occurred', 'error');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent default browser error handling
});

// Utility function for development
function debugInfo() {
    console.log('App Debug Info:', {
        currentPage: app.getCurrentPage(),
        isAuthenticated: authManager.isAuthenticated(),
        currentUser: authManager.getCurrentUser(),
        apiBaseUrl: CONFIG.API_BASE_URL
    });
}
