
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  query, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Product, Shop } from '../types';
import { 
  Plus, Package, Trash2, Edit3, X, Save, Upload,
  Image as ImageIcon, Store, Search, Loader2, Link as LinkIcon
} from 'lucide-react';

interface ProductListProps {
  activeProfileId: string;
}

const ProductList: React.FC<ProductListProps> = ({ activeProfileId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShopId, setFilterShopId] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [formData, setFormData] = useState({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]);
    });

    const qProds = query(
      collection(db, 'NAMA PRODUK'), 
      where('profileId', '==', activeProfileId)
    );
    const unsubProds = onSnapshot(qProds, (snapshot) => {
      const prodData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      const sortedProds = prodData.sort((a, b) => (a.namaProduk || '').localeCompare(b.namaProduk || ''));
      setProducts(sortedProds);
      setLoading(false);
    });

    return () => { unsubShops(); unsubProds(); };
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const selectedShop = shops.find(s => s.id === formData.namaTokoId);
    if (!selectedShop) return;

    setIsSaving(true);
    try {
      let finalImageUrl = previewUrl;
      if (selectedFile) {
        const storageRef = ref(storage, `produk/${user.uid}/${Date.now()}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }
      
      const data = { 
        ...formData, 
        userId: user.uid,
        profileId: activeProfileId,
        namaToko: selectedShop.nama, 
        fotoProduk: finalImageUrl 
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'NAMA PRODUK', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'NAMA PRODUK'), data);
      }
      closeModal();
    } catch (err) { alert("Error saving product."); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setEditingProduct(null); 
    setPreviewUrl(''); 
    setSelectedFile(null); 
    setFormData({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 });
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.namaProduk || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShop = !filterShopId || p.namaTokoId === filterShopId;
    return matchesSearch && matchesShop;
  });

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center p-4">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold dark:text-slate-100 text-slate-900">Katalog Produk</h2>
          <button onClick={() => { setEditingProduct(null); setFormData({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 }); setIsModalOpen(true); }} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 md:px-6 md:py-3">
            <Plus className="w-6 h-6 md:hidden" />
            <span className="hidden md:flex items-center gap-2 font-bold"><Plus className="w-5 h-5" /> Tambah Produk</span>
          </button>
        </div>
        <p className="text-slate-500 text-xs font-medium">Data produk khusus akun aktif.</p>
      </div>

      <div className="dark:bg-slate-900 bg-white p-3 rounded-2xl border dark:border-slate-800 border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari produk..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={filterShopId} onChange={(e) => setFilterShopId(e.target.value)} className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none cursor-pointer">
          <option value="">Semua Toko</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
        </select>
      </div>

      {/* Grid: 2 columns on small mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {filteredProducts.length > 0 ? filteredProducts.map((product) => (
          <div key={product.id} className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col p-3 relative">
             <div className="flex gap-1 absolute top-1 right-1 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
               <button onClick={() => { setEditingProduct(product); setFormData({ namaProduk: product.namaProduk, kategori: product.kategori, namaTokoId: product.namaTokoId, linkProduk: product.linkProduk || '', hargaJual: product.hargaJual }); setPreviewUrl(product.fotoProduk || ''); setIsModalOpen(true); }} className="p-1.5 bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-100 dark:border-slate-700 rounded-lg text-indigo-600"><Edit3 className="w-3 h-3" /></button>
               <button onClick={async () => { if(window.confirm('Hapus produk ini?')) await deleteDoc(doc(db, 'NAMA PRODUK', product.id)); }} className="p-1.5 bg-white/90 dark:bg-slate-800/90 shadow-sm border border-slate-100 dark:border-slate-700 rounded-lg text-red-500"><Trash2 className="w-3 h-3" /></button>
            </div>
            <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden mb-3 border dark:border-slate-700 border-slate-50">
              {product.fotoProduk ? <img src={product.fotoProduk} className="w-full h-full object-cover" alt={product.namaProduk} /> : <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700"><ImageIcon className="w-6 h-6" /></div>}
            </div>
            <h3 className="text-[11px] md:text-sm font-bold dark:text-slate-100 text-slate-900 truncate leading-tight">{product.namaProduk}</h3>
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1 truncate">{product.namaToko}</p>
            <div className="mt-auto pt-3 border-t dark:border-slate-800 border-slate-50 flex items-center justify-between">
               <div className="min-w-0">
                  <p className="text-[10px] font-black dark:text-slate-100 text-slate-900 truncate">Rp {product.hargaJual?.toLocaleString('id-ID')}</p>
               </div>
               {product.linkProduk && (
                 <a href={product.linkProduk} target="_blank" className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 transition-all"><LinkIcon className="w-3 h-3" /></a>
               )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-16 text-center space-y-3 dark:bg-slate-900 bg-white rounded-2xl border-2 border-dashed dark:border-slate-800 border-slate-200">
            <Package className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-slate-400 text-xs font-medium">Belum ada produk.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'bg-slate-900' : 'bg-white'}`}>
             <div className="px-6 py-4 border-b dark:border-slate-800 border-slate-100 flex items-center justify-between">
                <h3 className="font-bold dark:text-slate-100 text-slate-900">{editingProduct ? 'Edit Produk' : 'Tambah Produk'}</h3>
                <button onClick={closeModal} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
             </div>
             <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-dashed dark:border-slate-700 border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-all overflow-hidden relative group flex-shrink-0"
                  >
                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                    <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); } }} />
                  </div>
                  <div className="flex-1 w-full space-y-3">
                    <input required className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" placeholder="Nama Produk" value={formData.namaProduk} onChange={(e) => setFormData({...formData, namaProduk: e.target.value})} />
                    <select required className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" value={formData.namaTokoId} onChange={(e) => setFormData({...formData, namaTokoId: e.target.value})}>
                      <option value="">Pilih Toko...</option>
                      {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" placeholder="Kategori" value={formData.kategori} onChange={(e) => setFormData({...formData, kategori: e.target.value})} />
                  <input type="number" required className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" placeholder="Harga Jual" value={formData.hargaJual || ''} onChange={(e) => setFormData({...formData, hargaJual: Number(e.target.value)})} />
                </div>
                <input className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" placeholder="Link Produk (Opsional)" value={formData.linkProduk} onChange={(e) => setFormData({...formData, linkProduk: e.target.value})} />
                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all text-sm">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Simpan Produk'}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
