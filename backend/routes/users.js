const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get who-to-follow suggestions
router.get('/suggestions', authenticateToken, (req, res) => {
  try {
    const suggestions = db.getFollowSuggestions(req.user.id, 5);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update current user profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const updatedUser = db.updateUserProfile(req.user.id, req.body);
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get user profile by username (with posts, liked posts, follow stats, and isFollowing flag)
router.get('/:username', authenticateToken, (req, res) => {
  try {
    const profileUser = db.getUserByUsername(req.params.username);
    if (!profileUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const following = db.isFollowing(req.user.id, profileUser.id);
    const stats = db.getFollowCounts(profileUser.id);
    const posts = db.getUserPosts(profileUser.id);
    const likedPosts = db.getUserLikedPosts(profileUser.id);

    res.json({
      user: profileUser,
      following,
      followersCount: stats.followersCount,
      followingCount: stats.followingCount,
      posts,
      likedPosts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle follow / unfollow another user
router.post('/:id/follow', authenticateToken, (req, res) => {
  try {
    const result = db.toggleFollow(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
