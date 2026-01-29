# Frontend Troubleshooting Guide

## 🔴 Problem: Masih Menggunakan localhost:3000 di Production

### Root Cause Analysis

Jika frontend masih request ke `http://localhost:3000/api` meskipun sudah mengubah `.env`, penyebabnya adalah:

1. **Hardcoded URL di code** (SUDAH DIPERBAIKI ✅)
2. **Build dengan environment yang salah** (Masalah umum!)
3. **Environment variables tidak terbaca saat build**

---

## ✅ Perbaikan yang Sudah Dilakukan

### 1. Hapus Fallback localhost di api.js ✅

**SEBELUM:**
```javascript
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000/api';
```

**SETELAH:**
```javascript
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Validate that API URL is set
if (!API_BASE_URL) {
  throw new Error(
    'REACT_APP_BACKEND_URL is not set! Please check your .env or .env.production file.\n' +
    'Development: Check frontend/.env\n' +
    'Production: Check frontend/.env.production'
  );
}
```

### 2. Fix Login.js hardcoded localhost ✅

**SEBELUM:**
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
```

**SETELAH:**
```javascript
import apiClient from '../utils/api';

const data = await apiClient.login({
  username: formData.username,
  password: formData.password
});
```

---

## 🚀 Cara Deploy dengan Benar

### Step 1: Push Code (TANPA build/)

```bash
# Di local PC
cd frontend
git add .
git commit -m "Fix: Remove hardcoded localhost, use .env only"
git push origin main

# Pastikan build/ TIDAK di-commit!
git status  # Harus tidak ada folder build/
```

### Step 2: Di VPS - Build Production

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Navigate ke frontend
cd /var/www/frontend

# Pull latest code
git pull origin main

# Pastikan .env.production ada dan benar
cat .env.production

# Hapus build lama (PENTING!)
rm -rf build/

# Build untuk PRODUCTION
npm run build:prod

# Atau
npm run build
```

### Step 3: Verify Build

```bash
# Cek bundle untuk memastikan URL benar
cd build/static/js
grep -r "localhost" .  # Harus TIDAK ada hasil
grep -r "indotech.api.digiprosb.id" .  # Harus ada hasil
```

**Expected Output:**
```bash
$ grep -r "indotech.api.digiprosb.id" main.js
http://indotech.api.digiprosb.id/api
```

### Step 4: Test di Browser

1. Buka aplikasi production
2. Buka Developer Tools (F12)
3. Pilih **Network** tab
4. Login atau lakukan request

**Expected Request:**
```
✅ http://indotech.api.digiprosb.id/api/auth/login
✅ http://indotech.api.digiprosb.id/api/socx/tokens
```

**Should NOT see:**
```
❌ http://localhost:3000/api/auth/login
```

---

## 🔍 Debugging Environment Variables

### Cek Environment Variables di Runtime

**Method 1: Console Log (Sudah ditambahkan di api.js)**

Buka browser console, Anda akan melihat:
```
🔗 API Base URL: http://indotech.api.digiprosb.id/api
```

**Method 2: Add Debug Code**

Tambahkan di `frontend/src/index.js`:
```javascript
console.log('REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_ENV:', process.env.REACT_APP_ENV);
```

---

## ⚠️ Mixed Content Error (HTTPS Frontend + HTTP Backend)

### Symptom:
```
Mixed Content: The page at 'https://indotech.digiprosb.id/login' was loaded over HTTPS, 
but requested an insecure resource 'http://indotech.api.digiprosb.id/api/auth/login'. 
This request has been blocked; content must be served over HTTPS.

TypeError: Failed to fetch
```

### Cause:
- Frontend di-serve dengan **HTTPS** (port 443)
- Backend URL menggunakan **HTTP** (port 80)
- Browser memblokir request HTTP dari halaman HTTPS untuk keamanan

### Solution:
```bash
# Di VPS
cd /var/www/frontend

# Update .env.production dengan HTTPS
cat .env.production
# REACT_APP_BACKEND_URL=https://indotech.api.digiprosb.id/api

# Delete build lama
rm -rf build/

# Build production lagi
npm run build:prod
```

### Verification:
```bash
# Cek bundle
cd build/static/js
grep -r "https://indotech.api.digiprosb.id" .
# Harus ada hasil dengan https://

# Test di browser
# Buka https://indotech.digiprosb.id/login
# Console: 🔗 API Base URL: https://indotech.api.digiprosb.id/api
# Network tab: Request ke https://indotech.api.digiprosb.id/api/auth/login
```

**Important:**
- ✅ Frontend HTTPS → Backend **HARUS** HTTPS
- ✅ Frontend HTTP → Backend bisa HTTP atau HTTPS
- ❌ Frontend HTTPS → Backend HTTP → **Mixed Content Error**

---

## 🛠️ Troubleshooting Common Issues

### Issue 1: Masih localhost setelah build

**Symptom:**
- Network tab menunjukkan request ke localhost:3000
- Bundle masih mengandung localhost:3000

**Cause:**
- Build di local dengan `.env` (development)
- Build di VPS tapi `.env.production` tidak ada

**Solution:**
```bash
# Di VPS
cd /var/www/frontend

# Pastikan .env.production ada
cat .env.production

# Hapus build lama
rm -rf build/

# Build lagi
npm run build:prod

# Verify
cd build/static/js
grep -r "localhost" .
```

### Issue 2: Environment Variables Tidak Terbaca

