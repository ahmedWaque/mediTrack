import React, { useState } from 'react';
import axios from 'axios';

const RequestMedicineModal = ({ inventory, user, onClose, onRefresh, onError, colorTheme }) => {
  const theme = colorTheme || { modal: 'bg-orange-200', text: 'text-gray-900' };
  const [medicineSearch, setMedicineSearch] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const filteredMedicines = inventory?.filter(item =>
    item.item_name?.toLowerCase().includes(medicineSearch.toLowerCase())
  ) || [];

  const handleMedicineSelect = (item) => {
    setSelectedMedicine(item);
    setMedicineSearch(item.item_name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMedicine) {
      if (onError) {
        onError('Please select a medicine', 'error');
      }
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      await axios.post(
        'http://localhost:5000/requests',
        {
          item_id: selectedMedicine.item_id,
          item_name: selectedMedicine.item_name
        },
        { headers }
      );

      // Success - close modal and refresh
      if (onRefresh) {
        await onRefresh();
      }
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to submit request';
      if (onError) {
        onError(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
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
          className={`${theme.modal} border-2 border-gray-800 rounded-lg p-8 w-full max-w-md pointer-events-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${theme.text}`}>Request Medicine</h2>
            <button
              onClick={onClose}
              className={`${theme.text} hover:opacity-70 text-3xl font-bold w-8 h-8 flex items-center justify-center`}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className={`block text-sm font-medium ${theme.text} mb-2`}>
                Item name
              </label>
              <input
                type="text"
                value={medicineSearch}
                onChange={(e) => {
                  setMedicineSearch(e.target.value);
                  setShowDropdown(true);
                  setSelectedMedicine(null);
                }}
                onFocus={() => {
                  if (medicineSearch && filteredMedicines.length > 0) {
                    setShowDropdown(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                placeholder="Item name"
                className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                required
              />
              {showDropdown && medicineSearch && filteredMedicines.length > 0 && (
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

            <button
              type="submit"
              disabled={loading || !selectedMedicine}
              className={`w-full bg-white border-2 border-gray-800 ${theme.text} font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Submitting...' : 'Request'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default RequestMedicineModal;

