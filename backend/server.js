// server.js

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 5001;

// Middleware setup
app.use(cors()); // Allow cross-origin requests from React frontend
app.use(express.json()); // Enable reading JSON data from request body

// --- MySQL Connection Setup ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // CHANGE THIS to your MySQL username
    password: 'CEiAdmin0', // CHANGE THIS to your MySQL password
    database: 'ceidb' // Ensure this matches your database name
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL Database.');
});

// ------------------------------------
// API: Authentication (Username Only)
// ------------------------------------
app.post('/api/login', (req, res) => {
    // In this simplified system, we grant "login" access if a username is provided.
    // WARNING: This is highly insecure and should not be used in a real-world app.
    const { username } = req.body;
    if (!username) {
        return res.status(400).send({ message: 'Username is required' });
    }
    
    // Success response includes the username
    res.send({ 
        success: true, 
        message: 'Login successful', 
        user: { username: username }
    });
});

// ------------------------------------
// API: Todo List (CRUD Operations)
// ------------------------------------

// 1. READ: Get all todos for a specific user
app.get('/api/todos/:username', (req, res) => {
    const { username } = req.params;
    const sql = 'SELECT id, task, status, targetDatetime, updated FROM todo WHERE username = ? ORDER BY id DESC';
    db.query(sql, [username], (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

// 2. CREATE: Add a new todo item
app.post('/api/todos', (req, res) => {
    const { username, task, status = 'Todo', targetDatetime } = req.body;
    if (!username || !task || !targetDatetime) {
        return res.status(400).send({ message: 'Username, task, and targetDatetime are required' });
    }
    // Note: 'status' defaults to 'Todo' and 'targetDatetime' is required
    const sql = 'INSERT INTO todo (username, task, status, targetDatetime) VALUES (?, ?, ?, ?)';
    db.query(sql, [username, task, status, targetDatetime], (err, result) => {
        if (err) return res.status(500).send(err);
        // Return the created item details including the new ID
        res.status(201).send({ id: result.insertId, username, task, status, targetDatetime, updated: new Date() });
    });
});

// 3. UPDATE: Update status and/or targetDatetime
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const { status, targetDatetime } = req.body; 
    
    let sql = 'UPDATE todo SET ';
    let params = [];
    
    if (status !== undefined) {
        sql += 'status = ?';
        params.push(status);
    }
    
    if (targetDatetime !== undefined) {
        if (params.length > 0) sql += ', ';
        sql += 'targetDatetime = ?';
        params.push(targetDatetime);
    }
    
    sql += ' WHERE id = ?';
    params.push(id);
    
    db.query(sql, params, (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Todo not found' });
        }
        res.send({ message: 'Todo updated successfully' });
    });
});

// 4. DELETE: Remove a todo item
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM todo WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).send(err);
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: 'Todo not found' });
        }
        res.send({ message: 'Todo deleted successfully' });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});