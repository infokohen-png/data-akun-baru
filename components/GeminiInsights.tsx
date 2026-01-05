
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Shop } from '../types';
import { Sparkles, Loader2, RefreshCw, Calendar } from 'lucide-react';

interface GeminiInsightsProps {
  activeProfileId: string;
}

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ activeProfileId }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [filterShopId, setFilterShopId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    if (!activeProfileId) return;
    const q = query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId));
    return onSnapshot(q, (snapshot) => {
      setAllShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[]);
    }, (err) => console.error("Insight Shop Snapshot Error:", err));
  }, [activeProfileId]);

  const generateInsights = async () => {
    if (!activeProfileId) return;
    setLoading(true);
    setError(null);
    try {
      const tokoSnap = await getDocs(query(collection(db, 'NAMA TOKO'), where('profileId', '==', activeProfileId)));
      const penjualanSnap = await getDocs(query(collection(db, 'PENJUALAN'), where('profileId', '==', activeProfileId)));
      const kontenSnap = await getDocs(query(collection(db, 'KONTEN'), where('profileId', '==', activeProfileId)));

      const selectedShop = allShops.find(s => s.id === filterShopId);

      const sales = penjualanSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(s => {
        const sDate = s.tanggal?.toDate ? s.tanggal.toDate() : null;
        const matchesShop = !filterShopId || s.tokoId === filterShopId;
        const matchesStart = !filterStartDate || (sDate && sDate >= new Date(filterStartDate));
        const matchesEnd = !filterEndDate || (sDate && sDate <= new Date(filterEndDate + 'T23:59:59'));
        return matchesShop && matchesStart && matchesEnd;
      });

      const contents = kontenSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(c => {
        const cDate = c.tanggal?.toDate ? c.tanggal.toDate() : null;
        const matchesShop = !filterShopId || c.tokoId === filterShopId;
        const matchesStart = !filterStartDate || (cDate && cDate >= new Date(filterStartDate));
        const matchesEnd = !filterEndDate || (cDate && cDate <= new Date(filterEndDate + 'T23:59:59'));
        return matchesShop && matchesStart && matchesEnd;
      });

      const analysisData = {
        filterContext: selectedShop ? `Analisis khusus Toko: ${selectedShop.nama}` : 'Analisis Seluruh Bisnis',
        periode: filterStartDate && filterEndDate ? `${filterStartDate} sampai ${filterEndDate}` : 'Seluruh Waktu',
        totalUnitTerjual: sales.reduce((acc, d) => acc + (d.jumlah || 0), 0),
        totalOmset: sales.reduce((acc, d) => acc + (d.totalOmset || 0), 0),
        jumlahPostingan: contents.length,
      };

      // Proteksi akses process.env untuk Vercel
      let apiKey = '';
      try {
        // Cek browser global first, then fallback to process.env if available
        apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
      } catch (e) {
        console.warn("API_KEY access warning:", e);
      }
      
      if (!apiKey) {
        throw new Error("Gemini API Key tidak terdeteksi. Pastikan API_KEY sudah diatur di Environment Variables.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analisis data bisnis (${analysisData.filterContext}) periode (${analysisData.periode}):
          - Unit Terjual: ${analysisData.totalUnitTerjual}
          - Total Omset: Rp ${analysisData.totalOmset.toLocaleString('id-ID')}
          - Postingan Konten: ${analysisData.jumlahPostingan}
          
          Tolong berikan laporan strategis singkat, tajam, dan edukatif untuk UMKM ini dalam Bahasa Indonesia. Fokus pada cara meningkatkan omset berdasarkan data ini.`,
        config: { 
          systemInstruction: "Anda adalah analis bisnis UMKM senior dengan keahlian dalam strategi konten dan manajemen penjualan." 
        }
      });

      setInsight(response.text || "AI tidak memberikan respons.");
    } catch (err: any) {
      console.error("AI Insight Generation Error:", err);
      setError(err.message || "Gagal menghasilkan insight.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-6 h-6 text-indigo-600" /> AI Strategist</h2>
        <p className="text-slate-500">Wawasan pintar berbasis data untuk pertumbuhan bisnis Anda.</p>
      </header>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <select value={filterShopId} onChange={(e) => setFilterShopId(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"><option value="">Semua Toko</option>{allShops.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}</select>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-transparent outline-none" />
          <span className="text-slate-400">-</span>
          <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-transparent outline-none" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-4 border border-red-100 flex items-center gap-2 text-sm z-10">{error}</div>}
        
        {!insight && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 z-10">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-400 mb-2">
               <Sparkles className="w-10 h-10" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-bold text-slate-900">Mulai Analisis Strategis</h3>
              <p className="text-slate-500 mt-2 text-sm">Gemini AI akan memproses data penjualan dan konten Anda untuk memberikan saran pertumbuhan yang dipersonalisasi.</p>
            </div>
            <button onClick={generateInsights} className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 transition-all">Analisis Bisnis Sekarang</button>
          </div>
        )}

        {loading && <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 z-10"><Loader2 className="w-12 h-12 text-indigo-600 animate-spin" /><p className="text-slate-500 font-bold text-sm animate-pulse uppercase tracking-widest">AI sedang berpikir...</p></div>}
        
        {insight && !loading && (
          <div className="space-y-6 z-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> Laporan Strategis Gemini AI
              </h3>
              <button onClick={generateInsights} className="text-indigo-600 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 hover:underline"><RefreshCw className="w-3 h-3" /> Refresh Analysis</button>
            </div>
            <div className="prose prose-slate max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed font-medium text-sm md:text-base">{insight}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiInsights;
