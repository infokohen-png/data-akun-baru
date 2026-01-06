
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  query, where, serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Product, Shop } from '../types';
import { Plus, Trash2, Edit3, Image as ImageIcon, Loader2, Camera, X, Upload } from 'lucide-react';

interface ProductListProps {
  activeProfileId: string;
}

const ProductList: React.FC<ProductListProps> = ({ activeProfileId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    namaProduk: '', 
    kategori: '', 
    namaTokoId: '', 
    linkProduk: '', 
    hargaJual: 0 
  });

  // Helper untuk format titik
  const formatDots = (val: number | string) => {
    if (!val && val !== 0) return '';
    const stringVal = val.toString().replace(/\D/g, '');
    return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseDots = (val: string) => parseInt(val.replace(/\./g, ''), 10) || 0;

  useEffect(() => {
    if (!activeProfileId) return;
    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const unsubShops = onSnapshot(qShops, (snap) => setShops(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop))));
    
    const qProds = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const unsubProds = onSnapshot(qProds, (snap) => {
      setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });
    return () => { unsubShops(); unsubProds(); };
  }, [activeProfileId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !activeProfileId) return;
    const selectedShop = shops.find(s => s.id === formData.namaTokoId);
    if (!selectedShop) {
      alert("Silakan pilih toko terlebih dahulu.");
      return;
    }
    
    setIsSaving(true);
    try {
      let finalImageUrl = previewUrl;

      if (selectedFile) {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${selectedFile.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `produk/${auth.currentUser.uid}/${fileName}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const productData = { 
        ...formData, 
        userId: auth.currentUser.uid, 
        profileId: activeProfileId, 
        namaToko: selectedShop.nama, 
        fotoProduk: finalImageUrl,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'NAMA PRODUK', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'NAMA PRODUK'), {
          ...productData,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (err) { 
      console.error("Save Product Error:", err);
      alert("Gagal menyimpan produk."); 
    }
    finally { setIsSaving(false); }
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingProduct(null); 
    setPreviewUrl(''); 
    setSelectedFile(null); 
    setFormData({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 }); 
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      <p className="mt-4 text-slate-500 font-medium">Memuat katalog...</p>
    </div>
  );

  return (
    <div className="space-y-6 md:mt-2 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black dark:text-white">Katalog Produk</h2>
          <p className="text-xs text-slate-500 font-medium italic">Daftar produk yang siap dipromosikan.</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} 
          className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" /> Tambah Produk
        </button>
      </div>

      <div className="relative">
        <Upload className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Cari produk..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full pl-12 pr-4 py-4 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl outline-none dark:text-white font-medium shadow-sm" 
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
        {products.filter(p => p.namaProduk.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
          <div key={product.id} className="dark:bg-slate-900 bg-white rounded-3xl border dark:border-slate-800 border-slate-100 p-3 flex flex-col group hover:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-lg">
            <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden mb-3 relative">
              {product.fotoProduk ? (
                <img src={product.fotoProduk} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={product.namaProduk} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                   <ImageIcon className="w-8 h-8 mb-1" />
                   <span className="text-[8px] font-black uppercase">No Photo</span>
                </div>
              )}
            </div>
            <div className="px-1">
              <h3 className="text-[10px] sm:text-xs font-black dark:text-white truncate leading-tight mb-1">{product.namaProduk}</h3>
              <p className="text-[8px] sm:text-[9px] text-indigo-500 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                <Plus className="w-2.5 h-2.5" /> {product.namaToko}
              </p>
            </div>
            
            <div className="mt-auto pt-3 flex justify-between items-center border-t dark:border-slate-800 border-slate-50">
               <span className="text-[10px] sm:text-xs font-black dark:text-white">Rp {product.hargaJual.toLocaleString('id-ID')}</span>
               <div className="flex gap-1">
                  <button 
                    onClick={() => { 
                      setEditingProduct(product); 
                      setFormData({ 
                        namaProduk: product.namaProduk, 
                        kategori: product.kategori || '', 
                        namaTokoId: product.namaTokoId, 
                        linkProduk: product.linkProduk || '', 
                        hargaJual: product.hargaJual 
                      }); 
                      setPreviewUrl(product.fotoProduk || ''); 
                      setIsModalOpen(true); 
                    }} 
                    className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={async () => { if(confirm('Hapus produk ini?')) await deleteDoc(doc(db, 'NAMA PRODUK', product.id)); }} 
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={closeModal}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 relative border dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black dark:text-white tracking-tight">{editingProduct ? 'Update Produk' : 'Produk Baru'}</h3>
               <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-all">
                 <X className="w-6 h-6" />
               </button>
             </div>
             
             <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Foto Produk</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-video w-full rounded-[2rem] overflow-hidden border-2 border-dashed dark:border-slate-800 border-slate-200 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 group cursor-pointer hover:border-indigo-500 transition-all"
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button 
                             type="button" 
                             onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(''); }} 
                             className="bg-white text-red-500 p-2.5 rounded-2xl shadow-lg active:scale-90 transition-all"
                           >
                             <X className="w-5 h-5" />
                           </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-6">
                         <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 text-indigo-500 group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6" />
                         </div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Klik untuk pilih foto</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Toko Pemilik</label>
                  <select 
                    required 
                    className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm cursor-pointer focus:border-indigo-600 transition-all" 
                    value={formData.namaTokoId} 
                    onChange={(e) => setFormData({...formData, namaTokoId: e.target.value})}
                  >
                    <option value="">Pilih Toko...</option>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nama Produk</label>
                  <input 
                    required 
                    className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm focus:border-indigo-600 transition-all" 
                    placeholder="Contoh: Tas Canvas Minimalis" 
                    value={formData.namaProduk} 
                    onChange={(e) => setFormData({...formData, namaProduk: e.target.value})} 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Harga Jual (Rp)</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm focus:border-indigo-600 transition-all" 
                    placeholder="0" 
                    value={formatDots(formData.hargaJual)} 
                    onChange={(e) => setFormData({...formData, hargaJual: parseDots(e.target.value)})} 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black text-xs tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all mt-4 uppercase flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <><Loader2 className="animate-spin w-5 h-5" /> Menyimpan...</>
                  ) : (
                    'Simpan Produk'
                  )}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
