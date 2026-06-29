const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_DIR = path.join(__dirname, 'db');
const DB_FILE = path.join(DB_DIR, 'data.json');

// Initialize database file
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      posts: [],
      comments: [],
      follows: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Read database
function readData() {
  initDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, returning empty structure:', err);
    return { users: [], posts: [], comments: [], follows: [] };
  }
}

// Write database atomically to prevent corruption
function writeData(data) {
  initDb();
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing to database:', err);
    if (fs.existsSync(tempFile)) {
      try { fs.unlinkSync(tempFile); } catch (e) {}
    }
    return false;
  }
}

// Password cryptography
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Default profile image generator based on username
function getDefaultAvatar(username) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;
}

function getDefaultBanner(username) {
  return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=60`;
}

// Auth APIs
function createUser(username, password, displayName, email) {
  const db = readData();
  
  const lowerUsername = username.trim().toLowerCase();
  const existingUser = db.users.find(u => u.username.toLowerCase() === lowerUsername);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  const salt = generateSalt();
  const hashedPassword = hashPassword(password, salt);

  const newUser = {
    id: crypto.randomUUID(),
    username: username.trim(),
    displayName: displayName.trim() || username.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashedPassword,
    salt: salt,
    bio: "Hello, I am new here!",
    avatar: getDefaultAvatar(username),
    banner: getDefaultBanner(username),
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeData(db);

  // Return user without sensitive credentials
  const { passwordHash, salt: _, ...safeUser } = newUser;
  return safeUser;
}

function authenticateUser(username, password) {
  const db = readData();
  const lowerUsername = username.trim().toLowerCase();
  const user = db.users.find(u => u.username.toLowerCase() === lowerUsername);
  
  if (!user) {
    throw new Error('Invalid username or password');
  }

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('Invalid username or password');
  }

  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

function getUserById(id) {
  const db = readData();
  const user = db.users.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

function getUserByUsername(username) {
  const db = readData();
  const lowerUsername = username.trim().toLowerCase();
  const user = db.users.find(u => u.username.toLowerCase() === lowerUsername);
  if (!user) return null;
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

function updateUserProfile(userId, updates) {
  const db = readData();
  const index = db.users.findIndex(u => u.id === userId);
  if (index === -1) {
    throw new Error('User not found');
  }

  const allowedUpdates = ['displayName', 'bio', 'avatar', 'banner'];
  const user = db.users[index];

  allowedUpdates.forEach(key => {
    if (updates[key] !== undefined) {
      user[key] = updates[key].trim();
    }
  });

  db.users[index] = user;
  writeData(db);

  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}

// Follow APIs
function toggleFollow(followerId, followingId) {
  if (followerId === followingId) {
    throw new Error('You cannot follow yourself');
  }

  const db = readData();
  
  // Verify both users exist
  const followerExists = db.users.some(u => u.id === followerId);
  const followingExists = db.users.some(u => u.id === followingId);
  if (!followerExists || !followingExists) {
    throw new Error('User does not exist');
  }

  const followIndex = db.follows.findIndex(
    f => f.followerId === followerId && f.followingId === followingId
  );

  let followed = false;
  if (followIndex > -1) {
    db.follows.splice(followIndex, 1);
  } else {
    db.follows.push({
      followerId,
      followingId,
      createdAt: new Date().toISOString()
    });
    followed = true;
  }

  writeData(db);
  return { followed };
}

function isFollowing(followerId, followingId) {
  const db = readData();
  return db.follows.some(
    f => f.followerId === followerId && f.followingId === followingId
  );
}

function getFollowCounts(userId) {
  const db = readData();
  const followersCount = db.follows.filter(f => f.followingId === userId).length;
  const followingCount = db.follows.filter(f => f.followerId === userId).length;
  return { followersCount, followingCount };
}

function getFollowSuggestions(userId, limit = 5) {
  const db = readData();
  // Get list of users whom this user is already following
  const followedIds = db.follows
    .filter(f => f.followerId === userId)
    .map(f => f.followingId);

  // Exclude current user and already followed users
  const suggestions = db.users
    .filter(u => u.id !== userId && !followedIds.includes(u.id))
    .slice(0, limit)
    .map(u => {
      const { passwordHash, salt, ...safeUser } = u;
      return safeUser;
    });

  return suggestions;
}

// Post APIs
function createPost(userId, content, image = '') {
  if (!content.trim() && !image.trim()) {
    throw new Error('Post content or image is required');
  }

  const db = readData();
  
  const userExists = db.users.some(u => u.id === userId);
  if (!userExists) {
    throw new Error('User not found');
  }

  const newPost = {
    id: crypto.randomUUID(),
    userId,
    content: content.trim(),
    image: image.trim(),
    likes: [], // Array of userIds who liked the post
    createdAt: new Date().toISOString()
  };

  db.posts.push(newPost);
  writeData(db);

  // Return post with user details attached
  return attachUserToPost(newPost, db);
}

function toggleLikePost(postId, userId) {
  const db = readData();
  const postIndex = db.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) {
    throw new Error('Post not found');
  }

  const post = db.posts[postIndex];
  const likedIndex = post.likes.indexOf(userId);

  let liked = false;
  if (likedIndex > -1) {
    post.likes.splice(likedIndex, 1);
  } else {
    post.likes.push(userId);
    liked = true;
  }

  db.posts[postIndex] = post;
  writeData(db);

  return { liked, likesCount: post.likes.length };
}

function deletePost(postId, userId) {
  const db = readData();
  const postIndex = db.posts.findIndex(p => p.id === postId);
  if (postIndex === -1) {
    throw new Error('Post not found');
  }

  const post = db.posts[postIndex];
  if (post.userId !== userId) {
    throw new Error('Unauthorized to delete this post');
  }

  // Remove post
  db.posts.splice(postIndex, 1);
  // Remove related comments
  db.comments = db.comments.filter(c => c.postId !== postId);

  writeData(db);
  return { success: true };
}

function getFeedPosts(userId) {
  const db = readData();
  
  // Find users followed by current user
  const followedUserIds = db.follows
    .filter(f => f.followerId === userId)
    .map(f => f.followingId);

  // Include own user ID
  const feedUserIds = [...followedUserIds, userId];

  // Get posts from those users + any post that is general (if feed has very few items, we can show everything, but let's stick to standard flow: followed users + own posts. If feed is empty, we show all posts to make discovery easy)
  let feedPosts = db.posts.filter(p => feedUserIds.includes(p.userId));
  
  if (feedPosts.length === 0) {
    // Fallback: if no followed posts, show all posts for a rich discoverable feed
    feedPosts = db.posts;
  }

  // Sort by date descending
  feedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Attach user profiles
  return feedPosts.map(p => attachUserToPost(p, db));
}

function getUserPosts(profileUserId) {
  const db = readData();
  const posts = db.posts.filter(p => p.userId === profileUserId);
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return posts.map(p => attachUserToPost(p, db));
}

function getUserLikedPosts(profileUserId) {
  const db = readData();
  const posts = db.posts.filter(p => p.likes.includes(profileUserId));
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return posts.map(p => attachUserToPost(p, db));
}

// Helper to attach user info to post
function attachUserToPost(post, db) {
  const user = db.users.find(u => u.id === post.userId);
  const commentCount = db.comments.filter(c => c.postId === post.id).length;
  
  return {
    ...post,
    commentCount,
    user: user ? {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar
    } : { username: 'deleted', displayName: 'Deleted User', avatar: getDefaultAvatar('deleted') }
  };
}

// Comment APIs
function addComment(postId, userId, content) {
  if (!content.trim()) {
    throw new Error('Comment content is required');
  }

  const db = readData();
  const postExists = db.posts.some(p => p.id === postId);
  if (!postExists) {
    throw new Error('Post not found');
  }

  const newComment = {
    id: crypto.randomUUID(),
    postId,
    userId,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  db.comments.push(newComment);
  writeData(db);

  // Return comment with user info attached
  const user = db.users.find(u => u.id === userId);
  return {
    ...newComment,
    user: user ? {
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar
    } : { username: 'deleted', displayName: 'Deleted User', avatar: getDefaultAvatar('deleted') }
  };
}

function getCommentsByPostId(postId) {
  const db = readData();
  const comments = db.comments.filter(c => c.postId === postId);
  comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // oldest first

  return comments.map(c => {
    const user = db.users.find(u => u.id === c.userId);
    return {
      ...c,
      user: user ? {
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar
      } : { username: 'deleted', displayName: 'Deleted User', avatar: getDefaultAvatar('deleted') }
    };
  });
}

module.exports = {
  createUser,
  authenticateUser,
  getUserById,
  getUserByUsername,
  updateUserProfile,
  toggleFollow,
  isFollowing,
  getFollowCounts,
  getFollowSuggestions,
  createPost,
  toggleLikePost,
  deletePost,
  getFeedPosts,
  getUserPosts,
  getUserLikedPosts,
  addComment,
  getCommentsByPostId
};
