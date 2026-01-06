
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Talent, ViewState } from '../types';
import { 
  Plus, Trash2, Edit3, X, 
  Loader2, Video, 
  UserCircle, Calendar, Hash,
  ShoppingBag, Layers, Clock, Target, TrendingUp, Users, CheckCircle, BarChart3, Sparkles, Link as LinkIcon, ExternalLink, Phone, PlusCircle, MinusCircle, Award, Camera, Image as ImageIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface TalentManagementProps {
  activeProfileId: string;
  activeProjectId: string;
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

interface TargetHarianItem {
  id: string;
  talentId: string;
  namaTalent: string;
  namaProduk: string;
  jumlahKonten: number;
  tanggal: any;
  profileId: string;
  status: string;
}

interface KPITargetItem {
  id: string;
  talentId: string;
  namaTalent: string;
  bulan: string;
  tahun: string;
  targetJumlah: number;
  profileId: string;
}

const TalentManagement: React.FC<TalentManagementProps> = ({ activeProfileId, activeProjectId, currentView, setView }) => {
  const [talents, setTalents] = useState<Talent[]>([]);
  const [targetHarianList, setTargetHarianList] = useState<TargetHarianItem[]>([]);
  const [postinganList, setPostinganList] = useState<any[]>([]);
  const [kpiList, setKpiList] = useState<KPITargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper pemformatan titik
  const formatDots = (val: number | string) => {
    if (!val && val !== 0) return '';
    const stringVal = val.toString().replace(/\D/g, '');
    return stringVal.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseDots = (val: string) => parseInt(val.replace(/\./g, ''), 10) || 0;

  // Form States
  const [talentForm, setTalentForm] = useState({ 
    nama: '', 
    namaAkun: [''], 
    kontak: '', 
    status: 'AKTIF' as 'AKTIF' | 'NONAKTIF' 
  });
  const [contentForm, setContentForm] = useState({ talentId: '', namaProduk: '', jumlahKonten: 1, tanggal: new Date().toISOString().split('T')[0] });
  const [kpiForm, setKpiForm] = useState({ 
    talentId: '', 
    bulan: new Date().toLocaleString('id-ID', { month: 'long' }), 
    tahun: new Date().getFullYear().toString(), 
    targetJumlah: 30 
  });
  
  const [reportForm, setReportForm] = useState({
    talentId: '',
    namaTalent: '',
    namaAkunTalent: '',
    namaProduk: '',
    jumlahPostingan: 1,
    linkPostingan: [''],
    fotoProduk: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const years = [new Date().getFullYear().toString(), (new Date().getFullYear() + 1).toString()];

  useEffect(() => {
    if (!activeProjectId) return;
    setLoading(true);

    const qTalents = query(collection(db, 'NAMA TALENT'), where('projectId', '==', activeProjectId));
    const qTargetHarian = query(collection(db, 'TARGET HARIAN'), where('profileId', '==', activeProjectId));
    const qPostingan = query(collection(db, 'JUMLAH POSTINGAN'), where('projectId', '==', activeProjectId));
    const qKPI = query(collection(db, 'KPI_TALENT'), where('profileId', '==', activeProjectId));

    const unsubTalents = onSnapshot(qTalents, (snap) => setTalents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Talent))));
    const unsubTargetHarian = onSnapshot(qTargetHarian, (snap) => setTargetHarianList(snap.docs.map(d => ({ id: d.id, ...d.data() } as TargetHarianItem))));
    const unsubPostingan = onSnapshot(qPostingan, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setPostinganList(data.sort((a: any, b: any) => (b.tanggal?.toMillis?.() || 0) - (a.tanggal?.toMillis?.() || 0)));
    });
    const unsubKPI = onSnapshot(qKPI, (snap) => {
      setKpiList(snap.docs.map(d => ({ id: d.id, ...d.data() } as KPITargetItem)));
      setLoading(false);
    });

    return () => { unsubTalents(); unsubTargetHarian(); unsubPostingan(); unsubKPI(); };
  }, [activeProjectId]);

  const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();

  const stats = useMemo(() => {
    const totalTalents = talents.length;
    const totalDailyTargets = targetHarianList.reduce((acc, curr) => acc + (Number(curr.jumlahKonten) || 0), 0);
    const totalPosted = postinganList.reduce((acc, curr) => acc + (Number(curr.jumlahPostingan) || 0), 0);
    const completionRate = totalDailyTargets > 0 ? Math.round((totalPosted / totalDailyTargets) * 100) : 0;

    const chartData = talents.map(t => {
      const talentPosted = postinganList
        .filter(p => p.talentId === t.id)
        .reduce((acc, curr) => acc + (Number(curr.jumlahPostingan) || 0), 0);
      return { name: t.nama, posted: talentPosted };
    }).sort((a, b) => b.posted - a.posted);

    const talentKPIAchievements = talents.map(talent => {
      const target = kpiList.find(k => 
        k.talentId === talent.id && 
        k.bulan === currentMonth && 
        k.tahun === currentYear
      )?.targetJumlah || 0;

      const actual = postinganList.filter(p => {
        if (!p.tanggal?.toDate) return false;
        const d = p.tanggal.toDate();
        const m = d.toLocaleString('id-ID', { month: 'long' });
        const y = d.getFullYear().toString();
        return p.talentId === talent.id && m === currentMonth && y === currentYear;
      }).reduce((acc, curr) => acc + (Number(curr.jumlahPostingan) || 0), 0);

      const rawPercent = target > 0 ? (actual / target) * 100 : (actual > 0 ? 100 : 0);
      const displayPercent = Math.min(Math.round(rawPercent), 100);

      return {
        id: talent.id,
        nama: talent.nama,
        target,
        actual,
        percent: displayPercent,
        isAchieved: actual >= target && target > 0
      };
    });

    return { totalTalents, totalDailyTargets, totalPosted, completionRate, chartData, talentKPIAchievements };
  }, [talents, targetHarianList, postinganList, kpiList, currentMonth, currentYear]);

  const handleSaveTalent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const filteredAccounts = talentForm.namaAkun.filter(acc => acc.trim() !== '');
      const payload = { 
        ...talentForm, 
        namaAkun: filteredAccounts,
        profileId: activeProfileId, 
        projectId: activeProjectId, 
        updatedAt: serverTimestamp() 
      };
      if (editingItem) await updateDoc(doc(db, 'NAMA TALENT', editingItem.id), payload);
      else await addDoc(collection(db, 'NAMA TALENT'), { ...payload, createdAt: serverTimestamp() });
      closeModal();
    } catch (err) { alert("Gagal menyimpan data."); } finally { setIsSaving(false); }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const selectedTalent = talents.find(t => t.id === contentForm.talentId);
    try {
      const payload = { ...contentForm, namaTalent: selectedTalent?.nama || '', tanggal: Timestamp.fromDate(new Date(contentForm.tanggal)), profileId: activeProfileId, status: 'PROSES' };
      if (editingItem) await updateDoc(doc(db, 'TARGET HARIAN', editingItem.id), payload);
      else await addDoc(collection(db, 'TARGET HARIAN'), payload);
      closeModal();
    } catch (err) { alert("Gagal menyimpan."); } finally { setIsSaving(false); }
  };

  const handleSaveKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const selectedTalent = talents.find(t => t.id === kpiForm.talentId);
    try {
      const payload = { ...kpiForm, namaTalent: selectedTalent?.nama || '', profileId: activeProfileId };
      if (editingItem) await updateDoc(doc(db, 'KPI_TALENT', editingItem.id), payload);
      else await addDoc(collection(db, 'KPI_TALENT'), payload);
      closeModal();
    } catch (err) { alert("Gagal menyimpan KPI."); } finally { setIsSaving(false); }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const selectedTalent = talents.find(t => t.id === reportForm.talentId);
    try {
      let finalImageUrl = reportForm.fotoProduk;
      if (selectedFile) {
        const storageRef = ref(storage, `talent_postingan/${activeProjectId}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(storageRef, selectedFile);
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      }

      const payload = {
        ...reportForm,
        namaTalent: selectedTalent?.nama || '',
        fotoProduk: finalImageUrl,
        tanggal: Timestamp.fromDate(new Date(reportForm.tanggal)),
        projectId: activeProjectId,
        profileId: activeProfileId
      };
      if (editingItem) await updateDoc(doc(db, 'JUMLAH POSTINGAN', editingItem.id), payload);
      else await addDoc(collection(db, 'JUMLAH POSTINGAN'), payload);
      closeModal();
    } catch (err) { alert("Gagal menyimpan postingan."); } finally { setIsSaving(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditingItem(null);
    setTalentForm({ nama: '', namaAkun: [''], kontak: '', status: 'AKTIF' });
    setContentForm({ talentId: '', namaProduk: '', jumlahKonten: 1, tanggal: new Date().toISOString().split('T')[0] });
    setKpiForm({ talentId: '', bulan: new Date().toLocaleString('id-ID', { month: 'long' }), tahun: new Date().getFullYear().toString(), targetJumlah: 30 });
    setReportForm({ talentId: '', namaTalent: '', namaAkunTalent: '', namaProduk: '', jumlahPostingan: 1, linkPostingan: [''], fotoProduk: '', tanggal: new Date().toISOString().split('T')[0] });
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const updateLinkInputs = (count: number) => {
    setReportForm(prev => {
      const currentLinks = [...prev.linkPostingan];
      if (count > currentLinks.length) {
        while (currentLinks.length < count) currentLinks.push('');
      } else {
        currentLinks.length = count;
      }
      return { ...prev, jumlahPostingan: count, linkPostingan: currentLinks };
    });
  };

  const addAccountField = () => {
    setTalentForm(prev => ({ ...prev, namaAkun: [...prev.namaAkun, ''] }));
  };

  const removeAccountField = (index: number) => {
    setTalentForm(prev => ({
      ...prev,
      namaAkun: prev.namaAkun.filter((_, i) => i !== index)
    }));
  };

  const handleAccountChange = (index: number, value: string) => {
    const newAccounts = [...talentForm.namaAkun];
    newAccounts[index] = value;
    setTalentForm({ ...talentForm, namaAkun: newAccounts });
  };

  const selectedTalentAccounts = useMemo(() => {
    const talent = talents.find(t => t.id === reportForm.talentId);
    return talent?.namaAkun || [];
  }, [reportForm.talentId, talents]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  // --- VIEWS ---

  if (currentView === 'TALENT_DASHBOARD') {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4">
        <header>
          <h2 className="text-3xl font-black dark:text-white tracking-tight">Analisa Talent</h2>
          <p className="text-slate-500 font-medium italic">Performa dan produktivitas tim kreatif.</p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Talent', value: stats.totalTalents, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
            { label: 'Konten Harian', value: stats.totalDailyTargets, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30' },
            { label: 'Konten Posted', value: stats.totalPosted, icon: Video, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Pencapaian', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/30' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 shadow-sm">
               <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                 <item.icon className="w-5 h-5" />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
               <p className="text-2xl font-black dark:text-white mt-1">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                   <Award className="w-5 h-5 text-indigo-600" /> KPI Performa Talent 
                   <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg text-indigo-600 uppercase ml-2">{currentMonth}</span>
                 </h3>
              </div>
              
              <div className="space-y-6">
                {stats.talentKPIAchievements.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-end">
                       <div>
                         <p className="text-sm font-black dark:text-white">{item.nama}</p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                           Actual: {item.actual} / Target: {item.target}
                         </p>
                       </div>
                       <div className="text-right">
                         <span className={`text-sm font-black ${item.isAchieved ? 'text-emerald-500' : 'text-indigo-600'}`}>
                           {item.percent}%
                         </span>
                       </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                       <div 
                         className={`h-full transition-all duration-1000 ${item.isAchieved ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                         style={{ width: `${item.percent}%` }}
                       ></div>
                    </div>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-600/20 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="z-10">
                 <Sparkles className="w-8 h-8 mb-4 opacity-50" />
                 <h3 className="text-xl font-black mb-2">Statistik Produktivitas</h3>
                 <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">
                   {stats.completionRate >= 80 ? 'Performa tim sangat memuaskan! Pertahankan ritme kerja kreatif Anda.' : 'Perlu dorongan lebih untuk mencapai target harian. Evaluasi kendala talent segera.'}
                 </p>
              </div>
              <button onClick={() => setView('TALENT_REPORTS')} className="mt-6 bg-white/20 backdrop-blur-md py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-indigo-600 transition-all z-10">LIHAT POSTINGAN</button>
           </div>
        </div>
      </div>
    );
  }

  if (currentView === 'TALENT_KPI') {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">KPI Target</h2>
            <p className="text-slate-500 font-medium text-sm">Target bulanan jumlah konten per talent.</p>
          </div>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest"><Plus className="w-5 h-5" /> Set Target</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpiList.map(k => (
            <div key={k.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm hover:border-indigo-500/50 transition-all group">
               <div className="flex justify-between items-start mb-6">
                 <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest">{k.bulan} {k.tahun}</div>
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingItem(k); setKpiForm({...k}); setIsModalOpen(true); }} className="p-2 text-indigo-500"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={async () => { if(confirm('Hapus target KPI?')) await deleteDoc(doc(db, 'KPI_TALENT', k.id)); }} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                 </div>
               </div>
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl">{k.namaTalent[0]}</div>
                  <div>
                    <h4 className="font-black dark:text-white leading-tight">{k.namaTalent}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Konten Kreator</p>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Target Bulanan</span>
                  <span className="text-xl font-black text-indigo-600">{formatDots(k.targetJumlah)} Konten</span>
               </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeModal}></div>
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative border dark:border-slate-800 shadow-2xl">
               <h3 className="text-2xl font-black dark:text-white tracking-tight mb-8">{editingItem ? 'Edit KPI' : 'Set KPI Target'}</h3>
               <form onSubmit={handleSaveKPI} className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Talent</label>
                    <select required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={kpiForm.talentId} onChange={e => setKpiForm({...kpiForm, talentId: e.target.value})}>
                      <option value="">Pilih Talent...</option>
                      {talents.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Bulan</label>
                      <select required className="w-full px-4 py-3 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-xs" value={kpiForm.bulan} onChange={e => setKpiForm({...kpiForm, bulan: e.target.value})}>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Tahun</label>
                      <select required className="w-full px-4 py-3 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-xs" value={kpiForm.tahun} onChange={e => setKpiForm({...kpiForm, tahun: e.target.value})}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Target Konten / Bulan</label>
                    <input type="text" required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={formatDots(kpiForm.targetJumlah)} onChange={e => setKpiForm({...kpiForm, targetJumlah: parseDots(e.target.value)})} />
                  </div>
                  <button type="submit" disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm tracking-[0.2em] shadow-xl mt-4 uppercase active:scale-95 transition-all">
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Simpan KPI'}
                  </button>
               </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'TALENT_LIST') {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">Daftar Talent</h2>
            <p className="text-slate-500 text-sm font-medium">Manajemen profil tim kreatif.</p>
          </div>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95 transition-all uppercase tracking-widest"><Plus className="w-5 h-5" /> Tambah Talent</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {talents.map(t => (
            <div key={t.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all">
               <div className="flex items-center gap-5 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">{t.nama[0].toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black dark:text-white text-lg truncate mb-2">{t.nama}</h4>
                    <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${t.status === 'AKTIF' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {t.status}
                    </span>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(t); setTalentForm({ ...t, namaAkun: Array.isArray(t.namaAkun) ? t.namaAkun : [t.namaAkun] }); setIsModalOpen(true); }} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Edit</button>
                  <button onClick={async () => { if(confirm('Hapus talent ini?')) await deleteDoc(doc(db, 'NAMA TALENT', t.id)); }} className="p-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl border dark:border-slate-800 transition-all"><Trash2 className="w-5 h-5" /></button>
               </div>
            </div>
          ))}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeModal}></div>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] p-10 relative border dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-10">
                 <h3 className="text-2xl font-black dark:text-white tracking-tight">{editingItem ? 'Edit Talent' : 'Tambah Talent'}</h3>
                 <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
               </div>
               <form onSubmit={handleSaveTalent} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nama Lengkap</label>
                    <div className="relative">
                       <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                       <input required className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-600 font-bold" value={talentForm.nama} onChange={e => setTalentForm({...talentForm, nama: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Kontak / WA</label>
                    <div className="relative">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                       <input required className="w-full pl-12 pr-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-600 font-bold" value={talentForm.kontak} onChange={e => setTalentForm({...talentForm, kontak: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Daftar Akun Sosmed</label>
                      <button type="button" onClick={addAccountField} className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                        <PlusCircle className="w-4 h-4" /> Tambah Akun
                      </button>
                    </div>
                    {talentForm.namaAkun.map((acc, idx) => (
                      <div key={idx} className="flex gap-2">
                         <div className="relative flex-1">
                            <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input required placeholder={`Username Akun ${idx + 1}`} className="w-full pl-12 pr-5 py-3 rounded-xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none focus:border-indigo-600 font-bold text-sm" value={acc} onChange={e => handleAccountChange(idx, e.target.value)} />
                         </div>
                         {talentForm.namaAkun.length > 1 && (
                           <button type="button" onClick={() => removeAccountField(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                              <MinusCircle className="w-5 h-5" />
                           </button>
                         )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Status</label>
                    <select className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold" value={talentForm.status} onChange={e => setTalentForm({...talentForm, status: e.target.value as any})}>
                      <option value="AKTIF">AKTIF</option>
                      <option value="NONAKTIF">NONAKTIF</option>
                    </select>
                  </div>

                  <button type="submit" disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm tracking-[0.2em] shadow-2xl active:scale-95 transition-all mt-8 uppercase">
                    {isSaving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Simpan Profil'}
                  </button>
               </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentView === 'TALENT_CONTENT') {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">Konten Harian</h2>
            <p className="text-slate-500 text-sm font-medium italic">Monitoring target harian konten kreatif.</p>
          </div>
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }} 
            className="bg-amber-500 text-slate-900 px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" /> Tambah Konten
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {targetHarianList.map(item => (
            <div key={item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm transition-all hover:border-amber-500/50 hover:shadow-xl group">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <p className="text-[10px] font-black">{item.tanggal?.toDate ? item.tanggal.toDate().toLocaleDateString('id-ID') : '-'}</p>
                  </div>
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-600 text-[8px] font-black rounded-lg uppercase tracking-widest">Target</span>
               </div>
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 transition-transform group-hover:scale-110">
                    <Layers className="w-7 h-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                     <p className="text-sm font-black dark:text-white truncate mb-1 leading-none">{item.namaProduk}</p>
                     <p className="text-[10px] text-amber-600 font-bold uppercase truncate">
                       {item.namaTalent} <span className="text-slate-300 dark:text-slate-700 mx-1">•</span> Qty: {formatDots(item.jumlahKonten)}
                     </p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(item); setContentForm({ talentId: item.talentId, namaProduk: item.namaProduk, jumlahKonten: item.jumlahKonten, tanggal: item.tanggal?.toDate ? item.tanggal.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">Edit</button>
                  <button onClick={async () => { if(confirm('Hapus target konten ini?')) await deleteDoc(doc(db, 'TARGET HARIAN', item.id)); }} className="p-4 bg-red-500/5 text-red-500 rounded-2xl border border-red-500/10 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
               </div>
            </div>
          ))}
        </div>

        {isModalOpen && currentView === 'TALENT_CONTENT' && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeModal}></div>
             <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative border dark:border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black dark:text-white tracking-tight">{editingItem ? 'Edit Target' : 'Input Target'}</h3>
                  <button onClick={closeModal} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSaveContent} className="space-y-6">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nama Talent</label>
                     <select required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm cursor-pointer" value={contentForm.talentId} onChange={e => setContentForm({...contentForm, talentId: e.target.value})}>
                       <option value="">Pilih Talent...</option>
                       {talents.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nama Produk</label>
                     <input required placeholder="Nama Produk" className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={contentForm.namaProduk} onChange={e => setContentForm({...contentForm, namaProduk: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Jumlah Konten</label>
                     <input type="text" required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={formatDots(contentForm.jumlahKonten)} onChange={e => setContentForm({...contentForm, jumlahKonten: parseDots(e.target.value)})} />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Tanggal</label>
                     <input type="date" required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={contentForm.tanggal} onChange={e => setContentForm({...contentForm, tanggal: e.target.value})} />
                   </div>
                   <button type="submit" disabled={isSaving} className="w-full py-5 bg-amber-500 text-slate-900 rounded-[1.5rem] font-black text-sm tracking-[0.2em] shadow-xl mt-4 uppercase active:scale-95 transition-all">
                      {isSaving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Simpan'}
                   </button>
                </form>
             </div>
           </div>
        )}
      </div>
    );
  }

  if (currentView === 'TALENT_REPORTS') {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black dark:text-white tracking-tight">Postingan</h2>
            <p className="text-slate-500 font-medium text-sm">Rekapitulasi link postingan media sosial.</p>
          </div>
          <button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }} 
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl shadow-emerald-600/20 active:scale-95 transition-all uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" /> Tambah Postingan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {postinganList.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <p className="text-[10px] font-black">{p.tanggal?.toDate?.().toLocaleDateString('id-ID') || '-'}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { 
                      setEditingItem(p); 
                      setReportForm({ 
                        talentId: p.talentId, 
                        namaTalent: p.namaTalent, 
                        namaAkunTalent: p.namaAkunTalent, 
                        namaProduk: p.namaProduk, 
                        jumlahPostingan: p.jumlahPostingan, 
                        linkPostingan: p.linkPostingan, 
                        fotoProduk: p.fotoProduk || '',
                        tanggal: p.tanggal?.toDate?.().toISOString().split('T')[0] || '' 
                      }); 
                      setPreviewUrl(p.fotoProduk || '');
                      setIsModalOpen(true); 
                    }} className="p-2 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={async () => { if(confirm('Hapus postingan ini?')) await deleteDoc(doc(db, 'JUMLAH POSTINGAN', p.id)); }} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
               </div>
               
               {p.fotoProduk && (
                 <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 border-2 dark:border-slate-800 shadow-sm">
                   <img src={p.fotoProduk} className="w-full h-full object-cover" alt="Produk" />
                 </div>
               )}

               <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Video className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black dark:text-white leading-tight truncate">{p.namaProduk || 'Konten'}</h4>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{p.namaTalent} • {p.namaAkunTalent}</p>
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                    <span className="uppercase">Jumlah Postingan</span>
                    <span className="text-slate-900 dark:text-white font-black">{formatDots(p.jumlahPostingan)} Unit</span>
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Modal Postingan */}
        {isModalOpen && currentView === 'TALENT_REPORTS' && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={closeModal}></div>
             <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative border dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black dark:text-white tracking-tight">{editingItem ? 'Edit Postingan' : 'Input Postingan'}</h3>
                  <button onClick={closeModal} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X className="w-6 h-6" /></button>
                </div>
                
                <form onSubmit={handleSaveReport} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Foto Produk</label>
                     <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-dashed dark:border-slate-800 border-slate-200 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 group">
                        {previewUrl ? (
                          <>
                            <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                               <button type="button" onClick={() => { setSelectedFile(null); setPreviewUrl(''); }} className="bg-white text-red-500 p-2 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                             <p className="text-[10px] font-black text-slate-400 uppercase">Klik untuk upload foto</p>
                             <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                        )}
                     </div>
                   </div>

                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Pilih Talent</label>
                     <select required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm cursor-pointer" value={reportForm.talentId} onChange={e => setReportForm({...reportForm, talentId: e.target.value, namaAkunTalent: ''})}>
                       <option value="">Pilih Talent...</option>
                       {talents.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                     </select>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Pilih Akun</label>
                     <div className="relative">
                       <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                       <select required className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={reportForm.namaAkunTalent} onChange={e => setReportForm({...reportForm, namaAkunTalent: e.target.value})}>
                          <option value="">{reportForm.talentId ? 'Pilih Akun...' : 'Pilih Talent Terlebih Dahulu'}</option>
                          {selectedTalentAccounts.map((acc, idx) => <option key={idx} value={acc}>{acc}</option>)}
                       </select>
                     </div>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nama Produk</label>
                     <input required placeholder="Nama Produk" className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={reportForm.namaProduk} onChange={e => setReportForm({...reportForm, namaProduk: e.target.value})} />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Jumlah Postingan</label>
                     <input type="text" required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={formatDots(reportForm.jumlahPostingan)} onChange={e => updateLinkInputs(parseDots(e.target.value) || 1)} />
                   </div>
                   
                   <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Links Postingan</label>
                     {reportForm.linkPostingan.map((link, idx) => (
                       <div key={idx} className="relative">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input required placeholder={`Link Postingan ${idx + 1}`} className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-xs" value={link} onChange={e => {
                            const newLinks = [...reportForm.linkPostingan];
                            newLinks[idx] = e.target.value;
                            setReportForm({...reportForm, linkPostingan: newLinks});
                          }} />
                       </div>
                     ))}
                   </div>

                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Tanggal</label>
                     <input type="date" required className="w-full px-5 py-4 rounded-2xl border-2 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none font-bold text-sm" value={reportForm.tanggal} onChange={e => setReportForm({...reportForm, tanggal: e.target.value})} />
                   </div>
                   
                   <button type="submit" disabled={isSaving} className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-sm tracking-[0.2em] shadow-xl mt-4 uppercase active:scale-95 transition-all">
                      {isSaving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Simpan Postingan'}
                   </button>
                </form>
             </div>
           </div>
        )}
      </div>
    );
  }

  return null;
};

export default TalentManagement;
