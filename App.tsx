
import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { AppTab, ScanResult, Theme, TelegramGroup } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Results from './components/Results';
import Sidebar from './components/Sidebar';
import BinaryRain from './components/BinaryRain';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.LOGIN);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [session, setSession] = useState<{apiId: string, apiHash: string} | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [theme, setTheme] = useState<Theme>('light');
  const [showIntro, setShowIntro] = useState(true);
  const [isIntroEnding, setIsIntroEnding] = useState(false);
  const [pendingScanGroup, setPendingScanGroup] = useState<TelegramGroup | null>(null);

  useEffect(() => {
    const endingTimer = setTimeout(() => setIsIntroEnding(true), 17000);
    const removeTimer = setTimeout(() => setShowIntro(false), 20000);

    const savedSession = localStorage.getItem('tg_scanner_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
      setActiveTab(AppTab.DASHBOARD);
    }
    const savedResults = localStorage.getItem('tg_scanner_results');
    if (savedResults) setScanResults(JSON.parse(savedResults));

    const savedTheme = localStorage.getItem('tg_scanner_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);

    return () => {
      clearTimeout(endingTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('tg_scanner_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogin = (apiId: string, apiHash: string) => {
    const newSession = { apiId, apiHash };
    setSession(newSession);
    localStorage.setItem('tg_scanner_session', JSON.stringify(newSession));
    setActiveTab(AppTab.DASHBOARD);
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_scanner_session');
    setSession(null);
    setActiveTab(AppTab.LOGIN);
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
    <>
      {showIntro && <BinaryRain isEnding={isIntroEnding} />}
      
      {!session ? (
        <Login onLogin={handleLogin} />
      ) : (
        <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-[#0F0F10] text-white' : 'bg-[#F8F9FA] text-gray-900'}`}>
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isOpen={isSidebarOpen} 
            setIsOpen={setIsSidebarOpen}
            theme={theme}
            setTheme={setTheme}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={`lg:hidden fixed top-6 left-6 z-50 p-2 rounded-lg shadow-md ${theme === 'dark' ? 'bg-[#1A1A1A] text-white' : 'bg-white text-gray-600'}`}
            >
              <Menu size={24} />
            </button>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8">
              <div className="max-w-[1400px] mx-auto w-full h-full flex flex-col">
                {activeTab === AppTab.DASHBOARD && (
                  <Dashboard onStartScan={handleStartScan} theme={theme} />
                )}
                {activeTab === AppTab.RESULTS && (
                  <Results 
                    results={scanResults} 
                    theme={theme} 
                    onScanComplete={addScanResult}
                    pendingScanGroup={pendingScanGroup}
                    onCancelPending={() => setPendingScanGroup(null)}
                  />
                )}
                {activeTab === AppTab.SETTINGS && (
                  <div className={`p-10 rounded-[32px] shadow-sm border ${theme === 'dark' ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100'} max-w-2xl mx-auto mt-10 w-full`}>
                    <h2 className="text-2xl font-black mb-8 uppercase tracking-tight">Cài đặt hệ thống</h2>
                    <div className="space-y-8">
                      <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#252526] border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Thông tin API</p>
                        <div className="grid gap-4">
                          <div>
                            <span className="text-xs font-bold text-gray-500">API ID:</span>
                            <p className="text-sm font-black">{session.apiId}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-500">API Hash:</span>
                            <p className="text-sm font-black truncate">••••••••••••••••</p>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="w-full py-4 btn-dark text-white rounded-xl font-black text-xs uppercase tracking-widest"
                      >
                        Đăng xuất ngay
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
