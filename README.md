# 🚀 Script Update Produk SOCX Otomatis

Koleksi script Node.js untuk mengupdate produk **INDOSAT TRANSFER** dan **Free Fire** secara otomatis.

## 📁 Script yang Tersedia

### 1. 📱 **INDOSAT Transfer** (`updateproductsupplierotomatis.js`)
- **Supplier ID**: 36
- **Provider**: INDOSAT
- **Kode Produk**: ITB (ITB5, ITB10, ITB40, dll)
- **Format Nama**: `INDOSAT TRANSFER {denom}.000`

### 2. 🎮 **Free Fire** (React UI)
- **Category ID**: 8 (Game category)
- **Provider ID**: 8 (Free Fire provider)
- **Kode Produk**: GMFF (GMFF5, GMFF10, GMFF20, dll) dan FFP (FFP5, FFP10, dll)
- **Formula**: Harga berdasarkan rate supplier dan harga jual

### 3. 🎮 **Tambah Produk Free Fire** (`addproduksupplier.js`)
- **Supplier ID**: 33
- **Kode Produk**: FFH (FFH10, FFH20, FFH100, dll)
- **Format Nama**: `Free Fire {denom} Diamon`
- **Total Produk**: 75 produk Free Fire

## 🚀 Cara Penggunaan

### 1. Install Dependencies
```bash
npm install
```

### 2. Edit Konfigurasi
Edit file script yang ingin digunakan:

**Untuk INDOSAT Transfer:**
```javascript
// updateproductsupplierotomatis.js
const CONFIG = {
  SUPPLIER_ID: 36,
  BEARER_TOKEN: 'YOUR_TOKEN_HERE',  // ← GANTI INI!
  PROVIDER: 'INDOSAT'
};
```

### 3. Jalankan Aplikasi React
```bash
npm start
```

### 4. Menggunakan Script Node.js

**INDOSAT Transfer:**
```bash
# Test dengan dry run
node updateproductsupplierotomatis.js --dry-run

# Jalankan update nyata
node updateproductsupplierotomatis.js
```

**Tambah Produk Free Fire:**
```bash
# Test dengan dry run
node addproduksupplier.js --dry-run

# Jalankan tambah produk nyata
node addproduksupplier.js
```

## 📊 Contoh Update

### **INDOSAT Transfer:**
| Kode Produk | Nama Lama | Nama Baru |
|-------------|-----------|-----------|
| ITB5 | INDOSAT TRANSFER (ITB5) | INDOSAT TRANSFER 5.000 |
| ITB10 | INDOSAT TRANSFER (ITB10) | INDOSAT TRANSFER 10.000 |
| ITB40 | INDOSAT TRANSFER (ITB40) | INDOSAT TRANSFER 40.000 |

### **Free Fire:**
| Kode Produk | Denom | Rate Supplier | Harga Jual | Margin |
|-------------|-------|---------------|------------|--------|
| GMFF5 | 5 | 85000 | 84500 | -2.5 |
| GMFF10 | 10 | 85000 | 84500 | -5 |
| GMFF20 | 20 | 85000 | 84500 | -10 |

### **Tambah Produk Free Fire:**
| Kode Produk | Nama | Base Price |
|-------------|------|------------|
| FFH10 | Free Fire 10 Diamon | 1,546 |
| FFH100 | Free Fire 100 Diamon | 12,364 |
| FFH1000 | Free Fire 1000 Diamon | 119,000 |

## 🔍 Yang Dilakukan Script

### **INDOSAT Transfer (Node.js):**
1. Mengambil data produk dari supplier ID 36
2. Filter produk ITB (kode yang mengandung "ITB")
3. Ekstrak denom dari kode produk (ITB5 → 5, ITB40 → 40)
4. Update nama produk menjadi format standar
5. Logging lengkap ke file dan console

### **Free Fire (React UI):**
1. Mengambil data produk Free Fire dari category 8 dan provider 8
2. Filter produk GMFF dan FFP
3. Ekstrak denom dari kode produk (GMFF5 → 5, GMFF10 → 10)
4. Hitung harga berdasarkan rate supplier dan harga jual
5. Update harga produk, markup, dan supplier status
6. Tampilan real-time dengan preview kalkulasi

### **Tambah Produk Free Fire (Node.js):**
1. Mengambil data produk Free Fire dari array `FREE_FIRE_PRODUCTS`
2. Mengirim POST request ke `/suppliers_products` untuk setiap produk
3. Menggunakan payload dengan format yang sesuai
4. Logging lengkap ke file dan console
5. Mode dry run untuk testing
6. Rate limiting untuk menghindari error API

## ⚠️ PENTING

- **Untuk Script Node.js: Selalu test dengan dry run** terlebih dahulu
- **Jangan commit bearer token** ke repository
- **Backup data** sebelum update
- **Untuk Free Fire: Gunakan preview kalkulasi** untuk melihat hasil sebelum update

## 🆘 Troubleshooting

### Error "Bearer token tidak ditemukan"
- Edit file script yang digunakan (`updateproductsupplierotomatis.js` atau `addproduksupplier.js`)
- Ganti `BEARER_TOKEN: ''` dengan token Anda

### Error "Tidak ada produk ITB ditemukan"
- Periksa apakah supplier ID 36 memiliki produk ITB
- Pastikan koneksi internet stabil

### Error "Tidak dapat mengekstrak denom"
- Periksa format kode produk harus: ITB5, ITB10, ITB40, dll

### Error di React UI
- Pastikan Bearer Token sudah diatur di header
- Periksa koneksi internet
- Refresh halaman jika ada error

## 📄 Log

### **INDOSAT Transfer:**
Semua aktivitas disimpan di `update_log.txt` untuk referensi.

### **Tambah Produk Free Fire:**
Semua aktivitas disimpan di `addproduksupplier_log.txt` untuk referensi.

### **Free Fire:**
Hasil update ditampilkan langsung di UI dengan detail lengkap.