import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LogsModal = ({ logs, user, onClose, onRefresh, onError, inventory, colorTheme }) => {
  const theme = colorTheme || { modal: 'bg-blue-300', modalHeader: 'bg-blue-300', text: 'text-gray-900', logoText: 'text-gray-800' };
  const [editingLog, setEditingLog] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    log_id: '',
    item_id: '',
    action: '',
    details: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  const [expandedDetails, setExpandedDetails] = useState({});
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

  // Generate auto log_id in format LOGMMDDYYXXX (max 12 characters, server-wide)
  const generateLogId = async () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2); // Last 2 digits of year (YY)
    const dateStr = `${month}${day}${year}`; // MMDDYY format

    // Query server to get count of today's logs (server-wide)
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch all logs to count today's logs server-wide
      const response = await axios.get('http://localhost:5000/logs', { headers });
      const allLogs = response.data.logs || [];
      
      const todayLogs = allLogs.filter(log => {
        if (!log.log_id || !log.log_id.startsWith('LOG')) return false;
        // Extract date part from log_id (format: LOGMMDDYYXXX)
        const logDate = log.log_id.substring(3, 9); // Extract MMDDYY (6 characters)
        return logDate === dateStr;
      });

      const sequence = String(todayLogs.length + 1).padStart(3, '0');
      return `LOG${dateStr}${sequence}`; // LOG + MMDDYY + XXX = 12 characters total
    } catch (err) {
      // Fallback to local logs count if server query fails
      const todayLogs = logs.filter(log => {
        if (!log.log_id || !log.log_id.startsWith('LOG')) return false;
        const logDate = log.log_id.substring(3, 9); // Extract MMDDYY
        return logDate === dateStr;
      });
      const sequence = String(todayLogs.length + 1).padStart(3, '0');
      return `LOG${dateStr}${sequence}`;
    }
  };

  const handleMedicineSelect = (item) => {
    setFormData({ ...formData, item_id: item.item_id });
    setMedicineSearch(item.item_name);
    setShowMedicineDropdown(false);
  };

  const filteredMedicines = inventory?.filter(item =>
    item.item_name?.toLowerCase().includes(medicineSearch.toLowerCase())
  ) || [];

  const handleEdit = (log) => {
    setEditingLog(log);
    const selectedMedicine = inventory?.find(item => item.item_id === log.item_id);
    setFormData({
      log_id: log.log_id,
      item_id: log.item_id,
      action: log.action || '',
      details: log.details || ''
    });
    setMedicineSearch(selectedMedicine?.item_name || '');
    setShowAddForm(false);
    setShowMedicineDropdown(false);
  };

  const toggleDetails = (logId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  };

  const handleCancel = () => {
    setEditingLog(null);
    setShowAddForm(false);
    setFormData({ log_id: '', item_id: '', action: '', details: '' });
    setMedicineSearch('');
    setError('');
    setShowMedicineDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      if (editingLog) {
        // Update existing log
        await axios.put(
          `http://localhost:5000/logs/${editingLog.log_id}`,
          {
            item_id: formData.item_id,
            action: formData.action,
            details: formData.details
          },
          { headers }
        );
      } else {
        // Add new log - auto-generate log_id
        const autoLogId = await generateLogId();
        await axios.post(
          'http://localhost:5000/logs',
          {
            ...formData,
            log_id: autoLogId
          },
          { headers }
        );
      }

      handleCancel();
      onRefresh();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to save log entry';
      
      // Handle permission errors (403)
      if (err.response?.status === 403) {
        const permissionMessage = `${user.name || 'User'} cannot complete this action because of insufficient permissions. ${errorMessage}`;
        setError(permissionMessage);
        if (onError) {
          onError(permissionMessage);
        }
      } else if (err.response?.status === 401) {
        const authMessage = 'Session expired. Please log in again.';
        setError(authMessage);
        if (onError) {
          onError(authMessage);
        }
      } else {
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get border color class based on alert level (outline border around entire row)
  const getAlertBorderClass = (alertLevel) => {
    switch (alertLevel) {
      case 'critical':
        return 'border-2 border-red-500';
      case 'soft':
        return 'border-2 border-yellow-500';
      case 'normal':
      default:
        return 'border-2 border-green-500';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div 
          className={`${theme.modal} w-full max-w-6xl max-h-[90vh] mx-4 rounded-lg border-2 border-gray-800 overflow-hidden pointer-events-auto flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${theme.modalHeader} p-6 border-b-2 border-gray-800 flex justify-between items-center`}>
            <div className={`text-6xl font-bold ${theme.logoText} tracking-wide`}>MEDITRACK</div>
            <button
              onClick={onClose}
              className="text-gray-900 hover:text-gray-700 text-3xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Add/Edit Form */}
            {(showAddForm || editingLog) && (
              <div className="bg-white border-2 border-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {editingLog ? 'Edit Log Entry' : 'Add New Log Entry'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Medicine {!editingLog && '(search)'}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={medicineSearch}
                          onChange={(e) => {
                            setMedicineSearch(e.target.value);
                            setFormData({ ...formData, item_id: '' });
                            setShowMedicineDropdown(true);
                          }}
                          onFocus={() => {
                            if (medicineSearch && filteredMedicines.length > 0) {
                              setShowMedicineDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay hiding to allow click events to register
                            setTimeout(() => {
                              setShowMedicineDropdown(false);
                            }, 200);
                          }}
                          placeholder="Search medicine name..."
                          className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                          required
                        />
                        {showMedicineDropdown && medicineSearch && filteredMedicines.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-800 rounded-lg max-h-48 overflow-y-auto">
                            {filteredMedicines.map((item) => (
                              <button
                                key={item.item_id}
                                type="button"
                                onClick={() => handleMedicineSelect(item)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                              >
                                {item.item_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Log ID {editingLog ? '(read-only)' : '(auto-generated)'}
                      </label>
                      <input
                        type="text"
                        value={formData.log_id || (editingLog ? '' : 'Will be auto-generated')}
                        onChange={(e) => setFormData({ ...formData, log_id: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900 bg-gray-100"
                        disabled={true}
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Action
                    </label>
                    <input
                      type="text"
                      value={formData.action}
                      onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                      required
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Details
                    </label>
                    <textarea
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                      rows="3"
                    />
                  </div>
                  {error && (
                    <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-2 rounded-lg">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Table */}
            <div className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden">
              <div className="p-4 border-b-2 border-gray-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Log Entries</h3>
                {!showAddForm && !editingLog && (
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      setEditingLog(null);
                      setFormData({ log_id: '', item_id: '', action: '', details: '' });
                    }}
                    className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Add Entry
                  </button>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-800">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">log_id</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">user_id</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">item_id</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">action</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">timestamp</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">details</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log.log_id} className={`${getAlertBorderClass(log.alert_level || 'normal')} ${index < logs.length - 1 ? 'border-b-2' : ''}`}>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.log_id || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.user_id || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.item_id || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.action || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{formatTimestamp(log.timestamp)}</td>
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">
                        {log.details ? (
                          <div>
                            {expandedDetails[log.log_id] ? (
                              <div>
                                <p className="mb-2">{log.details}</p>
                                <button
                                  onClick={() => toggleDetails(log.log_id)}
                                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                                >
                                  Show less
                                </button>
                              </div>
                            ) : (
                              <div>
                                <p className="truncate max-w-xs">{log.details}</p>
                                <button
                                  onClick={() => toggleDetails(log.log_id)}
                                  className="text-blue-600 hover:text-blue-800 underline text-sm mt-1"
                                >
                                  Show more
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        <button
                          onClick={() => handleEdit(log)}
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-gray-600">No logs available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className={`${theme.modalHeader} p-6 border-t-2 border-gray-800 flex justify-end`}>
            <button
              onClick={onClose}
              className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogsModal;
