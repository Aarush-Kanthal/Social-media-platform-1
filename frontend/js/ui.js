const UI = {
  // Toast notifications
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove toast after 4 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3700);
  },

  // Relative time formatter
  formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Modal helpers
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  // Render a Single Post Card
  createPostCard(post, currentUserId, handlers) {
    const isLiked = post.likes.includes(currentUserId);
    const isOwner = post.userId === currentUserId;
    
    const card = document.createElement('div');
    card.className = 'post-card';
    card.dataset.id = post.id;

    // Header section
    const header = document.createElement('div');
    header.className = 'post-header';
    
    const authorLink = document.createElement('a');
    authorLink.className = 'post-author-link';
    authorLink.href = '#';
    authorLink.innerHTML = `
      <img src="${post.user.avatar}" alt="${post.user.displayName}" class="avatar avatar-sm">
      <div class="post-author-meta">
        <span class="author-display-name">${post.user.displayName}</span>
        <span class="post-time-handle">@${post.user.username} · ${this.formatTime(post.createdAt)}</span>
      </div>
    `;
    authorLink.addEventListener('click', (e) => {
      e.preventDefault();
      handlers.onViewProfile(post.user.username);
    });

    header.appendChild(authorLink);

    if (isOwner) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon btn-delete-post';
      deleteBtn.title = 'Delete Post';
      deleteBtn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
      deleteBtn.addEventListener('click', () => handlers.onDeletePost(post.id));
      header.appendChild(deleteBtn);
    }

    card.appendChild(header);

    // Content section
    const content = document.createElement('div');
    content.className = 'post-content';
    content.textContent = post.content;
    card.appendChild(content);

    // Image attachment if exists
    if (post.image) {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'post-image-attachment';
      const img = document.createElement('img');
      img.src = post.image;
      img.alt = 'Attached Media';
      // Hide broken image elements gracefully
      img.onerror = () => { imgWrapper.style.display = 'none'; };
      imgWrapper.appendChild(img);
      card.appendChild(imgWrapper);
    }

    // Actions row
    const actions = document.createElement('div');
    actions.className = 'post-actions';
    
    const likeBtn = document.createElement('button');
    likeBtn.className = `post-action-btn ${isLiked ? 'liked' : ''}`;
    likeBtn.innerHTML = `
      <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
      <span class="likes-count">${post.likes.length}</span>
    `;
    likeBtn.addEventListener('click', () => handlers.onLikePost(post.id, likeBtn));
    
    const commentToggleBtn = document.createElement('button');
    commentToggleBtn.className = 'post-action-btn';
    commentToggleBtn.innerHTML = `
      <i class="fa-regular fa-comment"></i>
      <span class="comments-count">${post.commentCount}</span>
    `;
    
    actions.appendChild(likeBtn);
    actions.appendChild(commentToggleBtn);
    card.appendChild(actions);

    // Inline Comments Section
    const commentsSec = document.createElement('div');
    commentsSec.className = 'comments-section hidden';
    
    // Add comment form
    const commentInputArea = document.createElement('div');
    commentInputArea.className = 'comment-input-area';
    const commentInput = document.createElement('input');
    commentInput.type = 'text';
    commentInput.placeholder = 'Add a comment...';
    
    const commentSendBtn = document.createElement('button');
    commentSendBtn.className = 'btn btn-primary btn-sm';
    commentSendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
    
    const submitComment = async () => {
      const text = commentInput.value.trim();
      if (!text) return;
      
      commentSendBtn.disabled = true;
      try {
        await handlers.onAddComment(post.id, text, commentsList, commentToggleBtn);
        commentInput.value = '';
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        commentSendBtn.disabled = false;
      }
    };

    commentInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') submitComment();
    });
    commentSendBtn.addEventListener('click', submitComment);

    commentInputArea.appendChild(commentInput);
    commentInputArea.appendChild(commentSendBtn);
    commentsSec.appendChild(commentInputArea);

    // Comments list container
    const commentsList = document.createElement('div');
    commentsList.className = 'comments-list';
    commentsSec.appendChild(commentsList);
    
    card.appendChild(commentsSec);

    // Toggle comments visibility
    commentToggleBtn.addEventListener('click', async () => {
      const isHidden = commentsSec.classList.contains('hidden');
      if (isHidden) {
        commentsSec.classList.remove('hidden');
        commentsList.innerHTML = '<div class="loading-state"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
        try {
          await handlers.onLoadComments(post.id, commentsList);
        } catch (err) {
          commentsList.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
        }
      } else {
        commentsSec.classList.add('hidden');
      }
    });

    return card;
  },

  // Render Post Lists (Feed / Profile posts)
  renderPostsList(posts, currentUserId, container, handlers) {
    container.innerHTML = '';
    
    if (!posts || posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-comments"></i>
          <p>No vibes here yet. Start the conversation!</p>
        </div>
      `;
      return;
    }

    posts.forEach(post => {
      const postCard = this.createPostCard(post, currentUserId, handlers);
      container.appendChild(postCard);
    });
  },

  // Render Comments Lists
  renderCommentsList(comments, container, handlers) {
    container.innerHTML = '';
    
    if (!comments || comments.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 20px 0;">
          <p style="font-size: 12px;">No comments yet. Be the first to reply!</p>
        </div>
      `;
      return;
    }

    comments.forEach(comment => {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment-item';
      
      const avatar = document.createElement('img');
      avatar.src = comment.user.avatar;
      avatar.alt = comment.user.displayName;
      avatar.className = 'avatar avatar-sm';
      avatar.style.width = '30px';
      avatar.style.height = '30px';
      
      const bubble = document.createElement('div');
      bubble.className = 'comment-bubble';
      
      const headerRow = document.createElement('div');
      headerRow.className = 'comment-header-row';
      
      const userLink = document.createElement('a');
      userLink.className = 'comment-user-link';
      userLink.href = '#';
      userLink.textContent = comment.user.displayName;
      userLink.addEventListener('click', (e) => {
        e.preventDefault();
        handlers.onViewProfile(comment.user.username);
      });
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'comment-time';
      timeSpan.textContent = this.formatTime(comment.createdAt);
      
      headerRow.appendChild(userLink);
      headerRow.appendChild(timeSpan);
      
      const textDiv = document.createElement('div');
      textDiv.className = 'comment-text';
      textDiv.textContent = comment.content;
      
      bubble.appendChild(headerRow);
      bubble.appendChild(textDiv);
      
      commentDiv.appendChild(avatar);
      commentDiv.appendChild(bubble);
      container.appendChild(commentDiv);
    });
  },

  // Render Suggestions Who-to-follow List
  renderSuggestions(users, container, handlers) {
    container.innerHTML = '';
    
    if (!users || users.length === 0) {
      container.innerHTML = '<p class="empty-state" style="padding: 10px 0; font-size: 13px;">No new suggestions right now.</p>';
      return;
    }

    users.forEach(user => {
      const row = document.createElement('div');
      row.className = 'user-row';
      
      const link = document.createElement('a');
      link.className = 'user-meta-link';
      link.href = '#';
      link.innerHTML = `
        <img src="${user.avatar}" alt="${user.displayName}" class="avatar avatar-sm" style="width:36px; height:36px;">
        <div class="user-meta-text">
          <div class="display-name">${user.displayName}</div>
          <div class="username">@${user.username}</div>
        </div>
      `;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        handlers.onViewProfile(user.username);
      });
      
      const followBtn = document.createElement('button');
      followBtn.className = 'btn btn-primary btn-sm';
      followBtn.style.padding = '4px 12px';
      followBtn.style.fontSize = '12px';
      followBtn.innerHTML = 'Follow';
      followBtn.addEventListener('click', () => handlers.onFollowUser(user.id, followBtn));

      row.appendChild(link);
      row.appendChild(followBtn);
      container.appendChild(row);
    });
  }
};
