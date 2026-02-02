
import React, { useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { AppTab, ScanResult, Theme, TelegramGroup, LoginStep } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Results from './components/Results';
import Sidebar from './components/Sidebar';

// @ts-ignore
import * as telegram from 'telegram';

const TelegramClient = (telegram as any).TelegramClient;
const sessions = (telegram as any).sessions || {};
const StringSession = sessions.StringSession || (telegram as any).StringSession;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.LOGIN);
  const [loginStep, setLoginStep] = useState<LoginStep>(LoginStep.METHOD_SELECT);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<{apiId: string, apiHash: string, stringSession: string} | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [theme, setTheme] = useState<Theme>('light');
  const [pendingScanGroup, setPendingScanGroup] = useState<TelegramGroup | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const clientRef = useRef<any>(null);

  useEffect(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }

    const savedSession = localStorage.getItem('tg_scanner_v5_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSession(parsed);
        setActiveTab(AppTab.DASHBOARD);
        
        const stringSession = new StringSession(parsed.stringSession);
        clientRef.current = new TelegramClient(
          stringSession,
          parseInt(parsed.apiId),
          parsed.apiHash,
          { connectionRetries: 5, deviceModel: "Scanner Pro V5", useWSS: true }
        );
      } catch (e) {
        localStorage.removeItem('tg_scanner_v5_session');
      }
    }
    const savedResults = localStorage.getItem('tg_scanner_results');
    if (savedResults) setScanResults(JSON.parse(savedResults));
    const savedTheme = localStorage.getItem('tg_scanner_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);
  }, []);

  const initClient = (apiId: string, apiHash: string) => {
    const apiIdInt = parseInt(apiId);
    if (isNaN(apiIdInt)) throw new Error("API ID phải là số");
    
    if (!clientRef.current || clientRef.current.apiId !== apiIdInt) {
      clientRef.current = new TelegramClient(
        new StringSession(""), 
        apiIdInt, 
        apiHash, 
        { connectionRetries: 5, deviceModel: "Scanner Pro V5", useWSS: true }
      );
    }
    return clientRef.current;
  };

  const handleQRLogin = async (apiId: string, apiHash: string, password?: string) => {
    setLoginError(null);
    try {
      const client = initClient(apiId, apiHash);
      if (!client.connected) await client.connect();

      // Nếu đã có password (từ bước 2FA của QR), thực hiện signIn trực tiếp
      if (password) {
        // Thông thường sign-in QR sẽ tự hoàn tất, nhưng nếu yêu cầu password, GramJS sẽ ném lỗi
        // Ở đây ta gọi start để handle các callback nếu cần
        await client.start({
          password: async () => password,
          onError: (err: any) => setLoginError(err.message),
        });
        finishLogin(apiId, apiHash);
        return;
      }

      setQrToken(null);
      setLoginStep(LoginStep.QR_CODE);

      await client.signInUserWithQrCode(
        { apiId: parseInt(apiId), apiHash },
        {
          onError: (err: any) => {
            if (err.message.includes("SESSION_PASSWORD_NEEDED")) {
               setLoginStep(LoginStep.PASSWORD_2FA);
            } else {
               setLoginError(err.message);
            }
          },
          qrCode: (qr: any) => {
            const token = qr.token.toString("base64");
            setQrToken(`tg://login?token=${token}`);
          }
        }
      );

      finishLogin(apiId, apiHash);
    } catch (err: any) {
      if (err.message.includes("SESSION_PASSWORD_NEEDED")) {
        setLoginStep(LoginStep.PASSWORD_2FA);
      } else {
        setLoginError(err.message || "Lỗi đăng nhập QR");
        setLoginStep(LoginStep.METHOD_SELECT);
      }
    }
  };

  const handlePhoneLogin = async (config: { apiId: string, apiHash: string, phone: string, code?: string, password?: string }) => {
    setLoginError(null);
    try {
      const client = initClient(config.apiId, config.apiHash);
      if (!client.connected) await client.connect();

      await client.start({
        phoneNumber: async () => config.phone,
        password: async () => {
          // Nếu config chưa có password, chuyển bước UI và chờ
          if (!config.password) {
            setLoginStep(LoginStep.PASSWORD_2FA);
            throw new Error("WAIT_FOR_PASSWORD");
          }
          return config.password;
        },
        phoneCode: async () => {
          if (!config.code) {
            setLoginStep(LoginStep.OTP_VERIFICATION);
            throw new Error("WAIT_FOR_CODE");
          }
          return config.code;
        },
        onError: (err: any) => {
           if (!err.message.includes("WAIT_FOR")) {
             setLoginError(err.message);
           }
        },
      });

      finishLogin(config.apiId, config.apiHash);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg === "WAIT_FOR_CODE" || msg === "WAIT_FOR_PASSWORD") return;
      
      if (msg.includes("PHONE_CODE_INVALID")) setLoginError("Mã OTP không chính xác");
      else if (msg.includes("SESSION_PASSWORD_NEEDED")) setLoginStep(LoginStep.PASSWORD_2FA);
      else if (msg.includes("PASSWORD_HASH_INVALID")) setLoginError("Mật khẩu 2FA không đúng");
      else setLoginError(msg);
    }
  };

  const finishLogin = (apiId: string, apiHash: string) => {
    const finalSession = {
      apiId,
      apiHash,
      stringSession: clientRef.current.session.save()
    };
    setSession(finalSession);
    localStorage.setItem('tg_scanner_v5_session', JSON.stringify(finalSession));
    setActiveTab(AppTab.DASHBOARD);
  };

  const handleLogout = async () => {
    if (clientRef.current) try { await clientRef.current.disconnect(); } catch (e) {}
    localStorage.removeItem('tg_scanner_v5_session');
    setSession(null);
    setLoginStep(LoginStep.METHOD_SELECT);
    setActiveTab(AppTab.LOGIN);
    clientRef.current = null;
  };

  const handleStartScan = (group: TelegramGroup) => {
    setPendingScanGroup(group);
    setActiveTab(AppTab.RESULTS);
  };

  const addScanResult = (result: ScanResult) => {
    setScanResults(prev => {
      const existingIdx = prev.findIndex(r => r.groupId === result.groupId);
      let updated;
      if (existingIdx !== -1) {
        const combinedMembers = [...prev[existingIdx].members, ...result.members];
        const uniqueMembers = Array.from(new Map(combinedMembers.map(m => [m.id, m])).values());
        updated = [...prev];
        updated[existingIdx] = { ...result, members: uniqueMembers };
      } else {
        updated = [result, ...prev];
      }
      localStorage.setItem('tg_scanner_results', JSON.stringify(updated));
      return updated;
    });
    setPendingScanGroup(null);
  };

  return (
    <div className={`w-full h-full ${theme === 'dark' ? 'dark' : ''}`}>
      {!session ? (
        <Login 
          onPhoneLogin={handlePhoneLogin} 
          onQrLogin={handleQRLogin}
          currentStep={loginStep} 
          setStep={setLoginStep}
          qrToken={qrToken}
          error={loginError} 
        />
      ) : (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-[#0F0F10] text-white' : 'bg-[#F8F9FA] text-gray-900'}`}>
          <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} theme={theme} setTheme={setTheme} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <button onClick={() => setIsSidebarOpen(true)} className={`lg:hidden fixed top-6 left-6 z-50 p-2 rounded-lg shadow-md ${theme === 'dark' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-600'}`}>
              <Menu size={24} />
            </button>
            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
              <div className="max-w-[1400px] mx-auto w-full h-full">
                {activeTab === AppTab.DASHBOARD && <Dashboard onStartScan={handleStartScan} theme={theme} client={clientRef.current} />}
                {activeTab === AppTab.RESULTS && <Results results={scanResults} theme={theme} onScanComplete={addScanResult} pendingScanGroup={pendingScanGroup} client={clientRef.current} />}
                {activeTab === AppTab.SETTINGS && (
                  <div className={`p-10 rounded-[32px] shadow-sm border ${theme === 'dark' ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100'} max-w-2xl mx-auto mt-10 w-full`}>
                    <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">Cài đặt</h2>
                    <div className="space-y-8">
                      <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#252526] border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="grid gap-4 text-sm font-black">
                          <div><span className="text-gray-500">API ID:</span> {session.apiId}</div>
                          <div><span className="text-gray-500">Trạng thái:</span> <span className="text-green-500">ĐÃ KẾT NỐI</span></div>
                        </div>
                      </div>
                      <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-colors">Đăng xuất</button>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
