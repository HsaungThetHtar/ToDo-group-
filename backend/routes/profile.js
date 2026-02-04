const express = require('express');
const router = express.Router();
const db = require('../config/db');
const upload = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

router.get('/api/profile/:username', async (req, res) => {
  try {
    const [result] = await db.promise().query(
      'SELECT full_name, profile_image FROM users WHERE username = ?',
      [req.params.username]
    );
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.send(result[0]);
  } catch (err) {
    res.status(500).send(err);
  }
});

router.put(
  '/api/profile',
  authenticateToken,
  upload.single('profile_image'),
  async (req, res) => {
    try {
      const { full_name } = req.body;
      const userId = req.user.id;

      if (!full_name) {
        return res.status(400).json({ message: 'Full name is required' });
      }

      const [currentUser] = await db.promise().query(
        'SELECT profile_image FROM users WHERE id = ?',
        [userId]
      );

      const imagePath = req.file
        ? `/uploads/${req.file.filename}`
        : (currentUser[0]?.profile_image || null);

      let sql = 'UPDATE users SET full_name = ?';
      let params = [full_name];

      if (req.file) {
        sql += ', profile_image = ?';
        params.push(imagePath);
      }

      sql += ' WHERE id = ?';
      params.push(userId);

      await db.promise().query(sql, params);

      res.json({ message: 'Profile updated successfully', profile_image: imagePath });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Database error' });
    }
  }
);

module.exports = router;
