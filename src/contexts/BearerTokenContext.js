import React, { createContext, useContext, useState, useEffect } from 'react';

const BearerTokenContext = createContext();

export const useBearerToken = () => {
  const context = useContext(BearerTokenContext);
  if (!context) {
    throw new Error('useBearerToken must be used within a BearerTokenProvider');
  }
  return context;
};

export const BearerTokenProvider = ({ children }) => {
  const [bearerToken, setBearerToken] = useState('');

  useEffect(() => {
    // Load token from localStorage on component mount
    const savedToken = localStorage.getItem('socx_bearer_token');
    if (savedToken) {
      setBearerToken(savedToken);
    }
  }, []);

  const updateBearerToken = (token) => {
    setBearerToken(token);
    localStorage.setItem('socx_bearer_token', token);
  };

  const clearBearerToken = () => {
    setBearerToken('');
    localStorage.removeItem('socx_bearer_token');
  };

  const value = {
    bearerToken,
    updateBearerToken,
    clearBearerToken,
  };

  return (
    <BearerTokenContext.Provider value={value}>
      {children}
    </BearerTokenContext.Provider>
  );
};
