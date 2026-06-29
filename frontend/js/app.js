// ==========================================
// VIBENET CLIENT APP CONTROLLER
// ==========================================

const state = {
  currentUser: null,
  activeView: 'feed',
  currentProfileUsername: null,
  activeProfileTab: 'posts' // 'posts' or 'likes'
};

// ==========================================
// VIEW ROUTER
// ==========================================
function switchView(viewName, param = null) {
  // Hide all views
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  
  // Deactivate all navigation items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));

  // Show active view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.add('active');

  // Highlight navigation icons
  document.querySelectorAll(`[data-view="${viewName}"]`).forEach(n => n.classList.add('active'));

  // Update header title
  const headerTitle = document.getElementById('view-title');
  if (viewName === 'feed') {
    headerTitle.innerText = 'Home Feed';
    loadFeed();
  } else if (viewName === 'explore') {
    headerTitle.innerText = 'Explore Vibes';
    loadExplore();
  } else if (viewName === 'profile') {
    const targetUser = param || state.currentUser.username;
    headerTitle.innerText = `@${targetUser}'s Profile`;
    loadUserProfile(targetUser);
  }

  state.activeView = viewName;
  // Scroll to top of viewport
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// COMPONENT DATA LOADERS
// ==========================================

// Load home feed
async function loadFeed() {
  const container = document.getElementById('feed-posts');
  container.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Catching latest vibes...</p></div>';

  try {
    const posts = await API.getFeed();
    UI.renderPostsList(posts, state.currentUser.id, container, handlers);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load feed: ${err.message}</p></div>`;
  }
}

// Load global feed (Explore view)
async function loadExplore(searchQuery = '') {
  const container = document.getElementById('explore-posts');
  const heading = document.getElementById('explore-heading');
  
  container.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i><p>Exploring vibes...</p></div>';

  try {
    let posts = [];
    if (searchQuery.trim()) {
      heading.innerText = `Search results for "${searchQuery}"`;
      // Fetch profile matching search, or filter posts.
      // Since it's a mini-app, we search by profile username
      try {
        const profileData = await API.getUserProfile(searchQuery.trim());
        heading.innerText = `User Profile Found: @${profileData.user.username}`;
        container.innerHTML = '';
        
        // Show profile card redirect link
        const searchCard = document.createElement('div');
        searchCard.className = 'post-card';
        searchCard.innerHTML = `
          <div class="post-header" style="border:none; margin:0;">
            <a href="#" class="post-author-link">
              <img src="${profileData.user.avatar}" alt="" class="avatar avatar-md">
              <div class="post-author-meta">
                <span class="author-display-name" style="font-size:16px;">${profileData.user.displayName}</span>
                <span class="post-time-handle">@${profileData.user.username}</span>
              </div>
            </a>
            <button class="btn btn-primary btn-sm" id="search-follow-btn">${profileData.following ? 'Following' : 'Follow'}</button>
          </div>
          <div style="margin-top:10px; font-size:13px; color:var(--text-muted);">${profileData.user.bio}</div>
        `;
        searchCard.querySelector('.post-author-link').addEventListener('click', (e) => {
          e.preventDefault();
          handlers.onViewProfile(profileData.user.username);
        });
        
        const followBtn = searchCard.querySelector('#search-follow-btn');
        followBtn.addEventListener('click', async () => {
          await handlers.onFollowUser(profileData.user.id, followBtn);
          // Reload explore to see updated stats
          loadExplore(searchQuery);
        });
        
        container.appendChild(searchCard);
        return;
      } catch (err) {
        heading.innerText = `No users found matching "${searchQuery}"`;
        container.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-magnifying-glass"></i>
            <p>We couldn't find any user named "@${searchQuery}".</p>
          </div>
        `;
        return;
      }
    } else {
      heading.innerText = 'Global Feed';
      // Load all feed (or simulated global posts by hitting feed API)
      posts = await API.getFeed();
    }
    
    UI.renderPostsList(posts, state.currentUser.id, container, handlers);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load explore posts: ${err.message}</p></div>`;
  }
}

// Load user profile details
async function loadUserProfile(username) {
  state.currentProfileUsername = username;
  
  // Set up loader in profile feed
  const feedContainer = document.getElementById('profile-posts-list');
  feedContainer.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';

  try {
    const profileData = await API.getUserProfile(username);
    
    // Update profile header layouts
    document.getElementById('profile-avatar-img').src = profileData.user.avatar;
    document.getElementById('profile-banner-img').src = profileData.user.banner;
    document.getElementById('profile-display-name').innerText = profileData.user.displayName;
    document.getElementById('profile-username').innerText = `@${profileData.user.username}`;
    document.getElementById('profile-bio-text').innerText = profileData.user.bio || 'No bio yet.';
    
    // Update follow statistics
    document.getElementById('profile-posts-count').innerText = profileData.posts.length;
    document.getElementById('profile-followers-count').innerText = profileData.followersCount;
    document.getElementById('profile-following-count').innerText = profileData.followingCount;

    // Toggle follow/edit profile button
    const editBtn = document.getElementById('edit-profile-btn');
    const followBtn = document.getElementById('follow-profile-btn');

    if (profileData.user.id === state.currentUser.id) {
      editBtn.classList.remove('hidden');
      followBtn.classList.add('hidden');
    } else {
      editBtn.classList.add('hidden');
      followBtn.classList.remove('hidden');
      
      if (profileData.following) {
        followBtn.innerText = 'Following';
        followBtn.className = 'btn btn-secondary';
      } else {
        followBtn.innerText = 'Follow';
        followBtn.className = 'btn btn-primary';
      }
      
      // Update event listener
      // Re-create follow button to clear old event listeners easily
      const newFollowBtn = followBtn.cloneNode(true);
      followBtn.parentNode.replaceChild(newFollowBtn, followBtn);
      newFollowBtn.addEventListener('click', async () => {
        newFollowBtn.disabled = true;
        try {
          const res = await API.toggleFollow(profileData.user.id);
          if (res.followed) {
            newFollowBtn.innerText = 'Following';
            newFollowBtn.className = 'btn btn-secondary';
            UI.showToast(`Followed @${profileData.user.username}`, 'success');
          } else {
            newFollowBtn.innerText = 'Follow';
            newFollowBtn.className = 'btn btn-primary';
            UI.showToast(`Unfollowed @${profileData.user.username}`, 'info');
          }
          // Reload profile statistics
          loadUserProfile(username);
        } catch (err) {
          UI.showToast(err.message, 'error');
        } finally {
          newFollowBtn.disabled = false;
        }
      });
    }

    // Render tab posts
    renderProfileTabPosts(profileData);

  } catch (err) {
    feedContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Could not load profile: ${err.message}</p></div>`;
  }
}

