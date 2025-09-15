# 📱 Script Update Produk INDOSAT Transfer

Script ini dikonfigurasi khusus untuk mengupdate nama produk **INDOSAT TRANSFER** dengan kode **ITB**.

## 🎯 Konfigurasi Saat Ini

- **Supplier ID**: 36
- **Provider**: INDOSAT
- **Kode Produk**: ITB (ITB5, ITB10, ITB40, dll)
- **Format Nama**: `INDOSAT TRANSFER {denom}.000`

## 🚀 Cara Penggunaan

### **Metode 1: Otomatis (Windows)**
```bash
# Double-click run-indosat.bat
# Script akan otomatis menjalankan menu untuk INDOSAT
```

### **Metode 2: Manual**
```bash
# 1. Test dengan dry run
node updateproductsupplierotomatis.js --dry-run

# 2. Jalankan update nyata
node updateproductsupplierotomatis.js
```

### **Metode 3: Linux/Mac**
```bash
# 1. Berikan permission
chmod +x run-indosat.sh

# 2. Jalankan script
./run-indosat.sh
```

## 📊 Contoh Update

| Kode Produk | Nama Lama | Nama Baru |
|-------------|-----------|-----------|
| ITB5 | INDOSAT TRANSFER (ITB5) | INDOSAT TRANSFER 5.000 |
| ITB10 | INDOSAT TRANSFER (ITB10) | INDOSAT TRANSFER 10.000 |
| ITB40 | INDOSAT TRANSFER (ITB40) | INDOSAT TRANSFER 40.000 |
| ITB100 | INDOSAT TRANSFER (ITB100) | INDOSAT TRANSFER 100.000 |

## 🔍 Yang Akan Dilakukan Script

1. **Ambil data produk** dari supplier ID 36
2. **Filter produk ITB** (kode yang mengandung "ITB")
3. **Ekstrak denom** dari kode produk (ITB5 → 5, ITB40 → 40)
4. **Update nama produk** menjadi format standar
5. **Logging lengkap** ke file dan console

## 📋 Output yang Dihasilkan

### **Console Output:**
```
[2024-01-15T10:30:00.000Z] [INFO] === MULAI PROSES UPDATE PRODUK SUPPLIER ===
[2024-01-15T10:30:00.000Z] [INFO] Supplier ID: 36
[2024-01-15T10:30:00.000Z] [INFO] Provider: INDOSAT
[2024-01-15T10:30:01.000Z] [INFO] Ditemukan 25 produk ITB untuk INDOSAT

--- Memproses produk: INDOSAT TRANSFER (ITB5) (ITB5) ---
[2024-01-15T10:30:01.000Z] [INFO] Denom dari kode: 5
[2024-01-15T10:30:01.000Z] [INFO] Nama produk saat ini: INDOSAT TRANSFER (ITB5)
[2024-01-15T10:30:01.000Z] [INFO] Nama produk yang benar: INDOSAT TRANSFER 5.000
[2024-01-15T10:30:02.000Z] [INFO] Successfully updated product 7782

=== RINGKASAN HASIL UPDATE ===
[2024-01-15T10:30:05.000Z] [INFO] Total produk diproses: 25
[2024-01-15T10:30:05.000Z] [INFO] Berhasil diupdate: 23
[2024-01-15T10:30:05.000Z] [INFO] Gagal diupdate: 2
[2024-01-15T10:30:05.000Z] [INFO] ✅ ITB5: "INDOSAT TRANSFER (ITB5)" → "INDOSAT TRANSFER 5.000"
```

### **Log File:**
Semua output juga disimpan di `update_log.txt` untuk referensi.

## ⚙️ Konfigurasi

Script sudah dikonfigurasi untuk INDOSAT:

```javascript
const CONFIG = {
  SUPPLIER_ID: 36,                    // Supplier ID untuk INDOSAT
  API_BASE_URL: 'https://indotechapi.socx.app/api/v1',
  BEARER_TOKEN: 'YOUR_TOKEN_HERE',    // Token API Anda
  DRY_RUN: false,                     // Set true untuk test
  LOG_FILE: 'update_log.txt',
  PROVIDER: 'INDOSAT'                 // Provider yang akan diupdate
};
```

## 🔒 Keamanan

- ⚠️ **Jangan commit bearer token** ke repository
- 🧪 **Selalu test dengan dry run** terlebih dahulu
- 💾 **Backup data** sebelum update
- 🔐 **Gunakan environment variables** untuk production

## 🆘 Troubleshooting

### Error "Bearer token tidak ditemukan"
- Edit file `updateproductsupplierotomatis.js`
- Ganti `BEARER_TOKEN: ''` dengan token Anda

### Error "Tidak ada produk ITB ditemukan"
- Periksa apakah supplier ID 36 memiliki produk ITB
- Pastikan koneksi internet stabil

### Error "Tidak dapat mengekstrak denom"
- Periksa format kode produk harus: ITB5, ITB10, ITB40, dll
- Pastikan kode produk tidak mengandung karakter khusus

## 📈 Monitoring

- **Log File**: `update_log.txt`
- **Format**: `[timestamp] [level] message`
- **Level**: INFO, WARNING, ERROR

## 🎉 Kesimpulan

Script ini siap digunakan untuk mengupdate nama produk INDOSAT TRANSFER. Dengan fitur dry run, logging lengkap, dan error handling yang baik, script ini aman dan mudah digunakan.

**Selalu test dengan dry run terlebih dahulu sebelum menjalankan update nyata!**
