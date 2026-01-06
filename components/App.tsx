
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import AuthScreen from './AuthScreen';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ShopList from './ShopList';
import ProductList from './ProductList';
import SalesList from './SalesList';
import ContentList from './ContentList';
import DailyTarget from './DailyTarget';
import GeminiInsights from './GeminiInsights';
import ReportExport from './ReportExport';
import ProjectSelector from './ProjectSelector';
import TalentManagement from './TalentManagement';
import AppPortal from './AppPortal';
import { ViewState, AccountProfile, AppMode, UserPermission } from '../types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<UserPermission | null>(null);
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const permRef = doc(db, 'USER_PERMISSIONS', currentUser.uid);
        const permSnap = await getDoc(permRef);
        
        // Default permission for all authenticated users
        const defaultPerm: UserPermission = {
          email: currentUser.email || '',
          allowedModes: ['BUSINESS', 'TALENT'],
          role: 'ADMIN'
        };

        if (!permSnap.exists()) {
          await setDoc(permRef, defaultPerm);
        }
        
        setPermissions(defaultPerm);
      } else {
        setPermissions(null);
        setProfiles([]);
        setActiveProfile(null);
        setAppMode(null);
      }
      setLoading(false);
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
      
      const savedId = localStorage.getItem(`activeProfile_${user.uid}_${appMode}`);
      const found = profileList.find(p => p.id === savedId);
      
      if (found) {
        setActiveProfile(found);
      } else if (appMode === 'TALENT') {
         if (profileList.length > 0) {
            setActiveProfile(profileList[0]);
         } else {
            const createDefault = async () => {
              try {
                await addDoc(collection(db, 'AKUN'), {
                  userId: user.uid,
                  nama: 'Talent Workspace',
                  appMode: 'TALENT',
                  createdAt: serverTimestamp()
                });
              } catch (e) { console.error(e); }
            };
            createDefault();
         }
      }
      
      setLoading(false);
    });
    return () => unsubProfiles();
  }, [user, appMode]);

  useEffect(() => {
    if (activeProfile && appMode) {
      if (appMode === 'BUSINESS') setCurrentView('DASHBOARD');
      else if (appMode === 'TALENT') setCurrentView('TALENT_DASHBOARD');
    }
  }, [activeProfile, appMode]);

  const handleSelectProfile = (profile: AccountProfile) => {
    setActiveProfile(profile);
    localStorage.setItem(`activeProfile_${user?.uid}_${appMode}`, profile.id);
  };

  const handleExitProject = () => {
    setActiveProfile(null);
    setAppMode(null);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-12 w-12 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!appMode) {
    return (
      <AppPortal 
        onSelect={setAppMode} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        allowedModes={['BUSINESS', 'TALENT']} 
      />
    );
  }

  if (!activeProfile && appMode === 'BUSINESS') {
    return (
      <ProjectSelector 
        profiles={profiles} 
        onSelect={handleSelectProfile}
        onBack={() => setAppMode(null)}
        isDarkMode={isDarkMode}
        appMode={appMode}
      />
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
        return <TalentManagement activeProfileId={profileId} activeProjectId={profileId} currentView={currentView} setView={setCurrentView} />;
      default: return null;
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
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto pt-20 pb-10 px-4 md:pt-10 md:px-8">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
