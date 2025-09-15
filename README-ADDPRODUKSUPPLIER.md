# 🎮 Script Tambah Produk Supplier Free Fire

Script Node.js untuk menambahkan produk Free Fire baru ke supplier dengan kode **FFH** secara otomatis.

## 🎯 Konfigurasi

- **Supplier ID**: 33
- **API Endpoint**: `POST /suppliers_products`
- **Kode Produk**: FFH (FFH10, FFH20, FFH100, dll)
- **Format Nama**: `Free Fire {denom} Diamon`

## 🚀 Cara Penggunaan

### 1. Install Dependencies
```bash
npm install axios
```

### 2. Edit Konfigurasi
Buka file `addproduksupplier.js` dan edit bagian CONFIG:

```javascript
const CONFIG = {
  API_BASE_URL: 'https://indotechapi.socx.app/api/v1',
  BEARER_TOKEN: 'YOUR_TOKEN_HERE',  // ← GANTI INI!
  SUPPLIER_ID: 33,
  LOG_FILE: 'addproduksupplier_log.txt',
  DRY_RUN: false
};
```

### 3. Test dengan Dry Run
```bash
node addproduksupplier.js --dry-run
```

### 4. Jalankan Tambah Produk Nyata
```bash
node addproduksupplier.js
```

## 📊 Data Produk yang Akan Ditambahkan

| Kode | Nama | Base Price |
|------|------|------------|
| FFH10 | Free Fire 10 Diamon | 1,546 |
| FFH20 | Free Fire 20 Diamon | 3,092 |
| FFH100 | Free Fire 100 Diamon | 12,364 |
| FFH500 | Free Fire 500 Diamon | 60,273 |
| FFH1000 | Free Fire 1000 Diamon | 119,000 |
| ... | ... | ... |

**Total: 75 produk Free Fire**

## 🔍 Yang Dilakukan Script

1. Mengambil data produk Free Fire dari array `FREE_FIRE_PRODUCTS`
2. Mengirim POST request ke `/suppliers_products` untuk setiap produk
3. Menggunakan payload dengan format yang sesuai
4. Logging lengkap ke file dan console
5. Mode dry run untuk testing
6. Rate limiting untuk menghindari error API

## 📄 Payload yang Dikirim

```json
{
  "name": "Free Fire 10 Diamon",
  "code": "FFH10",
  "parameters": "",
  "base_price": 1546,
  "trx_per_day": 100,
  "suppliers_id": 33,
  "regex_custom_info": ""
}
```

## 📄 Output yang Dihasilkan

### **Console Output:**
```
[2024-01-15T10:30:00.000Z] [INFO] === MULAI PROSES TAMBAH PRODUK SUPPLIER FREE FIRE ===
[2024-01-15T10:30:00.000Z] [INFO] Supplier ID: 33
[2024-01-15T10:30:00.000Z] [INFO] Total produk yang akan ditambahkan: 75
[2024-01-15T10:30:00.000Z] [INFO] Dry Run: false

--- Memproses produk 1/75: Free Fire 10 Diamon (FFH10) ---
[2024-01-15T10:30:01.000Z] [INFO] Adding product: Free Fire 10 Diamon (FFH10) with price: 1546
[2024-01-15T10:30:01.000Z] [INFO] Successfully added product: Free Fire 10 Diamon (FFH10) - ID: 12345
[2024-01-15T10:30:01.000Z] [INFO] ✅ Berhasil: Free Fire 10 Diamon (FFH10) - Price: 1546

=== RINGKASAN HASIL ===
[2024-01-15T10:35:00.000Z] [INFO] Total produk diproses: 75
[2024-01-15T10:35:00.000Z] [INFO] Berhasil ditambahkan: 75
[2024-01-15T10:35:00.000Z] [INFO] Gagal ditambahkan: 0
```

### **Log File:**
Semua output juga disimpan di `addproduksupplier_log.txt` untuk referensi.

## ⚙️ Konfigurasi Lanjutan

### **API Endpoints yang Digunakan:**
- **Add Product**: `POST /suppliers_products`

### **Rate Limiting:**
- Delay 200ms antara setiap request untuk menghindari rate limiting
- Bisa disesuaikan di fungsi `setTimeout(resolve, 200)`

### **Error Handling:**
- Logging error detail termasuk response status dan data
- Continue processing meskipun ada error pada produk tertentu
- Summary hasil di akhir proses

## ⚠️ PENTING

- **Selalu test dengan dry run** terlebih dahulu
- **Jangan commit bearer token** ke repository
- **Backup data** sebelum menambahkan produk
- **Pastikan supplier ID 33** sudah ada dan aktif

## 🆘 Troubleshooting

### Error "Bearer token tidak ditemukan"
- Edit file `addproduksupplier.js`
- Ganti `BEARER_TOKEN: ''` dengan token Anda

### Error "Supplier tidak ditemukan"
- Periksa apakah supplier ID 33 ada dan aktif
- Pastikan koneksi internet stabil

### Error "Rate limiting"
- Script sudah menggunakan delay 200ms
- Jika masih error, tambahkan delay lebih lama

### Error "Produk sudah ada"
- Periksa apakah produk dengan kode yang sama sudah ada
- Script akan menampilkan error detail untuk produk yang gagal

## 📈 Monitoring

- **Log File**: `addproduksupplier_log.txt`
- **Format**: `[timestamp] [level] message`
- **Level**: INFO, ERROR

## 🎉 Kesimpulan

Script ini memudahkan proses penambahan produk Free Fire ke supplier secara otomatis. Dengan fitur dry run, logging lengkap, dan error handling yang baik, script ini aman dan mudah digunakan.

**Selalu test dengan dry run terlebih dahulu sebelum menjalankan penambahan produk nyata!**
