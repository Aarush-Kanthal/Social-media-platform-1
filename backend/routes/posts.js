const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Get home feed posts
router.get('/', authenticateToken, (req, res) => {
  try {
    const posts = db.getFeedPosts(req.user.id);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new post
router.post('/', authenticateToken, (req, res) => {
  const { content, image } = req.body;
  
  try {
    const newPost = db.createPost(req.user.id, content || '', image || '');
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Toggle like post
router.post('/:id/like', authenticateToken, (req, res) => {
  try {
    const result = db.toggleLikePost(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete post
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const result = db.deletePost(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Add a comment to a post
router.post('/:id/comment', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  try {
    const comment = db.addComment(req.params.id, req.user.id, content);
    res.status(201).json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all comments for a post
router.get('/:id/comments', authenticateToken, (req, res) => {
  try {
    const comments = db.getCommentsByPostId(req.params.id);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
