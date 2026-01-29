import React, { useState, useEffect } from 'react';
import apiClient from '../utils/api';
import Swal from 'sweetalert2';

const SettingsManager = () => {
  const [settingsData, setSettingsData] = useState({
    socxToken: '',
    socxBaseUrl: 'https://indotechapi.socx.app'
  });
  const [currentSettings, setCurrentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      const response = await apiClient.request('/socx/settings');
      if (response.success) {
        setCurrentSettings(response.data);
        setSettingsData(prev => ({
          ...prev,
          socxBaseUrl: response.data.socx_base_url || 'https://indotechapi.socx.app'
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettingsData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await apiClient.request('/socx/settings', {
        method: 'POST',
        body: JSON.stringify({
          socxToken: settingsData.socxToken,
          socxBaseUrl: settingsData.socxBaseUrl
        })
      });

      if (response.success) {
        setSettingsData(prev => ({
          ...prev,
          socxToken: ''
        }));
        await loadCurrentSettings();
        
        Swal.fire({
          icon: 'success',
          title: 'Pengaturan Disimpan',
          text: 'Pengaturan berhasil disimpan!',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Gagal menyimpan pengaturan'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChangeToken = async () => {
    const result = await Swal.fire({
      title: 'Ganti Token?',
      text: 'Anda yakin ingin mengganti token SOCX dengan yang baru?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Ganti Token',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      setSettingsData(prev => ({
        ...prev,
        socxToken: ''
      }));
      
      Swal.fire({
        icon: 'success',
        title: 'Siap Mengganti Token',
        text: 'Silakan masukkan token baru!',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const handleDeleteToken = async () => {
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
        const response = await apiClient.request('/socx/settings/token', {
          method: 'DELETE'
        });

        if (response.success) {
          setCurrentSettings(prev => ({
            ...prev,
            socx_token: null
          }));
          
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Pengaturan SOCX</h1>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SOCX Base URL
            </label>
            <input
              type="url"
              name="socxBaseUrl"
              value={settingsData.socxBaseUrl}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://indotechapi.socx.app"
              required
            />
            <p className="text-xs text-gray-500 mt-1">URL dasar API SOCX untuk request</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token API SOCX
            </label>
            <textarea
              name="socxToken"
              value={settingsData.socxToken}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={5}
              placeholder="Paste token SOCX di sini..."
            />
            <p className="text-xs text-gray-500 mt-1">Kosongkan jika tidak ingin mengubah token yang sudah ada</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>

        {currentSettings?.socx_token && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-green-800">Token Aktif</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Token saat ini sedang aktif dan dapat digunakan untuk request ke SOCX API
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-md p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">Base URL</div>
                <div className="text-gray-900 break-all">{currentSettings.socx_base_url || 'N/A'}</div>
              </div>

              <div className="bg-gray-50 rounded-md p-4">
                <div className="text-sm font-medium text-gray-500 mb-1">Token</div>
                <div className="text-gray-900 truncate">
                  {currentSettings.socx_token ? '•••••••••••••••••••••••••••' : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleChangeToken}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Ganti Token
              </button>
              <button
                onClick={handleDeleteToken}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                Hapus Token
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManager;