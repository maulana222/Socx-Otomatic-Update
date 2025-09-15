import React, { useState, useEffect } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import axios from 'axios';
import Swal from 'sweetalert2';

const FreeFireUpdate = () => {
  const { bearerToken } = useBearerToken();
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierRate, setSupplierRate] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [freeFireProducts, setFreeFireProducts] = useState([]);
  const [supplierModuleMapping, setSupplierModuleMapping] = useState(new Map());

  // Konfigurasi
  const CONFIG = {
    CATEGORY_ID: 8,  // Game category
    PROVIDER_ID: 8,  // Free Fire provider
    API_BASE_URL: 'https://indotechapi.socx.app/api/v1'
  };

  // Fetch Free Fire products and suppliers
  useEffect(() => {
    if (bearerToken) {
      fetchFreeFireProductsAndSuppliers();
    }
  }, [bearerToken]);

  const fetchFreeFireProductsAndSuppliers = async () => {
    setIsLoadingProducts(true);
    setIsLoadingSuppliers(true);
    try {
      // Fetch all suppliers first
      const suppliersResponse = await axios.get(
        `${CONFIG.API_BASE_URL}/suppliers`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Fetch Free Fire products
      const productsResponse = await axios.get(
        `${CONFIG.API_BASE_URL}/products/filter/${CONFIG.CATEGORY_ID}/${CONFIG.PROVIDER_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Filter produk GMFF dan FFP
      const gameProducts = productsResponse.data.filter(product => 
        product.code && (product.code.toUpperCase().includes('GMFF') || product.code.toUpperCase().includes('FFP'))
      );

      setFreeFireProducts(gameProducts);

      // Get unique supplier names and their modules_id from Free Fire products
      const supplierNames = new Set();
      const supplierModuleMapping = new Map();
      
      // Batch fetch suppliers for all products to reduce API calls
      const supplierPromises = gameProducts.map(async (product) => {
        try {
          const productSuppliersResponse = await axios.get(
            `${CONFIG.API_BASE_URL}/products_has_suppliers_modules/product/${product.id}`,
            {
              headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const productSuppliers = productSuppliersResponse.data;
          
          // Add supplier names and their modules_id to our mapping
          productSuppliers.forEach(supplier => {
            if (supplier.supplier) {
              supplierNames.add(supplier.supplier);
              supplierModuleMapping.set(supplier.supplier, supplier.suppliers_modules_id);
            }
          });

          return productSuppliers;
        } catch (error) {
          console.error(`Error fetching suppliers for product ${product.id}:`, error);
          return [];
        }
      });

      await Promise.all(supplierPromises);

      // Filter suppliers that are actually used in Free Fire products
      const relevantSuppliers = suppliersResponse.data.filter(supplier => 
        supplierNames.has(supplier.name)
      );

      setAllSuppliers(relevantSuppliers);
      setSupplierModuleMapping(supplierModuleMapping);

      console.log('Free Fire Products:', gameProducts.length);
      console.log('Relevant Suppliers:', relevantSuppliers.length);
      console.log('Supplier Module Mapping:', supplierModuleMapping);

    } catch (error) {
      console.error('Error fetching Free Fire products and suppliers:', error);
      setFreeFireProducts([]);
      setAllSuppliers([]);
    } finally {
      setIsLoadingProducts(false);
      setIsLoadingSuppliers(false);
    }
  };

  // Fungsi untuk mengekstrak denom dari kode produk
  const extractDenomFromProductCode = (productCode) => {
    // Pattern untuk GMFF5, GMFF10, GMFF20, dll
    let match = productCode.match(/GMFF(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    // Pattern untuk FFP5, FFP10, FFP20, dll
    match = productCode.match(/FFP(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    
    return null;
  };

  // Fungsi untuk mengambil supplier dari produk
  const fetchProductSuppliers = async (productId) => {
    try {
      const response = await axios.get(
        `${CONFIG.API_BASE_URL}/products_has_suppliers_modules/product/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching suppliers for product ${productId}:`, error);
      return [];
    }
  };

  // Fungsi untuk mengambil reseller group pricing
  const fetchResellersGroupPricing = async (productId) => {
    try {
      const response = await axios.get(
        `${CONFIG.API_BASE_URL}/resellers_group/pricing/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching resellers group pricing:`, error);
      return [];
    }
  };

  // Fungsi untuk mengupdate harga produk
  const updateProductPrice = async (productId, newPrice) => {
    try {
      const response = await axios.post(
        `${CONFIG.API_BASE_URL}/products/update_price`,
        {
          id: productId,
          price: newPrice
        },
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { success: true, response: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Fungsi untuk mengupdate markup reseller group
  const updateMarkup = async (resellerGroupId, newMarkup) => {
    try {
      const response = await axios.post(
        `${CONFIG.API_BASE_URL}/resellers_group_has_products/update_markup`,
        {
          id: resellerGroupId,
          markup: newMarkup,
          commissions: 0,
          points: 0
        },
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return { success: true, response: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Fungsi untuk mengupdate supplier status
  const updateSupplierStatus = async (productId, selectedSupplierName) => {
    try {
      const response = await axios.get(
        `${CONFIG.API_BASE_URL}/products_has_suppliers_modules/product/${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const allSuppliers = response.data;
      const statusResults = [];

      const updatePromises = allSuppliers.map(async (supplier) => {
        try {
          const newStatus = supplier.supplier === selectedSupplierName ? 1 : 0;
          
          const updateResponse = await axios.patch(
            `${CONFIG.API_BASE_URL}/products_has_suppliers_modules/${supplier.id}`,
            {
              id: supplier.id,
              products_id: supplier.products_id,
              products_code: supplier.products_code,
              suppliers_products_id: supplier.suppliers_products_id,
              status: newStatus,
              priority: supplier.priority,
              pending_limit: supplier.pending_limit,
              suppliers_modules_id: supplier.suppliers_modules_id
            },
            {
              headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          return {
            supplier_id: supplier.suppliers_modules_id,
            supplier_name: supplier.supplier,
            module: supplier.module,
            status: newStatus,
            response: updateResponse.data
          };
        } catch (error) {
          return {
            supplier_id: supplier.suppliers_modules_id,
            supplier_name: supplier.supplier,
            module: supplier.module,
            status: 'error',
            error: error.response?.data?.message || error.message
          };
        }
      });
      
      const updateResults = await Promise.all(updatePromises);
      statusResults.push(...updateResults);

      return statusResults;
    } catch (error) {
      console.error('Error updating supplier status:', error);
      return [{
        status: 'error',
        error: error.response?.data?.message || error.message
      }];
    }
  };

  // Fungsi utama untuk memproses update
  const processUpdate = async () => {
    if (!selectedSupplier || !supplierRate || !sellPrice) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Harap lengkapi semua field terlebih dahulu',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!bearerToken) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Harap set Bearer Token terlebih dahulu',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (freeFireProducts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Tidak ada produk Free Fire yang ditemukan',
        confirmButtonText: 'OK'
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setShowResults(false);

    try {
      const updateResults = [];
      const supplierRateNum = parseFloat(supplierRate);
      const sellPriceNum = parseFloat(sellPrice);
      const selectedSupplierData = allSuppliers.find(s => s.id === parseInt(selectedSupplier));

      // Proses setiap produk Free Fire
      for (const product of freeFireProducts) {
        try {
          // Ekstrak denom dari kode produk
          const denom = extractDenomFromProductCode(product.code);
          
          if (!denom) {
            updateResults.push({
              status: 'error',
              product: product.name,
              product_code: product.code,
              error: `Tidak dapat mengekstrak denom dari produk ${product.name} (${product.code})`
            });
            continue;
          }

          // Hitung harga berdasarkan rate supplier
          const calculatedPrice = Math.round((denom * supplierRateNum) / 1000);
          const finalPrice = Math.round((denom * sellPriceNum) / 1000);
          
          // Hitung margin
          const margin = finalPrice - calculatedPrice;
          const marginPercent = calculatedPrice > 0 ? ((margin / calculatedPrice) * 100).toFixed(2) : 0;

          // Ambil supplier untuk produk ini
          const productSuppliers = await fetchProductSuppliers(product.id);
          
          // Ambil reseller group pricing
          const resellerGroups = await fetchResellersGroupPricing(product.id);
          const level1Group = resellerGroups.find(group => group.name === 'Level 1');

          // Update harga produk
          const priceResult = await updateProductPrice(product.id, finalPrice);

          // Update markup jika ada Level 1 group
          let markupResult = null;
          if (level1Group) {
            markupResult = await updateMarkup(level1Group.id, margin);
          }

          // Update supplier status
          let supplierStatusResults = [];
          if (selectedSupplierData) {
            supplierStatusResults = await updateSupplierStatus(product.id, selectedSupplierData.name);
          }

          updateResults.push({
            status: 'success',
            product: product.name,
            product_code: product.code,
            denom: denom,
            old_price: product.price,
            new_price: finalPrice,
            calculated_price: calculatedPrice,
            margin: margin,
            margin_percent: marginPercent,
            supplier_rate: supplierRateNum,
            sell_price: sellPriceNum,
            price_result: priceResult,
            markup_result: markupResult,
            supplier_status_results: supplierStatusResults,
            level1_group_id: level1Group ? level1Group.id : null
          });

        } catch (error) {
          updateResults.push({
            status: 'error',
            product: product.name,
            product_code: product.code,
            error: error.message
          });
        }

        // Delay untuk menghindari rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setResults(updateResults);
      setShowResults(true);
    } catch (error) {
      setResults([{
        status: 'error',
        error: error.message
      }]);
      setShowResults(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedSupplier('');
    setSupplierRate('');
    setSellPrice('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🎮 Update Free Fire Otomatis
        </h1>
        <p className="text-lg text-gray-600">
          Kelola harga produk Free Fire berdasarkan rate supplier dan harga jual
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

      {/* Free Fire Products Preview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Produk Free Fire yang Tersedia</h2>
        {isLoadingProducts ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">Loading products...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Ditemukan {freeFireProducts.length} produk Free Fire (GMFF & FFP)
            </p>
            {freeFireProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {freeFireProducts.map((product) => {
                  const denom = extractDenomFromProductCode(product.code);
                  return (
                    <div
                      key={product.id}
                      className="p-4 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600">Code: {product.code}</p>
                          <p className="text-sm text-gray-500">Denom: {denom || 'N/A'}</p>
                          <p className="text-sm text-gray-500">Price: Rp {product.price?.toLocaleString()}</p>
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
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Tidak ada produk Free Fire ditemukan</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Supplier Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Pilih Supplier</h2>
        {isLoadingSuppliers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">Loading suppliers...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Ditemukan {allSuppliers.length} supplier yang relevan dengan produk Free Fire
            </p>
            {allSuppliers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allSuppliers.map((supplier) => (
                  <div
                    key={supplier.id}
                    onClick={() => setSelectedSupplier(supplier.id)}
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
                        <p className="text-xs text-blue-600">Module ID: {supplierModuleMapping.get(supplier.name) || 'N/A'}</p>
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
                <p className="text-gray-500">Tidak ada supplier ditemukan untuk produk Free Fire</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rate Input */}
      {selectedSupplier && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Input Rate & Harga</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Rate */}
            <div>
              <label htmlFor="supplier-rate" className="block text-sm font-medium text-gray-700 mb-2">
                Rate Supplier
              </label>
              <input
                type="number"
                id="supplier-rate"
                value={supplierRate}
                onChange={(e) => setSupplierRate(e.target.value)}
                step="1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Contoh: 85000"
              />
              <p className="text-sm text-gray-500 mt-1">Rate yang digunakan supplier</p>
            </div>

            {/* Sell Price */}
            <div>
              <label htmlFor="sell-price" className="block text-sm font-medium text-gray-700 mb-2">
                Harga Jual
              </label>
              <input
                type="number"
                id="sell-price"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                step="1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Contoh: 84500"
              />
              <p className="text-sm text-gray-500 mt-1">Harga yang akan dijual ke customer</p>
            </div>
          </div>

          {/* Preview Calculation */}
          {supplierRate && sellPrice && freeFireProducts.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Preview Kalkulasi</h3>
              <div className="space-y-3">
                {freeFireProducts.slice(0, 3).map((product) => {
                  const denom = extractDenomFromProductCode(product.code);
                  if (!denom) return null;
                  
                  const supplierRateNum = parseFloat(supplierRate);
                  const sellPriceNum = parseFloat(sellPrice);
                  const calculatedPrice = Math.round((denom * supplierRateNum) / 1000);
                  const finalPrice = Math.round((denom * sellPriceNum) / 1000);
                  const margin = finalPrice - calculatedPrice;
                  const marginPercent = calculatedPrice > 0 ? ((margin / calculatedPrice) * 100).toFixed(2) : 0;
                  
                  return (
                    <div key={product.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{product.name}</p>
                          <p className="text-xs text-gray-600">Denom: {denom}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">Harga: Rp {finalPrice.toLocaleString()}</p>
                          <p className="text-sm font-semibold text-green-600">Modal: Rp {calculatedPrice.toLocaleString()}</p>
                          <p className={`text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Margin: Rp {margin.toLocaleString()} ({marginPercent}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {freeFireProducts.length > 3 && (
                  <p className="text-xs text-gray-600 text-center">
                    ... dan {freeFireProducts.length - 3} produk lainnya
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {selectedSupplier && supplierRate && sellPrice && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ready to Update</h3>
              <p className="text-sm text-gray-600">
                Free Fire - {allSuppliers.find(s => s.id === parseInt(selectedSupplier))?.name} ({freeFireProducts.length} produk)
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
                {isProcessing ? 'Processing...' : 'Update Harga & Aktifkan Supplier'}
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Denom</p>
                            <p className="font-semibold">{result.denom}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Harga Lama</p>
                            <p className="font-semibold">Rp {result.old_price?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Harga Baru</p>
                            <p className="font-semibold">Rp {result.new_price?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Margin</p>
                            <p className={`font-semibold ${result.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Rp {result.margin?.toLocaleString()} ({result.margin_percent}%)
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-4">
                          <div>
                            Rate Supplier: {result.supplier_rate?.toLocaleString()}
                          </div>
                          <div>
                            Harga Jual: {result.sell_price?.toLocaleString()}
                          </div>
                        </div>
                        
                        {/* Markup Information */}
                        {result.markup_result && (
                          <div className="mt-2 text-xs text-purple-600">
                            💰 Markup: {result.margin} | 
                            Level 1 ID: {result.level1_group_id || 'Not found'} | 
                            Status: {result.markup_result.success ? '✅ Success' : '❌ Failed'}
                            {!result.markup_result.success && result.markup_result.error && (
                              <span className="text-red-600"> - {result.markup_result.error}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Supplier Status Results */}
                        {result.supplier_status_results && result.supplier_status_results.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded border">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Status Supplier:</p>
                            <div className="space-y-1">
                              {result.supplier_status_results.map((statusResult, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">
                                    {statusResult.supplier_name} ({statusResult.module}) - ID: {statusResult.supplier_id}
                                  </span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    statusResult.status === 1 
                                      ? 'bg-green-100 text-green-800' 
                                      : statusResult.status === 0 
                                        ? 'bg-gray-100 text-gray-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}>
                                    {statusResult.status === 1 ? 'AKTIF' : statusResult.status === 0 ? 'NONAKTIF' : 'ERROR'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
              <li>Pilih supplier yang akan diaktifkan</li>
              <li>Input rate supplier (contoh: 85000)</li>
              <li>Input harga jual (contoh: 84500)</li>
              <li>Lihat preview kalkulasi</li>
              <li>Klik "Update Harga & Aktifkan Supplier"</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Formula Perhitungan:</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Harga Modal = (Denom × Rate Supplier) ÷ 1000</li>
              <li>• Harga Jual = (Denom × Harga Jual) ÷ 1000</li>
              <li>• Margin = Harga Jual - Harga Modal</li>
              <li>• Margin % = (Margin ÷ Harga Modal) × 100</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeFireUpdate;
