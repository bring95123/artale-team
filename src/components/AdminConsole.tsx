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
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'discord' | 'webhooks' | 'system'>('members');

  const handleAddWebhook = () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      showToast("請填寫 Webhook 頻道名稱和位址！", "error");
      return;
    }
    if (!newWebhookUrl.trim().startsWith("https://")) {
      showToast("Webhook 網址必須以 https:// 開頭！", "error");
      return;
    }
    const currentWebhooks = discordConfig.webhooks || [];
    const updatedWebhooks = [
      ...currentWebhooks,
      {
        id: Date.now().toString(),
        name: newWebhookName.trim(),
        url: newWebhookUrl.trim()
      }
    ];
    setDiscordConfig({
      ...discordConfig,
      webhooks: updatedWebhooks
    });
    setNewWebhookName('');
    setNewWebhookUrl('');
    showToast("成功載入該頻道！請記得點選下方「儲存 Discord 連線設定」！");
  };

  const handleDeleteWebhook = (id: string) => {
    const currentWebhooks = discordConfig.webhooks || [];
    const updatedWebhooks = currentWebhooks.filter(w => w.id !== id);
    setDiscordConfig({
      ...discordConfig,
      webhooks: updatedWebhooks
    });
    showToast("已移除該 Webhook！請記得點選下方「儲存 Discord 連線設定」！");
  };

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
      <div className="bg-slate-900 border border-slate-750 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative my-4 flex flex-col max-h-[85vh]">
        <button 
          type="button" 
          onClick={() => setShowAdminConsole(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
        >
          ✕
        </button>
        
        <div className="border-b border-slate-800 pb-3 mb-4 shrink-0">
          <h3 className="text-xl font-extrabold text-amber-500 flex items-center space-x-2 animate-pulse">
            <span>🔑 NyxShade 遠征隊管理者控制台</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">您好管理員，您可以在此管理全體註冊成員的名單 or 更動系統底層設定。</p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl mb-4 select-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center justify-center space-x-1 py-2 rounded-xl font-bold text-xs transition duration-150 ${activeTab === 'members' ? 'bg-indigo-600 text-white shadow' : 'bg-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
          >
            <span>👥 成員管理</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`flex items-center justify-center space-x-1 py-2 rounded-xl font-bold text-xs transition duration-150 ${activeTab === 'discord' ? 'bg-indigo-600 text-white shadow' : 'bg-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
          >
            <span>🛡️ 連線及 Bot</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center justify-center space-x-1 py-2 rounded-xl font-bold text-xs transition duration-150 ${activeTab === 'webhooks' ? 'bg-indigo-600 text-white shadow' : 'bg-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'}`}
          >
            <span>📢 廣播 Webhooks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center justify-center space-x-1 py-2 rounded-xl font-bold text-xs transition duration-150 ${activeTab === 'system' ? 'bg-rose-800 text-white shadow' : 'bg-transparent text-slate-400 hover:bg-slate-900/50 hover:text-rose-400'}`}
          >
            <span>⚠️ 系統與維護</span>
          </button>
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1.5 min-h-0 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
          
          {/* Tab Content: members */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-200 flex items-center space-x-1.5">
                  <span>👥 成員角色卡管理</span>
                  <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-normal font-mono">
                    {registeredUsers.length} 人已登錄
                  </span>
                </h4>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 搜尋玩家 IGN 或職業..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-bold"
              />

              <div className="space-y-3 font-semibold font-bold">
                {filteredUsers.length === 0 ? (
                  <div className="text-center text-slate-600 text-xs italic py-10 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                    沒有找到符合搜尋條件的玩家角色卡
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const chars = u.characters || [{ ign: u.ign, job: u.job, level: u.level }];
                    const activeChar = chars[u.activeCharacterIndex || 0] || chars[0] || { ign: '未知', job: '未知', level: 120 };
                    return (
                      <div key={u.id} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300 text-xs">👤 用戶身分 ({chars.length} 個角色)</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserProfile(u.userId || u.id, activeChar.ign)}
                            className="bg-rose-950/40 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-bold px-2.5 py-1 rounded-lg text-[11px] transition"
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
          )}

          {/* Tab Content: discord config */}
          {activeTab === 'discord' && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 font-semibold">
              <h4 className="font-extrabold text-sm text-indigo-400 flex items-center gap-1.5">
                <span>🛡️ Discord 登入整合與 🤖 Bot 技術設定</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                設定註冊網頁成員對齊的 Discord 登入連線。推薦選用 <strong className="text-emerald-400">純前端免伺服器模式 (Implicit Grant)</strong>。
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">Discord Client ID</label>
                  <input
                    type="text"
                    placeholder="貼上 Discord Developer Portal 的 Client ID"
                    value={discordConfig?.clientId || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, clientId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">驗證流程模式 (OAuth Mode)</label>
                  <div className="flex gap-2 p-1 bg-slate-900/50 border border-slate-800/80 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setDiscordConfig({ ...discordConfig, mode: 'implicit' })}
                      className={`flex-1 py-2 rounded-xl text-center font-bold text-xs transition duration-150 ${discordConfig?.mode !== 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                      純前端 (Implicit)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscordConfig({ ...discordConfig, mode: 'code' })}
                      className={`flex-1 py-2 rounded-xl text-center font-bold text-xs transition duration-150 ${discordConfig?.mode === 'code' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                      後端授權 (Code)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">重新導向網址 (Redirect URI)</label>
                  <input
                    type="text"
                    placeholder="需與 Discord Portal 的 Redirects 填入完全一致"
                    value={discordConfig?.redirectUri || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, redirectUri: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>

                {discordConfig?.mode === 'code' && (
                  <div>
                    <label className="block text-slate-300 mb-1.5 font-bold">後端 API 換券端點 (Callback Endpoint)</label>
                    <input
                      type="text"
                      placeholder="例如: https://my-backend.vercel.app/api/discord-login"
                      value={discordConfig?.apiEndpoint || ''}
                      onChange={(e) => setDiscordConfig({ ...discordConfig, apiEndpoint: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                )}

                {/* Bot Section */}
                <div className="border-t border-slate-800 pt-4 mt-4 space-y-3">
                  <label className="block text-indigo-400 mb-1.5 font-black">🤖 Discord 機器人 (Bot) 設定 (創討論串小助手)</label>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    請至 Discord Portal 新建 Bot 並啟用 <strong>Message Content Intent</strong>。Bot 會在您發布排班表時，自動於目標文字或論壇頻道為大家開闢專屬討論串，並自動 mention 連動成員。
                  </p>
                  
                  <div className="space-y-3 bg-slate-900 p-3 rounded-2xl border border-slate-850">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">小助手 Bot Token</label>
                      <input
                        type="password"
                        placeholder="請貼上 Bot Token"
                        value={discordConfig?.botToken || ''}
                        onChange={(e) => setDiscordConfig({ ...discordConfig, botToken: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-150 focus:outline-none font-mono placeholder-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 font-bold">默認文字/論壇頻道 ID (Default Channel ID)</label>
                      <input
                        type="text"
                        placeholder="開起 DC 開發者模式，在頻道右鍵複製 ID"
                        value={discordConfig?.botChannelId || ''}
                        onChange={(e) => setDiscordConfig({ ...discordConfig, botChannelId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none font-mono placeholder-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: broadcast webhooks */}
          {activeTab === 'webhooks' && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 font-semibold">
              <h4 className="font-extrabold text-sm text-amber-500 flex items-center gap-1.5">
                <span>📢 Discord Webhook 廣播及訊息傳送管道</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                用於排班表更動通報、遊戲神殿抽籤回報、或是手動廣播通知至 DC 指定頻道。
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-amber-400 mb-1.5 font-bold">主要廣播預設 Webhook URL</label>
                  <input
                    type="text"
                    placeholder="在此貼上您主要 Discord 頻道的 Webhook 網址"
                    value={discordConfig?.webhookUrl || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, webhookUrl: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none font-mono placeholder-slate-700"
                  />
                </div>

                <div className="border-t border-slate-800 pt-4 mt-2">
                  <label className="block text-indigo-400 mb-1 font-black">🚀 自訂其它 Webhook 廣播頻道</label>
                  <p className="text-[10px] text-slate-400 mb-2">可自訂多個特定用途頻道 Webhook (例如 #求籤頻道、#閒聊、#打寶回報)，玩家抽籤完即可靈活選擇丟至指定頻道！</p>
                  
                  {/* Webhook channels list */}
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto mb-3 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
                    {(!discordConfig?.webhooks || discordConfig.webhooks.length === 0) ? (
                      <div className="text-[10px] text-slate-500 italic bg-slate-905 p-3 rounded-xl border border-slate-850 text-center">
                        尚無設定其他自訂頻道 Webhook
                      </div>
                    ) : (
                      discordConfig.webhooks.map((wh) => (
                        <div key={wh.id} className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                          <div className="truncate flex-1">
                            <span className="font-bold text-amber-500 pr-1.5 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">#{wh.name}</span>
                            <span className="font-mono text-slate-400 text-[9px] truncate">{wh.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="text-xs text-rose-455 hover:text-rose-400 font-bold px-1.5"
                            title="刪除此頻道"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Webhook Input Section */}
                  <div className="bg-slate-900/40 p-2.5 rounded-2xl border border-dashed border-slate-800 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="自訂頻道名 (如: #抽籤頻道)"
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        className="col-span-1 bg-slate-900 border border-slate-880 border-slate-800 rounded-lg px-2 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="貼上完整 Webhook 網址"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="col-span-2 bg-slate-900 border border-slate-880 border-slate-800 rounded-lg px-2 text-xs font-mono text-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWebhook}
                      className="w-full bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 py-1.5 rounded-lg text-[10.5px] font-bold transition"
                    >
                      ➕ 暫存並加入自訂清單
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: system settings */}
          {activeTab === 'system' && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 font-semibold font-bold">
              <h4 className="font-extrabold text-sm text-rose-400 flex items-center space-x-1.5 leading-relaxed">
                <span>⚠️ 本地資料庫與連線重設維護區</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                本區屬於<strong>安全重設與重置功能</strong>。如果您後續因為不小心貼錯或更動了 Firebase 的系統 Config 配置，造成連線失效、卡死白屏或載入異常時，請點擊下方按鈕以主動清除當前瀏覽器的 Config 金鑰，將其恢復為初始原廠出發。
              </p>
              
              <button
                type="button"
                onClick={handleResetConfig}
                className="w-full bg-rose-950/55 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-extrabold py-3.5 rounded-xl text-xs transition border-dashed shadow-md active:scale-95 duration-100"
              >
                🚨 移除並重置本網頁 Firebase 金鑰與快取設定
              </button>
            </div>
          )}

        </div>

        {/* Persistent Modal Footer Actions Panel */}
        <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-4 text-xs font-bold select-none shrink-0">
          <div>
            {(activeTab === 'discord' || activeTab === 'webhooks') && (
              <button
                type="button"
                onClick={handleSaveDiscordConfig}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition shadow active:scale-95 duration-150 font-bold flex items-center space-x-1"
              >
                <span>💾 儲存 Discord 連線設定</span>
              </button>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setShowAdminConsole(false)} 
            className="bg-slate-800 hover:bg-slate-750 px-5 py-2.5 rounded-xl text-slate-300 transition duration-150 font-bold"
          >
            關閉管理台
          </button>
        </div>

      </div>
    </div>
  );
}
