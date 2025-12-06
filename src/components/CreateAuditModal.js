import React, { useEffect, useMemo, useState } from 'react';

const typeOptions = [
  { value: 'inventory', label: 'Inventory Audit' },
  { value: 'logs', label: 'Activity Log Audit' }
];

const basePeriodOptions = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' }
];

const customPeriodOption = { value: 'custom', label: 'Select From Dates' };

const formatDateInput = (date) => {
  if (!(date instanceof Date)) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
};

const getToday = () => new Date();

const parseLocalDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const formatDisplayDate = (value) => {
  const date = typeof value === 'string' ? parseLocalDate(value) : value;

  if (!date) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const CreateAuditModal = ({
  onClose,
  onBackToAudit,
  onCreate,
  onReturnDashboard,
  loading,
  colorTheme
}) => {
  const theme = colorTheme || { modal: 'bg-blue-300', modalHeader: 'bg-blue-300', modalInner: 'bg-blue-200', text: 'text-gray-900', logoText: 'text-gray-800' };
  const [selectedType, setSelectedType] = useState(typeOptions[0].value);
  const [selectedPeriod, setSelectedPeriod] = useState(basePeriodOptions[0].value);
  const [error, setError] = useState('');
  const [showCustomRangePicker, setShowCustomRangePicker] = useState(false);
  const [customStart, setCustomStart] = useState(formatDateInput(getYesterday()));
  const [customEnd, setCustomEnd] = useState(formatDateInput(getToday()));
  const [customRangeError, setCustomRangeError] = useState('');
  const [customRangeReady, setCustomRangeReady] = useState(false);
  const [todayLimit] = useState(formatDateInput(getToday()));

  const periodOptions = useMemo(() => {
    if (selectedType === 'logs') {
      return [...basePeriodOptions, customPeriodOption];
    }

    return basePeriodOptions;
  }, [selectedType]);

  useEffect(() => {
    if (selectedType !== 'logs' && selectedPeriod === 'custom') {
      setSelectedPeriod(basePeriodOptions[0].value);
      setCustomRangeReady(false);
    }
  }, [selectedType, selectedPeriod]);

  useEffect(() => {
    if (showCustomRangePicker) {
      const yesterday = formatDateInput(getYesterday());
      const today = formatDateInput(getToday());
      setCustomStart(yesterday);
      setCustomEnd(today);
      setCustomRangeError('');
      setCustomRangeReady(false);
    }
  }, [showCustomRangePicker]);

  const handleTypeChange = (value) => {
    setSelectedType(value);
    setError('');
    if (value !== 'logs') {
      setSelectedPeriod(basePeriodOptions[0].value);
    }
  };

  const handlePeriodChange = (value) => {
    setSelectedPeriod(value);
    setError('');

    if (value === 'custom') {
      setShowCustomRangePicker(true);
      return;
    }

    setCustomRangeReady(false);
  };

  const closeCustomRangePicker = () => {
    setShowCustomRangePicker(false);
    if (!customRangeReady) {
      setSelectedPeriod(basePeriodOptions[0].value);
    }
  };

  const handleConfirmCustomRange = () => {
    if (!customStart || !customEnd) {
      setCustomRangeError('Both start and end dates are required.');
      return;
    }

    const startDate = parseLocalDate(customStart);
    const endDate = parseLocalDate(customEnd);

    if (!startDate || !endDate) {
      setCustomRangeError('Please select valid dates.');
      return;
    }

    if (endDate < startDate) {
      setCustomRangeError('End date must be the same day or later than the start date.');
      return;
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (startDate > now || endDate > now) {
      setCustomRangeError('Future dates are not supported.');
      return;
    }

    setCustomRangeError('');
    setCustomRangeReady(true);
    setShowCustomRangePicker(false);
  };

  const handleCreate = async () => {
    setError('');

    if (selectedType === 'logs' && selectedPeriod === 'custom') {
      if (!customRangeReady) {
        setError('Please select and confirm a custom date range before creating the audit.');
        return;
      }

      const result = await onCreate({
        type: selectedType,
        period: selectedPeriod,
        referenceDate: customStart,
        rangeStart: customStart,
        rangeEnd: customEnd
      });

      if (!result) {
        setError('Failed to create audit. Please try again.');
      }
      return;
    }

    const referenceDate = new Date().toISOString().split('T')[0];

    const result = await onCreate({
      type: selectedType,
      period: selectedPeriod,
      referenceDate
    });

    if (!result) {
      setError('Failed to create audit. Please try again.');
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
          className={`${theme.modal} w-full max-w-3xl mx-4 rounded-lg border-2 border-gray-800 overflow-hidden pointer-events-auto flex flex-col`}
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

          <div className="p-6 flex-1 flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-gray-800 rounded-lg p-4">
                <label className="block text-gray-900 font-semibold mb-2">Select Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white border-2 border-gray-800 rounded-lg p-4">
                <label className="block text-gray-900 font-semibold mb-2">Select Date</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-white border-2 border-red-600 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {selectedType === 'logs' && selectedPeriod === 'custom' && customRangeReady && (
              <div className="bg-white border-2 border-gray-800 text-gray-900 px-4 py-3 rounded-lg">
                Selected range: {formatDisplayDate(customStart)} to {formatDisplayDate(customEnd)}
              </div>
            )}

            <div className="flex flex-col md:flex-row justify-between gap-4">
              <button
                onClick={handleCreate}
                disabled={loading}
                className={`bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg transition-colors ${
                  loading ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100'
                }`}
              >
                {loading ? 'Creating...' : 'Create Audit'}
              </button>

              <button
                onClick={onBackToAudit}
                className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Return to Audit
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

      {showCustomRangePicker && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-[60]"
            onClick={closeCustomRangePicker}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none">
            <div
              className={`${theme.modalInner || theme.modal} w-full max-w-xl mx-4 rounded-lg border-2 border-gray-800 p-8 pointer-events-auto flex flex-col gap-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <label className="text-gray-900 font-semibold">Date 1</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    max={todayLimit}
                    className="px-4 py-2 border-2 border-gray-800 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600"
                  />
                </div>
                <div className="text-gray-900 font-semibold">To</div>
                <div className="flex flex-col items-center gap-2">
                  <label className="text-gray-900 font-semibold">Date 2</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    max={todayLimit}
                    min={customStart || undefined}
                    className="px-4 py-2 border-2 border-gray-800 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-600"
                  />
                </div>
              </div>

              {customRangeError && (
                <div className="bg-white border-2 border-red-600 text-red-700 px-4 py-3 rounded-lg text-center">
                  {customRangeError}
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button
                    onClick={handleConfirmCustomRange}
                    className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Select Date
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomRangePicker(false);
                      setCustomRangeReady(false);
                      onReturnDashboard();
                    }}
                    className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CreateAuditModal;


