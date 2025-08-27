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
                if (event.state.page === 'postDetail' && event.state.slug) {
                    this.showPostDetail(event.state.slug, false);
                } else {
                    this.showPage(event.state.page, false);
                }
            } else {
                // Fallback to reading from URL hash
                const hash = window.location.hash.slice(1) || 'home';
                if (hash.startsWith('post/')) {
                    const slug = hash.replace('post/', '');
                    this.showPostDetail(slug, false);
                } else {
                    this.showPage(hash, false);
                }
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
        
        // Check if it's a post slug (starts with 'post/')
        if (hash.startsWith('post/')) {
            const slug = hash.replace('post/', '');
            this.showPostDetail(slug, false);
        } else {
            this.showPage(hash, false);
        }
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
        } else {
            console.error('Page not found:', `${pageName}Page`);
        }
    }

    // Show post detail page
    async showPostDetail(slug, addToHistory = true) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => page.classList.add('d-none'));

        // Show post detail page
        const targetPage = document.getElementById('postDetailPage');
        if (targetPage) {
            targetPage.classList.remove('d-none');
            this.currentPage = 'postDetail';

            // Update URL and history
            if (addToHistory) {
                const url = `/#post/${slug}`;
                history.pushState({ page: 'postDetail', slug: slug }, '', url);
            }

            // Load post content
            await this.loadPostContent(slug);

            // Update active navigation (clear all active states)
            this.updateActiveNavigation('postDetail');

            // Scroll to top
            window.scrollTo(0, 0);
        }
    }

    // Load post content
    async loadPostContent(slug) {
        const contentContainer = document.getElementById('postDetailContent');
        const actionsContainer = document.getElementById('postDetailActions');
        
        try {
            // Show loading state
            contentContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading post...</p>
                </div>
            `;

            // Fetch post data
            const post = await api.getPost(slug);

            // Render post content
            contentContainer.innerHTML = `
                <header class="mb-4">
                    <h1 class="fw-bolder mb-1">${this.escapeHtml(post.title)}</h1>
                    ${post.tagline ? `<p class="fs-5 text-muted">${this.escapeHtml(post.tagline)}</p>` : ''}
                    <div class="text-muted fst-italic mb-2">
                        <span>By <a href="#" class="text-decoration-none">${this.escapeHtml(post.author_name)}</a></span>
                        <span class="mx-2">•</span>
                        <span>${formatDate(post.created_at)}</span>
                        ${post.updated_at !== post.created_at ? `
                            <span class="mx-2">•</span>
                            <span class="small">Updated ${formatDate(post.updated_at)}</span>
                        ` : ''}
                    </div>
                </header>
                ${post.img_file ? `
                    <figure class="mb-4">
                        <img class="img-fluid rounded" src="${post.img_file}" alt="${this.escapeHtml(post.title)}" />
                    </figure>
                ` : ''}
                <section class="mb-5">
                    <div class="post-content">
                        ${post.content}
                    </div>
                </section>
            `;

            // Show edit/delete buttons if user owns the post
            if (authManager.isAuthenticated() && authManager.currentUser) {
                const currentUser = authManager.currentUser;
                if (currentUser.id === post.author_id || currentUser.is_admin) {
                    actionsContainer.innerHTML = `
                        <div class="btn-group" role="group">
                            <button class="btn btn-outline-secondary btn-sm" onclick="postsManager.editPost(${post.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="postsManager.deletePost(${post.id}, '${this.escapeHtml(post.title)}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    `;
                } else {
                    actionsContainer.innerHTML = '';
                }
            } else {
                actionsContainer.innerHTML = '';
            }

        } catch (error) {
            console.error('Error loading post:', error);
            contentContainer.innerHTML = `
                <div class="text-center py-5">
                    <div class="alert alert-danger" role="alert">
                        <h4 class="alert-heading">Post Not Found</h4>
                        <p>Sorry, the post you're looking for doesn't exist or has been removed.</p>
                        <hr>
                        <button class="btn btn-primary" onclick="showPage('home'); return false;">
                            <i class="fas fa-home"></i> Back to Home
                        </button>
                    </div>
                </div>
            `;
            actionsContainer.innerHTML = '';
        }
    }

    // Get current page
    getCurrentPage() {
        return this.currentPage;
    }

    // Helper method for escaping HTML
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Load content for specific pages
    async loadPageContent(pageName) {
        switch (pageName) {
            case 'home':
                await postsManager.loadPosts(1);
                break;
            case 'about':
                // About page is static, no content to load
                break;
            case 'contact':
                // Contact page is static, no content to load
                break;
            case 'login':
                // Login page is static, no content to load
                break;
            case 'register':
                // Register page is static, no content to load
                break;
            case 'dashboard':
                // Wait for auth initialization before checking
                const isAuth = await authManager.isAuthenticatedAsync();
                if (!isAuth) {
                    this.showPage('login');
                    showToast('Error', 'Please login to access dashboard', 'error');
                    return;
                }
                await postsManager.loadUserPosts();
                break;
            case 'profile':
                const isAuthProfile = await authManager.isAuthenticatedAsync();
                if (!isAuthProfile) {
                    this.showPage('login');
                    showToast('Error', 'Please login to access profile', 'error');
                    return;
                }
                authManager.loadProfileData();
                break;
            default:
                // Handle unknown pages
                console.warn(`Unknown page: ${pageName}`);
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
        // Handle special case for postDetail page
        if (pageName === 'postDetail') {
            // Don't highlight any nav item for post detail pages
            return;
        }
        
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

// Global function for post navigation (used in onclick handlers)
function showPostDetail(slug) {
    app.showPostDetail(slug);
}

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
                // Reset to page 1 when toggling filters
                postsManager.loadUserPosts(1);
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
