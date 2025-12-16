const express = require('express');
const PDFDocument = require('pdfkit');

const authMiddleware = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const pool = require('../db/pool');
const { getLatestSnapshotBefore } = require('../utils/snapshots');
const {
  saveAuditReport,
  getAuditReports,
  getAuditReportById,
  deleteAuditReportById,
  deleteAuditReportsByIds
} = require('../utils/auditStorage');

const router = express.Router();

router.use(authMiddleware);
router.use(roleAuth('d'));

// ----- Configuration -----
const SUPPORTED_PERIODS = new Set(['day', 'week', 'month']);
const SUPPORTED_TYPES = new Set(['inventory', 'logs']);

const roleLabels = {
  n: 'Nurse',
  m: 'Manager',
  d: 'Director'
};

// ----- Date helpers -----
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, amount) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const getPeriodRanges = (period, referenceDate = new Date()) => {
  const reference = new Date(referenceDate);

  if (Number.isNaN(reference.getTime())) {
    throw new Error('Invalid reference date');
  }

  let currentStart;
  let currentEnd;
  let previousStart;
  let previousEnd;
  let label;

  switch (period) {
    case 'day':
      currentStart = startOfDay(reference);
      currentEnd = addDays(currentStart, 1);
      previousStart = addDays(currentStart, -1);
      previousEnd = currentStart;
      label = `Daily audit for ${formatDate(currentStart)}`;
      break;
    case 'week': {
      const currentDay = reference.getDay();
      const diffToMonday = (currentDay + 6) % 7; // Monday = 0
      currentStart = addDays(startOfDay(reference), -diffToMonday);
      currentEnd = addDays(currentStart, 7);
      previousStart = addDays(currentStart, -7);
      previousEnd = currentStart;
      label = `Weekly audit (week of ${formatDate(currentStart)})`;
      break;
    }
    case 'month':
      currentStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
      currentEnd = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
      previousStart = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
      previousEnd = new Date(reference.getFullYear(), reference.getMonth(), 1);
      label = `Monthly audit (${currentStart.toLocaleString('default', {
        month: 'long',
        year: 'numeric'
      })})`;
      break;
    default:
      throw new Error(`Unsupported period: ${period}`);
  }

  return {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    label
  };
};

// ----- Formatting helpers for readable PDF output -----
const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

const formatDateRange = (start, endExclusive) => {
  const inclusiveEnd = new Date(endExclusive.getTime() - 1);
  return `${formatDate(start)} to ${formatDate(inclusiveEnd)}`;
};

const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

const formatDateTimeRange = (start, end) => {
  if (!start || !end) {
    return 'N/A';
  }

  const safeStart = new Date(start);
  const safeEnd = new Date(end);

  if (Number.isNaN(safeStart.getTime()) || Number.isNaN(safeEnd.getTime())) {
    return 'N/A';
  }

  return `${formatDateTime(safeStart)} to ${formatDateTime(safeEnd)}`;
};

const formatDateRangeInclusive = (start, endInclusive) => {
  if (!start || !endInclusive) {
    return 'N/A';
  }

  const safeStart = new Date(start);
  const safeEnd = new Date(endInclusive);

  if (Number.isNaN(safeStart.getTime()) || Number.isNaN(safeEnd.getTime())) {
    return 'N/A';
  }

  return `${formatDate(safeStart)} to ${formatDate(safeEnd)}`;
};

const formatDiff = (value) => {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
};

const buildColumnDefs = (columns) =>
  columns.map((col) => ({ align: 'left', ...col }));

// ----- PDF table helpers -----
const writeTableHeader = (doc, columns, startX, startY) => {
  doc.font('Helvetica-Bold');
  let x = startX;
  columns.forEach((column) => {
    doc.text(column.label, x, startY, {
      width: column.width,
      align: column.align
    });
    x += column.width;
  });
  doc.font('Helvetica');
  return startY + doc.currentLineHeight() + 4;
};

const writeTableRow = (doc, values, columns, startX, startY) => {
  let x = startX;
  let rowHeight = 0;

  values.forEach((value, index) => {
    const text = value ?? '';
    const column = columns[index];
    const cellOptions = {
      width: column.width,
      align: column.align
    };
    const cellHeight = doc.heightOfString(String(text), cellOptions);
    doc.text(String(text), x, startY, cellOptions);
    rowHeight = Math.max(rowHeight, cellHeight);
    x += column.width;
  });

  return startY + rowHeight + 6;
};

