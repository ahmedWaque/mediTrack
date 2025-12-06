import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LogsModal from './LogsModal';
import InventoryModal from './InventoryModal';
import RequestMedicineModal from './RequestMedicineModal';
import AlertModal from './AlertModal';
import AuditModal from './AuditModal';
import CreateAuditModal from './CreateAuditModal';
import UserSettingsModal from './UserSettingsModal';
import Toast from './Toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCreateAuditModal, setShowCreateAuditModal] = useState(false);
  const [auditHistory, setAuditHistory] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [deleteAuditTarget, setDeleteAuditTarget] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [logDateSearch, setLogDateSearch] = useState('');
  const [logPersonSearch, setLogPersonSearch] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userSettings, setUserSettings] = useState({ sesh_limit: 0, dash_style: 'blue' });

  const formatAuditDate = (value) => {
    if (!value) {
      return 'Unknown date';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // Fetch logs and inventory
    fetchData();
    fetchUserSettings();
  }, []);

  const fetchUserSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await axios.get('http://localhost:5000/settings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUserSettings(response.data);
    } catch (err) {
      console.error('Error fetching user settings:', err);
      setUserSettings({ sesh_limit: 0, dash_style: 'blue' });
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: {
        bg: 'bg-blue-300',
        panel: 'bg-blue-200',
        hover: 'hover:bg-blue-100',
        modal: 'bg-blue-200',
        modalHeader: 'bg-blue-300',
        text: 'text-gray-900',
        logoText: 'text-gray-800'
      },
      green: {
        bg: 'bg-green-300',
        panel: 'bg-green-200',
        hover: 'hover:bg-green-100',
        modal: 'bg-green-200',
        modalHeader: 'bg-green-300',
        text: 'text-gray-900',
        logoText: 'text-gray-800'
      },
      grey: {
        bg: 'bg-gray-700',
        panel: 'bg-gray-600',
        hover: 'hover:bg-gray-500',
        modal: 'bg-gray-600',
        modalHeader: 'bg-gray-700',
        text: 'text-white',
        logoText: 'text-white'
      },
      orange: {
        bg: 'bg-orange-300',
        panel: 'bg-orange-200',
        hover: 'hover:bg-orange-100',
        modal: 'bg-orange-200',
        modalHeader: 'bg-orange-300',
        text: 'text-gray-900',
        logoText: 'text-gray-800'
      }
    };
    return colors[userSettings.dash_style] || colors.blue;
  };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('No authentication token found');
      setLoading(false);
      return;
    }

    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch logs and inventory in parallel
      const [logsResponse, inventoryResponse] = await Promise.all([
        axios.get('http://localhost:5000/logs', { headers }),
        axios.get('http://localhost:5000/inventory', { headers })
      ]);

      setLogs(logsResponse.data.logs || []);
      setInventory(inventoryResponse.data.inventory || []);

      // Fetch pending requests count if user is manager
      const currentUser = user || JSON.parse(localStorage.getItem('user') || 'null');
      if (currentUser && currentUser.role === 'm') {
        try {
          const alertResponse = await axios.get('http://localhost:5000/alert', { headers });
          setPendingRequestsCount(alertResponse.data.requests?.length || 0);
        } catch (err) {
          // If user doesn't have permission or other error, just set count to 0
          setPendingRequestsCount(0);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      if (err.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
        setToast({ message: 'Session expired. Please log in again.', type: 'error' });
      } else {
        setError('Failed to load data. Please try again.');
        setToast({ message: 'Failed to load data. Please try again.', type: 'error' });
      }
      setLoading(false);
    }
  };

  const getCurrentDate = () => {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  };

  const getFirstName = (fullName) => {
    if (!fullName) return 'User';
    return fullName.split(' ')[0];
  };

  const getRoleName = (role) => {
    const roleMap = { 'n': 'Nurse', 'm': 'Manager', 'd': 'Director' };
    return roleMap[role] || 'User';
  };

  const filteredInventory = inventory.filter((item) =>
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter((log) => {
    const trimmedDate = logDateSearch.trim();
    const trimmedPerson = logPersonSearch.trim().toLowerCase();

    const matchesDate =
      trimmedDate.length === 0 ||
      (() => {
        if (!log.timestamp) {
          return false;
        }
        const dateString = new Date(log.timestamp).toLocaleDateString('en-US');
        return dateString.toLowerCase().includes(trimmedDate.toLowerCase());
      })();

    if (!matchesDate) {
      return false;
    }

    if (trimmedPerson.length === 0) {
      return true;
    }

    const userName = log.user_name ? String(log.user_name).toLowerCase() : '';
    const userId = log.user_id ? String(log.user_id).toLowerCase() : '';

    return userName.includes(trimmedPerson) || userId.includes(trimmedPerson);
  });

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const fetchAuditHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setToast({ message: 'No authentication token found.', type: 'error' });
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/audit/history', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setAuditHistory(response.data.reports || []);
    } catch (err) {
      console.error('Error fetching audit history:', err);
      setAuditHistory([]);
      setToast({ message: 'Failed to load audit history.', type: 'error' });
    }
  };

  const handleAuditButtonClick = () => {
    setShowCreateAuditModal(false);
    setShowAuditModal(true);
    fetchAuditHistory();
  };

  const handleCreateAudit = async ({
    type,
    period,
    referenceDate,
    rangeStart,
    rangeEnd
  }) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setToast({ message: 'No authentication token found.', type: 'error' });
      return null;
    }

    setAuditLoading(true);

    try {
      const payload = {
        type,
        period,
        referenceDate
      };

      if (rangeStart && rangeEnd) {
        payload.rangeStart = rangeStart;
        payload.rangeEnd = rangeEnd;
      }

      if (!referenceDate) {
        delete payload.referenceDate;
      }

      const response = await axios.post(
        'http://localhost:5000/audit/generate',
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const report = response.data?.report;
      setToast({ message: 'Audit generated successfully.', type: 'success' });
      await fetchAuditHistory();
      return report;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to generate audit.';
      setToast({ message, type: 'error' });
      return null;
    } finally {
      setAuditLoading(false);
    }
  };

  const handleViewAudit = (audit) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setToast({ message: 'No authentication token found.', type: 'error' });
      return;
    }

    axios
      .get(`http://localhost:5000/audit/view/${audit.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      })
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
      })
      .catch((err) => {
        console.error('Error viewing audit:', err);
        const message = err.response?.data?.message || 'Unable to open audit report.';
        setToast({ message, type: 'error' });
      });
  };

  const handleDownloadAudit = (audit) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setToast({ message: 'No authentication token found.', type: 'error' });
      return;
    }

    axios
      .get(`http://localhost:5000/audit/download/${audit.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      })
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = audit.fileName || `audit-${audit.type}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error('Error downloading audit:', err);
        const message = err.response?.data?.message || 'Unable to download audit report.';
        setToast({ message, type: 'error' });
      });
  };

  const handleDeleteAudit = async (audit) => {
    if (!audit?.id) {
      setToast({ message: 'Invalid audit selected.', type: 'error' });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setToast({ message: 'No authentication token found.', type: 'error' });
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/audit/${audit.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setToast({ message: 'Audit deleted successfully.', type: 'success' });
      await fetchAuditHistory();
    } catch (err) {
      console.error('Error deleting audit:', err);
      const message = err.response?.data?.message || 'Unable to delete audit report.';
      setToast({ message, type: 'error' });
    }
    setDeleteAuditTarget(null);
  };

  const colorClasses = getColorClasses();

  if (loading) {
    return (
      <div className={`min-h-screen ${colorClasses.bg} flex items-center justify-center`}>
        <div className="text-gray-900 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${colorClasses.bg} flex items-center justify-center`}>
        <div className="text-gray-900 text-xl">Please log in to continue</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colorClasses.bg}`}>
      {/* Header */}
      <div className={`${colorClasses.bg} p-6 flex justify-between items-center border-b-2 border-gray-800`}>
        <button
          onClick={() => setShowSettingsModal(true)}
          className="bg-white border-2 border-gray-800 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <div className="text-2xl font-medium text-gray-900">
            Hi, {getFirstName(user.name)}
          </div>
        </button>
        <div className={`text-6xl font-bold ${colorClasses.logoText} tracking-wide`}>
          MEDITRACK
        </div>
        <div className="bg-white border-2 border-gray-800 px-6 py-3 rounded-lg">
          <div className="text-2xl font-medium text-gray-900">
            {getCurrentDate()}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Update Log */}
        <div className={`${colorClasses.panel} border-2 border-gray-800 rounded-lg p-6 flex flex-col`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className={`text-lg font-bold ${colorClasses.text}`}>log table</h2>
            <div className="flex gap-3 flex-wrap justify-end">
              <input
                type="text"
                value={logDateSearch}
                onChange={(e) => setLogDateSearch(e.target.value)}
                placeholder="type a date"
                className="w-44 px-3 py-2 border-2 border-gray-800 rounded-lg text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
              <input
                type="text"
                value={logPersonSearch}
                onChange={(e) => setLogPersonSearch(e.target.value)}
                placeholder="type a name or id"
                className="w-44 px-3 py-2 border-2 border-gray-800 rounded-lg text-gray-900 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600"
              />
            </div>
          </div>
          
          <div 
            className={`flex-1 border-2 border-gray-800 rounded-lg overflow-hidden cursor-pointer ${colorClasses.hover} transition-colors bg-white`}
            onClick={() => setShowLogsModal(true)}
          >
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-800">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">Medicine</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">User id</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 5).map((log, index) => (
                  <tr
                    key={log.log_id}
                    className={`${getAlertBorderClass(log.alert_level || 'normal')} ${index < filteredLogs.slice(0, 5).length - 1 ? 'border-b-2' : ''}`}
                  >
                    <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.item_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.user_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{log.user_id || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{log.action || 'N/A'}</td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-600">
                      {logs.length === 0 ? 'No logs available' : 'No logs match your search'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Role-based buttons */}
          <div className="mt-4 flex gap-4">
            {user.role === 'd' && (
              <button
                onClick={handleAuditButtonClick}
                className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Audit
              </button>
            )}
            {user.role === 'm' && (
              <button 
                onClick={() => setShowAlertModal(true)}
                className="relative bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Alert
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
            {user.role === 'n' && (
              <button 
                onClick={() => setShowRequestModal(true)}
                className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Request medicine
              </button>
            )}
          </div>
        </div>

        {/* Right Panel - Stock count */}
        <div className={`${colorClasses.panel} border-2 border-gray-800 rounded-lg p-6 flex flex-col`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-bold ${colorClasses.text}`}>inventory table</h2>
            <input
              type="text"
              placeholder="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
            />
          </div>
          
          <div 
            className={`flex-1 border-2 border-gray-800 rounded-lg overflow-hidden cursor-pointer ${colorClasses.hover} transition-colors bg-white`}
            onClick={() => setShowInventoryModal(true)}
          >
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-800">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.slice(0, 5).map((item, index) => (
                  <tr key={item.item_id} className="border-b-2 border-gray-800">
                    <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{item.item_name}</td>
                    <td className="px-4 py-3 text-gray-900">{item.quantity}</td>
                  </tr>
                ))}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan="2" className="px-4 py-8 text-center text-gray-600 border-b-2 border-gray-800">No inventory items available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <div className="p-6">
        <button
          onClick={handleLogout}
          className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Modals */}
      {showLogsModal && (
        <LogsModal
          logs={logs}
          user={user}
          inventory={inventory}
          colorTheme={colorClasses}
          onClose={() => {
            setShowLogsModal(false);
            fetchData(); // Refresh data when modal closes
          }}
          onRefresh={async () => {
            await fetchData(); // Refresh data after mutations
          }}
          onError={(message, type = 'error') => setToast({ message, type })}
        />
      )}

      {showInventoryModal && (
        <InventoryModal
          inventory={inventory}
          user={user}
          colorTheme={colorClasses}
          onClose={() => {
            setShowInventoryModal(false);
            fetchData(); // Refresh data when modal closes
          }}
          onRefresh={async () => {
            await fetchData(); // Refresh data after mutations
          }}
          onError={(message, type = 'error') => setToast({ message, type })}
        />
      )}

      {showRequestModal && (
        <RequestMedicineModal
          inventory={inventory}
          user={user}
          colorTheme={colorClasses}
          onClose={() => {
            setShowRequestModal(false);
            fetchData(); // Refresh data when modal closes
          }}
          onRefresh={async () => {
            await fetchData(); // Refresh data after mutations
          }}
          onError={(message, type = 'error') => setToast({ message, type })}
        />
      )}

      {showAlertModal && (
        <AlertModal
          user={user}
          colorTheme={colorClasses}
          onClose={() => {
            setShowAlertModal(false);
            fetchData(); // Refresh data when modal closes
          }}
          onRefresh={async () => {
            await fetchData(); // Refresh data after mutations
          }}
          onError={(message, type = 'error') => setToast({ message, type })}
        />
      )}

      {showAuditModal && (
        <AuditModal
          audits={auditHistory}
          colorTheme={colorClasses}
          onClose={() => setShowAuditModal(false)}
          onCreate={() => {
            setShowAuditModal(false);
            setShowCreateAuditModal(true);
          }}
          onReturnDashboard={() => {
            setShowAuditModal(false);
            setShowCreateAuditModal(false);
          }}
          onView={handleViewAudit}
          onDownload={handleDownloadAudit}
          onRequestDelete={(audit) => setDeleteAuditTarget(audit)}
        />
      )}

      {showCreateAuditModal && (
        <CreateAuditModal
          colorTheme={colorClasses}
          onClose={() => setShowCreateAuditModal(false)}
          onBackToAudit={() => {
            setShowCreateAuditModal(false);
            setShowAuditModal(true);
            fetchAuditHistory();
          }}
          onCreate={handleCreateAudit}
          onReturnDashboard={() => {
            setShowCreateAuditModal(false);
            setShowAuditModal(false);
          }}
          loading={auditLoading}
        />
      )}

      {deleteAuditTarget && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[80]"
            onClick={() => setDeleteAuditTarget(null)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[90] pointer-events-none">
            <div
              className={`${colorClasses.modal} w-full max-w-lg mx-4 rounded-lg border-2 border-gray-800 p-8 pointer-events-auto flex flex-col gap-6`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-2xl font-semibold text-gray-900 text-center">
                Delete audit report?
              </div>
              <div className="bg-white border-2 border-gray-800 rounded-lg p-4 text-gray-900">
                <p className="font-medium">
                  {deleteAuditTarget.fileName || 'Selected audit report'}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {formatAuditDate(deleteAuditTarget.createdAt)}
                </p>
                <p className="mt-2 text-sm">
                  {deleteAuditTarget.type === 'logs'
                    ? 'This activity log report will be permanently removed. You can regenerate it later if needed.'
                    : 'Deleting this inventory report is permanent and cannot be recovered. Please download a copy before deleting.'}
                </p>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setDeleteAuditTarget(null)}
                  className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-5 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteAudit(deleteAuditTarget)}
                  className="bg-red-600 border-2 border-gray-800 text-white font-semibold px-5 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showSettingsModal && (
        <UserSettingsModal
          user={user}
          colorTheme={colorClasses}
          onClose={() => {
            setShowSettingsModal(false);
            fetchUserSettings();
          }}
          onError={(message, type = 'error') => setToast({ message, type })}
        />
      )}
    </div>
  );
};

export default Dashboard;
