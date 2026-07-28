const express = require('express');
const pool    = require('../db/pool');
const auth    = require('../middleware/auth');
const router  = express.Router();

router.get('/', auth, async (req, res) => {
  let sql, params=[];
  if (req.user.role === 'lecturer') {
    sql = 'SELECT c.*,u.full_name AS lecturer_name FROM courses c JOIN users u ON c.lecturer_id=u.user_id WHERE c.lecturer_id=? ORDER BY c.course_code';
    params = [req.user.userId];
  } else if (req.user.role === 'student') {
    sql = 'SELECT c.*,u.full_name AS lecturer_name FROM courses c JOIN users u ON c.lecturer_id=u.user_id JOIN enrolments e ON c.course_id=e.course_id WHERE e.student_id=? ORDER BY c.course_code';
    params = [req.user.userId];
  } else {
    sql = 'SELECT c.*,u.full_name AS lecturer_name FROM courses c JOIN users u ON c.lecturer_id=u.user_id ORDER BY c.course_code';
  }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  if (!['admin','lecturer'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { course_code, course_title, credit_units, semester, lecturer_id } = req.body;
  if (!course_code || !course_title) return res.status(400).json({ error: 'course_code and course_title required' });
  const lid = req.user.role === 'admin' ? lecturer_id : req.user.userId;
  const [r] = await pool.query(
    'INSERT INTO courses (course_code,course_title,lecturer_id,credit_units,semester) VALUES (?,?,?,?,?)',
    [course_code, course_title, lid, credit_units||2, semester||'2024/2025 First Semester']
  );
  res.status(201).json({ course_id: r.insertId, message: 'Course created' });
});

router.post('/:id/enrol', auth, async (req, res) => {
  if (!['admin','lecturer'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { student_ids } = req.body;
  if (!student_ids?.length) return res.status(400).json({ error: 'student_ids required' });
  const values = student_ids.map(sid => [sid, req.params.id]);
  await pool.query('INSERT IGNORE INTO enrolments (student_id,course_id) VALUES ?', [values]);
  res.json({ message: student_ids.length + ' student(s) enrolled' });
});

router.get('/:id/students', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT u.user_id,u.full_name,u.email,u.matric_no FROM users u JOIN enrolments e ON u.user_id=e.student_id WHERE e.course_id=? ORDER BY u.full_name',
    [req.params.id]
  );
  res.json(rows);
});

router.delete('/:id', auth, async (req, res) => {
  if (!['admin','lecturer'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  await pool.query('DELETE FROM courses WHERE course_id=?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

module.exports = router;
