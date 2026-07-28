const jwt = require('jsonwebtoken');
module.exports = function(req, res, next) {
  const h = req.headers['authorization'];
  if (!h) return res.status(401).json({ error: 'No token' });
  const token = h.startsWith('Bearer ') ? h.slice(7) : h;
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
};
