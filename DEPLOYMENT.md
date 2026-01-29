# Frontend Deployment Guide

## 🔴 MASALAH: Environment Variables di React

### Kenapa Frontend Masih Menggunakan localhost?

**Masalah:** React membaca environment variables pada **BUILD time**, bukan **RUNTIME**.

```javascript
// DI BACA SAAT BUILD
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000/api';
```

Artinya:
- ✅ **Benar:** Build di VPS dengan environment variables production
- ❌ **Salah:** Build di lokal lalu push file build ke VPS

---

## ✅ SOLUSI: Build di VPS dengan Production Environment

### Metode 1: Build Production di VPS (RECOMMENDED)

#### 1. Push Code ke VPS (TANPA build/)

```bash
# Di local PC
cd frontend
git add .
git commit -m "Update code"
git push origin main

# JANGAN include folder build/ di git!
```

#### 2. Di VPS, Pull dan Build

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Navigate to project
cd /path/to/frontend

# Pull latest code
git pull origin main

# Install/update dependencies
npm install

# Build untuk PRODUCTION (PENTING!)
npm run build:prod

# Atau
npm run build
```

**Kenapa harus build di VPS?**
- ✅ Environment variables dari `.env.production` akan dibaca saat build
- ✅ API URL production akan tertanam di bundle
- ✅ Tidak akan ada lagi localhost di production

---

### Metode 2: Build di Local dengan Production Environment (TIDAK RECOMMENDED)

#### 1. Build di Local dengan Production Environment

```bash
# Di local PC
cd frontend

# Set environment production dan build
cross-env REACT_APP_ENV=production npm run build

# Atau menggunakan .env.production
npm run build:prod
```

#### 2. Upload build/ ke VPS

```bash
# Upload folder build/ ke VPS
scp -r build/ user@your-vps-ip:/path/to/frontend/