const ensureSpace = (doc, y, minimum) => {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + minimum > bottom) {
    doc.addPage();
    return { y: doc.y, addedPage: true };
  }
  return { y, addedPage: false };
};

const createPdfBuffer = (writer) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writer(doc);
    doc.end();
  });

// ----- Inventory report generation -----
const generateInventoryReportData = async (period, reference) => {
  const ranges = getPeriodRanges(period, reference);
  const generatedAt = new Date();

  const currentActivityPromise = pool.query(
    `SELECT item_id, COUNT(*) AS activity_count
     FROM logs
     WHERE item_id IS NOT NULL AND timestamp >= $1 AND timestamp < $2
     GROUP BY item_id`,
    [ranges.currentStart, ranges.currentEnd]
  );

  const previousActivityPromise = pool.query(
    `SELECT item_id, COUNT(*) AS activity_count
     FROM logs
     WHERE item_id IS NOT NULL AND timestamp >= $1 AND timestamp < $2
     GROUP BY item_id`,
    [ranges.previousStart, ranges.previousEnd]
  );

  const currentInventoryResult = await pool.query(
    'SELECT item_id, item_name, quantity FROM inventory ORDER BY item_name'
  );

  const currentInventoryMap = new Map(
    currentInventoryResult.rows.map((row) => [row.item_id, row])
  );

  const previousSnapshot = await getLatestSnapshotBefore(ranges.previousEnd);

  const [currentActivityResult, previousActivityResult] = await Promise.all([
    currentActivityPromise,
    previousActivityPromise
  ]);

  const currentActivityMap = new Map(
    currentActivityResult.rows.map((row) => [row.item_id, Number(row.activity_count)])
  );
  const previousActivityMap = new Map(
    previousActivityResult.rows.map((row) => [row.item_id, Number(row.activity_count)])
  );

  const previousSnapshotMap = new Map(
    (previousSnapshot?.rows || []).map((row) => [row.item_id, row])
  );

  const combinedItems = Array.from(
    new Set([...currentInventoryMap.keys(), ...previousSnapshotMap.keys()])
  )
    .map((itemId) => {
      const currentEntry = currentInventoryMap.get(itemId);
      const previousEntry = previousSnapshotMap.get(itemId);
      return {
        item_id: itemId,
        item_name: currentEntry?.item_name || previousEntry?.item_name || 'Unknown item'
      };
    })
    .sort((a, b) => a.item_name.localeCompare(b.item_name));

  const totalQuantity = currentInventoryResult.rows.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );

  return {
    ranges,
    generatedAt,
    combinedItems,
    currentInventoryMap,
    previousSnapshotMap,
    previousSnapshotAt: previousSnapshot?.snapshotAt || null,
    currentActivityMap,
    previousActivityMap,
    totalQuantity
  };
};

