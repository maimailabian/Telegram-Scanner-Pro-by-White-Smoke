
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Lock, Phone, KeyRound, ArrowRight, ShieldCheck, 
  Loader2, AlertCircle, QrCode, Smartphone, Settings, ChevronLeft, Eye, EyeOff
} from 'lucide-react';
import { LoginStep } from '../types';
import Logo from './Logo';
// @ts-ignore
import QRCode from 'qrcode';

interface LoginProps {
  onPhoneLogin: (config: { apiId: string, apiHash: string, phone: string, code?: string, password?: string }) => Promise<void>;
  onQrLogin: (apiId: string, apiHash: string, password?: string) => Promise<void>;
  currentStep: LoginStep;
  setStep: (step: LoginStep) => void;
  qrToken: string | null;
  error?: string | null;
}

const Login: React.FC<LoginProps> = ({ 
  onPhoneLogin, onQrLogin, currentStep, setStep, qrToken, error 
}) => {
  const [apiId, setApiId] = useState(localStorage.getItem('saved_api_id') || '');
  const [apiHash, setApiHash] = useState(localStorage.getItem('saved_api_hash') || '');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [method, setMethod] = useState<'phone' | 'qr' | null>(null);
  const [showConfig, setShowConfig] = useState(apiId === '' || apiHash === '');
  
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrToken && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, qrToken, {
        width: 256,
        margin: 2,
        color: { dark: '#502b6e', light: '#ffffff' }
      });
    }
  }, [qrToken]);

  const saveConfig = () => {
    localStorage.setItem('saved_api_id', apiId);
    localStorage.setItem('saved_api_hash', apiHash);
  };

  const handleStartMethod = (m: 'phone' | 'qr') => {
    if (!apiId || !apiHash) {
      setShowConfig(true);
      return;
    }
    saveConfig();
    setMethod(m);
    if (m === 'qr') {
      setIsLoading(true);
      onQrLogin(apiId, apiHash).finally(() => setIsLoading(false));
    } else {
      setStep(LoginStep.PHONE_NUMBER);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (method === 'qr' && currentStep === LoginStep.PASSWORD_2FA) {
        await onQrLogin(apiId, apiHash, password);
      } else {
        await onPhoneLogin({ apiId, apiHash, phone: phoneNumber, code: otp, password });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderConfig = () => (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-6">
        <h3 className="text-sm font-black text-[#502b6e] uppercase tracking-widest">Cấu hình API Telegram</h3>
        <p className="text-[10px] text-gray-400 mt-1">Lấy tại my.telegram.org</p>
      </div>
      <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[60px] focus-within:border-blue-400 bg-gray-50/30">
        <div className="w-14 flex items-center justify-center bg-gray-50 text-gray-400"><Settings size={18} /></div>
        <input required type="text" placeholder="API ID" className="flex-1 px-4 outline-none text-xs font-bold" value={apiId} onChange={(e) => setApiId(e.target.value)} />
      </div>
      <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[60px] focus-within:border-blue-400 bg-gray-50/30">
        <div className="w-14 flex items-center justify-center bg-gray-50 text-gray-400"><Lock size={18} /></div>
        <input required type="password" placeholder="API HASH" className="flex-1 px-4 outline-none text-xs font-bold" value={apiHash} onChange={(e) => setApiHash(e.target.value)} />
      </div>
      <button onClick={() => setShowConfig(false)} disabled={!apiId || !apiHash} className="w-full py-4 bg-[#502b6e] text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-30">
        XÁC NHẬN CẤU HÌNH
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white p-6">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        <Logo size="lg" isWaiting={isLoading} className="mb-12" />

        {error && (
          <div className="w-full p-4 mb-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in shake">
            <AlertCircle size={18} />
            <p className="text-[10px] font-black uppercase">{error}</p>
          </div>
        )}

        {showConfig ? renderConfig() : (
          <div className="w-full space-y-6 animate-in fade-in duration-500">
            {currentStep === LoginStep.METHOD_SELECT && (
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => handleStartMethod('phone')} className="group flex items-center gap-6 p-6 border-2 border-gray-100 rounded-[28px] hover:border-[#3299D9] hover:bg-blue-50/30 transition-all text-left">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Smartphone size={24} /></div>
                  <div>
                    <h4 className="font-black text-sm text-[#502b6e] uppercase">Số điện thoại</h4>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Đăng nhập qua OTP SMS</p>
                  </div>
                  <ArrowRight size={18} className="ml-auto text-gray-300 group-hover:text-blue-500 transition-colors" />
                </button>

                <button onClick={() => handleStartMethod('qr')} className="group flex items-center gap-6 p-6 border-2 border-gray-100 rounded-[28px] hover:border-[#E6397A] hover:bg-rose-50/30 transition-all text-left">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform"><QrCode size={24} /></div>
                  <div>
                    <h4 className="font-black text-sm text-[#502b6e] uppercase">Mã QR Code</h4>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Quét bằng app Telegram</p>
                  </div>
                  <ArrowRight size={18} className="ml-auto text-gray-300 group-hover:text-rose-500 transition-colors" />
                </button>
                
                <button onClick={() => setShowConfig(true)} className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-[#502b6e] py-4">
                  <Settings size={12} /> Thay đổi API Keys
                </button>
              </div>
            )}

            {currentStep === LoginStep.QR_CODE && (
              <div className="flex flex-col items-center text-center p-6 border-2 border-gray-100 rounded-[32px] bg-white shadow-xl animate-in zoom-in-95 duration-500">
                <h3 className="text-sm font-black text-[#502b6e] uppercase mb-6">Quét mã QR để đăng nhập</h3>
                <div className="p-4 bg-white rounded-2xl border-2 border-gray-50 shadow-inner mb-6">
                  {qrToken ? (
                    <canvas ref={qrCanvasRef} className="rounded-xl" />
                  ) : (
                    <div className="w-64 h-64 flex items-center justify-center"><Loader2 className="animate-spin text-rose-500" size={32} /></div>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                  Mở Telegram &gt; Settings &gt; Devices &gt; Link Desktop Device
                </p>
                <button onClick={() => setStep(LoginStep.METHOD_SELECT)} className="mt-8 flex items-center gap-2 text-[10px] font-black text-[#E6397A] uppercase tracking-widest">
                  <ChevronLeft size={14} /> Quay lại
                </button>
              </div>
            )}

            {(currentStep === LoginStep.PHONE_NUMBER || currentStep === LoginStep.OTP_VERIFICATION || currentStep === LoginStep.PASSWORD_2FA) && (
              <form onSubmit={handleLoginSubmit} className="space-y-5 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <button type="button" onClick={() => setStep(LoginStep.METHOD_SELECT)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
                  <div className="flex-1">
                    <h3 className="font-black text-[#502b6e] uppercase text-sm leading-tight">
                      {currentStep === LoginStep.PHONE_NUMBER && "Xác thực Số điện thoại"}
                      {currentStep === LoginStep.OTP_VERIFICATION && "Nhập mã OTP"}
                      {currentStep === LoginStep.PASSWORD_2FA && "Xác thực 2FA"}
                    </h3>
                    {currentStep === LoginStep.PASSWORD_2FA && (
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Tài khoản này đã bật bảo mật 2 lớp</p>
                    )}
                  </div>
                </div>

                {currentStep === LoginStep.PHONE_NUMBER && (
                  <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[64px] focus-within:border-blue-400 bg-gray-50/30">
                    <div className="w-16 flex items-center justify-center bg-gray-50 text-gray-400"><Phone size={20} /></div>
                    <input required type="tel" placeholder="Số điện thoại (+84...)" className="flex-1 px-4 outline-none text-sm font-bold" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                  </div>
                )}

                {currentStep === LoginStep.OTP_VERIFICATION && (
                  <div className="flex flex-col gap-2">
                    <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[64px] focus-within:border-blue-400 bg-gray-50/30">
                      <div className="w-16 flex items-center justify-center bg-gray-50 text-gray-400"><KeyRound size={20} /></div>
                      <input required type="text" maxLength={5} placeholder="Mã OTP" className="flex-1 px-4 outline-none text-center text-xl font-black tracking-[0.5em]" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    </div>
                    <p className="text-[9px] text-gray-400 px-2 italic">Mã được gửi về ứng dụng Telegram hoặc SMS</p>
                  </div>
                )}

                {currentStep === LoginStep.PASSWORD_2FA && (
                  <div className="flex border-2 border-gray-100 rounded-2xl overflow-hidden h-[64px] focus-within:border-blue-400 bg-gray-50/30 group">
                    <div className="w-16 flex items-center justify-center bg-gray-50 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                      <ShieldCheck size={20} />
                    </div>
                    <input 
                      required 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Nhập mật khẩu của bạn" 
                      className="flex-1 px-4 outline-none text-sm font-bold" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="px-4 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                <button type="submit" disabled={isLoading} className="w-full h-16 bg-main-gradient text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                  {isLoading ? <Loader2 className="animate-spin" /> : "TIẾP TỤC"}
                </button>
              </form>
            )}
          </div>
        )}

        <div className="mt-12">
          <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-[#502b6e] transition-colors">
            Cần trợ giúp thiết lập?
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
