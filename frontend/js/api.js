// API utility functions
class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    // Get headers with Authorization token
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Authorization header if token exists
        const token = sessionStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    // Check if endpoint needs credentials (authentication)
    needsCredentials(endpoint) {
        // Authentication endpoints that need credentials
        const authEndpoints = [
            '/auth/me',
            '/auth/logout', 
            '/auth/change-password',
            '/posts/create_post',
            '/posts/upload-image',
            '/posts/user/',
            '/posts/delete/',
            '/posts/toggle-visibility'
        ];
        
        // Check if it's an auth endpoint
        const needsAuth = authEndpoints.some(authPath => 
            endpoint.startsWith(authPath) || endpoint.includes(authPath)
        );
        
        // Check for PUT/DELETE operations on posts (these need auth)
        const isPostMutation = (endpoint.startsWith('/posts/') && 
            (endpoint.includes('/delete/') || endpoint.includes('/toggle-visibility'))) ||
            (endpoint.match(/^\/posts\/\d+$/) && this.lastMethod && this.lastMethod !== 'GET');
        
        return needsAuth || isPostMutation;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const method = options.method || 'GET';
        this.lastMethod = method; // Store for needsCredentials check
        
        const config = {
            headers: this.getHeaders(),
            ...options
        };
        
        // Only include credentials for authenticated endpoints
        const needsCreds = this.needsCredentials(endpoint);
        if (needsCreds) {
            config.credentials = 'include';
        }
        
        // Debug logging (only for auth issues)
        if (needsCreds || endpoint.includes('/auth/') || endpoint.includes('/user/')) {
            console.log(`API Request: ${method} ${endpoint}`, {
                needsCredentials: needsCreds,
                hasCredentials: !!config.credentials,
                endpoint: endpoint
            });
        }

        try {
            showLoadingSpinner(true);
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        } finally {
            showLoadingSpinner(false);
        }
    }

    // GET request
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    // POST request
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // Authentication endpoints
    async login(email, password) {
        return this.post('/auth/login', { email, password });
    }

    async register(name, email, password) {
        return this.post('/auth/register', { name, email, password });
    }

    async getCurrentUser() {
        return this.get('/auth/me');
    }

    async updateUserProfile(profileData) {
        return this.put('/auth/me', profileData);
    }

    async logout() {
        return this.post('/auth/logout', {});
    }

    async changePassword(currentPassword, newPassword) {
        return this.put('/auth/change-password', { 
            current_password: currentPassword, 
            new_password: newPassword 
        });
    }

    // Posts endpoints
    async getPosts(page = 1, perPage = CONFIG.POSTS_PER_PAGE) {
        return this.get(`/posts/?page=${page}&per_page=${perPage}`);
    }

    async getPost(slug) {
        return this.get(`/posts/${slug}`);
    }

    async createPost(postData) {
        return this.post('/posts/create_post', postData);
    }

    async updatePost(postId, postData) {
        return this.put(`/posts/${postId}`, postData);
    }

    async deletePost(postId) {
        return this.delete(`/posts/delete/${postId}`);
    }

    async getUserPosts(page = 1, perPage = 10) {
        return this.get(`/posts/user/my-posts?page=${page}&per_page=${perPage}`);
    }

    async getAllUserPosts(page = 1, perPage = 10, showUnpublished = false) {
        return this.get(`/posts/user/all-posts?page=${page}&per_page=${perPage}&show_unpublished=${showUnpublished}`);
    }

    async togglePostVisibility(postId) {
        return this.put(`/posts/${postId}/toggle-visibility`);
    }

    // Contact endpoint
    async sendContactMessage(contactData) {
        return this.post('/contact/', contactData);
    }

    // Upload image for posts
    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return this.request('/posts/upload-image', {
            method: 'POST',
            body: formData,
            // Don't set Content-Type, let browser set it with boundary for FormData
            headers: {}  // Remove Content-Type for FormData, credentials will be included automatically
        });
    }
}

// Create global API client instance
const api = new ApiClient(CONFIG.API_BASE_URL);

// Utility functions
function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.classList.toggle('d-none', !show);
    }
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastTitle && toastMessage) {
        toastTitle.textContent = title;
        toastMessage.textContent = message;
        
        // Remove existing color classes
        toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
        
        // Add appropriate color class
        switch (type) {
            case 'success':
                toast.classList.add('bg-success', 'text-white');
                break;
            case 'error':
                toast.classList.add('bg-danger', 'text-white');
                break;
            case 'warning':
                toast.classList.add('bg-warning', 'text-dark');
                break;
            default:
                toast.classList.add('bg-info', 'text-white');
        }
        
        const bsToast = new bootstrap.Toast(toast, {
            delay: CONFIG.TOAST_DURATION
        });
        bsToast.show();
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength = 150) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim('-'); // Remove leading/trailing hyphens
}
