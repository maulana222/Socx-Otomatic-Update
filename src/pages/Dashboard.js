import React from 'react';
import { Link } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';

const Dashboard = () => {
  const { bearerToken } = useBearerToken();

  const features = [
    {
      id: 'product-update',
      title: 'Update Product Otomatis',
      description: 'Upload file Excel untuk update data produk secara otomatis ke SOCX API',
      icon: '📊',
      path: '/product-update',
      status: 'active'
    },
    {
      id: 'cek-promo-isimple',
      title: 'Cek Promo iSimple',
      description: 'Fitur untuk mengecek promo dari iSimple (akan segera hadir)',
      icon: '🎁',
      path: '#',
      status: 'coming-soon'
    },
    {
      id: 'cek-promo-digipos',
      title: 'Cek Promo DigiPos',
      description: 'Fitur untuk mengecek promo dari DigiPos (akan segera hadir)',
      icon: '🏪',
      path: '#',
      status: 'coming-soon'
    },
    {
      id: 'feature-4',
      title: 'Fitur Lainnya',
      description: 'Fitur tambahan akan segera hadir (akan segera hadir)',
      icon: '🔧',
      path: '#',
      status: 'coming-soon'
    }
  ];

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
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Selamat Datang di SOCX Otomatic Update
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Platform untuk mengelola dan mengupdate data produk secara otomatis ke SOCX API
        </p>
      </div>

      {/* Bearer Token Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Status Bearer Token</h2>
            <p className="text-gray-600">
              {bearerToken 
                ? 'Token telah diatur dan siap digunakan untuk API calls'
                : 'Token belum diatur. Silakan atur Bearer Token di header untuk menggunakan fitur API'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {bearerToken ? (
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

      {/* Features Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Fitur yang Tersedia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
                feature.status === 'active' 
                  ? 'hover:shadow-md hover:border-primary-300 cursor-pointer' 
                  : 'opacity-75 cursor-not-allowed'
              }`}
            >
              {feature.status === 'active' ? (
                <Link to={feature.path} className="block">
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{feature.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                        {getStatusBadge(feature.status)}
                      </div>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex items-start space-x-4">
                  <div className="text-3xl opacity-50">{feature.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-400">{feature.title}</h3>
                      {getStatusBadge(feature.status)}
                    </div>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Cara Penggunaan</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Atur Bearer Token di header aplikasi untuk mengakses SOCX API</li>
          <li>Pilih fitur yang ingin digunakan dari card di atas</li>
          <li>Untuk Update Product, upload file Excel dengan format yang sesuai</li>
          <li>Data akan otomatis dikirim ke SOCX API menggunakan token yang telah diatur</li>
        </ol>
      </div>
    </div>
  );
};

export default Dashboard;
