import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';
import apiClient from '../utils/api';
import Swal from 'sweetalert2';

const Header = () => {
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [socxTokenStatus, setSocxTokenStatus] = useState({
    isValid: false,
    hasToken: false,
    message: 'Checking...',
    loading: true
  });
  const { bearerToken, clearBearerToken } = useBearerToken();
  const navigate = useNavigate();
  const location = useLocation();

  // Load user data from localStorage
  useEffect(() => {
    if (bearerToken) {
      const savedUser = localStorage.getItem('socx_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('socx_user');
        }
      }
    } else {
      setUser(null);
    }
  }, [bearerToken]);

  // Validate SOCX token on page load and route change
  useEffect(() => {
    const validateToken = async () => {
      if (!bearerToken || !user) {
        setSocxTokenStatus({
          isValid: false,
          hasToken: false,
          message: 'Not logged in',
          loading: false
        });
        return;
      }

      setSocxTokenStatus({
        isValid: false,
        hasToken: false,
        message: 'Validating...',
        loading: true
      });

      try {
        const response = await apiClient.request('/socx/settings/validate-token');
        
        if (response.success) {
          setSocxTokenStatus({
            isValid: response.data.isValid,
            hasToken: response.data.hasToken,
            message: response.data.message,
            loading: false
          });
        }
      } catch (error) {
        setSocxTokenStatus({
          isValid: false,
          hasToken: false,
          message: 'Validation failed',
          loading: false
        });
      }
    };

    validateToken();
  }, [bearerToken, user, location.pathname]);

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout Confirmation',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        clearBearerToken();
        localStorage.removeItem('socx_user');
        setUser(null);
        setShowUserMenu(false);

        Swal.fire({
          icon: 'success',
          title: 'Logged out successfully',
          timer: 1500,
          showConfirmButton: false
        });

        // Redirect to login page
        navigate('/login');
      }
    });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              SOCX Tools
            </h1>
          </div>

          {/* Mobile Menu Button */}
          {bearerToken && user && (
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}

          {/* Desktop Navigation */}
          {bearerToken && user && (
            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => navigate('/')}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                  location.pathname === '/' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => navigate('/transactions')}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                  location.pathname === '/transactions' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Transactions
              </button>

              <button
                onClick={() => navigate('/tools')}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium rounded-md transition-colors ${
                  location.pathname === '/tools' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-700 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                Tools
              </button>
            </nav>
          )}

          {/* Right Section: SOCX Token Status and User Menu (Desktop) */}
          <div className="hidden md:flex items-center space-x-3 md:space-x-4">
            {/* SOCX Token Status - Only show when logged in */}
            {bearerToken && user && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-gray-200 bg-gray-50">
                {socxTokenStatus.loading ? (
                  <span className="text-xs text-gray-600">Checking...</span>
                ) : socxTokenStatus.isValid ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-green-700 font-medium">SOCX Token Valid</span>
                  </>
                ) : socxTokenStatus.hasToken ? (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-xs text-red-700 font-medium hover:underline"
                    >
                      Token Expired
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-xs text-gray-700 font-medium hover:underline"
                    >
                      Set Token
                    </button>
                  </>
                )}
              </div>
            )}

            {/* User Menu Section */}
            <div>
              {bearerToken && user ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 text-xs md:text-sm bg-gray-100 hover:bg-gray-200 px-2 md:px-3 py-1.5 md:py-2 rounded-md transition-colors"
                  >
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-xs md:text-sm">
                      {user.firstName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:block text-gray-700">
                      {user.firstName} {user.lastName}
                    </span>
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* User Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 md:w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-500 capitalize">Role: {user.role}</p>
                      </div>
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setShowUserMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </div>
                      </button>
                      <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Settings
                        </div>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                    <button
                      onClick={() => navigate('/settings')}
                      className="text-xs text-gray-700 font-medium hover:underline"
                    >
                      Set Token
                    </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && bearerToken && user && (
          <div className="md:hidden absolute top-14 md:top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40 px-4 py-3 space-y-2">
            <button
              onClick={() => { navigate('/'); setShowMobileMenu(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => { navigate('/transactions'); setShowMobileMenu(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/transactions' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Transactions
            </button>

            <button
              onClick={() => { navigate('/tools'); setShowMobileMenu(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/tools' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tools
            </button>

            <div className="border-t border-gray-200 pt-2 mt-2">
              {/* SOCX Token Status for Mobile */}
              <div className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-50 mb-2">
                {socxTokenStatus.loading ? (
                  <span className="text-xs text-gray-600">Checking...</span>
                ) : socxTokenStatus.isValid ? (
                  <>
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-xs text-green-700 font-medium">SOCX Token Valid</span>
                  </>
                ) : socxTokenStatus.hasToken ? (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    <button
                      onClick={() => { navigate('/settings'); setShowMobileMenu(false); }}
                      className="text-xs text-red-700 font-medium hover:underline"
                    >
                      Token Expired
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    <button
                      onClick={() => { navigate('/settings'); setShowMobileMenu(false); }}
                      className="text-xs text-gray-700 font-medium hover:underline"
                    >
                      Set Token
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => { navigate('/settings'); setShowMobileMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={() => { navigate('/profile'); setShowMobileMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showMobileMenu) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setShowUserMenu(false); setShowMobileMenu(false); }}
        ></div>
      )}
    </header>
  );
};

export default Header;