const renderInventoryPdf = (doc, data) => {
  const {
    ranges,
    generatedAt,
    combinedItems,
    currentInventoryMap,
    previousSnapshotMap,
    previousSnapshotAt,
    currentActivityMap,
    previousActivityMap,
    totalQuantity
  } = data;

  doc.font('Helvetica-Bold').fontSize(18).text('MediTrack Inventory Audit Report', {
    align: 'center'
  });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(12).text(ranges.label, { align: 'center' });
  doc.moveDown();

  doc.fontSize(11);
  doc.text(`Generated on: ${formatDateTime(generatedAt)}`);
  doc.text(`Current period: ${formatDateRange(ranges.currentStart, ranges.currentEnd)}`);
  doc.text(`Comparison period: ${formatDateRange(ranges.previousStart, ranges.previousEnd)}`);
  doc.moveDown();

  doc.text(`Items covered in report: ${combinedItems.length}`);
  doc.text(`Total quantity (live inventory): ${totalQuantity}`);
  doc.text(`Live inventory captured at: ${formatDateTime(generatedAt)}`);
  if (previousSnapshotAt) {
    doc.text(`Snapshot used for comparison period: ${formatDateTime(previousSnapshotAt)}`);
  } else {
    doc.fillColor('#aa0000').text(
      'Comparison snapshot unavailable. No snapshot exists for the requested prior period.'
    );
    doc.fillColor('black');
  }
  doc.moveDown();

  if (combinedItems.length === 0) {
    doc.text('No inventory snapshot data is available for reporting.');
    return;
  }

  const columns = buildColumnDefs([
    { label: '#', width: 30 },
    { label: 'Item', width: 150 },
    { label: 'Item ID', width: 95 },
    { label: 'Qty (curr / prev)', width: 95, align: 'right' },
    { label: 'Δ Qty', width: 55, align: 'right' },
    { label: 'Logs (curr / prev)', width: 112, align: 'right' }
  ]);

  const startX = doc.page.margins.left;
  let y = doc.y;

  y = writeTableHeader(doc, columns, startX, y);

  combinedItems.forEach((item, index) => {
    const spaceCheck = ensureSpace(doc, y, 40);
    y = spaceCheck.y;

    if (spaceCheck.addedPage) {
      y = writeTableHeader(doc, columns, startX, y);
    }

    const currentCount = currentActivityMap.get(item.item_id) || 0;
    const previousCount = previousActivityMap.get(item.item_id) || 0;
    const qtyCurrent = currentInventoryMap.get(item.item_id)?.quantity ?? 0;
    const qtyPrevious = previousSnapshotMap.get(item.item_id)?.quantity ?? 0;

    const rowValues = [
      index + 1,
      item.item_name,
      item.item_id,
      `${qtyCurrent.toLocaleString()} / ${qtyPrevious.toLocaleString()}`,
      formatDiff(qtyCurrent - qtyPrevious),
      `${currentCount.toLocaleString()} / ${previousCount.toLocaleString()}`
    ];

    y = writeTableRow(doc, rowValues, columns, startX, y);
  });
};

const generateInventoryAudit = async (period, reference) => {
  const data = await generateInventoryReportData(period, reference);
  const buffer = await createPdfBuffer((doc) => renderInventoryPdf(doc, data));
  const fileName = `inventory-audit-${period}-${Date.now()}.pdf`;

  return {
    buffer,
    fileName
  };
};

// ----- Logs report generation -----
const generateLogsReportData = async ({
  period,
  reference,
  rangeStart,
  rangeEndExclusive,
  displayRangeEnd
}) => {
  let currentStart;
  let currentEnd;
  let comparisonStart = null;
  let comparisonEnd = null;
  let label;
  let isCustom = false;

  if (rangeStart && rangeEndExclusive) {
    isCustom = true;
    currentStart = rangeStart;
    currentEnd = rangeEndExclusive;
    label = `Activity log audit (${formatDateRangeInclusive(currentStart, displayRangeEnd)})`;
  } else {
    const ranges = getPeriodRanges(period, reference);
    currentStart = ranges.currentStart;
    currentEnd = ranges.currentEnd;
    comparisonStart = ranges.previousStart;
    comparisonEnd = ranges.previousEnd;
    label = ranges.label;
  }

  const logsResult = await pool.query(
    `SELECT 
       l.log_id,
       l.user_id,
       u.name AS user_name,
       u.role AS user_role,
       l.item_id,
       COALESCE(i.item_name, 'N/A') AS item_name,
       l.action,
       l.timestamp,
       l.details
     FROM logs l
     LEFT JOIN users u ON u.user_id = l.user_id
     LEFT JOIN inventory i ON i.item_id = l.item_id
     WHERE l.timestamp >= $1 AND l.timestamp < $2
     ORDER BY l.timestamp ASC`,
    [currentStart, currentEnd]
  );

  let previousCount = null;

  if (comparisonStart && comparisonEnd) {
    const previousCountResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM logs WHERE timestamp >= $1 AND timestamp < $2',
      [comparisonStart, comparisonEnd]
    );
    previousCount = previousCountResult.rows[0]?.count || 0;
  }

  return {
    range: {
      currentStart,
      currentEnd,
      comparisonStart,
      comparisonEnd,
      label,
      isCustom,
      displayRangeEnd: displayRangeEnd ?? new Date(currentEnd.getTime() - 1)
    },
    logs: logsResult.rows,
    previousCount
  };
};

