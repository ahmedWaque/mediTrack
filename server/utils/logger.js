const pool = require('../db/pool');

// Helper function to log actions to the logs table
const logAction = async (user_id, item_id, action, details, alert_level = 'normal') => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${month}${day}${year}`;
  
  const existingLogs = await pool.query(
    'SELECT log_id FROM logs WHERE log_id LIKE $1',
    [`LOG${dateStr}%`]
  );
  const sequence = String(existingLogs.rows.length + 1).padStart(3, '0');
  const log_id = `LOG${dateStr}${sequence}`;
  
  await pool.query(
    'INSERT INTO logs (log_id, user_id, item_id, action, details, alert_level) VALUES ($1, $2, $3, $4, $5, $6)',
    [log_id, user_id, item_id, action, details, alert_level]
  );
};

module.exports = { logAction };

