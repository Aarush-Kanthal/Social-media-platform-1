const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'mini-social-app-secret-key-987654321';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Expecting format: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please login.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token. Please login again.' });
    }
    req.user = user; // user contains { id, username }
    next();
  });
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
