const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

async function isTeamMember(teamId, userId) {
  const [rows] = await db.promise().query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return rows.length > 0;
}

async function isTeamAdmin(teamId, userId) {
  const [rows] = await db.promise().query(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND is_admin = 1',
    [teamId, userId]
  );
  return rows.length > 0;
}

router.post('/api/teams', authenticateToken, async (req, res) => {
  try {
    const { name, members } = req.body;
    const creatorId = req.user.id;

    if (!name) return res.status(400).json({ message: 'Team name required' });

    const [result] = await db.promise().query(
      'INSERT INTO teams (name, created_by) VALUES (?, ?)',
      [name, creatorId]
    );

    const teamId = result.insertId;

    await db.promise().query(
      'INSERT INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, 1)',
      [teamId, creatorId]
    );

    if (Array.isArray(members)) {
      for (const uid of members) {
        if (uid === creatorId) continue;
        try {
          await db.promise().query(
            'INSERT IGNORE INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, 0)',
            [teamId, uid]
          );
        } catch (e) {}
      }
    }

    res.status(201).json({ message: 'Team created', teamId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api/teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.promise().query(
      `SELECT t.id, t.name, t.created_by, tm.is_admin
       FROM teams t
       JOIN team_members tm ON tm.team_id = t.id
       WHERE tm.user_id = ?`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const { user_id } = req.body;
    const actorId = req.user.id;

    if (!await isTeamAdmin(teamId, actorId)) {
      return res.status(403).json({ message: 'Only team admin can add members' });
    }

    const [userRows] = await db.promise().query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (userRows.length === 0) return res.status(404).json({ message: 'User not found' });

    await db.promise().query(
      'INSERT IGNORE INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, 0)',
      [teamId, user_id]
    );

    res.json({ message: 'Member added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/api/teams/:teamId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.params.userId;
    const actorId = req.user.id;

    if (!await isTeamAdmin(teamId, actorId)) {
      return res.status(403).json({ message: 'Only team admin can remove members' });
    }

    const [adminRows] = await db.promise().query(
      'SELECT user_id FROM team_members WHERE team_id = ? AND is_admin = 1',
      [teamId]
    );

    if (adminRows.length === 1 && adminRows[0].user_id == userId) {
      return res.status(400).json({ message: 'Cannot remove the only team admin' });
    }

    await db.promise().query(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/api/teams/:teamId/tasks', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const { title, description, assignee_id, targetDatetime } = req.body;
    const actorId = req.user.id;

    if (!title) return res.status(400).json({ message: 'Title required' });

    if (!await isTeamAdmin(teamId, actorId)) {
      return res.status(403).json({ message: 'Only team admin can create tasks' });
    }

    if (assignee_id) {
      if (!await isTeamMember(teamId, assignee_id)) {
        return res.status(400).json({ message: 'Assignee must be a team member' });
      }
    }

    const formattedDatetime = targetDatetime ? new Date(targetDatetime).toISOString().slice(0,19).replace('T',' ') : null;

    const [result] = await db.promise().query(
      `INSERT INTO team_tasks (team_id, title, description, assignee_id, target_datetime, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [teamId, title, description || null, assignee_id || null, formattedDatetime, actorId]
    );

    res.status(201).json({ message: 'Task created', taskId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/api/teams/:teamId/tasks', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.user.id;

    if (!await isTeamMember(teamId, userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [rows] = await db.promise().query(
      `SELECT tt.*, u.username as assignee_username, u.full_name as assignee_full_name
       FROM team_tasks tt
       LEFT JOIN users u ON u.id = tt.assignee_id
       WHERE tt.team_id = ?
       ORDER BY tt.created_at DESC`,
      [teamId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/api/teams/:teamId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const taskId = req.params.taskId;
    const userId = req.user.id;
    const { status, targetDatetime } = req.body;

    const [tasks] = await db.promise().query('SELECT * FROM team_tasks WHERE id = ? AND team_id = ?', [taskId, teamId]);
    if (tasks.length === 0) return res.status(404).json({ message: 'Task not found' });
    const task = tasks[0];

    const actorIsAdmin = await isTeamAdmin(teamId, userId);
    const actorIsAssignee = (task.assignee_id && task.assignee_id == userId);

    if (!actorIsAdmin && !actorIsAssignee) {
      return res.status(403).json({ message: 'Only team admin or assignee can modify status' });
    }

    const formattedDatetime = targetDatetime ? new Date(targetDatetime).toISOString().slice(0,19).replace('T',' ') : null;

    const [result] = await db.promise().query(
      `UPDATE team_tasks SET status = ?, target_datetime = ? WHERE id = ? AND team_id = ?`,
      [status || task.status, formattedDatetime, taskId, teamId]
    );

    res.json({ message: 'Task updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
