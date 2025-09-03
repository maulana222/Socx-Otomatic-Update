# SOCX Otomatic Update

Platform untuk mengelola dan mengupdate data produk secara otomatis ke SOCX API menggunakan file Excel.

## Fitur

- **Update Product Otomatis**: Upload file Excel untuk update data produk ke SOCX API
- **Bearer Token Management**: Kelola Bearer Token untuk autentikasi API
- **Excel Validation**: Validasi format dan data Excel sebelum dikirim ke API
- **Progress Tracking**: Monitor progress upload dan hasil processing
- **Template Download**: Download template Excel yang sesuai dengan format yang dibutuhkan

## Struktur Aplikasi

```
src/
├── components/
│   └── Header.js              # Header dengan navigasi dan Bearer Token input
├── contexts/
│   └── BearerTokenContext.js  # Context untuk mengelola Bearer Token
├── pages/
│   ├── Dashboard.js           # Halaman utama dengan card-card fitur
│   └── ProductUpdate.js       # Halaman update product dengan upload Excel
├── App.js                     # Komponen utama dengan routing
├── index.js                   # Entry point aplikasi
└── index.css                  # Styling utama dengan Tailwind CSS

public/
├── index.html                 # HTML template
└── manifest.json              # Web app manifest
```

## Format Excel yang Diperlukan

### Kolom Wajib:
- `base_price`: Harga dasar produk (number)
- `code`: Kode produk (string)
- `name`: Nama produk (string)
- `suppliers_id`: ID supplier (number)
- `trx_per_day`: Transaksi per hari (number)

### Kolom Opsional:
- `parameters`: Parameter tambahan (string)
- `regex_custom_info`: Info custom regex (string)

### Contoh Data:
```json
{
  "base_price": 10000,
  "code": "OTF_FIW3_MOBO_10GB_14D_10K",
  "name": "Freedom Internet 10GB 14hr",
  "parameters": "",
  "regex_custom_info": "",
  "suppliers_id": 35,
  "trx_per_day": 100
}
```

## Cara Penggunaan

1. **Set Bearer Token**:
   - Klik tombol "Set Bearer Token" di header
   - Masukkan token Anda dan klik "Save"

2. **Update Product**:
   - Klik card "Update Product Otomatis"
   - Upload file Excel dengan format yang sesuai
   - Klik "Process & Send to API"
   - Monitor progress dan hasil processing

3. **Download Template**:
   - Klik tombol "Download Template" untuk mendapatkan contoh format Excel

## Instalasi dan Setup

### Prerequisites
- Node.js (versi 14 atau lebih baru)
- npm atau yarn

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

### Build untuk Production
```bash
npm run build
```

## API Endpoint

Aplikasi mengirim data ke endpoint:
```
POST https://indotechapi.socx.app/api/v1/suppliers_products
```

**Headers yang dibutuhkan:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

## Teknologi yang Digunakan

- **Frontend**: React 18, React Router DOM
- **Styling**: Tailwind CSS
- **File Processing**: SheetJS (xlsx)
- **HTTP Client**: Axios
- **State Management**: React Context API

## Struktur Database (Untuk Pengembangan Selanjutnya)

### Tabel yang Diperlukan:

1. **users** - Manajemen user
2. **api_logs** - Log API calls
3. **excel_uploads** - History upload file Excel
4. **product_updates** - History update produk
5. **suppliers** - Data supplier
6. **products** - Data produk

### Contoh Schema:

```sql
-- Tabel untuk log API calls
CREATE TABLE api_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk history upload Excel
CREATE TABLE excel_uploads (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT,
  total_rows INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Fitur yang Akan Datang

- [ ] Cek Promo iSimple
- [ ] Cek Promo DigiPos
- [ ] Dashboard analytics
- [ ] Export hasil processing
- [ ] Batch processing
- [ ] User management
- [ ] API rate limiting

## Troubleshooting

### Error "Bearer Token Required"
- Pastikan Bearer Token sudah diatur di header aplikasi
- Token disimpan di localStorage dan akan tetap ada setelah refresh

### Error Upload File
- Pastikan file yang diupload adalah format Excel (.xlsx atau .xls)
- Pastikan format kolom sesuai dengan template yang disediakan
- Pastikan data dalam kolom wajib tidak kosong

### Error API Call
- Periksa koneksi internet
- Pastikan Bearer Token valid dan tidak expired
- Periksa format data yang dikirim sesuai dengan yang diharapkan API

## Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Support

Untuk dukungan teknis atau pertanyaan, silakan buat issue di repository ini.
