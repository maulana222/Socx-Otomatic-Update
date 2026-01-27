import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';
import Swal from 'sweetalert2';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const { updateBearerToken, bearerToken } = useBearerToken();
  const navigate = useNavigate();
  const location = useLocation();

  // Entrance animation
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (bearerToken) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [bearerToken, navigate, location]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill in all fields'
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call backend API
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (data.success) {
        // Store tokens
        updateBearerToken(data.data.tokens.accessToken);

        // Store user data
        localStorage.setItem('socx_user', JSON.stringify(data.data.user));

        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: `Welcome back, ${data.data.user.firstName}!`,
          timer: 2000,
          showConfirmButton: false
        });

        // Redirect to dashboard or previous page
        const from = location.state?.from?.pathname || '/';
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 2000);

      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: data.message || 'Invalid credentials'
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server. Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-16 overflow-hidden">
      <div className="max-w-lg w-full">
        {/* Login Form */}
        <form 
          className={`space-y-6 bg-white rounded-2xl shadow-2xl p-8 transform transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}
          style={{ transitionDelay: '0.2s' }}
          onSubmit={handleSubmit}
        >
          {/* Animated Title inside card */}
          <div 
            className={`text-center mb-10 transition-all duration-700 ease-out transform ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '0.3s' }}
          >
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent animate-gradient-x pb-4">
              Login
            </h1>
          </div>

          {/* Username Field */}
          <div className="group">
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2 transform transition-all duration-200 group-focus-within:text-gray-900">
              Username or Email
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:bg-white focus:shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 transform transition-all duration-200 group-focus-within:text-gray-900">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300 focus:bg-white focus:shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md pr-12"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center">
            <input
              id="rememberMe"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
              className="h-4 w-4 text-gray-900 focus:ring-gray-300 border-gray-300 rounded cursor-pointer"
              disabled={isLoading}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
              Ingatkan saya
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-semibold hover:from-gray-800 hover:to-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Login;