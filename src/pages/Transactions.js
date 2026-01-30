import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/api';
import { useBearerToken } from '../contexts/BearerTokenContext';

const Transactions = () => {
  const { bearerToken } = useBearerToken();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [allTransactions, setAllTransactions] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [queryField, setQueryField] = useState('msisdn');
  const [queryValue, setQueryValue] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const itemsPerPage = 20;

  // Format number with commas
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('en-US');
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'Rp 0';
    return `Rp ${formatNumber(amount)}`;
  };

  // Format date (Unix timestamp)
  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status from transaction
  const getStatus = useCallback((tx) => {
    // Merged transaction with refund - show as failed
    if (tx.merged) return 'failed';
    // REFUND is always considered as failed
    if (tx.code === 'REFUND') return 'failed';
    // Check pending first (done === 0 means pending)
    if (tx.done === 0) return 'pending';
    // Then check follow_up
    if (tx.follow_up === 1) return 'follow_up';
    // Success if return code is 00
    if (tx.rc === '00') return 'success';
    // Otherwise failed
    return 'failed';
  }, []);

  // Get status label
  const getStatusLabel = (tx) => {
    // Merged transaction with refund - show as Refund
    if (tx.merged) return 'Refund';
    // REFUND is always considered as failed
    if (tx.code === 'REFUND') return 'Refund';
    // Check pending first (done === 0 means pending)
    if (tx.done === 0) return 'Pending';
    // Then check follow_up
    if (tx.follow_up === 1) return 'Follow Up';
    // Success if return code is 00
    if (tx.rc === '00') return 'Success';
    // Otherwise failed
    return `Gagal (${tx.rc})`;
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusMap = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      follow_up: 'bg-blue-100 text-blue-800'
    };
    return statusMap[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  // Merge transactions by request_id
  const mergeTransactions = useCallback((txs) => {
    const merged = [];
    const refundMap = new Map(); // Map request_id -> refund transaction

    // First pass: collect REFUND transactions
    txs.forEach(tx => {
      if (tx.code === 'REFUND') {
        refundMap.set(tx.request_id, tx);
      }
    });

    // Second pass: create merged transactions
    const processed = new Set();
    txs.forEach(tx => {
      if (tx.code === 'REFUND') {
        // Skip REFUND, will be used for original transaction
        return;
      }

      // Check if there's a refund for this request_id
      const refund = refundMap.get(tx.request_id);
      
      if (refund) {
        // Create merged transaction with refund status
        merged.push({
          ...tx,
          id: refund.id, // Use refund ID as primary
          originalId: tx.id, // Store original ID
          refundId: refund.id,
          originalAmount: tx.total,
          refundAmount: refund.total,
          total: refund.total, // Show refund amount (negative)
          name: `${tx.name} (Refunded)`,
          note: refund.note,
          merged: true,
          refundData: refund
        });
        processed.add(tx.request_id);
      } else {
        // No refund, show original transaction
        if (!processed.has(tx.request_id)) {
          merged.push(tx);
          processed.add(tx.request_id);
        }
      }
    });

    return merged;
  }, []);

  // Calculate stats from transaction data (only pending)
  const calculatePendingStats = useCallback((txs) => {
    const merged = mergeTransactions(txs);
    let pendingCount = 0;
    
    merged.forEach(tx => {
      const status = getStatus(tx);
      if (status === 'pending') pendingCount++;
    });
    
    return pendingCount;
  }, [getStatus, mergeTransactions]);

  // Fetch transaction stats (success, failed, follow_up from API, pending from data)
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      if (response.success && response.data) {
        // Keep success, failed, and follow_up from API
        const apiStats = {
          success: response.data.success || 0,
          failed: response.data.failed || 0,
          followUp: response.data.followUp || 0,
          pending: 0 // Will be calculated from transaction data
        };
        setStats(apiStats);
      }
    } catch (err) {
      console.error('Error fetching transaction stats:', err);
    }
  }, []);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await apiClient.get('/suppliers');
      if (response.success && response.data) {
        setSuppliers(response.data);
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (preserveSearch = false) => {
    try {
      setError(null);
      
      // Build query parameters
      let queryParams = `page=1`;
      if (queryField !== 'all' && queryValue.trim() !== '') {
        queryParams += `&q=${queryField}&v=${queryValue.trim()}`;
      }
      
      const response = await apiClient.get(`/transactions?${queryParams}`);
      
      if (response.success && response.data) {
        const txs = response.data || [];
        setAllTransactions(txs);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Gagal mengambil data transaksi');
    } finally {
      setLoading(false);
    }
  }, [queryField, queryValue]);

  // Update stats when transactions change (only pending)
  useEffect(() => {
    if (allTransactions.length > 0) {
      const pendingCount = calculatePendingStats(allTransactions);
      
      // If stats exists, update pending. Otherwise, create initial stats object
      setStats(prev => {
        if (!prev) {
          return {
            success: 0,
            failed: 0,
            followUp: 0,
            pending: pendingCount
          };
        }
        return {
          ...prev,
          pending: pendingCount
        };
      });
    }
  }, [allTransactions, calculatePendingStats]);

  // Handle search
  const handleSearch = () => {
    setIsSearching(true);
    setPage(1);
    fetchTransactions(true);
  };

  // Handle status filter click (for Follow Up and Pending cards)
  const handleStatusFilter = (filterType, filterValue) => {
    setIsSearching(true);
    setQueryField(filterType);
    setQueryValue(filterValue);
    setPage(1);
    setStatusFilter(filterType);
    
    // Build query parameters for API
    let queryParams = `page=1`;
    if (filterType && filterValue) {
      queryParams += `&q=${filterType}&v=${filterValue}`;
    }
    
    // Fetch with filter parameters
    apiClient.get(`/transactions?${queryParams}`)
      .then(response => {
        if (response.success && response.data) {
          setAllTransactions(response.data || []);
          setLastUpdated(new Date());
        }
      })
      .catch(err => {
        console.error('Error filtering transactions:', err);
        setError('Gagal mengambil data transaksi');
      });
  };

  // Calculate filtered and paginated transactions
  const getFilteredAndPaginatedTransactions = () => {
    // Merge all transactions
    const merged = mergeTransactions(allTransactions);
    
    // Apply status filter
    let filtered = merged;
    if (statusFilter !== 'all') {
      filtered = merged.filter(tx => getStatus(tx) === statusFilter);
    }
    
    // Note: Search is now done on API side with q and v parameters
    
    // Apply pagination
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  // Calculate total pages
  const getTotalPages = () => {
    const merged = mergeTransactions(allTransactions);
    
    // Apply status filter
    let filtered = merged;
    if (statusFilter !== 'all') {
      filtered = merged.filter(tx => getStatus(tx) === statusFilter);
    }
    
    // Note: Search is now done on API side with q and v parameters
    
    return Math.ceil(filtered.length / itemsPerPage);
  };

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (bearerToken) {
      fetchStats();
      fetchTransactions();
      fetchSuppliers();
      
      // Auto-refresh every 3 seconds (only if not searching)
      const interval = setInterval(() => {
        if (!isSearching) {
          fetchStats();
          fetchTransactions();
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [bearerToken, isSearching, fetchStats, fetchTransactions, fetchSuppliers]);


  // Stat card component
  const StatCard = ({ title, value, color, onClick }) => (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-2 md:p-3 hover:shadow-md transition-all duration-200 cursor-pointer ${statusFilter === title.toLowerCase() ? 'ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 mb-1 capitalize">{title}</p>
          <p className="text-lg md:text-xl font-bold text-gray-900">{formatNumber(value)}</p>
        </div>
        <div className={`ml-2 md:ml-4 ${color}`}>
          <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {title === 'Sukses' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
            {title === 'Gagal' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />}
            {title === 'Pending' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {title === 'Follow Up' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />}
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-3 px-2 md:px-0">
      {/* Header */}
      <div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
          Transaksi
        </h1>
      </div>

      {/* Bearer Token Status */}
      {!bearerToken && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-yellow-500 mr-2">⚠️</span>
            <p className="text-xs md:text-sm text-yellow-800">
              Bearer Token belum diatur. Silakan atur token di Pengaturan untuk melihat transaksi.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && bearerToken && (
        <div>
          <h2 className="text-xs md:text-sm font-semibold text-gray-900 mb-2">Ringkasan Transaksi</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard
              title="Sukses"
              value={stats.success}
              color="text-green-500"
              onClick={() => setStatusFilter('success')}
            />
            <StatCard
              title="Gagal"
              value={stats.failed}
              color="text-red-500"
              onClick={() => setStatusFilter('failed')}
            />
            <StatCard
              title="Pending"
              value={stats.pending}
              color="text-yellow-500"
              onClick={() => handleStatusFilter('done', '0')}
            />
            <StatCard
              title="Follow Up"
              value={stats.followUp}
              color="text-blue-500"
              onClick={() => handleStatusFilter('follow_up', '1')}
            />
          </div>
        </div>
      )}

      {/* Refresh */}
      {bearerToken && (
        <div className="flex justify-end mb-3">
          <button
            onClick={fetchTransactions}
            className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && bearerToken && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-xs md:text-sm text-gray-600">Memuat transaksi...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">❌</span>
            <p className="text-xs md:text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {getFilteredAndPaginatedTransactions().length > 0 && !loading && bearerToken && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden p-3 md:p-4">
          {/* Search Filter */}
          <div className="flex flex-col md:flex-row gap-2 mb-4 items-start">
            <div className="w-full md:w-36">
              <select
                value={queryField}
                onChange={(e) => setQueryField(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="msisdn">No. HP</option>
                <option value="code">Kode</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            
            {queryField === 'supplier' ? (
              <div className="w-full md:w-56">
                <select
                  value={queryValue}
                  onChange={(e) => setQueryValue(e.target.value)}
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Pilih Supplier...</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="w-full md:w-56">
                <input
                  type="text"
                  value={queryValue}
                  onChange={(e) => setQueryValue(e.target.value)}
                  placeholder="Cari..."
                  className="w-full px-2 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            
            <button
              onClick={handleSearch}
              className="w-full md:w-auto px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs md:text-sm font-medium"
            >
              Cari
            </button>
            
            <button
              onClick={() => { setQueryValue(''); setQueryField('msisdn'); setPage(1); setIsSearching(false); fetchTransactions(); }}
              className="w-full md:w-auto px-2 md:px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs font-medium"
            >
              Reset
            </button>
          </div>

          <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Request
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      No. HP
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Kode
                    </th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      SN
                    </th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Reseller
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Supplier
                    </th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Kredit
                    </th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Saldo
                    </th>
                    <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Saldo Sup.
                    </th>
                    <th className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Status
                    </th>
                    <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Tanggal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredAndPaginatedTransactions().map((transaction) => {
                  const status = getStatus(transaction);
                  const rowBgColor = 
                    status === 'pending' ? 'bg-yellow-50' :
                    status === 'failed' ? 'bg-red-50' :
                    status === 'success' ? 'bg-blue-50' : '';
                  
                  return (
                    <tr key={transaction.id} className={`hover:bg-gray-100 ${rowBgColor}`}>
                      <td className="px-2 md:px-3 py-2 md:py-3 whitespace-nowrap text-[10px] md:text-xs text-gray-900">
                          <span className="hidden md:inline">{transaction.request_id || '-'}</span>
                          <span className="md:hidden">{transaction.request_id ? transaction.request_id.slice(-8) : '-'}</span>
                      </td>
                      <td className="px-2 md:px-3 py-2 md:py-3 whitespace-nowrap text-[10px] md:text-xs text-gray-900">
                          {transaction.msisdn || '-'}</td>
                      <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {transaction.code || '-'}</td>
                      <td className="hidden lg:table-cell px-3 py-3 text-xs text-gray-900 break-words max-w-32">
                          {transaction.sn || '-'}</td>
                      <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {transaction.reseller_name || '-'}</td>
                      <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {transaction.suppliers_module_name || '-'}</td>
                      <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {formatCurrency(transaction.credit)}</td>
                      <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {formatCurrency(transaction.balance)}</td>
                      <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {formatCurrency(transaction.supplier_balance)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 whitespace-nowrap">
                        <span className={`px-1.5 md:px-2 py-0.5 md:py-1 inline-flex text-[10px] md:text-xs leading-3 md:leading-4 font-semibold rounded-full ${getStatusBadge(status)}`}>
                          {getStatusLabel(transaction)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(transaction.created_time)}</td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>

          {/* Auto-refresh indicator */}
          {lastUpdated && (
            <div className="bg-blue-50 px-2 md:px-3 py-1 md:py-1.5 flex flex-col md:flex-row items-center justify-between border-t border-gray-200 text-xs">
              <div className="flex items-center mb-1 md:mb-0">
                <span className="text-blue-500 mr-2">🔄</span>
                <span className="text-blue-700">
                  Auto-refresh setiap 3 detik
                </span>
              </div>
              <span className="text-gray-500">
                Terakhir update: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Pagination */}
          <div className="bg-gray-50 px-3 md:px-4 py-2 md:py-3 flex items-center justify-between rounded-md mt-3 md:mt-4">
            <div className="flex items-center">
              <span className="text-xs md:text-sm text-gray-700 font-medium">
                Hal {page}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-2 md:px-4 py-1 md:py-2 bg-white border border-gray-300 rounded-md text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={page >= getTotalPages()}
                className="px-2 md:px-4 py-1 md:py-2 bg-blue-600 text-white rounded-md text-xs md:text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && bearerToken && getFilteredAndPaginatedTransactions().length === 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 md:p-12 text-center">
          <svg className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <h3 className="mt-2 text-xs md:text-sm font-medium text-gray-900">Tidak ada transaksi ditemukan</h3>
          <p className="mt-1 text-xs md:text-sm text-gray-500">
            {statusFilter !== 'all' ? `Tidak ada transaksi dengan status "${statusFilter}"` : 'Belum ada transaksi'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Transactions;