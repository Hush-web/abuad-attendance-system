const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode  = require('qrcode');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/', auth, async (req, res) => {
  if (!['admin','lecturer'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { course_id, session_date, start_time, end_time, location, token_count } = req.body;
  if (!course_id || !session_date || !start_time || !end_time)
    return res.status(400).json({ error: 'course_id, session_date, start_time, end_time required' });
  try {
    const [sr] = await pool.query(
      'INSERT INTO class_sessions (course_id,lecturer_id,session_date,start_time,end_time,location) VALUES (?,?,?,?,?,?)',
      [course_id, req.user.userId, session_date, start_time, end_time, location||'Main Campus']
    );
    const sessionId = sr.insertId;
    const expiresAt = session_date + ' ' + end_time;
    const count = Math.min(parseInt(token_count)||20, 50);
    const tokens = [], tokenValues = [];
    for (let i=0; i<count; i++) {
      const uuid = uuidv4(); tokens.push(uuid);
      tokenValues.push([sessionId, uuid, expiresAt]);
    }
    await pool.query('INSERT INTO qr_tokens (session_id,token_uuid,expires_at) VALUES ?', [tokenValues]);
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ token: tokens[0], sessionId, courseId: course_id }), { width: 300, errorCorrectionLevel: 'H' });
    res.status(201).json({ session_id: sessionId, tokens, qr_preview: qrDataUrl, expires_at: expiresAt, message: 'Session created with ' + count + ' QR tokens' });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

router.get('/', auth, async (req, res) => {
  const { course_id } = req.query;
  let sql = 'SELECT s.*,c.course_code,c.course_title,u.full_name AS lecturer_name,COUNT(ar.record_id) AS attendance_count FROM class_sessions s JOIN courses c ON s.course_id=c.course_id JOIN users u ON s.lecturer_id=u.user_id LEFT JOIN attendance_records ar ON ar.session_id=s.session_id';
  const params=[], where=[];
  if (req.user.role === 'lecturer') { where.push('s.lecturer_id=?'); params.push(req.user.userId); }
  if (course_id) { where.push('s.course_id=?'); params.push(course_id); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' GROUP BY s.session_id ORDER BY s.session_date DESC,s.start_time DESC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.get('/:id/qr', auth, async (req, res) => {
  const idx = parseInt(req.query.token_index)||0;
  const [tokens] = await pool.query('SELECT * FROM qr_tokens WHERE session_id=? AND used=FALSE ORDER BY token_id LIMIT 1 OFFSET ?', [req.params.id, idx]);
  if (!tokens.length) return res.status(404).json({ error: 'No available tokens' });
  const t = tokens[0];
  const [sess] = await pool.query('SELECT s.*,c.course_id FROM class_sessions s JOIN courses c ON s.course_id=c.course_id WHERE s.session_id=?', [req.params.id]);
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ token: t.token_uuid, sessionId: t.session_id, courseId: sess[0]?.course_id, expiresAt: t.expires_at }), { width: 300, errorCorrectionLevel: 'H' });
  res.json({ token_uuid: t.token_uuid, qr: qrDataUrl, expires_at: t.expires_at });
});

router.get('/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT s.*,c.course_code,c.course_title FROM class_sessions s JOIN courses c ON s.course_id=c.course_id WHERE s.session_id=?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
