const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const pool = require('../db/pool');

const router = express.Router();

router.use(authMiddleware);

// Helper function to log actions
const logAction = async (user_id, item_id, action, details) => {
  await pool.query(
    'INSERT INTO logs (log_id, user_id, item_id, action, details) VALUES ($1, $2, $3, $4, $5)',
    [`LOG${Date.now()}`, user_id, item_id, action, details]
  );
};

// GET /inventory
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY item_name');
    res.json({ inventory: result.rows });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Error fetching inventory' });
  }
});

// GET /inventory/:itemId
router.get('/:itemId', async (req, res) => {
  const { itemId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM inventory WHERE item_id = $1', [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Error fetching item' });
  }
});

// POST /inventory - Add new item (Managers and Directors only)
router.post('/', roleAuth('m', 'd'), async (req, res) => {
  const { item_id, item_name, quantity } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO inventory (item_id, item_name, quantity) VALUES ($1, $2, $3) RETURNING *',
      [item_id, item_name, quantity || 0]
    );

    await logAction(req.user.user_id, item_id, 'added', `${req.user.name} added ${item_name}`);

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error adding item:', error);
    res.status(500).json({ message: 'Error adding item' });
  }
});

// PUT /inventory/:itemId - Update item
// Nurses can only update quantity, Managers and Directors can update all fields
router.put('/:itemId', async (req, res) => {
  const { itemId } = req.params;
  const { item_name, quantity } = req.body;

  try {
    const currentItem = await pool.query('SELECT * FROM inventory WHERE item_id = $1', [itemId]);

    if (currentItem.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    let result;
    let details;

    // Nurses can only update quantity
    if (req.user.role === 'n') {
      if (item_name && item_name !== currentItem.rows[0].item_name) {
        return res.status(403).json({ message: 'Nurses can only update quantity' });
      }
      result = await pool.query(
        'UPDATE inventory SET quantity = $1 WHERE item_id = $2 RETURNING *',
        [quantity, itemId]
      );
      details = `${req.user.name} updated quantity of ${currentItem.rows[0].item_name}`;
    } else {
      // Managers and Directors can update all fields
      result = await pool.query(
        'UPDATE inventory SET item_name = $1, quantity = $2 WHERE item_id = $3 RETURNING *',
        [item_name, quantity, itemId]
      );
      details = `${req.user.name} updated ${item_name || currentItem.rows[0].item_name}`;
    }

    await logAction(req.user.user_id, itemId, 'updated', details);

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ message: 'Error updating item' });
  }
});

// DELETE /inventory/:itemId - Delete item (Directors only)
router.delete('/:itemId', roleAuth('d'), async (req, res) => {
  const { itemId } = req.params;

  try {
    const result = await pool.query('DELETE FROM inventory WHERE item_id = $1 RETURNING *', [itemId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await logAction(req.user.user_id, itemId, 'deleted', `${req.user.name} deleted ${result.rows[0].item_name}`);

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

module.exports = router;
