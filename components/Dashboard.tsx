
import React, { useState, useEffect } from 'react';
import { Users, Search, Database, RefreshCw, Play, Loader2, Zap } from 'lucide-react';
import { TelegramGroup, Theme } from '../types';

interface DashboardProps {
  onStartScan: (group: TelegramGroup) => void;
  theme: Theme;
  client?: any;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartScan, theme, client }) => {
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRealGroups = async () => {
      if (!client) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Đảm bảo client đã kết nối
        if (!client.connected) await client.connect();
        
        const dialogs = await client.getDialogs({ limit: 100 });
        const tgGroups: TelegramGroup[] = dialogs
          .filter((d: any) => d.isGroup || d.isChannel)
          .map((d: any) => {
            // Lấy ID dưới dạng chuỗi chuẩn của GramJS để có thể dùng getEntity sau này
            // Với Channel, GramJS thường trả về ID âm hoặc dạng chuỗi đặc biệt
            const id = d.id.toString();
            
            return {
              id: id,
              name: d.title || "Nhóm không tên",
              memberCount: d.entity.participantsCount || 0,
              type: d.isChannel ? 'channel' : 'group',
              avatar: null
            };
          });
        
        setGroups(tgGroups);
      } catch (error) {
        console.error("Error fetching dialogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealGroups();
  }, [client]);

  const isDark = theme === 'dark';
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search Header */}
      <div className="w-full h-20 bg-main-gradient rounded-3xl flex items-center px-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white/10 skew-x-[45deg] translate-x-32 transition-transform group-hover:translate-x-10 duration-[2000ms]"></div>
        <div className="relative w-full max-w-md">
          <input 
            type="text" 
            placeholder="Tìm kiếm nhóm, kênh của bạn..."
            className="w-full h-11 bg-white/20 backdrop-blur-xl rounded-2xl px-6 pl-12 text-white placeholder-white/70 outline-none text-sm font-bold border border-white/20 focus:bg-white/30 transition-all shadow-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white" size={20} />
        </div>
        <div className="ml-auto flex flex-col items-end text-white z-10 shrink-0">
          <span className="text-[10px] font-black tracking-[0.3em] leading-none">QUẢN TRỊ VIÊN</span>
          <span className="text-[9px] font-bold opacity-80 leading-none mt-2 uppercase tracking-widest flex items-center gap-2">
            <Zap size={10} className="fill-current" /> Hệ thống Scanner Pro
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Users, label: 'NHÓM ĐÃ THAM GIA', val: groups.length.toString(), color: 'blue', badge: 'TỔNG CỘNG' },
          { icon: Database, label: 'THÀNH VIÊN CÓ SĐT', val: 'Kết nối thật', color: 'cyan', badge: 'REAL-TIME' },
          { icon: RefreshCw, label: 'LƯỢT QUÉT HÔM NAY', val: 'Active', color: 'purple', badge: 'ONLINE' }
        ].map((s, idx) => (
          <div key={idx} className={`${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100'} p-7 rounded-[32px] shadow-sm border transition-all hover:shadow-xl hover:-translate-y-1 group/stat`}>
             <div className="flex justify-between items-start">
               <div className={`p-4 rounded-2xl transition-transform group-hover/stat:scale-110 ${s.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : s.color === 'cyan' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-[#502b6e]/10 text-[#502b6e]'}`}><s.icon size={24} /></div>
               <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.color === 'blue' ? 'bg-blue-50 text-blue-600' : s.color === 'cyan' ? 'bg-cyan-50 text-cyan-600' : 'bg-green-50 text-green-600'}`}>{s.badge}</div>
             </div>
             <div className="mt-6">
               <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{s.label}</p>
               <p className={`text-3xl font-[1000] mt-1 tracking-tighter ${isDark ? 'text-white' : 'text-[#502b6e]'}`}>{s.val}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Group Table List */}
      <div className={`${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100'} rounded-[36px] shadow-sm border overflow-hidden`}>
        <div className="p-8 border-b border-gray-800/5 bg-gray-50/20 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-[#502b6e] tracking-tight uppercase">Danh sách Hội nhóm của bạn</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Chọn nhóm để bắt đầu quá trình trích xuất dữ liệu</p>
          </div>
        </div>
        <div className="divide-y divide-gray-800/5">
          {loading ? (
            <div className="p-24 flex flex-col items-center justify-center text-gray-300">
               <Loader2 className="animate-spin mb-4 text-[#3299D9]" size={40} />
               <span className="text-[11px] font-black uppercase tracking-[0.4em] opacity-40">Đang đồng bộ dữ liệu API...</span>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div key={group.id} className={`p-6 flex flex-col sm:flex-row items-center justify-between hover:${isDark ? 'bg-white/5' : 'bg-gray-50/50'} transition-all px-10 py-7 group/row`}>
                <div className="flex items-center gap-6 w-full sm:w-auto mb-6 sm:mb-0">
                   {group.avatar ? (
                     <div className="relative shrink-0">
                        <img src={group.avatar} alt={group.name} className="w-16 h-16 rounded-[24px] object-cover shadow-lg border-2 border-white/50 transform group-hover/row:scale-110 transition-transform" />
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-[#1A1A1A] rounded-full"></div>
                     </div>
                   ) : (
                     <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white text-2xl font-black shadow-xl bg-main-gradient transform group-hover/row:rotate-6 transition-transform`}>{group.name.charAt(0)}</div>
                   )}
                   <div>
                      <div className="flex items-center gap-3">
                        <h4 className={`font-black text-base uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#502b6e]'}`}>{group.name}</h4>
                        {group.type === 'channel' && <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-lg border border-blue-500/20">CHANNEL</span>}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                        <span className="flex items-center gap-1.5"><Users size={14} className="opacity-60" /> {group.memberCount?.toLocaleString()} thành viên</span>
                        <div className="w-1.5 h-1.5 bg-green-500/40 rounded-full"></div>
                        <span className="text-green-600/80">Sẵn sàng quét</span>
                      </div>
                   </div>
                </div>
                
                <button 
                  onClick={() => onStartScan(group)} 
                  className="group/btn relative flex items-center gap-4 px-10 py-4 bg-main-gradient text-white rounded-[22px] font-black text-[11px] uppercase tracking-[0.25em] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-purple-900/10 overflow-hidden w-full sm:w-auto justify-center"
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <Play size={16} fill="white" className="relative z-10" />
                  <span className="relative z-10">Bắt đầu quét</span>
                </button>
              </div>
            ))
          )}
          {!loading && filteredGroups.length === 0 && (
             <div className="p-20 text-center text-gray-400 uppercase font-black text-[10px] tracking-widest">
               Không tìm thấy nhóm hoặc kênh nào.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
