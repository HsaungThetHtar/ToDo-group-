const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT id, username, full_name FROM users ORDER BY username'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const [rows] = await db.promise().query(
      `SELECT u.id, u.username, u.full_name, tm.is_admin
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = ?
       ORDER BY u.username`,
      [teamId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching team members:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
