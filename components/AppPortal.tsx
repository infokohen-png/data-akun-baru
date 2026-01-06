
import React from 'react';
import { AppMode } from '../types';
import { Users2, ArrowRight, LogOut, Building2, Sun, Moon, Sparkles } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface AppPortalProps {
  onSelect: (mode: AppMode) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  allowedModes: AppMode[];
}

const AppPortal: React.FC<AppPortalProps> = ({ onSelect, isDarkMode, toggleTheme }) => {
  return (
    <div className={`min-h-screen flex flex-col relative overflow-hidden transition-colors duration-700 ${isDarkMode ? 'bg-[#0f111a]' : 'bg-slate-50'}`}>
      
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] animate-blob transition-colors duration-1000 ${isDarkMode ? 'bg-amber-500/10' : 'bg-amber-200/30'}`}></div>
        <div className={`absolute top-[20%] -right-[5%] w-[40%] h-[40%] rounded-full blur-[100px] animate-blob animation-delay-2000 transition-colors duration-1000 ${isDarkMode ? 'bg-indigo-600/10' : 'bg-indigo-200/30'}`}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full min-h-screen max-w-2xl mx-auto w-full p-6 md:p-10">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4 group">
            <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              B
            </div>
            <div className="flex flex-col">
              <h1 className={`text-xl font-black tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                PT BMS
              </h1>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isDarkMode ? 'text-amber-500' : 'text-amber-600'}`}>
                bersama menuju surga
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                ? 'bg-slate-900/50 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => signOut(auth)} 
              className={`p-2.5 rounded-xl border transition-all ${
                isDarkMode 
                ? 'text-slate-400 border-slate-800 hover:text-red-400 hover:border-red-400/30 bg-slate-900/50' 
                : 'text-slate-500 border-slate-200 hover:text-red-500 hover:border-red-200 bg-white shadow-sm'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 flex flex-col gap-6">
          <div className="mb-2">
             <h2 className={`text-3xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Pilih <span className="text-amber-500">Workspace</span>
             </h2>
             <p className={`text-xs mt-2 font-medium ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              Selamat datang, <span className="font-bold text-slate-400">{auth.currentUser?.email}</span>. Semua akses telah dibuka.
             </p>
          </div>

          <div className="space-y-4 pb-10">
            {/* DATA AKUN */}
            <div 
              onClick={() => onSelect('BUSINESS')}
              className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-start gap-5 cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#161b2c]/80 backdrop-blur-md border-slate-800 hover:border-amber-500/50 hover:bg-[#1c233a]' 
                  : 'bg-white border-slate-100 hover:border-amber-400 shadow-xl shadow-slate-200/30 backdrop-blur-sm'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:rotate-3 ${isDarkMode ? 'bg-[#0f111a] text-amber-500 border border-slate-800' : 'bg-amber-50 text-amber-600'}`}>
                <Building2 className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>DATA AKUN</h3>
                <p className={`text-[10px] font-medium leading-relaxed mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  Kelola toko, produk, dan laporan penjualan harian bisnis Anda.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
                  Buka Aplikasi <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <Sparkles className="absolute top-6 right-6 w-4 h-4 text-amber-500/20" />
            </div>

            {/* TALENT */}
            <div 
              onClick={() => onSelect('TALENT')}
              className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-300 flex items-start gap-5 cursor-pointer ${
                isDarkMode 
                  ? 'bg-[#161b2c]/80 backdrop-blur-md border-slate-800 hover:border-indigo-500/50 hover:bg-[#1c233a]' 
                  : 'bg-white border-slate-100 hover:border-indigo-400 shadow-xl shadow-slate-200/30 backdrop-blur-sm'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center transition-transform group-hover:rotate-3 ${isDarkMode ? 'bg-[#0f111a] text-indigo-500 border border-slate-800' : 'bg-indigo-50 text-indigo-600'}`}>
                <Users2 className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-lg font-black mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>TALENT</h3>
                <p className={`text-[10px] font-medium leading-relaxed mb-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                   Monitoring KPI talent dan manajemen performa konten harian.
                </p>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  Buka Aplikasi <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className={`mt-auto pt-4 text-center transition-opacity duration-1000 ${isDarkMode ? 'opacity-20' : 'opacity-40'}`}>
          <p className="text-[9px] font-black uppercase tracking-[0.5em] dark:text-white">
            PT BMS DIGITAL ECOSYSTEM © 2025
          </p>
        </footer>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}} />
    </div>
  );
};

export default AppPortal;
