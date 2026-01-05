
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Sale, Product, Shop } from '../types';
import { 
  FileText, Download, Printer, Table, Loader2, Calendar, 
  Store, Package, ShoppingCart, ChevronRight
} from 'lucide-react';

interface ReportExportProps {
  activeProfileId: string;
  activeProfileName: string;
}

const ReportExport: React.FC<ReportExportProps> = ({ activeProfileId, activeProfileName }) => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportType, setExportType] = useState<'SALES' | 'PRODUCTS' | 'SHOPS'>('SALES');

  // Helper to convert data to CSV and download
  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      alert("Tidak ada data untuk diekspor.");
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(header => {
          const val = row[header];
          // Handle values that might contain commas
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    const csvContent = "\uFEFF" + csvRows.join('\n'); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      if (exportType === 'SALES') {
        const q = query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId));
        const snap = await getDocs(q);
        const rawData = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        
        const filtered = rawData.filter(s => {
          const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
          const matchesStart = !startDate || (sDate && sDate >= new Date(startDate));
          const matchesEnd = !endDate || (sDate && sDate <= new Date(endDate + 'T23:59:59'));
          return matchesStart && matchesEnd;
        }).map(s => ({
          Tanggal: s.tanggal?.toDate ? s.tanggal.toDate().toLocaleDateString('id-ID') : '-',
          Toko: s.namaToko,
          Produk: s.namaProduk,
          Jumlah: s.jumlah,
          Omset: s.totalOmset
        }));
        
        downloadCSV(filtered, `Laporan_Penjualan_${activeProfileName.replace(/\s+/g, '_')}`);
      } else if (exportType === 'PRODUCTS') {
        const q = query(collection(db, 'NAMA PRODUK'), where('profileId', '==', activeProfileId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => {
          const p = d.data();
          return {
            Toko: p.namaToko,
            Nama_Produk: p.namaProduk,
            Kategori: p.kategori,
            Harga: p.hargaJual,
            Link: p.linkProduk || '-'
          };
        });
        downloadCSV(data, `Daftar_Produk_${activeProfileName.replace(/\s+/g, '_')}`);
      } else {
        const q = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => {
          const s = d.data();
          return {
            Nama_Toko: s.nama,
            Asal_Toko: s.asalToko,
            Awal_Promosi: s.awalPromosi,
            Link: s.linkToko
          };
        });
        downloadCSV(data, `Daftar_Toko_${activeProfileName.replace(/\s+/g, '_')}`);
      }
    } catch (err) {
      alert("Gagal mengekspor data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col gap-2 print:hidden">
        <h2 className="text-2xl font-black dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" /> Laporan & Ekspor Data
        </h2>
        <p className="dark:text-slate-400 text-slate-500 text-sm font-medium">Unduh data bisnis Anda dalam format Excel (CSV) atau cetak PDF.</p>
      </header>

      {/* Control Card */}
      <div className="dark:bg-slate-900 bg-white p-6 rounded-3xl border dark:border-slate-800 border-slate-100 shadow-sm space-y-6 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Category Picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">Kategori Data</label>
            <div className="flex flex-col gap-2">
              {[
                { id: 'SALES', label: 'Penjualan', icon: ShoppingCart },
                { id: 'PRODUCTS', label: 'Produk', icon: Package },
                { id: 'SHOPS', label: 'Toko', icon: Store }
              ].map(btn => (
                <button
                  key={btn.id}
                  onClick={() => setExportType(btn.id as any)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all font-bold text-sm ${
                    exportType === btn.id 
                    ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600' 
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

          {/* Date Filter (Only for Sales) */}
          <div className={`space-y-2 transition-opacity ${exportType === 'SALES' ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <label className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest ml-1">Periode (Opsional)</label>
            <div className="space-y-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-xs font-bold dark:text-slate-100" 
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 dark:bg-slate-800 bg-slate-50 border dark:border-slate-700 border-slate-200 rounded-xl text-xs font-bold dark:text-slate-100" 
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 flex flex-col justify-end">
            <button 
              onClick={handleExportCSV}
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Table className="w-5 h-5" /> UNDUH EXCEL (CSV)</>}
            </button>
            <button 
              onClick={() => window.print()}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/10 active:scale-[0.98]"
            >
              <Printer className="w-5 h-5" /> CETAK / PDF
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-5 dark:bg-amber-900/10 bg-amber-50 rounded-2xl border dark:border-amber-900/20 border-amber-100 print:hidden">
        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-500 flex items-start gap-2">
          💡 Tips: Gunakan format CSV untuk membuka data di Excel atau Google Sheets. Gunakan tombol Cetak untuk menyimpan ringkasan tampilan dalam format PDF.
        </p>
      </div>

      {/* PRINT VERSION (Hidden by CSS normally) */}
      <div className="hidden print:block bg-white text-black p-10 font-sans">
        <div className="border-b-4 border-black pb-4 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">PT BMS</h1>
            <p className="text-sm font-bold tracking-widest text-slate-500">LAPORAN MANAJEMEN DATA</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black uppercase">Akun Bisnis</p>
            <p className="text-lg font-bold">{activeProfileName}</p>
            <p className="text-[10px] text-slate-500">{new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
          </div>
        </div>

        <div className="space-y-8">
           <div className="p-4 bg-slate-100 rounded-lg">
              <h2 className="text-xl font-bold mb-2">Ringkasan Laporan</h2>
              <p className="text-sm">Laporan ini dibuat secara otomatis melalui sistem Dashboard PT BMS. Data yang tercantum adalah data real-time per tanggal cetak.</p>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="border p-4 rounded-lg">
                 <p className="text-xs font-bold text-slate-500 uppercase">Kategori Laporan</p>
                 <p className="text-lg font-bold">{exportType === 'SALES' ? 'Rekap Penjualan' : exportType === 'PRODUCTS' ? 'Daftar Produk' : 'Katalog Toko'}</p>
              </div>
              {startDate && (
                <div className="border p-4 rounded-lg">
                   <p className="text-xs font-bold text-slate-500 uppercase">Periode</p>
                   <p className="text-lg font-bold">{startDate} s/d {endDate || 'Hari Ini'}</p>
                </div>
              )}
           </div>

           <div className="pt-20 text-center border-t">
              <p className="text-xs italic text-slate-400">Dokumen ini sah dihasilkan secara digital oleh PT BMS Dashboard.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
