import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';
import Swal from 'sweetalert2';

const Header = () => {
  const [user, setUser] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { bearerToken, clearBearerToken } = useBearerToken();
  const navigate = useNavigate();

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

          {/* User Menu Section */}
          <div className="flex items-center space-x-4">
            {bearerToken && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md transition-colors"
                >
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                    {user.firstName?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-gray-700">
                    {user.firstName} {user.lastName}
                  </span>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
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
                        navigate('/socx-token');
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        Socx Token
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
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowUserMenu(false)}
        ></div>
      )}
    </header>
  );
};

export default Header;
