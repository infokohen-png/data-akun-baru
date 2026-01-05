
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  serverTimestamp, query, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Shop } from '../types';
import { Plus, Search, MapPin, Store, ExternalLink, Loader2 } from 'lucide-react';

interface ShopListProps {
  activeProfileId: string;
}

const ShopList: React.FC<ShopListProps> = ({ activeProfileId }) => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nama: '', linkToko: '', asalToko: '', awalPromosi: '' });

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    const q = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[];
      setShops(data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
      setLoading(false);
    });
  }, [activeProfileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      if (editingShop) {
        await updateDoc(doc(db, 'NAMA TOKO', editingShop.id), formData);
      } else {
        await addDoc(collection(db, 'NAMA TOKO'), { 
          ...formData, 
          userId: auth.currentUser.uid,
          profileId: activeProfileId,
          createdAt: serverTimestamp() 
        });
      }
      setIsModalOpen(false);
      setFormData({ nama: '', linkToko: '', asalToko: '', awalPromosi: '' });
    } catch (err) { alert('Gagal'); }
    finally { setIsSaving(false); }
  };

  const filteredShops = shops.filter(shop => shop.nama.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 md:mt-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-black dark:text-white">Katalog Toko</h2>
        <button onClick={() => { setEditingShop(null); setIsModalOpen(true); }} className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
          <Plus className="w-5 h-5" /> Tambah Toko
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Cari nama toko..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 dark:bg-slate-900 dark:border-slate-800 border rounded-xl outline-none dark:text-white" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.map(shop => (
          <div key={shop.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 shadow-sm group hover:border-indigo-500 transition-colors">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600"><Store /></div>
                <div>
                   <h3 className="font-black dark:text-white">{shop.nama}</h3>
                   <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {shop.asalToko}</p>
                </div>
             </div>
             <div className="flex gap-2">
                <button onClick={() => { setEditingShop(shop); setFormData({ ...shop }); setIsModalOpen(true); }} className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 dark:text-indigo-400 text-indigo-600 rounded-xl font-bold text-xs">Edit</button>
                <a href={shop.linkToko} target="_blank" className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl"><ExternalLink className="w-4 h-4" /></a>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-8 relative">
             <h3 className="text-xl font-black mb-6 dark:text-white">{editingShop ? 'Edit Toko' : 'Toko Baru'}</h3>
             <form onSubmit={handleSave} className="space-y-4">
                <input required className="w-full px-4 py-3 dark:bg-slate-800 dark:border-slate-700 border rounded-xl outline-none dark:text-white" placeholder="Nama Toko" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} />
                <input required className="w-full px-4 py-3 dark:bg-slate-800 dark:border-slate-700 border rounded-xl outline-none dark:text-white" placeholder="Link Toko" value={formData.linkToko} onChange={(e) => setFormData({...formData, linkToko: e.target.value})} />
                <input required className="w-full px-4 py-3 dark:bg-slate-800 dark:border-slate-700 border rounded-xl outline-none dark:text-white" placeholder="Kota Asal" value={formData.asalToko} onChange={(e) => setFormData({...formData, asalToko: e.target.value})} />
                <input type="date" required className="w-full px-4 py-3 dark:bg-slate-800 dark:border-slate-700 border rounded-xl outline-none dark:text-white" value={formData.awalPromosi} onChange={(e) => setFormData({...formData, awalPromosi: e.target.value})} />
                <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">{isSaving ? 'Menyimpan...' : 'Simpan Toko'}</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopList;