// Render profile sub-tabs (Posts / Liked posts)
function renderProfileTabPosts(profileData) {
  const container = document.getElementById('profile-posts-list');
  const posts = state.activeProfileTab === 'posts' ? profileData.posts : profileData.likedPosts;
  
  UI.renderPostsList(posts, state.currentUser.id, container, handlers);
}

// Load Who-To-Follow suggestions sidebar
async function loadSuggestions() {
  const container = document.getElementById('suggestions-container');
  try {
    const users = await API.getSuggestions();
    UI.renderSuggestions(users, container, handlers);
  } catch (err) {
    container.innerHTML = '<p class="error-text">Suggestions failed</p>';
  }
}

// ==========================================
// INTERACTIVE ACTION HANDLERS
// ==========================================
const handlers = {
  // Navigation callback
  onViewProfile(username) {
    switchView('profile', username);
  },

  // Toggle post like
  async onLikePost(postId, btnElement) {
    try {
      const res = await API.likePost(postId);
      const isLiked = res.liked;
      
      // Update heart icon UI
      const icon = btnElement.querySelector('i');
      const counter = btnElement.querySelector('.likes-count');
      
      counter.innerText = res.likesCount;
      if (isLiked) {
        btnElement.classList.add('liked');
        icon.className = 'fa-solid fa-heart';
      } else {
        btnElement.classList.remove('liked');
        icon.className = 'fa-regular fa-heart';
      }
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  },

  // Delete post
  async onDeletePost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await API.deletePost(postId);
      UI.showToast('Post deleted successfully', 'success');
      
      // Remove post card element from DOM dynamically
      const card = document.querySelector(`.post-card[data-id="${postId}"]`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        card.style.transition = 'all 0.3s ease';
        setTimeout(() => {
          card.remove();
          // If profile page, update post counts
          if (state.activeView === 'profile') {
            loadUserProfile(state.currentProfileUsername);
          }
        }, 300);
      }
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  },

  // Follow/Unfollow suggestions
  async onFollowUser(userId, btnElement) {
    try {
      const res = await API.toggleFollow(userId);
      if (res.followed) {
        btnElement.innerText = 'Following';
        btnElement.className = 'btn btn-secondary btn-sm';
        UI.showToast('User followed', 'success');
      } else {
        btnElement.innerText = 'Follow';
        btnElement.className = 'btn btn-primary btn-sm';
        UI.showToast('User unfollowed', 'info');
      }
      
      // Reload sidebar suggestions after follow state change
      setTimeout(loadSuggestions, 1000);
      
      // If we are currently on the Home Feed, refresh feed so followed posts show up!
      if (state.activeView === 'feed') {
        loadFeed();
      }
    } catch (err) {
      UI.showToast(err.message, 'error');
    }
  },

  // Add Comment callback
  async onAddComment(postId, text, listContainer, toggleBtn) {
    const res = await API.addComment(postId, text);
    
    // Add comment to list dynamically
    const emptyState = listContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    // Fetch and re-render entire comment section to keep user info styled correctly
    const comments = await API.getComments(postId);
    UI.renderCommentsList(comments, listContainer, handlers);

    // Update count on post card
    const countSpan = toggleBtn.querySelector('.comments-count');
    if (countSpan) {
      countSpan.innerText = comments.length;
    }
    
    UI.showToast('Comment published', 'success');
  },

  // Load comments callback
  async onLoadComments(postId, listContainer) {
    const comments = await API.getComments(postId);
    UI.renderCommentsList(comments, listContainer, handlers);
  }
};

