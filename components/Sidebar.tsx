
import React, { useState } from 'react';
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
    { id: 'TOKO', label: 'Nama Toko', icon: Store },
    { id: 'PRODUK', label: 'Nama Produk', icon: Package },
    { id: 'PENJUALAN', label: 'Penjualan', icon: ShoppingCart },
    { id: 'KONTEN', label: 'Konten', icon: Video },
    { id: 'INSIGHTS', label: 'AI Insights', icon: Sparkles },
    { id: 'AKUN', label: 'Kelola Akun', icon: Users },
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
      {/* Mobile Header with Hamburger Icon */}
      <div className={`md:hidden fixed top-0 left-0 right-0 border-b h-16 px-4 flex items-center justify-between z-40 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Store className="text-white w-5 h-5" />
          </div>
          <span className={`font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>ShopHub</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen border-r z-50
        transition-all duration-300 ease-in-out w-64 flex flex-col
        ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Store className="text-white w-5 h-5" />
              </div>
              <h1 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>ShopHub</h1>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-slate-800 rounded-lg transition-colors">
              <X className={`w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
            </button>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id as ViewState)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                  currentView === item.id 
                  ? (isDarkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-700 shadow-sm') 
                  : (isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                }`}
              >
                <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-indigo-600' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className={`mt-auto p-4 border-t ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold border-2 border-white shadow-md">
              {activeProfile ? activeProfile.nama[0].toUpperCase() : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black truncate uppercase tracking-tighter ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeProfile ? activeProfile.nama : 'Pilih Akun'}
              </p>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Aktif Sekarang</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-1">
            <button 
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent shadow-sm ${
                isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-amber-400' : 'bg-white text-slate-600 hover:text-indigo-600 border-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
            </button>
            <button 
              onClick={() => {
                setShowSwitchModal(true);
                if (window.innerWidth < 768) setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-bold rounded-lg transition-all border border-transparent shadow-sm ${
                isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-indigo-400' : 'bg-white text-slate-600 hover:text-indigo-600 border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Pindah Akun
            </button>
            
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sesi
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Spacer */}
      <div className="md:hidden h-16 w-full"></div>

      {showSwitchModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSwitchModal(false)}></div>
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <h3 className={`font-black uppercase text-xs tracking-widest ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Pindah Akun</h3>
              <button onClick={() => setShowSwitchModal(false)} className={`p-1 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-slate-200 text-slate-400'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {isAddingAccount ? (
                <form onSubmit={handleAddAccount} className="space-y-3">
                  <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Nama Akun Baru</label>
                  <input 
                    autoFocus
                    required
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Contoh: Toko Berkah Jaya"
                    className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setIsAddingAccount(false)} className={`flex-1 py-3 text-xs font-bold rounded-xl ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>Batal</button>
                    <button type="submit" disabled={isSaving} className="flex-[2] py-3 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Buat Akun</>}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => { onProfileSwitch(profile); setShowSwitchModal(false); }}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          activeProfile?.id === profile.id 
                          ? (isDarkMode ? 'border-indigo-600 bg-indigo-900/20 ring-2 ring-indigo-900/40' : 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-100') 
                          : (isDarkMode ? 'border-slate-800 hover:border-indigo-900 hover:bg-slate-800' : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50')
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${activeProfile?.id === profile.id ? 'bg-indigo-600 text-white' : (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400')}`}>
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
                  
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    <button 
                      onClick={() => setIsAddingAccount(true)}
                      className={`w-full py-3 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 transition-all font-bold text-xs ${isDarkMode ? 'border-slate-800 text-slate-600 hover:text-indigo-500 hover:border-indigo-900' : 'border-slate-200 text-slate-400 hover:text-indigo-600'}`}
                    >
                      <Plus className="w-4 h-4" /> Tambah Akun Baru
                    </button>
                  </div>
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
