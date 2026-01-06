
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
// Importing missing interfaces and ViewState union from types.ts to resolve compilation errors
import { Employee, Attendance, OfficeLocation, Holiday, ViewState } from '../types';
import { 
  Plus, Trash2, Edit3, X, Loader2, Contact2, 
  Calendar, Fingerprint, MapPin, UserCircle, Phone, 
  Search, CheckCircle2, AlertCircle, Clock, TrendingUp, Users, Camera, MapPin as MapPinIcon, RefreshCw, Briefcase,
  ExternalLink, Sun, Coffee, FileText, Filter, ChevronRight, User
} from 'lucide-react';

interface EmployeeManagementProps {
  activeProfileId: string;
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ activeProfileId, currentView, setView }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  
  // Dashboard Specific Date Filter
  const [dashStartDate, setDashStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of month
    return d.toISOString().split('T')[0];
  });
  const [dashEndDate, setDashEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Form States with explicit type narrowing for status fields
  const [employeeForm, setEmployeeForm] = useState({ nama: '', nomorHp: '', tanggalMasuk: new Date().toISOString().split('T')[0], posisi: '', lokasiKantor: '', status: 'AKTIF' as 'AKTIF' | 'RESIGN' });
  const [locationForm, setLocationForm] = useState({ namaKantor: '', alamat: '' });
  const [holidayForm, setHolidayForm] = useState({ tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
  const [attendanceForm, setAttendanceForm] = useState({ employeeId: '', status: 'HADIR' as any, keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
  
  // Camera & Geolocation States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);

    const qEmployees = query(collection(db, 'DAFTAR KARYAWAN'), where('profileId', '==', activeProfileId));
    const qAttendances = query(collection(db, 'ABSENSI'), where('profileId', '==', activeProfileId));
    const qLocations = query(collection(db, 'LOKASI KANTOR'), where('profileId', '==', activeProfileId));
    const qHolidays = query(collection(db, 'HARI_LIBUR'), where('profileId', '==', activeProfileId));

    const unsubEmp = onSnapshot(qEmployees, (snap) => setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee))));
    const unsubLoc = onSnapshot(qLocations, (snap) => setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() } as OfficeLocation))));
    const unsubHol = onSnapshot(qHolidays, (snap) => setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() } as Holiday))));
    const unsubAtt = onSnapshot(qAttendances, (snap) => {
      setAttendances(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
      setLoading(false);
    });

    return () => { 
      unsubEmp(); unsubAtt(); unsubLoc(); unsubHol(); 
      stopCamera(); // Component cleanup
    };
  }, [activeProfileId]);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...employeeForm, profileId: activeProfileId };
      if (editingItem) await updateDoc(doc(db, 'DAFTAR KARYAWAN', editingItem.id), payload);
      else await addDoc(collection(db, 'DAFTAR KARYAWAN'), payload);
      closeModal();
    } catch (err) { alert("Gagal menyimpan data."); } finally { setIsSaving(false); }
  };

  const handleSaveHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'HARI_LIBUR'), { ...holidayForm, profileId: activeProfileId });
      setIsHolidayModalOpen(false);
      setHolidayForm({ tanggal: new Date().toISOString().split('T')[0], keterangan: '' });
    } catch (err) { alert("Gagal menyimpan hari libur."); } finally { setIsSaving(false); }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...locationForm, profileId: activeProfileId, createdAt: serverTimestamp() };
      if (editingItem) await updateDoc(doc(db, 'LOKASI KANTOR', editingItem.id), payload);
      else await addDoc(collection(db, 'LOKASI KANTOR'), payload);
      closeModal();
    } catch (err) { alert("Gagal menyimpan lokasi kantor."); } finally { setIsSaving(false); }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceForm.employeeId) { alert("Pilih karyawan."); return; }
    if (!capturedPhoto) { alert("Silakan ambil foto verifikasi wajah."); return; }
    
    setIsSaving(true);
    const emp = employees.find(e => e.id === attendanceForm.employeeId);
    try {
      let finalPhotoUrl = "";
      if (capturedPhoto) {
        const storagePath = `absensi/${activeProfileId}/${attendanceForm.employeeId}_${Date.now()}.jpg`;
        const storageRef = ref(storage, storagePath);
        await uploadString(storageRef, capturedPhoto, 'data_url');
        finalPhotoUrl = await getDownloadURL(storageRef);
      }
      const payload = { 
        ...attendanceForm, 
        namaKaryawan: emp?.nama || '', 
        jabatan: emp?.posisi || '', 
        tanggal: Timestamp.fromDate(new Date(attendanceForm.tanggal)),
        profileId: activeProfileId,
        foto: finalPhotoUrl,
        lokasi: currentLocation ? { latitude: currentLocation.lat, longitude: currentLocation.lng } : null
      };
      await addDoc(collection(db, 'ABSENSI'), payload);
      closeModal();
    } catch (err) { alert("Gagal menyimpan absensi."); } finally { setIsSaving(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false); 
    setEditingItem(null);
    setEmployeeForm({ nama: '', nomorHp: '', tanggalMasuk: new Date().toISOString().split('T')[0], posisi: '', lokasiKantor: '', status: 'AKTIF' });
    setLocationForm({ namaKantor: '', alamat: '' });
    setAttendanceForm({ employeeId: '', status: 'HADIR', keterangan: '', tanggal: new Date().toISOString().split('T')[0] });
    setCapturedPhoto(null);
    setCurrentLocation(null);
    stopCamera();
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("Gagal mengakses kamera. Periksa izin browser Anda."); setIsCameraActive(false); }
    
    // Attempt to capture GPS coordinates for presence verification
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setCapturedPhoto(canvasRef.current.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  // Memoized statistics based on attendance data and date filters
  const employeeAttendanceStats = useMemo(() => {
    const statsMap: Record<string, { hadir: number, sakit: number, alpa: number, izin: number }> = {};

    attendances.forEach(att => {
      if (!att.tanggal?.toDate) return;
      const d = att.tanggal.toDate();
      
      const matchesStart = !dashStartDate || d >= new Date(dashStartDate);
      const matchesEnd = !dashEndDate || d <= new Date(dashEndDate + 'T23:59:59');

      if (matchesStart && matchesEnd) {
        if (!statsMap[att.employeeId]) {
          statsMap[att.employeeId] = { hadir: 0, sakit: 0, alpa: 0, izin: 0 };
        }
        if (att.status === 'HADIR') statsMap[att.employeeId].hadir++;
        else if (att.status === 'SAKIT') statsMap[att.employeeId].sakit++;
        else if (att.status === 'ALPA') statsMap[att.employeeId].alpa++;
        else if (att.status === 'IZIN') statsMap[att.employeeId].izin++;
      }
    });

    return statsMap;
  }, [attendances, dashStartDate, dashEndDate]);

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let sundaysCount = 0;
    const date = new Date(currentYear, currentMonth, 1);
    while (date.getMonth() === currentMonth) {
      if (date.getDay() === 0) sundaysCount++;
      date.setDate(date.getDate() + 1);
    }

    const monthHolidays = holidays.filter(h => {
      const d = new Date(h.tanggal);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return {
      totalKaryawan: employees.length,
      libur: sundaysCount + monthHolidays.length,
      customHolidays: monthHolidays
    };
  }, [employees, holidays]);

  const filteredEmployees = employees.filter(emp => 
    emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.posisi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dailyAttendances = useMemo(() => {
    return attendances.filter(a => {
      if (!a.tanggal?.toDate) return false;
      const matchesDate = a.tanggal.toDate().toISOString().split('T')[0] === selectedDate;
      const matchesEmployee = !filterEmployeeId || a.employeeId === filterEmployeeId;
      return matchesDate && matchesEmployee;
    });
  }, [attendances, selectedDate, filterEmployeeId]);

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600 w-10 h-10" /></div>;

  return (
    <div className="space-y-6 md:mt-2 relative">
      {/* VIEW: KARYAWAN_DASHBOARD - Comparing with valid ViewState literal */}
      {currentView === 'KARYAWAN_DASHBOARD' && (
        <div className="space-y-8 animate-in fade-in duration-700 pb-10">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black dark:text-white tracking-tight">Dashboard SDM</h2>
              <p className="text-slate-500 font-medium italic">Rangkuman kehadiran dan jadwal operasional.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border dark:border-slate-800 flex flex-wrap items-center gap-4 shadow-sm">
               <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode:</span>
               </div>
               <div className="flex items-center gap-2">
                  <input type="date" value={dashStartDate} onChange={e => setDashStartDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none outline-none text-xs font-bold dark:text-white rounded-lg px-2 py-1" />
                  <span className="text-slate-400 text-xs">-</span>
                  <input type="date" value={dashEndDate} onChange={e => setDashEndDate(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border-none outline-none text-xs font-bold dark:text-white rounded-lg px-2 py-1" />
               </div>
               {(dashStartDate || dashEndDate) && (
                 <button onClick={() => { 
                   const d = new Date(); d.setDate(1); 
                   setDashStartDate(d.toISOString().split('T')[0]); 
                   setDashEndDate(new Date().toISOString().split('T')[0]); 
                 }} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                   <RefreshCw className="w-3.5 h-3.5" />
                 </button>
               )}
            </div>
          </header>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                <UserCircle className="w-6 h-6 text-emerald-600" /> Detail Kehadiran Individu
              </h3>
              {/* setView called with valid ViewState literal */}
              <button onClick={() => setView('KARYAWAN_LIST')} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                Kelola Karyawan <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 shadow-sm overflow-hidden">
               <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                        <tr>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama & Posisi</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Hadir</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sakit</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Alpa</th>
                          <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Izin</th>
                          <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y dark:divide-slate-800">
                        {employees.map(emp => {
                          const stats = employeeAttendanceStats[emp.id] || { hadir: 0, sakit: 0, alpa: 0, izin: 0 };
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-8 py-5">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-black text-xs">
                                       {emp.nama[0]}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black dark:text-white leading-none mb-1">{emp.nama}</p>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase">{emp.posisi}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                 <span className="text-sm font-black text-emerald-600">{stats.hadir}</span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                 <span className="text-sm font-black text-blue-600">{stats.sakit}</span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                 <span className="text-sm font-black text-red-600">{stats.alpa}</span>
                              </td>
                              <td className="px-6 py-5 text-center">
                                 <span className="text-sm font-black text-amber-600">{stats.izin}</span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${emp.status === 'AKTIF' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                    {emp.status}
                                 </span>
                              </td>
                            </tr>
                          );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: KARYAWAN_LIST - Comparing with valid ViewState literal */}
      {currentView === 'KARYAWAN_LIST' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-black dark:text-white">Daftar Karyawan</h2>
            <button onClick={() => { setEditingItem(null); setEmployeeForm({nama: '', nomorHp: '', tanggalMasuk: new Date().toISOString().split('T')[0], posisi: '', lokasiKantor: '', status: 'AKTIF'}); setIsModalOpen(true); }} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 uppercase tracking-widest transition-all active:scale-95">
              <Plus className="w-5 h-5" /> Tambah Karyawan
            </button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari nama atau posisi..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl outline-none dark:text-white font-medium" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map(emp => (
              <div key={emp.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm group hover:border-emerald-500 transition-all duration-300">
                <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                      {emp.nama[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black dark:text-white text-lg truncate mb-1">{emp.nama}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{emp.posisi}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(emp); setEmployeeForm({...emp}); setIsModalOpen(true); }} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 dark:text-emerald-400 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Edit</button>
                    <button onClick={async () => { if(confirm('Hapus data karyawan ini?')) await deleteDoc(doc(db, 'DAFTAR KARYAWAN', emp.id)); }} className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: KARYAWAN_ABSENSI - Comparing with valid ViewState literal */}
      {currentView === 'KARYAWAN_ABSENSI' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-black dark:text-white">Presensi Harian</h2>
            <button onClick={() => { setEditingItem(null); setAttendanceForm({employeeId: '', status: 'HADIR', keterangan: '', tanggal: new Date().toISOString().split('T')[0]}); setIsModalOpen(true); }} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 uppercase tracking-widest active:scale-95 transition-all">
              <Plus className="w-5 h-5" /> Catat Absensi
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 flex items-center gap-5 shadow-sm">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><Calendar className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter Tanggal</p>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent dark:text-white font-bold outline-none text-sm w-full" />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border dark:border-slate-800 flex items-center gap-5 shadow-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl"><Filter className="w-5 h-5" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Filter Karyawan</p>
                <select value={filterEmployeeId} onChange={e => setFilterEmployeeId(e.target.value)} className="bg-transparent dark:text-white font-bold outline-none text-sm w-full appearance-none">
                  <option value="">Semua Karyawan</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.nama}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {dailyAttendances.map(a => (
               <div key={a.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={async () => { if(confirm('Hapus absensi ini?')) await deleteDoc(doc(db, 'ABSENSI', a.id)); }} className="p-2 text-slate-400 hover:text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                        a.status === 'HADIR' ? 'bg-emerald-500/10 text-emerald-500' : 
                        a.status === 'SAKIT' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>{a.status}</span>
                    </div>
                    {a.foto && (
                      <div className="aspect-video w-full rounded-2xl overflow-hidden mb-6 border-2 dark:border-slate-800 bg-slate-50 shadow-inner">
                         <img src={a.foto} className="w-full h-full object-cover" alt="Verification" />
                      </div>
                    )}
                    <h4 className="font-black dark:text-white text-base mb-1">{a.namaKaryawan}</h4>
                    {a.lokasi && (
                      <div className="mt-5 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800">
                         <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-500/20"><MapPinIcon className="w-3 h-3" /></div>
                         <a href={`https://www.google.com/maps?q=${a.lokasi.latitude},${a.lokasi.longitude}`} target="_blank" rel="noreferrer" className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                            Lihat Lokasi <ExternalLink className="w-2.5 h-2.5" />
                         </a>
                      </div>
                    )}
                  </div>
               </div>
             ))}
          </div>
        </div>
      )}

      {/* VIEW: KARYAWAN_LOKASI - Comparing with valid ViewState literal */}
      {currentView === 'KARYAWAN_LOKASI' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-2xl font-black dark:text-white">Lokasi Kantor</h2>
            <button onClick={() => { setEditingItem(null); setLocationForm({namaKantor: '', alamat: ''}); setIsModalOpen(true); }} className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 uppercase tracking-widest transition-all active:scale-95">
              <Plus className="w-5 h-5" /> Tambah Lokasi
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map(loc => (
              <div key={loc.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border dark:border-slate-800 shadow-sm group hover:border-emerald-500 transition-all duration-300">
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 transition-transform group-hover:scale-110">
                    <MapPinIcon className="w-7 h-7" />
                  </div>
                  <h3 className="font-black dark:text-white text-lg leading-tight">{loc.namaKantor}</h3>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(loc); setLocationForm({...loc}); setIsModalOpen(true); }} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Edit</button>
                  <button onClick={async () => { if(confirm('Hapus lokasi kantor ini?')) await deleteDoc(doc(db, 'LOKASI KANTOR', loc.id)); }} className="p-3.5 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal CRUD Karyawan / Lokasi - Comparing currentView with valid ViewState literals */}
      {isModalOpen && (currentView === 'KARYAWAN_LIST' || currentView === 'KARYAWAN_LOKASI') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={closeModal}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative border dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black dark:text-white">{editingItem ? 'Edit Data' : (currentView === 'KARYAWAN_LIST' ? 'Karyawan Baru' : 'Kantor Baru')}</h3>
               <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
             </div>
             {currentView === 'KARYAWAN_LIST' ? (
                <form onSubmit={handleSaveEmployee} className="space-y-5">
                   <input required className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm" placeholder="Nama Karyawan" value={employeeForm.nama} onChange={e => setEmployeeForm({...employeeForm, nama: e.target.value})} />
                   <input required className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm" placeholder="Nomor WhatsApp" value={employeeForm.nomorHp} onChange={e => setEmployeeForm({...employeeForm, nomorHp: e.target.value})} />
                   <input required className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm" placeholder="Posisi" value={employeeForm.posisi} onChange={e => setEmployeeForm({...employeeForm, posisi: e.target.value})} />
                   <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all">Simpan Karyawan</button>
                </form>
             ) : (
                <form onSubmit={handleSaveLocation} className="space-y-6">
                  <input required className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm" placeholder="Nama Kantor" value={locationForm.namaKantor} onChange={e => setLocationForm({...locationForm, namaKantor: e.target.value})} />
                  <textarea required rows={3} className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm resize-none" placeholder="Alamat Lengkap" value={locationForm.alamat} onChange={e => setLocationForm({...locationForm, alamat: e.target.value})} />
                  <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all">Simpan Lokasi</button>
                </form>
             )}
          </div>
        </div>
      )}

      {/* Modal Presensi - Comparing currentView with valid ViewState literal */}
      {isModalOpen && currentView === 'KARYAWAN_ABSENSI' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={closeModal}></div>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 relative border dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-10 duration-500">
             <div className="flex justify-between items-center mb-8">
               <h3 className="text-2xl font-black dark:text-white tracking-tight">Presensi Kehadiran</h3>
               <button onClick={closeModal} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleSaveAttendance} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Verifikasi Wajah & GPS</label>
                  <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden border-4 dark:border-slate-800 border-slate-100 bg-slate-950 group shadow-2xl">
                     {!capturedPhoto ? (
                       <>
                         {!isCameraActive ? (
                           <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500 p-8">
                              <div className="p-6 bg-slate-900 rounded-3xl"><Camera className="w-10 h-10" /></div>
                              <button type="button" onClick={startCamera} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all">Aktifkan Kamera</button>
                           </div>
                         ) : (
                           <>
                             <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                             <button type="button" onClick={capturePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-emerald-500 shadow-2xl flex items-center justify-center text-emerald-600 hover:scale-110 active:scale-90 transition-all">
                               <Camera className="w-8 h-8" />
                             </button>
                           </>
                         )}
                       </>
                     ) : (
                       <div className="relative w-full h-full">
                         <img src={capturedPhoto} className="w-full h-full object-cover scale-x-[-1]" alt="Snapshot" />
                         <button type="button" onClick={startCamera} className="absolute top-6 right-6 p-3 bg-slate-900/60 backdrop-blur-md text-white rounded-xl hover:bg-slate-900 transition-all active:scale-90">
                            <RefreshCw className="w-5 h-5" />
                         </button>
                       </div>
                     )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Pilih Karyawan</label>
                  <select required className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm" value={attendanceForm.employeeId} onChange={e => setAttendanceForm({...attendanceForm, employeeId: e.target.value})}>
                    <option value="">Pilih...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.nama}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Status</label>
                  <select required className="w-full px-5 py-4 dark:bg-slate-800 dark:border-slate-700 border-2 rounded-2xl outline-none dark:text-white font-bold text-sm" value={attendanceForm.status} onChange={e => setAttendanceForm({...attendanceForm, status: e.target.value as any})}>
                    <option value="HADIR">HADIR</option>
                    <option value="IZIN">IZIN</option>
                    <option value="SAKIT">SAKIT</option>
                    <option value="ALPA">ALPA</option>
                  </select>
                </div>

                <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all mt-4">
                  {isSaving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Selesaikan Presensi'}
                </button>
             </form>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
