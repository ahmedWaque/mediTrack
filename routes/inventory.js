const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const pool = require('../db/pool');

const router = express.Router();

router.use(authMiddleware);

const { logAction } = require('../utils/logger');
const { calculateAlertLevel } = require('../utils/securityConfig');

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

    await logAction(req.user.user_id, item_id, 'added', 'added');

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

    const previousQuantity = Number(currentItem.rows[0].quantity) || 0;
    let result;

    // Nurses can only update quantity
    if (req.user.role === 'n') {
      if (item_name && item_name !== currentItem.rows[0].item_name) {
        return res.status(403).json({ message: 'Nurses can only update quantity' });
      }
      result = await pool.query(
        'UPDATE inventory SET quantity = $1 WHERE item_id = $2 RETURNING *',
        [quantity, itemId]
      );
    } else {
      // Managers and Directors can update all fields
      result = await pool.query(
        'UPDATE inventory SET item_name = $1, quantity = $2 WHERE item_id = $3 RETURNING *',
        [item_name, quantity, itemId]
      );
    }

    const updatedQuantity = Number(result.rows[0]?.quantity) || 0;
    const details = `updated count from ${previousQuantity} to ${updatedQuantity}`;
    
    // Calculate alert level based on quantity change
    const alertLevel = calculateAlertLevel(previousQuantity, updatedQuantity);

    await logAction(req.user.user_id, itemId, 'updated count', details, alertLevel);

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

    await logAction(req.user.user_id, itemId, 'deleted', 'deleted');

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item' });
  }
});

module.exports = router;
