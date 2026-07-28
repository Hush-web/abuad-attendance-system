const express = require('express');
const bcrypt  = require('bcryptjs');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  const { role } = req.query;
  let sql = 'SELECT user_id,full_name,email,role,matric_no,phone,created_at FROM users', params = [];
  if (role) { sql += ' WHERE role=?'; params.push(role); }
  sql += ' ORDER BY full_name';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT user_id,full_name,email,role,matric_no,phone,created_at FROM users WHERE user_id=?',[req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin' && req.user.userId !== parseInt(req.params.id))
    return res.status(403).json({ error: 'Forbidden' });
  const { full_name, phone, matric_no, password } = req.body;
  const fields=[], vals=[];
  if (full_name) { fields.push('full_name=?'); vals.push(full_name); }
  if (phone)     { fields.push('phone=?');     vals.push(phone); }
  if (matric_no) { fields.push('matric_no=?'); vals.push(matric_no); }
  if (password)  { fields.push('password_hash=?'); vals.push(await bcrypt.hash(password,10)); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  vals.push(req.params.id);
  await pool.query('UPDATE users SET '+fields.join(',')+ ' WHERE user_id=?', vals);
  res.json({ message: 'Updated' });
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  await pool.query('DELETE FROM users WHERE user_id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
