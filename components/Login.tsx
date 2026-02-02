
import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLogin: (apiId: string, apiHash: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiId && apiHash) {
      setIsConnecting(true);
      setTimeout(() => {
        onLogin(apiId, apiHash);
        setIsConnecting(false);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        <Logo size="lg" isWaiting={isConnecting} className="mb-14" />

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[60px] transition-all focus-within:border-blue-400 bg-gray-50/50">
            <div className="w-16 flex items-center justify-center bg-gray-100 text-gray-500">
              <User size={22} fill="currentColor" />
            </div>
            <input
              type="text"
              placeholder="API ID của bạn"
              className="flex-1 px-5 outline-none text-[15px] font-bold text-gray-700 placeholder-gray-400 bg-transparent"
              value={apiId}
              disabled={isConnecting}
              onChange={(e) => setApiId(e.target.value)}
            />
          </div>

          <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[60px] transition-all focus-within:border-blue-400 bg-gray-50/50">
            <div className="w-16 flex items-center justify-center bg-gray-100 text-gray-500">
              <Lock size={22} fill="currentColor" />
            </div>
            <input
              type="password"
              placeholder="API HASH của bạn"
              className="flex-1 px-5 outline-none text-[15px] font-bold text-gray-700 placeholder-gray-400 bg-transparent"
              value={apiHash}
              disabled={isConnecting}
              onChange={(e) => setApiHash(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isConnecting}
            className="w-full h-16 mt-4 flex items-center justify-center text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl transition-all active:scale-[0.97] shadow-2xl shadow-purple-900/20"
            style={{ background: 'linear-gradient(135deg, #3299D9 0%, #E6397A 100%)' }}
          >
            {isConnecting ? (
              <div className="flex items-center gap-4">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>ĐANG KẾT NỐI...</span>
              </div>
            ) : (
              'KẾT NỐI HỆ THỐNG'
            )}
          </button>

          <div className="text-center pt-10">
            <a 
              href="https://my.telegram.org" 
              target="_blank" 
              rel="noreferrer"
              className="text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-[#502b6e] transition-colors"
            >
              Lấy API ID & API Hash ở đâu?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export default Login;
