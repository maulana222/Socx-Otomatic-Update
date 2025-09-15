const axios = require('axios');
const fs = require('fs');

// Konfigurasi
const CONFIG = {
  SUPPLIER_ID: 36,
  API_BASE_URL: 'https://indotechapi.socx.app/api/v1',
  BEARER_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTc4NzM0MDYsImlkIjoxNCwibmFtZSI6ImVyZ2lhbGlwZmFsYWhAZ21haWwuY29tIiwib3RwIjoiMSIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIiwidHlwZSI6bnVsbH0.08PzI73tXFxRMzMs9dLome8hD-u7JGspt5bZM_muWBQ', // Isi dengan bearer token Anda
  DRY_RUN: false, // Set true untuk test tanpa update
  LOG_FILE: 'update_log.txt',
  PROVIDER: 'INDOSAT' // Provider yang akan diupdate
};

// Fungsi untuk log ke file dan console
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  
  console.log(logMessage);
  
  // Tulis ke file log
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
}

// Fungsi untuk mengekstrak denom dari nama produk
function extractDenomFromProductName(productName) {
  console.log('Extracting denom from product name:', productName);
  
  // Pattern 1: Standard format "XL AXIS TRANSFER 5.000" or "XL AXIS TRANSFER 5K"
  let match = productName.match(/(\d+)(?:\.000|K|k)/);
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
}

