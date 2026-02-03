const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt')
const path = require('path')
const jwt = require('jsonwebtoken')
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const port = 5001;

// Middleware setup
app.use(cors()); 
app.use(express.json()); 
app.use(express.urlencoded({extended: true}));

app.use('/uploads',express.static("uploads"))

// --- MySQL Connection Setup ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'CEiAdmin0',
    database: 'ceidb',
    port: 3306,
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database.');
});

//image fucker
const multer = require('multer')

const storage = multer.diskStorage({
    destination:(req,file,cb) => {
        cb(null,'uploads/');
    },
    filename: (req,file,cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    } 
});

const upload = multer({
    storage,
    limits: {fileSize: 2 * 1024 * 1024}, //2MB
})

//TOKEN (CHIT_KEY)
const JWT_SECRET = 'yourMom67';
const CAPTCHA_SECRET = '6LftoFgsAAAAACCggm1N1lOr6lRBF1fJUHvP3H-K';
const GOOGLE_CLIENT_ID = '7184441548-2ootutg0mua8l6rcmoeh3qamat5rsfa9.apps.googleusercontent.com'; 

// Initialize Google OAuth2 Client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Recaptcha verification function
async function verifyRecaptcha(token) {
  const response = await axios.post(
    'https://www.google.com/recaptcha/api/siteverify',
    null,
    {
      params: {
        secret: CAPTCHA_SECRET,
        response: token,
      },
    }
  );
  return response.data.success;
}


function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Token missing' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user; // { id, username }
        next();
    });
}

