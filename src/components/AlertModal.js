import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AlertModal = ({ user, onClose, onRefresh, onError, colorTheme }) => {
  const theme = colorTheme || { modal: 'bg-blue-300', modalHeader: 'bg-blue-300', text: 'text-gray-900', logoText: 'text-gray-800' };
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get('http://localhost:5000/alert', { headers });
      setRequests(response.data.requests || []);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch alert requests';
      if (onError) {
        onError(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeny = async (requestId, status) => {
    setProcessing(requestId);
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      await axios.put(
        `http://localhost:5000/alert/${requestId}`,
        { status },
        { headers }
      );

      // Refresh requests and parent data
      await fetchRequests();
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || `Failed to ${status} request`;
      if (onError) {
        onError(errorMessage, 'error');
      }
    } finally {
      setProcessing(null);
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
          className={`${theme.modal} w-full max-w-4xl max-h-[90vh] mx-4 rounded-lg border-2 border-gray-800 overflow-hidden pointer-events-auto flex flex-col`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${theme.modalHeader} p-6 border-b-2 border-gray-800 flex justify-between items-center`}>
            <div className={`text-4xl font-bold ${theme.logoText} tracking-wide`}>Medicine Requests</div>
            <button
              onClick={onClose}
              className="text-gray-900 hover:text-gray-700 text-3xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center text-gray-900 text-xl">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center text-gray-900 text-xl">No pending requests</div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.request_id}
                    className="bg-white border-2 border-gray-800 rounded-lg p-6"
                  >
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Nurse Name
                        </label>
                        <div className="px-4 py-2 bg-gray-100 border-2 border-gray-800 rounded-lg text-gray-900">
                          {request.name}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Nurse ID
                        </label>
                        <div className="px-4 py-2 bg-gray-100 border-2 border-gray-800 rounded-lg text-gray-900">
                          {request.user_id}
                        </div>
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Item Name
                      </label>
                      <div className="px-4 py-2 bg-gray-100 border-2 border-gray-800 rounded-lg text-gray-900">
                        {request.item_name}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => handleApproveDeny(request.request_id, 'approved')}
                        disabled={processing === request.request_id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === request.request_id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleApproveDeny(request.request_id, 'denied')}
                        disabled={processing === request.request_id}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === request.request_id ? 'Processing...' : 'Deny'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`${theme.modalHeader} p-6 border-t-2 border-gray-800 flex justify-end`}>
            <button
              onClick={onClose}
              className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlertModal;

