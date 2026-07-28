const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.post('/sync', auth, async (req, res) => {
  const records = Array.isArray(req.body) ? req.body : [req.body];
  const results = { synced: 0, failed: 0, errors: [] };
  for (const rec of records) {
    const { studentId, sessionId, tokenUuid, recognitionScore, livenessScore, markedAt } = rec;
    if (!studentId || !sessionId || !markedAt) { results.failed++; continue; }
    try {
      const [tokens] = await pool.query('SELECT * FROM qr_tokens WHERE token_uuid=? AND session_id=?', [tokenUuid, sessionId]);
      if (tokens.length && tokens[0].used && tokens[0].used_by !== studentId) { results.failed++; continue; }
      await pool.query(
        'INSERT IGNORE INTO attendance_records (student_id,session_id,token_uuid,recognition_score,liveness_score,marked_at) VALUES (?,?,?,?,?,?)',
        [studentId, sessionId, tokenUuid||null, recognitionScore||null, livenessScore||null, markedAt]
      );
      if (tokenUuid) await pool.query('UPDATE qr_tokens SET used=TRUE,used_by=? WHERE token_uuid=?', [studentId, tokenUuid]);
      results.synced++;
    } catch(e) { results.failed++; results.errors.push(e.message); }
  }
  res.json(results);
});

router.post('/validate-token', auth, async (req, res) => {
  const { token_uuid, session_id } = req.body;
  const [rows] = await pool.query('SELECT * FROM qr_tokens WHERE token_uuid=? AND session_id=?', [token_uuid, session_id]);
  if (!rows.length) return res.json({ valid: false, reason: 'Token not found' });
  const t = rows[0];
  if (t.used && t.used_by !== req.user.userId) return res.json({ valid: false, reason: 'Token already used' });
  if (new Date(t.expires_at) < new Date()) return res.json({ valid: false, reason: 'Token expired' });
  res.json({ valid: true, session_id: t.session_id, expires_at: t.expires_at });
});

router.get('/student/:id', auth, async (req, res) => {
  if (req.user.role === 'student' && req.user.userId !== parseInt(req.params.id))
    return res.status(403).json({ error: 'Forbidden' });
  const [rows] = await pool.query(
    'SELECT c.course_id,c.course_code,c.course_title,c.semester,COUNT(s.session_id) AS total_sessions,COUNT(ar.record_id) AS attended_sessions,ROUND(COUNT(ar.record_id)/NULLIF(COUNT(s.session_id),0)*100,1) AS percentage FROM courses c JOIN enrolments e ON c.course_id=e.course_id AND e.student_id=? JOIN class_sessions s ON s.course_id=c.course_id LEFT JOIN attendance_records ar ON ar.session_id=s.session_id AND ar.student_id=? GROUP BY c.course_id ORDER BY c.course_code',
    [req.params.id, req.params.id]
  );
  res.json(rows);
});

router.get('/student/:id/sessions', auth, async (req, res) => {
  if (req.user.role === 'student' && req.user.userId !== parseInt(req.params.id))
    return res.status(403).json({ error: 'Forbidden' });
  const { course_id } = req.query;
  const params = [req.params.id, req.params.id];
  let extra = '';
  if (course_id) { extra = ' AND s.course_id=?'; params.push(course_id); }
  const [rows] = await pool.query(
    'SELECT s.session_id,s.session_date,s.start_time,s.end_time,c.course_code,c.course_title,IF(ar.record_id IS NOT NULL,"present","absent") AS status,ar.recognition_score,ar.liveness_score,ar.marked_at FROM class_sessions s JOIN courses c ON c.course_id=s.course_id JOIN enrolments e ON e.course_id=s.course_id AND e.student_id=? LEFT JOIN attendance_records ar ON ar.session_id=s.session_id AND ar.student_id=? WHERE 1=1'+extra+' ORDER BY s.session_date DESC',
    params
  );
  res.json(rows);
});

router.get('/session/:id', auth, async (req, res) => {
  if (!['admin','lecturer'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const [rows] = await pool.query(
    'SELECT u.user_id,u.full_name,u.matric_no,IF(ar.record_id IS NOT NULL,"present","absent") AS status,ar.recognition_score,ar.liveness_score,ar.marked_at FROM enrolments e JOIN users u ON u.user_id=e.student_id JOIN class_sessions s ON s.course_id=e.course_id AND s.session_id=? LEFT JOIN attendance_records ar ON ar.student_id=u.user_id AND ar.session_id=? ORDER BY u.full_name',
    [req.params.id, req.params.id]
  );
  res.json(rows);
});

router.get('/course/:id/report', auth, async (req, res) => {
  if (!['admin','lecturer'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const [rows] = await pool.query(
    'SELECT u.user_id,u.full_name,u.matric_no,COUNT(s.session_id) AS total_sessions,COUNT(ar.record_id) AS attended,ROUND(COUNT(ar.record_id)/NULLIF(COUNT(s.session_id),0)*100,1) AS percentage FROM enrolments e JOIN users u ON u.user_id=e.student_id JOIN class_sessions s ON s.course_id=e.course_id LEFT JOIN attendance_records ar ON ar.student_id=u.user_id AND ar.session_id=s.session_id WHERE e.course_id=? GROUP BY u.user_id ORDER BY u.full_name',
    [req.params.id]
  );
  res.json(rows);
});

router.post('/embedding-registered', auth, async (req, res) => {
  const { device_hash } = req.body;
  await pool.query(
    'INSERT INTO embeddings (student_id,device_hash) VALUES (?,?) ON DUPLICATE KEY UPDATE device_hash=?,captured_at=NOW()',
    [req.user.userId, device_hash||null, device_hash||null]
  );
  res.json({ message: 'Embedding registered' });
});

module.exports = router;
