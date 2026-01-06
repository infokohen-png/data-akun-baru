
import React, { useState } from 'react';
import { 
  LayoutDashboard, Store, Package, ShoppingCart, Video, 
  LogOut, Sparkles, X, Menu, Sun, Moon,
  CheckSquare, FileText, Users2, Home, Target, Layers
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { ViewState, AccountProfile, AppMode } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  activeProfile: AccountProfile | null;
  appMode: AppMode;
  onExitProject: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, setView, activeProfile, appMode, onExitProject, isDarkMode, toggleTheme
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const businessItems = [
    { id: 'DASHBOARD', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'TARGET', label: 'Target Harian', icon: CheckSquare },
    { id: 'REPORTS', label: 'Laporan', icon: FileText },
    { id: 'TOKO', label: 'Toko', icon: Store },
    { id: 'PRODUK', label: 'Produk', icon: Package },
    { id: 'PENJUALAN', label: 'Penjualan', icon: ShoppingCart },
    { id: 'KONTEN', label: 'Konten', icon: Video },
    { id: 'INSIGHTS', label: 'AI Strategist', icon: Sparkles },
  ];

  const talentItems = [
    { id: 'TALENT_DASHBOARD', label: 'Analisa Data', icon: LayoutDashboard },
    { id: 'TALENT_LIST', label: 'Daftar Talent', icon: Users2 },
    { id: 'TALENT_KPI', label: 'KPI Target', icon: Target },
    { id: 'TALENT_CONTENT', label: 'Konten Harian', icon: Layers },
    { id: 'TALENT_REPORTS', label: 'Postingan', icon: Video },
  ];

  const getMenuItems = () => {
    switch(appMode) {
      case 'BUSINESS': return businessItems;
      case 'TALENT': return talentItems;
      default: return [];
    }
  };

  const menuItems = getMenuItems();
  
  const displayMode = appMode === 'BUSINESS' ? 'DATA AKUN' : 'TALENT';
  
  const getThemeClasses = () => {
    if (appMode === 'BUSINESS') return {
      text: 'text-amber-500',
      bg: 'bg-amber-600',
      bgLight: 'bg-amber-50',
      textLight: 'text-amber-700',
      border: 'border-amber-500/30',
      bgMuted: 'bg-amber-600/20',
      textMuted: 'text-amber-400'
    };
    return { // TALENT
      text: 'text-indigo-500',
      bg: 'bg-indigo-600',
      bgLight: 'bg-indigo-50',
      textLight: 'text-indigo-700',
      border: 'border-indigo-500/30',
      bgMuted: 'bg-indigo-600/20',
      textMuted: 'text-indigo-400'
    };
  };

  const theme = getThemeClasses();

  return (
    <>
      <div className={`md:hidden fixed top-0 left-0 right-0 z-40 border-b transition-colors h-14 px-4 flex items-center justify-between ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <span className={`font-black text-xl ${isDarkMode ? theme.text : 'text-slate-900'}`}>PT BMS</span>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2"><Menu className="w-6 h-6" /></button>
      </div>

      <aside className={`fixed inset-y-0 left-0 w-72 z-[60] flex flex-col border-r transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 md:w-64 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-2xl font-black ${isDarkMode ? theme.text : 'text-slate-900'}`}>PT BMS</h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden"><X /></button>
          </div>

          <div className="mb-6 space-y-4">
             <button 
               onClick={onExitProject}
               className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all ${
                 isDarkMode 
                 ? `${theme.bgMuted} ${theme.textMuted} border ${theme.border}` 
                 : `${theme.bg} text-white`
               }`}
             >
               <Home className="w-4 h-4" /> KEMBALI KE PORTAL
             </button>
             <div className="px-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">WORKSPACE {displayMode}</p>
                <p className="text-sm font-bold dark:text-white truncate">{activeProfile?.nama}</p>
             </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => (
              <button key={item.id} onClick={() => { setView(item.id as ViewState); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${currentView === item.id ? (isDarkMode ? `${theme.bg} text-white` : `${theme.bgLight} ${theme.textLight}`) : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')}`}>
                <item.icon className="w-5 h-5" /> {item.label}
              </button>
            ))}
          </nav>

          <div className={`mt-auto pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
             <div className="flex gap-2">
                <button onClick={toggleTheme} className="flex-1 p-2.5 dark:bg-slate-800 bg-slate-50 rounded-xl flex items-center justify-center transition-colors">
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                </button>
                <button onClick={() => signOut(auth)} className="flex-[3] flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/20 transition-all">
                  <LogOut className="w-4 h-4" /> KELUAR
                </button>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
