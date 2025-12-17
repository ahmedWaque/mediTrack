const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const pool = require('../db/pool');

const router = express.Router();

router.use(authMiddleware);

const { logAction } = require('../utils/logger');

// GET /alert - Get all pending requests (Managers only)
router.get('/', roleAuth('m'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM requests WHERE status = $1 ORDER BY request_id DESC',
      ['pending']
    );
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Error fetching alert requests:', error);
    res.status(500).json({ message: 'Error fetching alert requests' });
  }
});

// PUT /alert/:requestId - Update request status (approve/deny) (Managers only)
router.put('/:requestId', roleAuth('m'), async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!status || !['approved', 'denied'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "approved" or "denied"' });
  }

  try {
    // Get the request details
    const requestResult = await pool.query(
      'SELECT * FROM requests WHERE request_id = $1',
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }

    // Update the request status
    const updateResult = await pool.query(
      'UPDATE requests SET status = $1 WHERE request_id = $2 RETURNING *',
      [status, requestId]
    );

    // Log the action - details should contain request_id and nurse's name
    const action = status === 'approved' ? 'approved' : 'denied';
    const details = `Request ID: ${request.request_id}, Nurse: ${request.name}`;
    await logAction(req.user.user_id, request.item_id, action, details);

    res.json({ request: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating alert request:', error);
    res.status(500).json({ message: 'Error updating alert request' });
  }
});

module.exports = router;

