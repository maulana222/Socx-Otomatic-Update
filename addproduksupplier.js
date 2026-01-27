const axios = require('axios');
const fs = require('fs');

// Konfigurasi Backend API
const BACKEND_API_BASE_URL = 'http://localhost:3000/api';

// Variabel untuk menyimpan token (akan diambil dari backend)
let CONFIG = {
  API_BASE_URL: 'https://socxapi.socx.app/api/v1',
  BEARER_TOKEN: null,
  SUPPLIER_ID: 33,
  LOG_FILE: 'addproduksupplier_log.txt',
  DRY_RUN: false
};

// Fungsi untuk load token
async function loadToken() {
  // Prioritas: 1. Environment variable
  if (process.env.SOCX_API_TOKEN) {
    CONFIG.BEARER_TOKEN = process.env.SOCX_API_TOKEN;
    console.log('✅ Menggunakan token dari environment variable');
    return;
  }
  
  throw new Error('Token tidak ditemukan. Silakan set SOCX_API_TOKEN environment variable');
}

// Fungsi untuk log ke file dan console

// Data produk Free Fire yang akan ditambahkan
const FREE_FIRE_PRODUCTS = [
  { code: 'FFH10', name: 'Free Fire 10 Diamon', base_price: 1546 },
  { code: 'FFH15', name: 'Free Fire 15 Diamon', base_price: 2319 },
  { code: 'FFH20', name: 'Free Fire 20 Diamon', base_price: 3092 },
  { code: 'FFH25', name: 'Free Fire 25 Diamon', base_price: 3865 },
  { code: 'FFH30', name: 'Free Fire 30 Diamon', base_price: 4638 },
  { code: 'FFH35', name: 'Free Fire 35 Diamon', base_price: 5411 },
  { code: 'FFH40', name: 'Free Fire 40 Diamon', base_price: 6184 },
  { code: 'FFH50', name: 'Free Fire 50 Diamon', base_price: 6182 },
  { code: 'FFH55', name: 'Free Fire 55 Diamon', base_price: 6955 },
  { code: 'FFH60', name: 'Free Fire 60 Diamon', base_price: 7728 },
  { code: 'FFH70', name: 'Free Fire 70 Diamon', base_price: 8500 },
  { code: 'FFH75', name: 'Free Fire 75 Diamon', base_price: 9273 },
  { code: 'FFH80', name: 'Free Fire 80 Diamon', base_price: 10046 },
  { code: 'FFH90', name: 'Free Fire 90 Diamon', base_price: 11592 },
  { code: 'FFH95', name: 'Free Fire 95 Diamon', base_price: 12365 },
  { code: 'FFH100', name: 'Free Fire 100 Diamon', base_price: 12364 },
  { code: 'FFH110', name: 'Free Fire 110 Diamon', base_price: 13910 },
  { code: 'FFH120', name: 'Free Fire 120 Diamon', base_price: 14682 },
  { code: 'FFH125', name: 'Free Fire 125 Diamon', base_price: 15455 },
  { code: 'FFH130', name: 'Free Fire 130 Diamon', base_price: 16228 },
  { code: 'FFH140', name: 'Free Fire 140 Diamon', base_price: 17000 },
  { code: 'FFH145', name: 'Free Fire 145 Diamon', base_price: 17773 },
  { code: 'FFH150', name: 'Free Fire 150 Diamon', base_price: 18546 },
  { code: 'FFH160', name: 'Free Fire 160 Diamon', base_price: 20092 },
  { code: 'FFH165', name: 'Free Fire 165 Diamon', base_price: 20865 },
  { code: 'FFH170', name: 'Free Fire 170 Diamon', base_price: 20864 },
  { code: 'FFH175', name: 'Free Fire 175 Diamon', base_price: 21637 },
  { code: 'FFH180', name: 'Free Fire 180 Diamon', base_price: 22410 },
  { code: 'FFH185', name: 'Free Fire 185 Diamon', base_price: 23183 },
  { code: 'FFH190', name: 'Free Fire 190 Diamon', base_price: 23182 },
  { code: 'FFH200', name: 'Free Fire 200 Diamon', base_price: 24728 },
  { code: 'FFH210', name: 'Free Fire 210 Diamon', base_price: 25500 },
  { code: 'FFH215', name: 'Free Fire 215 Diamon', base_price: 26273 },
  { code: 'FFH220', name: 'Free Fire 220 Diamon', base_price: 27046 },
  { code: 'FFH230', name: 'Free Fire 230 Diamon', base_price: 28592 },
  { code: 'FFH235', name: 'Free Fire 235 Diamon', base_price: 29365 },
  { code: 'FFH240', name: 'Free Fire 240 Diamon', base_price: 29364 },
  { code: 'FFH250', name: 'Free Fire 250 Diamon', base_price: 30910 },
  { code: 'FFH265', name: 'Free Fire 265 Diamon', base_price: 32455 },
  { code: 'FFH280', name: 'Free Fire 280 Diamon', base_price: 34000 },
  { code: 'FFH290', name: 'Free Fire 290 Diamon', base_price: 35546 },
  { code: 'FFH300', name: 'Free Fire 300 Diamon', base_price: 37092 },
  { code: 'FFH330', name: 'Free Fire 330 Diamon', base_price: 40182 },
  { code: 'FFH350', name: 'Free Fire 350 Diamon', base_price: 42500 },
  { code: 'FFH355', name: 'Free Fire 355 Diamon', base_price: 42500 },
  { code: 'FFH360', name: 'Free Fire 360 Diamon', base_price: 43273 },
  { code: 'FFH365', name: 'Free Fire 365 Diamon', base_price: 44046 },
  { code: 'FFH370', name: 'Free Fire 370 Diamon', base_price: 44819 },
  { code: 'FFH375', name: 'Free Fire 375 Diamon', base_price: 45592 },
  { code: 'FFH380', name: 'Free Fire 380 Diamon', base_price: 46365 },
  { code: 'FFH400', name: 'Free Fire 400 Diamon', base_price: 48682 },
  { code: 'FFH405', name: 'Free Fire 405 Diamon', base_price: 48682 },
  { code: 'FFH415', name: 'Free Fire 415 Diamon', base_price: 50228 },
  { code: 'FFH420', name: 'Free Fire 420 Diamon', base_price: 51001 },
  { code: 'FFH425', name: 'Free Fire 425 Diamon', base_price: 51000 },
  { code: 'FFH430', name: 'Free Fire 430 Diamon', base_price: 51773 },
  { code: 'FFH440', name: 'Free Fire 440 Diamon', base_price: 53319 },
  { code: 'FFH455', name: 'Free Fire 455 Diamon', base_price: 54864 },
  { code: 'FFH465', name: 'Free Fire 465 Diamon', base_price: 56410 },
  { code: 'FFH475', name: 'Free Fire 475 Diamon', base_price: 57182 },
  { code: 'FFH480', name: 'Free Fire 480 Diamon', base_price: 57955 },
  { code: 'FFH495', name: 'Free Fire 495 Diamon', base_price: 59500 },
  { code: 'FFH500', name: 'Free Fire 500 Diamon', base_price: 60273 },
  { code: 'FFH505', name: 'Free Fire 505 Diamon', base_price: 61046 },
  { code: 'FFH510', name: 'Free Fire 510 Diamon', base_price: 61819 },
  { code: 'FFH515', name: 'Free Fire 515 Diamon', base_price: 62592 },
  { code: 'FFH520', name: 'Free Fire 520 Diamon', base_price: 63365 },
  { code: 'FFH545', name: 'Free Fire 545 Diamon', base_price: 65682 },
  { code: 'FFH565', name: 'Free Fire 565 Diamon', base_price: 68000 },
  { code: 'FFH600', name: 'Free Fire 600 Diamon', base_price: 72637 },
  { code: 'FFH635', name: 'Free Fire 635 Diamon', base_price: 76500 },
  { code: 'FFH645', name: 'Free Fire 645 Diamon', base_price: 78046 },
  { code: 'FFH655', name: 'Free Fire 655 Diamon', base_price: 79592 },
  { code: 'FFH700', name: 'Free Fire 700 Diamon', base_price: 85001 },
  { code: 'FFH710', name: 'Free Fire 710 Diamon', base_price: 85773 },
  { code: 'FFH720', name: 'Free Fire 720 Diamon', base_price: 85000 },
  { code: 'FFH725', name: 'Free Fire 725 Diamon', base_price: 85773 },
  { code: 'FFH740', name: 'Free Fire 740 Diamon', base_price: 88092 },
  { code: 'FFH770', name: 'Free Fire 770 Diamon', base_price: 91182 },
  { code: 'FFH790', name: 'Free Fire 790 Diamon', base_price: 93500 },
  { code: 'FFH800', name: 'Free Fire 800 Diamon', base_price: 95046 },
  { code: 'FFH860', name: 'Free Fire 860 Diamon', base_price: 102000 },
  { code: 'FFH925', name: 'Free Fire 925 Diamon', base_price: 110501 },
  { code: 'FFH930', name: 'Free Fire 930 Diamon', base_price: 110500 },
  { code: 'FFH1000', name: 'Free Fire 1000 Diamon', base_price: 119000 }
];

