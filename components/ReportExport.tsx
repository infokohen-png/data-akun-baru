
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FileText, Table, Loader2, Github, Save, CheckCircle2, AlertCircle, 
  Printer, ShoppingCart, Package, Store, ChevronRight, MessageSquare, RefreshCw
} from 'lucide-react';

interface ReportExportProps {
  activeProfileId: string;
  activeProfileName: string;
}

const ReportExport: React.FC<ReportExportProps> = ({ activeProfileId, activeProfileName }) => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportType, setExportType] = useState<'SALES' | 'PRODUCTS' | 'SHOPS' | 'GITHUB'>('SALES');

  // GitHub Configuration
  const [ghToken, setGhToken] = useState(() => localStorage.getItem('gh_token') || '');
  const [ghRepo, setGhRepo] = useState(() => localStorage.getItem('gh_repo') || '');
  const [ghOwner, setGhOwner] = useState(() => localStorage.getItem('gh_owner') || '');
  const [commitMessage, setCommitMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  // Statistik untuk Pesan Komit
  const [counts, setCounts] = useState({ shops: 0, products: 0, sales: 0 });

  // 1. Pantau jumlah data secara real-time untuk mengisi pesan komit
  useEffect(() => {
    if (!activeProfileId) return;

    const qShops = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    const qProds = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
    const qSales = query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId));

    const unsubShops = onSnapshot(qShops, (s) => setCounts(prev => ({ ...prev, shops: s.size })));
    const unsubProds = onSnapshot(qProds, (s) => setCounts(prev => ({ ...prev, products: s.size })));
    const unsubSales = onSnapshot(qSales, (s) => setCounts(prev => ({ ...prev, sales: s.size })));

    return () => { unsubShops(); unsubProds(); unsubSales(); };
  }, [activeProfileId]);

  // 2. Update Pesan Komit Otomatis setiap kali jumlah data berubah
  useEffect(() => {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString('id-ID');
    const autoMsg = `Backup ${activeProfileName}: ${counts.shops} Toko, ${counts.products} Produk, ${counts.sales} Penjualan [${date} ${time}]`;
    setCommitMessage(autoMsg);
  }, [counts, activeProfileName, exportType]);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${('' + row[header]).replace(/"/g, '""')}"`).join(','))
    ];
    const csvContent = "\uFEFF" + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGitHubSync = async () => {
    if (!ghToken || !ghRepo || !ghOwner) {
      setSyncStatus({ type: 'error', message: 'Config GitHub (Token/Owner/Repo) kosong!' });
      return;
    }

    setLoading(true);
    setSyncStatus({ type: null, message: '' });
    
    localStorage.setItem('gh_token', ghToken);
    localStorage.setItem('gh_repo', ghRepo);
    localStorage.setItem('gh_owner', ghOwner);

    try {
      const qShops = await getDocs(query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId)));
      const qProds = await getDocs(query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId)));
      const qSales = await getDocs(query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId)));
      const qContents = await getDocs(query(collection(db, 'KONTEN'), where('profileId', '==', activeProfileId)));

      const fullData = {
        profileName: activeProfileName,
        profileId: activeProfileId,
        syncTimestamp: new Date().toISOString(),
        summary: counts,
        data: {
          shops: qShops.docs.map(d => ({ id: d.id, ...d.data() })),
          products: qProds.docs.map(d => ({ id: d.id, ...d.data() })),
          sales: qSales.docs.map(d => ({ id: d.id, ...d.data() })),
          contents: qContents.docs.map(d => ({ id: d.id, ...d.data() }))
        }
      };

      const path = `backups/bms_data_${activeProfileId}.json`;
      const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${path}`;
      
      let sha = null;
      try {
        const getRes = await fetch(url, {
          headers: { 'Authorization': `token ${ghToken}`, 'Accept': 'application/vnd.github.v3+json' }
        });
        if (getRes.status === 200) {
          const fileData = await getRes.json();
          sha = fileData.sha;
        }
      } catch (e) {}

      const utf8String = unescape(encodeURIComponent(JSON.stringify(fullData, null, 2)));
      const base64Content = btoa(utf8String);

      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Authorization': `token ${ghToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitMessage || `Cloud Backup: ${activeProfileName}`,
          content: base64Content,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        setSyncStatus({ type: 'success', message: 'Sinkronisasi Cloud Berhasil!' });
      } else {
        const errJson = await putRes.json();
        setSyncStatus({ type: 'error', message: `GitHub Error: ${errJson.message}` });
      }
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: `Gagal Koneksi: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      if (exportType === 'SALES') {
        const q = query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
          .filter(s => {
            const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
            return (!startDate || (sDate && sDate >= new Date(startDate))) && (!endDate || (sDate && sDate <= new Date(endDate + 'T23:59:59')));
          }).map(s => ({
            Tanggal: s.tanggal?.toDate ? s.tanggal.toDate().toLocaleDateString('id-ID') : '-',
            Toko: s.namaToko,
            Produk: s.namaProduk,
            Qty: s.jumlah,
            Total: s.totalOmset
          }));
        downloadCSV(data, `Sales_${activeProfileName.replace(/\s+/g, '_')}`);
      } else if (exportType === 'PRODUCTS') {
        const snap = await getDocs(query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId)));
        downloadCSV(snap.docs.map(d => ({ Produk: d.data().namaProduk, Toko: d.data().namaToko, Harga: d.data().hargaJual })), `Produk_${activeProfileName.replace(/\s+/g, '_')}`);
      } else if (exportType === 'SHOPS') {
        const snap = await getDocs(query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId)));
        downloadCSV(snap.docs.map(d => ({ Nama: d.data().nama, Asal: d.data().asalToko, Promosi: d.data().awalPromosi })), `Toko_${activeProfileName.replace(/\s+/g, '_')}`);
      }
    } catch (err) { alert("Ekspor gagal."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-2 print:hidden">
        <h2 className="text-2xl font-black dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" /> Laporan & Cloud Sync
        </h2>
        <p className="dark:text-slate-400 text-slate-500 text-sm font-medium">Backup otomatis ke GitHub Cloud atau Ekspor Excel.</p>
      </header>

      <div className="dark:bg-slate-900 bg-white p-6 rounded-[2.5rem] border dark:border-slate-800 border-slate-100 shadow-sm space-y-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2 col-span-1">
            <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">Pilih Mode</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'SALES', label: 'Penjualan', icon: ShoppingCart },
                { id: 'PRODUCTS', label: 'Produk', icon: Package },
                { id: 'SHOPS', label: 'Toko', icon: Store },
                { id: 'GITHUB', label: 'GitHub Sync', icon: Github }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setExportType(btn.id as any)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all font-bold text-xs ${
                    exportType === btn.id 
                    ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 shadow-sm shadow-indigo-500/10' 
                    : 'dark:border-slate-800 border-slate-100 dark:text-slate-400 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <btn.icon className="w-4 h-4" />
                    {btn.label}
                  </div>
                  {exportType === btn.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-3">
            {exportType === 'GITHUB' ? (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Github /></div>
                   <div>
                     <h4 className="font-black text-indigo-600 text-sm">Automated Backup System</h4>
                     <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Pesan komit di bawah ini terisi otomatis berdasarkan jumlah data terbaru Anda di database.</p>
                   </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">GitHub Token (Classic)</label>
                    <input type="password" placeholder="ghp_xxxx..." value={ghToken} onChange={e => setGhToken(e.target.value)} className="w-full px-4 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-xs font-bold dark:text-white outline-none focus:border-indigo-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">Username</label>
                      <input placeholder="Owner" value={ghOwner} onChange={e => setGhOwner(e.target.value)} className="w-full px-4 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-xs font-bold dark:text-white outline-none" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">Repository</label>
                      <input placeholder="Repo" value={ghRepo} onChange={e => setGhRepo(e.target.value)} className="w-full px-4 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-xs font-bold dark:text-white outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-indigo-500" /> Commit Message (Otomatis)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={commitMessage} 
                      onChange={e => setCommitMessage(e.target.value)}
                      className="w-full px-4 py-4 dark:bg-slate-800 bg-slate-50 border-2 border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 transition-all" 
                      placeholder="Menghitung data..."
                    />
                    <button 
                      onClick={() => setCounts({ ...counts })} // Triger re-render message
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {syncStatus.type && (
                  <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-bold border animate-in fade-in ${syncStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                    {syncStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {syncStatus.message}
                  </div>
                )}

                <button 
                  onClick={handleGitHubSync}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> CADANGKAN SEKARANG</>}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-right-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className={`space-y-2 ${exportType === 'SALES' ? 'opacity-100' : 'opacity-30'}`}>
                      <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">Rentang Tanggal</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-[10px] font-bold dark:text-white" />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-[10px] font-bold dark:text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-end gap-3">
                      <button onClick={handleExportCSV} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-lg transition-all active:scale-95">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Table className="w-4 h-4" /> DOWNLOAD CSV</>}
                      </button>
                      <button onClick={() => window.print()} className="w-full border-2 dark:border-slate-800 border-slate-100 dark:text-slate-300 text-slate-600 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">
                        <Printer className="w-4 h-4" /> CETAK PDF
                      </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
