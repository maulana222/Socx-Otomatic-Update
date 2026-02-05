import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';
import apiClient from '../utils/api';
import Swal from 'sweetalert2';

const PER_PAGE = 10;

const IsimpleHasilCekNomor = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { bearerToken } = useBearerToken();
  const [project, setProject] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchProject = useCallback(async () => {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  }, [projectId]);

  const fetchProducts = useCallback(async () => {
    if (!bearerToken || !projectId) return;
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/isimple-numbers/project/${projectId}/with-promos`);
      const list = response.data || [];
      setProducts(list);
      const maxPage = Math.max(1, Math.ceil(list.length / PER_PAGE));
      setCurrentPage((p) => Math.min(p, maxPage));
    } catch (error) {
      console.error('Error fetching products:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Gagal memuat daftar nomor dan hasil pengecekan',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsLoading(false);
    }
  }, [bearerToken, projectId]);

  useEffect(() => {
    if (bearerToken && projectId) {
      fetchProject();
      fetchProducts();
    }
  }, [bearerToken, projectId, fetchProject, fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE));
  const startIdx = (currentPage - 1) * PER_PAGE;
  const paginatedProducts = products.slice(startIdx, startIdx + PER_PAGE);

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await apiClient.put(`/isimple-numbers/${editingProduct.id}`, {
        name: editingProduct.name,
        number: editingProduct.number
      });
      await fetchProducts();
      setShowEditModal(false);
      setEditingProduct(null);
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Produk berhasil diupdate', confirmButtonText: 'OK' });
    } catch (error) {
      console.error('Error updating product:', error);
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Gagal mengupdate', confirmButtonText: 'OK' });
    }
  };

  const handleDeleteProduct = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus Nomor?',
      text: 'Data hasil cek untuk nomor ini juga akan hilang.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });
    if (!result.isConfirmed) return;
    try {
      await apiClient.delete(`/isimple-numbers/${id}`);
      await fetchProducts();
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Nomor berhasil dihapus', confirmButtonText: 'OK' });
    } catch (error) {
      console.error('Error deleting product:', error);
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message || 'Gagal menghapus', confirmButtonText: 'OK' });
    }
  };

  if (!bearerToken) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">Harap set Bearer Token untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/isimple-products/${projectId}`)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Kembali ke Produk
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📋 Hasil Cek Nomor {project ? project.name : ''}
        </h1>
        <p className="text-gray-600">
          Daftar nomor dan hasil pengecekan promo untuk project ini. Gunakan pagination di bawah tabel.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Nomor (untuk Cek Promo)</h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Memuat...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada nomor</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tambah nomor di halaman Produk, lalu jalankan Cek Promo.
            </p>
            <button
              onClick={() => navigate(`/isimple-products/${projectId}`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Ke Halaman Produk
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nomor Telepon</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah Paket</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Terakhir Dicek</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Dibuat</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts.map((product) => (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name || '–'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-blue-600">{product.number}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'processed' ? 'bg-green-100 text-green-800' :
                            product.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.status ? product.status.toUpperCase() : '–'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.packet_count || 0} paket</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.last_checked_at
                            ? new Date(product.last_checked_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '–'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.created_at ? new Date(product.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '–'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              {(product.promos && product.promos.length) ? (expandedProductId === product.id ? '▼ Tutup Hasil' : '▶ Lihat Hasil') : '–'}
                            </button>
                            <button
                              onClick={() => { setEditingProduct(product); setShowEditModal(true); }}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedProductId === product.id && product.promos && product.promos.length > 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-3 bg-gray-50">
                            <div className="text-sm font-medium text-gray-700 mb-2">Hasil Pengecekan – Daftar Paket</div>
                            <div className="overflow-x-auto border border-gray-200 rounded-md">
                              <table className="min-w-full text-xs">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Nama Paket</th>
                                    <th className="px-3 py-2 text-left">Harga (Rp)</th>
                                    <th className="px-3 py-2 text-left">Tipe</th>
                                    <th className="px-3 py-2 text-left">GB / Hari</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white">
                                  {product.promos.map((p) => (
                                    <tr key={p.id} className="border-t border-gray-100">
                                      <td className="px-3 py-2">{p.product_name || '–'}</td>
                                      <td className="px-3 py-2">{Number(p.product_amount || 0).toLocaleString('id-ID')}</td>
                                      <td className="px-3 py-2">{p.product_type || '–'}</td>
                                      <td className="px-3 py-2">{p.product_gb ?? 0} GB / {p.product_days ?? 0} Hari</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600">
                  Menampilkan {startIdx + 1}–{Math.min(startIdx + PER_PAGE, products.length)} dari {products.length} nomor
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-gray-600">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)} />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Nomor</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                    <input
                      type="text"
                      value={editingProduct.number || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                    <textarea
                      rows={2}
                      value={editingProduct.name || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                <button
                  type="button"
                  onClick={handleUpdateProduct}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingProduct(null); }}
                  className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IsimpleHasilCekNomor;
