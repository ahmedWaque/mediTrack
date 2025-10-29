const express = require('express');
const authMiddleware = require('../middleware/auth');
const pool = require('../db/pool');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// validate log data
const validateLogData = (logData) => {
  const { log_id, item_id, action, details } = logData;
  
  if (!log_id || !item_id || !action) {
    return { valid: false, error: 'log_id, item_id, and action are required' };
  }
  
  if (log_id.length > 12 || !/^[A-Za-z0-9]{1,12}$/.test(log_id)) {
    return { valid: false, error: 'log_id must be 1-12 characters, alphanumeric only' };
  }
  
  if (item_id.length > 12 || !/^[A-Za-z0-9]{1,12}$/.test(item_id)) {
    return { valid: false, error: 'item_id must be 1-12 characters, alphanumeric only' };
  }
  
  if (action.length > 50) {
    return { valid: false, error: 'action must be 50 characters or less' };
  }
  
  return { valid: true };
};

// log entries
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.name as user_name, i.item_name 
      FROM logs l 
      LEFT JOIN users u ON l.user_id = u.user_id 
      LEFT JOIN inventory i ON l.item_id = i.item_id 
      ORDER BY l.timestamp DESC
    `);
    
    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Error fetching logs' });
  }
});

//specific log entry
router.get('/:logId', async (req, res) => {
  const { logId } = req.params;

  try {
    const result = await pool.query(`
      SELECT l.*, u.name as user_name, i.item_name 
      FROM logs l 
      LEFT JOIN users u ON l.user_id = u.user_id 
      LEFT JOIN inventory i ON l.item_id = i.item_id 
      WHERE l.log_id = $1
    `, [logId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    res.json({ log: result.rows[0] });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ message: 'Error fetching log' });
  }
});

//Add log entry
router.post('/', async (req, res) => {
  const { log_id, item_id, action, details } = req.body;

  // Validate input
  const validation = validateLogData({ log_id, item_id, action, details });
  if (!validation.valid) {
    return res.status(400).json({ message: validation.error });
  }

  try {
    // Check if log_id already exists
    const existingLog = await pool.query('SELECT log_id FROM logs WHERE log_id = $1', [log_id]);
    if (existingLog.rows.length > 0) {
      return res.status(400).json({ message: 'Log ID already exists' });
    }

    // Check if item exists
    const itemExists = await pool.query('SELECT item_id FROM inventory WHERE item_id = $1', [item_id]);
    if (itemExists.rows.length === 0) {
      return res.status(400).json({ message: 'Item does not exist' });
    }

    const result = await pool.query(
      'INSERT INTO logs (log_id, user_id, item_id, action, details) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [log_id, req.user.user_id, item_id, action, details || null]
    );

    res.status(201).json({ log: result.rows[0] });
  } catch (error) {
    console.error('Error adding log:', error);
    res.status(500).json({ message: 'Error adding log' });
  }
});

//Update log entry
router.put('/:logId', async (req, res) => {
  const { logId } = req.params;
  const { item_id, action, details } = req.body;

  try {
    // Check if log exists
    const existingLog = await pool.query('SELECT * FROM logs WHERE log_id = $1', [logId]);
    if (existingLog.rows.length === 0) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    // Validate item_id if provided
    if (item_id) {
      const itemExists = await pool.query('SELECT item_id FROM inventory WHERE item_id = $1', [item_id]);
      if (itemExists.rows.length === 0) {
        return res.status(400).json({ message: 'Item does not exist' });
      }
    }

    // Validate action if provided
    if (action && action.length > 50) {
      return res.status(400).json({ message: 'Action must be 50 characters or less' });
    }

    const result = await pool.query(
      'UPDATE logs SET item_id = COALESCE($1, item_id), action = COALESCE($2, action), details = COALESCE($3, details) WHERE log_id = $4 RETURNING *',
      [item_id, action, details, logId]
    );

    res.json({ log: result.rows[0] });
  } catch (error) {
    console.error('Error updating log:', error);
    res.status(500).json({ message: 'Error updating log' });
  }
});

// Note: No DELETE route adding this in the future,
// after I have created a way to save log data incase accidental deletion occurs

module.exports = router;
