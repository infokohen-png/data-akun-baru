
import React, { useState, useEffect } from 'react';
import { 
  collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc,
  serverTimestamp, query, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ContentTarget } from '../types';
import { 
  Plus, CheckSquare, Square, Trash2, Calendar, 
  Loader2, CheckCircle2, ListTodo, X
} from 'lucide-react';

interface DailyTargetProps {
  activeProfileId: string;
}

const DailyTarget: React.FC<DailyTargetProps> = ({ activeProfileId }) => {
  const [targets, setTargets] = useState<ContentTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTarget, setNewTarget] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!activeProfileId) return;

    setLoading(true);
    // Removed orderBy to avoid the need for a composite index in Firestore.
    // Sorting will be handled client-side to ensure the app works without manual configuration.
    const q = query(
      collection(db, 'TARGET_KONTEN'),
      where('profileId', '==', activeProfileId),
      where('tanggalTarget', '==', selectedDate)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ContentTarget[];
      
      // Sort client-side: newest first (based on createdAt)
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setTargets(sortedData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error:", err);
      // In case of any further index errors, we gracefully handle the state
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeProfileId, selectedDate]);

  const handleAddTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTarget.trim() || !auth.currentUser || !activeProfileId) return;

    setIsSaving(true);
    try {
      await addDoc(collection(db, 'TARGET_KONTEN'), {
        userId: auth.currentUser.uid,
        profileId: activeProfileId,
        judul: newTarget.trim(),
        isDone: false,
        tanggalTarget: selectedDate,
        createdAt: serverTimestamp()
      });
      setNewTarget('');
    } catch (err) {
      alert("Gagal menambah target");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTarget = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'TARGET_KONTEN', id), {
        isDone: !currentStatus
      });
    } catch (err) {
      alert("Gagal memperbarui status");
    }
  };

  const deleteTarget = async (id: string) => {
    if (window.confirm("Hapus target ini?")) {
      try {
        await deleteDoc(doc(db, 'TARGET_KONTEN', id));
      } catch (err) {
        alert("Gagal menghapus");
      }
    }
  };

  const doneCount = targets.filter(t => t.isDone).length;
  const progressPercent = targets.length > 0 ? (doneCount / targets.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 max-w-3xl mx-auto">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-black dark:text-slate-100 text-slate-900 flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-amber-500" /> Target Konten Harian
        </h2>
        <p className="dark:text-slate-400 text-slate-500 text-sm italic font-medium">Rencanakan kontenmu hari ini agar konsisten.</p>
      </header>

      {/* Progress & Date Picker */}
      <div className="dark:bg-slate-900 bg-white p-5 rounded-3xl border dark:border-slate-800 border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 dark:bg-amber-500/10 bg-amber-50 rounded-xl text-amber-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black dark:text-slate-500 text-slate-400 uppercase tracking-widest leading-none mb-1">Pilih Tanggal</p>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold dark:text-slate-100 text-slate-900 outline-none"
              />
            </div>
          </div>
          <div className="text-right">
             <p className="text-lg font-black dark:text-slate-100 text-slate-900">{doneCount}/{targets.length}</p>
             <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Selesai</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Input Section */}
      <form onSubmit={handleAddTarget} className="flex gap-2">
        <input 
          required
          type="text" 
          placeholder="Misal: Buat 3 Video Produk A..." 
          value={newTarget}
          onChange={(e) => setNewTarget(e.target.value)}
          className="flex-1 px-5 py-3.5 dark:bg-slate-900 bg-white dark:text-slate-100 text-slate-900 border dark:border-slate-800 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
        />
        <button 
          type="submit" 
          disabled={isSaving || !newTarget.trim()}
          className="p-3.5 bg-amber-500 text-slate-950 rounded-2xl hover:bg-amber-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/10"
        >
          {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
        </button>
      </form>

      {/* Target List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
        ) : targets.length > 0 ? (
          targets.map((target) => (
            <div 
              key={target.id} 
              className={`group dark:bg-slate-900 bg-white p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                target.isDone 
                ? 'dark:border-emerald-500/20 border-emerald-100 dark:bg-emerald-500/5 bg-emerald-50/30' 
                : 'dark:border-slate-800 border-slate-100 shadow-sm'
              }`}
            >
              <button 
                onClick={() => toggleTarget(target.id, target.isDone)}
                className={`flex-shrink-0 transition-all transform active:scale-90 ${target.isDone ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-700 hover:text-amber-500'}`}
              >
                {target.isDone ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
              </button>
              
              <span className={`flex-1 text-sm font-bold transition-all ${
                target.isDone 
                ? 'line-through dark:text-slate-500 text-slate-400' 
                : 'dark:text-slate-100 text-slate-900'
              }`}>
                {target.judul}
              </span>

              <button 
                onClick={() => deleteTarget(target.id)}
                className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="py-20 text-center space-y-4 dark:bg-slate-900/50 bg-slate-100/50 rounded-3xl border-2 border-dashed dark:border-slate-800 border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto" />
            <div>
              <p className="text-slate-400 font-bold text-sm">Belum ada target untuk tanggal ini.</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase mt-1 tracking-widest">Ayo buat rencanamu!</p>
            </div>
          </div>
        )}
      </div>

      {/* Done Banner */}
      {targets.length > 0 && progressPercent === 100 && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center animate-bounce">
          <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">🔥 Luar Biasa! Semua target selesai!</p>
        </div>
      )}
    </div>
  );
};

export default DailyTarget;
