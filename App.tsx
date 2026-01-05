
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ShopList from './components/ShopList';
import ProductList from './components/ProductList';
import SalesList from './components/SalesList';
import ContentList from './components/ContentList';
import GeminiInsights from './components/GeminiInsights';
import AccountManagement from './components/AccountManagement';
import { ViewState, AccountProfile } from './types';
import { LayoutDashboard, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<AccountProfile | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setProfiles([]);
        setActiveProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(collection(db, 'AKUN'), where('userId', '==', user.uid));
    
    const unsubProfiles = onSnapshot(q, (snapshot) => {
      const profileList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccountProfile[];
      setProfiles(profileList);

      const savedId = localStorage.getItem(`activeProfile_${user.uid}`);
      const found = profileList.find(p => p.id === savedId);
      
      if (found) {
        setActiveProfile(found);
      } else if (profileList.length > 0) {
        setActiveProfile(profileList[0]);
        localStorage.setItem(`activeProfile_${user.uid}`, profileList[0].id);
      } else {
        setActiveProfile(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Critical Auth Listener Error:", err);
      setLoading(false);
    });

    return () => unsubProfiles();
  }, [user]);

  const handleProfileSwitch = (profile: AccountProfile) => {
    setActiveProfile(profile);
    localStorage.setItem(`activeProfile_${user?.uid}`, profile.id);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} font-medium`}>Mengamankan Sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderView = () => {
    if (currentView === 'AKUN') {
      return (
        <AccountManagement 
          profiles={profiles} 
          activeProfile={activeProfile} 
          onSwitch={handleProfileSwitch} 
        />
      );
    }

    if (!activeProfile) {
      return (
        <div className="h-[70vh] flex flex-col items-center justify-center text-center space-y-4 p-6">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
            <LayoutDashboard className="w-10 h-10" />
          </div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Akun Bisnis Belum Tersedia</h2>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} max-w-sm`}>Daftarkan akun bisnis (profil) pertama Anda untuk mulai mengelola data secara terpisah.</p>
          <button 
            onClick={() => setCurrentView('AKUN')}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
          >
            Buat Akun Sekarang
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard activeProfileId={activeProfile.id} />;
      case 'TOKO': return <ShopList activeProfileId={activeProfile.id} />;
      case 'PRODUK': return <ProductList activeProfileId={activeProfile.id} />;
      case 'PENJUALAN': return <SalesList activeProfileId={activeProfile.id} />;
      case 'KONTEN': return <ContentList activeProfileId={activeProfile.id} />;
      case 'INSIGHTS': return <GeminiInsights activeProfileId={activeProfile.id} />;
      default: return <Dashboard activeProfileId={activeProfile.id} />;
    }
  };

  return (
    <div className={`flex min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} overflow-hidden`}>
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        userEmail={user.email || ''}
        profiles={profiles}
        activeProfile={activeProfile}
        onProfileSwitch={handleProfileSwitch}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
