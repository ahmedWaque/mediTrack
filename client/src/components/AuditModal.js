import React, { useMemo, useState } from 'react';

const typeLabels = {
  inventory: 'Inventory Audit',
  logs: 'Activity Log Audit'
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (typeof value === 'string') {
    const isoDateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
      const [, yearStr, monthStr, dayStr] = isoDateOnlyMatch;
      const year = Number(yearStr);
      const month = Number(monthStr);
      const day = Number(dayStr);
      return Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)
        ? null
        : new Date(year, month - 1, day);
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatNumericDate = (value) => {
  const date = parseDateValue(value);
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const formatMonthLabel = (value) => {
  const date = parseDateValue(value);
  if (!date) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
};

const periodLabels = {
  custom: 'Custom Range'
};

const extractCustomRangeFromFileName = (fileName) => {
  if (!fileName) {
    return null;
  }

  const match = fileName.match(/logs-audit-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})/);

  if (!match) {
    return null;
  }

  return {
    start: match[1],
    end: match[2]
  };
};

const AuditModal = ({
  audits,
  onClose,
  onCreate,
  onReturnDashboard,
  onView,
  onDownload,
  onRequestDelete,
  colorTheme
}) => {
  const theme = colorTheme || { modal: 'bg-blue-300', modalHeader: 'bg-blue-300', text: 'text-gray-900', logoText: 'text-gray-800' };
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAudits = useMemo(() => {
    const baseAudits = Array.isArray(audits) ? audits : [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return baseAudits;
    }

    return baseAudits.filter((audit) => {
      const createdAtString = audit.createdAt
        ? new Date(audit.createdAt).toLocaleString()
        : '';
      const createdDateString = audit.createdAt
        ? new Date(audit.createdAt).toLocaleDateString()
        : '';
      const referenceDateString = audit.referenceDate
        ? new Date(audit.referenceDate).toLocaleDateString()
        : '';
      const expiresAtString = audit.expiresAt
        ? new Date(audit.expiresAt).toLocaleString()
        : '';

      const rangeFromFile = extractCustomRangeFromFileName(audit.fileName);
      const customRangeStart = audit.rangeStart || rangeFromFile?.start;
      const customRangeEnd = audit.rangeEnd || rangeFromFile?.end;

      return [
        createdAtString,
        createdDateString,
        referenceDateString,
        expiresAtString,
        audit.fileName,
        customRangeStart,
        customRangeEnd
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [audits, searchTerm]);

  const renderRangeLabel = (audit) => {
    if (audit.period === 'custom') {
      const rangeFromFile = extractCustomRangeFromFileName(audit.fileName);
      const start = audit.rangeStart || rangeFromFile?.start || audit.referenceDate;
      const end = audit.rangeEnd || rangeFromFile?.end;

      if (start && end) {
      return `Custom: ${formatNumericDate(start)} → ${formatNumericDate(end)}`;
      }

      if (start) {
      return `Custom starting ${formatNumericDate(start)}`;
      }

      return 'Custom Range';
    }

  const reference = parseDateValue(audit.referenceDate);

  if (!reference) {
    return periodLabels[audit.period] || audit.period || '—';
  }

  switch (audit.period) {
    case 'day': {
      return `Today: ${formatNumericDate(reference)}`;
    }
    case 'week': {
      const referenceCopy = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
      const currentDay = referenceCopy.getDay();
      const diffToMonday = (currentDay + 6) % 7;
      const weekStart = new Date(referenceCopy);
      weekStart.setDate(referenceCopy.getDate() - diffToMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `This Week: ${formatNumericDate(weekStart)} → ${formatNumericDate(weekEnd)}`;
    }
    case 'month': {
      const monthStart = new Date(reference.getFullYear(), reference.getMonth(), 1);
      return `This Month: ${formatMonthLabel(monthStart)}`;
    }
    default:
      return periodLabels[audit.period] || audit.period || '—';
  }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className={`${theme.modal} w-full max-w-5xl mx-4 rounded-lg border-2 border-gray-800 overflow-hidden pointer-events-auto flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${theme.modalHeader} p-6 border-b-2 border-gray-800 flex justify-between items-center`}>
            <div className="text-6xl font-bold text-gray-800 tracking-wide">MEDITRACK</div>
            <button
              onClick={onClose}
              className="text-gray-900 hover:text-gray-700 text-3xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col gap-6">
            <div className="border-2 border-gray-800 rounded-lg bg-white flex flex-col">
              <div className="p-4 border-b-2 border-gray-800 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Audit History</h2>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by date or file name"
                  className="w-full md:w-80 px-4 py-2 border-2 border-gray-800 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600"
                />
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-800">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">Audit Document</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">Range</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-700">
                          No audit documents available yet.
                        </td>
                      </tr>
                    )}

                    {audits.length > 0 && filteredAudits.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-8 text-center text-gray-700">
                          No audits match your search.
                        </td>
                      </tr>
                    )}

                    {filteredAudits.map((audit) => (
                      <tr key={audit.id} className="border-t-2 border-gray-800">
                        <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">
                          {typeLabels[audit.type] || 'Audit'}
                        </td>
                        <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">
                          <div>{audit.createdAt ? new Date(audit.createdAt).toLocaleString() : '—'}</div>
                          {audit.expiresAt && (
                            <div className="text-sm text-gray-600">Expires: {new Date(audit.expiresAt).toLocaleString()}</div>
                          )}
                        </td>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">
                        {renderRangeLabel(audit)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <div className="flex gap-3 flex-wrap md:flex-nowrap">
                            <button
                              onClick={() => onView(audit)}
                              className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              view
                            </button>
                            <button
                              onClick={() => onDownload(audit)}
                              className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              download
                            </button>
                          {onRequestDelete && (
                            <button
                              onClick={() => onRequestDelete(audit)}
                              className="bg-red-600 border-2 border-gray-800 text-white font-semibold px-4 py-1 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              delete
                            </button>
                          )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={onCreate}
                className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Create Audit
              </button>
              <button
                onClick={onReturnDashboard}
                className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuditModal;


