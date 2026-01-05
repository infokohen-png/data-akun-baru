
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Sale, ContentRecord, Shop } from '../types';
import { 
  Store, Package, ShoppingCart, Video, Coins, 
  ChevronDown, ChevronUp, Image as ImageIcon, 
  Filter, X, Loader2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, Tooltip, 
  ResponsiveContainer, Cell 
} from 'recharts';

interface DashboardProps {
  activeProfileId: string;
}

interface ProductDetail {
  id: string;
  nama: string;
  foto: string;
  terjual: number;
  omset: number;
  kontenCount: number;
}

interface ShopAnalysis {
  id: string;
  nama: string;
  produkCount: number;
  kontenCount: number;
  salesCount: number;
  totalOmset: number;
  details: ProductDetail[];
}

const Dashboard: React.FC<DashboardProps> = ({ activeProfileId }) => {
  const [data, setData] = useState<{
    shops: Shop[],
    products: Product[],
    contents: ContentRecord[],
    sales: Sale[]
  }>({ shops: [], products: [], contents: [], sales: [] });

  const [loading, setLoading] = useState(true);
  const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');

  useEffect(() => {
    if (!activeProfileId) return;

    setLoading(true);
    const qToko = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const qProduk = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const qKonten = query(collection(db, 'KONTEN'), where('profileId', '==', activeProfileId));
    const qSales = query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId));

    const unsubs: (() => void)[] = [];
    const handleError = (error: any) => {
      console.error("Dashboard Listener Error:", error);
      setLoading(false);
    };

    unsubs.push(onSnapshot(qToko, (snap) => {
      setData(prev => ({ ...prev, shops: snap.docs.map(d => ({ id: d.id, ...d.data() } as Shop)) }));
    }, handleError));

    unsubs.push(onSnapshot(qProduk, (snap) => {
      setData(prev => ({ ...prev, products: snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)) }));
    }, handleError));

    unsubs.push(onSnapshot(qKonten, (snap) => {
      setData(prev => ({ ...prev, contents: snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentRecord)) }));
    }, handleError));

    unsubs.push(onSnapshot(qSales, (snap) => {
      setData(prev => ({ ...prev, sales: snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)) }));
      setLoading(false);
    }, handleError));

    return () => unsubs.forEach(unsub => unsub());
  }, [activeProfileId]);

  const analysis = useMemo(() => {
    const { shops, products, contents, sales } = data;

    const filteredSales = sales.filter(s => {
      const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
      const matchesShop = !selectedShopId || s.tokoId === selectedShopId;
      const matchesStart = !startDate || (sDate && sDate >= new Date(startDate));
      const matchesEnd = !endDate || (sDate && sDate <= new Date(endDate + 'T23:59:59'));
      return matchesShop && matchesStart && matchesEnd;
    });

    const filteredContents = contents.filter(c => {
      const cDate = c.tanggal?.toDate ? c.tanggal.toDate() : null;
      const matchesShop = !selectedShopId || c.tokoId === selectedShopId;
      const matchesStart = !startDate || (cDate && cDate >= new Date(startDate));
      const matchesEnd = !endDate || (cDate && cDate <= new Date(endDate + 'T23:59:59'));
      return matchesShop && matchesStart && matchesEnd;
    });

    const targetShops = selectedShopId ? shops.filter(s => s.id === selectedShopId) : shops;

    const shopStats: ShopAnalysis[] = targetShops.map(shop => {
      const shopProducts = products.filter(p => p.namaTokoId === shop.id);
      const shopContents = filteredContents.filter(c => c.tokoId === shop.id);
      const shopSales = filteredSales.filter(s => s.tokoId === shop.id);

      const productDetails: ProductDetail[] = shopProducts.map(p => {
        const pSales = shopSales.filter(s => s.produkId === p.id);
        const pContents = shopContents.filter(c => c.produkId === p.id);
        return {
          id: p.id,
          nama: p.namaProduk,
          foto: p.fotoProduk || '',
          terjual: pSales.reduce((acc, curr) => acc + (curr.jumlah || 0), 0),
          omset: pSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0),
          kontenCount: pContents.length
        };
      });

      return {
        id: shop.id,
        nama: shop.nama,
        produkCount: shopProducts.length,
        kontenCount: shopContents.length,
        salesCount: shopSales.reduce((acc, curr) => acc + (curr.jumlah || 0), 0),
        totalOmset: shopSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0),
        details: productDetails.sort((a, b) => b.omset - a.omset)
      };
    });

    return {
      shopStats: shopStats.sort((a, b) => b.totalOmset - a.totalOmset),
      globalStats: {
        totalToko: targetShops.length,
        totalProduk: products.filter(p => !selectedShopId || p.namaTokoId === selectedShopId).length,
        totalUnitTerjual: filteredSales.reduce((acc, curr) => acc + (curr.jumlah || 0), 0),
        totalOmset: filteredSales.reduce((acc, curr) => acc + (curr.totalOmset || 0), 0),
        totalKonten: filteredContents.length
      }
    };
  }, [data, startDate, endDate, selectedShopId]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      <p className="mt-4 dark:text-slate-400 text-slate-500 font-medium">Memuat Analisis...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-black dark:text-slate-100 text-slate-900 tracking-tight">Business Intel</h1>
        <div className="flex items-center justify-between">
          <p className="dark:text-slate-400 text-slate-500 text-sm font-medium italic">Data performa akun aktif.</p>
          <div className="bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 flex items-center gap-2 flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Live</span>
          </div>
        </div>
      </header>

      {/* Optimized Filters for Mobile */}
      <div className="dark:bg-slate-900 bg-white p-3 rounded-2xl border dark:border-slate-800 border-slate-100 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none" />
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)} className="flex-1 px-3 py-2 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none">
            <option value="">Semua Toko</option>
            {data.shops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          {(startDate || endDate || selectedShopId) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setSelectedShopId(''); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid: 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {[
          { label: 'Omset', value: analysis.globalStats.totalOmset, icon: Coins, color: 'text-emerald-600', bg: 'bg-emerald-500/10', prefix: 'Rp ' },
          { label: 'Produk', value: analysis.globalStats.totalProduk, icon: Package, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Konten', value: analysis.globalStats.totalKonten, icon: Video, color: 'text-pink-600', bg: 'bg-pink-500/10' },
          { label: 'Terjual', value: analysis.globalStats.totalUnitTerjual, icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        ].map((item, idx) => (
          <div key={idx} className="dark:bg-slate-900 bg-white p-4 rounded-2xl border dark:border-slate-800 border-slate-100 shadow-sm">
            <div className={`w-8 h-8 ${item.bg} ${item.color} rounded-lg flex items-center justify-center mb-3`}>
              <item.icon className="w-4 h-4" />
            </div>
            <p className="text-[9px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
            <p className="text-sm md:text-xl font-black dark:text-slate-100 text-slate-900 mt-1 truncate">
              {item.prefix || ''}{item.value >= 1000000 ? (item.value / 1000000).toFixed(1) + 'M' : item.value.toLocaleString('id-ID')}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold dark:text-slate-100 text-slate-900 px-1">Kinerja Toko</h3>
          <div className="space-y-3">
            {analysis.shopStats.length > 0 ? analysis.shopStats.map((shop, idx) => {
              const isExpanded = expandedShopId === shop.id;
              return (
                <div key={shop.id} className={`dark:bg-slate-900 bg-white rounded-2xl border ${isExpanded ? 'border-indigo-600 shadow-md' : 'dark:border-slate-800 border-slate-100 shadow-sm'} transition-all duration-300`}>
                  <div className="p-4 cursor-pointer flex items-center justify-between gap-3" onClick={() => setExpandedShopId(isExpanded ? null : shop.id)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs ${isExpanded ? 'bg-indigo-600 text-white' : 'dark:bg-slate-800 bg-slate-100 dark:text-slate-500 text-slate-400'}`}>{idx + 1}</div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold dark:text-slate-100 text-slate-900 truncate">{shop.nama}</h4>
                        <p className="text-[9px] font-bold dark:text-slate-500 text-slate-400 uppercase tracking-wider">{shop.produkCount} Produk • {shop.salesCount} Terjual</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <p className="text-xs font-black text-emerald-600">Rp {(shop.totalOmset >= 1000000 ? (shop.totalOmset / 1000000).toFixed(1) + 'jt' : shop.totalOmset.toLocaleString('id-ID'))}</p>
                      <div className={`p-1.5 rounded-full ${isExpanded ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'dark:bg-slate-800 bg-slate-100 text-slate-400'}`}>{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t dark:border-slate-800 border-slate-50 dark:bg-slate-950/20 bg-slate-50/50 p-3 space-y-2 animate-in slide-in-from-top-2">
                      {shop.details.length > 0 ? shop.details.map((product) => (
                        <div key={product.id} className="dark:bg-slate-900 bg-white p-3 rounded-xl border dark:border-slate-800 border-slate-100 shadow-xs flex items-center gap-3">
                          <div className="w-10 h-10 dark:bg-slate-800 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                            {product.foto ? <img src={product.foto} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-2.5 dark:text-slate-700 text-slate-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-[11px] font-bold dark:text-slate-100 text-slate-900 truncate leading-tight">{product.nama}</h5>
                            <p className="text-[9px] dark:text-slate-500 text-slate-500 font-bold mt-0.5">{product.terjual} terjual • {product.kontenCount} konten</p>
                          </div>
                          <p className="text-[11px] font-black text-emerald-600">Rp {product.omset.toLocaleString('id-ID')}</p>
                        </div>
                      )) : <p className="text-center dark:text-slate-600 text-slate-400 text-[10px] py-2 italic">No data.</p>}
                    </div>
                  )}
                </div>
              );
            }) : <div className="text-center py-10 dark:bg-slate-900 bg-white rounded-2xl border-2 border-dashed dark:border-slate-800 border-slate-100 text-slate-400 text-xs italic">Belum ada data.</div>}
          </div>
        </div>

        <div className="dark:bg-slate-900 bg-white p-4 rounded-2xl border dark:border-slate-800 border-slate-100 shadow-sm h-fit">
          <h3 className="text-[10px] font-black dark:text-slate-100 text-slate-900 mb-4 text-center uppercase tracking-widest text-slate-400">Distribusi Omset</h3>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.shopStats.slice(0, 5)}>
                <XAxis dataKey="nama" hide />
                <Tooltip 
                  contentStyle={{ fontSize: '10px', backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  cursor={{fill: 'transparent'}} 
                />
                <Bar dataKey="totalOmset" radius={[4, 4, 4, 4]} barSize={20}>
                  {analysis.shopStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
