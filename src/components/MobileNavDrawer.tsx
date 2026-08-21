import React, { useState } from 'react';
import JobIcon from './JobIcon';

interface Character {
  ign: string;
  job: string;
  level?: number;
  gearScore?: number;
}

interface Profile {
  activeCharacterIndex: number;
  characters: Character[];
}

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  activeCharacter: Character;
  discordUser: any;
  lobbyTab: 'recruitment' | 'gacha' | 'drop_table';
  setLobbyTab: (tab: 'recruitment' | 'gacha' | 'drop_table') => void;
  raids: any[];
  myScheduleRaids: any[];
  bosses: any[];
  currentRaidId: string | null;
  setCurrentRaidId: (id: string | null) => void;
  isAdminLoggedIn: boolean;
  setIsCreating: (val: boolean) => void;
  setShowProfileModal: (val: boolean) => void;
  setShowBossManagerModal: (val: boolean) => void;
  setShowJobManagerModal: (val: boolean) => void;
  setShowPWAModal: (val: boolean) => void;
  setShowIssueReportModal: (val: boolean) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  dbStatus: string;
  onSwitchCharacter: (idx: number) => void;
  onOpenAdminSecret?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  activeCharacter,
  discordUser,
  lobbyTab,
  setLobbyTab,
  raids,
  myScheduleRaids,
  bosses,
  currentRaidId,
  setCurrentRaidId,
  isAdminLoggedIn,
  setIsCreating,
  setShowProfileModal,
  setShowBossManagerModal,
  setShowJobManagerModal,
  setShowPWAModal,
  setShowIssueReportModal,
  theme,
  setTheme,
  dbStatus,
  onSwitchCharacter,
  onOpenAdminSecret,
}) => {
  // Accordion state for expandable categories
  const [isRaidsExpanded, setIsRaidsExpanded] = useState(true);
  const [isMyRaidsExpanded, setIsMyRaidsExpanded] = useState(true);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = useState(true);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  if (!isOpen) return null;

  const navigateToTab = (tab: 'recruitment' | 'gacha' | 'drop_table') => {
    setCurrentRaidId(null);
    setLobbyTab(tab);
    onClose();
  };

  const navigateToRaid = (raidId: string) => {
    setCurrentRaidId(raidId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 left-0 max-w-[85vw] w-80 bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <span className="text-2xl">🍁</span>
            <div>
              <h2 className="text-base font-black bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent leading-tight">
                NyxShade 選單
              </h2>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {dbStatus === 'connected' && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>多端同步在線</span>
                  </span>
                )}
                {dbStatus === 'connecting' && (
                  <span className="text-[10px] text-amber-400 font-bold">⏳ 連線中</span>
                )}
                {dbStatus === 'error' && (
                  <span className="text-[10px] text-rose-400 font-bold">⚠️ 連線異常</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            title="關閉選單"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">

          {/* User Profile Card Widget */}
          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3.5 shadow-inner">
            <div className="flex items-center space-x-3 mb-2.5">
              {discordUser ? (
                <img 
                  src={discordUser.avatar} 
                  className="w-10 h-10 rounded-full border-2 border-[#5865F2] object-cover shrink-0 shadow" 
                  alt="Discord"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                  🍁
                </div>
              )}
              <div className="min-w-0 flex-1">
                {activeCharacter && activeCharacter.ign ? (
                  <>
                    <div className="flex items-center space-x-1.5">
                      <JobIcon jobName={activeCharacter.job} sizeClass="w-4 h-4 shrink-0" />
                      <span className="font-black text-slate-100 text-sm truncate">
                        {activeCharacter.ign}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400/90 font-mono font-bold block mt-0.5">
                      {activeCharacter.job} {activeCharacter.level ? `Lv.${activeCharacter.level}` : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-slate-300 text-xs">尚未設定角色卡</div>
                    <span className="text-[10px] text-slate-500">點擊下方按鈕設定身分</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Character Switcher if multiple characters exist */}
            {profile.characters && profile.characters.length > 1 && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-850">
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  🔄 快速切換出團身分：
                </label>
                <select
                  value={profile.activeCharacterIndex}
                  onChange={(e) => onSwitchCharacter(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 transition cursor-pointer"
                >
                  {profile.characters.map((c, i) => (
                    <option key={i} value={i} className="bg-slate-900 font-bold text-slate-200">
                      {c.ign} ({c.job})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowProfileModal(true);
                onClose();
              }}
              className="mt-2.5 w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>⚙️</span>
              <span>管理角色卡 / Discord</span>
            </button>
          </div>

          {/* SECTION 1: 報名遠征隊 & 出團日程 */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setIsRaidsExpanded(!isRaidsExpanded)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-400 px-2 py-1 select-none hover:text-slate-200 transition"
            >
              <span className="flex items-center space-x-1.5">
                <span>⚔️</span>
                <span>遠征隊組隊與出團</span>
              </span>
              <span className="text-[10px]">{isRaidsExpanded ? '▼' : '▶'}</span>
            </button>

            {isRaidsExpanded && (
              <div className="space-y-1 pl-1">
                {/* 1.1 招募大廳 (全部遠征) */}
                <button
                  type="button"
                  onClick={() => navigateToTab('recruitment')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    lobbyTab === 'recruitment' && !currentRaidId
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 !text-white shadow-md'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>📢</span>
                    <span>遠征招募大廳 (全部)</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    lobbyTab === 'recruitment' && !currentRaidId
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-850 text-slate-400'
                  }`}>
                    {raids.length} 團
                  </span>
                </button>

                {/* 1.2 次項目：已報名遠征隊 (我的出團) */}
                <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-2 space-y-1.5">
                  <div 
                    onClick={() => setIsMyRaidsExpanded(!isMyRaidsExpanded)}
                    className="flex items-center justify-between text-[11px] font-bold text-amber-400 px-1 py-0.5 cursor-pointer"
                  >
                    <span className="flex items-center space-x-1.5">
                      <span>📅</span>
                      <span>已報名 / 我的出團</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-full font-mono">
                      {myScheduleRaids.length}
                    </span>
                  </div>

                  {isMyRaidsExpanded && (
                    <div className="space-y-1 pt-1">
                      {myScheduleRaids.length === 0 ? (
                        <p className="text-[11px] text-slate-500 px-2 py-1 italic">
                          目前尚未報名任何進行中的遠征隊
                        </p>
                      ) : (
                        myScheduleRaids.map((r) => {
                          const rBoss = bosses.find((b: any) => b.id === r.bossId);
                          const isSelected = currentRaidId === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => navigateToRaid(r.id)}
                              className={`w-full text-left p-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 !text-white shadow'
                                  : 'bg-slate-900/90 hover:bg-slate-850 text-slate-300 border border-slate-800'
                              }`}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="truncate text-[11px]">
                                  {rBoss?.icon || '👹'} {r.title}
                                </div>
                                <span className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  {r.mode === 'interest' ? '意願調查中' : typeof r.finalTimeIndex === 'number' ? '⏰ 時間已定' : '投票中'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">➜</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* 1.3 發起全新遠征隊 (Admin only) */}
                {isAdminLoggedIn && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(true);
                      onClose();
                    }}
                    className="w-full flex items-center space-x-2 p-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-600/80 to-orange-600/80 hover:from-amber-600 hover:to-orange-600 text-white shadow transition cursor-pointer"
                  >
                    <span>➕</span>
                    <span>發起全新遠征隊 (團長)</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: 獨立功能頁面 */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-400 px-2 py-1 select-none hover:text-slate-200 transition"
            >
              <span className="flex items-center space-x-1.5">
                <span>✨</span>
                <span>特色功能與資料庫</span>
              </span>
              <span className="text-[10px]">{isFeaturesExpanded ? '▼' : '▶'}</span>
            </button>

            {isFeaturesExpanded && (
              <div className="space-y-1 pl-1">
                {/* 2.1 幸運神社 */}
                <button
                  type="button"
                  onClick={() => navigateToTab('gacha')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    lobbyTab === 'gacha' && !currentRaidId
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 !text-white shadow-md'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>🔮</span>
                    <span>幸運神社 (祈願/轉盤)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    每日運勢
                  </span>
                </button>

                {/* 2.2 掉落物查詢 */}
                <button
                  type="button"
                  onClick={() => navigateToTab('drop_table')}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    lobbyTab === 'drop_table' && !currentRaidId
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 !text-white shadow-md'
                      : 'bg-slate-950/70 hover:bg-slate-800 text-slate-200 border border-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>📦</span>
                    <span>Artale 掉落物資料庫</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    防破版縮放
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3: 系統設置與管理 */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className="w-full flex items-center justify-between text-xs font-black text-slate-400 px-2 py-1 select-none hover:text-slate-200 transition"
            >
              <span className="flex items-center space-x-1.5">
                <span>🛠️</span>
                <span>系統工具與管理</span>
              </span>
              <span className="text-[10px]">{isSettingsExpanded ? '▼' : '▶'}</span>
            </button>

            {isSettingsExpanded && (
              <div className="space-y-1 pl-1">
                {isAdminLoggedIn && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBossManagerModal(true);
                        onClose();
                      }}
                      className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-800 text-violet-300 border border-violet-500/30 transition cursor-pointer"
                    >
                      <span>👾</span>
                      <span>自訂 Boss 首領設置</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowJobManagerModal(true);
                        onClose();
                      }}
                      className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-800 text-teal-300 border border-teal-500/30 transition cursor-pointer"
                    >
                      <span>⚔️</span>
                      <span>自訂職業清單管理</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowPWAModal(true);
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 transition cursor-pointer"
                >
                  <span>📲</span>
                  <span>安裝 NyxShade App (PWA)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowIssueReportModal(true);
                    onClose();
                  }}
                  className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-800 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                >
                  <span>🐛</span>
                  <span>問題與意見回報 (Discord)</span>
                </button>

                {onOpenAdminSecret && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAdminSecret();
                      onClose();
                    }}
                    className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
                  >
                    <span>🔑</span>
                    <span>團長密碼與金鑰登入</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              const nextTheme = theme === 'dark' ? 'light' : 'dark';
              setTheme(nextTheme);
            }}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 transition cursor-pointer"
          >
            <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span>{theme === 'dark' ? '切換淺色' : '切換暗色'}</span>
          </button>

          <span className="text-[10px] text-slate-500 font-mono">
            NyxShade v2.5
          </span>
        </div>

      </div>
    </div>
  );
};
