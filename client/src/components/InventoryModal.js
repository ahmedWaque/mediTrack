import React, { useState } from 'react';
import axios from 'axios';

const InventoryModal = ({ inventory, user, onClose, onRefresh, onError, colorTheme }) => {
  const theme = colorTheme || { modal: 'bg-blue-300', modalHeader: 'bg-blue-300', text: 'text-gray-900', logoText: 'text-gray-800' };
  const [editingItem, setEditingItem] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    item_name: '',
    quantity: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_id: item.item_id,
      item_name: item.item_name,
      quantity: item.quantity
    });
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setFormData({ item_id: '', item_name: '', quantity: 0 });
    setError('');
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
      let response;
      if (editingItem) {
        // Update existing item
        // Nurses can only update quantity
        // Handle empty quantity string - convert to 0
        const quantity = formData.quantity === '' ? 0 : formData.quantity;
        const updateData = user.role === 'n' 
          ? { quantity: quantity }
          : { item_name: formData.item_name, quantity: quantity };

        response = await axios.put(
          `http://localhost:5000/inventory/${editingItem.item_id}`,
          updateData,
          { headers }
        );
      } else {
        // Add new item (only managers and directors)
        // Handle empty quantity string - convert to 0
        const quantity = formData.quantity === '' ? 0 : formData.quantity;
        response = await axios.post(
          'http://localhost:5000/inventory',
          { ...formData, quantity: quantity },
          { headers }
        );
      }

      // Only proceed if the request was successful (status 200-299)
      if (response && response.status >= 200 && response.status < 300) {
        setError(''); // Clear any previous errors
        handleCancel();
        // Immediately refresh the data
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (err) {
      // Only show error if the request actually failed
      if (err.response && err.response.status >= 400) {
        const errorMessage = err.response?.data?.message || 'Failed to save inventory item';
        
        // Handle permission errors (403)
        if (err.response?.status === 403) {
          const permissionMessage = `${user.name || 'User'} cannot complete this action because of insufficient permissions. ${errorMessage}`;
          setError(permissionMessage);
          // Temporarily suppressed - will fix later
          // if (onError) {
          //   onError(permissionMessage, 'error');
          // }
        } else if (err.response?.status === 401) {
          const authMessage = 'Session expired. Please log in again.';
          setError(authMessage);
          // Temporarily suppressed - will fix later
          // if (onError) {
          //   onError(authMessage, 'error');
          // }
        } else {
          setError(errorMessage);
          // Temporarily suppressed - will fix later
          // if (onError) {
          //   onError(errorMessage, 'error');
          // }
        }
      } else {
        // Network error or other non-HTTP error
        const errorMessage = 'Failed to save inventory item. Please check your connection.';
        setError(errorMessage);
        // Temporarily suppressed - will fix later
        // if (onError) {
        //   onError(errorMessage, 'error');
        // }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.delete(`http://localhost:5000/inventory/${itemId}`, { headers });
      
      // Only proceed if the request was successful (status 200-299)
      if (response.status >= 200 && response.status < 300) {
        setError(''); // Clear any previous errors
        // Immediately refresh the data
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (err) {
      // Only show error if the request actually failed
      if (err.response && err.response.status >= 400) {
        const errorMessage = err.response?.data?.message || 'Failed to delete item';
        
        // Handle permission errors (403)
        if (err.response?.status === 403) {
          const permissionMessage = `${user.name || 'User'} cannot complete this action because of insufficient permissions. Only Directors can delete items.`;
          setError(permissionMessage);
          // Temporarily suppressed - will fix later
          // if (onError) {
          //   onError(permissionMessage, 'error');
          // }
        } else if (err.response?.status === 401) {
          const authMessage = 'Session expired. Please log in again.';
          setError(authMessage);
          // Temporarily suppressed - will fix later
          // if (onError) {
          //   onError(authMessage, 'error');
          // }
        } else {
          setError(errorMessage);
          // Temporarily suppressed - will fix later
          // if (onError) {
          //   onError(errorMessage, 'error');
          // }
        }
      } else {
        // Network error or other non-HTTP error
        const errorMessage = 'Failed to delete item. Please check your connection.';
        setError(errorMessage);
        // Temporarily suppressed - will fix later
        // if (onError) {
        //   onError(errorMessage, 'error');
        // }
      }
    }
  };

  const canAdd = user.role === 'm' || user.role === 'd';
  const canEdit = true; // All roles can edit (nurses limited to quantity)
  const canDelete = user.role === 'd'; // Only directors can delete

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
            {(showAddForm || editingItem) && (
              <div className="bg-white border-2 border-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                </h3>
                {user.role === 'n' && editingItem && (
                  <p className="text-sm text-gray-600 mb-4">Note: Nurses can only update quantity.</p>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Item ID {editingItem && '(read-only)'}
                      </label>
                      <input
                        type="text"
                        value={formData.item_id}
                        onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                        required
                        maxLength={12}
                        disabled={!!editingItem}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Item Name {user.role === 'n' && editingItem && '(read-only)'}
                      </label>
                      <input
                        type="text"
                        value={formData.item_name}
                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                        required={!editingItem || user.role !== 'n'}
                        disabled={user.role === 'n' && editingItem}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.quantity === '' ? '' : formData.quantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string, otherwise parse as integer
                        setFormData({ ...formData, quantity: value === '' ? '' : (parseInt(value) || 0) });
                      }}
                      className="w-full px-4 py-2 border-2 border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                      min="0"
                    />
                  </div>
                  {/* Error display temporarily suppressed - will fix later */}
                  {false && error && (
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
                <h3 className="text-lg font-bold text-gray-900">Inventory Items</h3>
                {canAdd && !showAddForm && !editingItem && (
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      setEditingItem(null);
                      setFormData({ item_id: '', item_name: '', quantity: 0 });
                    }}
                    className="bg-white border-2 border-gray-800 text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Add Item
                  </button>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-800">
                    <th className="px-4 py-3 text-left font-semibold text-gray-900 border-r-2 border-gray-800">name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-900">Quantity</th>
                    {(canEdit || canDelete) && (
                      <th className="px-4 py-3 text-left font-semibold text-gray-900">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item, index) => (
                    <tr key={item.item_id} className="border-b-2 border-gray-800">
                      <td className="px-4 py-3 text-gray-900 border-r-2 border-gray-800">{item.item_name}</td>
                      <td className="px-4 py-3 text-gray-900">{item.quantity}</td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3 text-gray-900">
                          <div className="flex gap-4">
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(item.item_id)}
                                className="text-red-600 hover:text-red-800 underline"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={canEdit || canDelete ? "3" : "2"} className="px-4 py-8 text-center text-gray-600">No inventory items available</td>
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

export default InventoryModal;
