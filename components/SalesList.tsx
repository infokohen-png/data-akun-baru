
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  serverTimestamp, query, Timestamp, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sale, Product, Shop } from '../types';
import { 
  Plus, Trash2, Edit3, X, TrendingUp, Search, Loader2, Calendar, Store, Table
} from 'lucide-react';

interface SalesListProps {
  activeProfileId: string;
}

const SalesList: React.FC<SalesListProps> = ({ activeProfileId }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    tokoId: '', produkId: '', jumlah: 1, totalOmset: 0, 
    tanggal: new Date().toISOString().split('T')[0]
  });

  // Helper Pemisah Ribuan (Auto-Dot) - Versi Stabil
  const formatDots = (val: number | string) => {
    if (val === undefined || val === null || val === '') return '';
    const stringVal = val.toString().replace(/\D/g, '');
    if (stringVal === '') return '';
    return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseDots = (val: string) => {
    const clean = val.replace(/\./g, '');
    return clean === '' ? 0 : parseInt(clean, 10);
  };

  useEffect(() => {
    if (!activeProfileId) return;

    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const unsubShops = onSnapshot(qShops, (snapshot) => setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]));

    const qProds = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const unsubProds = onSnapshot(qProds, (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]));

    const qSales = query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Sale[];
      setSales(data.sort((a, b) => (b.tanggal?.toMillis?.() || 0) - (a.tanggal?.toMillis?.() || 0)));
      setLoading(false);
    });

    return () => { unsubShops(); unsubProds(); unsubSales(); };
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !activeProfileId) return;

    const shop = shops.find(s => s.id === formData.tokoId);
    const product = products.find(p => p.id === formData.produkId);
    if (!shop || !product) { alert("Pilih toko dan produk."); return; }
    
    setIsSaving(true);
    try {
      const payload = {
        userId: auth.currentUser.uid,
        profileId: activeProfileId,
        tokoId: shop.id, namaToko: shop.nama, 
        produkId: product.id, namaProduk: product.namaProduk, 
        jumlah: formData.jumlah, 
        totalOmset: formData.totalOmset, 
        tanggal: Timestamp.fromDate(new Date(formData.tanggal))
      };
      
      if (editingSale) {
        await updateDoc(doc(db, 'PENJUALAN', editingSale.id), { ...payload, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'PENJUALAN'), { ...payload, createdAt: serverTimestamp() });
      }
      closeModal();
    } catch (err) { alert("Gagal menyimpan."); }
    finally { setIsSaving(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingSale(null);
    setFormData({ tokoId: '', produkId: '', jumlah: 1, totalOmset: 0, tanggal: new Date().toISOString().split('T')[0] });
  };

  const filteredSales = sales.filter(s => {
    const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
    const matchesSearch = (s.namaProduk || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.namaToko || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStart = !filterStartDate || (sDate && sDate >= new Date(filterStartDate));
    const matchesEnd = !filterEndDate || (sDate && sDate <= new Date(filterEndDate + 'T23:59:59'));
    return matchesSearch && matchesStart && matchesEnd;
  });

  const totalOmsetVal = filteredSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black dark:text-white">Rekap Penjualan</h2>
          <p className="text-slate-500 text-sm font-medium italic">Monitor arus kas masuk harian Anda.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all uppercase tracking-widest">
          <Plus className="w-5 h-5" /> Input Transaksi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] col-span-1 md:col-span-2 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Total Omset Terfilter</p>
          <p className="text-4xl font-black mt-2">Rp {formatDots(totalOmsetVal)}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 space-y-3 shadow-sm">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl text-xs outline-none border border-transparent focus:border-indigo-500" />
           </div>
           <div className="grid grid-cols-2 gap-2">
              <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg text-[10px] outline-none" />
              <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-lg text-[10px] outline-none" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSales.map(sale => (
          <div key={sale.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all group">
             <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> {sale.tanggal?.toDate?.().toLocaleDateString('id-ID')}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => { setEditingSale(sale); setFormData({ tokoId: sale.tokoId, produkId: sale.produkId, jumlah: sale.jumlah, totalOmset: sale.totalOmset, tanggal: sale.tanggal?.toDate?.().toISOString().split('T')[0] || '' }); setIsModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                   <button onClick={async () => { if(confirm('Hapus transaksi ini?')) await deleteDoc(doc(db, 'PENJUALAN', sale.id)); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
             </div>
             <div className="mb-4">
                <h4 className="text-sm font-black dark:text-white leading-tight mb-1">{sale.namaProduk}</h4>
                <p className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1"><Store className="w-3 h-3" /> {sale.namaToko}</p>
             </div>
             <div className="flex items-center justify-between pt-4 border-t dark:border