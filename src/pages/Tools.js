import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../utils/api';

const Tools = () => {
  const [tokenStatus, setTokenStatus] = useState({
    isValid: false,
    loading: true,
    message: 'Memeriksa token...'
  });

  const toolFeatures = [
    {
      id: 'product-update',
      title: 'Update Product Supplier Otomatis',
      description: 'Upload file Excel untuk update data produk secara otomatis ke SOCX API',
      icon: '📊',
      path: '/product-update',
      status: 'active'
    },
    {
      id: 'pulsa-transfer-update',
      title: 'Update Pulsa Transfer Otomatis',
      description: 'Kelola pot pulsa transfer untuk berbagai provider dan supplier',
      icon: '📱',
      path: '/pulsa-transfer-update',
      status: 'active'
    },
    {
      id: 'freefire-update',
      title: 'Update Free Fire Otomatis',
      description: 'Kelola harga produk Free Fire berdasarkan rate supplier dan harga jual',
      icon: '🎮',
      path: '/freefire-update',
      status: 'active'
    },
    {
      id: 'emoney-update',
      title: 'Update E-Money',
      description: 'Kelola harga e-money (OVO, DANA, LinkAja, GoPay) berbasis tambahan harga',
      icon: '💳',
      path: '/emoney-update',
      status: 'active'
    },
    {
      id: 'isimple-produksi',
      title: 'Isimple Produksi',
      description: 'Cek paket data unik berdasarkan nomor telepon dengan fitur download Excel',
      icon: '📱',
      path: '/isimple-produksi',
      status: 'active'
    },
    {
      id: 'tri-produksi',
      title: 'Tri Rita Produksi',
      description: 'Cek paket data unik Tri Rita berdasarkan nomor telepon dengan fitur download Excel',
      icon: '📱',
      path: '/tri-produksi',
      status: 'active'
    }
  ];

  // Validate token with backend
  useEffect(() => {
    const validateToken = async () => {
      setTokenStatus({
        isValid: false,
        loading: true,
        message: 'Memeriksa token...'
      });

      try {
        const response = await apiClient.request('/socx/settings/validate-token');
        
        if (response.success && response.data.isValid) {
          setTokenStatus({
            isValid: true,
            loading: false,
            message: 'Token aktif dan valid'
          });
        } else {
          setTokenStatus({
            isValid: false,
            loading: false,
            message: response.data.message || 'Token tidak valid'
          });
        }
      } catch (error) {
        setTokenStatus({
          isValid: false,
          loading: false,
          message: error.message || 'Gagal memvalidasi token'
        });
      }
    };

    validateToken();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>;
      case 'coming-soon':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Coming Soon</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Bearer Token Status - Validated with Backend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Status Bearer Token</h2>
            <p className="text-gray-600">
              {tokenStatus.message}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {tokenStatus.loading ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Loading...
              </span>
            ) : tokenStatus.isValid ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                ✓ Token Active
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                ⚠ Token Required
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tools yang Tersedia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolFeatures.map((tool) => (
            <div
              key={tool.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200 hover:shadow-md hover:border-primary-300 cursor-pointer`}
            >
              <Link to={tool.path} className="block">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">{tool.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{tool.title}</h3>
                      {getStatusBadge(tool.status)}
                    </div>
                    <p className="text-gray-600 text-sm">{tool.description}</p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Cara Penggunaan Tools</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Pastikan Bearer Token telah diatur dan valid</li>
          <li>Pilih tool yang ingin digunakan dari card di atas</li>
          <li>Untuk Update Product, upload file Excel dengan format yang sesuai</li>
          <li>Untuk Pulsa Transfer, pilih provider, supplier, dan input pot yang diinginkan</li>
          <li>Untuk Free Fire, pilih supplier, input rate dan harga jual untuk update otomatis</li>
          <li>Untuk E-Money, kelola harga e-money (OVO, DANA, LinkAja, GoPay) berbasis tambahan harga</li>
          <li>Untuk Isimple Produksi, cek paket data unik berdasarkan nomor telepon</li>
          <li>Untuk Tri Produksi, cek paket data unik Tri Rita berdasarkan nomor telepon</li>
          <li>Data akan otomatis dikirim ke SOCX API menggunakan token yang telah diatur</li>
        </ol>
      </div>
    </div>
  );
};

export default Tools;