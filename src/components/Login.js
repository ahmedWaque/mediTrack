import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/login', {
        user_id: username,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store token in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (err) {
      console.error('Login error details:', err);
      
      // Handle different types of errors
      if (err.code === 'ECONNREFUSED' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please make sure the backend server is running on port 5000.');
      } else if (err.response) {
        // Server responded with error status
        setError(err.response.data?.message || `Login failed: ${err.response.status} ${err.response.statusText}`);
      } else if (err.request) {
        // Request was made but no response received
        setError('No response from server. Please check if the server is running.');
      } else {
        // Something else happened
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-300 flex items-center justify-center">
      <div className="w-full max-w-md p-8">
        {/* Title */}
        <h1 className="text-6xl font-bold text-gray-800 text-center mb-16 tracking-wide">
          MEDITRACK
        </h1>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-lg font-medium text-gray-900 mb-2">
              Username:
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-lg font-medium text-gray-900 mb-2">
              Password:
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 text-gray-900"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 border-2 border-gray-600 rounded flex items-center justify-center hover:border-gray-900 focus:outline-none transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white border border-gray-800 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Logging in...' : 'login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;