const renderLogsPdf = (doc, data) => {
  const { range, logs, previousCount } = data;

  doc.font('Helvetica-Bold').fontSize(18).text('MediTrack Activity Log Report', {
    align: 'center'
  });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(12).text(range.label, { align: 'center' });
  doc.moveDown();

  doc.fontSize(11);
  doc.text(`Generated on: ${formatDateTime(new Date())}`);
  doc.text(
    `Current period: ${formatDateRangeInclusive(range.currentStart, range.displayRangeEnd)}`
  );

  if (range.comparisonStart && range.comparisonEnd) {
    doc.text(`Comparison period: ${formatDateRange(range.comparisonStart, range.comparisonEnd)}`);
    doc.text(`Logs found this period: ${logs.length}`);
    doc.text(`Logs recorded previous period: ${previousCount ?? 0}`);
  } else {
    doc.text('Comparison period: Not applicable for custom range.');
    doc.text(`Logs found in selected range: ${logs.length}`);
  }

  doc.moveDown();

  if (logs.length === 0) {
    doc.text('No logs were recorded during the selected period.');
    return;
  }

  const columns = buildColumnDefs([
    { label: '#', width: 30 },
    { label: 'Log ID', width: 90 },
    { label: 'Timestamp', width: 120 },
    { label: 'User (role)', width: 130 },
    { label: 'Item', width: 120 },
    { label: 'Action', width: 80 }
  ]);

  const startX = doc.page.margins.left;
  let y = doc.y;

  const renderHeader = () => {
    y = writeTableHeader(doc, columns, startX, y);
  };

  renderHeader();

  logs.forEach((log, index) => {
    const spaceCheck = ensureSpace(doc, y, 80);
    y = spaceCheck.y;

    if (spaceCheck.addedPage) {
      renderHeader();
    }

    const values = [
      index + 1,
      log.log_id,
      formatDateTime(log.timestamp),
      `${log.user_name || 'Unknown'} (${roleLabels[log.user_role] || 'N/A'})`,
      log.item_name || 'N/A',
      log.action
    ];

    y = writeTableRow(doc, values, columns, startX, y);

    if (log.details) {
      const note = `Details: ${log.details}`;
      const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const detailSpace = ensureSpace(doc, y, doc.heightOfString(note, { width }) + 12);
      y = detailSpace.y;
      if (detailSpace.addedPage) {
        renderHeader();
      }
      doc.font('Helvetica-Oblique');
      doc.text(note, startX, y, { width });
      doc.font('Helvetica');
      y += doc.currentLineHeight() + 6;
    }
  });
};

const generateLogsAudit = async ({
  period,
  reference,
  rangeStart,
  rangeEndExclusive,
  displayRangeEnd
}) => {
  const data = await generateLogsReportData({
    period,
    reference,
    rangeStart,
    rangeEndExclusive,
    displayRangeEnd
  });
  const buffer = await createPdfBuffer((doc) => renderLogsPdf(doc, data));

  const hasCustomRange = Boolean(rangeStart && rangeEndExclusive);
  const baseSuffix = hasCustomRange ? 'custom' : period;

  let fileName = `logs-audit-${baseSuffix}-${Date.now()}.pdf`;

  if (hasCustomRange) {
    const startLabel = new Date(rangeStart).toISOString().split('T')[0];
    const endLabel = new Date(displayRangeEnd).toISOString().split('T')[0];
    fileName = `logs-audit-${startLabel}-to-${endLabel}-${Date.now()}.pdf`;
  }

  return {
    buffer,
    fileName,
    range: data.range
  };
};

const streamAuditReport = (res, report, disposition = 'attachment') => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${report.fileName}"`);
  res.send(report.fileData);
};