// Fungsi untuk mengekstrak denom dari kode produk
function extractDenomFromProductCode(productCode) {
  // Pattern untuk XTF5, XTF10, XTF15, dll (XL)
  let match = productCode.match(/XTF(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // Pattern untuk ITF5, ITF10, ITF15, dll (Indosat)
  match = productCode.match(/ITB(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  // Pattern untuk TTF5, TTF10, TTF15, dll (Telkomsel)
  match = productCode.match(/TTF(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  
  return null;
}

// Fungsi untuk membuat nama produk yang benar
function createCorrectProductName(denom, provider = CONFIG.PROVIDER) {
  switch (provider.toUpperCase()) {
    case 'INDOSAT':
      return `INDOSAT TRANSFER ${denom}.000`;
    case 'XL':
      return `XL AXIS TRANSFER ${denom}.000`;
    case 'TELKOMSEL':
      return `TELKOMSEL TRANSFER ${denom}.000`;
    case 'TRI':
      return `TRI TRANSFER ${denom}.000`;
    case 'SMARTFREN':
      return `SMARTFREN TRANSFER ${denom}.000`;
    default:
      return `TRANSFER ${denom}.000`;
  }
}

// Fungsi untuk mengambil data produk dari API
async function fetchSupplierProducts() {
  try {
    log(`Fetching products for supplier ID: ${CONFIG.SUPPLIER_ID}`);
    
    const response = await axios.get(
      `${CONFIG.API_BASE_URL}/suppliers_products/list/${CONFIG.SUPPLIER_ID}`,
      {
      headers: {
          'Authorization': `Bearer ${CONFIG.BEARER_TOKEN}`,
        'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Successfully fetched ${response.data.length} products`);
    return response.data;
  } catch (error) {
    log(`Error fetching products: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Fungsi untuk mengupdate produk
async function updateProduct(productId, updateData) {
  try {
    if (CONFIG.DRY_RUN) {
      log(`[DRY RUN] Would update product ${productId} with data: ${JSON.stringify(updateData)}`);
      return { success: true, dryRun: true };
    }
    
    log(`Updating product ID: ${productId}`);
    
    const response = await axios.patch(
      `${CONFIG.API_BASE_URL}/suppliers_products/${productId}`,
      updateData,
      {
      headers: {
          'Authorization': `Bearer ${CONFIG.BEARER_TOKEN}`,
        'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Successfully updated product ${productId}`);
    return { success: true, response: response.data };
  } catch (error) {
    log(`Error updating product ${productId}: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

// Fungsi utama untuk memproses update
async function processUpdates() {
  try {
    // Validasi konfigurasi
    if (!CONFIG.BEARER_TOKEN) {
      log('Bearer token tidak ditemukan. Silakan set CONFIG.BEARER_TOKEN', 'ERROR');
      return;
    }
    
     log('=== MULAI PROSES UPDATE PRODUK SUPPLIER ===');
     log(`Supplier ID: ${CONFIG.SUPPLIER_ID}`);
     log(`Provider: ${CONFIG.PROVIDER}`);
     log(`Dry Run: ${CONFIG.DRY_RUN}`);
    
    // Ambil data produk
    const products = await fetchSupplierProducts();
    
     // Filter produk berdasarkan provider
     let transferProducts = [];
     let productType = '';
     
     switch (CONFIG.PROVIDER.toUpperCase()) {
       case 'INDOSAT':
         transferProducts = products.filter(product => 
           product.code && product.code.toUpperCase().includes('ITB')
         );
         productType = 'ITB';
         break;
       case 'XL':
         transferProducts = products.filter(product => 
    product.code && product.code.toUpperCase().includes('XTF')
  );
         productType = 'XTF';
         break;
       case 'TELKOMSEL':
         transferProducts = products.filter(product => 
           product.code && product.code.toUpperCase().includes('TTF')
         );
         productType = 'TTF';
         break;
       default:
         transferProducts = products.filter(product => 
           product.code && (product.code.toUpperCase().includes('XTF') || 
                           product.code.toUpperCase().includes('ITB') || 
                           product.code.toUpperCase().includes('TTF'))
         );
         productType = 'TRANSFER';
     }
     
     log(`Ditemukan ${transferProducts.length} produk ${productType} untuk ${CONFIG.PROVIDER}`);
     
     if (transferProducts.length === 0) {
       log(`Tidak ada produk ${productType} ditemukan untuk ${CONFIG.PROVIDER}`, 'WARNING');
    return;
  }
  
     // Proses setiap produk transfer
  const updateResults = [];
  
     for (const product of transferProducts) {
      log(`\n--- Memproses produk: ${product.name} (${product.code}) ---`);
      
      // Ekstrak denom dari kode produk
      const denomFromCode = extractDenomFromProductCode(product.code);
      
       // Ekstrak denom dari nama produk
      const denomFromName = extractDenomFromProductName(product.name);
      
      log(`Denom dari kode: ${denomFromCode}`);
      log(`Denom dari nama: ${denomFromName}`);
      
      // Gunakan denom dari kode sebagai prioritas
      const denom = denomFromCode || denomFromName;
       
       if (!denom) {
        log(`Tidak dapat mengekstrak denom dari produk ${product.name} (${product.code})`, 'WARNING');
         continue;
       }
      
       // Buat nama produk yang benar
       const correctName = createCorrectProductName(denom, CONFIG.PROVIDER);
      
      log(`Nama produk saat ini: ${product.name}`);
      log(`Nama produk yang benar: ${correctName}`);
      
      // Cek apakah nama sudah benar
      if (product.name === correctName) {
        log(`Nama produk sudah benar, tidak perlu update`);
        continue;
      }
        
      // Cek apakah nama sudah mengandung denom yang benar
      if (product.name.includes(`${denom}.000`)) {
        log(`Nama produk sudah mengandung denom ${denom}.000, tidak perlu update`);
        continue;
      }
      
      // Siapkan data update
      const updateData = {
        id: product.id,
        suppliers_id: product.suppliers_id,
        name: correctName,
        code: product.code,
        base_price: product.base_price,
        status: product.status,
        parameters: product.parameters || '',
        trx_per_day: product.trx_per_day,
        regex_custom_info: product.regex_custom_info || '',
        updated_time: Math.floor(Date.now() / 1000)
      };
      
      // Update produk
      const result = await updateProduct(product.id, updateData);
      
      updateResults.push({
        productId: product.id,
        productCode: product.code,
        oldName: product.name,
        newName: correctName,
        denom: denom,
        success: result.success,
        error: result.error
      });
      
      // Delay untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Tampilkan ringkasan hasil
    log('\n=== RINGKASAN HASIL UPDATE ===');
    const successCount = updateResults.filter(r => r.success).length;
    const errorCount = updateResults.filter(r => !r.success).length;
    
    log(`Total produk diproses: ${updateResults.length}`);
    log(`Berhasil diupdate: ${successCount}`);
    log(`Gagal diupdate: ${errorCount}`);
    
    // Tampilkan detail hasil
    updateResults.forEach(result => {
      if (result.success) {
        log(`✅ ${result.productCode}: "${result.oldName}" → "${result.newName}"`);
      } else {
        log(`❌ ${result.productCode}: ${result.error}`, 'ERROR');
      }
    });
    
    log('=== PROSES UPDATE SELESAI ===');
    
  } catch (error) {
    log(`Error dalam proses update: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Fungsi untuk menampilkan bantuan
function showHelp() {
  console.log(`
=== SCRIPT UPDATE PRODUK SUPPLIER OTOMATIS ===

Cara penggunaan:
1. Edit file ini dan set CONFIG.BEARER_TOKEN dengan token Anda
2. Jalankan: node updateproductsupplierotomatis.js

Konfigurasi:
- SUPPLIER_ID: ${CONFIG.SUPPLIER_ID}
- API_BASE_URL: ${CONFIG.API_BASE_URL}
- DRY_RUN: ${CONFIG.DRY_RUN} (set true untuk test tanpa update)
- LOG_FILE: ${CONFIG.LOG_FILE}

 Fitur:
 - Mengambil data produk dari supplier ID ${CONFIG.SUPPLIER_ID}
 - Mencari produk dengan kode ${CONFIG.PROVIDER === 'INDOSAT' ? 'ITB' : CONFIG.PROVIDER === 'XL' ? 'XTF' : 'TTF'}
 - Mengekstrak denom dari kode produk
 - Mengupdate nama produk menjadi "${CONFIG.PROVIDER} TRANSFER {denom}.000"
 - Logging lengkap ke file dan console
 - Mode dry run untuk testing
 
 Contoh untuk ${CONFIG.PROVIDER}:
 - ${CONFIG.PROVIDER === 'INDOSAT' ? 'ITB5' : CONFIG.PROVIDER === 'XL' ? 'XTF5' : 'TTF5'} → "${CONFIG.PROVIDER} TRANSFER 5.000"
 - ${CONFIG.PROVIDER === 'INDOSAT' ? 'ITB10' : CONFIG.PROVIDER === 'XL' ? 'XTF10' : 'TTF10'} → "${CONFIG.PROVIDER} TRANSFER 10.000"
 - ${CONFIG.PROVIDER === 'INDOSAT' ? 'ITB40' : CONFIG.PROVIDER === 'XL' ? 'XTF40' : 'TTF40'} → "${CONFIG.PROVIDER} TRANSFER 40.000"
`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
      return;
    }
    
  if (args.includes('--dry-run')) {
    CONFIG.DRY_RUN = true;
    log('Mode DRY RUN diaktifkan - tidak akan melakukan update nyata');
  }
  
  try {
    await processUpdates();
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

// Jalankan script jika dipanggil langsung
if (require.main === module) {
  main();
}

module.exports = {
  processUpdates,
  extractDenomFromProductName,
  extractDenomFromProductCode,
  createCorrectProductName
};
