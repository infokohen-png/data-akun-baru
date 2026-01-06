
import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, Lock, LogIn, ArrowLeft, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type AuthMode = 'LOGIN' | 'FORGOT_PASSWORD';

const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'LOGIN') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'FORGOT_PASSWORD') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Tautan pemulihan telah dikirim ke email Anda.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('Email tidak terdaftar.');
      else if (err.code === 'auth/wrong-password') setError('Kata sandi salah.');
      else if (err.code === 'auth/invalid-credential') setError('Email atau kata sandi salah.');
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden relative z-10">
        <div className="p-8 md:p-10">
          <div className="flex flex-col items-center mb-10">
            <h2 className="text-4xl font-black text-amber-500 tracking-tighter mb-2">
              PT BMS
            </h2>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {mode === 'LOGIN' && 'Manajemen Data'}
              {mode === 'FORGOT_PASSWORD' && 'Lupa Sandi?'}
            </h3>
            <p className="text-slate-400 mt-2 text-center text-sm font-medium">
              {mode === 'LOGIN' && 'Masuk ke Dashboard Strategis'}
              {mode === 'FORGOT_PASSWORD' && 'Masukkan email untuk reset kata sandi'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Alamat Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-white font-medium"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            {mode === 'LOGIN' && (
              <div>
                <div className="flex justify-between items-center mb-2 ml-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Kata Sandi</label>
                  <button 
                    type="button"
                    onClick={() => setMode('FORGOT_PASSWORD')}
                    className="text-[10px] text-amber-500 font-black uppercase tracking-widest hover:underline"
                  >
                    Lupa?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all text-white font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-500/10 text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-center gap-3 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 text-slate-950 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-amber-500/10"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'LOGIN' && <><LogIn className="w-5 h-5" /> LOGIN DASHBOARD</>}
                  {mode === 'FORGOT_PASSWORD' && <><Send className="w-5 h-5" /> KIRIM INSTRUKSI</>}
                </>
              )}
            </button>
          </form>

          {mode === 'FORGOT_PASSWORD' && (
            <div className="mt-10 pt-6 border-t border-slate-800 text-center">
              <button 
                onClick={() => setMode('LOGIN')} 
                className="text-xs text-slate-400 font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali Ke Login
              </button>
            </div>
          )}
          
          {mode === 'LOGIN' && (
            <div className="mt-10 pt-6 border-t border-slate-800 text-center">
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">
                Akses Terbatas • PT BMS Digital Ecosystem
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