# Atau menggunakan rsync
rsync -avz build/ user@your-vps-ip:/path/to/frontend/build/
```

**Masalah dengan metode ini:**
- ❌ Harus build ulang setiap ada perubahan
- ❌ Tidak fleksibel untuk deployment otomatis
- ❌ Berisiko build di local tidak sama dengan di VPS

---

## 📁 File Environment Variables

### `.env` (Development)
```env
REACT_APP_BACKEND_URL=http://localhost:3000/api
REACT_APP_ENV=development
REACT_APP_DEBUG=true
```

**Digunakan untuk:**
- Development lokal
- `npm start`

### `.env.production` (Production)
```env
REACT_APP_BACKEND_URL=http://indotechapi.api.digiprosb.id/api
REACT_APP_ENV=production
REACT_APP_DEBUG=false
```

**Digunakan untuk:**
- Production di VPS
- `npm run build` (otomatis pakai .env.production)
- `npm run build:prod`

### `.env.example` (Template)
```env
REACT_APP_BACKEND_URL=http://localhost:3000/api
REACT_APP_ENV=development
```

**Digunakan untuk:**
- Template untuk developer baru
- Dokumentasi environment variables

---

## 🚀 Script Build di package.json

```json
{
  "scripts": {
    "start": "cross-env PORT=9899 HOST=0.0.0.0 react-scripts start",
    "build": "react-scripts build",
    "build:prod": "cross-env REACT_APP_ENV=production react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
```

### Penjelasan:

| Script | Environment | Output |
|--------|-------------|--------|
| `npm start` | Development | Development server |
| `npm run build` | Production | Folder build/ (pakai .env.production) |
| `npm run build:prod` | Production | Folder build/ (explicit) |

---

## 📋 Deployment Flow Lengkap

### Option A: Build di VPS (RECOMMENDED)

```bash
# 1. Di Local: Push code
cd frontend
git add .
git commit -m "Update features"
git push origin main

# 2. Di VPS: Pull dan build
ssh user@vps-ip
cd /var/www/frontend
git pull origin main
npm install
npm run build:prod

# 3. Serve build files (nginx/apache)
# nginx.conf sudah konfigurasi untuk serve build/
```

### Option B: CI/CD Pipeline (BEST for Production)

```bash
# .gitlab-ci.yml or .github/workflows/deploy.yml

stages:
  - build
  - deploy

build:
  stage: build
  script:
    - cd frontend
    - npm install
    - npm run build:prod
  artifacts:
    paths:
      - frontend/build/

deploy:
  stage: deploy
  script:
    - scp -r frontend/build/ user@vps:/var/www/frontend/build/
    - # Restart nginx if needed
```

---

## 🔍 Cara Verifikasi Build

### 1. Check bundle untuk memastikan API URL production

```bash
# Cari API URL di bundle JS
cd build/static/js
grep -r "localhost" .
grep -r "indotechapi.api.digiprosb.id" .
```

**Output yang BENAR:**
```bash
$ grep -r "indotechapi.api.digiprosb.id" main.js
http://indotechapi.api.digiprosb.id/api
```

**Output yang SALAH:**
```bash
$ grep -r "localhost" main.js
http://localhost:3000/api  # ← INI SALAH!
```

### 2. Test di browser

Buka aplikasi production dan buka Developer Tools (F12) → Network

Request seharusnya ke:
```
http://indotechapi.api.digiprosb.id/api/auth/login
```

BUKAN:
```
http://localhost:3000/api/auth/login  # ← INI SALAH!
```

---

## 🛠️ Konfigurasi Nginx untuk Serve React Build

### Example nginx.conf:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/frontend/build;
    index index.html;

    # React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy ke backend (jika butuh)
    location /api {
        proxy_pass http://indotechapi.api.digiprosb.id;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Troubleshooting

### Problem: Masih ke localhost setelah build

**Cause:** Build dilakukan di local dengan `.env` (development)

**Solution:**
```bash
# Hapus folder build
rm -rf build/

# Build lagi di VPS dengan environment production
npm run build:prod
```

### Problem: Environment variables tidak terbaca

**Cause:** Nama variable tidak diawali dengan `REACT_APP_`

**Solution:**
```javascript
// ❌ SALAH
const API_URL = process.env.BACKEND_URL;

// ✅ BENAR
const API_URL = process.env.REACT_APP_BACKEND_URL;
```

### Problem: Build di VPS gagal

**Check:**
```bash
# Pastikan Node.js terinstall
node --version

# Pastikan npm terinstall
npm --version

# Pastikan .env.production ada
ls -la .env.production

# Cek isi .env.production
cat .env.production

# Coba build verbose
npm run build:prod --verbose
```

---

## ✅ Checklist Sebelum Deploy

- [ ] `.env.production` sudah ada di VPS
- [ ] `REACT_APP_BACKEND_URL` sudah di-set ke production URL
- [ ] Build dilakukan di VPS (bukan di local)
- [ ] Folder `build/` di-exclude dari git
- [ ] Nginx/Apache sudah dikonfigurasi untuk serve build/
- [ ] Test production build dengan browser
- [ ] Verify API request ke backend production (bukan localhost)

---

## 📝 Summary

| Item | Development | Production |
|------|-------------|------------|
| Environment File | `.env` | `.env.production` |
| Build Command | `npm start` | `npm run build:prod` |
| API URL | `http://localhost:3000/api` | `http://indotechapi.api.digiprosb.id/api` |
| Build Location | Local / VPS | **VPS (PENTING!)** |
| Push to Git | Code + .env | Code + .env.production |

---

## 🎯 Best Practices

1. ✅ **Selalu build di VPS** untuk production
2. ✅ **Jangan commit folder build/** ke git
3. ✅ **Gunakan .env.production** untuk production config
4. ✅ **Gunakan CI/CD** untuk deployment otomatis
5. ✅ **Verify bundle** setelah build untuk memastikan API URL benar
6. ✅ **Test di production environment** setelah deploy

---

## 🆘 Need Help?

Jika masih ada masalah:
1. Cek environment variables di build folder
2. Verifikasi build command yang digunakan
3. Pastikan build dilakukan di VPS, bukan di local
4. Test di browser dan check Network tab di Developer Tools

---

**Created:** 2026-01-30  
**Last Updated:** 2026-01-30