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

  // Sync registered users in background
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

  const filteredUsers = registeredUsers.filter(u => {
    const chars = u.characters || [{ ign: u.ign, job: u.job, level: u.level }];
    return chars.some((c: any) => 
      (c.ign || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.job || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl relative my-4 flex flex-col max-h-[90vh]">
        <button 
          type="button" 
          onClick={() => setShowAdminConsole(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
        >
          ✕
        </button>
        
        <div className="border-b border-slate-100 pb-3 mb-3.5 shrink-0">
          <h3 className="text-lg sm:text-xl font-extrabold text-amber-700 flex items-center space-x-2">
            <span>🔑 管理者控制台</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">管理全體註冊成員的名單與系統設定。</p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-2xl mb-3.5 select-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'members' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>👥 成員管理</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'discord' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>🛡️ 連線及 Bot</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'webhooks' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>📢 廣播 Webhooks</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'system' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200' : 'text-slate-600 hover:text-rose-700'}`}
          >
            <span>⚠️ 系統維護</span>
          </button>
        </div>

        {/* Scrollable Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-3.5">
          
          {/* Tab Content: members */}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center space-x-1.5">
                  <span>👥 成員角色卡管理</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-mono border border-slate-200">
                    {registeredUsers.length} 人已登錄
                  </span>
                </h4>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 搜尋玩家 IGN 或職業..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-bold"
              />

              <div className="space-y-2.5">
                {filteredUsers.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs italic py-8 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    沒有找到符合搜尋條件的玩家角色卡
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const chars = u.characters || [{ ign: u.ign, job: u.job, level: u.level }];
                    const activeChar = chars[u.activeCharacterIndex || 0] || chars[0] || { ign: '未知', job: '未知', level: 120 };
                    return (
                      <div key={u.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-xs">👤 用戶身分 ({chars.length} 個角色)</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserProfile(u.userId || u.id, activeChar.ign)}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-lg text-[11px] transition"
                          >
                            🗑️ 刪除角色卡
                          </button>
                        </div>

                        <div className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono text-slate-500 select-all truncate text-[10px]">
                            🔑 帳號密鑰: <span className="text-amber-800 font-bold">{u.userId || u.id}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(u.userId || u.id);
                              showToast("已成功複製該隊員的帳號密鑰！");
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded border border-slate-200 transition shrink-0"
                          >
                            複製
                          </button>
                        </div>

                        <div className="space-y-1 pl-2 border-l-2 border-slate-200">
                          {chars.map((c: any, cIdx: number) => (
                            <div key={cIdx} className="flex items-center justify-between text-xs py-0.5">
                              <span className={`font-semibold ${cIdx === (u.activeCharacterIndex || 0) ? 'text-indigo-700' : 'text-slate-600'} flex items-center space-x-1.5`}>
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
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 font-medium">
              <h4 className="font-extrabold text-sm text-indigo-700 flex items-center gap-1.5">
                <span>🛡️ Discord 登入整合與 🤖 Bot 技術設定</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                設定註冊網頁成員對齊的 Discord 登入連線。推薦選用 <strong className="text-emerald-700">純前端免伺服器模式 (Implicit Grant)</strong>。
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Discord Client ID</label>
                  <input
                    type="text"
                    placeholder="貼上 Discord Developer Portal 的 Client ID"
                    value={discordConfig?.clientId || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, clientId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">驗證流程模式 (OAuth Mode)</label>
                  <div className="flex gap-2 p-1 bg-slate-200/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setDiscordConfig({ ...discordConfig, mode: 'implicit' })}
                      className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition ${discordConfig?.mode !== 'code' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    >
                      純前端 (Implicit)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscordConfig({ ...discordConfig, mode: 'code' })}
                      className={`flex-1 py-1.5 rounded-lg text-center font-bold text-xs transition ${discordConfig?.mode === 'code' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}
                    >
                      後端授權 (Code)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">重新導向網址 (Redirect URI)</label>
                  <input
                    type="text"
                    placeholder="需與 Discord Portal 的 Redirects 填入完全一致"
                    value={discordConfig?.redirectUri || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, redirectUri: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>

                {discordConfig?.mode === 'code' && (
                  <div>
                    <label className="block text-slate-700 mb-1 font-bold">後端 API 換券端點 (Callback Endpoint)</label>
                    <input
                      type="text"
                      placeholder="例如: https://my-backend.vercel.app/api/discord-login"
                      value={discordConfig?.apiEndpoint || ''}
                      onChange={(e) => setDiscordConfig({ ...discordConfig, apiEndpoint: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                )}

                {/* Bot Section */}
                <div className="border-t border-slate-200 pt-3 mt-3 space-y-2.5">
                  <label className="block text-indigo-700 font-black">🤖 Discord 機器人 (Bot) 設定 (創討論串小助手)</label>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    請至 Discord Portal 新建 Bot 並啟用 <strong>Message Content Intent</strong>。Bot 會在您發布排班表時，自動於目標文字頻道開闢專屬討論串。
                  </p>
                  
                  <div className="space-y-2.5 bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1 font-bold">小助手 Bot Token</label>
                      <input
                        type="password"
                        placeholder="請貼上 Bot Token"
                        value={discordConfig?.botToken || ''}
                        onChange={(e) => setDiscordConfig({ ...discordConfig, botToken: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-600 mb-1 font-bold">默認文字/論壇頻道 ID (Default Channel ID)</label>
                      <input
                        type="text"
                        placeholder="開起 DC 開發者模式，在頻道右鍵複製 ID"
                        value={discordConfig?.botChannelId || ''}
                        onChange={(e) => setDiscordConfig({ ...discordConfig, botChannelId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content: broadcast webhooks */}
          {activeTab === 'webhooks' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 font-medium">
              <h4 className="font-extrabold text-sm text-amber-800 flex items-center gap-1.5">
                <span>📢 Discord Webhook 廣播管道</span>
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                用於排班表更動通報、遊戲神殿抽籤回報、或是手動廣播通知至 DC 指定頻道。
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">主要廣播預設 Webhook URL</label>
                  <input
                    type="text"
                    placeholder="在此貼上主要 Discord 頻道的 Webhook 網址"
                    value={discordConfig?.webhookUrl || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, webhookUrl: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-rose-700 mb-1 font-bold">🐛 問題與功能建議回報 Webhook URL</label>
                  <input
                    type="text"
                    placeholder="在此貼上接收問題回報的專用 Discord Webhook (若留空則發送至主要頻道)"
                    value={discordConfig?.issueWebhookUrl || ''}
                    onChange={(e) => setDiscordConfig({ ...discordConfig, issueWebhookUrl: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none font-mono"
                  />
                </div>

                <div className="border-t border-slate-200 pt-3 mt-2">
                  <label className="block text-indigo-700 mb-1 font-black">🚀 自訂其它 Webhook 廣播頻道</label>
                  <p className="text-[10px] text-slate-500 mb-2">可自訂多個特定用途頻道 Webhook (例如 #抽籤頻道、#閒聊、#打寶回報)。</p>
                  
                  {/* Webhook channels list */}
                  <div className="space-y-1 max-h-[140px] overflow-y-auto mb-2.5 pr-1">
                    {(!discordConfig?.webhooks || discordConfig.webhooks.length === 0) ? (
                      <div className="text-[10px] text-slate-400 italic bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                        尚無設定其他自訂頻道 Webhook
                      </div>
                    ) : (
                      discordConfig.webhooks.map((wh) => (
                        <div key={wh.id} className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-slate-200 text-[11px]">
                          <div className="truncate flex-1">
                            <span className="font-bold text-amber-800 pr-1.5 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-amber-200">#{wh.name}</span>
                            <span className="font-mono text-slate-400 text-[9px] truncate">{wh.url}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteWebhook(wh.id)}
                            className="text-xs text-rose-600 hover:text-rose-800 font-bold px-1.5"
                            title="刪除此頻道"
                          >
                            🗑️
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Webhook Input Section */}
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                      <input
                        type="text"
                        placeholder="自訂頻道名 (如: #抽籤頻道)"
                        value={newWebhookName}
                        onChange={(e) => setNewWebhookName(e.target.value)}
                        className="sm:col-span-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="貼上完整 Webhook 網址"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        className="sm:col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddWebhook}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 py-1.5 rounded-lg text-xs font-bold transition"
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
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 font-medium">
              <h4 className="font-extrabold text-sm text-rose-700 flex items-center space-x-1.5">
                <span>⚠️ 本地資料庫與連線重設維護區</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                如果您後續更動了 Firebase 的系統配置造成連線失效，請點擊下方按鈕以主動清除當前瀏覽器的 Config 快取。
              </p>
              
              <button
                type="button"
                onClick={handleResetConfig}
                className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-extrabold py-3 rounded-xl text-xs transition shadow-sm active:scale-95 duration-100 cursor-pointer"
              >
                🚨 移除並重置本網頁 Firebase 金鑰與快取設定
              </button>
            </div>
          )}

        </div>

        {/* Persistent Modal Footer Actions Panel */}
        <div className="flex justify-between items-center border-t border-slate-100 pt-3.5 mt-3 text-xs font-bold select-none shrink-0">
          <div>
            {(activeTab === 'discord' || activeTab === 'webhooks') && (
              <button
                type="button"
                onClick={handleSaveDiscordConfig}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition shadow-sm active:scale-95 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <span>💾 儲存設定</span>
              </button>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setShowAdminConsole(false)} 
            className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-slate-700 transition font-bold cursor-pointer"
          >
            關閉
          </button>
        </div>

      </div>
    </div>
  );
}
