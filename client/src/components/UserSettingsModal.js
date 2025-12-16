import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserSettingsModal = ({ user, onClose, onError, colorTheme }) => {
  const theme = colorTheme || { modal: 'bg-blue-200', text: 'text-gray-900' };
  const [settings, setSettings] = useState({ sesh_limit: 0, dash_style: 'blue' });
  const [loading, setLoading] = useState(true);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      onError('No authentication token found', 'error');
      return;
    }

    try {
      const response = await axios.get('http://localhost:5000/settings', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setSettings(response.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      if (err.response?.status === 401) {
        onError('Session expired. Please log in again.', 'error');
        onClose();
      } else {
        onError('Failed to load settings.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates) => {
    const token = localStorage.getItem('token');
    if (!token) {
      onError('No authentication token found', 'error');
      return;
    }

    try {
      const response = await axios.put(
        'http://localhost:5000/settings',
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setSettings(response.data);
      onError('Changes successful, close out window to see changes', 'success');
    } catch (err) {
      console.error('Error updating settings:', err);
      if (err.response?.status === 401) {
        onError('Session expired. Please log in again.', 'error');
        onClose();
      } else {
        const message = err.response?.data?.message || 'Failed to update settings.';
        onError(message, 'error');
      }
    }
  };

  const handleSessionLimitChange = (limit) => {
    handleUpdateSettings({ sesh_limit: limit });
    setShowSessionDropdown(false);
  };

  const handleColorChange = (color) => {
    handleUpdateSettings({ dash_style: color });
    setShowColorDropdown(false);
  };

  const handlePasswordConfirm = async () => {
    if (!currentPassword) {
      onError('Please enter your current password', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      onError('No authentication token found', 'error');
      return;
    }

    try {
      await axios.post(
        'http://localhost:5000/settings/password/verify',
        { password: currentPassword },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      setShowPasswordConfirm(false);
      setShowPasswordChange(true);
    } catch (err) {
      if (err.response?.status === 401) {
        onError('Current password is incorrect', 'error');
        setCurrentPassword('');
      } else {
        onError('Failed to verify password', 'error');
      }
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      onError('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      onError('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      onError('Password must be at least 6 characters long', 'error');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      onError('No authentication token found', 'error');
      return;
    }

    try {
      await axios.put(
        'http://localhost:5000/settings/password',
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      onError('Password updated successfully', 'success');
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      console.error('Error changing password:', err);
      if (err.response?.status === 401) {
        onError('Current password is incorrect', 'error');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordChange(false);
        setShowPasswordConfirm(true);
      } else {
        const message = err.response?.data?.message || 'Failed to change password.';
        onError(message, 'error');
      }
    }
  };

  const getSessionTimeLabel = (limit) => {
    const minutes = (limit + 1) * 5;
    return `${minutes} minutes`;
  };

  const getColorLabel = (color) => {
    const labels = {
      blue: 'Blue (Default)',
      green: 'Green',
      grey: 'Grey (Dark)',
      orange: 'Orange'
    };
    return labels[color] || color;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className={`${theme.modal} border-2 border-gray-800 rounded-lg p-8`}>
          <div className="text-gray-900">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className={`${theme.modal} border-2 border-gray-800 rounded-lg p-8 w-full max-w-md pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${theme.text}`}>User Settings</h2>
            <button
              onClick={onClose}
              className={`${theme.text} hover:opacity-70 text-2xl font-bold`}
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <button
                onClick={() => {
                  setShowSessionDropdown(!showSessionDropdown);
                  setShowColorDropdown(false);
                }}
                className="w-full bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left flex justify-between items-center"
              >
                <span>Session Time Limit: {getSessionTimeLabel(settings.sesh_limit)}</span>
                <span className="text-gray-600">▼</span>
              </button>
              {showSessionDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {[0, 1, 2, 3, 4, 5].map((limit) => (
                    <button
                      key={limit}
                      onClick={() => handleSessionLimitChange(limit)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                        settings.sesh_limit === limit ? 'bg-blue-100' : ''
                      } ${limit === 0 ? 'rounded-t-lg' : ''} ${limit === 5 ? 'rounded-b-lg' : ''}`}
                    >
                      {getSessionTimeLabel(limit)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowPasswordConfirm(true);
                setShowPasswordChange(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="w-full bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Change Password
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowColorDropdown(!showColorDropdown);
                  setShowSessionDropdown(false);
                }}
                className="w-full bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left flex justify-between items-center"
              >
                <span>Dashboard Color: {getColorLabel(settings.dash_style)}</span>
                <span className="text-gray-600">▼</span>
              </button>
              {showColorDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-800 rounded-lg shadow-lg">
                  {['blue', 'green', 'grey', 'orange'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      className={`w-full px-4 py-2 text-left hover:bg-gray-100 ${
                        settings.dash_style === color ? 'bg-blue-100' : ''
                      } ${color === 'blue' ? 'rounded-t-lg' : ''} ${color === 'orange' ? 'rounded-b-lg' : ''}`}
                    >
                      {getColorLabel(color)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPasswordConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => {
              setShowPasswordConfirm(false);
              setCurrentPassword('');
              setShowCurrentPassword(false);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none">
            <div
              className={`${theme.modal} border-2 border-gray-800 rounded-lg p-8 w-full max-w-md pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Confirm Current Password</h3>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-4 py-2 pr-12 border-2 border-gray-800 rounded-lg text-gray-900"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-gray-600 rounded flex items-center justify-center hover:border-gray-900 focus:outline-none transition-colors"
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowPasswordConfirm(false);
                    setCurrentPassword('');
                    setShowCurrentPassword(false);
                  }}
                  className="flex-1 bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordConfirm}
                  className="flex-1 bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showPasswordChange && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => {
              setShowPasswordChange(false);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowCurrentPassword(false);
              setShowNewPassword(false);
              setShowConfirmPassword(false);
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none">
            <div
              className={`${theme.modal} border-2 border-gray-800 rounded-lg p-8 w-full max-w-md pointer-events-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={`text-xl font-bold ${theme.text} mb-4`}>Change Password</h3>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-4 py-2 pr-12 border-2 border-gray-800 rounded-lg text-gray-900"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-gray-600 rounded flex items-center justify-center hover:border-gray-900 focus:outline-none transition-colors"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-2 pr-12 border-2 border-gray-800 rounded-lg text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-gray-600 rounded flex items-center justify-center hover:border-gray-900 focus:outline-none transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowCurrentPassword(false);
                    setShowNewPassword(false);
                    setShowConfirmPassword(false);
                  }}
                  className="flex-1 bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="flex-1 bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default UserSettingsModal;

