import React, { useState, useEffect, useCallback } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import socxApi from '../utils/socxApi';
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
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [showAllPreview, setShowAllPreview] = useState(false);

  // Mapping Denom → Jumlah GS (Garena Shell) sesuai daftar yang diberikan
  // Contoh: 5 → 3 GS, 10 → 6 GS, ... 1000 → 462 GS
  const DENOM_TO_GS = {
    5: 3,
    10: 6,
    20: 12,
    25: 15,
    30: 18,
    40: 24,
    50: 24,
    55: 27,
    70: 33,
    75: 36,
    80: 39,
    90: 45,
    100: 48,
    120: 60,
    140: 66,
    150: 72,
    160: 78,
    190: 90,
    200: 96,
    210: 99,
    280: 132,
    355: 165,
    375: 177,
    405: 189,
    475: 222,
    500: 234,
    510: 240,
    545: 255,
    720: 330,
    790: 363,
    860: 396,
    930: 429,
    1000: 462,
  };

  // Konfigurasi
  const CONFIG = {
    CATEGORY_ID: 8,  // Game category
    PROVIDER_ID: 8   // Free Fire provider
  };

  // Hindari panggilan markup saat running di localhost (CORS di endpoint markup)
  // Bisa dipaksa aktif di dev dengan localStorage 'ff_allow_markup_dev' = '1' atau query ?allowMarkup=1
  const CAN_CALL_MARKUP = (() => {
    if (typeof window === 'undefined') return true;
    const isLocal = /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
    const allowParam = new URLSearchParams(window.location.search).get('allowMarkup');
    const allowStorage = window.localStorage.getItem('ff_allow_markup_dev');
    const forceAllow = allowParam === '1' || allowStorage === '1';
    return !isLocal || forceAllow;
  })();

  const fetchFreeFireProductsAndSuppliers = useCallback(async () => {
    setIsLoadingProducts(true);
    setIsLoadingSuppliers(true);
    try {
      // Fetch all suppliers first
      const suppliersResponse = await socxApi.socxGet('/api/v1/suppliers');

      // Fetch Free Fire products
      const productsResponse = await socxApi.socxGet(`/api/v1/products/filter/${CONFIG.CATEGORY_ID}/${CONFIG.PROVIDER_ID}`);

      // Filter produk GMFF dan FFP
      const gameProducts = productsResponse.data.filter(product => 
        product.code && (product.code.toUpperCase().includes('GMFF') || product.code.toUpperCase().includes('FFP'))
      );

      // Get unique supplier names and their modules_id from Free Fire products
      const supplierNames = new Set();
      const supplierModuleMapping = new Map();
      
      // Batch fetch suppliers for all products to reduce API calls
      const supplierPromises = gameProducts.map(async (product) => {
        try {
          const productSuppliersResponse = await socxApi.socxGet(`/api/v1/products_has_suppliers_modules/product/${product.id}`);

          const productSuppliers = productSuppliersResponse;
          
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

      console.log('Free Fire Products:', gameProducts.length);
      console.log('Relevant Suppliers:', relevantSuppliers.length);
      console.log('Supplier Module Mapping:', supplierModuleMapping);

    } catch (error) {
      console.error('Error fetching Free Fire products and suppliers:', error);
      setAllSuppliers([]);
    } finally {
      setIsLoadingProducts(false);
      setIsLoadingSuppliers(false);
    }
  }, [CONFIG.CATEGORY_ID, CONFIG.PROVIDER_ID]);

  const fetchSupplierProducts = useCallback(async () => {
    if (!selectedSupplier) return;

    setIsLoadingProducts(true);
    try {
      // Fetch Free Fire products first
      const productsResponse = await socxApi.socxGet(`/api/v1/products/filter/${CONFIG.CATEGORY_ID}/${CONFIG.PROVIDER_ID}`);
      
      // Filter produk GMFF dan FFP
      const gameProducts = productsResponse.data.filter(product => 
        product.code && (product.code.toUpperCase().includes('GMFF') || product.code.toUpperCase().includes('FFP'))
      );

      // Get supplier modules for products
      const selectedSupplierData = allSuppliers.find(s => s.id === parseInt(selectedSupplier));
      const selectedSupplierName = selectedSupplierData ? selectedSupplierData.name : null;

      const modulePromises = gameProducts.map(async (product) => {
        try {
          const res = await socxApi.socxGet(`/api/v1/products_has_suppliers_modules/product/${product.id}`);
          const arr = Array.isArray(res) ? res : [];
          const mod = arr.find((sm) => sm.supplier === selectedSupplierName);
          if (mod) {
            return { 
              product_code: mod.product_code, 
              product_name: mod.product_name,
              base_price: mod.base_price,
              suppliers_products_id: mod.suppliers_products_id
            };
          }
          return null;
        } catch (_) {
          return null;
        }
      });

      const modules = (await Promise.all(modulePromises)).filter(Boolean);
      const baseCodes = [...new Set(modules.map((m) => m.product_code.replace(/\d+/g, '')))]
        .filter((s) => s && s.length > 0);

      // Create mapping from product_code to base_price
      const moduleMapping = new Map();
      modules.forEach(module => {
        moduleMapping.set(module.product_code, {
          base_price: module.base_price,
          suppliers_products_id: module.suppliers_products_id
        });
      });

      // Fetch supplier products
      const supplierProductsResponse = await socxApi.socxGet(`/api/v1/suppliers_products/list/${selectedSupplier}`);

      const filtered = supplierProductsResponse.filter((sp) => {
        const base = sp.code.replace(/\d+/g, '');
        return baseCodes.includes(base);
      }).map(sp => {
        // Add base_price from supplier module if available
        const moduleData = moduleMapping.get(sp.code);
        if (moduleData) {
          return {
            ...sp,
            base_price: moduleData.base_price,
            suppliers_products_id: moduleData.suppliers_products_id
          };
        }
        return sp;
      });
      
      console.log('Supplier modules mapping:', moduleMapping);
      console.log('Filtered supplier products with base_price:', filtered);
      setSupplierProducts(filtered);
    } catch (_) {
      setSupplierProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [selectedSupplier, allSuppliers, CONFIG.CATEGORY_ID, CONFIG.PROVIDER_ID]);

  // Fetch Free Fire products and suppliers
  useEffect(() => {
    if (bearerToken) {
      fetchFreeFireProductsAndSuppliers();
    }
  }, [bearerToken, fetchFreeFireProductsAndSuppliers]);

  // Fetch supplier products when supplier is selected
  useEffect(() => {
    if (selectedSupplier && bearerToken) {
      fetchSupplierProducts();
    }
  }, [selectedSupplier, bearerToken, fetchSupplierProducts]);

  // Fungsi untuk mengekstrak denom dari kode produk
  const extractDenomFromProductCode = (productCode) => {
    if (!productCode) return null;
    const code = String(productCode).toUpperCase();

    // Pattern spesifik
    let match = code.match(/GMFF(\d+)/);
    if (match) return parseInt(match[1]);

    match = code.match(/FFP(\d+)/);
    if (match) return parseInt(match[1]);

    match = code.match(/FFK(\d+)/);
    if (match) return parseInt(match[1]);

    // Fallback: ambil deret angka terakhir pada kode
    const allNums = code.match(/(\d+)/g);
    if (allNums && allNums.length > 0) {
      const lastNum = allNums[allNums.length - 1];
      return parseInt(lastNum);
    }

    return null;
  };

  // Fungsi untuk mengambil reseller group pricing
  const fetchResellersGroupPricing = async (productId) => {
    try {
      const response = await socxApi.socxGet(`/api/v1/resellers_group/pricing/${productId}`);
      
      // Pastikan return array, bukan null atau undefined
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(`Error fetching resellers group pricing:`, error);
      return [];
    }
  };

  // Fungsi untuk mengupdate markup reseller group
  const updateMarkup = async (resellerGroupId, newMarkup, token) => {
    try {
      const response = await socxApi.socxPost(
        '/api/v1/resellers_group_has_products/update_markup',
        {
          id: resellerGroupId,
          markup: newMarkup,
          commissions: 0,
          points: 0
        }
      );
      
      return { success: true, response: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Fungsi untuk mengupdate supplier status
  const updateSupplierStatus = async (productId, selectedSupplierName, token) => {
    try {
      const response = await socxApi.socxGet(`/api/v1/products_has_suppliers_modules/product/${productId}`);

      const allSuppliers = response;
      const statusResults = [];

      const updatePromises = allSuppliers.map(async (supplier) => {
        try {
          const newStatus = supplier.supplier === selectedSupplierName ? 1 : 0;
          
          const updateResponse = await socxApi.socxPatch(
            `/api/v1/products_has_suppliers_modules/${supplier.id}`,
            {
              id: supplier.id,
              products_id: supplier.products_id,
              products_code: supplier.products_code,
              suppliers_products_id: supplier.suppliers_products_id,
              status: newStatus,
              priority: supplier.priority,
              pending_limit: supplier.pending_limit,
              suppliers_modules_id: supplier.suppliers_modules_id
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

    setIsProcessing(true);
    setResults([]);
    setShowResults(false);

    try {
      // 1. Fetch produk Free Fire langsung saat klik update
      const productsResponse = await socxApi.socxGet(`/api/v1/products/filter/${CONFIG.CATEGORY_ID}/${CONFIG.PROVIDER_ID}`);

      // Filter produk GMFF dan FFP
      const gameProducts = productsResponse.data.filter(product => 
        product.code && (product.code.toUpperCase().includes('GMFF') || product.code.toUpperCase().includes('FFP'))
      );

      if (gameProducts.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Perhatian!',
          text: 'Tidak ada produk Free Fire yang ditemukan',
          confirmButtonText: 'OK'
        });
        setIsProcessing(false);
        return;
      }

      const updateResults = [];
      const supplierRateNum = parseFloat(supplierRate);
      const sellPriceNum = parseFloat(sellPrice);
      const selectedSupplierData = allSuppliers.find(s => s.id === parseInt(selectedSupplier));

      // 2. Batch update semua produk secara paralel
      const productUpdatePromises = supplierProducts.map(async (product) => {
        try {
          // Ekstrak denom dari kode produk
          const denom = extractDenomFromProductCode(product.code);
          
          if (!denom) {
            return {
              status: 'error',
              product: product.name,
              product_code: product.code,
              error: `Tidak dapat mengekstrak denom dari produk ${product.name} (${product.code})`
            };
          }

          // Ambil jumlah GS dari mapping berdasarkan denom
          const gsCount = DENOM_TO_GS[denom];
          if (!gsCount) {
            return {
              status: 'error',
              product: product.name,
              product_code: product.code,
              error: `Tidak ditemukan mapping GS untuk denom ${denom}`
            };
          }

          // Hitung sesuai Excel: CEILING(rate ÷ 330) × jumlah_gs
          const modalRatePerGS = Math.ceil(supplierRateNum / 330);
          const sellRatePerGS = Math.ceil(sellPriceNum / 330);
          const calculatedPrice = modalRatePerGS * gsCount; // Harga Modal
          const finalPrice = sellRatePerGS * gsCount; // Harga Jual
          
          // Hitung margin
          const margin = finalPrice - calculatedPrice;
          const marginPercent = calculatedPrice > 0 ? ((margin / calculatedPrice) * 100).toFixed(2) : 0;

          // Find corresponding game product untuk mendapatkan products_id yang benar
          const correspondingGameProduct = gameProducts.find(gp => {
            const gpDenom = extractDenomFromProductCode(gp.code);
            return gpDenom === denom;
          });

          if (!correspondingGameProduct) {
            return {
              status: 'error',
              product: product.name,
              product_code: product.code,
              error: `Game product tidak ditemukan untuk denom ${denom}`
            };
          }

          // Ambil reseller group pricing untuk Level 1
          const resellerGroups = await fetchResellersGroupPricing(correspondingGameProduct.id);
          const level1Group = resellerGroups && Array.isArray(resellerGroups) 
            ? resellerGroups.find(group => group.name === 'Level 1') 
            : null;

          // 3. Execute semua update secara paralel (4 API calls)
          // Gunakan Promise.allSettled agar jika satu gagal, yang lain tetap jalan
          const updatePromises = [
            // Update 1: Supplier product base_price (harga modal)
            socxApi.socxPatch(
              `/api/v1/suppliers_products/${product.id}`,
              {
                id: product.id,
                suppliers_id: selectedSupplier,
                name: product.name,
                code: product.code,
                base_price: calculatedPrice, // Harga modal
                status: product.status,
                parameters: product.parameters || '',
                trx_per_day: product.trx_per_day,
                regex_custom_info: product.regex_custom_info || '',
                updated_time: Math.floor(Date.now() / 1000)
              }
            ),
            // Update 2: Product price (harga jual)
            socxApi.socxPost(
              '/api/v1/products/update_price',
              {
                id: correspondingGameProduct.id,
                price: finalPrice // Harga jual
              }
            ),
            // Update 3: Supplier status
            updateSupplierStatus(
              correspondingGameProduct.id,
              selectedSupplierData.name,
              bearerToken
            ),
            // Update 4: Markup Level 1 reseller group (skip di localhost untuk hindari CORS)
            level1Group && CAN_CALL_MARKUP
              ? updateMarkup(level1Group.id, margin, bearerToken).catch(err => ({
                  success: false,
                  error: err.response?.data?.message || err.message || 'Markup update failed'
                }))
              : Promise.resolve({ success: false, error: level1Group ? 'Markup skipped in dev (localhost) to avoid CORS' : 'Level 1 reseller group not found' })
          ];

          const updateResults = await Promise.allSettled(updatePromises);
          
          // Extract results dengan error handling
          const supplierProductResponse = updateResults[0].status === 'fulfilled' 
            ? { data: updateResults[0].value.data } 
            : { error: updateResults[0].reason?.response?.data?.message || updateResults[0].reason?.message || 'Supplier product update failed' };
          
          const productPriceResponse = updateResults[1].status === 'fulfilled' 
            ? { data: updateResults[1].value.data } 
            : { error: updateResults[1].reason?.response?.data?.message || updateResults[1].reason?.message || 'Product price update failed' };
          
          const supplierStatusResults = updateResults[2].status === 'fulfilled' 
            ? updateResults[2].value 
            : [{ status: 'error', error: updateResults[2].reason?.message || 'Supplier status update failed' }];
          
          const markupResult = updateResults[3].status === 'fulfilled' 
            ? updateResults[3].value 
            : { success: false, error: updateResults[3].reason?.message || updateResults[3].reason?.response?.data?.message || 'Markup update failed (502 Bad Gateway atau CORS error)' };

          // Log error markup untuk debugging (tidak crash proses)
          if (!markupResult.success) {
            console.warn(`Markup update failed for product ${product.name}:`, markupResult.error);
          }

          // Tentukan status: success jika minimal supplier product dan price berhasil
          const hasCriticalError = updateResults[0].status === 'rejected' && updateResults[1].status === 'rejected';
          
          return {
            status: hasCriticalError ? 'error' : 'success',
            product: product.name,
            product_code: product.code,
            denom: denom,
            old_price: product.base_price || product.price,
            new_price: finalPrice,
            calculated_price: calculatedPrice,
            margin: margin,
            margin_percent: marginPercent,
            supplier_rate: supplierRateNum,
            sell_price: sellPriceNum,
            supplier_response: supplierProductResponse.data || supplierProductResponse.error,
            price_response: productPriceResponse.data || productPriceResponse.error,
            supplier_status_results: supplierStatusResults,
            markup_result: markupResult,
            level1_group_id: level1Group ? level1Group.id : null,
            products_id: correspondingGameProduct.id,
            update_warnings: [
              updateResults[0].status === 'rejected' ? 'Supplier product update failed' : null,
              updateResults[1].status === 'rejected' ? 'Product price update failed' : null,
              updateResults[2].status === 'rejected' ? 'Supplier status update failed' : null,
              !markupResult.success ? `Markup update failed: ${markupResult.error}` : null
            ].filter(Boolean)
          };

        } catch (error) {
          return {
            status: 'error',
            product: product.name,
            product_code: product.code,
            error: error.response?.data?.message || error.message
          };
        }
      });
      
      // Wait for all product updates to complete
      const productUpdateResults = await Promise.all(productUpdatePromises);
      updateResults.push(...productUpdateResults);

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
    setSelectedSupplier('');
    setSupplierRate('');
    setSellPrice('');
    setSupplierProducts([]);
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
        <div className="mt-4">
          <a href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
            ← Kembali ke Dashboard
          </a>
        </div>
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

      {/* Supplier Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Pilih Supplier</h2>
        {isLoadingSuppliers ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-2 text-gray-600">Loading suppliers...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Supplier yang memiliki produk Free Fire: {allSuppliers.length} supplier
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
                <p className="text-gray-500">Tidak ada supplier yang memiliki produk Free Fire</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rate Input */}
      {selectedSupplier && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Input Rate & Harga</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Rate */}
            <div>
              <label htmlFor="supplier-rate" className="block text-sm font-medium text-gray-700 mb-2">
                Rate Modal
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
              <p className="text-sm text-gray-500 mt-1">Rate yang digunakan untuk modal</p>
            </div>

            {/* Sell Price */}
            <div>
              <label htmlFor="sell-price" className="block text-sm font-medium text-gray-700 mb-2">
                Rate Jual
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
              <p className="text-sm text-gray-500 mt-1">Rate yang akan dijual ke customer</p>
            </div>
          </div>

          {/* Preview Calculation */}
          {supplierRate && sellPrice && supplierProducts.length > 0 && (() => {
            const supplierRateNum = parseFloat(supplierRate);
            const sellPriceNum = parseFloat(sellPrice);
            const invalidSamples = [];
            const validProducts = supplierProducts.filter((product) => {
              const denom = extractDenomFromProductCode(product.code);
              const gsCount = denom ? DENOM_TO_GS[denom] : undefined;
              const isValid = Boolean(denom) && Boolean(gsCount);
              if (!isValid && invalidSamples.length < 5) {
                invalidSamples.push({ code: product.code, denom, gsCount });
              }
              return isValid;
            });

            if (validProducts.length === 0) {
              console.warn('FF Preview: Produk tanpa mapping Denom→GS (contoh maksimal 5):', invalidSamples);
              return (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Preview Kalkulasi</h3>
                  <p className="text-sm text-yellow-800">Tidak ada produk yang memiliki mapping Denom → GS yang valid.</p>
                </div>
              );
            }

            return (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Preview Kalkulasi</h3>
              <div className="space-y-3">
                  {(showAllPreview ? validProducts : validProducts.slice(0, 3)).map((product) => {
                  const denom = extractDenomFromProductCode(product.code);
                    const gsCount = denom ? DENOM_TO_GS[denom] : 0;
                    const modalRatePerGS = Math.ceil(supplierRateNum / 330);
                    const sellRatePerGS = Math.ceil(sellPriceNum / 330);
                    const calculatedPrice = modalRatePerGS * gsCount;
                    const finalPrice = sellRatePerGS * gsCount;
                  const margin = finalPrice - calculatedPrice;
                  const marginPercent = calculatedPrice > 0 ? ((margin / calculatedPrice) * 100).toFixed(2) : 0;
                    // rate per GS (tanpa pembulatan) ditampilkan di rumus sebelumnya, tidak perlu variabel terpisah
                  
                  return (
                    <div key={product.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{product.name}</p>
                            <p className="text-xs text-gray-600">Denom: {denom} • GS: {gsCount}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">Harga: Rp {finalPrice.toLocaleString()}</p>
                          <p className="text-sm font-semibold text-green-600">Modal: Rp {calculatedPrice.toLocaleString()}</p>
                          <p className={`text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Margin: Rp {margin.toLocaleString()} ({marginPercent}%)
                          </p>
                        </div>
                      </div>
                        <div className="mt-2 text-[11px] text-gray-600 leading-4">
                          <p>
                            Modal = ceil(RateModal ÷ 330) × GS = ceil({supplierRateNum.toLocaleString()} ÷ 330) × {gsCount} = {Math.ceil(supplierRateNum / 330)} × {gsCount} = Rp {calculatedPrice.toLocaleString()}
                          </p>
                          <p>
                            Harga = ceil(RateJual ÷ 330) × GS = ceil({sellPriceNum.toLocaleString()} ÷ 330) × {gsCount} = {Math.ceil(sellPriceNum / 330)} × {gsCount} = Rp {finalPrice.toLocaleString()}
                          </p>
                        </div>
                    </div>
                  );
                })}
                  {validProducts.length > 3 && (
                    <div className="text-center">
                      {!showAllPreview ? (
                        <button
                          type="button"
                          onClick={() => setShowAllPreview(true)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          ... dan {validProducts.length - 3} produk lainnya
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowAllPreview(false)}
                          className="text-xs text-blue-600 hover:text-blue-700 underline"
                        >
                          Tampilkan lebih sedikit
                        </button>
                )}
              </div>
                  )}
                </div>
              </div>
            );
          })()}
            </div>
          )}

      {/* Products */}
      {selectedSupplier && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Produk Free Fire</h2>
          {isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : supplierProducts.length === 0 ? (
            <p className="text-gray-500">Tidak ada produk</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplierProducts.slice(0, 48).map((item) => {
                const denom = extractDenomFromProductCode(item.code);
                const gsCount = denom ? DENOM_TO_GS[denom] : undefined;
                return (
                  <div key={item.id} className="p-4 rounded-lg border bg-gray-50 h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-800 mb-1">{item.name}</p>
                        <p className="text-xs text-gray-600">Kode: {item.code}</p>
                        {denom && gsCount && (
                          <p className="text-xs text-gray-600">Denom: {denom} • GS: {gsCount}</p>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold text-green-700">Modal: Rp {item.base_price?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {supplierProducts.length > 48 && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-600 text-center">... dan {supplierProducts.length - 48} produk lainnya</p>
                </div>
              )}
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
                Free Fire - {allSuppliers.find(s => s.id === parseInt(selectedSupplier))?.name} ({supplierProducts.length} produk)
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
                            <p className="text-gray-600">Denom / GS</p>
                            <p className="font-semibold">{result.denom} • {DENOM_TO_GS[result.denom] || '-'} GS</p>
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
                        <div className="mt-2 text-[11px] text-gray-600 leading-4">
                          {(() => {
                            const gsCount = DENOM_TO_GS[result.denom];
                            if (!gsCount) return null;
                            const modalRatePerGS = Math.ceil((result.supplier_rate || 0) / 330);
                            const sellRatePerGS = Math.ceil((result.sell_price || 0) / 330);
                            return (
                              <>
                                <p>
                                  Modal = ceil(RateModal ÷ 330) × GS = ceil({(result.supplier_rate || 0).toLocaleString()} ÷ 330) × {gsCount} = {modalRatePerGS} × {gsCount} = Rp {result.calculated_price?.toLocaleString()}
                                </p>
                                <p>
                                  Harga = ceil(RateJual ÷ 330) × GS = ceil({(result.sell_price || 0).toLocaleString()} ÷ 330) × {gsCount} = {sellRatePerGS} × {gsCount} = Rp {result.new_price?.toLocaleString()}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-2 text-xs text-gray-500 grid grid-cols-2 gap-4">
                          <div>
                            Rate Modal: {result.supplier_rate?.toLocaleString()}
                          </div>
                          <div>
                            Rate Jual: {result.sell_price?.toLocaleString()}
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
              <li>• Jumlah GS ditentukan dari mapping Denom → GS</li>
              <li>• Rate per GS = ROUNDUP(Rate per Denom ÷ 330)</li>
              <li>• Harga Modal = RateGS(Modal) × Jumlah GS</li>
              <li>• Harga Jual = RateGS(Jual) × Jumlah GS</li>
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