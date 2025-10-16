import React, { useState, useEffect } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import axios from 'axios';
import Swal from 'sweetalert2';

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
  const [transferProducts, setTransferProducts] = useState([]);
  const [supplierModuleMapping, setSupplierModuleMapping] = useState(new Map());
  const [ourProductCodes, setOurProductCodes] = useState([]);

  // Data provider
  const providers = [
    {
      id: 1,
      name: 'Telkomsel',
      icon: '📞',
      color: 'bg-blue-500',
      endpoint: 1 // /api/v1/products/filter/1/1
    },
    {
      id: 2,
      name: 'Indosat',
      icon: '📱',
      color: 'bg-red-500',
      endpoint: 2 // /api/v1/products/filter/1/2
    },
    {
      id: 3,
      name: 'XL',
      icon: '📶',
      color: 'bg-purple-500',
      endpoint: 7 // /api/v1/products/filter/1/7
    },
    {
      id: 4,
      name: 'Tri',
      icon: '🌳',
      color: 'bg-green-500',
      endpoint: 9 // /api/v1/products/filter/1/9
    },
    {
      id: 5,
      name: 'Smartfren',
      icon: '📲',
      color: 'bg-orange-500',
      endpoint: 6 // /api/v1/products/filter/1/5
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

      // Get the correct endpoint for the selected provider
      const providerData = providers.find(p => p.id === selectedProvider);
      const endpoint = providerData ? providerData.endpoint : selectedProvider;
      
      // Fetch products for the selected provider
      const productsResponse = await axios.get(
        `https://indotechapi.socx.app/api/v1/products/filter/1/${endpoint}`,
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

      // Store transfer products for later use (contains products_id for price update)
      setTransferProducts(transferProducts);

      // Get unique supplier names and their modules_id from transfer products
      const supplierNames = new Set();
      const supplierModuleMapping = new Map(); // Map supplier name to suppliers_modules_id
      const ourProductCodesData = []; // Store our product codes and prices
      
      // Batch fetch suppliers for all products to reduce OPTIONS requests
      const supplierPromises = transferProducts.map(async (product) => {
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
          
          return productSuppliersResponse.data;
        } catch (error) {
          console.error(`Error fetching suppliers for product ${product.id}:`, error);
          return null;
        }
      });
      
      // Wait for all requests to complete
      const allSupplierResponses = await Promise.all(supplierPromises);
      
      // Process all responses
      allSupplierResponses.forEach((supplierData, index) => {
        if (supplierData && Array.isArray(supplierData)) {
          supplierData.forEach(supplier => {
            // Use supplier name to match
            supplierNames.add(supplier.supplier);
            // Store mapping: supplier name -> suppliers_modules_id
            supplierModuleMapping.set(supplier.supplier, supplier.suppliers_modules_id);
            
            // Collect our product codes (products_code) and prices
            ourProductCodesData.push({
              products_code: supplier.products_code,
              product_name: supplier.product_name,
              base_price: supplier.base_price,
              denom: extractDenomFromProductName(supplier.product_name)
            });
          });
        } else {
          console.warn(`No supplier data found for product ${transferProducts[index].id}`);
        }
      });

      // Filter suppliers that have transfer products for this provider
      const filteredSuppliers = suppliersResponse.data.filter(supplier => 
        supplierNames.has(supplier.name)
      );

      console.log('Transfer Products:', transferProducts);
      console.log('Supplier Names from products:', Array.from(supplierNames));
      console.log('All Suppliers:', suppliersResponse.data);
      console.log('Filtered Suppliers:', filteredSuppliers);
      console.log('Our Product Codes Data:', ourProductCodesData);
      console.log('Available Transfer Rates:', transferRates);
      
      // Debug: Check if any products have denom extraction issues
      const denomIssues = ourProductCodesData.filter(product => product.denom === null);
      if (denomIssues.length > 0) {
        console.warn('Products with denom extraction issues:', denomIssues);
      }
      
      // Debug: Show available denoms for each provider
      Object.keys(transferRates).forEach(provider => {
        const denoms = Object.keys(transferRates[provider]).map(d => parseInt(d)).sort((a, b) => a - b);
        console.log(`Available denoms for ${provider}:`, denoms);
      });

      setAllSuppliers(filteredSuppliers);
      setSupplierModuleMapping(supplierModuleMapping);
      setOurProductCodes(ourProductCodesData);
    } catch (error) {
      console.error('Error fetching suppliers by provider:', error);
      setAllSuppliers([]);
    } finally {
      setIsLoadingSuppliers(false);
    }
  };

  const fetchSupplierProducts = async () => {
    if (!selectedSupplier) return;

    setIsLoadingProducts(true);
    try {
      // Step 1: Get suppliers_products_id and product_code from products_has_suppliers_modules
      const supplierModulePromises = transferProducts.map(async (product) => {
        try {
          const response = await axios.get(
            `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/product/${product.id}`,
            {
              headers: {
                'Authorization': `Bearer ${bearerToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          // Find the selected supplier in the response
          const selectedSupplierData = allSuppliers.find(s => s.id === parseInt(selectedSupplier));
          const selectedSupplierName = selectedSupplierData ? selectedSupplierData.name : null;
          
          console.log(`Processing product ${product.id}, looking for supplier: ${selectedSupplierName}`);
          
          // Check if response data exists and is an array
          if (!response.data || !Array.isArray(response.data)) {
            console.warn(`No supplier module data found for product ${product.id}`, response.data);
            return null;
          }
          
          console.log(`Found ${response.data.length} supplier modules for product ${product.id}`);
          
          const supplierModule = response.data.find(sm => sm.supplier === selectedSupplierName);
          
          if (supplierModule) {
            return {
              suppliers_products_id: supplierModule.suppliers_products_id,
              product_code: supplierModule.product_code,
              product_name: supplierModule.product_name,
              base_price: supplierModule.base_price
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching supplier module for product ${product.id}:`, error);
          return null;
        }
      });
      
      const supplierModules = await Promise.all(supplierModulePromises);
      const validModules = supplierModules.filter(module => module !== null);
      
      console.log('Valid supplier modules:', validModules);
      
      // Step 2: Get unique product codes (without numbers) for filtering
      const productCodes = [...new Set(validModules.map(module => {
        // Extract base code without numbers (e.g., "TTF10" -> "TTF")
        return module.product_code.replace(/\d+/g, '');
      }))];
      
      console.log('Product codes to filter:', productCodes);
      
      // Step 3: Fetch all supplier products and filter by product codes
      const supplierProductsResponse = await axios.get(
        `https://indotechapi.socx.app/api/v1/suppliers_products/list/${selectedSupplier}`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Filter products by product codes (without numbers)
      const filteredProducts = supplierProductsResponse.data.filter(product => {
        const productCodeBase = product.code.replace(/\d+/g, '');
        return productCodes.includes(productCodeBase);
      });
      
      console.log('All supplier products:', supplierProductsResponse.data);
      console.log('Filtered products by code:', filteredProducts);
      
      setSupplierProducts(filteredProducts);
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

  // Data biaya admin untuk Transfer (semua provider)
  const transferRates = {
    // Telkomsel Transfer
    telkomsel: {
      5: 7000,
      10: 12000,
      15: 17000,
      20: 22750,
      25: 27750,
      30: 32750,
      35: 37750,
      40: 42750,
      45: 47750,
      50: 53250,
      55: 58250,
      60: 63250,
      65: 68250,
      70: 73250,
      75: 78250,
      80: 83250,
      85: 88250,
      90: 93250,
      95: 98250,
      100: 105500
    },
    // Indosat Transfer
    indosat: {
      5: 6000,
      10: 11000,
      15: 16000,
      20: 21000,
      25: 26500,
      30: 31500,
      35: 36500,
      40: 41500,
      45: 47000,
      50: 52000,
      55: 57000,
      60: 62000,
      65: 67000,
      70: 72000,
      75: 77000,
      80: 82000,
      85: 87000,
      90: 92000,
      95: 97000,
      100: 104000,
      105: 109000,
      110: 114000,
      115: 119000,
      120: 124000,
      125: 129000,
      130: 134000,
      135: 139000,
      140: 144000,
      145: 149000,
      150: 154000,
      155: 159000,
      160: 164000,
      165: 169000,
      170: 174000,
      175: 179000,
      180: 184000,
      185: 189000,
      190: 194000,
      195: 199000,
      200: 204000
    },
    // Tri Transfer
    tri: {
      5: 6000,
      10: 11000,
      15: 16000,
      20: 21000,
      25: 26500,
      30: 31500,
      35: 36500,
      40: 41500,
      45: 47000,
      50: 52000,
      55: 57000,
      60: 62000,
      65: 67000,
      70: 72000,
      75: 77000,
      80: 82000,
      85: 87000,
      90: 92000,
      95: 97000,
      100: 104000,
      105: 109000,
      110: 114000,
      115: 119000,
      120: 124000,
      125: 129000,
      130: 134000,
      135: 139000,
      140: 144000,
      145: 149000,
      150: 154000,
      155: 159000,
      160: 164000,
      165: 169000,
      170: 174000,
      175: 179000,
      180: 184000,
      185: 189000,
      190: 194000,
      195: 199000,
      200: 204000
    },
    // XL Axiata Transfer
    xl: {
      5: 6000,
      10: 11000,
      15: 16000,
      20: 21000,
      25: 26500,
      30: 31500,
      35: 36500,
      40: 41500,
      45: 47000,
      50: 52000,
      55: 57000,
      60: 62000,
      65: 67000,
      70: 72000,
      75: 77000,
      80: 82000,
      85: 87000,
      90: 92000,
      95: 97000,
      100: 104000,
      105: 109000,
      110: 114000,
      115: 119000,
      120: 124000,
      125: 129000,
      130: 134000,
      135: 139000,
      140: 144000,
      145: 149000,
      150: 154000,
      155: 159000,
      160: 164000,
      165: 169000,
      170: 174000,
      175: 179000,
      180: 184000,
      185: 189000,
      190: 194000,
      195: 199000,
      200: 204000
    },
    // Smartfren Transfer
    smartfren: {
      5: 600,
      10: 1100,
      15: 1600,
      20: 1600,
      25: 2100,
      30: 2100,
      35: 2100,
      40: 2100,
      45: 2100,
      50: 2100,
      55: 2600,
      60: 2600,
      65: 2600,
      70: 2600,
      75: 2600,
      80: 2600,
      85: 2600,
      90: 2600,
      95: 2600
    }
  };

  const calculateModal = (adminFee, pot) => {
    return adminFee - (adminFee * (pot / 100));
  };

  const calculateHargaJual = (adminFee, pot) => {
    return adminFee - (adminFee * (pot / 100));
  };

  const calculateOurProductPrices = () => {
    if (!supplierPot || !sellPot || ourProductCodes.length === 0) return [];
    
    const providerName = selectedProviderData?.name.toLowerCase();
    const providerRates = transferRates[providerName] || transferRates.telkomsel;
    
    // Remove duplicates by using Map with products_code as key
    const uniqueProducts = new Map();
    
    ourProductCodes.forEach(product => {
      const adminFee = providerRates[product.denom];
      if (!adminFee) return;
      
      const hargaJual = Math.round(calculateHargaJual(adminFee, parseFloat(sellPot)));
      
      // Use products_code as key to avoid duplicates
      if (!uniqueProducts.has(product.products_code)) {
        uniqueProducts.set(product.products_code, {
          products_code: product.products_code,
          harga_jual: hargaJual,
          denom: product.denom
        });
      }
    });
    
    return Array.from(uniqueProducts.values());
  };

  const extractDenomFromProductName = (productName) => {
    // Extract denom from product name like "TELKOMSEL TRANSFER 5.000" -> 5
    // Handle various formats including "XL AXIS TRANSFER (XTF5)" -> 5
    console.log('Extracting denom from product name:', productName);
    
    // Try multiple patterns to extract denom
    let match = null;
    
    // Pattern 1: Standard format "PROVIDER TRANSFER 5.000" or "PROVIDER TRANSFER 5K"
    match = productName.match(/(\d+)(?:\.000|K|k)/);
    if (match) {
      const denom = parseInt(match[1]);
      console.log('Found denom (pattern 1):', denom);
      return denom;
    }
    
    // Pattern 2: Format with parentheses like "XL AXIS TRANSFER (XTF5)" -> 5
    match = productName.match(/\([A-Z]*(\d+)\)/);
    if (match) {
      const denom = parseInt(match[1]);
      console.log('Found denom (pattern 2):', denom);
      return denom;
    }
    
    // Pattern 3: Any number in the string
    match = productName.match(/(\d+)/);
    if (match) {
      const denom = parseInt(match[1]);
      console.log('Found denom (pattern 3):', denom);
      return denom;
    }
    
    console.log('No denom found in product name:', productName);
    return null;
  };

  const calculateMargin = () => {
    if (!supplierPot || !sellPot || !selectedProvider) {
      return { margin: 0, marginPercent: 0 };
    }

    const supplierPotNum = parseFloat(supplierPot);
    const sellPotNum = parseFloat(sellPot);
    
    // Ambil admin fee dari provider yang dipilih (gunakan denom 5K sebagai contoh)
    const providerName = selectedProviderData?.name.toLowerCase();
    const providerRates = transferRates[providerName] || transferRates.telkomsel;
    const adminFee = providerRates[5]; // Gunakan denom 5K sebagai referensi
    
    if (!adminFee) {
      return { margin: 0, marginPercent: 0 };
    }

    // Hitung harga modal dan harga jual
    const hargaModal = Math.round(calculateModal(adminFee, supplierPotNum));
    const hargaJual = Math.round(calculateHargaJual(adminFee, sellPotNum));
    
    // Hitung margin dari selisih harga
    const margin = hargaJual - hargaModal;
    const marginPercent = hargaModal > 0 ? (margin / hargaModal) * 100 : 0;
    
    return { 
      margin, 
      marginPercent,
      hargaModal,
      hargaJual,
      adminFee
    };
  };

  const updateSupplierStatus = async (productsId, selectedSupplierName, token) => {
    try {
      // 1. Get all suppliers for this product
      const response = await axios.get(
        `https://indotechapi.socx.app/api/v1/products_has_suppliers_modules/product/${productsId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const allSuppliers = response.data;
      const statusResults = [];

      console.log('All suppliers for product:', allSuppliers);
      console.log('Selected supplier name:', selectedSupplierName);
      console.log('Supplier module mapping:', supplierModuleMapping);

      // 2. Batch update status for all suppliers to reduce OPTIONS requests
      const updatePromises = allSuppliers.map(async (supplier) => {
        try {
          // Compare supplier names directly
          const newStatus = supplier.supplier === selectedSupplierName ? 1 : 0;
          
          console.log(`Supplier: ${supplier.supplier}, Selected: ${selectedSupplierName}, New Status: ${newStatus}`);
          
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
            {
              headers: {
                'Authorization': `Bearer ${token}`,
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
      
      // Wait for all updates to complete
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

  const processUpdate = async () => {
    if (!selectedProvider || !selectedSupplier || !supplierPot || !sellPot) {
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

    if (supplierProducts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Tidak ada produk transfer yang ditemukan untuk supplier ini',
        confirmButtonText: 'OK'
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setShowResults(false);

    try {
      const { margin, marginPercent } = calculateMargin();
      const updateResults = [];

      // Batch update semua produk transfer dari supplier to reduce OPTIONS requests
      const productUpdatePromises = supplierProducts.map(async (product) => {
        try {
          // Extract denom from product name
          const denom = extractDenomFromProductName(product.name);
          
          // Get admin fee based on provider
          const providerName = selectedProviderData?.name.toLowerCase();
          const providerRates = transferRates[providerName] || transferRates.telkomsel;
          const adminFee = providerRates[denom];
          
          if (!adminFee) {
            const errorMessage = denom === null 
              ? `Tidak dapat mengekstrak denom dari nama produk: "${product.name}". Pastikan nama produk mengandung angka (contoh: "XL AXIS TRANSFER (XTF5)" atau "XL TRANSFER 5.000")`
              : `Biaya admin tidak ditemukan untuk denom ${denom} pada provider ${providerName}`;
            
            console.error('Admin fee lookup failed:', {
              productName: product.name,
              productCode: product.code,
              denom: denom,
              providerName: providerName,
              availableDenoms: Object.keys(providerRates)
            });
            
            return {
              status: 'error',
              product: product.name,
              product_code: product.code,
              error: errorMessage
            };
          }

          // Calculate new base_price (modal) based on supplier pot
          const newBasePrice = Math.round(calculateModal(adminFee, parseFloat(supplierPot)));
          
          // Calculate new sell price based on sell pot
          const newSellPrice = Math.round(calculateHargaJual(adminFee, parseFloat(sellPot)));

          // Find the corresponding transfer product to get the correct products_id
          const correspondingTransferProduct = transferProducts.find(tp => {
            const tpDenom = extractDenomFromProductName(tp.name);
            const productDenom = extractDenomFromProductName(product.name);
            return tpDenom === productDenom && tp.name.toLowerCase().includes('transfer');
          });

          if (!correspondingTransferProduct) {
            return {
              status: 'error',
              product: product.name,
              product_code: product.code,
              error: `Transfer product tidak ditemukan untuk denom ${denom}`
            };
          }

          // Get selected supplier name from the supplier list
          const selectedSupplierData = allSuppliers.find(s => s.id === parseInt(selectedSupplier));
          const selectedSupplierName = selectedSupplierData ? selectedSupplierData.name : null;

          // Get tip produk from corresponding transfer product
          const tipProduk = correspondingTransferProduct.tip_produk || correspondingTransferProduct.id;
          
          // Fetch resellers group pricing to get Level 1 ID
          const level1ResellerGroupId = await fetchResellersGroupPricing(tipProduk, bearerToken);
          
          // Calculate markup based on actual price difference (harga jual - harga modal)
          const actualMargin = newSellPrice - newBasePrice;
          const markupPercentage = Math.round(actualMargin);

          // Execute all updates in parallel
          const [supplierProductResponse, productPriceResponse, supplierStatusResults, markupResult] = await Promise.all([
            // 1. Update supplier product (base_price) using PATCH
            axios.patch(
              `https://indotechapi.socx.app/api/v1/suppliers_products/${product.id}`,
              {
                id: product.id,
                suppliers_id: selectedSupplier,
                name: product.name,
                code: product.code,
                base_price: newBasePrice,
                status: product.status,
                parameters: product.parameters || '',
                trx_per_day: product.trx_per_day,
                regex_custom_info: product.regex_custom_info || '',
                updated_time: Math.floor(Date.now() / 1000)
              },
              {
                headers: {
                  'Authorization': `Bearer ${bearerToken}`,
                  'Content-Type': 'application/json'
                }
              }
            ),
            // 2. Update product price (harga modal) using POST
            axios.post(
              'https://indotechapi.socx.app/api/v1/products/update_price',
              {
                id: correspondingTransferProduct.id,
                price: newBasePrice // Gunakan harga modal, bukan harga jual
              },
              {
                headers: {
                  'Authorization': `Bearer ${bearerToken}`,
                  'Content-Type': 'application/json'
                }
              }
            ),
            // 3. Update supplier status
            updateSupplierStatus(
              correspondingTransferProduct.id,
              selectedSupplierName,
              bearerToken
            ),
            // 4. Update markup for Level 1 reseller group (if found)
            level1ResellerGroupId ? updateMarkup(level1ResellerGroupId, markupPercentage, bearerToken) : Promise.resolve({ success: false, error: 'Level 1 reseller group not found' })
          ]);

          return {
            status: 'success',
            product: product.name,
            product_code: product.code,
            denom: denom,
            admin_fee: adminFee,
            old_base_price: product.base_price,
            new_base_price: newBasePrice,
            new_sell_price: newSellPrice,
            supplier_pot: parseFloat(supplierPot),
            sell_pot: parseFloat(sellPot),
            markup_percentage: markupPercentage,
            tip_produk: tipProduk,
            level1_reseller_group_id: level1ResellerGroupId,
            products_id: correspondingTransferProduct.id,
            supplier_response: supplierProductResponse.data,
            price_response: productPriceResponse.data, // Response dari update harga modal
            supplier_status_results: supplierStatusResults,
            markup_result: markupResult, // Response dari update markup
            selected_supplier_id: selectedSupplier
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
    setSelectedProvider('');
    setSelectedSupplier('');
    setSupplierPot('');
    setSellPot('');
    setSupplierProducts([]);
    setTransferProducts([]);
    setSupplierModuleMapping(new Map());
    setOurProductCodes([]);
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
          Kelola pot pulsa transfer, update harga modal, dan aktifkan supplier yang dipilih
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

          {/* Preview Calculation */}
          {supplierPot && sellPot && supplierProducts.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Preview Kalkulasi</h3>
              <div className="space-y-3">
                {supplierProducts.slice(0, 3).map((product) => {
                  const denom = extractDenomFromProductName(product.name);
                  
                  // Get admin fee based on provider
                  const providerName = selectedProviderData?.name.toLowerCase();
                  const providerRates = transferRates[providerName] || transferRates.telkomsel;
                  const adminFee = providerRates[denom];
                  
                  // Debug: log provider info
                  console.log('Provider Debug:', {
                    productName: product.name,
                    selectedProviderData: selectedProviderData,
                    providerName: providerName,
                    denom: denom,
                    adminFee: adminFee,
                    providerRates: providerRates,
                    availableDenoms: Object.keys(providerRates)
                  });
                  
                  if (!adminFee) {
                    console.warn(`Preview calculation failed for product: ${product.name}, denom: ${denom}`);
                    return (
                      <div key={product.id} className="bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-red-800">{product.name}</p>
                            <p className="text-xs text-red-600">
                              {denom === null 
                                ? `Tidak dapat mengekstrak denom dari nama produk`
                                : `Denom ${denom} tidak ditemukan di provider ${providerName}`
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-red-600 font-medium">ERROR</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  const newBasePrice = Math.round(calculateModal(adminFee, parseFloat(supplierPot)));
                  const newSellPrice = Math.round(calculateHargaJual(adminFee, parseFloat(sellPot)));
                  const margin = newSellPrice - newBasePrice;
                  const marginPercent = newBasePrice > 0 ? ((margin / newBasePrice) * 100).toFixed(2) : 0;
                  
                  return (
                    <div key={product.id} className="bg-white p-3 rounded border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{product.name}</p>
                          <p className="text-xs text-gray-600">Admin: Rp {adminFee.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">Modal: Rp {newBasePrice.toLocaleString()}</p>
                          <p className="text-sm font-semibold text-blue-600">Jual: Rp {newSellPrice.toLocaleString()}</p>
                          <p className={`text-xs font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Margin: Rp {margin.toLocaleString()} ({marginPercent}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {supplierProducts.length > 3 && (
                  <p className="text-xs text-gray-600 text-center">
                    ... dan {supplierProducts.length - 3} produk lainnya
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Our Product Codes and Prices */}
      {selectedProvider && selectedSupplier && supplierPot && sellPot && ourProductCodes.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Kode Produk & Harga Jual ({selectedProviderData?.name})
            </h3>
            <button
              onClick={() => {
                const productPrices = calculateOurProductPrices();
                const copyText = productPrices.map(p => `${p.products_code} ${p.harga_jual}`).join('\n');
                navigator.clipboard.writeText(copyText);
                
                Swal.fire({
                  icon: 'success',
                  title: 'Berhasil!',
                  text: 'Data kode produk dan harga jual berhasil di-copy ke clipboard',
                  timer: 2000,
                  showConfirmButton: false,
                  toast: true,
                  position: 'top-end'
                });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Copy Semua
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded border max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {calculateOurProductPrices().map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                  <span className="font-mono text-sm font-semibold text-gray-800">
                    {product.products_code}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {product.harga_jual.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
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
                {isProcessing ? 'Processing...' : 'Update Modal & Aktifkan Supplier'}
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
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Denom</p>
                            <p className="font-semibold">{result.denom}K</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Admin Fee</p>
                            <p className="font-semibold">Rp {result.admin_fee?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Modal (Base Price)</p>
                            <p className="font-semibold">Rp {result.new_base_price?.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">({result.supplier_pot}% pot)</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Harga Jual</p>
                            <p className="font-semibold">Rp {result.new_sell_price?.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">({result.sell_pot}% pot)</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Margin</p>
                            <p className={`font-semibold ${(result.new_sell_price - result.new_base_price) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Rp {(result.new_sell_price - result.new_base_price)?.toLocaleString()}
                            </p>
                            <p className={`text-xs ${(result.new_sell_price - result.new_base_price) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              ({result.new_base_price > 0 ? (((result.new_sell_price - result.new_base_price) / result.new_base_price) * 100).toFixed(2) : 0}%)
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 grid grid-cols-3 gap-4">
                          <div>
                            Modal lama: Rp {result.old_base_price?.toLocaleString()}
                          </div>
                          <div>
                            Products ID: {result.products_id}
                          </div>
                          <div>
                            Selected Supplier ID: {result.selected_supplier_id}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-blue-600">
                          📝 Update Price API: Rp {result.new_base_price?.toLocaleString()} (harga modal)
                        </div>
                        
                        {/* Markup Information */}
                        {result.markup_result && (
                          <div className="mt-2 text-xs text-purple-600">
                            💰 Markup: {result.markup_percentage}% | 
                            Tip Produk: {result.tip_produk} | 
                            Level 1 ID: {result.level1_reseller_group_id || 'Not found'} | 
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