**Symptom:**
- Console error: `REACT_APP_BACKEND_URL is not set!`

**Cause:**
- Nama variable tidak diawali `REACT_APP_`
- File `.env.production` tidak ada di VPS

**Solution:**
```bash
# Cek .env.production
cat .env.production

# Pastikan format benar:
# REACT_APP_BACKEND_URL=http://indotech.api.digiprosb.id/api
# ^^^^^^^^^^^ HARUS diawali dengan REACT_APP_
```

**Variable Naming Rules:**
```javascript
// ❌ SALAH - Tidak akan terbaca
const API_URL = process.env.BACKEND_URL;
const API_URL = process.env.REACT_API_BACKEND_URL; // Salah format

// ✅ BENAR - Akan terbaca
const API_URL = process.env.REACT_APP_BACKEND_URL;
const DEBUG = process.env.REACT_APP_DEBUG;
```

### Issue 3: Build Gagal di VPS

**Check:**
```bash
# Pastikan Node.js terinstall
node --version  # Min: 14.x

# Pastikan npm terinstall
npm --version

# Pastikan dependencies terinstall
npm install

# Cek .env.production
ls -la .env.production
cat .env.production

# Coba build verbose
npm run build:prod --verbose
```

### Issue 4: Browser Cache

**Symptom:**
- Request masih ke localhost meskipun sudah rebuild
- Bundle lama masih ter-cache

**Solution:**
```bash
# Di VPS - Delete build dan rebuild
rm -rf build/
npm run build:prod

# Di Browser:
# 1. Clear cache (Ctrl+Shift+Delete)
# 2. Hard refresh (Ctrl+F5)
# 3. Open incognito window
# 4. Test lagi
```

---

## 📋 File Environment Variables

### Development (`.env`)
```env
REACT_APP_BACKEND_URL=http://localhost:3000/api
REACT_APP_ENV=development
REACT_APP_DEBUG=true
```

**Digunakan untuk:**
- Development lokal
- `npm start`

### Production (`.env.production`)
```env
REACT_APP_BACKEND_URL=https://indotech.api.digiprosb.id/api
REACT_APP_ENV=production
REACT_APP_DEBUG=false
```

**Digunakan untuk:**
- Production di VPS
- `npm run build` (otomatis pakai .env.production)
- `npm run build:prod`

### Template (`.env.example`)
```env
REACT_APP_BACKEND_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

**Digunakan untuk:**
- Template untuk developer baru
- Dokumentasi

---

## 🎯 Checklist Before Deploy

- [ ] Push code ke git (tanpa folder build/)
- [ ] SSH ke VPS
- [ ] `git pull origin main`
- [ ] Verify `.env.production` ada di VPS
- [ ] Verify isi `.env.production` benar
- [ ] Delete build lama: `rm -rf build/`
- [ ] Build production: `npm run build:prod`
- [ ] Verify bundle: `grep -r "localhost" build/` (harus kosong)
- [ ] Verify bundle: `grep -r "indotech.api.digiprosb.id" build/` (harus ada)
- [ ] Restart nginx: `sudo systemctl restart nginx`
- [ ] Test di browser (incognito mode)
- [ ] Check Network tab di Developer Tools

---

## 📊 Build vs Runtime Environment

| Environment | When Read | Used For |
|-------------|------------|-----------|
| `.env` | `npm start` | Development server |
| `.env.production` | `npm run build` | Production bundle |
| `.env.test` | `npm test` | Test environment |
| `.env.staging` | `npm run build:staging` | Staging bundle |

**Important:**
- Environment variables dibaca SAAT BUILD, bukan SAAT RUNTIME
- Bundle yang sudah dibuild TIDAK akan berubah meskipun .env diubah
- Harus REBUILD setiap ada perubahan environment

---

## 🆘 Advanced Troubleshooting

### Check Environment Variables in Bundle

```bash
# Di VPS
cd build/static/js

# Cari semua environment variables
grep -r "REACT_APP" .

# Cek spesifik variable
grep -r "REACT_APP_BACKEND_URL" .
```

### Compare Development vs Production Builds

```bash
# Development build
npm start
# Buka browser console: 🔗 API Base URL: http://localhost:3000/api

# Production build
npm run build:prod
# Serve build/ dan buka browser console: 🔗 API Base URL: http://indotech.api.digiprosb.id/api
```

### Force Production Build

```bash
# Set environment secara eksplisit
cross-env REACT_APP_ENV=production REACT_APP_BACKEND_URL=http://indotech.api.digiprosb.id/api npm run build
```

---

## 📝 Summary

### ✅ What Was Fixed:
1. Removed localhost fallback from `api.js`
2. Added validation for environment variables
3. Fixed hardcoded localhost in `Login.js`
4. Added console log to verify API URL at runtime

### ✅ What You Need to Do:
1. Push code to VPS (without build/)
2. Build on VPS with `.env.production`
3. Verify bundle contains correct URL
4. Test in browser (incognito mode)

### ✅ Expected Result:
- All API requests go to `http://indotech.api.digiprosb.id/api`
- No more localhost:3000 in production
- Environment variables working correctly

---

## 📞 Still Having Issues?

If you still see localhost:3000 after following these steps:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Use incognito mode** for testing
3. **Verify bundle** with grep commands
4. **Check console** for error messages
5. **Rebuild** on VPS: `rm -rf build/ && npm run build:prod`

---

**Created:** 2026-01-30  
**Last Updated:** 2026-01-30