
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ShopList from './components/ShopList';
import ProductList from './components/ProductList';
import SalesList from './components/SalesList';
import ContentList from './components/ContentList';
import DailyTarget from './components/DailyTarget';
import GeminiInsights from './components/GeminiInsights';
import ReportExport from './components/ReportExport';
import ProjectSelector from './components/ProjectSelector';
import TalentManagement from './components/TalentManagement';
import AppPortal from './components/AppPortal';
import { ViewState, AccountProfile, AppMode } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [activeProfile, setActiveProfile] = useState<AccountProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  
  const [profiles, setProfiles] = useState<AccountProfile[]>([]);

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
        setAppMode(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !appMode) return;
    setLoading(true);
    const q = query(
      collection(db, 'AKUN'), 
      where('userId', '==', user.uid),
      where('appMode', '==', appMode)
    );
    const unsubProfiles = onSnapshot(q, (snapshot) => {
      const profileList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccountProfile[];
      setProfiles(profileList);
      
      if (appMode === 'BUSINESS') {
        const savedId = localStorage.getItem(`activeProfile_${user.uid}_${appMode}`);
        const found = profileList.find(p => p.id === savedId);
        if (found) {
          setActiveProfile(found);
          setCurrentView('DASHBOARD');
        }
      } 
      else if (appMode === 'TALENT') {
        if (profileList.length > 0) {
          setActiveProfile(profileList[0]);
          // Default view for talent mode is analysis
          setCurrentView('TALENT_DASHBOARD');
        } else {
          const createDefaultTalent = async () => {
            try {
              await addDoc(collection(db, 'AKUN'), {
                userId: user.uid,
                nama: 'Talent Workspace',
                appMode: 'TALENT',
                createdAt: serverTimestamp()
              });
            } catch (e) {
              console.error("Error creating default talent profile", e);
            }
          };
          createDefaultTalent();
        }
      }
      
      setLoading(false);
    });
    return () => unsubProfiles();
  }, [user, appMode]);

  const handleSelectProfile = (profile: AccountProfile) => {
    setActiveProfile(profile);
    localStorage.setItem(`activeProfile_${user?.uid}_${appMode}`, profile.id);
    setCurrentView(appMode === 'BUSINESS' ? 'DASHBOARD' : 'TALENT_DASHBOARD');
  };

  const handleExitProject = () => {
    setActiveProfile(null);
    if (appMode === 'TALENT') {
      setAppMode(null);
    }
  };

  const handleExitAppMode = () => {
    setActiveProfile(null);
    setAppMode(null);
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!appMode) {
    return <AppPortal onSelect={setAppMode} isDarkMode={isDarkMode} />;
  }

  if (!activeProfile && appMode === 'BUSINESS') {
    return (
      <ProjectSelector 
        profiles={profiles} 
        onSelect={handleSelectProfile}
        onBack={handleExitAppMode}
        isDarkMode={isDarkMode}
        appMode={appMode}
      />
    );
  }

  if (!activeProfile && appMode === 'TALENT') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-4 text-center p-6">
        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
        <div>
          <h2 className="text-white font-bold text-xl">Menyiapkan Workspace Manajemen Talent...</h2>
          <p className="text-slate-400 text-sm mt-1">Hanya butuh waktu sekejap.</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (!activeProfile) return null;
    const profileId = activeProfile.id;
    switch (currentView) {
      case 'DASHBOARD': return <Dashboard activeProfileId={profileId} />;
      case 'TARGET': return <DailyTarget activeProfileId={profileId} />;
      case 'TOKO': return <ShopList activeProfileId={profileId} />;
      case 'PRODUK': return <ProductList activeProfileId={profileId} />;
      case 'PENJUALAN': return <SalesList activeProfileId={profileId} />;
      case 'KONTEN': return <ContentList activeProfileId={profileId} />;
      case 'INSIGHTS': return <GeminiInsights activeProfileId={profileId} />;
      case 'REPORTS': return <ReportExport activeProfileId={profileId} activeProfileName={activeProfile.nama} />;
      case 'TALENT_LIST': 
      case 'TALENT_REPORTS':
      case 'TALENT_CONTENT':
      case 'TALENT_DASHBOARD':
      case 'TALENT_KPI':
        return (
          <TalentManagement 
            activeProfileId={profileId} 
            activeProjectId={profileId} 
            currentView={currentView} 
            setView={setCurrentView} 
          />
        );
      default: return appMode === 'BUSINESS' ? <Dashboard activeProfileId={profileId} /> : <TalentManagement activeProfileId={profileId} activeProjectId={profileId} currentView="TALENT_DASHBOARD" setView={setCurrentView} />;
    }
  };

  return (
    <div className={`flex flex-col md:flex-row min-h-[100dvh] ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        activeProfile={activeProfile}
        appMode={appMode}
        onExitProject={handleExitProject}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
      />
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
