const crypto = require('crypto');
const pool = require('../db/pool');

const EXPIRY_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const toCamelCase = (row) => ({
  id: row.report_id,
  type: row.report_type,
  period: row.period,
  referenceDate: row.reference_date,
  fileName: row.file_name,
  createdAt: row.created_at,
  expiresAt: row.expires_at
});

const ensureCustomPeriodConstraint = async () => {
  await pool.query('ALTER TABLE audit_reports DROP CONSTRAINT IF EXISTS audit_reports_period_check');
  await pool.query(
    `ALTER TABLE audit_reports
     ADD CONSTRAINT audit_reports_period_check
     CHECK (period IN ('day', 'week', 'month', 'custom'))`
  );
};

const insertAuditReport = async ({
  reportId,
  reportType,
  period,
  referenceDate,
  fileName,
  buffer,
  createdAt,
  expiresAt
}) => {
  await pool.query(
    `INSERT INTO audit_reports (report_id, report_type, period, reference_date, file_name, file_data, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      reportId,
      reportType,
      period,
      referenceDate ? new Date(referenceDate) : null,
      fileName,
      buffer,
      createdAt,
      expiresAt
    ]
  );
};

const saveAuditReport = async ({
  reportType,
  period,
  referenceDate,
  fileName,
  buffer
}) => {
  const reportId = crypto.randomUUID();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + EXPIRY_DURATION_MS);

  try {
    await insertAuditReport({
      reportId,
      reportType,
      period,
      referenceDate,
      fileName,
      buffer,
      createdAt,
      expiresAt
    });
  } catch (error) {
    if (error.code === '23514') {
      await ensureCustomPeriodConstraint();
      await insertAuditReport({
        reportId,
        reportType,
        period,
        referenceDate,
        fileName,
        buffer,
        createdAt,
        expiresAt
      });
    } else {
      throw error;
    }
  }

  return {
    id: reportId,
    type: reportType,
    period,
    referenceDate: referenceDate ? new Date(referenceDate) : null,
    fileName,
    createdAt,
    expiresAt
  };
};

const getAuditReports = async () => {
  const { rows } = await pool.query(
    `SELECT report_id, report_type, period, reference_date, file_name, created_at, expires_at
     FROM audit_reports
     WHERE expires_at >= NOW()
     ORDER BY created_at DESC`
  );

  return rows.map(toCamelCase);
};

const getAuditReportById = async (reportId) => {
  const { rows } = await pool.query(
    `SELECT report_id, report_type, period, reference_date, file_name, file_data, created_at, expires_at
     FROM audit_reports
     WHERE report_id = $1 AND expires_at >= NOW()`,
    [reportId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];

  return {
    id: row.report_id,
    type: row.report_type,
    period: row.period,
    referenceDate: row.reference_date,
    fileName: row.file_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    fileData: row.file_data
  };
};

const deleteExpiredAuditReports = async () => {
  const { rowCount } = await pool.query(
    'DELETE FROM audit_reports WHERE expires_at < NOW()'
  );

  return rowCount;
};

const deleteAuditReportById = async (reportId) => {
  if (!reportId) {
    return 0;
  }

  const { rowCount } = await pool.query('DELETE FROM audit_reports WHERE report_id = $1', [
    reportId
  ]);

  return rowCount;
};

const deleteAuditReportsByIds = async (reportIds = []) => {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return 0;
  }

  const { rowCount } = await pool.query(
    'DELETE FROM audit_reports WHERE report_id = ANY($1::text[])',
    [reportIds]
  );

  return rowCount;
};

module.exports = {
  saveAuditReport,
  getAuditReports,
  getAuditReportById,
  deleteExpiredAuditReports,
  deleteAuditReportById,
  deleteAuditReportsByIds
};


