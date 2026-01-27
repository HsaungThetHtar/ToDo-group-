// server.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt')
const path = require('path')
const jwt = require('jsonwebtoken')

const app = express();
const port = 5001;

// Middleware setup
app.use(cors()); // Allow cross-origin requests from React frontend
app.use(express.json()); // Enable reading JSON data from request body
app.use(express.urlencoded({extended: true}));

app.use('/uploads',express.static("uploads"))

// --- MySQL Connection Setup ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // CHANGE THIS to your MySQL username
    password: 'CEiAdmin0', // CHANGE THIS to your MySQL password
    database: 'ceidb', // Ensure this matches your database name
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
const JWT_SECRET = 'Super_Chit_key';

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
      const { full_name, username, password } = req.body;

      if (!full_name || !username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
      }

      // Check if username exists
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

      // Insert user
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
    // In this simplified system, we grant "login" access if a username is provided.
    // WARNING: This is highly insecure and should not be used in a real-world app.
    const { username,password } = req.body;
    if (!username || !password) {
        return res.status(400).send({ message: 'Missing fields' });
    }
    try {
        const [rows] = await db.promise().query(
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
// API: Todo List (CRUD Operations)
// ------------------------------------

// 1. READ: Get all todos for a specific user
app.get('/api/todos', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    const [rows] = await db.promise().query(
        "SELECT * FROM todo WHERE user_id = ? ORDER BY id DESC",
        [userId]
    );

    res.json(rows);
});


// 2. CREATE: Add a new todo item
app.post('/api/todos', authenticateToken, async (req, res) => {
  const { task, targetDatetime } = req.body;
  const userId = req.user.id;

  if (!task || !targetDatetime) {
    return res.status(400).json({
      message: "Task and targetDatetime are required"
    });
  }

  const [result] = await db.query(
    'INSERT INTO todo (user_id, task, target_datetime) VALUES (?, ?, ?)',
    [userId, task, targetDatetime]
  );

  res.json({
    id: result.insertId,
    task,
    status: 'Todo',
    targetDatetime
  });
});



// 3. UPDATE: Update status and/or targetDatetime
app.put('/api/todos/:id', authenticateToken, async (req, res) => {
    const { status, targetDatetime } = req.body;
    const userId = req.user.id;
    const todoId = req.params.id;

    const [result] = await db.promise().query(
        `UPDATE todo 
         SET status = ?, targetDatetime = ?
         WHERE id = ? AND user_id = ?`,
        [status, targetDatetime, todoId, userId]
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

    const [result] = await db.promise().query(
        "DELETE FROM todo WHERE id = ? AND user_id = ?",
        [todoId, userId]
    );

    if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted' });
});


app.get('/api/profile/:username', (req, res) => {
  db.query(
    'SELECT full_name, profile_image FROM users WHERE username = ?',
    [req.params.username],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.send(result[0]);
    }
  );
});

app.put(
  '/api/profile',
  authenticateToken,
  upload.single('profile_image'),
  (req, res) => {
    const { full_name } = req.body;
    const imagePath = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    if (!full_name) {
      return res.status(400).json({ message: 'Full name is required' });
    }

    let sql = 'UPDATE users SET full_name = ?';
    let params = [full_name];

    if (imagePath) {
      sql += ', profile_image = ?';
      params.push(imagePath);
    }

    sql += ' WHERE id = ?';
    params.push(req.user.id);

    db.query(sql, params, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Database error' });
      }

      res.json({ message: 'Profile updated successfully', profile_image: imagePath });
    });
  }
);


// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});