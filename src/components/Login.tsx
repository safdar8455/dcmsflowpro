import React from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, FileText } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 font-sans antialiased">
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative"
      >
        <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
          
          <div className="mb-10">
            <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-6 shadow-sm border border-blue-100">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tighter">
              ClaimFlow<span className="text-blue-600">Pro</span>
            </h2>
            <p className="mt-3 text-sm text-slate-500 font-medium uppercase tracking-[0.2em]">
              Centralized Processing Gateway
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              className="group relative w-full flex justify-center items-center gap-3 py-4 px-6 border border-transparent text-sm font-bold rounded-2xl text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 transition-all shadow-xl shadow-slate-900/10"
            >
              <LogIn className="h-5 w-5 text-slate-400 group-hover:text-white transition-colors" />
              Authenticate with Google
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-4">
              Authorized Personnel Only
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-8">
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Region</div>
            <div className="text-xs font-bold text-slate-600">ASIA-SE-1</div>
          </div>
          <div className="w-px h-6 bg-slate-200 self-center"></div>
          <div className="text-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</div>
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Encrypted
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
