// components/PromptModal.js
import React, { useState, useEffect } from 'react';

export default function PromptModal({ 
  title = 'Enter value', 
  defaultValue = '', 
  onCancel, 
  onSubmit 
}) {
  const [value, setValue] = useState(defaultValue);

  // Close on ESC
  useEffect(() => {
    const handler = e => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-md p-6 w-80 shadow-lg">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <input
          autoFocus
          className="w-full border rounded px-3 py-2 mb-4"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <div className="flex justify-end space-x-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >Cancel</button>
          <button
            onClick={() => onSubmit(value)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >OK</button>
        </div>
      </div>
    </div>
  );
}
