import React, { useState, useRef } from 'react';
import { useBearerToken } from '../contexts/BearerTokenContext';
import socxApi from '../utils/socxApi';
import apiClient from '../utils/api';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import ProjectManager from '../components/ProjectManager';

const IsimpleProduksi = () => {
  const { bearerToken } = useBearerToken();
  const inputSectionRef = useRef(null);
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
  const [inputMode, setInputMode] = useState('nomor');
  const [savedNumbers, setSavedNumbers] = useState([]);
  const [isLoadingSavedNumbers, setIsLoadingSavedNumbers] = useState(false);
  const [showSavedNumbers, setShowSavedNumbers] = useState(false);

  const indosatStaticDataRaw = [
    // 1 Hari
    { name: "Indosat Freedom Internet 1.5 GB 1 Hari", price: 5850 },
    { name: "Indosat Freedom Internet 2 GB 1 Hari", price: 6770 },
    { name: "Indosat Freedom Internet 3 GB 1 Hari", price: 6900 },
    { name: "Indosat Freedom Internet 10 GB 1 Hari", price: 0 }, // BARU - belum ada harga
    
    // 2 Hari
    { name: "Indosat Freedom Internet 1 GB 2 Hari", price: 5820 },
    { name: "Indosat Freedom Internet 5 GB 2 Hari", price: 8335 },
    
    // 3 Hari
    { name: "Indosat Freedom Internet 1.5 GB 3 Hari", price: 8255 },
    { name: "Indosat Freedom Internet 2.5 GB 3 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 3 GB 3 Hari", price: 11295 },
    { name: "Indosat Freedom Internet 4 GB 3 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 5 GB 3 Hari", price: 12445 },
    { name: "Indosat Freedom Internet 15 GB 3 Hari", price: 20975 },
    
    // 5 Hari
    { name: "Indosat Freedom Internet 2 GB 5 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 2.5 GB 5 Hari", price: 12385 },
    { name: "Indosat Freedom Internet 3 GB 5 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 3.5 GB 5 Hari", price: 13455 },
    { name: "Indosat Freedom Internet 4 GB 5 Hari", price: 13565 },
    { name: "Indosat Freedom Internet 5 GB 5 Hari", price: 16490 },
    { name: "Indosat Freedom Internet 6 GB 5 Hari", price: 16490 },
    { name: "Indosat Freedom Internet 7 GB 5 Hari", price: 18800 },
    { name: "Indosat Freedom Internet 8 GB 5 Hari", price: 21000 },
    { name: "Indosat Freedom Internet 15 GB 5 Hari", price: 0 }, // BARU - belum ada harga
    
    // 7 Hari
    { name: "Indosat Freedom Internet 7 GB 7 Hari", price: 21950 },
    { name: "Indosat Freedom Internet 9 GB 7 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 15 GB 7 Hari", price: 27450 },
    { name: "Indosat Freedom Internet 18 GB 7 Hari", price: 34000 },
    
    // 14 Hari
    { name: "Indosat Freedom Internet 3 GB 14 Hari", price: 19503 },
    
    // 28 Hari
    { name: "Indosat Freedom Internet 1 GB 28 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 1.5 GB 28 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 3 GB 28 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 4 GB 28 Hari", price: 29255 },
    { name: "Indosat Freedom Internet 5 GB 28 Hari", price: 24900 },
    { name: "Indosat Freedom Internet 5.5 GB 28 Hari", price: 28900 },
    { name: "Indosat Freedom Internet 6 GB 28 Hari", price: 28850 },
    { name: "Indosat Freedom Internet 6.5 GB 28 Hari", price: 30375 },
    { name: "Indosat Freedom Internet 7 GB 28 Hari", price: 30410 },
    { name: "Indosat Freedom Internet 8 GB 28 Hari", price: 30900 },
    { name: "Indosat Freedom Internet 9 GB 28 Hari", price: 33475 },
    { name: "Indosat Freedom Internet 10 GB 28 Hari", price: 33485 },
    { name: "Indosat Freedom Internet 12 GB 28 Hari", price: 43850 },
    { name: "Indosat Freedom Internet 13 GB 28 Hari", price: 47000 },
    { name: "Indosat Freedom Internet 14 GB 28 Hari", price: 47425 },
    { name: "Indosat Freedom Internet 15 GB 28 Hari", price: 48600 },
    { name: "Indosat Freedom Internet 16 GB 28 Hari", price: 48700 },
    { name: "Indosat Freedom Internet 18 GB 28 Hari", price: 56000 },
    { name: "Indosat Freedom Internet 20 GB 28 Hari", price: 57000 },
    { name: "Indosat Freedom Internet 25 GB 28 Hari", price: 58950 },
    { name: "Indosat Freedom Internet 28 GB 28 Hari", price: 59400 },
    { name: "Indosat Freedom Internet 30 GB 28 Hari", price: 59150 },
    { name: "Indosat Freedom Internet 35 GB 28 Hari", price: 79600 },
    { name: "Indosat Freedom Internet 42 GB 28 Hari", price: 85750 },
    { name: "Indosat Freedom Internet 50 GB 28 Hari", price: 93260 },
    { name: "Indosat Freedom Internet 80 GB 28 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 90 GB 28 Hari", price: 0 }, // BARU - belum ada harga
    { name: "Indosat Freedom Internet 100 GB 28 Hari", price: 126500 },
    { name: "Indosat Freedom Internet 150 GB 28 Hari", price: 130500 },
    { name: "Indosat Freedom Internet Sensasi 50 GB 28 Hari", price: 80975 },
    { name: "Indosat Freedom Internet Sensasi 100 GB 28 Hari", price: 100775 },
    { name: "Indosat Freedom Internet Sensasi 150 GB 28 Hari", price: 0 } // BARU - belum ada harga
];

  const removeDuplicates = (data) => {
    const seen = new Set();
    return data.filter(item => {
      const key = `${item.name}|${item.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const indosatStaticData = removeDuplicates(indosatStaticDataRaw);

  // Note: IsimpleProduksi menerima data project isimple dari ProjectManager component
  // melalui prop onIsimpleProjectChange
  // IsimpleProduksi TIDAK mengambil sendiri dari API /api/projects/isimple
  // Request ke /api/projects HANYA dilakukan oleh ProjectManager component

  const fetchPaket = async (msisdn) => {
    try {
      const response = await socxApi.socxPost(
        '/api/v1/suppliers_modules/task',
        { id: 40, name: 'isimple', task: 'hot_promo', payload: { msisdn } }
      );
      let list = [];
      if (response.data && response.data.data && response.data.data.list && Array.isArray(response.data.data.list)) {
        list = response.data.data.list;
      } else if (response.data && response.data.list && Array.isArray(response.data.list)) {
        list = response.data.list;
      } else if (response.data && Array.isArray(response.data)) {
        list = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        list = response.data.data;
      }
      return list;
    } catch (error) {
      console.error(`❌ Gagal fetch nomor ${msisdn}:`, error.message);
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
      setProgress({ current: 0, total: nomorArray.length, currentNumber: '' });

      for (let i = 0; i < nomorArray.length; i++) {
        const nomor = nomorArray[i];
        setProgress({ current: i + 1, total: nomorArray.length, currentNumber: nomor });
        const paketList = await fetchPaket(nomor);
        allResults.push({ nomor, paketCount: paketList.length, pakets: paketList });
        paketList.forEach(paket => {
          if (!tempPaketUnik[paket.dnmcode]) {
            tempPaketUnik[paket.dnmcode] = {
              name: paket.name,
              amount: paket.amount,
              type: paket.type,
              typetitle: paket.typetitle,
              dnmcode: paket.dnmcode,
              commision: paket.commision
            };
            tempPaketCount[paket.dnmcode] = 0;
          }
          tempPaketCount[paket.dnmcode] = (tempPaketCount[paket.dnmcode] || 0) + 1;
        });
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
      Swal.fire({ icon: 'error', title: 'Error!', text: 'Terjadi kesalahan saat memproses nomor', confirmButtonText: 'OK' });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadExcel = () => {
    const paketList = Object.values(paketUnik);
    if (paketList.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Perhatian!', text: 'Tidak ada data untuk didownload', confirmButtonText: 'OK' });
      return;
    }

    const paketListWithCount = paketList.map(paket => ({ ...paket, jumlah_nomor: paketCount[paket.dnmcode] || 0 }));
    const worksheet = XLSX.utils.json_to_sheet(paketListWithCount);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Paket Data Unik');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `paket_data_unik_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: `File Excel berhasil didownload: ${fileName}`, confirmButtonText: 'OK' });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
        Swal.fire({ icon: 'warning', title: 'Perhatian!', text: 'Harap pilih file Excel (.xlsx atau .xls)', confirmButtonText: 'OK' });
        return;
      }
      setFile(selectedFile);
    }
  };

  const validateExcelData = (data) => {
    const errors = [];
    const requiredColumns = ['name', 'amount', 'type', 'typetitle', 'dnmcode', 'commision', 'jumlah_nomor'];

    if (data.length === 0) {
      errors.push('File Excel kosong atau tidak memiliki data');
      return { errors, validatedData: [] };
    }

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => {
      const variations = [col, col.toLowerCase(), col.toUpperCase(), col.replace(/_/g, ' ')];
      return !variations.some(variation => firstRow.hasOwnProperty(variation));
    });

    if (missingColumns.length > 0) {
      errors.push(`Kolom yang hilang: ${missingColumns.join(', ')}`);
      return { errors, validatedData: [] };
    }

    const normalizedData = data.map((row, index) => {
      const normalizedRow = {};
      const getColumnValue = (colName) => {
        const variations = [colName, colName.toLowerCase(), colName.toUpperCase(), colName.replace(/_/g, ' ')];
        for (const variation of variations) {
          if (row.hasOwnProperty(variation)) return row[variation];
        }
        return '';
      };

      normalizedRow.name = getColumnValue('name') || '';
      normalizedRow.amount = getColumnValue('amount') || '';
      normalizedRow.type = getColumnValue('type') || '';
      normalizedRow.typetitle = getColumnValue('typetitle') || '';
      normalizedRow.dnmcode = getColumnValue('dnmcode') || '';
      normalizedRow.commission = getColumnValue('commision') || '';
      normalizedRow.jumlahNomor = getColumnValue('jumlah_nomor') || 0;

      if (!normalizedRow.dnmcode) errors.push({ row: index + 2, errors: ['dnmcode harus diisi'] });

      return normalizedRow;
    }).filter(Boolean);

    return { errors, validatedData: normalizedData };
  };

  const processExcelFile = async () => {
    if (!file) {
      Swal.fire({ icon: 'warning', title: 'Perhatian!', text: 'Harap pilih file Excel terlebih dahulu', confirmButtonText: 'OK' });
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
          } catch (error) { reject(error); }
        };
        reader.onerror = reject;
        reader.readAsBinaryString(file);
      });

      const { errors, validatedData } = validateExcelData(data);

      if (errors.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Error Validasi!',
          html: `Terjadi kesalahan validasi:<br/>${errors.map(e => typeof e === 'string' ? e : `Baris ${e.row}: ${e.errors.join(', ')}`).join('<br/>')}`,
          confirmButtonText: 'OK'
        });
        setIsUploading(false);
        return;
      }

      const tempPaketUnik = {};
      const tempPaketCount = {};

      validatedData.forEach(row => {
        const key = row.dnmcode;
        if (key) {
          if (!tempPaketUnik[key]) {
            tempPaketUnik[key] = { name: row.name || '', amount: row.amount || '', type: row.type || '', typetitle: row.typetitle || '', dnmcode: row.dnmcode || '', commision: row.commission || '' };
            tempPaketCount[key] = 0;
          }
          const jumlahNomor = Number(row.jumlahNomor) || 0;
          tempPaketCount[key] = (tempPaketCount[key] || 0) + jumlahNomor;
        }
      });

      setPaketUnik(tempPaketUnik);
      setPaketCount(tempPaketCount);
      setShowResults(true);
      setFile(null);

      Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Berhasil memproses ${validatedData.length} baris data`, confirmButtonText: 'OK' });
    } catch (error) {
      console.error('Error processing file:', error);
      Swal.fire({ icon: 'error', title: 'Error!', text: `Terjadi kesalahan: ${error.message}`, confirmButtonText: 'OK' });
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

  const getDisplayData = () => {
    let paketArray = Object.values(paketUnik);
    if (searchPaket.trim()) {
      const searchTerm = searchPaket.toLowerCase();
      paketArray = paketArray.filter(paket => paket.name.toLowerCase().includes(searchTerm) || paket.dnmcode.toLowerCase().includes(searchTerm) || paket.type.toLowerCase().includes(searchTerm));
    }
    paketArray = sortData(paketArray, sortConfig);
    if (showAllPaket) return paketArray;
    const startIndex = (currentPagePaket - 1) * paketPerPage;
    const endIndex = startIndex + paketPerPage;
    return paketArray.slice(startIndex, endIndex);
  };

  const getDisplayResults = () => {
    let resultsData = [...results];
    resultsData = sortData(resultsData, sortConfigResults);
    if (showAllResults) return resultsData;
    const startIndex = (currentPageResults - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    return resultsData.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    let paketArray = Object.values(paketUnik);
    if (searchPaket.trim()) {
      const searchTerm = searchPaket.toLowerCase();
      paketArray = paketArray.filter(paket => paket.name.toLowerCase().includes(searchTerm) || paket.dnmcode.toLowerCase().includes(searchTerm));
    }
    return Math.ceil(paketArray.length / paketPerPage);
  };

  const getTotalPagesResults = () => Math.ceil(results.length / resultsPerPage);

  const handlePageChange = (page) => setCurrentPagePaket(page);
  const handlePageChangeResults = (page) => setCurrentPageResults(page);

  const toggleShowAll = () => { setShowAllPaket(!showAllPaket); setCurrentPagePaket(1); };
  const toggleShowAllResults = () => { setShowAllResults(!showAllResults); setCurrentPageResults(1); };

  const sortData = (data, config) => {
    if (!config.key) return data;
    return [...data].sort((a, b) => {
      let aValue = a[config.key];
      let bValue = b[config.key];
      if (config.key === 'paketCount') { aValue = a.paketCount; bValue = b.paketCount; }
      if (config.key === 'jumlah_nomor') { aValue = paketCount[a.dnmcode] || 0; bValue = paketCount[b.dnmcode] || 0; }
      if (typeof aValue === 'string') { aValue = aValue.toLowerCase(); bValue = bValue.toLowerCase(); }
      if (aValue < bValue) return config.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSortResults = (key) => {
    let direction = 'asc';
    if (sortConfigResults.key === key && sortConfigResults.direction === 'asc') direction = 'desc';
    setSortConfigResults({ key, direction });
  };

  const getSortIcon = (key, config) => {
    if (config.key !== key) return <span className="text-gray-400">↕</span>;
    return config.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  const extractPackageInfo = (packageName) => {
    const gbMatch = packageName.match(/(\d+(?:\.\d+)?)\s*GB/i);
    const dayMatch = packageName.match(/(\d+)\s*Hari/i);
    return { gb: gbMatch ? parseFloat(gbMatch[1]) : 0, days: dayMatch ? parseInt(dayMatch[1]) : 0 };
  };

  const comparePackages = () => {
    const matched = [];
    const paketArray = Object.values(paketUnik);
    const dataToCompare = staticData.length > 0 ? staticData : indosatStaticData;

    dataToCompare.forEach(staticItem => {
      const staticInfo = extractPackageInfo(staticItem.name);
      const matchingPackages = [];
      const seenPackages = new Set();

      paketArray.forEach(paket => {
        const packageInfo = extractPackageInfo(paket.name);
        if (packageInfo.gb >= staticInfo.gb && packageInfo.days >= staticInfo.days && paket.amount <= staticItem.price) {
          const packageKey = `${paket.name}|${paket.dnmcode}`;
          if (!seenPackages.has(packageKey)) {
            seenPackages.add(packageKey);
            matchingPackages.push({ packageName: paket.name, packageCode: paket.dnmcode, packageAmount: paket.amount, packageType: paket.type, packageTypeTitle: paket.typetitle, packageCommission: paket.commision, packageCount: paketCount[paket.dnmcode] || 0, packageInfo, savings: staticItem.price - paket.amount });
          }
        }
      });

      if (matchingPackages.length > 0) {
        matched.push({ staticName: staticItem.name, staticPrice: staticItem.price, staticInfo, matchingPackages, totalMatches: matchingPackages.length });
      }
    });

    setMatchedPackages(matched);
  };

  const displayStaticData = () => {
    setStaticData(indosatStaticData);
    setEditableStaticData(indosatStaticData.map(item => ({ ...item, id: Math.random().toString(36).substr(2, 9) })));
  };

  const updateStaticPrice = (id, newPrice) => {
    setEditableStaticData(prevData => prevData.map(item => item.id === id ? { ...item, price: parseFloat(newPrice) || 0 } : item));
  };

  const formatPriceInput = (value) => value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const parseFormattedPrice = (formattedValue) => parseInt(formattedValue.replace(/\./g, '')) || 0;

  const useEditedStaticData = () => {
    setStaticData(editableStaticData);
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Data harga pasaran telah diupdate', confirmButtonText: 'OK' });
  };

  const fetchSavedNumbers = async () => {
    if (!bearerToken) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Harap set Bearer Token terlebih dahulu',
        confirmButtonText: 'OK'
      });
      return;
    }
    setIsLoadingSavedNumbers(true);
    try {
      const response = await apiClient.get('/isimple-numbers');
      setSavedNumbers(response.data || []);
      setShowSavedNumbers(true);
    } catch (error) {
      console.error('Error fetching saved numbers:', error);
      Swal.fire({ icon: 'error', title: 'Error!', text: 'Gagal memuat nomor yang tersimpan', confirmButtonText: 'OK' });
    } finally {
      setIsLoadingSavedNumbers(false);
    }
  };


  const saveNumbersToDatabase = async () => {
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
        text: 'Tidak ada nomor untuk disimpan',
        confirmButtonText: 'OK'
      });
      return;
    }
    const nomorArray = nomorList.trim().split('\n').map(n => n.trim()).filter(n => n);
    try {
      await apiClient.post('/isimple-numbers/batch', { numbers: nomorArray });
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${nomorArray.length} nomor berhasil disimpan`, confirmButtonText: 'OK' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error!', text: 'Gagal menyimpan nomor', confirmButtonText: 'OK' });
    }
  };

  const loadSavedNumbersToTextarea = () => {
    const numbersText = savedNumbers.map(item => item.number).join('\n');
    setNomorList(numbersText);
    setShowSavedNumbers(false);
    setInputMode('nomor');
    Swal.fire({ icon: 'success', title: 'Berhasil!', text: `${savedNumbers.length} nomor berhasil dimuat`, confirmButtonText: 'OK' });
  };

  const deleteSavedNumber = async (id) => {
    try {
      await apiClient.delete(`/isimple-numbers/${id}`);
      setSavedNumbers(savedNumbers.filter(item => item.id !== id));
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Nomor berhasil dihapus', confirmButtonText: 'OK' });
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error!', text: 'Gagal menghapus nomor', confirmButtonText: 'OK' });
    }
  };


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Back Button */}
      <div className="flex justify-between items-center">
        <button onClick={() => window.history.back()} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Kembali ke Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">📱 Isimple Produksi</h1>
        <p className="text-lg text-gray-600">Cek paket data unik berdasarkan nomor telepon</p>
      </div>

      {/* Projects Management Component */}
      <ProjectManager 
        selectedProject={selectedProject}
        onIsimpleProjectChange={handleProjectChange}
      />

      {/* Daftar Nomor HP untuk Pengecekan */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">📋 Daftar Nomor HP</h2>
          <div className="flex items-center space-x-2">
            <button onClick={fetchSavedNumbers} disabled={!bearerToken || isLoadingSavedNumbers} className={`px-4 py-2 text-sm font-medium rounded-md ${!bearerToken || isLoadingSavedNumbers ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {isLoadingSavedNumbers ? 'Memuat...' : '🔄 Refresh'}
            </button>
            <button onClick={() => setShowSavedNumbers(true)} disabled={!bearerToken} className={`px-4 py-2 text-sm font-medium rounded-md ${!bearerToken ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {showSavedNumbers ? '✕ Tutup' : '📂 Lihat Semua'}
            </button>
          </div>
        </div>
        
        {isLoadingSavedNumbers && savedNumbers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : savedNumbers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nomor HP
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {savedNumbers.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-800">
                        {item.number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'processed' 
                          ? 'bg-green-100 text-green-800' 
                          : item.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status ? item.status.toUpperCase() : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setNomorList(item.number);
                            setInputMode('nomor');
                            if (inputSectionRef.current) {
                              inputSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Cek
                        </button>
                        <button
                          onClick={() => deleteSavedNumber(item.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada nomor</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tambahkan nomor untuk mulai pengecekan
            </p>
          </div>
        )}
      </div>

      {/* Bearer Token Check */}
      {!bearerToken && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414-1.414L11.414 10l1.293 1.293a1 1 0 01-2 828l8.586-8.586z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Bearer Token Required</h3>
              <p className="text-sm text-red-700 mt-1">Please set your Bearer Token in header to use this feature.</p>
            </div>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div ref={inputSectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Input Data Isimple Produksi</h2>
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => { setInputMode('nomor'); setFile(null); const fileInput = document.getElementById('excel-file'); if (fileInput) fileInput.value = ''; }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${inputMode === 'nomor' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                📱 Cek Nomor
              </button>
              <button
                onClick={() => { setInputMode('excel'); setNomorList(''); }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${inputMode === 'excel' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                📊 Upload Excel
              </button>
            </nav>
          </div>
        </div>

        {inputMode === 'nomor' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="nomor-list" className="block text-sm font-medium text-gray-700 mb-2">Daftar Nomor (satu nomor per baris)</label>
              <textarea
                id="nomor-list"
                value={nomorList}
                onChange={(e) => setNomorList(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Masukkan nomor telepon, satu nomor per baris&#10;Contoh:&#10;085794083659&#10;081617409145"
              />
              <p className="text-sm text-gray-500 mt-1">Masukkan nomor telepon yang akan dicek, satu nomor per baris</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={processNumbers}
                disabled={!bearerToken || isProcessing || !nomorList.trim()}
                className={`px-6 py-2 rounded-md font-medium ${!bearerToken || isProcessing || !nomorList.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
              >
                {isProcessing ? 'Memproses...' : 'Cek Nomor'}
              </button>
              <button onClick={resetForm} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50">Reset</button>
            </div>
          </div>
        )}

        {inputMode === 'excel' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="excel-file" className="block text-sm font-medium text-gray-700 mb-2">Upload File Excel</label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  id="excel-file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">File Excel harus memiliki kolom: name, amount, type, typetitle, dnmcode, commision, jumlah_nomor</p>
              {file && <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md"><p className="text-sm text-green-800">✓ File dipilih: <span className="font-semibold">{file.name}</span></p></div>}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={processExcelFile}
                disabled={!bearerToken || isUploading || !file}
                className={`px-6 py-2 rounded-md font-medium ${!bearerToken || isUploading || !file ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
              >
                {isUploading ? 'Memproses...' : 'Proses Excel'}
              </button>
              <button onClick={() => { setFile(null); const fileInput = document.getElementById('excel-file'); if (fileInput) fileInput.value = ''; }} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50">Batal</button>
              <button onClick={resetForm} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50">Reset</button>
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
              <span className="text-sm text-gray-600">{progress.current} dari {progress.total} nomor</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Sedang mengecek: <span className="font-semibold text-blue-600">{progress.currentNumber}</span></p>
            <p className="text-xs text-gray-500 mt-1">Mohon tunggu, proses ini membutuhkan waktu...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">2. Hasil Pengecekan</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{showAllResults ? `Menampilkan semua ${results.length} hasil` : `Menampilkan ${getDisplayResults().length} dari ${results.length} hasil`}</span>
              <button onClick={toggleShowAllResults} className={`px-4 py-2 text-sm font-medium rounded-md ${showAllResults ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                {showAllResults ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}
              </button>
              <button onClick={downloadExcel} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">📥 Download Excel</button>
            </div>
          </div>

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
              <p className="text-2xl font-bold text-purple-900">{results.reduce((sum, result) => sum + result.paketCount, 0)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSortResults('nomor')}>
                    <div className="flex items-center space-x-1"><span>Nomor</span>{getSortIcon('nomor', sortConfigResults)}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSortResults('paketCount')}>
                    <div className="flex items-center space-x-1"><span>Jumlah Paket</span>{getSortIcon('paketCount', sortConfigResults)}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getDisplayResults().map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.nomor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{result.paketCount} paket</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${result.paketCount > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.paketCount > 0 ? 'Berhasil' : 'Tidak ada paket'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!showAllResults && getTotalPagesResults() > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">Halaman {currentPageResults} dari {getTotalPagesResults()}</div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handlePageChangeResults(currentPageResults - 1)} disabled={currentPageResults === 1} className={`px-3 py-1 text-sm font-medium rounded-md ${currentPageResults === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Sebelumnya</button>
                {Array.from({ length: Math.min(5, getTotalPagesResults()) }, (_, i) => {
                  const startPage = Math.max(1, currentPageResults - 2);
                  const pageNum = startPage + i;
                  if (pageNum > getTotalPagesResults()) return null;
                  return <button key={pageNum} onClick={() => handlePageChangeResults(pageNum)} className={`px-3 py-1 text-sm font-medium rounded-md ${currentPageResults === pageNum ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>{pageNum}</button>;
                })}
                <button onClick={() => handlePageChangeResults(currentPageResults + 1)} disabled={currentPageResults === getTotalPagesResults()} className={`px-3 py-1 text-sm font-medium rounded-md ${currentPageResults === getTotalPagesResults() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showResults && Object.keys(paketUnik).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">3. Paket Unik Ditemukan</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{showAllPaket ? `Menampilkan semua ${Object.keys(paketUnik).length} paket` : `Menampilkan ${getDisplayData().length} dari ${Object.keys(paketUnik).length} paket`}</span>
              <button onClick={toggleShowAll} className={`px-4 py-2 text-sm font-medium rounded-md ${showAllPaket ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                {showAllPaket ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}
              </button>
              <button onClick={downloadExcel} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">📥 Download Excel</button>
            </div>
          </div>
          <div className="mb-4">
            <div className="relative">
              <input type="text" placeholder="🔍 Cari paket..." value={searchPaket} onChange={(e) => setSearchPaket(e.target.value)} className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-400">🔍</span></div>
              {searchPaket && <button onClick={() => setSearchPaket('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">✕</button>}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}><div className="flex items-center space-x-1"><span>Nama Paket</span>{getSortIcon('name', sortConfig)}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('dnmcode')}><div className="flex items-center space-x-1"><span>DNM Code</span>{getSortIcon('dnmcode', sortConfig)}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('amount')}><div className="flex items-center space-x-1"><span>Amount</span>{getSortIcon('amount', sortConfig)}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}><div className="flex items-center space-x-1"><span>Type</span>{getSortIcon('type', sortConfig)}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('typetitle')}><div className="flex items-center space-x-1"><span>Type Title</span>{getSortIcon('typetitle', sortConfig)}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('commision')}><div className="flex items-center space-x-1"><span>Commission</span>{getSortIcon('commision', sortConfig)}</div></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('jumlah_nomor')}><div className="flex items-center space-x-1"><span>Jumlah Nomor</span>{getSortIcon('jumlah_nomor', sortConfig)}</div></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getDisplayData().map((paket, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-300"><div className="max-w-xs truncate" title={paket.name}>{paket.name}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{paket.dnmcode}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><span className="font-semibold">Rp {paket.amount.toLocaleString('id-ID')}</span></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{paket.type}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><div className="max-w-xs truncate" title={paket.typetitle}>{paket.typetitle}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{paket.commision}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{paketCount[paket.dnmcode] || 0} nomor</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAllPaket && getTotalPages() > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">Halaman {currentPagePaket} dari {getTotalPages()}</div>
              <div className="flex items-center space-x-2">
                <button onClick={() => handlePageChange(currentPagePaket - 1)} disabled={currentPagePaket === 1} className={`px-3 py-1 text-sm font-medium rounded-md ${currentPagePaket === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Sebelumnya</button>
                {Array.from({ length: Math.min(5, getTotalPages()) }, (_, i) => {
                  const startPage = Math.max(1, currentPagePaket - 2);
                  const pageNum = startPage + i;
                  if (pageNum > getTotalPages()) return null;
                  return <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`px-3 py-1 text-sm font-medium rounded-md ${currentPagePaket === pageNum ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>{pageNum}</button>;
                })}
                <button onClick={() => handlePageChange(currentPagePaket + 1)} disabled={currentPagePaket === getTotalPages()} className={`px-3 py-1 text-sm font-medium rounded-md ${currentPagePaket === getTotalPages() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Selanjutnya</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">4. Data Harga Pasaran Indosat</h2>
            <button onClick={displayStaticData} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">📋 Tampilkan Data Harga Pasaran</button>
          </div>
          {editableStaticData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Anda dapat mengubah harga pasaran di bawah ini.</p>
                <button onClick={useEditedStaticData} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">💾 Terapkan Perubahan</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Nama Paket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga Pasaran (Rp) - Dapat Diedit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editableStaticData.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><div className="max-w-xs truncate" title={item.name}>{item.name}</div></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <input type="text" value={item.price.toLocaleString('id-ID')} onChange={(e) => { const formattedValue = formatPriceInput(e.target.value); const numericValue = parseFormattedPrice(formattedValue); updateStaticPrice(item.id, numericValue); }} className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <span className="text-xs text-gray-500">(Rp {item.price.toLocaleString('id-ID')})</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {showResults && Object.keys(paketUnik).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">5. Paket yang Cocok dengan Harga Pasaran</h2>
            <button onClick={comparePackages} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">🔍 Bandingkan Paket</button>
          </div>
          {matchedPackages.length > 0 && (
            <div className="space-y-6">
              {matchedPackages.map((match, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-semibold text-gray-900">{index + 1}. {match.staticName}</h3>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Harga Pasaran: Rp {match.staticPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{match.staticInfo.gb} GB, {match.staticInfo.days} Hari</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{match.totalMatches} paket cocok</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Nama Paket</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Kode Paket</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Harga Paket</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Penghematan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Jumlah Nomor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {match.matchingPackages.map((packageItem, packageIndex) => (
                          <tr key={packageIndex} className={packageIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{packageIndex + 1}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><div className="max-w-xs truncate" title={packageItem.packageName}>{packageItem.packageName}</div></td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{packageItem.packageCode}</span></td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><span className="font-semibold">Rp {packageItem.packageAmount.toLocaleString('id-ID')}</span></td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Rp {packageItem.savings.toLocaleString('id-ID')}</span></td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300"><span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{packageItem.packageCount} nomor</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
          {matchedPackages.length === 0 && <div className="text-center py-8"><p className="text-gray-500">Belum ada paket yang dibandingkan.</p></div>}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">💾 Nomor Tersimpan</h2>
          <div className="flex items-center space-x-4">
            {!showSavedNumbers ? (
              <button onClick={fetchSavedNumbers} disabled={!bearerToken || isLoadingSavedNumbers} className={`px-4 py-2 text-sm font-medium rounded-md ${!bearerToken || isLoadingSavedNumbers ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                {isLoadingSavedNumbers ? 'Memuat...' : '📂 Lihat Tersimpan'}
              </button>
            ) : (
              <button onClick={() => setShowSavedNumbers(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200">✕ Tutup</button>
            )}
            <button onClick={saveNumbersToDatabase} disabled={!bearerToken || !nomorList.trim()} className={`px-4 py-2 text-sm font-medium rounded-md ${!bearerToken || !nomorList.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}>
              💾 Simpan Nomor
            </button>
          </div>
        </div>
        {showSavedNumbers && (
          <div>
            {isLoadingSavedNumbers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            ) : savedNumbers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Nomor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Jumlah Paket</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Tanggal Dibuat</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-300">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {savedNumbers.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300 font-medium">{item.number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-gray-300">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : item.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{item.packet_count || 0} paket</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-300">{new Date(item.created_at).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center space-x-2">
                            <button onClick={() => { setNomorList(item.number); setInputMode('nomor'); }} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200">📝 Edit</button>
                            <button onClick={() => deleteSavedNumber(item.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">🗑️ Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {savedNumbers.length > 0 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">Total {savedNumbers.length} nomor tersimpan</p>
                    <button onClick={loadSavedNumbersToTextarea} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">📝 Muat Semua ke Textarea</button>
                  </div>
                )}
              </div>
            ) : <div className="text-center py-8"><p className="text-gray-500">Belum ada nomor yang tersimpan</p></div>}
          </div>
        )}
      </div>

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
              <li>Upload file Excel dengan kolom: name, amount, type, typetitle, dnmcode, commision, jumlah_nomor</li>
              <li>Klik tombol "Proses Excel" untuk memproses data</li>
              <li>Data akan langsung ditampilkan sebagai paket unik</li>
            <li>Jumlah Nomor akan dijumlahkan jika ada paket dengan DNM Code yang sama</li>
            </ol>
          </div>
        </div>
        <div className="mt-4">
          <h4 className="font-medium text-blue-900 mb-1">Catatan:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>Pastikan Bearer Token sudah diset di header</li>
            <li>Proses pengecekan nomor membutuhkan waktu tergantung jumlah nomor</li>
            <li>Data paket unik akan dikelompokkan berdasarkan dnmcode (kode harus unik)</li>
            <li>Jika ada kode yang sama, hanya akan ditampilkan sekali</li>
            <li>File Excel akan berisi semua paket unik yang ditemukan</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IsimpleProduksi;