import React, { useState, useEffect } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import axios from 'axios';

const PulsaTransferUpdate = () => {
  const { bearerToken } = useBearerToken();
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierPot, setSupplierPot] = useState('');
  const [sellPot, setSellPot] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);

  // Data provider
  const providers = [
    {
      id: 1,
      name: 'Telkomsel',
      icon: '📞',
      color: 'bg-blue-500'
    },
    {
      id: 2,
      name: 'Indosat',
      icon: '📱',
      color: 'bg-red-500'
    },
    {
      id: 3,
      name: 'XL Axiata',
      icon: '📶',
      color: 'bg-purple-500'
    },
    {
      id: 4,
      name: 'Tri',
      icon: '🌳',
      color: 'bg-green-500'
    },
    {
      id: 5,
      name: 'Smartfren',
      icon: '📲',
      color: 'bg-orange-500'
    }
  ];

  const selectedProviderData = providers.find(p => p.id === selectedProvider);
  const selectedSupplierData = allSuppliers.find(s => s.id === selectedSupplier);

  // Fetch suppliers when provider is selected
  useEffect(() => {
    if (selectedProvider && bearerToken) {
      fetchSuppliersByProvider();
    }
  }, [selectedProvider, bearerToken]);

  // Fetch supplier products when supplier is selected
  useEffect(() => {
    if (selectedSupplier && bearerToken) {
      fetchSupplierProducts();
    }
  }, [selectedSupplier, bearerToken]);

  const fetchSuppliersByProvider = async () => {
    setIsLoadingSuppliers(true);
    try {
      // Fetch all suppliers first
      const suppliersResponse = await axios.get(
        'https://indotechapi.socx.app/api/v1/suppliers',
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch products for the selected provider
      const productsResponse = await axios.get(
        `https://indotechapi.socx.app/api/v1/products/filter/${selectedProvider}/1`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Filter products that contain "TRANSFER"
      const transferProducts = productsResponse.data.filter(product => 
        product.name.toLowerCase().includes('transfer')
      );

      // Get unique supplier names from transfer products
      const supplierNames = new Set();
      for (const product of transferProducts) {
        try {
          const productSuppliersResponse = await axios.get(
            `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/product/${product.id}`,
            {
              headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          productSuppliersResponse.data.forEach(supplier => {
            // Use supplier name to match
            supplierNames.add(supplier.supplier);
          });
        } catch (error) {
          console.error(`Error fetching suppliers for product ${product.id}:`, error);
        }
      }

      // Filter suppliers that have transfer products for this provider
      const filteredSuppliers = suppliersResponse.data.filter(supplier => 
        supplierNames.has(supplier.name)
      );

      console.log('Transfer Products:', transferProducts);
      console.log('Supplier Names from products:', Array.from(supplierNames));
      console.log('All Suppliers:', suppliersResponse.data);
      console.log('Filtered Suppliers:', filteredSuppliers);

      setAllSuppliers(filteredSuppliers);
    } catch (error) {
      console.error('Error fetching suppliers by provider:', error);
      setAllSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const fetchSupplierProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await axios.get(
        `https://indotechapi.socx.app/api/v1/suppliers_products/list/${selectedSupplier}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Filter products that contain "TRANSFER" in name AND match the selected provider
      const transferProducts = response.data.filter(product => {
        const isTransfer = product.name.toLowerCase().includes('transfer');
        const matchesProvider = product.name.toLowerCase().includes(selectedProviderData?.name.toLowerCase());
        return isTransfer && matchesProvider;
      });
      
      console.log('All supplier products:', response.data);
      console.log('Selected provider:', selectedProviderData?.name);
      console.log('Filtered transfer products:', transferProducts);
      
      setSupplierProducts(transferProducts);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      setSupplierProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleProviderSelect = (providerId) => {
    setSelectedProvider(providerId);
    setSelectedSupplier('');
    setSupplierPot('');
    setSellPot('');
    setSupplierProducts([]);
    setResults([]);
    setShowResults(false);
  };

  const handleSupplierSelect = (supplierId) => {
    setSelectedSupplier(supplierId);
    setSupplierPot('');
    setSellPot('');
    setSupplierProducts([]);
    setResults([]);
    setShowResults(false);
  };

  const calculateMargin = () => {
    const supplierPotNum = parseFloat(supplierPot);
    const sellPotNum = parseFloat(sellPot);
    const margin = supplierPotNum - sellPotNum;
    const marginPercent = (margin / supplierPotNum) * 100;
    return { margin, marginPercent };
  };

  const processUpdate = async () => {
    if (!selectedProvider || !selectedSupplier || !supplierPot || !sellPot) {
      alert('Harap lengkapi semua field');
      return;
    }

    if (!bearerToken) {
      alert('Harap set Bearer Token terlebih dahulu');
      return;
    }

    if (supplierProducts.length === 0) {
      alert('Tidak ada produk transfer yang ditemukan untuk supplier ini');
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setShowResults(false);

    try {
      const { margin, marginPercent } = calculateMargin();
      const updateResults = [];

      // Update semua produk transfer dari supplier
      for (const product of supplierProducts) {
        try {
          const response = await axios.post(
            'https://indotechapi.socx.app/api/v1/suppliers_products',
            {
              base_price: product.base_price,
              code: product.code,
              name: product.name,
              parameters: product.parameters || '',
              regex_custom_info: product.regex_custom_info || '',
              suppliers_id: selectedSupplier,
              trx_per_day: product.trx_per_day
            },
            {
              headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          updateResults.push({
            status: 'success',
            product: product.name,
            product_code: product.code,
            base_price: product.base_price,
            response: response.data
          });
        } catch (error) {
          updateResults.push({
            status: 'error',
            product: product.name,
            product_code: product.code,
            base_price: product.base_price,
            error: error.response?.data?.message || error.message
          });
        }
      }

      setResults(updateResults);
      setShowResults(true);
    } catch (error) {
      setResults([{
        status: 'error',
        error: error.response?.data?.message || error.message
      }]);
      setShowResults(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedProvider('');
    setSelectedSupplier('');
    setSupplierPot('');
    setSellPot('');
    setSupplierProducts([]);
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Update Pulsa Transfer Otomatis
        </h1>
        <p className="text-lg text-gray-600">
          Kelola pot pulsa transfer untuk berbagai provider dan supplier
        </p>
      </div>

      {/* Bearer Token Check */}
      {!bearerToken && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Bearer Token Required
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Please set your Bearer Token in the header to use this feature.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Provider Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Pilih Provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              onClick={() => handleProviderSelect(provider.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedProvider === provider.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full ${provider.color} flex items-center justify-center text-white text-xl`}>
                  {provider.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                  <p className="text-sm text-gray-600">Pulsa Transfer</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Supplier Selection */}
      {selectedProvider && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Pilih Supplier</h2>
          <p className="text-sm text-gray-600 mb-4">
            Supplier yang memiliki produk transfer untuk {selectedProviderData?.name}
          </p>
          {isLoadingSuppliers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading suppliers...</span>
            </div>
          ) : (
            <div>
              {allSuppliers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allSuppliers.map((supplier) => (
                    <div
                      key={supplier.id}
                      onClick={() => handleSupplierSelect(supplier.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedSupplier === supplier.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                          <p className="text-sm text-gray-600">Notes: {supplier.notes}</p>
                          <p className="text-sm text-gray-500">Balance: Rp {supplier.balance?.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            supplier.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {supplier.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Tidak ada supplier yang memiliki produk transfer untuk {selectedProviderData?.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Supplier Products Preview */}
      {selectedSupplier && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Produk Transfer yang Akan Diupdate</h2>
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Provider: <span className="font-semibold">{selectedProviderData?.name}</span> | 
                Supplier: <span className="font-semibold">{selectedSupplierData?.name}</span> 
                ({supplierProducts.length} produk transfer {selectedProviderData?.name} ditemukan)
              </p>
              {supplierProducts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplierProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600">Code: {product.code}</p>
                          <p className="text-sm text-gray-500">Base Price: Rp {product.base_price?.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    Tidak ada produk transfer {selectedProviderData?.name} untuk supplier {selectedSupplierData?.name}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pot Input */}
      {selectedSupplier && supplierProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Input Pot</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Pot */}
            <div>
              <label htmlFor="supplier-pot" className="block text-sm font-medium text-gray-700 mb-2">
                Pot yang Dimiliki Supplier (%)
              </label>
              <input
                type="number"
                id="supplier-pot"
                value={supplierPot}
                onChange={(e) => setSupplierPot(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Contoh: 8.9"
              />
              <p className="text-sm text-gray-500 mt-1">Pot yang dimiliki supplier saat ini</p>
            </div>

            {/* Sell Pot */}
            <div>
              <label htmlFor="sell-pot" className="block text-sm font-medium text-gray-700 mb-2">
                Pot yang Ingin Dijual (%)
              </label>
              <input
                type="number"
                id="sell-pot"
                value={sellPot}
                onChange={(e) => setSellPot(e.target.value)}
                step="0.1"
                min="0"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Contoh: 8.8"
              />
              <p className="text-sm text-gray-500 mt-1">Pot yang akan dijual ke customer</p>
            </div>
          </div>

          {/* Margin Calculation */}
          {supplierPot && sellPot && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Kalkulasi Margin</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-blue-700">Supplier Pot</p>
                  <p className="text-2xl font-bold text-blue-900">{supplierPot}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-blue-700">Sell Pot</p>
                  <p className="text-2xl font-bold text-blue-900">{sellPot}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-blue-700">Margin</p>
                  <p className="text-2xl font-bold text-green-600">
                    {calculateMargin().margin.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {selectedProvider && selectedSupplier && supplierProducts.length > 0 && supplierPot && sellPot && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ready to Update</h3>
              <p className="text-sm text-gray-600">
                {selectedProviderData?.name} - {selectedSupplierData?.name} ({supplierProducts.length} produk transfer)
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={processUpdate}
                disabled={!bearerToken || isProcessing}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !bearerToken || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Update All Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hasil Update</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status === 'success' ? 'Success' : 'Error'}
                      </span>
                    </div>
                    
                    {result.status === 'success' ? (
                      <div>
                        <p className="text-sm text-green-800 mb-2">
                          Berhasil update: {result.product} ({result.product_code})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Product Code</p>
                            <p className="font-semibold">{result.product_code}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Base Price</p>
                            <p className="font-semibold">Rp {result.base_price?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Status</p>
                            <p className="font-semibold text-green-600">Updated</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-red-800 mb-2">
                          Error update: {result.product} ({result.product_code})
                        </p>
                        <p className="text-xs text-red-600">
                          {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Informasi Fitur</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Cara Penggunaan:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
              <li>Pilih provider yang diinginkan (Telkomsel, Indosat, dll)</li>
              <li>Sistem akan menampilkan supplier yang memiliki produk transfer untuk provider tersebut</li>
              <li>Pilih supplier yang ingin diupdate</li>
              <li>Sistem akan menampilkan semua produk transfer dari supplier tersebut</li>
              <li>Input pot yang dimiliki supplier</li>
              <li>Input pot yang ingin dijual</li>
              <li>Klik "Update All Products" untuk update semua produk transfer</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Provider yang Tersedia:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              {providers.map(provider => (
                <li key={provider.id} className="flex items-center">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                  {provider.name} (Pulsa Transfer)
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PulsaTransferUpdate;
