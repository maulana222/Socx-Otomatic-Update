import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';
import apiClient from '../utils/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

const IsimpleProducts = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { bearerToken } = useBearerToken();
  const [project, setProject] = useState(null);
  const [products, setProducts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ gb: '', days: '', price: '', category: 'harian' });
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [promoProgress, setPromoProgress] = useState(0);  
  const [totalPhones, setTotalPhones] = useState(0);
  const [currentCheckingNumber, setCurrentCheckingNumber] = useState(null);
  const progressIntervalRef = useRef(null);
  const [referencePrices, setReferencePrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [expandedPriceId, setExpandedPriceId] = useState(null);
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [savingAllPrices, setSavingAllPrices] = useState(false);
  const [deletingPriceId, setDeletingPriceId] = useState(null);
  const [savingPromoToSocxId, setSavingPromoToSocxId] = useState(null);
  const [updatingAllPromosToSocxId, setUpdatingAllPromosToSocxId] = useState(null);
  const [productCategoryTab, setProductCategoryTab] = useState('harian'); // 'harian' | 'bulanan' | 'sensasi'
  const [promoExistsInSuppliers, setPromoExistsInSuppliers] = useState(new Map()); // Map<product_code, boolean> - cek apakah promo ada di suppliers_products
  const [checkingPromoExists, setCheckingPromoExists] = useState(null); // product id yang sedang dicek
  const [promoCountsByCode, setPromoCountsByCode] = useState({}); // { product_code: jumlah_nomor } dari request saat dropdown expand
  const [totalNumbersForRate, setTotalNumbersForRate] = useState(0); // total nomor di project untuk hitung rate %
  const [loadingPromoCounts, setLoadingPromoCounts] = useState(false);
  const [promoColumnMode, setPromoColumnMode] = useState('angka'); // 'angka' | 'rate' untuk kolom Jumlah Nomor / Rate

  const fetchProducts = useCallback(async () => {
    if (!bearerToken || !projectId) return;
    try {
      const response = await apiClient.get(`/isimple-numbers/project/${projectId}/with-promos`, {
        timeout: 120000
      });
      setProducts(response.data || []);
      setProject(response.project || null);
    } catch (error) {
      console.error('Error fetching products:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Gagal memuat daftar nomor dan hasil pengecekan. Cek koneksi atau coba lagi.',
        confirmButtonText: 'OK'
      });
    }
  }, [bearerToken, projectId]);

  const fetchReferencePrices = useCallback(async () => {
    if (!bearerToken) return;
    setLoadingPrices(true);
    try {
      const res = await apiClient.get('/isimple-products');
      setReferencePrices((res && res.data) || []);
    } catch (e) {
      console.error('Error fetching harga pasaran:', e);
    } finally {
      setLoadingPrices(false);
    }
  }, [bearerToken]);

  useEffect(() => {
    if (bearerToken && projectId) {
      fetchProducts();
    }
  }, [bearerToken, projectId, fetchProducts]);

  useEffect(() => {
    if (bearerToken) fetchReferencePrices();
  }, [bearerToken, fetchReferencePrices]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Poll progress (dipakai saat mulai cek dan saat reconnect setelah refresh)
  const pollPromoProgress = useCallback(async () => {
    try {
      const prog = await apiClient.get('/isimple-promo-check/check-all/progress');
      const d = prog.data || prog;
      setPromoProgress(d.processed || 0);
      setCurrentCheckingNumber(d.currentNumber || null);
      if (d.status === 'idle') {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setIsCheckingPromo(false);
        setCurrentCheckingNumber(null);
      Swal.fire({
          icon: 'success',
          title: 'Selesai!',
          text: `Semua ${d.total || 0} nomor telah diperiksa.`,
        confirmButtonText: 'OK'
      });
        await fetchProducts();
      } else if (d.status === 'stopped') {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setIsCheckingPromo(false);
        setCurrentCheckingNumber(null);
        Swal.fire({
          icon: 'info',
          title: 'Dihentikan',
          text: `Proses dihentikan. ${d.processed || 0} dari ${d.total || 0} nomor sudah dicek.`,
          confirmButtonText: 'OK'
        });
        await fetchProducts();
      }
    } catch (e) {
      console.error('Poll progress error:', e);
    }
  }, [fetchProducts]);

  // Saat halaman dimuat/refresh: cek apakah ada proses cek promo yang masih berjalan di backend
  useEffect(() => {
    if (!bearerToken || !projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const prog = await apiClient.get('/isimple-promo-check/check-all/progress');
        const d = prog.data || prog;
        if (cancelled) return;
        if (d.status === 'running' && !progressIntervalRef.current) {
          setIsCheckingPromo(true);
          setTotalPhones(d.total || 0);
          setPromoProgress(d.processed || 0);
          setCurrentCheckingNumber(d.currentNumber || null);
          progressIntervalRef.current = setInterval(pollPromoProgress, 1200);
          pollPromoProgress();
        }
      } catch (e) {
        if (!cancelled) console.error('Cek progress on load:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [bearerToken, projectId, pollPromoProgress]);

  // Parse GB dan Hari dari nama paket (sama seperti IsimpleProduksi)
  const extractPackageInfo = (packageName) => {
    if (!packageName || typeof packageName !== 'string') return { gb: 0, days: 0 };
    const gbMatch = packageName.match(/(\d+(?:\.\d+)?)\s*GB/i);
    const dayMatch = packageName.match(/(\d+)\s*Hari/i);
    return {
      gb: gbMatch ? parseFloat(gbMatch[1]) : 0,
      days: dayMatch ? parseInt(dayMatch[1], 10) : 0
    };
  };

  // Kategori produk: Harian (< 28 hari), Bulanan (28–30 hari), Sensasi (nama mengandung "Sensasi")
  const getProductCategory = (product) => {
    if (!product || !product.name) return 'harian';
    const name = String(product.name);
    if (name.toLowerCase().includes('sensasi')) return 'sensasi';
    const { days } = extractPackageInfo(name);
    if (days < 28) return 'harian';
    if (days >= 28 && days <= 30) return 'bulanan';
    return 'bulanan'; // > 30 atau tidak ter-parse → tampilkan di Bulanan
  };

  const filteredReferencePrices = referencePrices.filter((p) => getProductCategory(p) === productCategoryTab);

  // Urutan tampilan: Hari (naik) lalu Paket/GB (naik)
  const sortedReferencePrices = useMemo(() => {
    return [...filteredReferencePrices].sort((a, b) => {
      const ai = extractPackageInfo(a.name);
      const bi = extractPackageInfo(b.name);
      if (ai.days !== bi.days) return ai.days - bi.days;
      return ai.gb - bi.gb;
    });
  }, [filteredReferencePrices]);

  // Flatten semua promo sekali (hindari recompute per-row)
  const allPromos = useMemo(() => {
    return products.flatMap((n) => (n.promos || []).map((promo) => ({ ...promo })));
  }, [products]);

  // Jumlah nomor (distinct) per product_code dari data products (nomor + promos)
  const jumlahNomorByProductCode = useMemo(() => {
    const map = {};
    products.forEach((n) => {
      const numberId = n.id;
      (n.promos || []).forEach((promo) => {
        const code = promo.product_code ? String(promo.product_code).trim() : '';
        if (!code) return;
        if (!map[code]) map[code] = new Set();
        map[code].add(numberId);
      });
    });
    const result = {};
    Object.keys(map).forEach((code) => { result[code] = map[code].size; });
    return result;
  }, [products]);

  // Promo masuk ke produk harga pasar jika: GB >= produk, Hari >= produk, Harga promo <= harga pasar
  // Deduplikasi per product_code (satu kode bisa muncul di banyak nomor; tampilkan sekali saja)
  const getMatchingPromosForProduct = (product) => {
    const staticInfo = extractPackageInfo(product.name);
    const marketPrice = Number(product.price || 0);
    const seen = new Set();
    return allPromos.filter((promo) => {
      const info = extractPackageInfo(promo.product_name || '');
      const amount = Number(promo.product_amount || 0);
      const match = info.gb >= staticInfo.gb && info.days >= staticInfo.days && amount <= marketPrice && marketPrice > 0;
      if (!match) return false;
      const key = promo.product_code || `${promo.product_name}|${promo.product_amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const updateReferencePriceLocally = (id, value) => {
    const num = typeof value === 'string' ? (value.replace(/\D/g, '') ? parseInt(value.replace(/\D/g, ''), 10) : 0) : Number(value) || 0;
    setReferencePrices((prev) => prev.map((p) => (p.id === id ? { ...p, price: num } : p)));
  };

  const updateSocxCodeLocally = (id, value) => {
    setReferencePrices((prev) => prev.map((p) => (p.id === id ? { ...p, socx_code: value } : p)));
  };

  const saveReferencePrice = async (id) => {
    const p = referencePrices.find((r) => r.id === id);
    if (!p) return;
    setSavingPriceId(id);
    try {
      await apiClient.put(`/isimple-products/${id}`, { price: p.price, socx_code: p.socx_code ?? '' });
      Swal.fire({ icon: 'success', title: 'Tersimpan', text: 'Harga dan Kode SOCX berhasil disimpan', confirmButtonText: 'OK' });
      await fetchReferencePrices();
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message || 'Gagal menyimpan', confirmButtonText: 'OK' });
    } finally {
      setSavingPriceId(null);
    }
  };

  const saveAllReferencePrices = async () => {
    if (!referencePrices.length) return;
    setSavingAllPrices(true);
    try {
      let ok = 0;
      let fail = 0;
      for (const p of referencePrices) {
        if (p.id == null) continue;
        try {
          await apiClient.put(`/isimple-products/${p.id}`, { price: p.price });
          ok++;
        } catch (e) {
          console.error(e);
          fail++;
        }
      }
      await fetchReferencePrices();
      if (fail > 0) {
        Swal.fire({ icon: 'warning', title: 'Selesai', text: `Tersimpan: ${ok}, Gagal: ${fail}`, confirmButtonText: 'OK' });
      } else {
        Swal.fire({ icon: 'success', title: 'Tersimpan', text: `Semua harga (${ok}) berhasil disimpan`, confirmButtonText: 'OK' });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message || 'Gagal menyimpan', confirmButtonText: 'OK' });
    } finally {
      setSavingAllPrices(false);
    }
  };

  const deleteReferencePrice = async (id) => {
    const p = referencePrices.find((r) => r.id === id);
    if (!p) return;
    const { value: confirmed } = await Swal.fire({
      icon: 'warning',
      title: 'Hapus produk?',
      text: `"${(p.name || '').slice(0, 50)}${(p.name && p.name.length > 50) ? '...' : ''}" akan dihapus dari daftar harga pasar.`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, hapus'
    });
    if (!confirmed) return;
    setDeletingPriceId(id);
    try {
      await apiClient.delete(`/isimple-products/${id}`);
      await fetchReferencePrices();
      Swal.fire({ icon: 'success', title: 'Terhapus', text: 'Produk dihapus dari daftar harga pasar', confirmButtonText: 'OK' });
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.message || 'Gagal menghapus', confirmButtonText: 'OK' });
    } finally {
      setDeletingPriceId(null);
    }
  };

  const handleSavePromoToSocx = async (promo) => {
    if (!promo?.product_code) return;
    const numberRow = products.find((n) => n.id === promo.isimple_number_id);
    const msisdn = numberRow?.number;
    if (!msisdn) {
      Swal.fire({
        icon: 'warning',
        title: 'Nomor tidak ditemukan',
        text: 'Data nomor untuk promo ini tidak tersedia. Refresh halaman dan coba lagi.',
        confirmButtonText: 'OK'
      });
      return;
    }
    setSavingPromoToSocxId(promo.id);
    try {
      await apiClient.request('/socx/apply-promo', {
        method: 'POST',
        body: JSON.stringify({
          msisdn,
          product_code: promo.product_code,
          product_name: promo.product_name || undefined,
          product_amount: promo.product_amount != null ? Number(promo.product_amount) : undefined
        })
      });
      Swal.fire({ icon: 'success', title: 'Terkirim ke SOCX', text: 'Promo berhasil dikirim ke SOCX.', confirmButtonText: 'OK' });
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Gagal mengirim ke SOCX';
      Swal.fire({ icon: 'error', title: 'Gagal', text: msg, confirmButtonText: 'OK' });
    } finally {
      setSavingPromoToSocxId(null);
    }
  };

  const handleUpdateAllPromosToSocx = async (product) => {
    const matchingPromos = getMatchingPromosForProduct(product);
    if (!matchingPromos.length) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak ada promo',
        text: 'Tidak ada promo yang masuk ke produk ini. Cek nomor dulu atau naikkan harga pasar.',
        confirmButtonText: 'OK'
      });
      return;
    }
    const socxCode = product?.socx_code != null ? String(product.socx_code).trim() : '';
    if (!socxCode) {
      Swal.fire({
        icon: 'warning',
        title: 'Kode SOCX kosong',
        text: 'Isi dulu kolom Kode SOCX (mis: IF14, IDF10), lalu klik update lagi.',
        confirmButtonText: 'OK'
      });
      return;
    }
    setUpdatingAllPromosToSocxId(product.id);
    try {
      const promosPayload = matchingPromos.map((promo) => ({
        product_code: promo.product_code,
        product_name: promo.product_name,
        product_amount: promo.product_amount != null ? Number(promo.product_amount) : 0
      }));

      const resp = await apiClient.request('/socx/isimple/sync-product-prices', {
        method: 'POST',
        body: JSON.stringify({
          socx_code: socxCode,
          promos: promosPayload,
          suppliers_id: 35 // iSimple supplier ID di SOCX
        })
      });

      const s = resp?.summary;
      Swal.fire({
        icon: 'success',
        title: 'Selesai sync ke SOCX',
        text: s
          ? `Match: ${s.matched}/${s.input_promos}, Update: ${s.updated_suppliers}, Created: ${s.created || 0}, Skip: ${s.skipped_suppliers}, Not found: ${s.not_found}, Harga produk (max): ${s.max_price}`
          : 'Sync selesai.',
        confirmButtonText: 'OK'
      });
    } finally {
      setUpdatingAllPromosToSocxId(null);
    }
  };

  const checkPromosInSuppliers = useCallback(async (productId, promos) => {
    if (!promos || promos.length === 0) {
      console.log('[Check Promos] No promos to check for product:', productId);
      return;
    }
    console.log('[Check Promos] Starting check for product:', productId, 'Promos:', promos.map(p => p.product_code));
    setCheckingPromoExists(productId);
    try {
      const resp = await apiClient.request('/socx/proxy/request', {
        method: 'POST',
        body: JSON.stringify({
          method: 'GET',
          endpoint: '/api/v1/suppliers_products/list/35'
        })
      });
      console.log('[Check Promos] Raw response:', resp);
      
      // Handle different response formats
      let suppliersProducts = [];
      if (Array.isArray(resp)) {
        suppliersProducts = resp;
      } else if (resp && Array.isArray(resp.data)) {
        suppliersProducts = resp.data;
      } else if (resp && resp.success && Array.isArray(resp.data)) {
        suppliersProducts = resp.data;
      }
      
      console.log('[Check Promos] Parsed suppliers products:', suppliersProducts.length, 'items');
      console.log('[Check Promos] Sample codes from suppliers:', suppliersProducts.slice(0, 5).map(sp => sp.code));
      
      const existsMap = new Map();
      promos.forEach((promo) => {
        const promoCode = promo?.product_code ? String(promo.product_code).trim().toUpperCase() : '';
        if (!promoCode) {
          existsMap.set('', false);
          return;
        }
        const exists = suppliersProducts.some((sp) => {
          const supplierCode = sp?.code ? String(sp.code).trim().toUpperCase() : '';
          return supplierCode === promoCode;
        });
        existsMap.set(promoCode, exists);
        console.log('[Check Promos] Promo code:', promoCode, 'Exists:', exists);
      });
      
      console.log('[Check Promos] Final exists map:', Array.from(existsMap.entries()));
      
      setPromoExistsInSuppliers((prev) => {
        const newMap = new Map(prev);
        existsMap.forEach((exists, code) => {
          newMap.set(code, exists);
        });
        console.log('[Check Promos] Updated state map:', Array.from(newMap.entries()));
        return newMap;
      });
    } catch (e) {
      console.error('[Check Promos] Error check promos in suppliers:', e);
      // Set all to false on error so buttons show red (safer)
      const errorMap = new Map();
      promos.forEach((promo) => {
        const code = promo?.product_code ? String(promo.product_code).trim().toUpperCase() : '';
        errorMap.set(code, false);
      });
      setPromoExistsInSuppliers((prev) => {
        const newMap = new Map(prev);
        errorMap.forEach((exists, code) => newMap.set(code, exists));
        return newMap;
      });
    } finally {
      setCheckingPromoExists(null);
    }
  }, []);

  const handleCopyPromo = async (promo) => {
    const text = [promo.product_name, promo.product_code, Number(promo.product_amount || 0).toLocaleString('id-ID')].filter(Boolean).join(' | ');
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire({ icon: 'success', title: 'Tersalin', text: 'Info promo sudah disalin ke clipboard', confirmButtonText: 'OK', timer: 2000, timerProgressBar: true });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: 'Tidak bisa menyalin ke clipboard', confirmButtonText: 'OK' });
    }
  };

  const startPromoCheck = async () => {
    if (!projectId) return;
    setIsCheckingPromo(true);
    setPromoProgress(0);
    setCurrentCheckingNumber(null);
    
    try {
      const response = await apiClient.post('/isimple-promo-check/check-all', { project_id: projectId });
      const data = response.data || response;
      const total = data.total || 0;
      const started = data.started === true;

      if (total === 0 || !started) {
        setTotalPhones(0);
        setIsCheckingPromo(false);
        if (total === 0) {
          Swal.fire({
            icon: 'info',
            title: 'Tidak ada nomor',
            text: data.message || 'Tambahkan nomor telepon dulu lewat tombol "Tambah Produk", lalu klik Cek Promo lagi.',
            confirmButtonText: 'OK'
          });
        } else if (data.processed !== undefined) {
      setTotalPhones(total);
          setPromoProgress(data.processed || 0);
        Swal.fire({
          icon: 'success',
          title: 'Selesai!',
          text: `Semua ${total} nomor telah diperiksa.`,
          confirmButtonText: 'OK'
        });
        await fetchProducts();
      }
        return;
      }

      setTotalPhones(total);

      progressIntervalRef.current = setInterval(pollPromoProgress, 1200);
      pollPromoProgress();
    } catch (error) {
      console.error('Error starting promo check:', error);
      setIsCheckingPromo(false);
      setCurrentCheckingNumber(null);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Gagal memulai proses pemeriksaan promo',
        confirmButtonText: 'OK'
      });
    }
  };

  const downloadHasilCek = () => {
    if (!products || products.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Tidak ada data',
        text: 'Belum ada hasil pengecekan untuk didownload. Jalankan Cek Promo dulu atau buka Hasil Cek Nomor.',
        confirmButtonText: 'OK'
      });
      return;
    }
    const projectName = (project && project.name) ? String(project.name).replace(/[^\w\s-]/g, '') : 'Isimple';
    const sheetNomor = products.map((p, idx) => ({
      No: idx + 1,
      'Nomor Telepon': p.number || '',
      Keterangan: p.name || '',
      Status: p.status || '',
      'Jumlah Paket': p.packet_count ?? 0,
      'Terakhir Dicek': p.last_checked_at ? new Date(p.last_checked_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '',
      'Tanggal Dibuat': p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID') : ''
    }));
    const formatHarga = (n) => (n == null || n === '') ? '' : String(Number(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const rowsPromo = [];
    products.forEach((p) => {
      const promos = p.promos || [];
      if (promos.length === 0) {
        rowsPromo.push({ 'Nomor Telepon': p.number || '', Paket: '', Harga: '', Tipe: '', 'Kode Produk': '' });
      } else {
        promos.forEach((promo) => {
          rowsPromo.push({
            'Nomor Telepon': p.number || '',
            Paket: promo.product_name || '',
            Harga: formatHarga(promo.product_amount),
            Tipe: promo.product_type || '',
            'Kode Produk': promo.product_code || ''
          });
        });
      }
    });
    const wsNomor = XLSX.utils.json_to_sheet(sheetNomor);
    const wsPromo = XLSX.utils.json_to_sheet(rowsPromo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, wsNomor, 'Nomor');
    XLSX.utils.book_append_sheet(workbook, wsPromo, 'Detail Promo');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `hasil_cek_nomor_${projectName}_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    Swal.fire({ icon: 'success', title: 'Berhasil', text: `File berhasil didownload: ${fileName}`, confirmButtonText: 'OK' });
  };

  const stopPromoCheck = async () => {
    try {
      await apiClient.post('/isimple-promo-check/check-all/stop');
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsCheckingPromo(false);
      setCurrentCheckingNumber(null);
      Swal.fire({
        icon: 'info',
        title: 'Meminta stop',
        text: 'Proses akan berhenti setelah nomor saat ini selesai.',
        confirmButtonText: 'OK'
      });
      await fetchProducts();
    } catch (e) {
      console.error('Stop promo check error:', e);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: e.message || 'Gagal menghentikan proses',
        confirmButtonText: 'OK'
      });
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const gbNum = parseInt(String(newProduct.gb).replace(/\D/g, '') || '0', 10);
    const daysNum = parseInt(String(newProduct.days).replace(/\D/g, '') || '0', 10);
    const priceNum = typeof newProduct.price === 'string'
      ? (newProduct.price.replace(/\D/g, '') ? parseInt(newProduct.price.replace(/\D/g, ''), 10) : 0)
      : Number(newProduct.price) || 0;

    if (!gbNum || gbNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Jumlah paket (GB) wajib diisi dan harus lebih dari 0',
        confirmButtonText: 'OK'
      });
      return;
    }
    if (!daysNum || daysNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Perhatian!',
        text: 'Hari wajib diisi dan harus lebih dari 0',
        confirmButtonText: 'OK'
      });
      return;
    }
    if (priceNum <= 0) {
      Swal.fire({
      icon: 'warning',
        title: 'Perhatian!',
        text: 'Harga (Rp) wajib diisi dan harus lebih dari 0',
        confirmButtonText: 'OK'
      });
      return;
    }

    try {
      await apiClient.post('/isimple-products', {
        gb: gbNum,
        days: daysNum,
        price: priceNum,
        category: newProduct.category || 'harian'
      });
      await fetchReferencePrices();
      setShowAddModal(false);
      setNewProduct({ gb: '', days: '', price: '', category: 'harian' });
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Produk Isimple (harga pasar) berhasil ditambahkan',
        confirmButtonText: 'OK'
      });
    } catch (error) {
      console.error('Error creating product:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: error.message || 'Gagal menambahkan produk',
        confirmButtonText: 'OK'
      });
    }
  };

  if (!bearerToken) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Bearer Token Required</h3>
            <p className="text-sm text-yellow-700 mt-1">Harap set Bearer Token untuk mengakses Produk Isimple</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <button onClick={() => navigate('/isimple-produksi')} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Kembali ke Project Management
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              📦 Produk {project ? project.name : 'Isimple'}
            </h1>
            <p className="text-gray-600">
              Kelola produk untuk project <span className="font-semibold">{project ? project.name : 'Isimple'}</span>
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Promo Checker Card — di atas agar mudah diakses */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        {isCheckingPromo && (
          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
              </span>
              <span className="font-semibold text-blue-900">Proses sedang berjalan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="text-sm text-blue-800">
                <span className="text-gray-600">Progress: </span>
                <span className="font-bold text-blue-900">Nomor {promoProgress} dari {totalPhones}</span>
              </div>
              {currentCheckingNumber && (
                <div className="text-sm">
                  <span className="text-gray-600">Sedang mengecek: </span>
                  <span className="font-mono font-semibold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">{currentCheckingNumber}</span>
                </div>
              )}
            </div>
            <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${totalPhones > 0 ? (promoProgress / totalPhones) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-2 text-gray-900">🔍 Cek Promo Semua Nomor Isimple</h2>
            <p className="text-gray-600">Klik tombol untuk memulai proses pemeriksaan promo ke SOCX</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/isimple-products/${projectId}/hasil-cek`)}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="-ml-0.5 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Lihat Proses / Hasil Cek Nomor
            </button>
            <button
              type="button"
              onClick={downloadHasilCek}
              disabled={!products || products.length === 0}
              className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="-ml-0.5 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Hasil Cek (Excel)
            </button>
          <button
            onClick={startPromoCheck}
            disabled={isCheckingPromo}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isCheckingPromo ? (
              <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                  {totalPhones > 0 ? `Mengecek ${promoProgress}/${totalPhones}...` : 'Memeriksa...'}
              </>
            ) : (
              'Mulai Cek Promo'
            )}
          </button>
        {isCheckingPromo && (
              <button
                type="button"
                onClick={stopPromoCheck}
                className="px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
              >
                <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
                Stop
              </button>
            )}
            </div>
            </div>
          </div>

      {/* Daftar Produk = Harga Pasar (editable price, expandable = promo yang masuk) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Daftar Produk (Harga Pasar)</h3>
          <button
            type="button"
            onClick={saveAllReferencePrices}
            disabled={savingAllPrices || !referencePrices.length}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingAllPrices ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Menyimpan...
              </>
            ) : (
              'Update semua perubahan'
            )}
          </button>
      </div>
        <p className="text-sm text-gray-500 mb-4">Ubah harga lalu klik Simpan per baris atau gunakan tombol di atas untuk simpan semua. Expand baris untuk melihat promo yang masuk.</p>

        {/* Tab: Paket Harian (< 28 hari), Bulanan (28–30 hari), Sensasi (nama mengandung Sensasi) */}
        {!loadingPrices && referencePrices.length > 0 && (
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setProductCategoryTab('harian')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                productCategoryTab === 'harian'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Paket Harian
            </button>
            <button
              type="button"
              onClick={() => setProductCategoryTab('bulanan')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                productCategoryTab === 'bulanan'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setProductCategoryTab('sensasi')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                productCategoryTab === 'sensasi'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sensasi
            </button>
          </div>
        )}

        {loadingPrices ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Memuat harga pasar...</span>
          </div>
        ) : referencePrices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Belum ada data harga pasar. Jalankan seed: backend/migrations/seed_indosat_products.sql</p>
          </div>
        ) : filteredReferencePrices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">Tidak ada produk di kategori ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Paket</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harga (Rp)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode SOCX</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedReferencePrices.map((p) => {
                  const isExpanded = expandedPriceId === p.id;
                  const matchingPromos = isExpanded ? getMatchingPromosForProduct(p) : [];
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              const newExpanded = isExpanded ? null : p.id;
                              setExpandedPriceId(newExpanded);
                              if (newExpanded) {
                                const currentMatchingPromos = getMatchingPromosForProduct(p);
                                if (currentMatchingPromos.length > 0) {
                                  checkPromosInSuppliers(p.id, currentMatchingPromos);
                                }
                                if (projectId) {
                                  setLoadingPromoCounts(true);
                                  apiClient.get(`/promo-products/project/${projectId}/counts-by-code`)
                                    .then((res) => {
                                      const payload = res.data || {};
                                      setPromoCountsByCode(payload.counts || payload);
                                      setTotalNumbersForRate(payload.totalNumbers ?? 0);
                                    })
                                    .catch(() => { setPromoCountsByCode({}); setTotalNumbersForRate(0); })
                                    .finally(() => { setLoadingPromoCounts(false); });
                                }
                              } else {
                                setPromoCountsByCode({});
                                setTotalNumbersForRate(0);
                              }
                            }}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none"
                            title={isExpanded ? 'Tutup' : 'Lihat promo yang masuk'}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={p.price != null && p.price !== '' ? String(p.price).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                            onChange={(e) => updateReferencePriceLocally(p.id, e.target.value)}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                            placeholder="0"
                          />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={p.socx_code != null ? String(p.socx_code) : ''}
                            onChange={(e) => updateSocxCodeLocally(p.id, e.target.value)}
                            className="w-48 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                            placeholder="Kode SOCX"
                          />
                    </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() => handleUpdateAllPromosToSocx(p)}
                              disabled={
                                updatingAllPromosToSocxId === p.id ||
                                !(p.socx_code != null && String(p.socx_code).trim())
                              }
                              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Update semua promo ke SOCX: kirim semua promo yang masuk ke produk ini ke SOCX"
                            >
                              {updatingAllPromosToSocxId === p.id ? (
                                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                </svg>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => saveReferencePrice(p.id)}
                              disabled={savingPriceId === p.id}
                              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                              title="Simpan harga"
                            >
                              {savingPriceId === p.id ? (
                                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-2 4a1 1 0 011-1h2a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteReferencePrice(p.id)}
                              disabled={deletingPriceId === p.id}
                              className="inline-flex items-center justify-center p-2 rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                              title="Hapus"
                            >
                              {deletingPriceId === p.id ? (
                                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                    </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-6 py-3 bg-gray-50 border-l border-r border-b border-gray-200">
                            <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              Promo yang masuk ke produk ini ({matchingPromos.length})
                              {checkingPromoExists === p.id && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Mengecek kode produk...
                                </span>
                              )}
                            </div>
                            {matchingPromos.length === 0 ? (
                              <p className="text-gray-500 text-sm">Belum ada promo yang cocok. Cek nomor dulu atau naikkan harga pasar.</p>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 rounded-md">
                                <table className="min-w-full text-xs" style={{ tableLayout: 'fixed' }}>
                                  <colgroup>
                                    <col style={{ minWidth: '140px' }} />
                                    <col style={{ width: '90px' }} />
                                    <col style={{ minWidth: '100px' }} />
                                    <col style={{ minWidth: '180px' }} />
                                    <col style={{ width: '100px' }} />
                                    <col style={{ width: '90px' }} />
                                  </colgroup>
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Nama Paket (Promo)</th>
                                      <th className="px-3 py-2 text-right">Harga (Rp)</th>
                                      <th className="px-3 py-2 text-left">Tipe</th>
                                      <th className="px-3 py-2 text-left">Kode Produk</th>
                                      <th
                                        className="px-3 py-2 text-right cursor-pointer hover:bg-gray-200 select-none"
                                        onClick={() => setPromoColumnMode((m) => (m === 'angka' ? 'rate' : 'angka'))}
                                        title="Klik untuk ganti tampilan: Angka / Rate %"
                                      >
                                        Rate
                                      </th>
                                      <th className="px-3 py-2 text-center">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white">
                                    {matchingPromos.map((promo, idx) => (
                                      <tr key={promo.id || idx} className="border-t border-gray-100">
                                        <td className="px-3 py-2">{promo.product_name || '-'}</td>
                                        <td className="px-3 py-2 text-right">{Number(promo.product_amount || 0).toLocaleString('id-ID')}</td>
                                        <td className="px-3 py-2">{promo.product_type || '-'}</td>
                                        <td className="px-3 py-2 font-mono text-gray-700">{promo.product_code || '-'}</td>
                                        <td className="px-3 py-2 text-right whitespace-nowrap" style={{ minWidth: '90px' }}>
                                          {loadingPromoCounts ? (
                                            <span className="text-gray-400">...</span>
                                          ) : (() => {
                                            const code = promo.product_code ? String(promo.product_code).trim() : '';
                                            const count = promoCountsByCode[code] ?? jumlahNomorByProductCode[code] ?? 0;
                                            if (promoColumnMode === 'rate') {
                                              const total = totalNumbersForRate || 0;
                                              return total > 0 ? ((Number(count) / total) * 100).toFixed(1) + '%' : '-';
                                            }
                                            return count;
                                          })()}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <div className="inline-flex items-center gap-1">
                        <button
                                              type="button"
                                              onClick={() => handleCopyPromo(promo)}
                                              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 bg-gray-100 hover:bg-gray-200"
                                              title="Copy"
                                            >
                                              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9zM9 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                                              </svg>
                        </button>
                        <button
                                              type="button"
                                              onClick={() => handleSavePromoToSocx(promo)}
                                              disabled={savingPromoToSocxId === promo.id}
                                              className={`inline-flex items-center justify-center p-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                                                (() => {
                                                  const promoCode = promo?.product_code ? String(promo.product_code).trim().toUpperCase() : '';
                                                  const exists = promoExistsInSuppliers.get(promoCode);
                                                  return exists === false ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
                                                })()
                                              }`}
                                              title={
                                                (() => {
                                                  const promoCode = promo?.product_code ? String(promo.product_code).trim().toUpperCase() : '';
                                                  const exists = promoExistsInSuppliers.get(promoCode);
                                                  return exists === false
                                                    ? 'Simpan ke SOCX (Kode produk tidak ditemukan di suppliers_products - akan dibuat otomatis saat sync)'
                                                    : 'Simpan ke SOCX';
                                                })()
                                              }
                                            >
                                              {savingPromoToSocxId === promo.id ? (
                                                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                              ) : (
                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm-2 4a1 1 0 011-1h2a1 1 0 110 2H5a1 1 0 01-1-1z" clipRule="evenodd" />
                                                </svg>
                                              )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal - Tambah Produk Isimple (Harga Pasar) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)} aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8 4-8-4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Tambah Produk Isimple
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Isi jumlah GB, kategori, dan hari. Jika Sensasi, nama disimpan dengan kata &quot;Sensasi&quot; (contoh: Indosat Freedom Internet Sensasi 50 GB 28 Hari).
                    </p>
                    <form onSubmit={handleCreateProduct} className="mt-4 space-y-4">
                      <div>
                        <label htmlFor="add-product-gb" className="block text-sm font-medium text-gray-700 mb-1">
                          Jumlah Paket (GB) <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="add-product-gb"
                          type="text"
                          inputMode="numeric"
                          value={newProduct.gb}
                          onChange={(e) => setNewProduct({ ...newProduct, gb: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Contoh: 10"
                        />
                      </div>
                      <div>
                        <label htmlFor="add-product-category" className="block text-sm font-medium text-gray-700 mb-1">
                          Kategori <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="add-product-category"
                          value={newProduct.category || 'harian'}
                          onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="harian">Harian</option>
                          <option value="bulanan">Bulanan</option>
                          <option value="sensasi">Sensasi</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="add-product-days" className="block text-sm font-medium text-gray-700 mb-1">
                          Hari <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="add-product-days"
                          type="text"
                          inputMode="numeric"
                          value={newProduct.days}
                          onChange={(e) => setNewProduct({ ...newProduct, days: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Contoh: 7 atau 28"
                        />
                      </div>
                      <div>
                        <label htmlFor="add-product-price" className="block text-sm font-medium text-gray-700 mb-1">
                          Harga (Rp) <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="add-product-price"
                          type="text"
                          inputMode="numeric"
                          value={
                            newProduct.price != null && newProduct.price !== ''
                              ? String(newProduct.price).replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                              : ''
                          }
                          onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value.replace(/\D/g, '') })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                          placeholder="Contoh: 25000"
                        />
                      </div>
                      <div className="flex flex-row-reverse gap-3 pt-2">
                <button
                          type="submit"
                          className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Simpan
                </button>
                <button
                  type="button"
                          onClick={() => setShowAddModal(false)}
                          className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Batal
                </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default IsimpleProducts;