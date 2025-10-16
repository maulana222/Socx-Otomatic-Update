import React, { useState } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';

const Header = () => {
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const { bearerToken, updateBearerToken, clearBearerToken } = useBearerToken();

  const handleSaveToken = () => {
    if (tempToken.trim()) {
      updateBearerToken(tempToken.trim());
      setTempToken('');
      setShowTokenInput(false);
    }
  };

  const handleClearToken = () => {
    clearBearerToken();
    setTempToken('');
    setShowTokenInput(false);
  };

  

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              SOCX Tools
            </h1>
          </div>

          {/* Navigation removed as requested */}
          <div></div>

          {/* Bearer Token Section */}
          <div className="flex items-center space-x-4">
            {bearerToken ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Token: {bearerToken.substring(0, 20)}...</span>
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleClearToken}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTokenInput(true)}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Set Bearer Token
              </button>
            )}
          </div>
        </div>

        {/* Token Input Modal */}
        {showTokenInput && (
          <div className="py-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label htmlFor="bearer-token" className="block text-sm font-medium text-gray-700 mb-1">
                  Bearer Token
                </label>
                <input
                  type="text"
                  id="bearer-token"
                  value={tempToken}
                  onChange={(e) => setTempToken(e.target.value)}
                  placeholder="Enter your Bearer token here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleSaveToken}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowTokenInput(false);
                    setTempToken('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
