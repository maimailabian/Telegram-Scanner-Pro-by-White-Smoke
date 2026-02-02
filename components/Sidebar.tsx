
import React from 'react';
import { LayoutDashboard, Grid, Inbox, Sun, Moon } from 'lucide-react';
import { AppTab, Theme } from '../types';
import Logo from './Logo';

interface SidebarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, setActiveTab, isOpen, setIsOpen, theme, setTheme 
}) => {
  const menuItems = [
    { id: AppTab.DASHBOARD, label: 'BẢNG ĐIỀU KHIỂN', icon: LayoutDashboard },
    { id: AppTab.RESULTS, label: 'KẾT QUẢ QUÉT', icon: Grid },
    { id: AppTab.SETTINGS, label: 'CÀI ĐẶT', icon: Inbox },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsOpen(false)} />}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-[280px] z-40 transition-all duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${theme === 'dark' ? 'bg-[#141415] border-r border-gray-800' : 'bg-white border-r border-gray-100'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="mb-10 mt-2 flex justify-center">
            <Logo size="sm" theme={theme} />
          </div>

          <nav className="space-y-3">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-4 px-5 py-3 rounded-xl transition-all font-bold text-[11px] tracking-wider
                  ${activeTab === item.id 
                    ? (theme === 'dark' ? 'bg-[#1F1F20] border-2 border-[#502b6e] text-white' : 'bg-white border-2 border-[#502b6e] text-[#502b6e] shadow-sm')
                    : (theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-50')}
                `}
              >
                <div className={`${activeTab === item.id ? (theme === 'dark' ? 'text-white' : 'text-[#502b6e]') : 'text-gray-400'}`}>
                  <item.icon size={18} fill={activeTab === item.id ? "currentColor" : "none"} />
                </div>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-2 pt-6 border-t border-gray-800/20">
            <div className="flex items-center justify-between p-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                {theme === 'light' ? <Sun size={14} /> : <Moon size={14} />} CHẾ ĐỘ {theme === 'light' ? 'SÁNG' : 'TỐI'}
              </span>
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[#502b6e]' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
