// Posts management
class PostsManager {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.userPostsCurrentPage = 1;
        this.userPostsTotalPages = 1;
        this.currentEditingPost = null;
        this.quillEditor = null;
        this.initializeQuillEditor();
    }

    // Initialize Quill editor
    initializeQuillEditor() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupQuillEditor());
        } else {
            this.setupQuillEditor();
        }
    }

    // Setup Quill editor with configuration
    setupQuillEditor() {
        const editorContainer = document.getElementById('postContent');
        if (!editorContainer) return;

        // Quill configuration
        this.quillEditor = new Quill('#postContent', {
            theme: 'snow',
            placeholder: 'Write your post content here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    ['clean']
                ]
            }
        });

        // Custom image handler for file uploads
        this.quillEditor.getModule('toolbar').addHandler('image', () => {
            this.handleImageUpload();
        });

        // Update hidden input when content changes
        this.quillEditor.on('text-change', () => {
            const htmlContent = this.quillEditor.root.innerHTML;
            const hiddenInput = document.getElementById('postContentHidden');
            if (hiddenInput) {
                hiddenInput.value = htmlContent;
            }
        });
    }

    // Handle image upload for Quill editor
    async handleImageUpload() {
        // Create file input
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Error', 'Image size too large. Maximum size is 5MB.', 'error');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Error', 'Please select an image file.', 'error');
                return;
            }

            try {
                // Show loading
                showToast('Info', 'Uploading image...', 'info');
                
                // Upload the image
                const response = await api.uploadImage(file);
                
                // Get current cursor position in Quill
                const range = this.quillEditor.getSelection(true);
                
                // Insert the image at cursor position
                // Construct full URL for the image
                const imageUrl = `${CONFIG.API_BASE_URL.replace('/api/v1', '')}${response.url}`;
                this.quillEditor.insertEmbed(range.index, 'image', imageUrl);
                
                // Move cursor after the image
                this.quillEditor.setSelection(range.index + 1);
                
                showToast('Success', 'Image uploaded successfully!', 'success');
            } catch (error) {
                console.error('Error uploading image:', error);
                showToast('Error', error.message || 'Failed to upload image', 'error');
            }
        };

        // Trigger file selection
        input.click();
    }

    // Load and display posts for home page
    async loadPosts(page = 1) {
        try {
            const response = await api.getPosts(page, CONFIG.POSTS_PER_PAGE);
            this.currentPage = response.page;
            this.totalPages = response.total_pages;
            
            this.renderPosts(response.posts);
            this.renderPagination(response);
        } catch (error) {
            console.error('Error loading posts:', error);
            this.renderEmptyState('Failed to load posts. Please try again later.');
        }
    }

    // Render posts in the home page
    renderPosts(posts) {
        const container = document.getElementById('postsContainer');
        if (!container) return;

        if (posts.length === 0) {
            this.renderEmptyState('No posts available.');
            return;
        }

                 container.innerHTML = posts.map(post => `
             <div class="post-preview fade-in">
                 <a href="#post/${post.slug}" onclick="app.showPostDetail('${post.slug}'); return false;">
                     <h2 class="post-title">${this.escapeHtml(post.title)}</h2>
                     <h3 class="post-subtitle">${this.escapeHtml(post.tagline || '')}</h3>
                 </a>
                 <p class="post-meta">
                     Posted by <strong>${this.escapeHtml(post.author_name)}</strong>
                     on ${formatDate(post.created_at)}
                 </p>
                 ${post.img_file ? `<img src="${post.img_file}" alt="${this.escapeHtml(post.title)}" class="img-fluid mb-3" style="max-height: 200px; object-fit: cover;">` : ''}
                 <p class="post-excerpt">${truncateText(this.stripHtml(post.content))}</p>
             </div>
             <hr class="my-4" />
         `).join('');
    }

    // Render pagination
    renderPagination(response) {
        const paginationContainer = document.getElementById('pagination');
        if (!paginationContainer) return;

        let paginationHTML = '';

        // Previous button
        if (response.page > 1) {
            paginationHTML += `
                <button class="btn btn-primary" onclick="postsManager.loadPosts(${response.page - 1})">
                    <i class="fas fa-arrow-left"></i> Previous Posts
                </button>
            `;
        } else {
            paginationHTML += '<span></span>'; // Empty span for spacing
        }

        // Page info
        paginationHTML += `
            <span class="pagination-info">
                Page ${response.page} of ${response.total_pages} 
                (${response.total} total posts)
            </span>
        `;

        // Next button
        if (response.page < response.total_pages) {
            paginationHTML += `
                <button class="btn btn-primary" onclick="postsManager.loadPosts(${response.page + 1})">
                    Next Posts <i class="fas fa-arrow-right"></i>
                </button>
            `;
        } else {
            paginationHTML += '<span></span>'; // Empty span for spacing
        }

        paginationContainer.innerHTML = `<div class="pagination-wrapper">${paginationHTML}</div>`;
    }

    // Render pagination for user posts
    renderUserPostsPagination(response) {
        const paginationContainer = document.getElementById('userPostsPagination');
        if (!paginationContainer) return;

        let paginationHTML = '';

        // Previous button
        if (response.page > 1) {
            paginationHTML += `
                <button class="btn btn-primary" onclick="postsManager.loadUserPosts(${response.page - 1})">
                    <i class="fas fa-arrow-left"></i> Previous Posts
                </button>
            `;
        } else {
            paginationHTML += '<span></span>'; // Empty span for spacing
        }

        // Page info
        paginationHTML += `
            <span class="pagination-info">
                Page ${response.page} of ${response.total_pages} 
                (${response.total} total posts)
            </span>
        `;

        // Next button
        if (response.page < response.total_pages) {
            paginationHTML += `
                <button class="btn btn-primary" onclick="postsManager.loadUserPosts(${response.page + 1})">
                    Next Posts <i class="fas fa-arrow-right"></i>
                </button>
            `;
        } else {
            paginationHTML += '<span></span>'; // Empty span for spacing
        }

        paginationContainer.innerHTML = `<div class="pagination-wrapper">${paginationHTML}</div>`;
    }

    // Load and display user's posts in dashboard
    async loadUserPosts(page = 1) {
        if (!authManager.isAuthenticated()) {
            showPage('login');
            return;
        }

        try {
            const showUnpublished = document.getElementById('showUnpublished')?.checked ?? false;
            console.log('Loading user posts with showUnpublished:', showUnpublished, 'page:', page);
            const response = await api.getAllUserPosts(page, CONFIG.POSTS_PER_PAGE, showUnpublished);
            console.log('User posts response:', response);
            
            // Update pagination state
            this.userPostsCurrentPage = response.page || page;
            this.userPostsTotalPages = response.total_pages || 1;
            
            this.renderUserPosts(response.posts);
            this.renderUserPostsPagination(response);
        } catch (error) {
            console.error('Error loading user posts:', error);
            this.renderUserPostsEmptyState('Failed to load your posts. Please try again later.');
        }
    }

    // Render user posts in dashboard
    renderUserPosts(posts) {
        const container = document.getElementById('userPostsContainer');
        if (!container) return;

        if (posts.length === 0) {
            this.renderUserPostsEmptyState('You haven\'t created any posts yet. Create your first post to get started!');
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="card post-card mb-3">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <h5 class="card-title mb-0">${this.escapeHtml(post.title)}</h5>
                                <span class="badge ${post.is_published ? 'bg-success' : 'bg-secondary'} ms-2">
                                    ${post.is_published ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            <p class="card-text text-muted">${this.escapeHtml(post.tagline || '')}</p>
                            <p class="card-text">
                                <small class="text-muted">
                                    Created: ${formatDateTime(post.created_at)}
                                    ${post.updated_at ? `<br>Updated: ${formatDateTime(post.updated_at)}` : ''}
                                </small>
                            </p>
                        </div>
                                                 <div class="post-actions">
                             <button class="btn btn-sm btn-outline-primary" onclick="app.showPostDetail('${post.slug}')">
                                 <i class="fas fa-eye"></i> View
                             </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="postsManager.editPost(${post.id})">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <div class="form-check form-switch d-inline-block me-2">
                                <input class="form-check-input" type="checkbox" id="toggle-${post.id}" 
                                       ${post.is_published ? 'checked' : ''} 
                                       onchange="postsManager.toggleVisibility(${post.id})"
                                       title="${post.is_published ? 'Click to unpublish' : 'Click to publish'}">
                                <label class="form-check-label" for="toggle-${post.id}">
                                    <small>${post.is_published ? 'Published' : 'Draft'}</small>
                                </label>
                            </div>
                            <button class="btn btn-sm btn-outline-danger" onclick="postsManager.deletePost(${post.id}, '${this.escapeHtml(post.title)}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }



    // Show post editor modal
    showPostEditor(postData = null) {
        if (!authManager.isAuthenticated()) {
            showToast('Error', 'Please login to create posts', 'error');
            return;
        }

        const modal = document.getElementById('postEditorModal');
        const title = document.getElementById('postEditorTitle');
        const form = document.getElementById('postForm');
        
        // Reset form
        form.reset();
        this.currentEditingPost = postData;
        
        // Clear Quill editor
        if (this.quillEditor) {
            this.quillEditor.setText('');
        }
        
        if (postData) {
            // Editing existing post
            title.textContent = 'Edit Post';
            document.getElementById('postId').value = postData.id;
            document.getElementById('postTitle').value = postData.title;
            document.getElementById('postTagline').value = postData.tagline || '';
            document.getElementById('postSlug').value = postData.slug;
            document.getElementById('postPublished').checked = postData.is_published;
            
            // Set Quill content
            if (this.quillEditor && postData.content) {
                this.quillEditor.root.innerHTML = postData.content;
                // Update hidden input
                document.getElementById('postContentHidden').value = postData.content;
            }
            
            // Update toggle label based on current status
            this.updatePublishToggleLabel(postData.is_published);
        } else {
            // Creating new post
            title.textContent = 'Create New Post';
            document.getElementById('postId').value = '';
            document.getElementById('postPublished').checked = true; // Default to published for new posts
            document.getElementById('postContentHidden').value = '';
            this.updatePublishToggleLabel(true);
        }
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    // Save post (create or update)
    async savePost() {
        const title = document.getElementById('postTitle').value.trim();
        const tagline = document.getElementById('postTagline').value.trim();
        const slug = document.getElementById('postSlug').value.trim();
        
        // Get content from Quill editor
        let content = '';
        if (this.quillEditor) {
            content = this.quillEditor.root.innerHTML.trim();
            // Remove empty paragraph tags that Quill adds by default
            if (content === '<p><br></p>') {
                content = '';
            }
        } else {
            // Fallback to hidden input
            content = document.getElementById('postContentHidden').value.trim();
        }
        
        const isPublished = document.getElementById('postPublished').checked;
        const postId = document.getElementById('postId').value;
        
        // Validation
        if (!title || !slug || !content) {
            showToast('Error', 'Please fill in all required fields', 'error');
            return;
        }
        
        // Auto-generate slug if empty
        const finalSlug = slug || slugify(title);
        
                 const postData = {
             title,
             tagline: tagline || null,
             slug: finalSlug,
             content,
             img_file: null, // Images are now handled via Quill editor
             is_published: isPublished
         };
        
        try {
            console.log('Saving post with data:', postData);
            if (postId) {
                // Update existing post
                const response = await api.updatePost(parseInt(postId), postData);
                console.log('Update response:', response);
                const statusText = isPublished ? 'published' : 'saved as draft';
                showToast('Success', `Post ${statusText} successfully!`, 'success');
            } else {
                // Create new post
                const response = await api.createPost(postData);
                console.log('Create response:', response);
                const statusText = isPublished ? 'published' : 'saved as draft';
                showToast('Success', `Post ${statusText} successfully!`, 'success');
            }
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('postEditorModal'));
            modal.hide();
            
            // Reload posts
            if (document.getElementById('dashboardPage').classList.contains('d-none') === false) {
                this.loadUserPosts();
            } else {
                this.loadPosts(this.currentPage);
            }
        } catch (error) {
            console.error('Error saving post:', error);
            showToast('Error', error.message || 'Failed to save post', 'error');
        }
    }

    // Edit post
    async editPost(postId) {
        try {
            // Get user posts to find the one being edited
            const response = await api.getUserPosts();
            const post = response.posts.find(p => p.id === postId);
            
            if (post) {
                this.showPostEditor(post);
            } else {
                showToast('Error', 'Post not found', 'error');
            }
        } catch (error) {
            console.error('Error loading post for editing:', error);
            showToast('Error', 'Failed to load post for editing', 'error');
        }
    }

    // Delete post
    async deletePost(postId, postTitle) {
        if (!confirm(`Are you sure you want to delete "${postTitle}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            await api.deletePost(postId);
            showToast('Success', 'Post deleted successfully!', 'success');
            this.loadUserPosts(); // Reload user posts
        } catch (error) {
            console.error('Error deleting post:', error);
            showToast('Error', error.message || 'Failed to delete post', 'error');
        }
    }

    // Toggle post visibility
    async toggleVisibility(postId) {
        try {
            console.log('Toggling visibility for post:', postId);
            const response = await api.togglePostVisibility(postId);
            console.log('Toggle response:', response);
            showToast('Success', response.message, 'success');
            this.loadUserPosts(); // Reload user posts to reflect changes
        } catch (error) {
            console.error('Error toggling post visibility:', error);
            showToast('Error', error.message || 'Failed to toggle post visibility', 'error');
            // Reload to revert the toggle if there was an error
            this.loadUserPosts();
        }
    }

    // Render empty state for home page
    renderEmptyState(message) {
        const container = document.getElementById('postsContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <h3>No Posts Found</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // Render empty state for user posts
    renderUserPostsEmptyState(message) {
        const container = document.getElementById('userPostsContainer');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-edit"></i>
                    <h3>No Posts Yet</h3>
                    <p>${message}</p>
                    <button class="btn btn-primary mt-3" onclick="postsManager.showPostEditor()">
                        <i class="fas fa-plus"></i> Create Your First Post
                    </button>
                </div>
            `;
        }
    }

    // Utility methods
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    stripHtml(html) {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    // Update publish toggle label
    updatePublishToggleLabel(isPublished) {
        const toggleLabel = document.querySelector('label[for="postPublished"]');
        if (toggleLabel) {
            const icon = isPublished ? 'fa-eye' : 'fa-eye-slash';
            const text = isPublished ? 'Publish immediately' : 'Save as draft';
            toggleLabel.innerHTML = `<i class="fas ${icon} me-1"></i> ${text}`;
        }
    }
}

// Create global posts manager instance
const postsManager = new PostsManager();

// Global functions for inline event handlers
function showPostEditor(postData = null) {
    postsManager.showPostEditor(postData);
}

function savePost() {
    postsManager.savePost();
}

// Auto-generate slug from title and handle publish toggle
document.addEventListener('DOMContentLoaded', function() {
    const titleInput = document.getElementById('postTitle');
    const slugInput = document.getElementById('postSlug');
    
    if (titleInput && slugInput) {
        titleInput.addEventListener('input', function() {
            if (!slugInput.value || postsManager.currentEditingPost === null) {
                slugInput.value = slugify(this.value);
            }
        });
    }

    // Handle publish toggle changes in post editor
    const publishToggle = document.getElementById('postPublished');
    if (publishToggle) {
        publishToggle.addEventListener('change', function() {
            postsManager.updatePublishToggleLabel(this.checked);
        });
    }
});
