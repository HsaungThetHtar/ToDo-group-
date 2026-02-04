const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 5001;

// modular pieces
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const teamRoutes = require('./routes/teams');
const profileRoutes = require('./routes/profile');
const usersRoutes = require('./routes/users');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount route modules
app.use(authRoutes);
app.use(todoRoutes);
app.use(teamRoutes);
app.use(profileRoutes);
app.use(usersRoutes);

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});