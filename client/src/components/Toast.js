import React, { useEffect } from 'react';

const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';

  return (
    <div className={`fixed top-4 right-4 ${bgColor} border-2 px-6 py-4 rounded-lg shadow-lg z-[100] flex items-center justify-between min-w-[300px] max-w-[500px]`}>
      <div className="flex-1 pr-4">
        <p className="font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-gray-700 hover:text-gray-900 font-bold text-xl"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
