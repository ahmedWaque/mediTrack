const pool = require('../db/pool');

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

const captureInventorySnapshot = async (snapshotAt = new Date()) => {
  const snapshotTimestamp = new Date(snapshotAt);

  if (Number.isNaN(snapshotTimestamp.getTime())) {
    throw new Error('Invalid snapshot date provided');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { rows: inventoryRows } = await client.query(
      'SELECT item_id, item_name, quantity FROM inventory ORDER BY item_id'
    );

    for (const item of inventoryRows) {
      await client.query(
        `INSERT INTO inventory_snapshots (snapshot_at, item_id, item_name, quantity)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (snapshot_at, item_id)
         DO UPDATE SET
           item_name = EXCLUDED.item_name,
           quantity = EXCLUDED.quantity,
           created_at = NOW()`,
        [snapshotTimestamp, item.item_id, item.item_name, item.quantity ?? 0]
      );
    }

    await client.query('COMMIT');

    return { snapshotAt: snapshotTimestamp, count: inventoryRows.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const ensureDailySnapshot = async (date = new Date()) => {
  const dayStart = startOfDay(date);
  const nextDay = addDays(dayStart, 1);

  const existing = await pool.query(
    'SELECT 1 FROM inventory_snapshots WHERE snapshot_at >= $1 AND snapshot_at < $2 LIMIT 1',
    [dayStart, nextDay]
  );

  if (existing.rowCount > 0) {
    return false;
  }

  await captureInventorySnapshot(dayStart);
  return true;
};

const getLatestSnapshotBefore = async (date = new Date()) => {
  const target = new Date(date);

  if (Number.isNaN(target.getTime())) {
    throw new Error('Invalid target date');
  }

  const latestSnapshotResult = await pool.query(
    `SELECT snapshot_at
     FROM inventory_snapshots
     WHERE snapshot_at <= $1
     ORDER BY snapshot_at DESC
     LIMIT 1`,
    [target]
  );

  if (latestSnapshotResult.rows.length === 0) {
    return null;
  }

  const snapshotAt = latestSnapshotResult.rows[0].snapshot_at;

  const detailsResult = await pool.query(
    `SELECT item_id, item_name, quantity
     FROM inventory_snapshots
     WHERE snapshot_at = $1
     ORDER BY item_name`,
    [snapshotAt]
  );

  return {
    snapshotAt,
    rows: detailsResult.rows
  };
};

const pruneSnapshotsOlderThan = async (cutoffDate) => {
  if (!cutoffDate) {
    return 0;
  }

  const cutoff = new Date(cutoffDate);

  if (Number.isNaN(cutoff.getTime())) {
    throw new Error('Invalid cutoff date');
  }

  const result = await pool.query(
    'DELETE FROM inventory_snapshots WHERE snapshot_at < $1',
    [cutoff]
  );

  return result.rowCount;
};

module.exports = {
  addDays,
  captureInventorySnapshot,
  ensureDailySnapshot,
  getLatestSnapshotBefore,
  pruneSnapshotsOlderThan,
  startOfDay
};


