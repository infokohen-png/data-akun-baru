
import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AccountProfile, AppMode } from '../types';
// Add LogOut to the imports from lucide-react
import { Plus, Store, ArrowRight, Trash2, X, Loader2, ArrowLeft, LayoutGrid, Edit3, Users2, Sparkles, Moon, Sun, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';

interface ProjectSelectorProps {
  profiles: AccountProfile[];
  onSelect: (profile: AccountProfile) => void;
  onBack: () => void;
  isDarkMode: boolean;
  appMode: AppMode;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ profiles, onSelect, onBack, isDarkMode, appMode }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<AccountProfile | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !auth.currentUser) return;
    setIsSaving(true);
    try {
      if (editingProject) {
        await updateDoc(doc(db, 'AKUN', editingProject.id), {
          nama: newProjectName.trim()
        });
      } else {
        await addDoc(collection(db, 'AKUN'), {
          userId: auth.currentUser.uid,
          nama: newProjectName.trim(),
          appMode: appMode,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (err) {
      alert("Gagal menyimpan proyek.");
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setNewProjectName('');
  };

  const handleEdit = (e: React.MouseEvent, profile: AccountProfile) => {
    e.stopPropagation();
    setEditingProject(profile);
    setNewProjectName(profile.nama);
    setIsModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Hapus proyek ini? Seluruh data di dalamnya akan sulit diakses.")) {
      await deleteDoc(doc(db, 'AKUN', id));
    }
  };

  const displayMode = appMode === 'BUSINESS' ? 'DATA AKUN' : 'TALENT';
  const themeColor = appMode === 'BUSINESS' ? 'amber' : 'indigo';
  const themeHex = appMode === 'BUSINESS' ? '#f59e0b' : '#4f46e5';

  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-[#0f111a]' : 'bg-slate-50'}`}>
      
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] transition-colors duration-1000 ${isDarkMode ? `bg-${themeColor}-500/5` : `bg-${themeColor}-100`}`}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full min-h-screen max-w-2xl mx-auto w-full p-6 md:p-10">
        
        {/* Header Sejajar: Logo & Judul Kecil (Sama seperti Portal) */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${appMode === 'BUSINESS' ? 'bg-amber-500' : 'bg-indigo-600'} rounded-xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-${themeColor}-500/20`}>
              {appMode === 'BUSINESS' ? 'B' : 'T'}
            </div>
            <div className="flex flex-col">
              <h1 className={`text-lg font-black tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                PT BMS
              </h1>
              <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5 ${isDarkMode ? `text-${themeColor}-500` : `text-${themeColor}-600`}`}>
                {displayMode}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onBack}
              className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${
                isDarkMode 
                ? 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-500 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Portal</span>
            </button>
            <button 
              onClick={() => signOut(auth)} 
              className={`p-2 rounded-xl border transition-all ${
                isDarkMode 
                ? 'text-slate-500 border-slate-800 hover:text-red-400' 
                : 'text-slate-400 border-slate-200'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Project Selection Content */}
        <main className="flex-1 flex flex-col gap-6">
          <div className="mb-2">
             <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Daftar <span className={appMode === 'BUSINESS' ? 'text-amber-500' : 'text-indigo-500'}>Proyek</span>
             </h2>
             <p className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Pilih ruang kerja yang ingin Anda kelola sekarang.
             </p>
          </div>

          <div className="space-y-4">
            {/* Action: Create New Project Card */}
            <div 
              onClick={() => { setEditingProject(null); setNewProjectName(''); setIsModalOpen(true); }}
              className={`group relative p-5 rounded-[2rem] border-2 border-dashed cursor-pointer transition-all flex items-center gap-5 ${
                isDarkMode 
                ? 'bg-[#161b2c]/30 border-slate-800 hover:border-indigo-500/50' 
                : 'bg-slate-50 border-slate-200 hover:border-indigo-400'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${isDarkMode ? 'bg-slate-800 text-indigo-500' : 'bg-white text-indigo-600 shadow-sm'}`}>
                <Plus className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-black uppercase tracking-widest ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Buat Proyek Baru</h3>
                <p className="text-[10px] text-slate-500 font-medium">Klik untuk menambah ruang kerja baru.</p>
              </div>
            </div>

            {/* List of Projects */}
            {profiles.map(profile => (
              <div 
                key={profile.id}
                onClick={() => onSelect(profile)}
                className={`group relative p-6 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 flex items-start gap-5 ${
                  isDarkMode 
                  ? 'bg-[#161b2c]/80 backdrop-blur-md border-slate-800 hover:border-indigo-500/50 hover:bg-[#1c233a]' 
                  : 'bg-white border-slate-100 hover:border-indigo-400 shadow-sm'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:rotate-3 ${isDarkMode ? 'bg-[#0f111a] text-indigo-500 border border-slate-800' : 'bg-indigo-50 text-indigo-600'}`}>
                  {appMode === 'BUSINESS' ? <Store className="w-7 h-7" /> : <Users2 className="w-7 h-7" />}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h3 className={`text-lg font-black leading-tight mb-1 truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    {profile.nama}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    Masuk Workspace <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Edit & Delete Actions (Overlay on hover/mobile always visible) */}
                <div className="flex gap-1 absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleEdit(e, profile)}
                    className="p-1.5 text-slate-500 hover:text-amber-500 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, profile.id)}
                    className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {profiles.length === 0 && (
              <div className="py-12 text-center opacity-40">
                <LayoutGrid className="w-12 h-12 mx-auto text-slate-500 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">Belum ada proyek</p>
              </div>
            )}
          </div>
        </main>

        <footer className={`mt-auto pt-10 text-center transition-opacity duration-1000 ${isDarkMode ? 'opacity-20' : 'opacity-40'}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.5em] dark:text-white">
            PT BMS DIGITAL ECOSYSTEM © 2025
          </p>
        </footer>
      </div>

      {/* Modal Re-styled to match glass theme */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-[#161b2c] border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl relative p-8 overflow-hidden animate-in zoom-in-95">
             <div className={`absolute top-0 left-0 w-full h-1.5 bg-${themeColor}-500`}></div>
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white">{editingProject ? 'Edit Proyek' : 'Proyek Baru'}</h3>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
             </div>
             
             <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nama Proyek</label>
                  <input 
                    required 
                    autoFocus 
                    className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-900 border-slate-800 text-white font-bold outline-none focus:border-indigo-600 transition-all text-sm" 
                    placeholder={appMode === 'BUSINESS' ? "Contoh: Toko Jakarta" : "Contoh: Tim Creative"} 
                    value={newProjectName} 
                    onChange={e => setNewProjectName(e.target.value)} 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className={`w-full py-4 ${appMode === 'BUSINESS' ? 'bg-amber-500 text-slate-900' : 'bg-indigo-600 text-white'} rounded-2xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs`}
                >
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : (editingProject ? 'Simpan' : 'Buat Sekarang')}
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;
