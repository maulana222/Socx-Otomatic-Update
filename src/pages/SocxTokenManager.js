import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import Swal from 'sweetalert2';

const SocxTokenManager = () => {
  const [tokenData, setTokenData] = useState({
    apiToken: ''
  });
  const [currentToken, setCurrentToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentToken();
  }, []);

  const loadCurrentToken = async () => {
    try {
      const response = await apiClient.request('/socx/token');
      if (response.success) {
        setCurrentToken(response.data);
      }
    } catch (error) {
      console.error('Failed to load token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTokenData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiClient.request('/socx/token', {
        method: 'POST',
        body: JSON.stringify({
          token: tokenData.apiToken
        })
      });

      if (response.success) {
        setTokenData({ apiToken: '' });
        await loadCurrentToken();
        
        Swal.fire({
          icon: 'success',
          title: 'Token Disimpan',
          text: 'Token Socx berhasil disimpan!',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Failed to save token:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Gagal menyimpan token'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeToken = async () => {
    const result = await Swal.fire({
      title: 'Ganti Token?',
      text: 'Anda yakin ingin mengganti token Socx dengan yang baru?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Ganti Token',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setCurrentToken(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Siap Mengganti Token',
        text: 'Silakan masukkan token baru!',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: 'Hapus Token?',
      text: 'Tindakan ini akan menghapus token secara permanen. Anda yakin?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await apiClient.request('/socx/token', {
          method: 'DELETE'
        });

        if (response.success) {
          setCurrentToken(null);
          
          Swal.fire({
            icon: 'success',
            title: 'Token Dihapus',
            text: 'Token berhasil dihapus!',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error('Failed to delete token:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Gagal menghapus token'
        });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Manajemen Token Socx</h1>

        {!currentToken?.hasToken ? (
          <div className="space-y-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Token API Socx
                </label>
                <textarea
                  name="apiToken"
                  value={tokenData.apiToken}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={5}
                  placeholder="Paste token Socx di sini..."
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Token'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-green-800">Token Aktif</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-md p-4">
              <div className="text-sm font-medium text-gray-500 mb-1">Terakhir Update</div>
              <div className="text-gray-900">{formatDate(currentToken.token?.updatedAt)}</div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleChangeToken}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Ganti Token
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocxTokenManager;