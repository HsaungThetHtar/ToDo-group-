const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

const db = require('../config/db');
const upload = require('../middleware/upload');
const { JWT_SECRET } = require('../middleware/auth');

const CAPTCHA_SECRET = '6LftoFgsAAAAACCggm1N1lOr6lRBF1fJUHvP3H-K';
const GOOGLE_CLIENT_ID = '7184441548-2ootutg0mua8l6rcmoeh3qamat5rsfa9.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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

router.post('/api/register', upload.single('profile_image'),
  async (req, res) => {
    try {
      const { full_name, username, password, recaptchaToken } = req.body;

      if (!full_name || !username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
      }

      const [existing] = await db.promise().query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existing.length > 0) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

      const profile_image = req.file
        ? `/uploads/${req.file.filename}`
        : null;

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

router.post('/api/login', async (req, res) => {
    const { username, password, recaptchaToken } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

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

router.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: google_id, email, name, picture } = payload;

        const [existingUser] = await db.promise().query(
            'SELECT * FROM users WHERE google_id = ?',
            [google_id]
        );

        let user;
        if (existingUser.length > 0) {
            user = existingUser[0];
            if (picture && !user.profile_image) {
                await db.promise().query(
                    'UPDATE users SET profile_image = ? WHERE id = ?',
                    [picture, user.id]
                );
                user.profile_image = picture;
            }
        } else {
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

module.exports = router;
