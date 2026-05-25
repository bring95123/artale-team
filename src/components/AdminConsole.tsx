import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { DiscordConfig, Profile } from '../types';
import JobIcon from './JobIcon';

interface AdminConsoleProps {
  appId: string;
  isAdminLoggedIn: boolean;
  setIsAdminLoggedIn: (login: boolean) => void;
  showAdminConsole: boolean;
  setShowAdminConsole: (show: boolean) => void;
  discordConfig: DiscordConfig;
  setDiscordConfig: (cfg: DiscordConfig) => void;
  handleResetConfig: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function AdminConsoleModal({
  appId,
  isAdminLoggedIn,
  setIsAdminLoggedIn,
  showAdminConsole,
  setShowAdminConsole,
  discordConfig,
  setDiscordConfig,
  handleResetConfig,
  showToast
}: AdminConsoleProps) {
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Snyc registered users in background
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const regUsersCol = collection(db, `artifacts/${appId}/public/data/registered_users`);
    const unsubscribe = onSnapshot(regUsersCol, (snapshot) => {
      const usersList: any[] = [];
      snapshot.forEach((docSnap) => {
        usersList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRegisteredUsers(usersList);
    }, (error) => {
      console.error("Failed to fetch registered users list:", error);
    });

    return () => unsubscribe();
  }, [appId, isAdminLoggedIn]);

  if (!showAdminConsole || !isAdminLoggedIn) return null;

  const handleDeleteUserProfile = async (targetUserId: string, targetIgn: string) => {
    if (confirm(`確定要刪除玩家 【${targetIgn}】 的所有身分角色卡嗎？此操作不可逆！`)) {
      try {
        const publicDocRef = doc(db, `artifacts/${appId}/public/data/registered_users/${targetUserId}`);
        await deleteDoc(publicDocRef);
        
        const privateDocRef = doc(db, `artifacts/${appId}/users/${targetUserId}/profile/info`);
        await deleteDoc(privateDocRef);

        showToast(`已成功刪除該玩家的所有角色檔案！`);
      } catch (err: any) {
        console.error(err);
        showToast(`刪除失敗: ${err.message}`, "error");
      }
    }
  };

  const handleSaveDiscordConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cfgRef = doc(db, `artifacts/${appId}/public/data/discord/config`);
      await setDoc(cfgRef, discordConfig);
      showToast("Discord 整合設定已儲存並全面啟用！");
    } catch (err: any) {
      showToast(`儲存失敗: ${err.message}`, "error");
    }
  };

  // Filter users based on query
  const filteredUsers = registeredUsers.filter(u => {
    const chars = u.characters || [{ ign: u.ign, job: u.job, level: u.level }];
    return chars.some((c: any) => 
      (c.ign || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.job || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative my-8">
        <button 
          type="button" 
          onClick={() => setShowAdminConsole(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
        >
          ✕
        </button>
        
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h3 className="text-xl font-extrabold text-amber-500 flex items-center space-x-2">
            <span>🔑 NyxShade 遠征隊管理者控制台</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">您好管理員，您可以在此管理全體註冊成員的名單 or 更動系統底層設定。</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left partition: member management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-200 flex items-center space-x-1.5">
                <span>👥 成員角色卡管理</span>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-normal font-mono">
                  {registeredUsers.length} 人已登錄
                </span>
              </h4>
            </div>

            {/* HIGH CONTRAST SEARCH INPUT */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 搜尋玩家 IGN 或職業..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none placeholder-slate-600 focus:border-indigo-505"
            />

            <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 font-semibold font-bold">
              {filteredUsers.length === 0 ? (
                <div className="text-center text-slate-600 text-xs italic py-10">
                  沒有找到符合搜尋條件的玩家角色卡
                </div>
              ) : (
                filteredUsers.map(u => {
                  const chars = u.characters || [{ ign: u.ign, job: u.job, level: u.level }];
                  const activeChar = chars[u.activeCharacterIndex || 0] || chars[0] || { ign: '未知', job: '未知', level: 120 };
                  return (
                    <div key={u.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 text-xs">👤 用戶身分 ({chars.length} 個角色)</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteUserProfile(u.userId || u.id, activeChar.ign)}
                          className="bg-rose-950/40 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-bold px-2.5 py-1 rounded-lg text-xs transition"
                        >
                          🗑️ 刪除全部角色卡
                        </button>
                      </div>

                      <div className="p-2 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-between gap-2 text-xs">
                        <span className="font-mono text-slate-400 select-all truncate text-[10px]">
                          🔑 帳號密鑰: <span className="text-amber-400 font-bold">{u.userId || u.id}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(u.userId || u.id);
                            showToast("已成功複製該隊員的帳號密鑰！");
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded border border-slate-700 transition shrink-0"
                        >
                          複製
                        </button>
                      </div>

                      <div className="space-y-1 pl-2 border-l border-slate-800">
                        {chars.map((c: any, cIdx: number) => (
                          <div key={cIdx} className="flex items-center justify-between text-xs py-1">
                            <span className={`font-semibold ${cIdx === (u.activeCharacterIndex || 0) ? 'text-emerald-400' : 'text-slate-400'} flex items-center space-x-1.5`}>
                              <span>•</span>
                              <JobIcon jobName={c.job} sizeClass="w-3.5 h-3.5" />
                              <span>{c.ign} ({c.job} Lv.{c.level}) {cIdx === (u.activeCharacterIndex || 0) && '🌟'}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right partition: system config details */}
          <div className="space-y-6">
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 font-semibold">
              <h4 className="font-extrabold text-sm text-indigo-400 flex items-center gap-1.5">
                <span>🛡️ Discord 登入整合設定</span>
              </h4>
              <p className="text-xs text-slate-550 leading-relaxed text-slate-400">
                設定專屬的 Discord 連線。推薦使用 <strong className="text-emerald-400">純前端免伺服器模式 (Implicit Grant)</strong>。
              </p>

              <form onSubmit={handleSaveDiscordConfig} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Discord Client ID</label>
                  {/* FIXED input background bg-slate-900 for dark mode readability */}
                  <input
                    type="text"
                    placeholder="貼上 Discord Portal 的 Client ID"
                    value={discordConfig?.clientId || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, clientId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">驗證模式</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDiscordConfig({ ...discordConfig, mode: 'implicit' })}
                      className={`flex-1 py-1.5 rounded border text-center font-bold text-[11px] ${discordConfig?.mode !== 'code' ? 'bg-indigo-650/30 border-indigo-500 text-indigo-200 shadow' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      純前端 (Implicit)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscordConfig({ ...discordConfig, mode: 'code' })}
                      className={`flex-1 py-1.5 rounded border text-center font-bold text-[11px] ${discordConfig?.mode === 'code' ? 'bg-indigo-650/30 border-indigo-500 text-indigo-200 shadow' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
                    >
                      進階後端 (Code)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">重新導向網址 (Redirect URI)</label>
                  <input
                    type="text"
                    placeholder="需與 Discord Portal 設定一致"
                    value={discordConfig?.redirectUri || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, redirectUri: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                {discordConfig?.mode === 'code' && (
                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">後端 API 換券端點 (Endpoint)</label>
                    <input
                      type="text"
                      placeholder="例如: https://my-backend.vercel.app/api/discord-login"
                      value={discordConfig?.apiEndpoint || ''}
                      onChange={(e) => setDiscordConfig({ ...discordConfig, apiEndpoint: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100"
                    />
                  </div>
                )}

                {/* Webhook panel */}
                <div className="border-t border-slate-800 pt-3 mt-3">
                  <label className="block text-amber-400 mb-1 font-black">Discord Webhook URL (發送廣播與 @標記)</label>
                  <input
                    type="text"
                    placeholder="在此貼上您 Discord 頻道的 Webhook 網址"
                    value={discordConfig?.webhookUrl || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, webhookUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none font-mono placeholder-slate-650"
                  />
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-[10px] text-slate-500 leading-relaxed font-bold">
                  <strong className="text-amber-500">📌 Webhook 廣播使用：</strong>
                  <p>填寫 Webhook 後，當確定出團時間或排班完成後即可一擊公告至 Discord！</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition active:scale-95"
                >
                  儲存 Discord 連線設定
                </button>
              </form>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-semibold font-bold">
              <h4 className="font-bold text-sm text-slate-200">⚠️ 資料庫與連線維護</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                如果您不小心更動或貼錯了 Firebase 的 Config 造成網頁連線死當，可以按下下方按鈕將其抹除。
              </p>
              
              <button
                type="button"
                onClick={handleResetConfig}
                className="w-full bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-350 font-bold py-2 rounded-xl text-xs transition h-10 border-dashed"
              >
                ⚠️ 移除並重置本網頁 Firebase 金鑰與快取
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 border-t border-slate-800 pt-3 mt-4 text-xs font-bold select-none">
          <button 
            type="button" 
            onClick={() => setShowAdminConsole(false)} 
            className="bg-slate-800 hover:bg-slate-750 px-4 py-2 rounded-xl text-slate-300 transition"
          >
            關閉後台
          </button>
        </div>

      </div>
    </div>
  );
}
