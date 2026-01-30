import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/api';
import { useBearerToken } from '../contexts/BearerTokenContext';

const Dashboard = () => {
  const { bearerToken } = useBearerToken();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Format number with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('en-US');
  };

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      setError(null);
      const response = await apiClient.get('/dashboard/stats');
      
      if (response.success && response.data) {
        setStats(response.data);
        setLastUpdated(new Date(response.data.lastUpdated));
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to fetch dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and auto-refresh every 5 seconds
  useEffect(() => {
    if (bearerToken) {
      fetchStats();
      const interval = setInterval(fetchStats, 5000); // 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [bearerToken]);

  // Stat card component
  const StatCard = ({ title, value, color, icon, subtitle }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(value)}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`ml-4 ${color}`}>
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
      </div>
    </div>
  );

  // Balance card component (with larger value)
  const BalanceCard = ({ title, value, color, icon }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">Rp {formatNumber(value)}</p>
        </div>
        <div className={`ml-4 ${color}`}>
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time statistics from SOCX API
          </p>
        </div>
        {lastUpdated && (
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Bearer Token Status */}
      {!bearerToken && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-yellow-500 mr-2">⚠️</span>
            <p className="text-yellow-800">
              Bearer Token belum diatur. Silakan atur token di Settings untuk melihat statistik.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && bearerToken && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard statistics...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Section */}
      {stats && !loading && (
        <div className="space-y-6">
          {/* Transaction Stats Row */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Transaction Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Pending"
                value={stats.pending}
                color="text-yellow-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
                subtitle="Waiting for processing"
              />
              <StatCard
                title="Follow Up"
                value={stats.followUp}
                color="text-blue-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />}
                subtitle="Requires attention"
              />
              <StatCard
                title="Success"
                value={stats.success}
                color="text-green-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
                subtitle="Completed transactions"
              />
              <StatCard
                title="Failed"
                value={stats.failed}
                color="text-red-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
                subtitle="Failed transactions"
              />
            </div>
          </div>

          {/* Total Transactions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Transactions Today</h2>
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Transactions</p>
                  <p className="text-5xl font-bold">{formatNumber(stats.total)}</p>
                </div>
                <svg className="w-24 h-24 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Balance Stats Row */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Balance Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BalanceCard
                title="Total Reseller Balance"
                value={stats.totalResellerBalance}
                color="text-green-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
              />
              <BalanceCard
                title="Total Transaction Success"
                value={stats.totalTransactionSuccess}
                color="text-blue-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
              />
              <BalanceCard
                title="Total Deposit"
                value={stats.totalDeposit}
                color="text-purple-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />}
              />
              <BalanceCard
                title="Total Balance on Suppliers"
                value={stats.totalSuppliersBalance}
                color="text-orange-500"
                icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/product-update"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Update Products</h3>
                    <p className="text-sm text-gray-600">Upload Excel file</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/pulsa-transfer-update"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Pulsa Transfer</h3>
                    <p className="text-sm text-gray-600">Update pot pulsa</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/freefire-update"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Free Fire</h3>
                    <p className="text-sm text-gray-600">Update harga FF</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/emoney-update"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">E-Money</h3>
                    <p className="text-sm text-gray-600">Update harga e-money</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/socx-token-manager"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11.536 14H8a2 2 0 00-2 2v-2a2 2 0 00-2-2H5.743a6 6 0 01-5.743-7.743z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">Manage Token</h3>
                    <p className="text-sm text-gray-600">Atur SOCX token</p>
                  </div>
                </div>
              </Link>
              <Link
                to="/tools"
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-center space-x-4">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 4.635.826a1.724 1.724 0 001.764-.062c1.523 1.382 3.686 1.563 4.792.276.75-.016 1.364-.816 1.426-.838a1.724 1.724 0 001.764-.062c1.523 1.382 3.686 1.563 4.792.276.75-.016 1.364-.816 1.426-.838a1.724 1.724 0 001.764-.062c1.523 1.382 3.686 1.563 4.792.276.75-.016 1.364-.816 1.426-.838a1.724 1.724 0 001.764-.062c1.523 1.382 3.686 1.563 4.792.276.75-.016 1.364-.816 1.426-.838z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-gray-900">All Tools</h3>
                    <p className="text-sm text-gray-600">Lihat semua fitur</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Auto-refresh Indicator */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-blue-500 mr-2">🔄</span>
                <div>
                  <p className="font-medium text-blue-900">Auto-refresh Enabled</p>
                  <p className="text-sm text-blue-700">Data updates automatically every 5 seconds</p>
                </div>
              </div>
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Refresh Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;