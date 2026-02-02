
import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Search, ExternalLink, Phone, RefreshCw, 
  Loader2, Copy, Check, Square, History, Zap, Terminal, UserSearch, UserCheck, AlertTriangle, ChevronRight
} from 'lucide-react';
import { ScanResult, Theme, TelegramGroup, TelegramMember } from '../types';

interface ResultsProps {
  results: ScanResult[];
  theme: Theme;
  onScanComplete: (result: ScanResult) => void;
  pendingScanGroup: TelegramGroup | null;
  client?: any;
}

const Results: React.FC<ResultsProps> = ({ 
  results, 
  theme, 
  onScanComplete, 
  pendingScanGroup,
  client
}) => {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(
    results.length > 0 ? results[0].timestamp : null
  );
  const [memberFilter, setMemberFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState<'idle' | 'fetching' | 'inspecting'>('idle');
  const [scanProgress, setScanProgress] = useState(0); 
  const [totalToScan, setTotalToScan] = useState(0);
  const [liveMembers, setLiveMembers] = useState<TelegramMember[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [onlyShowWithPhone, setOnlyShowWithPhone] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const logEndRef = useRef<HTMLDivElement>(null);
  const scanLoopRef = useRef<boolean>(true);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const icon = type === 'success' ? '✔ ' : type === 'error' ? '✘ ' : '• ';
    setLogs(prev => [...prev.slice(-25), `[${new Date().toLocaleTimeString()}] ${icon}${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (pendingScanGroup) {
      handleStartNewScan(pendingScanGroup);
    }
  }, [pendingScanGroup]);

  const handleStartNewScan = async (group: TelegramGroup) => {
    setLiveMembers([]);
    setScanProgress(0);
    setTotalToScan(group.memberCount || 0);
    setLogs([]);
    await startTwoStageScan(group);
  };

  const startTwoStageScan = async (group: TelegramGroup) => {
    if (!client) {
      addLog("Lỗi: Kết nối Telegram chưa sẵn sàng", 'error');
      return;
    }
    setIsScanning(true);
    scanLoopRef.current = true;
    
    const api = (window as any).telegram.Api;
    const memberMap = new Map<string, TelegramMember>();
    const allFoundBasicUsers: any[] = [];

    try {
      // --- GIAI ĐOẠN 1: CUỘN TẢI DANH SÁCH THÀNH VIÊN ---
      setScanStage('fetching');
      addLog(`Giai đoạn 1: Đang cuộn lấy danh sách thành viên từ ${group.name}...`);
      
      const entity = await client.getEntity(group.id);
      
      if (entity.className === 'Chat') {
        const fullChat = await client.invoke(new api.messages.GetFullChat({ chatId: entity.id }));
        allFoundBasicUsers.push(...fullChat.users);
        setScanProgress(allFoundBasicUsers.length);
      } else {
        const inputChannel = await client.getInputEntity(entity);
        let offset = 0;
        const limit = 100;

        while (scanLoopRef.current) {
          const result = await client.invoke(new api.channels.GetParticipants({
            channel: inputChannel,
            filter: new api.ChannelParticipantsRecent(),
            offset: offset,
            limit: limit,
            hash: 0n
          }));
          
          const users = result.users || [];
          if (users.length === 0) break;

          allFoundBasicUsers.push(...users);
          setScanProgress(allFoundBasicUsers.length);
          addLog(`Đã cuộn được ${allFoundBasicUsers.length} người...`);
          
          offset += users.length;
          if (users.length < limit) break;
          
          await new Promise(r => setTimeout(r, 200)); // Delay nhỏ để cuộn mượt
        }
      }

      addLog(`Xong Giai đoạn 1. Đã lấy ${allFoundBasicUsers.length} ID.`, 'success');

      // --- GIAI ĐOẠN 2: KIỂM TRA HỒ SƠ THỦ CÔNG (DEEP SCAN) ---
      if (!scanLoopRef.current) throw new Error("Quét đã bị dừng");

      setScanStage('inspecting');
      setTotalToScan(allFoundBasicUsers.length);
      setScanProgress(0);
      addLog(`Giai đoạn 2: Bắt đầu truy cập profile từng người để tìm SĐT...`);

      for (let i = 0; i < allFoundBasicUsers.length; i++) {
        if (!scanLoopRef.current) break;
        
        const user = allFoundBasicUsers[i];
        const userId = user.id.toString();
        
        try {
          // Lấy SĐT từ object ban đầu nếu có (thường hiếm khi có ngay)
          let phone = user.phone || user.phoneNumber || null;
          
          // NẾU CHƯA CÓ, THỰC HIỆN TRUY CẬP HỒ SƠ CHI TIẾT
          if (!phone) {
            // Sửa lỗi casting: Luôn dùng getInputEntity cho user ID
            const inputUser = await client.getInputEntity(user.id);
            const fullUser = await client.invoke(new api.users.GetFullUser({
              id: inputUser
            }));
            
            const detailed = fullUser.users[0];
            phone = detailed?.phone || detailed?.phoneNumber || null;
          }

          const member: TelegramMember = {
            id: userId,
            username: user.username || "",
            firstName: user.firstName || "User",
            lastName: user.lastName || "",
            phoneNumber: phone || undefined,
            isPublicPhone: !!phone,
            joinDate: new Date().toISOString(),
            hasReacted: false,
            hasMessaged: false,
          };

          memberMap.set(userId, member);
          setLiveMembers(Array.from(memberMap.values()));
          setScanProgress(i + 1);

          if (phone) {
            addLog(`TÌM THẤY SĐT: ${member.firstName} -> ${phone}`, 'success');
          }

          // RẤT QUAN TRỌNG: Telegram có giới hạn tần suất (Rate Limit)
          // Để trốn FloodWait, chúng ta cần delay khoảng 300-800ms mỗi profile
          const dynamicDelay = allFoundBasicUsers.length > 500 ? 1000 : 350;
          await new Promise(r => setTimeout(r, dynamicDelay));

        } catch (err: any) {
          if (err.message.includes('FLOOD_WAIT')) {
            const seconds = parseInt(err.message.match(/\d+/) || "30");
            addLog(`FloodWait: Telegram yêu cầu chờ ${seconds}s...`, 'error');
            await new Promise(r => setTimeout(r, (seconds + 1) * 1000));
            i--; // Quay lại check lại user này
          } else {
            console.error(`Lỗi profile ${userId}:`, err);
          }
        }
      }

      addLog("HOÀN TẤT: Toàn bộ thành viên đã được soát hồ sơ!", 'success');
      
      const finalResult: ScanResult = {
        groupId: group.id,
        groupName: group.name,
        timestamp: new Date().toISOString(),
        members: Array.from(memberMap.values()),
        totalInGroup: allFoundBasicUsers.length
      };
      
      onScanComplete(finalResult);
      setSelectedResultId(finalResult.timestamp);

    } catch (error: any) {
      addLog(`Lỗi quét: ${error.message}`, 'error');
    } finally {
      setIsScanning(false);
      setScanStage('idle');
    }
  };

  const stopScan = () => {
    scanLoopRef.current = false;
    addLog("Đang dừng quét... dữ liệu đã lấy sẽ được lưu lại.");
  };

  const currentResult = isScanning 
    ? { groupName: pendingScanGroup?.name || '', members: liveMembers }
    : results.find(r => r.timestamp === selectedResultId);

  const displayMembers = (currentResult?.members || []).filter(m => {
    const term = memberFilter.toLowerCase();
    const matches = m.username.toLowerCase().includes(term) ||
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      (m.phoneNumber && m.phoneNumber.includes(term));
    
    return onlyShowWithPhone ? (matches && m.isPublicPhone) : matches;
  });

  const progressPercent = totalToScan > 0 ? Math.round((scanProgress / totalToScan) * 100) : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full pb-10">
      {/* Sidebar: Nhật ký & Lịch sử */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
        <div className="bg-[#0A0A0B] rounded-[32px] p-5 border border-white/5 shadow-2xl flex-1 flex flex-col min-h-[300px]">
          <div className="flex items-center gap-2 mb-4 text-blue-400">
            <Terminal size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Tiến trình thực tế</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-2">
            {logs.map((log, i) => (
              <div key={i} className={`pl-3 border-l-2 ${log.includes('✔') ? 'border-green-500 text-green-400' : log.includes('✘') ? 'border-red-500 text-red-400' : 'border-blue-500/30 text-blue-300/80'}`}>
                {log}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-widest px-2 flex items-center gap-2">
            <History size={14} /> Phiên quét trước đó
          </h3>
          <div className="max-h-[250px] overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {results.map((res) => (
              <button key={res.timestamp} disabled={isScanning} onClick={() => setSelectedResultId(res.timestamp)}
                className={`w-full text-left p-4 rounded-[22px] transition-all border ${selectedResultId === res.timestamp 
                  ? 'bg-main-gradient text-white border-transparent shadow-lg' 
                  : isDark ? 'bg-[#1A1A1A] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'}`}
              >
                <p className="font-black text-[10px] truncate uppercase">{res.groupName}</p>
                <div className="flex justify-between items-center mt-2 opacity-60 text-[8px] font-bold">
                  <span>{res.members.filter(m => m.isPublicPhone).length} SĐT</span>
                  <span>{new Date(res.timestamp).toLocaleTimeString()}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vùng hiển thị kết quả chính */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Header trạng thái quét 2 bước */}
        <div className={`${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} p-8 rounded-[40px] border relative overflow-hidden group`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="flex-1 min-w-0">
              <h2 className={`text-2xl font-[1000] uppercase tracking-tighter truncate leading-tight ${isDark ? 'text-white' : 'text-[#502b6e]'}`}>
                {currentResult?.groupName || "Phòng chờ quét"}
              </h2>
              
              <div className="flex flex-wrap items-center gap-4 mt-4">
                {isScanning ? (
                  <div className={`flex items-center gap-3 px-5 py-2 rounded-2xl border ${scanStage === 'fetching' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-purple-500/10 border-purple-500/20 text-purple-500'}`}>
                    {scanStage === 'fetching' ? <UserSearch size={16} className="animate-pulse" /> : <UserCheck size={16} />}
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      {scanStage === 'fetching' ? `B1: Cuộn lấy danh sách (${scanProgress})` : `B2: Soát hồ sơ (${scanProgress}/${totalToScan})`}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-600">
                    <Zap size={14} className="fill-current" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Sẵn sàng trích xuất</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600">
                  <Phone size={14} />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    {currentResult?.members.filter(m => m.isPublicPhone).length || 0} SĐT công khai
                  </span>
                </div>
              </div>

              {isScanning && (
                <div className="mt-6">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Tiến độ quy trình</span>
                    <span className={`text-sm font-black ${scanStage === 'fetching' ? 'text-blue-500' : 'text-purple-500'}`}>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner p-0.5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 shadow-lg ${scanStage === 'fetching' ? 'bg-blue-500' : 'bg-main-gradient'}`}
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="w-full h-full bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {isScanning ? (
                <button onClick={stopScan} className="w-14 h-14 flex items-center justify-center bg-red-500 text-white rounded-2xl shadow-xl hover:scale-105 transition-all">
                  <Square size={24} fill="white" />
                </button>
              ) : (
                <button onClick={() => pendingScanGroup && handleStartNewScan(pendingScanGroup)} disabled={!pendingScanGroup} className="w-14 h-14 flex items-center justify-center bg-[#3299D9] text-white rounded-2xl shadow-xl disabled:opacity-20 hover:scale-105 transition-all">
                  <RefreshCw size={24} />
                </button>
              )}
              <button 
                onClick={() => {
                  const withPhone = currentResult?.members.filter(m => m.isPublicPhone) || [];
                  const headers = ['Họ', 'Tên', 'SĐT', 'Username'];
                  const rows = withPhone.map(m => [m.lastName, m.firstName, m.phoneNumber, `@${m.username}`]);
                  const csv = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
                  const link = document.createElement("a");
                  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                  link.download = `TELE_DATA_${Date.now()}.csv`;
                  link.click();
                }} 
                disabled={!currentResult || currentResult.members.filter(m => m.isPublicPhone).length === 0} 
                className="w-14 h-14 flex items-center justify-center bg-emerald-600 text-white rounded-2xl shadow-xl disabled:opacity-20 hover:scale-105 transition-all"
              >
                <Download size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Lọc & Bảng */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm tên, username hoặc số điện thoại..." 
              className={`w-full pl-14 pr-6 py-4 rounded-3xl border text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 ${isDark ? 'bg-[#1A1A1A] border-gray-800 text-white' : 'bg-white border-gray-100'}`}
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setOnlyShowWithPhone(!onlyShowWithPhone)}
            className={`px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest transition-all border ${onlyShowWithPhone ? 'bg-[#502b6e] text-white border-transparent shadow-lg scale-105' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}
          >
            {onlyShowWithPhone ? 'Đang hiện SĐT công khai' : 'Hiện tất cả thành viên'}
          </button>
        </div>

        <div className={`flex-1 rounded-[40px] border overflow-hidden flex flex-col min-h-[450px] ${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100'}`}>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className={`${isDark ? 'bg-[#252526]' : 'bg-gray-50'} sticky top-0 z-20`}>
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thành viên</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin liên hệ</th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tài khoản</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/5">
                {displayMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-500/5 transition-all">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-md ${m.isPublicPhone ? 'bg-main-gradient' : 'bg-gray-400'}`}>
                          {m.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-[#502b6e]'}`}>{m.firstName} {m.lastName}</p>
                          <p className="text-[9px] text-gray-400 font-bold font-mono mt-1 opacity-60">ID: {m.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {m.phoneNumber ? (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(m.phoneNumber!);
                            setCopiedPhone(m.phoneNumber!);
                            setTimeout(() => setCopiedPhone(null), 2000);
                          }}
                          className={`group flex items-center gap-3 px-5 py-2.5 rounded-2xl border font-mono text-xs font-black transition-all ${copiedPhone === m.phoneNumber ? 'bg-green-600 text-white border-transparent' : 'bg-green-500/5 text-green-600 border-green-500/20 hover:bg-green-500/10'}`}
                        >
                          <Phone size={14} className={copiedPhone === m.phoneNumber ? 'animate-bounce' : ''} />
                          {m.phoneNumber}
                          {copiedPhone === m.phoneNumber ? <Check size={14} /> : <Copy size={12} className="opacity-0 group-hover:opacity-100 ml-2" />}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-300 opacity-40">
                          <AlertTriangle size={12} />
                          <span className="text-[10px] font-bold uppercase italic">Chế độ riêng tư</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {m.username ? (
                        <a href={`https://t.me/${m.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/5 text-blue-500 rounded-xl text-xs font-black hover:bg-blue-500/10 transition-colors">
                          @{m.username} <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {displayMembers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-8 py-32 text-center">
                       {isScanning ? (
                         <div className="flex flex-col items-center">
                           <Loader2 size={48} className="animate-spin text-blue-500 mb-6" />
                           <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Đang thực hiện quy trình soát hồ sơ sâu...</p>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center opacity-10">
                           <Search size={64} className="mb-4" />
                           <p className="text-sm font-black uppercase tracking-widest">Không có dữ liệu hiển thị</p>
                         </div>
                       )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Results;
