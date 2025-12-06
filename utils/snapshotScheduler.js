const {
  ensureDailySnapshot,
  pruneSnapshotsOlderThan
} = require('./snapshots');
const { deleteExpiredAuditReports } = require('./auditStorage');

const RUN_HOUR = 0;
const RUN_MINUTE = 5;
const RETENTION_MONTHS = 2;

const getNextRunDelay = () => {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(RUN_HOUR, RUN_MINUTE, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return Math.max(1000, nextRun.getTime() - now.getTime());
};

const runDailyMaintenance = async () => {
  const now = new Date();

  try {
    await ensureDailySnapshot(now);

    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
    cutoff.setHours(0, 0, 0, 0);

    await pruneSnapshotsOlderThan(cutoff);
    await deleteExpiredAuditReports();
  } catch (error) {
    console.error('Snapshot maintenance error:', error.message || error);
  }
};

const scheduleNextRun = () => {
  const delay = getNextRunDelay();

  setTimeout(async () => {
    await runDailyMaintenance();
    scheduleNextRun();
  }, delay);
};

const startSnapshotScheduler = async () => {
  await runDailyMaintenance();
  scheduleNextRun();
};

module.exports = { startSnapshotScheduler };


