const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const ensureDashStyleConstraint = async () => {
  await pool.query('ALTER TABLE user_style DROP CONSTRAINT IF EXISTS user_style_dash_style_check');
  await pool.query(
    `ALTER TABLE user_style
     ADD CONSTRAINT user_style_dash_style_check
     CHECK (dash_style IN ('blue', 'green', 'grey', 'orange'))`
  );
};

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await pool.query(
      'SELECT sesh_limit, dash_style FROM user_style WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      const userResult = await pool.query(
        'SELECT name FROM users WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      await pool.query(
        'INSERT INTO user_style (user_id, user_name, sesh_limit, dash_style) VALUES ($1, $2, $3, $4)',
        [userId, userResult.rows[0].name, 0, 'blue']
      );

      return res.json({ sesh_limit: 0, dash_style: 'blue' });
    }

    res.json({
      sesh_limit: result.rows[0].sesh_limit,
      dash_style: result.rows[0].dash_style
    });
  } catch (error) {
    console.error('Error fetching user settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { sesh_limit, dash_style } = req.body;

    if (sesh_limit !== undefined && (sesh_limit < 0 || sesh_limit > 5)) {
      return res.status(400).json({ message: 'Invalid sesh_limit value' });
    }

    if (dash_style && !['blue', 'green', 'grey', 'orange'].includes(dash_style)) {
      return res.status(400).json({ message: 'Invalid dash_style value' });
    }

    const userResult = await pool.query(
      'SELECT name FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await pool.query(
      'SELECT * FROM user_style WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length === 0) {
      try {
        await pool.query(
          'INSERT INTO user_style (user_id, user_name, sesh_limit, dash_style) VALUES ($1, $2, $3, $4)',
          [
            userId,
            userResult.rows[0].name,
            sesh_limit !== undefined ? sesh_limit : 0,
            dash_style || 'blue'
          ]
        );
      } catch (error) {
        if (error.code === '23514' && error.constraint === 'user_style_dash_style_check') {
          await ensureDashStyleConstraint();
          await pool.query(
            'INSERT INTO user_style (user_id, user_name, sesh_limit, dash_style) VALUES ($1, $2, $3, $4)',
            [
              userId,
              userResult.rows[0].name,
              sesh_limit !== undefined ? sesh_limit : 0,
              dash_style || 'blue'
            ]
          );
        } else {
          throw error;
        }
      }
    } else {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (sesh_limit !== undefined) {
        updates.push(`sesh_limit = $${paramCount}`);
        values.push(sesh_limit);
        paramCount++;
      }

      if (dash_style) {
        updates.push(`dash_style = $${paramCount}`);
        values.push(dash_style);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      values.push(userId);
      try {
        await pool.query(
          `UPDATE user_style SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
          values
        );
      } catch (error) {
        if (error.code === '23514' && error.constraint === 'user_style_dash_style_check') {
          await ensureDashStyleConstraint();
          await pool.query(
            `UPDATE user_style SET ${updates.join(', ')} WHERE user_id = $${paramCount}`,
            values
          );
        } else {
          throw error;
        }
      }
    }

    const updated = await pool.query(
      'SELECT sesh_limit, dash_style FROM user_style WHERE user_id = $1',
      [userId]
    );

    res.json({
      sesh_limit: updated.rows[0].sesh_limit,
      dash_style: updated.rows[0].dash_style
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/password/verify', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const userResult = await pool.query(
      'SELECT password FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    let passwordMatches = false;

    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      passwordMatches = await bcrypt.compare(password, user.password);
    } else {
      passwordMatches = user.password === password;
    }

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Password is incorrect' });
    }

    res.json({ message: 'Password verified' });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/password', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const userResult = await pool.query(
      'SELECT password FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    let passwordMatches = false;

    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      passwordMatches = await bcrypt.compare(currentPassword, user.password);
    } else {
      passwordMatches = user.password === currentPassword;
    }

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    await pool.query(
      'UPDATE users SET password = $1 WHERE user_id = $2',
      [newPassword, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