// ==========================================
// SESSION MANAGEMENT (LOGIN & STATE)
// ==========================================
async function initApp() {
  const token = API.getToken();
  if (!token) {
    showAuthScreen();
    return;
  }

  try {
    const user = await API.getCurrentUser();
    state.currentUser = user;
    
    // Update logged in user badges
    document.querySelectorAll('.user-avatar').forEach(img => img.src = user.avatar);
    document.querySelectorAll('.user-display-name').forEach(el => el.innerText = user.displayName);
    document.querySelectorAll('.user-handle').forEach(el => el.innerText = `@${user.username}`);
    
    // Switch to application UI
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('mobile-nav').classList.remove('hidden');

    // Default load feed
    switchView('feed');
    loadSuggestions();

  } catch (err) {
    // Expired or bad token
    console.error('Session initialization failed:', err);
    API.clearToken();
    showAuthScreen();
  }
}

function showAuthScreen() {
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('mobile-nav').classList.add('hidden');
  document.getElementById('auth-container').classList.remove('hidden');
}

// ==========================================
// DOM INTERACTION EVENT LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  
  // --- Auth form switches ---
  document.getElementById('go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-card').classList.remove('active');
    document.getElementById('register-card').classList.add('active');
  });

  document.getElementById('go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-card').classList.remove('active');
    document.getElementById('login-card').classList.add('active');
  });

  // --- Login Form Submit ---
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      await API.login(username, password);
      UI.showToast('Successfully logged in!', 'success');
      
      // Clear forms
      e.target.reset();
      
      // Init application state
      await initApp();
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // --- Register Form Submit ---
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const displayName = document.getElementById('register-displayname').value;
    const password = document.getElementById('register-password').value;

    try {
      await API.register(username, email, displayName, password);
      UI.showToast('Account registered successfully!', 'success');
      
      e.target.reset();
      await initApp();
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // --- Logout Click ---
  const logoutAction = (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
      API.clearToken();
      state.currentUser = null;
      showAuthScreen();
      UI.showToast('Logged out successfully', 'info');
    }
  };
  document.getElementById('logout-btn').addEventListener('click', logoutAction);
  document.getElementById('mobile-logout-btn').addEventListener('click', logoutAction);

  // --- Navigation Switches ---
  document.querySelectorAll('.nav-item[data-view], .mobile-nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.getAttribute('data-view');
      switchView(view);
    });
  });

  // --- Compose Post Collapsible Options ---
  const imgInputToggle = document.getElementById('toggle-image-input');
  const imgInputWrapper = document.getElementById('post-image-input-wrapper');
  imgInputToggle.addEventListener('click', () => {
    imgInputWrapper.classList.toggle('active');
  });

  // --- Publish Post (Inline card) ---
  document.getElementById('submit-post-btn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    const textarea = document.getElementById('post-textarea');
    const imgInput = document.getElementById('post-image-url');

    const content = textarea.value.trim();
    const image = imgInput.value.trim();

    if (!content && !image) {
      UI.showToast('Please type some content or add an image URL', 'error');
      e.target.disabled = false;
      return;
    }

    try {
      await API.createPost(content, image);
      UI.showToast('Vibe shared!', 'success');
      textarea.value = '';
      imgInput.value = '';
      imgInputWrapper.classList.remove('active');
      loadFeed();
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      e.target.disabled = false;
    }
  });

  // --- Compose Post Modal triggers ---
  const openCompose = () => UI.openModal('compose-modal');
  const closeCompose = () => {
    UI.closeModal('compose-modal');
    document.getElementById('modal-post-textarea').value = '';
    document.getElementById('modal-post-image-url').value = '';
  };
  document.getElementById('open-compose-btn').addEventListener('click', openCompose);
  document.getElementById('mobile-compose-btn').addEventListener('click', openCompose);
  document.getElementById('close-compose-modal').addEventListener('click', closeCompose);
  document.getElementById('cancel-compose-btn').addEventListener('click', closeCompose);

  document.getElementById('modal-submit-post-btn').addEventListener('click', async (e) => {
    e.target.disabled = true;
    const textarea = document.getElementById('modal-post-textarea');
    const imgInput = document.getElementById('modal-post-image-url');

    const content = textarea.value.trim();
    const image = imgInput.value.trim();

    if (!content && !image) {
      UI.showToast('Post cannot be empty', 'error');
      e.target.disabled = false;
      return;
    }

    try {
      await API.createPost(content, image);
      UI.showToast('Vibe shared!', 'success');
      closeCompose();
      if (state.activeView === 'feed') {
        loadFeed();
      }
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      e.target.disabled = false;
    }
  });

  // --- Edit Profile Modal triggers ---
  const openEditProfile = () => {
    const user = state.currentUser;
    document.getElementById('edit-display-name').value = user.displayName;
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-avatar').value = user.avatar;
    document.getElementById('edit-banner').value = user.banner;
    UI.openModal('edit-profile-modal');
  };
  const closeEditProfile = () => UI.closeModal('edit-profile-modal');

  document.getElementById('edit-profile-btn').addEventListener('click', openEditProfile);
  document.getElementById('close-edit-modal').addEventListener('click', closeEditProfile);
  document.getElementById('cancel-edit-btn').addEventListener('click', closeEditProfile);

  document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const updates = {
      displayName: document.getElementById('edit-display-name').value,
      bio: document.getElementById('edit-bio').value,
      avatar: document.getElementById('edit-avatar').value,
      banner: document.getElementById('edit-banner').value
    };

    try {
      const updatedUser = await API.updateProfile(updates);
      state.currentUser = updatedUser;
      
      // Update UI displays
      document.querySelectorAll('.user-avatar').forEach(img => img.src = updatedUser.avatar);
      document.querySelectorAll('.user-display-name').forEach(el => el.innerText = updatedUser.displayName);
      
      UI.showToast('Profile updated!', 'success');
      closeEditProfile();

      // Refresh Profile view
      if (state.activeView === 'profile') {
        loadUserProfile(state.currentUser.username);
      }
    } catch (err) {
      UI.showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // --- Explore Search (Debounced) ---
  let searchTimeout;
  document.getElementById('explore-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    searchTimeout = setTimeout(() => {
      loadExplore(query);
    }, 450);
  });

  // --- Profile Page Tab triggers ---
  document.querySelectorAll('.tab-item[data-profile-tab]').forEach(tab => {
    tab.addEventListener('click', async (e) => {
      document.querySelectorAll('.tab-item[data-profile-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      state.activeProfileTab = tab.getAttribute('data-profile-tab');
      
      // Reload profile posts tab
      if (state.currentProfileUsername) {
        const feedContainer = document.getElementById('profile-posts-list');
        feedContainer.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
        try {
          const profileData = await API.getUserProfile(state.currentProfileUsername);
          renderProfileTabPosts(profileData);
        } catch (err) {
          feedContainer.innerHTML = `<p class="error-text">Could not load posts: ${err.message}</p>`;
        }
      }
    });
  });

  // --- Initialize App ---
  initApp();
});