app.post('/api/register', upload.single('profile_image'),
  async (req, res) => {
    try {
      const { full_name, username, password, recaptchaToken } = req.body;

      if (!full_name || !username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
      }

    //   // Verify reCAPTCHA
    //   if (!recaptchaToken) {
    //     return res.status(400).json({ message: 'reCAPTCHA token is required' });
    //   }

    //   const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
    //   if (!isRecaptchaValid) {
    //     return res.status(400).json({ message: 'reCAPTCHA verification failed' });
    //   }

      // Check if username exists - ADD .promise()
      const [existing] = await db.promise().query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existing.length > 0) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      // Image path (optional)
      const profile_image = req.file
        ? `/uploads/${req.file.filename}`
        : null;

      // Insert user - ADD .promise()
      await db.promise().query(
        `INSERT INTO users (full_name, username, password_hash, profile_image)
         VALUES (?, ?, ?, ?)`,
        [full_name, username, password_hash, profile_image]
      );

      res.status(201).json({ message: 'User registered successfully' });

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


// ------------------------------------
// API: Authentication (Username Only)
// ------------------------------------
app.post('/api/login', async (req, res) => {
    const { username, password, recaptchaToken } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    // Verify reCAPTCHA
    if (!recaptchaToken) {
        return res.status(400).json({ message: 'reCAPTCHA token is required' });
    }

    try {
        const isRecaptchaValid = await verifyRecaptcha(recaptchaToken);
        if (!isRecaptchaValid) {
            return res.status(400).json({ message: 'reCAPTCHA verification failed' });
        }
    } catch (error) {
        console.error('reCAPTCHA verification error:', error);
        return res.status(500).json({ message: 'Server error during verification' });
    }

    try {
        const [rows] = await db.promise().query(  // ADD .promise()
            "SELECT * FROM users WHERE username = ?",
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid Credentials"})
        }

        const user = rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch){
            return res.status(401).json({message: "Invalid Credentials"});
        }
        const token = jwt.sign({
            id: user.id,
            username: user.username   
        },
        JWT_SECRET,
        { expiresIn: "1h"}
    );
    res.json({message:"Login Successful",token,user: {id:user.id,username:user.username,full_name:user.full_name}})

    } catch (error) {
        res.status(500).json({ message: "Server error"})
    }
});

// ------------------------------------
// API: Google OAuth Login
// ------------------------------------
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        // Verify the Google token
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: google_id, email, name, picture } = payload;

        // Log the payload for debugging
        // console.log('Google OAuth payload:', {
        //     google_id,
        //     email,
        //     name,
        //     picture,
        //     allKeys: Object.keys(payload)
        // });

        // Check if user exists by google_id
        const [existingUser] = await db.promise().query(
            'SELECT * FROM users WHERE google_id = ?',
            [google_id]
        );

        let user;
        if (existingUser.length > 0) {
            // User exists, login
            user = existingUser[0];
            // Update picture if it exists and not already set
            if (picture && !user.profile_image) {
                await db.promise().query(
                    'UPDATE users SET profile_image = ? WHERE id = ?',
                    [picture, user.id]
                );
                user.profile_image = picture;
            }
        } else {
            // User doesn't exist, create new account
            const [result] = await db.promise().query(
                `INSERT INTO users (google_id, email, username, full_name, profile_image, password_hash)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [google_id, email, name, name, picture || null, 'oauth-user']
            );
            user = {
                id: result.insertId,
                google_id,
                email,
                username: name,
                full_name: name,
                profile_image: picture || null
            };
        }

        // Create JWT token
        const jwtToken = jwt.sign({
            id: user.id,
            username: user.username
        },
        JWT_SECRET,
        { expiresIn: "1h"}
        );

        res.json({
            message: "Google login successful",
            token: jwtToken,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                profile_image: user.profile_image
            }
        });

    } catch (error) {
        console.error('Google OAuth error details:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ message: "Google authentication failed", error: error.message });
    }
});

// ------------------------------------
// API: Todo List (CRUD Operations)
// ------------------------------------

// 1. READ: Get all todos for a specific user
app.get('/api/todos', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    const [rows] = await db.promise().query(  // ADD .promise()
        "SELECT * FROM todo WHERE user_id = ? ORDER BY id DESC",
        [userId]
    );

    res.json(rows);
});


// 2. CREATE: Add a new todo item
app.post('/api/todos', authenticateToken, async (req, res) => {
  const { task, targetDatetime } = req.body;
  const userId = req.user.id;
  const username = req.user.username
  
  if (!task || !targetDatetime) {
    return res.status(400).json({
      message: "Task and targetDatetime are required"
    });
  }

  const [result] = await db.promise().query(  // ADD .promise()
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



// 3. UPDATE: Update status and/or targetDatetime
app.put('/api/todos/:id', authenticateToken, async (req, res) => {
    const { status, targetDatetime } = req.body;
    const userId = req.user.id;
    const todoId = req.params.id;

    // Convert ISO datetime to MySQL format
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


// 4. DELETE: Remove a todo item
app.delete('/api/todos/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const todoId = req.params.id;

    const [result] = await db.promise().query(  // ADD .promise()
        "DELETE FROM todo WHERE id = ? AND user_id = ?",
        [todoId, userId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted' });
});


app.get('/api/profile/:username', async (req, res) => {
  try {
    const [result] = await db.promise().query(  // ADD .promise()
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

// Return list of users for dropdowns (requires auth)
app.get('/api/users', authenticateToken, async (req, res) => {
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

// Get members of a specific team
app.get('/api/teams/:teamId/members', authenticateToken, async (req, res) => {
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

app.put(
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

      // Get current profile image
      const [currentUser] = await db.promise().query(
        'SELECT profile_image FROM users WHERE id = ?',
        [userId]
      );

      // Use new image if uploaded, otherwise keep existing image
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

// Start the server

// --- Team & Team-Task Helpers and Routes ---

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

// Create a new team. Creator becomes the team admin.
app.post('/api/teams', authenticateToken, async (req, res) => {
  try {
    const { name, members } = req.body; // members: optional array of user IDs
    const creatorId = req.user.id;

    if (!name) return res.status(400).json({ message: 'Team name required' });

    const [result] = await db.promise().query(
      'INSERT INTO teams (name, created_by) VALUES (?, ?)',
      [name, creatorId]
    );

    const teamId = result.insertId;

    // Add creator as admin
    await db.promise().query(
      'INSERT INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, 1)',
      [teamId, creatorId]
    );

    // Optionally add other members (non-admin)
    if (Array.isArray(members)) {
      for (const uid of members) {
        if (uid === creatorId) continue;
        try {
          await db.promise().query(
            'INSERT IGNORE INTO team_members (team_id, user_id, is_admin) VALUES (?, ?, 0)',
            [teamId, uid]
          );
        } catch (e) {
          // ignore individual member add errors
        }
      }
    }

    res.status(201).json({ message: 'Team created', teamId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get teams for the logged-in user (as member or admin)
app.get('/api/teams', authenticateToken, async (req, res) => {
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

// Add a member to a team (admin only)
app.post('/api/teams/:teamId/members', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const { user_id } = req.body;
    const actorId = req.user.id;

    if (!await isTeamAdmin(teamId, actorId)) {
      return res.status(403).json({ message: 'Only team admin can add members' });
    }

    // ensure user exists
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

// Remove a member from a team (admin only)
app.delete('/api/teams/:teamId/members/:userId', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const userId = req.params.userId;
    const actorId = req.user.id;

    if (!await isTeamAdmin(teamId, actorId)) {
      return res.status(403).json({ message: 'Only team admin can remove members' });
    }

    // prevent removing the last admin or self-removal that would leave no admin
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

// Create a team task (admin only). Assign to a single team member.
app.post('/api/teams/:teamId/tasks', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const { title, description, assignee_id, targetDatetime } = req.body;
    const actorId = req.user.id;

    if (!title) return res.status(400).json({ message: 'Title required' });

    if (!await isTeamAdmin(teamId, actorId)) {
      return res.status(403).json({ message: 'Only team admin can create tasks' });
    }

    // if assignee provided, ensure they are a member
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

// Get tasks for a team (members can view)
app.get('/api/teams/:teamId/tasks', authenticateToken, async (req, res) => {
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

// Update task status/targetDatetime (only team admin or assigned user)
app.put('/api/teams/:teamId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const taskId = req.params.taskId;
    const userId = req.user.id;
    const { status, targetDatetime } = req.body;

    // fetch task
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

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});