// ----- Routes -----
router.post('/generate', async (req, res) => {
  const {
    type,
    period = 'month',
    referenceDate,
    rangeStart,
    rangeEnd
  } = req.body || {};

  if (!SUPPORTED_TYPES.has(type)) {
    return res.status(400).json({ message: 'Unsupported audit type. Use "inventory" or "logs".' });
  }

  const hasCustomRange = rangeStart !== undefined || rangeEnd !== undefined;

  if (hasCustomRange && type !== 'logs') {
    return res.status(400).json({
      message: 'Custom date ranges are only supported for activity log audits.'
    });
  }

  let reference = null;
  let customRange = null;

  if (hasCustomRange) {
    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({ message: 'Both rangeStart and rangeEnd are required.' });
    }

    const startDate = new Date(`${rangeStart}T00:00:00`);
    const endDate = new Date(`${rangeEnd}T00:00:00`);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid custom date range supplied.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate > today || endDate > today) {
      return res.status(400).json({ message: 'Future dates are not supported for audits.' });
    }

    if (endDate < startDate) {
      return res
        .status(400)
        .json({ message: 'rangeEnd must be the same day or later than rangeStart for custom audits.' });
    }

    const endExclusive = new Date(endDate);
    endExclusive.setDate(endExclusive.getDate() + 1);

    customRange = {
      start: startDate,
      endExclusive,
      displayEnd: endDate
    };
  } else {
    if (!SUPPORTED_PERIODS.has(period)) {
      return res.status(400).json({
        message: `Unsupported period. Use one of: ${Array.from(SUPPORTED_PERIODS).join(', ')}`
      });
    }

    reference = referenceDate ? new Date(referenceDate) : new Date();

    if (Number.isNaN(reference.getTime())) {
      return res.status(400).json({ message: 'Invalid referenceDate supplied' });
    }
  }

  try {
    if (type === 'inventory') {
      const { buffer, fileName } = await generateInventoryAudit(period, reference);

      const savedReport = await saveAuditReport({
        reportType: type,
        period,
        referenceDate: reference,
        fileName,
        buffer
      });

      return res.status(201).json({ report: savedReport });
    }

    const { buffer, fileName, range } = await generateLogsAudit({
      period,
      reference,
      rangeStart: customRange?.start,
      rangeEndExclusive: customRange?.endExclusive,
      displayRangeEnd: customRange?.displayEnd
    });

    const savedReport = await saveAuditReport({
      reportType: type,
      period: customRange ? 'custom' : period,
      referenceDate: customRange ? customRange.start : reference,
      fileName,
      buffer
    });

    const responseReport = customRange
      ? {
          ...savedReport,
          rangeStart: range.currentStart,
          rangeEnd: range.displayRangeEnd
        }
      : savedReport;

    return res.status(201).json({ report: responseReport });
  } catch (error) {
    console.error('Error generating audit report:', error);
    return res.status(500).json({ message: 'Error generating audit report', error: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const reports = await getAuditReports();
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ message: 'Error fetching audit history', error: error.message });
  }
});

router.post('/delete', async (req, res) => {
  const { reportIds } = req.body || {};

  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return res.status(400).json({ message: 'reportIds must be a non-empty array.' });
  }

  try {
    const deleted = await deleteAuditReportsByIds(reportIds);
    return res.json({ deleted });
  } catch (error) {
    console.error('Error deleting audit reports:', error);
    return res.status(500).json({ message: 'Error deleting audit reports', error: error.message });
  }
});

router.delete('/:reportId', async (req, res) => {
  const { reportId } = req.params;

  try {
    const deleted = await deleteAuditReportById(reportId);

    if (deleted === 0) {
      return res.status(404).json({ message: 'Audit report not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting audit report:', error);
    return res.status(500).json({ message: 'Error deleting audit report', error: error.message });
  }
});

router.get('/download/:reportId', async (req, res) => {
  const { reportId } = req.params;

  try {
    const report = await getAuditReportById(reportId);

    if (!report) {
      return res.status(404).json({ message: 'Audit report not found or has expired.' });
    }

    streamAuditReport(res, report, 'attachment');
  } catch (error) {
    console.error('Error downloading audit report:', error);
    res.status(500).json({ message: 'Error downloading audit report', error: error.message });
  }
});

router.get('/view/:reportId', async (req, res) => {
  const { reportId } = req.params;

  try {
    const report = await getAuditReportById(reportId);

    if (!report) {
      return res.status(404).json({ message: 'Audit report not found or has expired.' });
    }

    streamAuditReport(res, report, 'inline');
  } catch (error) {
    console.error('Error streaming audit report:', error);
    res.status(500).json({ message: 'Error streaming audit report', error: error.message });
  }
});

module.exports = router;
