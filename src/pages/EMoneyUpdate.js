import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useBearerToken } from '../contexts/BearerTokenContext';

const PROVIDERS = [
  {
    key: 'ovo',
    name: 'OVO',
    color: 'bg-purple-600',
    icon: '🟣',
    categoryId: 9,
    providerId: 5 // given: /api/v1/products/filter/9/5
  },
  // Future providers (IDs to be confirmed)
  {
    key: 'dana',
    name: 'DANA',
    color: 'bg-blue-600',
    icon: '💙',
    categoryId: 9,
    providerId: 10
  },
  {
    key: 'gopay',
    name: 'GoPay',
    color: 'bg-teal-600',
    icon: '🟦',
    categoryId: 9,
    providerId: 14
  },
  {
    key: 'shopeepay',
    name: 'ShopeePay',
    color: 'bg-orange-600',
    icon: '🟧',
    categoryId: 9,
    providerId: 16
  }
];

const extractDenomFromProductName = (productName) => {
  // e.g. "SALDO OVO 5.000" -> 5; fallback to any first number
  let match = productName.match(/(\d+)(?:\.000|K|k)/);
  if (match) return parseInt(match[1]);
  match = productName.match(/(\d+)/);
  if (match) return parseInt(match[1]);
  return null;
};

const EMoneyUpdate = () => {
  const { bearerToken } = useBearerToken();
  const [selectedProviderKey, setSelectedProviderKey] = useState('');
  const [modal, setModal] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedSupplierCode, setSelectedSupplierCode] = useState('');
  const [availableSupplierCodes, setAvailableSupplierCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [products, setProducts] = useState([]); // products from products/filter (e-money products)
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const selectedProvider = useMemo(
    () => PROVIDERS.find((p) => p.key === selectedProviderKey) || null,
    [selectedProviderKey]
  );

  useEffect(() => {
    const fetchProducts = async () => {
      if (!selectedProvider || !selectedProvider.providerId || !bearerToken) return;
      setIsLoading(true);
      setIsLoadingSuppliers(true);
      setSelectedSupplier('');
      setSupplierProducts([]);
      setResults([]);
      setShowResults(false);
      try {
        const url = `https://indotechapi.socx.app/api/v1/products/filter/${selectedProvider.categoryId}/${selectedProvider.providerId}`;
        const resp = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        });
        // Keep only active products if status === 1
        const list = Array.isArray(resp.data) ? resp.data.filter((p) => p.status !== 0) : [];
        setProducts(list);

        // Fetch suppliers relevant to these products (like Pulsa Transfer)
        // 1) get all suppliers
        const suppliersResponse = await axios.get(
          'https://indotechapi.socx.app/api/v1/suppliers',
          { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
        );

        // 2) collect supplier names that appear in products_has_suppliers_modules for these products
        const supplierNames = new Set();
        const mapping = new Map();
        const supplierPromises = list.map(async (product) => {
          try {
            const res = await axios.get(
              `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/product/${product.id}`,
              { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
            );
            const arr = Array.isArray(res.data) ? res.data : [];
            arr.forEach((s) => {
              if (s.supplier) {
                supplierNames.add(s.supplier);
                mapping.set(s.supplier, s.suppliers_modules_id);
              }
            });
          } catch (_) { /* ignore */ }
        });

        await Promise.all(supplierPromises);
        const filteredSuppliers = suppliersResponse.data.filter((s) => supplierNames.has(s.name));
        setAllSuppliers(filteredSuppliers);
      } catch (e) {
        setProducts([]);
        setAllSuppliers([]);
        
      } finally {
        setIsLoading(false);
        setIsLoadingSuppliers(false);
      }
    };
    fetchProducts();
  }, [selectedProvider, bearerToken]);

  // Load supplier's products when supplier selected
  useEffect(() => {
    const fetchSupplierProducts = async () => {
      if (!selectedSupplier || products.length === 0 || !bearerToken) return;
      setIsLoadingProducts(true);
      setSupplierProducts([]);
      try {
        // Build product base codes from modules matching selected supplier name
        const selectedSupplierData = allSuppliers.find((s) => s.id === parseInt(selectedSupplier));
        const selectedSupplierName = selectedSupplierData ? selectedSupplierData.name : null;

        const modulePromises = products.map(async (product) => {
          try {
            const res = await axios.get(
              `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/product/${product.id}`,
              { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
            );
            const arr = Array.isArray(res.data) ? res.data : [];
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

        // Set available supplier codes for dropdown
        setAvailableSupplierCodes(baseCodes);

        // Create mapping from product_code to base_price
        const moduleMapping = new Map();
        modules.forEach(module => {
          moduleMapping.set(module.product_code, {
            base_price: module.base_price,
            suppliers_products_id: module.suppliers_products_id
          });
        });

        const supplierProductsResponse = await axios.get(
          `https://indotechapi.socx.app/api/v1/suppliers_products/list/${selectedSupplier}`,
          { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
        );

        const filtered = supplierProductsResponse.data.filter((sp) => {
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

        // Filter by selected supplier code if one is selected
        const finalFiltered = selectedSupplierCode 
          ? filtered.filter(sp => {
              const base = sp.code.replace(/\d+/g, '');
              return base === selectedSupplierCode;
            })
          : filtered;
        
        console.log('Supplier modules mapping:', moduleMapping);
        console.log('Filtered supplier products with base_price:', finalFiltered);
        setSupplierProducts(finalFiltered);
      } catch (_) {
        setSupplierProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchSupplierProducts();
  }, [selectedSupplier, selectedSupplierCode, products, bearerToken, allSuppliers]);

  const computed = useMemo(() => {
    const modalNum = parseFloat(modal || '0');
    const hargaJualNum = parseFloat(hargaJual || '0');
    const list = selectedSupplier ? supplierProducts : products;
    if (list.length === 0) return [];
    return list
      .map((p) => {
        const denom = extractDenomFromProductName(p.name);
        if (!denom) return null;
        if (denom % 5 !== 0) return null; // only multiples of 5
        
        // Gunakan base_price dari supplier sebagai modal
        const supplierBasePrice = p.base_price || 0;
        const base = denom * 1000; // 5000, 10000, 15000, etc.
        
        let newModal = supplierBasePrice;
        let newHargaJual = base;
        
        // Jika ada input modal, hitung: base + input (untuk update angka belakang)
        if (modalNum > 0) {
          newModal = base + modalNum; // 5000 + 38 = 5038
        }
        
        // Jika ada input harga jual, hitung: base + input
        if (hargaJualNum > 0) {
          newHargaJual = base + hargaJualNum; // 5000 + 50 = 5050
        } else if (modalNum > 0) {
          // Jika tidak ada input harga jual, gunakan modal
          newHargaJual = newModal;
        }
        
        return {
          id: p.id,
          code: p.code,
          name: p.name,
          denom,
          oldPrice: p.price,
          oldBasePrice: supplierBasePrice,
          newModal,
          newHargaJual
        };
      })
      .filter(Boolean);
  }, [modal, hargaJual, products, supplierProducts, selectedSupplier]);

  // Function to fetch resellers group pricing and get Level 1 ID
  const fetchResellersGroupPricing = async (tipProduk, token) => {
    try {
      const response = await axios.get(
        `https://indotechapi.socx.app/api/v1/resellers_group/pricing/${tipProduk}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Find Level 1 reseller group
        const level1Group = response.data.find(group => group.name === 'Level 1');
        return level1Group ? level1Group.id : null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching resellers group pricing:', error);
      return null;
    }
  };

  // Function to update markup for Level 1 reseller group
  const updateMarkup = async (resellerGroupId, newMarkup, token) => {
    try {
      const response = await axios.post(
        'https://indotechapi.socx.app/api/v1/resellers_group_has_products/update_markup',
        {
          id: resellerGroupId,
          markup: newMarkup,
          commissions: 0,
          points: 0
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true, response: response.data };
    } catch (error) {
      console.error('Error updating markup:', error);
      return { success: false, error: error.message };
    }
  };

  const updateSupplierStatus = async (productId, selectedSupplierName) => {
    try {
      const response = await axios.get(
        `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/product/${productId}`,
        { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
      );
      const all = Array.isArray(response.data) ? response.data : [];
      const updatePromises = all.map(async (supplier) => {
        try {
          const newStatus = supplier.supplier === selectedSupplierName ? 1 : 0;
          const updateResponse = await axios.patch(
            `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/${supplier.id}`,
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
            { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
          );
          return { supplier_id: supplier.suppliers_modules_id, supplier_name: supplier.supplier, status: newStatus, response: updateResponse.data };
        } catch (error) {
          return { supplier_id: supplier.suppliers_modules_id, supplier_name: supplier.supplier, status: 'error', error: error.response?.data?.message || error.message };
        }
      });
      return await Promise.all(updatePromises);
    } catch (error) {
      return [{ status: 'error', error: error.response?.data?.message || error.message }];
    }
  };

  const handleUpdate = async () => {
    if (!bearerToken || !selectedProvider) return;
    if (!modal && !hargaJual) return;
    if (!selectedSupplier) return; // require supplier selection to activate
    setIsUpdating(true);
    setResults([]);
    setShowResults(false);
    try {
      const selectedSupplierData = allSuppliers.find((s) => s.id === parseInt(selectedSupplier));
      const selectedSupplierName = selectedSupplierData ? selectedSupplierData.name : null;

      // Map products by denom for quick lookup
      const denomToProduct = new Map();
      products.forEach((prod) => {
        const d = extractDenomFromProductName(prod.name);
        if (d && !denomToProduct.has(d)) denomToProduct.set(d, prod);
      });

      const tasks = computed.map(async (item) => {
        try {
          // find corresponding e-money product by denom to get products_id
          const corresponding = denomToProduct.get(item.denom);
          if (!corresponding) {
            return { status: 'error', id: item.id, code: item.code, name: item.name, error: `Produk e-money untuk denom ${item.denom} tidak ditemukan` };
          }

           // Get tip produk from corresponding product
           const tipProduk = corresponding.tip_produk || corresponding.id;
           
           // Fetch resellers group pricing to get Level 1 ID
           const level1ResellerGroupId = await fetchResellersGroupPricing(tipProduk, bearerToken);
           
           // Calculate markup based on actual price difference (harga jual - harga modal)
           const actualMargin = item.newHargaJual - item.newModal;
           const markupPercentage = Math.round(actualMargin);

           const [priceResp, supplierStatusResults, markupResult] = await Promise.all([
             axios.post(
               'https://indotechapi.socx.app/api/v1/products/update_price',
               { id: corresponding.id, price: item.newModal },
               { headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' } }
             ),
             selectedSupplierName ? updateSupplierStatus(corresponding.id, selectedSupplierName) : Promise.resolve([]),
             // Update markup for Level 1 reseller group (if found)
             level1ResellerGroupId ? updateMarkup(level1ResellerGroupId, markupPercentage, bearerToken) : Promise.resolve({ success: false, error: 'Level 1 reseller group not found' })
           ]);
          return {
            status: 'success',
            id: item.id,
            code: item.code,
            name: item.name,
            denom: item.denom,
            old_price: item.oldPrice,
            new_modal: item.newModal,
            new_harga_jual: item.newHargaJual,
            products_id: corresponding.id,
            response: priceResp.data,
            supplier_status_results: supplierStatusResults,
            markup_result: markupResult,
            markup_percentage: markupPercentage,
            tip_produk: tipProduk,
            level1_reseller_group_id: level1ResellerGroupId
          };
        } catch (error) {
          return {
            status: 'error',
            id: item.id,
            code: item.code,
            name: item.name,
            error: error.response?.data?.message || error.message
          };
        }
      });
      const res = await Promise.all(tasks);
      setResults(res);
      setShowResults(true);
    } finally {
      setIsUpdating(false);
    }
  };

  const reset = () => {
    setSelectedProviderKey('');
    setModal('');
    setHargaJual('');
    setSelectedSupplier('');
    setSelectedSupplierCode('');
    setAvailableSupplierCodes([]);
    setProducts([]);
    setAllSuppliers([]);
    setSupplierProducts([]);
    
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Update E-Money</h1>
        <p className="text-lg text-gray-600">Pilih provider e-money dan set tambahan harga</p>
        <div className="mt-4">
          <a href="/" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
            ← Kembali ke Dashboard
          </a>
        </div>
      </div>

      {!bearerToken && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Bearer Token Required</h3>
              <p className="text-sm text-red-700 mt-1">Set Bearer Token terlebih dahulu.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Pilih Provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROVIDERS.map((p) => (
            <div
              key={p.key}
              onClick={() => setSelectedProviderKey(p.key)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                selectedProviderKey === p.key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 rounded-full ${p.color} flex items-center justify-center text-white text-xl`}>
                  {p.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-sm text-gray-600">E-Money</p>
                </div>
              </div>
              {p.providerId == null && (
                <p className="mt-2 text-xs text-amber-600">ID provider belum diset</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedProvider && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Pilih Supplier</h2>
          {isLoadingSuppliers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading suppliers...</span>
            </div>
          ) : (
            <div>
              {allSuppliers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allSuppliers.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSupplier(String(s.id))}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                        selectedSupplier === String(s.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{s.name}</h3>
                          <p className="text-sm text-gray-600">Notes: {s.notes}</p>
                          <p className="text-sm text-gray-500">Balance: Rp {s.balance?.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {s.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Tidak ada supplier yang relevan untuk provider ini</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

       {selectedProvider && selectedSupplier && selectedSupplierCode && (
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
           <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Input Harga</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label htmlFor="modal" className="block text-sm font-medium text-gray-700 mb-2">
                 Modal (Rp)
               </label>
               <div className="relative">
                 <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 select-none">+</span>
                 <input
                   type="number"
                   id="modal"
                   value={modal}
                   onChange={(e) => setModal(e.target.value)}
                   step="1"
                   className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   placeholder="Contoh: 50 atau 170"
                 />
               </div>
               <p className="text-sm text-gray-500 mt-1">Harga modal yang akan diupdate</p>
             </div>
             <div>
               <label htmlFor="harga-jual" className="block text-sm font-medium text-gray-700 mb-2">
                 Harga Jual (Rp)
               </label>
               <div className="relative">
                 <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 select-none">+</span>
                 <input
                   type="number"
                   id="harga-jual"
                   value={hargaJual}
                   onChange={(e) => setHargaJual(e.target.value)}
                   step="1"
                   className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   placeholder="Contoh: 50 atau 170"
                 />
               </div>
               <p className="text-sm text-gray-500 mt-1">Harga jual yang akan diupdate</p>
             </div>
           </div>
         </div>
       )}

      {selectedProvider && selectedSupplier && availableSupplierCodes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Pilih Kode Supplier</h2>
          <div className="mb-4">
            <label htmlFor="supplier-code" className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Kode Supplier
            </label>
            <select
              id="supplier-code"
              value={selectedSupplierCode}
              onChange={(e) => setSelectedSupplierCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Pilih kode supplier...</option>
              {availableSupplierCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Pilih kode supplier yang akan diupdate.
            </p>
          </div>
        </div>
      )}

      {selectedProvider && selectedSupplier && selectedSupplierCode && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Produk</h2>
          {isLoading || isLoadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : supplierProducts.length === 0 ? (
            <p className="text-gray-500">Tidak ada produk</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {computed.slice(0, 48).map((item) => (
                <div key={item.id} className="p-4 rounded-lg border bg-gray-50 h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-800 mb-1">{item.name}</p>
                      <p className="text-xs text-gray-600">Kode: {item.code}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-green-700">Modal: Rp {item.newModal.toLocaleString()}</p>
                      <p className="font-semibold text-blue-700">Harga Jual: Rp {item.newHargaJual.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {computed.length > 48 && (
                <div className="col-span-full">
                  <p className="text-xs text-gray-600 text-center">... dan {computed.length - 48} produk lainnya</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {selectedProvider && selectedSupplier && selectedSupplierCode && (modal || hargaJual) && computed.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ready to Update</h3>
              <p className="text-sm text-gray-600">{selectedProvider.name} - {allSuppliers.find(s => s.id === parseInt(selectedSupplier))?.name} ({computed.length} produk)</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={reset}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleUpdate}
                disabled={!bearerToken || isUpdating}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !bearerToken || isUpdating ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isUpdating ? 'Processing...' : 'Update Harga' }
              </button>
            </div>
          </div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hasil Update</h3>
          <div className="space-y-3">
            {results.map((r, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${r.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {r.status === 'success' ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-800 mb-1">{r.name} ({r.code})</p>
                      <p className="text-xs text-gray-600">Denom: {r.denom}K</p>
                    </div>
                     <div className="text-right text-sm">
                       <p className="font-semibold text-green-700">Modal: Rp {r.new_modal?.toLocaleString()}</p>
                       <p className="font-semibold text-blue-700">Harga Jual: Rp {r.new_harga_jual?.toLocaleString()}</p>
                       <p className="font-semibold text-purple-700">Profit: Rp {((r.new_harga_jual || 0) - (r.new_modal || 0)).toLocaleString()}</p>
                     </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-red-800 mb-1">Gagal: {r.name} ({r.code})</p>
                    <p className="text-xs text-red-600">{r.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tutorial / Informasi */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Panduan Penggunaan</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Pilih provider E-Money: OVO, DANA, GoPay, atau ShopeePay</li>
          <li>Pilih supplier yang memiliki produk e-money untuk provider tersebut</li>
          <li>Pilih kode supplier yang akan diupdate (DANA, DANAP, dll)</li>
          <li>Masukkan modal dan harga jual untuk mengubah harga produk</li>
          <li>Periksa preview perubahan harga pada daftar produk</li>
          <li>Klik "Update All Products" untuk mengirim pembaruan ke API</li>
        </ol>
        <div className="mt-4">
          <h4 className="font-medium text-blue-900 mb-1">Contoh:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Modal 38 → 5K menjadi 5.038, 10K menjadi 10.038</li>
            <li>Harga Jual 50 → 5K menjadi 5.050, 10K menjadi 10.050</li>
            <li>Profit = Harga Jual - Modal (5.050 - 5.038 = 12)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EMoneyUpdate;


