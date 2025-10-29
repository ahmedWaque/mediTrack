const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

router.post('/', async (req, res) => {
  const { user_id, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT user_id, name, role, password FROM users WHERE user_id = $1',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = result.rows[0];

    // Check password (supports bcrypt hashed or plain text)
    let passwordMatches = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else {
      passwordMatches = user.password === password;
    }

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        user_id: user.user_id,
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({
      token: token,
      user: {
        user_id: user.user_id,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
