
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  query, Timestamp, where 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ContentRecord, Shop, Product } from '../types';
import { 
  Plus, Video, Trash2, Edit3, X, Save, 
  Calendar, Store, Package, ExternalLink, Search, Loader2
} from 'lucide-react';

interface ContentListProps {
  activeProfileId: string;
}

const ContentList: React.FC<ContentListProps> = ({ activeProfileId }) => {
  const [contents, setContents] = useState<ContentRecord[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShopId, setFilterShopId] = useState('');
  const [filterProductId, setFilterProductId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    tokoId: '', produkId: '', linkKonten: '', tanggal: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const unsubShops = onSnapshot(qShops, (snapshot) => {
      setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]);
    });

    const qProds = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const unsubProds = onSnapshot(qProds, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });

    const qContents = query(
      collection(db, 'KONTEN'), 
      where('profileId', '==', activeProfileId)
    );
    const unsubContents = onSnapshot(qContents, (snapshot) => {
      const contentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContentRecord[];
      const sortedContents = contentData.sort((a, b) => {
        const timeA = a.tanggal?.toMillis ? a.tanggal.toMillis() : 0;
        const timeB = b.tanggal?.toMillis ? b.tanggal.toMillis() : 0;
        return timeB - timeA;
      });
      setContents(sortedContents);
      setLoading(false);
    });

    return () => { unsubShops(); unsubProds(); unsubContents(); };
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !activeProfileId) return;

    const shop = shops.find(s => s.id === formData.tokoId);
    const product = products.find(p => p.id === formData.produkId);
    if (!shop || !product) { alert("Pilih toko & produk."); return; }

    setIsSaving(true);
    try {
      const payload = { 
        userId: user.uid,
        profileId: activeProfileId,
        tokoId: shop.id, namaToko: shop.nama, 
        produkId: product.id, namaProduk: product.namaProduk, 
        linkKonten: formData.linkKonten.trim(), 
        tanggal: Timestamp.fromDate(new Date(formData.tanggal)) 
      };
      
      if (editingContent) {
        await updateDoc(doc(db, 'KONTEN', editingContent.id), payload);
      } else {
        await addDoc(collection(db, 'KONTEN'), payload);
      }
      closeModal();
    } catch (err) { alert("Gagal menyimpan."); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingContent(null);
    setFormData({ tokoId: '', produkId: '', linkKonten: '', tanggal: new Date().toISOString().split('T')[0] });
  };

  const filteredContents = contents.filter(c => {
    const cDate = c.tanggal?.toDate ? c.tanggal.toDate() : null;
    const matchesSearch = (c.namaToko || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.namaProduk || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesShop = !filterShopId || c.tokoId === filterShopId;
    const matchesProd = !filterProductId || c.produkId === filterProductId;
    const matchesStart = !filterStartDate || (cDate && cDate >= new Date(filterStartDate));
    const matchesEnd = !filterEndDate || (cDate && cDate <= new Date(filterEndDate + 'T23:59:59'));
    return matchesSearch && matchesShop && matchesProd && matchesStart && matchesEnd;
  });

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold dark:text-slate-100 text-slate-900">Konten Promosi</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
             <Plus className="w-6 h-6" />
          </button>
        </div>
        <p className="text-slate-500 text-xs font-medium italic">Manajemen postingan sosial media.</p>
      </div>

      {/* Optimized Filter Bar */}
      <div className="dark:bg-slate-900 bg-white p-3 rounded-2xl border dark:border-slate-800 border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Cari konten..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={filterShopId} onChange={(e) => {setFilterShopId(e.target.value); setFilterProductId('');}} className="px-3 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none cursor-pointer">
            <option value="">Semua Toko</option>
            {shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)} disabled={!filterShopId} className="px-3 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none cursor-pointer disabled:opacity-50">
            <option value="">Semua Produk</option>
            {products.filter(p => p.namaTokoId === filterShopId).map(p => <option key={p.id} value={p.id}>{p.namaProduk}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContents.length > 0 ? filteredContents.map((record) => (
          <div key={record.id} className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden p-4 space-y-3 relative">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                <Calendar className="w-3 h-3" />
                {record.tanggal?.toDate ? record.tanggal.toDate().toLocaleDateString('id-ID') : '-'}
              </div>
              <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditingContent(record); setFormData({ tokoId: record.tokoId, produkId: record.produkId, linkKonten: record.linkKonten, tanggal: record.tanggal?.toDate ? record.tanggal.toDate().toISOString().split('T')[0] : '' }); setIsModalOpen(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={async () => { if(window.confirm('Hapus konten ini?')) await deleteDoc(doc(db, 'KONTEN', record.id)); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 dark:bg-slate-800 bg-slate-50 rounded-xl overflow-hidden border dark:border-slate-700 border-slate-50 flex-shrink-0 flex items-center justify-center text-slate-300">
                {products.find(p => p.id === record.produkId)?.fotoProduk ? <img src={products.find(p => p.id === record.produkId)?.fotoProduk} className="w-full h-full object-cover" /> : <Package className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold dark:text-slate-100 text-slate-900 truncate leading-tight">{record.namaProduk}</h4>
                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase mt-1">
                  <Store className="w-3 h-3" />
                  <span className="truncate">{record.namaToko}</span>
                </div>
              </div>
            </div>

            <a href={record.linkKonten} target="_blank" className="flex items-center justify-center gap-2 w-full py-2.5 dark:bg-slate-800 bg-slate-50 dark:text-slate-300 text-indigo-600 text-[11px] font-bold rounded-xl hover:bg-indigo-600 hover:text-white transition-all border dark:border-slate-700 border-indigo-100">
              <ExternalLink className="w-3.5 h-3.5" /> Buka Konten
            </a>
          </div>
        )) : (
          <div className="col-span-full py-16 text-center dark:bg-slate-900 bg-white rounded-2xl border-2 border-dashed dark:border-slate-800 border-slate-200">
             <Video className="w-10 h-10 text-slate-200 mx-auto" />
             <p className="text-slate-400 text-xs font-medium mt-2">Belum ada konten.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className={`w-full max-w-md rounded-2xl shadow-2xl relative z-10 overflow-hidden ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'bg-slate-900' : 'bg-white'}`}>
            <div className="px-6 py-4 border-b dark:border-slate-800 border-slate-100 flex items-center justify-between">
              <h3 className="font-bold dark:text-slate-100 text-slate-900">Catat Konten</h3>
              <button onClick={closeModal}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <select required className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" value={formData.tokoId} onChange={(e) => setFormData({ ...formData, tokoId: e.target.value, produkId: '' })}><option value="">Pilih Toko...</option>{shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}</select>
              <select required disabled={!formData.tokoId} className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none disabled:opacity-50" value={formData.produkId} onChange={(e) => setFormData({ ...formData, produkId: e.target.value })}><option value="">Pilih Produk...</option>{products.filter(p => p.namaTokoId === formData.tokoId).map(p => <option key={p.id} value={p.id}>{p.namaProduk}</option>)}</select>
              <input required className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" placeholder="URL Konten" value={formData.linkKonten} onChange={(e) => setFormData({ ...formData, linkKonten: e.target.value })} />
              <input type="date" required className="w-full px-4 py-2.5 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} />
              <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold active:scale-95 transition-all text-sm shadow-lg shadow-indigo-100">{isSaving ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : 'Simpan Konten'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentList;
