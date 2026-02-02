
import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, 
  Search, 
  ExternalLink, 
  Phone,
  RefreshCw,
  MessageSquare,
  Smile,
  Loader2,
  Copy,
  Check,
  Square,
  Play,
  History,
  Zap
} from 'lucide-react';
import { ScanResult, Theme, TelegramGroup, TelegramMember } from '../types';
import { simulateScan } from '../services/geminiService';

interface ResultsProps {
  results: ScanResult[];
  theme: Theme;
  onScanComplete: (result: ScanResult) => void;
  pendingScanGroup: TelegramGroup | null;
  onCancelPending: () => void;
}

const Results: React.FC<ResultsProps> = ({ 
  results, 
  theme, 
  onScanComplete, 
  pendingScanGroup
}) => {
  const [selectedResultId, setSelectedResultId] = useState<string | null>(
    results.length > 0 ? results[0].timestamp : null
  );
  const [memberFilter, setMemberFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0); 
  const [maxScanTarget, setMaxScanTarget] = useState(0);
  const [liveMembers, setLiveMembers] = useState<TelegramMember[]>([]);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [filterRecent60, setFilterRecent60] = useState(false);
  const [filterActivity, setFilterActivity] = useState(false);

  const isDark = theme === 'dark';
  const tableEndRef = useRef<HTMLDivElement>(null);
  const scanLoopRef = useRef<boolean>(true);

  // Tự động cuộn khi có dữ liệu mới
  useEffect(() => {
    if (isScanning && tableEndRef.current) {
      tableEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveMembers.length, isScanning]);

  useEffect(() => {
    if (pendingScanGroup) {
      setSelectedResultId(null);
      handleStartNewScan(pendingScanGroup);
    }
  }, [pendingScanGroup]);

  useEffect(() => {
    if (!selectedResultId && results.length > 0 && !isScanning) {
      setSelectedResultId(results[0].timestamp);
    }
  }, [results, isScanning]);

  const handleStartNewScan = async (group: TelegramGroup) => {
    setLiveMembers([]);
    setScanProgress(0);
    await handleContinuousScan(group, []);
  };

  const handleContinuousScan = async (group: TelegramGroup, currentMembers: TelegramMember[]) => {
    setIsScanning(true);
    scanLoopRef.current = true;
    
    const previousScan = results.find(r => r.groupId === group.id);
    const existingIds = new Set([
      ...(previousScan?.members.map(m => m.id) || []),
      ...(currentMembers.map(m => m.id))
    ]);
    
    const total = group.memberCount;
    setMaxScanTarget(total);
    
    let scannedCount = scanProgress || 0;
    let foundThisSession = [...currentMembers];

    try {
      while (scannedCount < total && scanLoopRef.current) {
        // Mô phỏng độ trễ quét thực tế
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (!scanLoopRef.current) break;

        const batch = await simulateScan(group.name, {
          recentlyJoined: filterRecent60,
          recentlyActive: filterActivity,
          messagedInGroup: true
        });

        const newPublicOnes = batch.filter(m => m.isPublicPhone && !existingIds.has(m.id));

        if (newPublicOnes.length > 0) {
          newPublicOnes.forEach(m => existingIds.add(m.id));
          foundThisSession = [...foundThisSession, ...newPublicOnes];
          setLiveMembers([...foundThisSession]);
        }

        scannedCount += batch.length;
        setScanProgress(Math.min(scannedCount, total));
        
        // Giới hạn mô phỏng mỗi lần 500 thành viên để tránh treo
        if (scannedCount >= 500) break; 
      }

      const finalResultMembers = previousScan 
        ? [...previousScan.members, ...foundThisSession.filter(m => !previousScan.members.some(pm => pm.id === m.id))]
        : foundThisSession;

      const newResult: ScanResult = {
        groupId: group.id,
        groupName: group.name,
        timestamp: new Date().toISOString(),
        members: finalResultMembers,
        totalInGroup: total
      };
      
      onScanComplete(newResult);
      setSelectedResultId(newResult.timestamp);
    } catch (error) {
      console.error("Lỗi quá trình quét:", error);
    } finally {
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    scanLoopRef.current = false;
  };

  const continueScan = () => {
    const currentGroup = results.find(r => r.timestamp === selectedResultId) || pendingScanGroup;
    if (currentGroup) {
      const groupData: TelegramGroup = {
        id: ('groupId' in currentGroup) ? (currentGroup as any).groupId : (currentGroup as TelegramGroup).id,
        name: (currentGroup as any).groupName || (currentGroup as any).name,
        memberCount: (currentGroup as any).totalInGroup || (currentGroup as any).memberCount,
        type: 'supergroup'
      };
      handleContinuousScan(groupData, liveMembers.length > 0 ? liveMembers : (currentResult?.members || []));
    }
  };

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const currentResult = isScanning 
    ? { groupName: pendingScanGroup?.name || '', members: liveMembers, totalInGroup: maxScanTarget }
    : results.find(r => r.timestamp === selectedResultId);

  const filteredMembers = currentResult?.members.filter(m => {
    const term = memberFilter.toLowerCase();
    const matchesSearch = m.username.toLowerCase().includes(term) ||
      m.firstName.toLowerCase().includes(term) ||
      m.lastName.toLowerCase().includes(term) ||
      (m.phoneNumber && m.phoneNumber.includes(term));
    return matchesSearch;
  }) || [];

  const handleExport = () => {
    if (!currentResult) return;
    const headers = ['Họ và Tên', 'Số điện thoại', 'Username', 'Ngày tham gia'];
    const rows = filteredMembers.map(m => [
      `${m.firstName} ${m.lastName}`, 
      m.phoneNumber || '', 
      `@${m.username}`, 
      new Date(m.joinDate).toLocaleDateString('vi-VN')
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `DANH_SACH_${currentResult.groupName.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  const progressPercent = maxScanTarget > 0 ? (scanProgress / maxScanTarget) * 100 : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full pb-10 animate-in fade-in duration-500">
      {/* Sidebar Lịch sử */}
      <div className="w-full lg:w-72 shrink-0 space-y-4">
        <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-widest flex items-center px-2">
          <History size={14} className="mr-2" /> Lịch sử hoạt động
        </h3>
        <div className="space-y-3 max-h-[40vh] lg:max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar pr-1">
          {results.length === 0 && !isScanning && (
            <div className="text-[10px] font-bold text-gray-400 p-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl uppercase tracking-widest">
              Trống
            </div>
          )}
          {results.map((res) => (
            <button
              key={res.timestamp}
              disabled={isScanning}
              onClick={() => { setSelectedResultId(res.timestamp); setScanProgress(0); setLiveMembers([]); }}
              className={`w-full text-left p-4 rounded-[24px] transition-all border ${selectedResultId === res.timestamp 
                ? 'bg-main-gradient text-white border-transparent shadow-xl scale-[1.02]' 
                : isDark ? 'bg-[#1A1A1A] border-gray-800 text-gray-400' : 'bg-white border-gray-100 text-[#502b6e] hover:border-blue-200 hover:shadow-md'}
                ${isScanning ? 'opacity-40 grayscale pointer-events-none' : ''}`}
            >
              <h4 className="font-black text-xs truncate uppercase tracking-tight">{res.groupName}</h4>
              <div className="flex justify-between items-center mt-2 opacity-80">
                <span className="text-[9px] font-black"><Phone size={8} className="inline mr-1" /> {res.members.length} SĐT</span>
                <span className="text-[8px] font-bold">{new Date(res.timestamp).toLocaleDateString('vi-VN')}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {/* Header - Thiết kế sang trọng */}
        <div className={`${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.03)]'} p-8 rounded-[36px] border relative overflow-hidden group`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="min-w-0 flex-1">
              <h2 className={`text-3xl font-[1000] uppercase tracking-tighter truncate leading-tight ${isDark ? 'text-white' : 'text-[#502b6e]'}`}>
                {currentResult?.groupName || "Hệ thống Telegram Scanner"}
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <div className="px-4 py-1.5 bg-green-500/10 rounded-full border border-green-500/20 flex items-center gap-2">
                  <Zap size={12} className="text-green-600 fill-current" />
                  <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                    {currentResult?.members.length.toLocaleString()} số công khai
                  </span>
                </div>
                {isScanning && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20 animate-pulse">
                    <Loader2 size={10} className="text-blue-600 animate-spin" />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Đang trích xuất dữ liệu...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cụm Action Buttons - Modern Colors */}
            <div className="flex items-center gap-3 p-2.5 bg-gray-50/50 dark:bg-white/5 backdrop-blur-md rounded-[26px] border border-gray-200/50 dark:border-white/10 shadow-inner shrink-0">
              {isScanning ? (
                <button 
                  onClick={stopScan}
                  className="w-12 h-12 flex items-center justify-center bg-gradient-to-tr from-rose-500 to-pink-400 text-white rounded-2xl shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all"
                  title="Dừng quét"
                >
                  <Square size={20} fill="white" />
                </button>
              ) : (
                <button 
                  onClick={continueScan}
                  className="w-12 h-12 flex items-center justify-center bg-gradient-to-tr from-[#3299D9] to-cyan-400 text-white rounded-2xl shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                  title={scanProgress > 0 ? "Tiếp tục quét" : "Bắt đầu quét"}
                >
                  {scanProgress > 0 ? <Play size={20} fill="white" /> : <RefreshCw size={20} />}
                </button>
              )}
              <button 
                onClick={handleExport}
                disabled={!currentResult || currentResult.members.length === 0}
                className="w-12 h-12 flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-400 text-white rounded-2xl shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                title="Xuất Excel/CSV"
              >
                <Download size={22} />
              </button>
            </div>
          </div>

          {/* Progress Section - Beautiful & Functional */}
          <div className="mt-10 space-y-4">
            <div className="flex justify-between items-end">
               <div className="space-y-1">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Tình trạng phân tích</p>
                 <p className={`text-2xl font-black ${isScanning ? 'text-blue-500' : isDark ? 'text-white' : 'text-gray-800'}`}>
                   {Math.round(progressPercent)}% <span className="text-[10px] font-bold text-gray-400 ml-1 uppercase">HOÀN THÀNH</span>
                 </p>
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Thành viên</p>
                 <p className="text-xs font-black uppercase text-gray-500 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-gray-200/30">
                   {scanProgress.toLocaleString()} / {maxScanTarget.toLocaleString()}
                 </p>
               </div>
            </div>
            
            <div className="w-full h-5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden p-1.5 border border-gray-200/50 dark:border-white/10 relative shadow-inner">
              <div 
                className="h-full bg-main-gradient rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_20px_rgba(230,57,122,0.4)]"
                style={{ width: `${progressPercent}%` }}
              >
                {isScanning && (
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite] -translate-x-full"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className={`w-full pl-12 pr-6 py-4 ${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100 shadow-sm'} border rounded-[22px] text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400 placeholder:font-medium`}
              placeholder="Tìm kiếm theo Tên, Số điện thoại hoặc Username..."
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2.5">
            <button 
              onClick={() => setFilterRecent60(!filterRecent60)}
              className={`px-6 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest border transition-all ${filterRecent60 ? 'bg-[#502b6e] text-white border-[#502b6e] shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}
            >
              Mới tham gia
            </button>
            <button 
              onClick={() => setFilterActivity(!filterActivity)}
              className={`px-6 py-4 rounded-[20px] text-[10px] font-black uppercase tracking-widest border transition-all ${filterActivity ? 'bg-[#502b6e] text-white border-[#502b6e] shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-purple-200'}`}
            >
              Hay tương tác
            </button>
          </div>
        </div>

        {/* Data List - Bố cục chuẩn & Hiển thị mượt */}
        <div className={`${isDark ? 'bg-[#1A1A1A] border-gray-800' : 'bg-white border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.02)]'} rounded-[36px] border overflow-hidden flex-1 flex flex-col min-h-[550px]`}>
          <div className="overflow-x-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className={`${isDark ? 'bg-gray-800/40' : 'bg-gray-50/80'} sticky top-0 z-20 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800`}>
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800/5">Hội viên</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800/5">Số điện thoại</th>
                  <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800/5">Telegram ID</th>
                  <th className="px-8 py-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-800/5">Hành vi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/5">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all group animate-in slide-in-from-bottom-3 duration-300">
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-white dark:border-gray-800 transform group-hover:scale-110 group-hover:rotate-3 transition-all bg-gray-100 shrink-0">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-main-gradient flex items-center justify-center font-black text-white text-xs uppercase">
                                {member.firstName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#502b6e]'}`}>
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">Ngày gia nhập: {new Date(member.joinDate).toLocaleDateString('vi-VN')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <button 
                          onClick={() => member.phoneNumber && handleCopyPhone(member.phoneNumber)}
                          className={`group/copy relative px-4 py-2 rounded-xl text-[11px] font-black font-mono border transition-all flex items-center gap-3 ${copiedPhone === member.phoneNumber ? 'bg-green-600 border-green-600 text-white shadow-lg' : isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100'}`}
                        >
                          {member.phoneNumber}
                          {copiedPhone === member.phoneNumber ? <Check size={12} /> : <Copy size={12} className="opacity-40 group-hover/copy:opacity-100 transition-opacity" />}
                          {copiedPhone === member.phoneNumber && (
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-3 py-1.5 rounded-lg font-black shadow-xl z-30 animate-in fade-in slide-in-from-bottom-2">ĐÃ SAO CHÉP</span>
                          )}
                        </button>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <a href={`https://t.me/${member.username}`} target="_blank" rel="noreferrer" className={`text-xs font-black flex items-center gap-2 ${isDark ? 'text-blue-400' : 'text-blue-600'} hover:underline group/link`}>
                          @{member.username}
                          <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      </td>
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-3">
                          {member.hasMessaged && <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl" title="Có tham gia trò chuyện"><MessageSquare size={14} /></div>}
                          {member.hasReacted && <div className="p-2.5 bg-yellow-500/10 text-yellow-600 rounded-xl" title="Có thả cảm xúc tin nhắn"><Smile size={14} /></div>}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-32 text-center">
                      <div className="flex flex-col items-center justify-center opacity-30 group/none">
                        {isScanning ? (
                          <div className="relative">
                            <Loader2 size={56} className="animate-spin text-blue-500 mb-6" />
                            <div className="absolute inset-0 bg-blue-400 blur-3xl opacity-20 animate-pulse"></div>
                          </div>
                        ) : (
                          <Search size={56} className="mb-6 text-gray-400 group-hover/none:scale-110 transition-transform duration-500" />
                        )}
                        <p className="text-[11px] font-black uppercase tracking-[0.4em]">{isScanning ? 'Đang giải mã dữ liệu nhóm...' : 'Không tìm thấy kết quả phù hợp'}</p>
                      </div>
                    </td>
                  </tr>
                )}
                <div ref={tableEndRef} />
              </tbody>
            </table>
          </div>
          
          <div className={`px-8 py-5 ${isDark ? 'bg-gray-800/20' : 'bg-gray-50/50'} border-t border-gray-800/5 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Hiển thị {filteredMembers.length} thành viên trích xuất
            </div>
            {isScanning && <div className="text-blue-500 flex items-center gap-2 animate-pulse"><Loader2 size={12} className="animate-spin" /> QUÁ TRÌNH THỰC THI THỜI GIAN THỰC...</div>}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer { 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );
};

export default Results;