// Fungsi untuk log ke file dan console
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  
  console.log(logMessage);
  
  // Tulis ke file log
  fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
}

// Fungsi untuk menambahkan produk supplier
async function addSupplierProduct(productData) {
  try {
    if (CONFIG.DRY_RUN) {
      log(`[DRY RUN] Would add product: ${productData.name} (${productData.code}) with price: ${productData.base_price}`);
      return { success: true, dryRun: true, data: productData };
    }

    log(`Adding product: ${productData.name} (${productData.code}) with price: ${productData.base_price}`);
    
    const response = await axios.post(
      `${CONFIG.API_BASE_URL}/suppliers_products`,
      {
        name: productData.name,
        code: productData.code,
        parameters: "",
        base_price: productData.base_price,
        trx_per_day: 100,
        suppliers_id: CONFIG.SUPPLIER_ID,
        regex_custom_info: ""
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    log(`Successfully added product: ${productData.name} (${productData.code}) - ID: ${response.data.id || 'N/A'}`);
    return { success: true, response: response.data, data: productData };
  } catch (error) {
    log(`Error adding product ${productData.name} (${productData.code}): ${error.message}`, 'ERROR');
    if (error.response) {
      log(`Response status: ${error.response.status}`, 'ERROR');
      log(`Response data: ${JSON.stringify(error.response.data)}`, 'ERROR');
    }
    return { success: false, error: error.message, data: productData };
  }
}

// Fungsi untuk memproses semua produk
async function processAllProducts() {
  try {
    // Validasi konfigurasi
    if (!CONFIG.BEARER_TOKEN) {
      log('Bearer token tidak ditemukan. Silakan set CONFIG.BEARER_TOKEN', 'ERROR');
      return;
    }
    
    log('=== MULAI PROSES TAMBAH PRODUK SUPPLIER FREE FIRE ===');
    log(`Supplier ID: ${CONFIG.SUPPLIER_ID}`);
    log(`Total produk yang akan ditambahkan: ${FREE_FIRE_PRODUCTS.length}`);
    log(`Dry Run: ${CONFIG.DRY_RUN}`);
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Proses setiap produk
    for (let i = 0; i < FREE_FIRE_PRODUCTS.length; i++) {
      const product = FREE_FIRE_PRODUCTS[i];
      log(`\n--- Memproses produk ${i + 1}/${FREE_FIRE_PRODUCTS.length}: ${product.name} (${product.code}) ---`);
      
      const result = await addSupplierProduct(product);
      results.push(result);
      
      if (result.success) {
        successCount++;
        log(`✅ Berhasil: ${product.name} (${product.code}) - Price: ${product.base_price}`);
      } else {
        errorCount++;
        log(`❌ Gagal: ${product.name} (${product.code}) - Error: ${result.error}`, 'ERROR');
      }
      
      // Delay untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Tampilkan ringkasan hasil
    log('\n=== RINGKASAN HASIL ===');
    log(`Total produk diproses: ${results.length}`);
    log(`Berhasil ditambahkan: ${successCount}`);
    log(`Gagal ditambahkan: ${errorCount}`);
    
    // Tampilkan detail hasil
    log('\n=== DETAIL HASIL ===');
    results.forEach((result, index) => {
      if (result.success) {
        if (result.dryRun) {
          log(`✅ [DRY RUN] ${result.data.name} (${result.data.code}) - Price: ${result.data.base_price}`);
        } else {
          log(`✅ ${result.data.name} (${result.data.code}) - Price: ${result.data.base_price} - ID: ${result.response.id || 'N/A'}`);
        }
      } else {
        log(`❌ ${result.data.name} (${result.data.code}) - Error: ${result.error}`, 'ERROR');
      }
    });
    
    log('=== PROSES TAMBAH PRODUK SUPPLIER SELESAI ===');
    
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'ERROR');
    throw error;
  }
}

// Fungsi untuk menampilkan bantuan
function showHelp() {
  console.log(`
=== SCRIPT TAMBAH PRODUK SUPPLIER FREE FIRE ===

Cara penggunaan:
1. Edit file ini dan set CONFIG.BEARER_TOKEN dengan token Anda
2. Jalankan: node addproduksupplier.js

Konfigurasi:
- SUPPLIER_ID: ${CONFIG.SUPPLIER_ID}
- API_BASE_URL: ${CONFIG.API_BASE_URL}
- DRY_RUN: ${CONFIG.DRY_RUN} (set true untuk test tanpa tambah produk)
- LOG_FILE: ${CONFIG.LOG_FILE}

Fitur:
- Menambahkan ${FREE_FIRE_PRODUCTS.length} produk Free Fire ke supplier ${CONFIG.SUPPLIER_ID}
- Menggunakan endpoint POST /suppliers_products
- Logging lengkap ke file dan console
- Mode dry run untuk testing
- Rate limiting untuk menghindari error API

Contoh produk yang akan ditambahkan:
- FFH10 = Free Fire 10 Diamon (Price: 1546)
- FFH20 = Free Fire 20 Diamon (Price: 3092)
- FFH100 = Free Fire 100 Diamon (Price: 12364)
- ... dan seterusnya

Options:
--dry-run    Test mode tanpa menambahkan produk nyata
--help       Tampilkan bantuan ini
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
    log('Mode DRY RUN diaktifkan - tidak akan menambahkan produk nyata');
  }

  // Load token sebelum memproses
  try {
    await loadToken();
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error('\n⚠️  Cara menggunakan script:');
    console.error('   1. Set environment variable SOCX_API_TOKEN dengan token Socx Anda');
    console.error('   2. Atau set token via halaman Socx Token di aplikasi web');
    console.error('   3. Gunakan parameter --help untuk informasi lebih lanjut\n');
    process.exit(1);
  }
  
  try {
    await processAllProducts();
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
  processAllProducts,
  addSupplierProduct,
  FREE_FIRE_PRODUCTS
};
