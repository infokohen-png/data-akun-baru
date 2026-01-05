
import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  query, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { Product, Shop } from '../types';
import { Plus, Trash2, Edit3, Image as ImageIcon, Loader2 } from 'lucide-react';

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
  const [formData, setFormData] = useState({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 });

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const selectedShop = shops.find(s => s.id === formData.namaTokoId);
    if (!selectedShop) return;
    setIsSaving(true);
    try {
      let finalImageUrl = previewUrl;
      if (selectedFile) {
        const storageRef = ref(storage, `produk/${auth.currentUser.uid}/${Date.now()}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }
      const data = { ...formData, userId: auth.currentUser.uid, profileId: activeProfileId, namaToko: selectedShop.nama, fotoProduk: finalImageUrl };
      if (editingProduct) {
        await updateDoc(doc(db, 'NAMA PRODUK', editingProduct.id), data);
      } else {
        await addDoc(collection(db, 'NAMA PRODUK'), data);
      }
      closeModal();
    } catch (err) { alert("Error"); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => { setIsModalOpen(false); setEditingProduct(null); setPreviewUrl(''); setSelectedFile(null); setFormData({ namaProduk: '', kategori: '', namaTokoId: '', linkProduk: '', hargaJual: 0 }); };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black dark:text-white">Katalog Produk</h2>
        <button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus className="w-5 h-5" /> Tambah Produk</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.filter(p => p.namaProduk.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
          <div key={product.id} className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 p-3 flex flex-col group">
            <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden mb-3">
              {product.fotoProduk ? <img src={product.fotoProduk} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-4 text-slate-300" />}
            </div>
            <h3 className="text-xs font-bold dark:text-white truncate">{product.namaProduk}</h3>
            <p className="text-[10px] text-indigo-500 font-black mt-1 uppercase">{product.namaToko}</p>
            <div className="mt-auto pt-3 flex justify-between items-center border-t dark:border-slate-800">
               <span className="text-[11px] font-black dark:text-white">Rp {product.hargaJual.toLocaleString('id-ID')}</span>
               <div className="flex gap-1">
                  {/* Fixed type error: Explicitly mapping Product fields and providing default for optional linkProduk */}
                  <button onClick={() => { setEditingProduct(product); setFormData({ namaProduk: product.namaProduk, kategori: product.kategori, namaTokoId: product.namaTokoId, linkProduk: product.linkProduk || '', hargaJual: product.hargaJual }); setPreviewUrl(product.fotoProduk || ''); setIsModalOpen(true); }} className="p-1.5 text-indigo-500"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={async () => { if(confirm('Hapus?')) await deleteDoc(doc(db, 'NAMA PRODUK', product.id)); }} className="p-1.5 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-8 relative">
             <h3 className="text-xl font-black mb-6 dark:text-white">Data Produk</h3>
             <form onSubmit={handleSave} className="space-y-4">
                <select required className="w-full px-4 py-3 dark:bg-slate-800 border rounded-xl dark:text-white" value={formData.namaTokoId} onChange={(e) => setFormData({...formData, namaTokoId: e.target.value})}>
                  <option value="">Pilih Toko...</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
                <input required className="w-full px-4 py-3 dark:bg-slate-800 border rounded-xl dark:text-white" placeholder="Nama Produk" value={formData.namaProduk} onChange={(e) => setFormData({...formData, namaProduk: e.target.value})} />
                <input type="number" required className="w-full px-4 py-3 dark:bg-slate-800 border rounded-xl dark:text-white" placeholder="Harga Jual" value={formData.hargaJual || ''} onChange={(e) => setFormData({...formData, hargaJual: Number(e.target.value)})} />
                <button type="submit" disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold">SIMPAN PRODUK</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
