const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const pool = require('../db/pool');

const router = express.Router();

router.use(authMiddleware);

const { logAction } = require('../utils/logger');

// Helper function to generate request_id in format REQMMDDYYXXX
const generateRequestId = async () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2); // Last 2 digits of year (YY)
  const dateStr = `${month}${day}${year}`; // MMDDYY format
  
  // Find how many requests exist for today
  const existingRequests = await pool.query(
    'SELECT request_id FROM requests WHERE request_id LIKE $1',
    [`REQ${dateStr}%`]
  );
  const sequence = String(existingRequests.rows.length + 1).padStart(3, '0');
  return `REQ${dateStr}${sequence}`; // REQ + MMDDYY + XXX = 12 characters total
};

// POST /requests - Create a new medicine request (Nurses only)
router.post('/', roleAuth('n'), async (req, res) => {
  const { item_id, item_name } = req.body;

  if (!item_id || !item_name) {
    return res.status(400).json({ message: 'Item ID and item name are required' });
  }

  try {
    // Verify the item exists in inventory
    const itemCheck = await pool.query(
      'SELECT item_id, item_name FROM inventory WHERE item_id = $1',
      [item_id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found in inventory' });
    }

    // Generate request_id
    const request_id = await generateRequestId();

    // Create the request
    const result = await pool.query(
      'INSERT INTO requests (request_id, user_id, name, item_id, item_name, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [request_id, req.user.user_id, req.user.name, item_id, item_name, 'pending']
    );

    res.status(201).json({ request: result.rows[0] });
  } catch (error) {
    console.error('Error creating request:', error);
    res.status(500).json({ 
      message: 'Error creating request',
      error: error.message
    });
  }
});

module.exports = router;

