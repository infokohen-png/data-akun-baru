
import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, Store, Package, ShoppingCart, Video, 
  LogOut, Sparkles, UserCircle2, Users, Plus, X, Check, Loader2, Settings, Menu, Sun, Moon
} from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ViewState, AccountProfile } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  userEmail: string;
  profiles: AccountProfile[];
  activeProfile: AccountProfile | null;
  onProfileSwitch: (profile: AccountProfile) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, setView, userEmail, profiles, activeProfile, onProfileSwitch, isDarkMode, toggleTheme
}) => {
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const menuItems = [
    { id: 'DASHBOARD', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'TOKO', label: 'Toko', icon: Store },
    { id: 'PRODUK', label: 'Produk', icon: Package },
    { id: 'PENJUALAN', label: 'Penjualan', icon: ShoppingCart },
    { id: 'KONTEN', label: 'Konten', icon: Video },
    { id: 'INSIGHTS', label: 'AI AI', icon: Sparkles },
    { id: 'AKUN', label: 'Akun', icon: Users },
  ];

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim() || !auth.currentUser) return;
    
    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'AKUN'), {
        userId: auth.currentUser.uid,
        nama: newAccountName.trim(),
        createdAt: serverTimestamp()
      });
      setNewAccountName('');
      setIsAddingAccount(false);
      onProfileSwitch({ 
        id: docRef.id, 
        userId: auth.currentUser.uid, 
        nama: newAccountName.trim(), 
        createdAt: new Date() 
      });
    } catch (err) {
      alert("Gagal menambah akun");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigation = (view: ViewState) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* MOBILE HEADER (Navigation bar at the top) */}
      <div 
        className={`md:hidden fixed top-0 left-0 right-0 z-40 border-b shadow-sm transition-colors duration-300 ${
          isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-sm">
              <Store className="text-white w-5 h-5" />
            </div>
            <span className={`font-black tracking-tighter text-lg ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>ShopHub</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleTheme} 
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-amber-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
              aria-label="Open Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE SIDEBAR (Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 z-[60] flex flex-col border-r
        transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
        ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:sticky md:top-0 md:h-screen md:translate-x-0 md:w-64
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Store className="text-white w-5 h-5" />
              </div>
              <h1 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>ShopHub</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 hover:bg-slate-800 rounded-xl transition-colors">
              <X className={`w-6 h-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </button>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id as ViewState)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  currentView === item.id 
                  ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-400 font-bold' : 'bg-indigo-50 text-indigo-700 shadow-sm font-bold') 
                  : (isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-50')
                }`}
              >
                <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-600' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className={`mt-auto p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-sm">
              {activeProfile ? activeProfile.nama[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black truncate uppercase tracking-tighter ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeProfile ? activeProfile.nama : 'Pilih Akun'}
              </p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Akun Aktif</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-1">
            <button 
              onClick={() => { setShowSwitchModal(true); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-lg transition-all border border-transparent ${
                isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" /> Kelola Profil
            </button>
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" /> Keluar Sesi
            </button>
          </div>
        </div>
      </aside>

      {/* BACKDROP */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[55] md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE SPACER */}
      <div className="md:hidden h-14 w-full"></div>

      {/* MODAL SWITCH AKUN */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSwitchModal(false)}></div>
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`font-black uppercase text-[10px] tracking-widest ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Pindah Akun</h3>
              <button onClick={() => setShowSwitchModal(false)} className="p-1 text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {isAddingAccount ? (
                <form onSubmit={handleAddAccount} className="space-y-3">
                  <input autoFocus required type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} placeholder="Nama Akun Baru" className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsAddingAccount(false)} className={`flex-1 py-3 text-xs font-bold rounded-xl ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Batal</button>
                    <button type="submit" disabled={isSaving} className="flex-[2] py-3 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buat Profil'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => { onProfileSwitch(profile); setShowSwitchModal(false); }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          activeProfile?.id === profile.id 
                          ? 'border-indigo-600 bg-indigo-900/10' 
                          : (isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50')
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${activeProfile?.id === profile.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                            {profile.nama[0].toUpperCase()}
                          </div>
                          <span className={`text-sm font-bold ${activeProfile?.id === profile.id ? 'text-indigo-400' : (isDarkMode ? 'text-slate-300' : 'text-slate-700')}`}>
                            {profile.nama}
                          </span>
                        </div>
                        {activeProfile?.id === profile.id && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setIsAddingAccount(true)} className={`w-full py-3 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-[11px] ${isDarkMode ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'}`}>
                    <Plus className="w-4 h-4" /> Tambah Profil Baru
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
