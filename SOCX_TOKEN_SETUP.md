# 📋 Panduan Penggunaan Token Socx

## 🎯 Tujuan
Dokumen ini menjelaskan cara mengatur dan menggunakan token API Socx untuk integrasi dengan aplikasi.

## 🔍 Perbedaan Token

Ada **2 jenis token** yang berbeda dalam sistem ini:

1. **Token Auth Sistem** - Dari backend (http://localhost:3000)
   - Digunakan untuk login ke dashboard frontend
   - Disimpan di tabel `users` dan `blacklisted_tokens`
   - Diperoleh saat login di halaman `/login`

2. **Token Socx API** - Dari API Socx (socxapi.socx.app)
   - Digunakan untuk request ke endpoint Socx
   - Disimpan di tabel `socx_tokens` di database
   - Dapatkan dari admin sistem Socx

## 📦 Cara Menyimpan Token Socx

### Cara 1: Via Dashboard Web (REKOMENDASI)

1. Login ke aplikasi web di http://localhost:9899
2. Klik pada menu user di pojok kanan atas
3. Pilih **"Socx Token"**
4. Masukkan token Socx Anda di kolom yang tersedia
5. Masukkan Supplier ID (default: 33)
6. Klik **"Simpan Token"**

### Cara 2: Via Environment Variable (Untuk Script Node.js)

Buat file `.env` di root frontend:

```bash
SOCX_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NTgwNDY2NjAsImlkIjozLCJuYW1lIjoic2FoYW5kcmlhbjlAZ21haWwuY29tIiwib3RwIjoiMSIsInJvbGUiOiJhZG1pbmlzdHJhdG9yIiwidHlwZSI6bnVsbH0.CdWwYqXWc9YfdCAPxCvzI1y7RFQLcGQ74G8k1tuX3yE
SOCX_SUPPLIER_ID=33
```

Kemudian jalankan script:

```bash
# Windows PowerShell
$env:SOCX_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
node addproduksupplier.js

# Linux/Mac
SOCX_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." node addproduksupplier.js
```

### Cara 3: Via .env File (Untuk Production)

Buat file `.env` di root frontend:

```bash
# frontend/.env
SOCX_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SOCX_SUPPLIER_ID=33
```

Install dotenv jika belum ada:

```bash
cd frontend
npm install dotenv
```

Update script untuk menggunakan dotenv:

```javascript
// Di paling atas script
require('dotenv').config();

const CONFIG = {
  API_BASE_URL: 'https://socxapi.socx.app/api/v1',
  BEARER_TOKEN: process.env.SOCX_API_TOKEN,
  SUPPLIER_ID: parseInt(process.env.SOCX_SUPPLIER_ID) || 33,
  // ...
};
```

## 🗄️ Struktur Database

### Tabel `socx_tokens`

```sql
CREATE TABLE socx_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  api_token TEXT NOT NULL,
  supplier_id INT NOT NULL DEFAULT 33,
  is_active TINYINT(1) DEFAULT 1,
  expires_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔌 API Endpoints

Semua endpoint memerlukan token auth dari sistem (Bearer Token di header):

### 1. Simpan Token Socx
```http
POST /api/socx/token
Authorization: Bearer <SISTEM_AUTH_TOKEN>
Content-Type: application/json

{
  "apiToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "supplierId": 33
}
```

### 2. Get Token Aktif
```http
GET /api/socx/token
Authorization: Bearer <SISTEM_AUTH_TOKEN>
```

Response:
```json
{
  "success": true,
  "data": {
    "hasToken": true,
    "token": {
      "supplierId": 33,
      "isActive": true,
      "expiresAt": "2026-02-01T12:00:00Z",
      "isValid": true,
      "isExpiringSoon": false,
      "createdAt": "2026-01-28T10:00:00Z",
      "updatedAt": "2026-01-28T10:00:00Z"
    }
  }
}
```

### 3. Deaktifkan Token
```http
POST /api/socx/token/deactivate
Authorization: Bearer <SISTEM_AUTH_TOKEN>
```

### 4. Hapus Token
```http
DELETE /api/socx/token
Authorization: Bearer <SISTEM_AUTH_TOKEN>
```

### 5. History Token
```http
GET /api/socx/token/history
Authorization: Bearer <SISTEM_AUTH_TOKEN>
```

## 📝 Cara Menggunakan Script dengan Token

### Script addproduksupplier.js

1. **Set token via environment variable**:
   ```bash
   # Windows PowerShell
   $env:SOCX_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   node frontend/addproduksupplier.js

   # Linux/Mac
   SOCX_API_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." node frontend/addproduksupplier.js
   ```

2. **Atau buat .env file**:
   ```bash
   # frontend/.env
   SOCX_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Jalankan script**:
   ```bash
   node frontend/addproduksupplier.js --dry-run  # Test mode
   node frontend/addproduksupplier.js           # Production mode
   ```

## 🔒 Keamanan Token

### ⚠️ Penting:

1. **Jangan share token Socx** ke siapapun
2. **Token biasanya valid 7-30 hari**, perlu di-refresh secara berkala
3. **Token disimpan terenkripsi** di database
4. **Hanya user yang login** yang bisa mengakses token mereka sendiri
5. **API tidak mengembalikan token lengkap** untuk alasan keamanan

### Best Practices:

- ✅ Simpan token di environment variable untuk production
- ✅ Gunakan .env file dan tambahkan ke .gitignore
- ✅ Refresh token sebelum expired
- ✅ Monitor status token di dashboard
- ❌ Jangan commit token ke git
- ❌ Jangan share token di chat/email
- ❌ Jangan hardcode token di source code

## 🛠️ Troubleshooting

### Error: "Token tidak ditemukan"

**Solusi**:
1. Pastikan environment variable `SOCX_API_TOKEN` sudah di-set
2. Atau simpan token via dashboard web
3. Cek apakah token sudah expired

### Error: "Backend token tidak valid"

**Solusi**:
1. Logout dan login kembali di aplikasi web
2. Pastikan token auth sistem masih valid

### Error: "Token sudah kedaluwarsa"

**Solusi**:
1. Request token baru dari admin Socx
2. Simpan token baru via dashboard web
3. Update environment variable jika menggunakan .env

### CORS Error di Frontend

**Solusi**:
1. Pastikan backend server berjalan di port 3000
2. Cek konfigurasi CORS di `backend/src/middlewares/security.js`
3. Pastikan origin `http://localhost:9899` sudah di-whitelist

## 📞 Bantuan

Jika mengalami masalah:
1. Cek log file: `frontend/addproduksupplier_log.txt`
2. Cek backend logs di `backend/logs/`
3. Gunakan mode `--dry-run` untuk testing
4. Hubungi admin untuk mendapatkan token Socx yang baru

## 📚 Struktur Project

```
Socx-Otomatic-Update/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   └── SocxToken.js              # Model untuk token Socx
│   │   ├── controllers/
│   │   │   └── socxTokenController.js     # Controller API
│   │   ├── routes/
│   │   │   └── socx.js                  # Routes API
│   │   └── migrations/
│   │       └── create_socx_tokens_table.sql
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   └── SocxTokenManager.js       # Halaman UI manajemen token
│   │   └── components/
│   │       └── Header.js                 # Menu navigasi
│   ├── addproduksupplier.js              # Script untuk tambah produk
│   └── .env                              # Environment variables (buat file ini)
└── SOCX_TOKEN_SETUP.md                # Dokumentasi ini
```

## ✅ Checklist Setup

- [ ] Database sudah di-setup dengan migration
- [ ] Backend server berjalan di port 3000
- [ ] Frontend server berjalan di port 9899
- [ ] User bisa login ke dashboard
- [ ] Token Socx sudah disimpan via dashboard
- [ ] Script addproduksupplier.js bisa berjalan
- [ ] CORS sudah terkonfigurasi dengan benar

## 🎉 Selesai!

Sekarang Anda sudah bisa menggunakan token Socx untuk integrasi dengan API Socx melalui dashboard web atau script Node.js.