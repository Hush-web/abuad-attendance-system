const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { userId: user.user_id, role: user.role, name: user.full_name, email: user.email },
      process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    res.json({ token, user: { user_id: user.user_id, full_name: user.full_name, email: user.email, role: user.role, matric_no: user.matric_no } });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.post('/register', async (req, res) => {
  const { full_name, email, password, role, matric_no, phone } = req.body;
  if (!full_name || !email || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO users (full_name,email,password_hash,role,matric_no,phone) VALUES (?,?,?,?,?,?)',
      [full_name, email, hash, role, matric_no||null, phone||null]
    );
    res.status(201).json({ user_id: r.insertId, message: 'User created' });
  } catch(e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT user_id,full_name,email,role,matric_no,created_at FROM users WHERE user_id=?',[req.user.userId]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
