import React, { useState } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import socxApi from '../utils/socxApi';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

const TriProduksi = () => {
  const { bearerToken } = useBearerToken();
  const [nomorList, setNomorList] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [paketUnik, setPaketUnik] = useState({});
  const [paketCount, setPaketCount] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllPaket, setShowAllPaket] = useState(false);
  const [currentPageResults, setCurrentPageResults] = useState(1);
  const [currentPagePaket, setCurrentPagePaket] = useState(1);
  const resultsPerPage = 3;
  const paketPerPage = 8;
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [sortConfigResults, setSortConfigResults] = useState({ key: null, direction: 'asc' });
  const [progress, setProgress] = useState({ current: 0, total: 0, currentNumber: '' });
  const [staticData, setStaticData] = useState([]);
  const [matchedPackages, setMatchedPackages] = useState([]);
  const [editableStaticData, setEditableStaticData] = useState([]);
  const [searchPaket, setSearchPaket] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputMode, setInputMode] = useState('nomor'); // 'nomor' atau 'excel'

  // API akan menggunakan socxApi untuk semua request

  // Data statis Tri Rita berdasarkan response (harga dalam Rupiah)
  const triRitaStaticDataRaw = [
    { name: "Tri Data Happy 2GB 1 Hari", price: 5000 },
    { name: "Tri Data Happy 5GB 2 Hari", price: 10000 },
    { name: "Tri Data Happy 12GB 3 Hari", price: 15000 },
    { name: "Tri Data Happy 10GB 5 Hari", price: 20000 },
    { name: "Tri Data Happy 5GB 7 Hari", price: 20000 },
    { name: "Tri Data Happy 8GB 7 Hari", price: 20000 },
    { name: "Tri Data Happy 9GB 7 Hari", price: 20000 },
    { name: "Tri Data Happy 10GB 7 Hari", price: 20000 },
    { name: "Tri Data Happy 18GB 7 Hari", price: 30000 },
    { name: "Tri Data Happy 3GB 14 Hari", price: 25000 },
    { name: "Tri Data Happy 35GB 14 Hari", price: 50000 },
    { name: "Tri Data Happy 7GB 28 Hari", price: 28000 },
    { name: "Tri Data Happy 9GB 28 Hari", price: 32000 },
    { name: "Tri Data Happy 10GB 28 Hari", price: 31200 },
    { name: "Tri Data Happy 11GB 28 Hari", price: 35000 },
    { name: "Tri Data Happy 13GB 28 Hari", price: 41000 },
    { name: "Tri Data Happy 14GB 28 Hari", price: 41000 },
    { name: "Tri Data Happy 15GB 28 Hari", price: 45000 },
    { name: "Tri Data Happy 18GB 28 Hari", price: 51000 },
    { name: "Tri Data Happy 20GB 28 Hari", price: 52000 },
    { name: "Tri Data Happy 25GB 28 Hari", price: 70000 },
    { name: "Tri Data Happy 30GB 28 Hari", price: 75000 },
    { name: "Tri Data Happy 42GB 28 Hari", price: 75000 },
    { name: "Tri Data Happy 55GB 28 Hari", price: 10000 },
    { name: "Tri Data Happy 100GB 28 Hari", price: 100000 },
    { name: "Tri Data Happy 150GB 30 Hari", price: 125000 },
    { name: "Tri Data Happy 7GB 5 Hari", price: 15000 },
    { name: "Tri Data Happy 60GB 30 Hari", price: 100000 },
    { name: "Tri Data Happy 75GB 30 Hari", price: 120000 },
    { name: "Tri Data Happy 100GB 28 Hari", price: 150000 },
    { name: "Tri Data Happy 100GB (50GB Nasional + 50GB InternetTri) 30 Hari", price: 150000 }
  ];

  // Fungsi untuk menghapus duplikat berdasarkan nama dan harga
  const removeDuplicates = (data) => {
    const seen = new Set();
    return data.filter(item => {
      const key = `${item.name}|${item.price}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Data statis tanpa duplikat
  const triRitaStaticData = removeDuplicates(triRitaStaticDataRaw);

  const fetchPaket = async (msisdn) => {
    try {
      const response = await socxApi.socxPost(
        '/api/v1/suppliers_modules/task',
        {
          id: 57,
          name: 'rita',
          task: 'special_offer',
          payload: { msisdn }
        }
      );

      // Response dari API Tri Rita: { status: true, message: "Success", code: 1, data: [...] }
      // Response dari backend proxy langsung mengembalikan data dari SOCX API
      console.log('Response dari API Tri Rita:', response);
      console.log('Response.data:', response.data);
      
      // Coba berbagai cara untuk mengambil data
      let list = [];
      
      // Coba 1: response.data.data (structure: { status, message, code, data: [...] })
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        list = response.data.data;
        console.log('Mengambil dari response.data.data:', list);
      }
      // Coba 2: response.data (jika backend langsung mengembalikan array)
      else if (response.data && Array.isArray(response.data)) {
        list = response.data;
        console.log('Mengambil dari response.data:', list);
      }
      // Coba 3: response.data.data.data (nested structure)
      else if (response.data && response.data.data && response.data.data.data && Array.isArray(response.data.data.data)) {
        list = response.data.data.data;
        console.log('Mengambil dari response.data.data.data:', list);
      }
      
      console.log('Final list paket:', list, 'Length:', list.length);
      return list;
    } catch (error) {
      console.error(`❌ Gagal fetch nomor ${msisdn}:`, error.message);
      console.error('Error details:', error);
      return [];
    }
  };

  const processNumbers = async () => {
    if (!bearerToken) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Harap set Bearer Token terlebih dahulu',
        confirmButtonText: 'OK'
      });
      return;
    }

    if (!nomorList.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Harap masukkan nomor yang akan dicek',
        confirmButtonText: 'OK'
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setPaketUnik({});
    setPaketCount({});
    setShowResults(false);

    try {
      const nomorArray = nomorList.trim().split('\n').map(n => n.trim()).filter(n => n);
      const tempPaketUnik = {};
      const tempPaketCount = {};
      const allResults = [];

      // Set initial progress
      setProgress({ current: 0, total: nomorArray.length, currentNumber: '' });

      for (let i = 0; i < nomorArray.length; i++) {
        const nomor = nomorArray[i];
        
        // Update progress
        setProgress({ 
          current: i + 1, 
          total: nomorArray.length, 
          currentNumber: nomor 
        });

        console.log(`🔍 Cek nomor: ${nomor}`);
        const paketList = await fetchPaket(nomor);
        
        allResults.push({
          nomor,
          paketCount: paketList.length,
          pakets: paketList
        });

        // Simpan paket unik berdasarkan registrationKey (hanya yang belum ada)
        paketList.forEach(paket => {
          // Gunakan registrationKey sebagai identifier unik
          const key = paket.registrationKey || paket.offerId;
          if (!tempPaketUnik[key]) {
            tempPaketUnik[key] = {
              offerId: paket.offerId,
              offerShortDesc: paket.offerShortDesc,
              productPrice: paket.productPrice,
              productType: paket.productType,
              registrationKey: paket.registrationKey,
              retailerIncentive: paket.retailerIncentive,
              netPrice: paket.netPrice,
              recommendationName: paket.recommendationName,
              offerDescription: paket.offerDescription,
              sequenceNumber: paket.sequenceNumber,
              validity: paket.validity,
              starred: paket.starred,
              bannerColor: paket.bannerColor,
              discountValue: paket.discountValue,
              bestDeal: paket.bestDeal
            };
            tempPaketCount[key] = 0;
          }
          // Increment counter untuk kode ini
          tempPaketCount[key] = (tempPaketCount[key] || 0) + 1;
        });

        // Delay untuk menghindari rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setResults(allResults);
      setPaketUnik(tempPaketUnik);
      setPaketCount(tempPaketCount);
      setShowResults(true);
      setProgress({ current: 0, total: 0, currentNumber: '' });

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Berhasil mengecek ${nomorArray.length} nomor dan menemukan ${Object.keys(tempPaketUnik).length} paket unik`,
        confirmButtonText: 'OK'
      });

    } catch (error) {
      console.error('Error processing numbers:', error);
      setProgress({ current: 0, total: 0, currentNumber: '' });
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Terjadi kesalahan saat memproses nomor',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    const paketList = Object.values(paketUnik);
    
    if (paketList.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Tidak ada data untuk didownload',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Hanya ambil kolom yang diperlukan sesuai response pengecekan
    const paketListFiltered = paketList.map(paket => {
      const key = paket.registrationKey || paket.offerId;
      // Buat JSON string untuk Parameter
      const parameterJson = JSON.stringify({
        type: 'special_offer',
        offerId: paket.offerId || '',
        offerShortDesc: paket.offerShortDesc || '',
        productPrice: paket.productPrice || '',
        registrationKey: paket.registrationKey || '',
        netPrice: paket.netPrice || ''
      });
      
      return {
        'Type': 'special_offer',
        'Offer Id': paket.offerId || '',
        'Offer Short Desc': paket.offerShortDesc || '',
        'Product Price': paket.productPrice || '',
        'Registration Key': paket.registrationKey || '',
        'Net Price': paket.netPrice || '',
        'Parameter': parameterJson,
        'Jumlah Nomor': paketCount[key] || 0
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(paketListFiltered);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Paket Data Unik');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `tri_rita_paket_data_unik_${timestamp}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);

    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: `File Excel berhasil didownload: ${fileName}`,
      confirmButtonText: 'OK'
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        Swal.fire({
          icon: 'warning',
          title: 'Perhatian!',
          text: 'Harap pilih file Excel (.xlsx atau .xls)',
          confirmButtonText: 'OK'
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const validateExcelData = (data) => {
    const errors = [];
    const requiredColumns = [
      'Type',
      'Offer Id',
      'Offer Short Desc',
      'Product Price',
      'Registration Key',
      'Net Price',
      'Parameter',
      'Jumlah Nomor'
    ];

    // Check if all required columns exist
    if (data.length === 0) {
      errors.push('File Excel kosong atau tidak memiliki data');
      return { errors, validatedData: [] };
    }

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => 
      !firstRow.hasOwnProperty(col) && 
      !firstRow.hasOwnProperty(col.toLowerCase()) &&
      !firstRow.hasOwnProperty(col.replace(/\s+/g, ''))
    );

    if (missingColumns.length > 0) {
      errors.push(`Kolom yang hilang: ${missingColumns.join(', ')}`);
      return { errors, validatedData: [] };
    }

    // Normalize column names (handle case sensitivity and spaces)
    const normalizedData = data.map((row, index) => {
      const normalizedRow = {};
      const rowNumber = index + 2; // +2 karena index mulai dari 0 dan Excel punya header

      // Helper function to find column value
      const getColumnValue = (colName) => {
        return row[colName] || 
               row[colName.toLowerCase()] || 
               row[colName.replace(/\s+/g, '')] ||
               row[colName.replace(/\s+/g, '').toLowerCase()];
      };

      normalizedRow.type = getColumnValue('Type') || '';
      normalizedRow.offerId = getColumnValue('Offer Id') || '';
      normalizedRow.offerShortDesc = getColumnValue('Offer Short Desc') || '';
      normalizedRow.productPrice = getColumnValue('Product Price') || '';
      normalizedRow.registrationKey = getColumnValue('Registration Key') || '';
      normalizedRow.netPrice = getColumnValue('Net Price') || '';
      normalizedRow.parameter = getColumnValue('Parameter') || '';
      normalizedRow.jumlahNomor = getColumnValue('Jumlah Nomor') || 0;

      // Validate required fields
      const rowErrors = [];
      if (!normalizedRow.registrationKey && !normalizedRow.offerId) {
        rowErrors.push('Registration Key atau Offer Id harus diisi');
      }
      if (isNaN(Number(normalizedRow.jumlahNomor))) {
        rowErrors.push('Jumlah Nomor harus berupa angka');
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: rowNumber,
          errors: rowErrors
        });
        return null;
      }

      return normalizedRow;
    }).filter(Boolean);

    return { errors, validatedData: normalizedData };
  };

  const processExcelFile = async () => {
    if (!file) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Harap pilih file Excel terlebih dahulu',
        confirmButtonText: 'OK'
      });
      return;
    }

    setIsUploading(true);
    setResults([]);
    setPaketUnik({});
    setPaketCount({});
    setShowResults(false);

    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            resolve(jsonData);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      const { errors, validatedData } = validateExcelData(data);

      if (errors.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Error Validasi!',
          html: `Terjadi kesalahan validasi:<br/>${errors.map(e => 
            typeof e === 'string' ? e : `Baris ${e.row}: ${e.errors.join(', ')}`
          ).join('<br/>')}`,
          confirmButtonText: 'OK'
        });
        setIsUploading(false);
        return;
      }

      // Process validated data
      const tempPaketUnik = {};
      const tempPaketCount = {};

      validatedData.forEach(row => {
        const key = row.registrationKey || row.offerId;
        if (key) {
          // Parse parameter jika berupa JSON string
          let parameterObj = {};
          if (row.parameter) {
            try {
              parameterObj = typeof row.parameter === 'string' 
                ? JSON.parse(row.parameter) 
                : row.parameter;
            } catch (e) {
              // Jika bukan JSON, buat object dari parameter
              parameterObj = { type: row.type || 'special_offer' };
            }
          } else {
            parameterObj = { type: row.type || 'special_offer' };
          }

          // Set paket unik
          if (!tempPaketUnik[key]) {
            tempPaketUnik[key] = {
              offerId: row.offerId || '',
              offerShortDesc: row.offerShortDesc || '',
              productPrice: row.productPrice || '',
              productType: row.type || 'special_offer',
              registrationKey: row.registrationKey || '',
              netPrice: row.netPrice || '',
              recommendationName: row.offerShortDesc || '',
              offerDescription: row.offerShortDesc || '',
              validity: parameterObj.validity || '',
              parameter: row.parameter || JSON.stringify(parameterObj)
            };
            tempPaketCount[key] = 0;
          }

          // Set jumlah nomor
          const jumlahNomor = Number(row.jumlahNomor) || 0;
          tempPaketCount[key] = (tempPaketCount[key] || 0) + jumlahNomor;
        }
      });

      setPaketUnik(tempPaketUnik);
      setPaketCount(tempPaketCount);
      setShowResults(true);
      setFile(null); // Reset file input

      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: `Berhasil memproses ${validatedData.length} baris data dan menemukan ${Object.keys(tempPaketUnik).length} paket unik`,
        confirmButtonText: 'OK'
      });

    } catch (error) {
      console.error('Error processing file:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: `Terjadi kesalahan saat memproses file: ${error.message}`,
        confirmButtonText: 'OK'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setNomorList('');
    setResults([]);
    setPaketUnik({});
    setPaketCount({});
    setShowResults(false);
    setShowAllResults(false);
    setShowAllPaket(false);
    setCurrentPageResults(1);
    setCurrentPagePaket(1);
    setSortConfig({ key: null, direction: 'asc' });
    setSortConfigResults({ key: null, direction: 'asc' });
    setProgress({ current: 0, total: 0, currentNumber: '' });
    setStaticData([]);
    setMatchedPackages([]);
    setEditableStaticData([]);
    setSearchPaket('');
    setFile(null);
    setInputMode('nomor');
    const fileInput = document.getElementById('excel-file');
    if (fileInput) fileInput.value = '';
  };

  // Fungsi untuk mendapatkan data yang akan ditampilkan (Paket Unik)
  const getDisplayData = () => {
    let paketArray = Object.values(paketUnik);
    
    // Filter berdasarkan pencarian
    if (searchPaket.trim()) {
      const searchTerm = searchPaket.toLowerCase();
      paketArray = paketArray.filter(paket => 
        (paket.offerShortDesc || '').toLowerCase().includes(searchTerm) ||
        (paket.registrationKey || '').toLowerCase().includes(searchTerm) ||
        (paket.productType || '').toLowerCase().includes(searchTerm) ||
        (paket.recommendationName || '').toLowerCase().includes(searchTerm) ||
        (paket.offerId || '').toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply sorting
    paketArray = sortData(paketArray, sortConfig);
    
    if (showAllPaket) {
      return paketArray;
    }
    
    const startIndex = (currentPagePaket - 1) * paketPerPage;
    const endIndex = startIndex + paketPerPage;
    return paketArray.slice(startIndex, endIndex);
  };

  // Fungsi untuk mendapatkan data hasil pengecekan
  const getDisplayResults = () => {
    let resultsData = [...results];
    
    // Apply sorting
    resultsData = sortData(resultsData, sortConfigResults);
    
    if (showAllResults) {
      return resultsData;
    }
    
    const startIndex = (currentPageResults - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return resultsData.slice(startIndex, endIndex);
  };

  // Fungsi untuk mendapatkan total halaman (Paket Unik)
  const getTotalPages = () => {
    let paketArray = Object.values(paketUnik);
    
    // Filter berdasarkan pencarian
    if (searchPaket.trim()) {
      const searchTerm = searchPaket.toLowerCase();
      paketArray = paketArray.filter(paket => 
        (paket.offerShortDesc || '').toLowerCase().includes(searchTerm) ||
        (paket.registrationKey || '').toLowerCase().includes(searchTerm) ||
        (paket.productType || '').toLowerCase().includes(searchTerm) ||
        (paket.recommendationName || '').toLowerCase().includes(searchTerm) ||
        (paket.offerId || '').toLowerCase().includes(searchTerm)
      );
    }
    
    return Math.ceil(paketArray.length / paketPerPage);
  };

  // Fungsi untuk mendapatkan total halaman (Results)
  const getTotalPagesResults = () => {
    return Math.ceil(results.length / resultsPerPage);
  };

  // Fungsi untuk handle pagination (Paket Unik)
  const handlePageChange = (page) => {
    setCurrentPagePaket(page);
  };

  // Fungsi untuk handle pagination (Results)
  const handlePageChangeResults = (page) => {
    setCurrentPageResults(page);
  };

  // Fungsi untuk toggle show all (Paket Unik)
  const toggleShowAll = () => {
    setShowAllPaket(!showAllPaket);
    setCurrentPagePaket(1);
  };

  // Fungsi untuk toggle show all (Results)
  const toggleShowAllResults = () => {
    setShowAllResults(!showAllResults);
    setCurrentPageResults(1);
  };

  // Fungsi untuk sorting data
  const sortData = (data, config) => {
    if (!config.key) return data;
    
    return [...data].sort((a, b) => {
      let aValue = a[config.key];
      let bValue = b[config.key];
      
      // Handle nested properties
      if (config.key === 'paketCount') {
        aValue = a.paketCount;
        bValue = b.paketCount;
      }
      
      // Handle jumlah_nomor for paket unik
      if (config.key === 'jumlah_nomor') {
        const keyA = a.registrationKey || a.offerId;
        const keyB = b.registrationKey || b.offerId;
        aValue = paketCount[keyA] || 0;
        bValue = paketCount[keyB] || 0;
      }
      
      // Handle string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle numeric comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (aValue < bValue) {
          return config.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return config.direction === 'asc' ? 1 : -1;
        }
        return 0;
      }
      
      if (aValue < bValue) {
        return config.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Fungsi untuk handle sorting (Paket Unik)
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Fungsi untuk handle sorting (Results)
  const handleSortResults = (key) => {
    let direction = 'asc';
    if (sortConfigResults.key === key && sortConfigResults.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfigResults({ key, direction });
  };

  // Fungsi untuk mendapatkan icon sorting
  const getSortIcon = (key, config) => {
    if (config.key !== key) {
      return <span className="text-gray-400">↕</span>;
    }
    return config.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  // Fungsi untuk mengekstrak informasi dari nama paket
  const extractPackageInfo = (packageName) => {
    // Regex untuk mengekstrak GB dan hari dari nama paket
    const gbMatch = packageName.match(/(\d+(?:\.\d+)?)\s*GB/i);
    const dayMatch = packageName.match(/(\d+)\s*Hari/i) || packageName.match(/(\d+)\s*hari/i);
    
    return {
      gb: gbMatch ? parseFloat(gbMatch[1]) : 0,
      days: dayMatch ? parseInt(dayMatch[1]) : 0
    };
  };

  // Fungsi untuk membandingkan paket dengan data statis
  const comparePackages = () => {
    const matched = [];
    const paketArray = Object.values(paketUnik);

    // Gunakan data statis yang sudah diedit jika ada, jika tidak gunakan data asli
    const dataToCompare = staticData.length > 0 ? staticData : triRitaStaticData;

    console.log('Data yang digunakan untuk perbandingan:', dataToCompare);
    console.log('Paket yang tersedia:', paketArray);

    // Untuk setiap data statis, cari paket yang cocok
    dataToCompare.forEach(staticItem => {
      const staticInfo = extractPackageInfo(staticItem.name);
      const matchingPackages = [];
      const seenPackages = new Set();
      
      console.log(`Mencari paket untuk: ${staticItem.name} (${staticInfo.gb}GB, ${staticInfo.days} hari, harga: Rp ${staticItem.price})`);
      
      // Cari semua paket yang cocok dengan data statis ini
      paketArray.forEach(paket => {
        const packageInfo = extractPackageInfo(paket.offerShortDesc || paket.recommendationName || '');
        const productPrice = parseFloat(paket.productPrice) || 0;
        
        // Cek apakah paket cocok berdasarkan GB dan hari
        if (packageInfo.gb >= staticInfo.gb && 
            packageInfo.days >= staticInfo.days && 
            productPrice <= staticItem.price) {
          
          console.log(`Paket cocok: ${paket.offerShortDesc || paket.recommendationName} (${packageInfo.gb}GB, ${packageInfo.days} hari, harga: Rp ${productPrice})`);
          
          // Buat key unik untuk paket berdasarkan registrationKey atau offerId
          const packageKey = `${paket.registrationKey || paket.offerId}`;
          
          // Hanya tambahkan jika belum ada
          if (!seenPackages.has(packageKey)) {
            seenPackages.add(packageKey);
            const key = paket.registrationKey || paket.offerId;
            matchingPackages.push({
              packageName: paket.offerShortDesc || paket.recommendationName,
              packageCode: paket.registrationKey || paket.offerId,
              packageAmount: productPrice,
              packageType: paket.productType,
              packageOfferId: paket.offerId,
              packageCount: paketCount[key] || 0,
              packageInfo: packageInfo,
              parameter: paket.parameter || '',
              savings: staticItem.price - productPrice
            });
          }
        }
      });

      console.log(`Total paket yang cocok untuk ${staticItem.name}: ${matchingPackages.length}`);

      // Jika ada paket yang cocok, tambahkan ke hasil
      if (matchingPackages.length > 0) {
        matched.push({
          staticName: staticItem.name,
          staticPrice: staticItem.price,
          staticInfo: staticInfo,
          matchingPackages: matchingPackages,
          totalMatches: matchingPackages.length
        });
      }
    });

    console.log('Hasil perbandingan:', matched);
    setMatchedPackages(matched);
  };

  // Fungsi untuk menampilkan data statis
  const displayStaticData = () => {
    setStaticData(triRitaStaticData);
    // Inisialisasi data statis yang bisa diedit
    setEditableStaticData(triRitaStaticData.map(item => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9)
    })));
  };

  // Fungsi untuk mengupdate harga data statis
  const updateStaticPrice = (id, newPrice) => {
    setEditableStaticData(prevData => 
      prevData.map(item => 
        item.id === id 
          ? { ...item, price: parseFloat(newPrice) || 0 }
          : item
      )
    );
  };

  // Fungsi untuk format input harga dengan pemisah ribuan
  const formatPriceInput = (value) => {
    const numericValue = value.replace(/\D/g, '');
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Fungsi untuk parse harga dari format yang sudah diformat
  const parseFormattedPrice = (formattedValue) => {
    return parseInt(formattedValue.replace(/\./g, '')) || 0;
  };

  // Fungsi untuk menggunakan data statis yang sudah diedit
  const useEditedStaticData = () => {
    setStaticData(editableStaticData);
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: 'Data harga pasaran telah diupdate dengan harga yang baru',
      confirmButtonText: 'OK'
    });
  };

  // Fungsi untuk copy urutan paket
  const copyPaketRow = (paket) => {
    // Format: base_price	code	name	parameters
    const basePrice = paket.productPrice || '';
    const code = paket.registrationKey || paket.offerId || '';
    const name = paket.offerShortDesc || paket.recommendationName || '';
    const parameters = paket.parameter || '';
    
    const copyText = `${basePrice}\t${code}\t${name}\t${parameters}`;

    navigator.clipboard.writeText(copyText).then(() => {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data paket berhasil di-copy ke clipboard',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Gagal menyalin ke clipboard',
        confirmButtonText: 'OK'
      });
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back Button */}
      <div className="flex justify-start">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Kembali ke Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          📱 Tri Rita Produksi
        </h1>
        <p className="text-lg text-gray-600">
          Cek paket data unik berdasarkan nomor telepon
        </p>
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

      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Input Data Tri Produksi</h2>
        
        {/* Tabs untuk pilih metode input */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setInputMode('nomor');
                  setFile(null);
                  const fileInput = document.getElementById('excel-file');
                  if (fileInput) fileInput.value = '';
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  inputMode === 'nomor' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📱 Cek Nomor
              </button>
              <button
                onClick={() => {
                  setInputMode('excel');
                  setNomorList('');
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  inputMode === 'excel' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Upload Excel
              </button>
            </nav>
          </div>
        </div>

        {/* Input Nomor Telepon */}
        {inputMode === 'nomor' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="nomor-list" className="block text-sm font-medium text-gray-700 mb-2">
                Daftar Nomor (satu nomor per baris)
              </label>
              <textarea
                id="nomor-list"
                value={nomorList}
                onChange={(e) => setNomorList(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Masukkan nomor telepon, satu nomor per baris&#10;Contoh:&#10;089677549509&#10;081617409145&#10;081553605978"
              />
              <p className="text-sm text-gray-500 mt-1">
                Masukkan nomor telepon yang akan dicek, satu nomor per baris
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={processNumbers}
                disabled={!bearerToken || isProcessing || !nomorList.trim()}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !bearerToken || isProcessing || !nomorList.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isProcessing ? 'Memproses...' : 'Cek Nomor'}
              </button>
              
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Upload Excel */}
        {inputMode === 'excel' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="excel-file" className="block text-sm font-medium text-gray-700 mb-2">
                Upload File Excel
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  id="excel-file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                File Excel harus memiliki kolom: Type, Offer Id, Offer Short Desc, Product Price, Registration Key, Net Price, Parameter, Jumlah Nomor
              </p>
              {file && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    ✓ File dipilih: <span className="font-semibold">{file.name}</span>
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={processExcelFile}
                disabled={!bearerToken || isUploading || !file}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !bearerToken || isUploading || !file
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isUploading ? 'Memproses...' : 'Proses Excel'}
              </button>
              
              <button
                onClick={() => {
                  setFile(null);
                  const fileInput = document.getElementById('excel-file');
                  if (fileInput) fileInput.value = '';
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Progress Bar */}
      {isProcessing && progress.total > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Progress Pengecekan</h3>
              <span className="text-sm text-gray-600">
                {progress.current} dari {progress.total} nomor
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Sedang mengecek: <span className="font-semibold text-blue-600">{progress.currentNumber}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Mohon tunggu, proses ini membutuhkan waktu beberapa detik...
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">2. Hasil Pengecekan</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {showAllResults ? `Menampilkan semua ${results.length} hasil` : 
                 `Menampilkan ${getDisplayResults().length} dari ${results.length} hasil`}
              </span>
              <button
                onClick={toggleShowAllResults}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  showAllResults 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {showAllResults ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}
              </button>
              <button
                onClick={downloadExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                📥 Download Excel
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800">Total Nomor Dicek</h3>
              <p className="text-2xl font-bold text-blue-900">{results.length}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-800">Paket Unik Ditemukan</h3>
              <p className="text-2xl font-bold text-green-900">{Object.keys(paketUnik).length}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-purple-800">Total Paket</h3>
              <p className="text-2xl font-bold text-purple-900">
                {results.reduce((sum, result) => sum + result.paketCount, 0)}
              </p>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortResults('nomor')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Nomor</span>
                      {getSortIcon('nomor', sortConfigResults)}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortResults('paketCount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Jumlah Paket</span>
                      {getSortIcon('paketCount', sortConfigResults)}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getDisplayResults().map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.nomor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.paketCount} paket
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.paketCount > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.paketCount > 0 ? 'Berhasil' : 'Tidak ada paket'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls for Results */}
          {!showAllResults && getTotalPagesResults() > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Halaman {currentPageResults} dari {getTotalPagesResults()}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChangeResults(currentPageResults - 1)}
                  disabled={currentPageResults === 1}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    currentPageResults === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Sebelumnya
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, getTotalPagesResults()) }, (_, i) => {
                  const startPage = Math.max(1, currentPageResults - 2);
                  const pageNum = startPage + i;
                  if (pageNum > getTotalPagesResults()) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChangeResults(pageNum)}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        currentPageResults === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChangeResults(currentPageResults + 1)}
                  disabled={currentPageResults === getTotalPagesResults()}
                  className={`px-3 py-1 text-sm font-medium rounded-md ${
                    currentPageResults === getTotalPagesResults()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

          {/* Paket Unik */}
          {showResults && Object.keys(paketUnik).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">3. Paket Unik Ditemukan</h2>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {showAllPaket ? `Menampilkan semua ${Object.keys(paketUnik).length} paket` : 
                     `Menampilkan ${getDisplayData().length} dari ${Object.keys(paketUnik).length} paket`}
                  </span>
                  <button
                    onClick={toggleShowAll}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      showAllPaket 
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {showAllPaket ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}
                  </button>
                  <button
                    onClick={downloadExcel}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                  >
                    📥 Download Excel
                  </button>
                </div>
              </div>
              
              {/* Search Box */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Cari paket berdasarkan nama, kode, atau tipe..."
                    value={searchPaket}
                    onChange={(e) => setSearchPaket(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                  {searchPaket && (
                    <button
                      onClick={() => setSearchPaket('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {searchPaket && (
                  <p className="mt-2 text-sm text-gray-600">
                    Menampilkan {getDisplayData().length} dari {Object.keys(paketUnik).length} paket
                  </p>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        No
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('offerShortDesc')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Nama Paket</span>
                          {getSortIcon('offerShortDesc', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('registrationKey')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Registration Key</span>
                          {getSortIcon('registrationKey', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('productPrice')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Product Price</span>
                          {getSortIcon('productPrice', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('netPrice')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Net Price</span>
                          {getSortIcon('netPrice', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('productType')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Product Type</span>
                          {getSortIcon('productType', sortConfig)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('validity')}
                      >
                        <div className="flex items-center space-x-1">
                          <span>Validity (Hari)</span>
                          {getSortIcon('validity', sortConfig)}
                        </div>
                      </th>
                       <th 
                         className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                         onClick={() => handleSort('jumlah_nomor')}
                       >
                         <div className="flex items-center space-x-1">
                           <span>Jumlah Nomor</span>
                           {getSortIcon('jumlah_nomor', sortConfig)}
                         </div>
                       </th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         Aksi
                       </th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getDisplayData().map((paket, index) => {
                      const key = paket.registrationKey || paket.offerId;
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                            <div className="max-w-xs">
                              <div className="truncate" title={paket.offerShortDesc || paket.recommendationName}>
                                {paket.offerShortDesc || paket.recommendationName}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {paket.registrationKey || paket.offerId}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            <span className="font-semibold">Rp {parseFloat(paket.productPrice || 0).toLocaleString('id-ID')}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            <span>Rp {parseFloat(paket.netPrice || 0).toLocaleString('id-ID')}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            {paket.productType}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                            {paket.validity} hari
                          </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                             <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                               {paketCount[key] || 0} nomor
                             </span>
                           </td>
                           <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                             <button
                               onClick={() => copyPaketRow(paket)}
                               className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                               title="Copy urutan paket (base_price, code, name, parameters)"
                             >
                               <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                               </svg>
                               Copy
                             </button>
                           </td>
                         </tr>
                       );
                     })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {!showAllPaket && getTotalPages() > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Halaman {currentPagePaket} dari {getTotalPages()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPagePaket - 1)}
                      disabled={currentPagePaket === 1}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        currentPagePaket === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Sebelumnya
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                      const startPage = Math.max(1, currentPagePaket - 2);
                      const pageNum = startPage + i;
                      if (pageNum > getTotalPages()) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm font-medium rounded-md ${
                            currentPagePaket === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPagePaket + 1)}
                      disabled={currentPagePaket === getTotalPages()}
                      className={`px-3 py-1 text-sm font-medium rounded-md ${
                        currentPagePaket === getTotalPages()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

      {/* Data Statis Tri Rita */}
      {showResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">4. Data Harga Pasaran Tri Rita</h2>
            <button
              onClick={displayStaticData}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              📋 Tampilkan Data Harga Pasaran
            </button>
          </div>
          
          {editableStaticData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Anda dapat mengubah harga pasaran di bawah ini. Klik "Terapkan Perubahan" untuk menggunakan harga yang baru.
                </p>
                <button
                  onClick={useEditedStaticData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  💾 Terapkan Perubahan
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                        Nama Paket
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harga Pasaran (Rp) - Dapat Diedit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editableStaticData.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                          <div className="max-w-xs">
                            <div className="truncate" title={item.name}>
                              {item.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={item.price.toLocaleString('id-ID')}
                              onChange={(e) => {
                                const formattedValue = formatPriceInput(e.target.value);
                                const numericValue = parseFormattedPrice(formattedValue);
                                updateStaticPrice(item.id, numericValue);
                              }}
                              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-500">
                              (Rp {item.price.toLocaleString('id-ID')})
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {staticData.length > 0 && editableStaticData.length === 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                      Nama Paket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Harga Pasaran (Rp)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staticData.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                        <div className="max-w-xs">
                          <div className="truncate" title={item.name}>
                            {item.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-semibold">Rp {item.price.toLocaleString('id-ID')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Paket yang Cocok */}
      {showResults && Object.keys(paketUnik).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">5. Paket yang Cocok dengan Harga Pasaran</h2>
            <button
              onClick={comparePackages}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              🔍 Bandingkan Paket
            </button>
          </div>
          
           {matchedPackages.length > 0 && (
             <div className="space-y-6">
               {matchedPackages.map((match, index) => (
                 <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                   {/* Header Data Statis */}
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center space-x-4">
                       <h3 className="text-lg font-semibold text-gray-900">
                         {index + 1}. {match.staticName}
                       </h3>
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                         Harga Pasaran: Rp {match.staticPrice.toLocaleString('id-ID')}
                       </span>
                     </div>
                     <div className="flex items-center space-x-4">
                       <span className="text-sm text-gray-600">
                         {match.staticInfo.gb} GB, {match.staticInfo.days} Hari
                       </span>
                       <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                         {match.totalMatches} paket cocok
                       </span>
                     </div>
                   </div>

                   {/* Tabel Paket yang Cocok */}
                   <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                       <thead className="bg-gray-100">
                         <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                             No
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                             Nama Paket
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                             Kode Paket
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                             Harga Paket
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                             Parameter
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">
                             Jumlah Nomor
                           </th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                             Aksi
                           </th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {match.matchingPackages.map((packageItem, packageIndex) => (
                           <tr key={packageIndex} className={packageIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                               {packageIndex + 1}
                             </td>
                             <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                               <div className="max-w-xs">
                                 <div className="truncate" title={packageItem.packageName}>
                                   {packageItem.packageName}
                                 </div>
                               </div>
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                 {packageItem.packageCode}
                               </span>
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                               <span className="font-semibold">Rp {packageItem.packageAmount.toLocaleString('id-ID')}</span>
                             </td>
                             <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300">
                               <div className="max-w-xs">
                                 <div className="truncate text-xs" title={packageItem.parameter || ''}>
                                   {packageItem.parameter || '-'}
                                 </div>
                               </div>
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">
                               <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                 {packageItem.packageCount} nomor
                               </span>
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                               <button
                                 onClick={() => {
                                   // Ambil data paket dari paketUnik berdasarkan packageCode
                                   const paketData = Object.values(paketUnik).find(p => 
                                     (p.registrationKey || p.offerId) === packageItem.packageCode
                                   );
                                   if (paketData) {
                                     copyPaketRow(paketData);
                                   } else {
                                     // Fallback: copy dari data yang ada
                                     const basePrice = packageItem.packageAmount || '';
                                     const code = packageItem.packageCode || '';
                                     const name = packageItem.packageName || '';
                                     const parameters = packageItem.parameter || '';
                                     const copyText = `${basePrice}\t${code}\t${name}\t${parameters}`;
                                     navigator.clipboard.writeText(copyText).then(() => {
                                       Swal.fire({
                                         icon: 'success',
                                         title: 'Berhasil!',
                                         text: 'Data paket berhasil di-copy ke clipboard',
                                         timer: 2000,
                                         showConfirmButton: false,
                                         toast: true,
                                         position: 'top-end'
                                       });
                                     }).catch(err => {
                                       console.error('Error copying to clipboard:', err);
                                       Swal.fire({
                                         icon: 'error',
                                         title: 'Error!',
                                         text: 'Gagal menyalin ke clipboard',
                                         confirmButtonText: 'OK'
                                       });
                                     });
                                   }
                                 }}
                                 className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                 title="Copy urutan paket (base_price, code, name, parameters)"
                               >
                                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                 </svg>
                                 Copy
                               </button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               ))}
             </div>
           )}
          
          {matchedPackages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Belum ada paket yang dibandingkan. Klik "Bandingkan Paket" untuk memulai.</p>
            </div>
          )}
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Panduan Penggunaan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Metode 1: Cek Nomor</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Masukkan nomor telepon yang akan dicek (satu nomor per baris)</li>
              <li>Klik tombol "Cek Nomor" untuk memulai pengecekan</li>
              <li>Tunggu proses selesai (setiap nomor akan dicek dengan delay 500ms)</li>
              <li>Lihat hasil pengecekan dan paket unik yang ditemukan</li>
              <li>Download hasil dalam format Excel untuk analisis lebih lanjut</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Metode 2: Upload Excel</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Pilih tab "Upload Excel"</li>
              <li>Upload file Excel dengan kolom: Type, Offer Id, Offer Short Desc, Product Price, Registration Key, Net Price, Parameter, Jumlah Nomor</li>
              <li>Klik tombol "Proses Excel" untuk memproses data</li>
              <li>Data akan langsung ditampilkan sebagai paket unik</li>
              <li>Jumlah Nomor akan dijumlahkan jika ada paket dengan Registration Key yang sama</li>
            </ol>
          </div>
        </div>
        <div className="mt-4">
          <h4 className="font-medium text-blue-900 mb-1">Catatan:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Pastikan Bearer Token sudah diset di header</li>
            <li>Proses pengecekan nomor membutuhkan waktu tergantung jumlah nomor</li>
            <li><strong>Data paket unik akan dikelompokkan berdasarkan registrationKey atau offerId (kode harus unik)</strong></li>
            <li>Jika ada kode yang sama, hanya akan ditampilkan sekali</li>
            <li>File Excel akan berisi semua paket unik yang ditemukan</li>
            <li>Untuk upload Excel, kolom Parameter bisa berupa JSON string atau akan di-generate otomatis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TriProduksi;
