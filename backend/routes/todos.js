const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/api/todos', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    const [rows] = await db.promise().query(
        "SELECT * FROM todo WHERE user_id = ? ORDER BY id DESC",
        [userId]
    );

    res.json(rows);
});

router.post('/api/todos', authenticateToken, async (req, res) => {
  const { task, targetDatetime } = req.body;
  const userId = req.user.id;
  const username = req.user.username
  
  if (!task || !targetDatetime) {
    return res.status(400).json({
      message: "Task and targetDatetime are required"
    });
  }

  const [result] = await db.promise().query(
    'INSERT INTO todo (username, task, targetDatetime, status, user_id) VALUES (?, ?, ?, ?, ?)',
    [ username, task, targetDatetime, 'Todo', userId]
  );

  res.json({
    id: result.insertId,
    task,
    status: 'Todo',
    targetDatetime: targetDatetime
  });
});

router.put('/api/todos/:id', authenticateToken, async (req, res) => {
    const { status, targetDatetime } = req.body;
    const userId = req.user.id;
    const todoId = req.params.id;

    const formattedDatetime = targetDatetime ? 
        new Date(targetDatetime).toISOString().slice(0, 19).replace('T', ' ') : 
        null;

    const [result] = await db.promise().query(
        `UPDATE todo 
         SET status = ?, targetDatetime = ?
         WHERE id = ? AND user_id = ?`,
        [status, formattedDatetime, todoId, userId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Todo not found' });
    }

    res.json({ message: 'Todo updated' });
});

router.delete('/api/todos/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const todoId = req.params.id;

    const [result] = await db.promise().query(
        "DELETE FROM todo WHERE id = ? AND user_id = ?",
        [todoId, userId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted' });
});

module.exports = router;
