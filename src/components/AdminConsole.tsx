import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { DiscordConfig, Profile, AuthorizedAdmin } from '../types';
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
  authorizedAdmins?: AuthorizedAdmin[];
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
  showToast,
  authorizedAdmins: propAuthorizedAdmins
}: AdminConsoleProps) {
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [authorizedAdmins, setAuthorizedAdmins] = useState<AuthorizedAdmin[]>(propAuthorizedAdmins || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'admins' | 'discord' | 'webhooks' | 'system'>('members');

  // Authorized Admin form states
  const [newAdminIgn, setNewAdminIgn] = useState('');
  const [newAdminDcUsername, setNewAdminDcUsername] = useState('');
  const [newAdminDcId, setNewAdminDcId] = useState('');
  const [newAdminMemo, setNewAdminMemo] = useState('');

  // Sync authorized admins from Firestore
  useEffect(() => {
    if (!db) return;
    const adminsCol = collection(db, `artifacts/${appId}/public/data/authorized_admins`);
    const unsubscribe = onSnapshot(adminsCol, (snapshot) => {
      const list: AuthorizedAdmin[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as AuthorizedAdmin);
      });
      setAuthorizedAdmins(list);
    }, (error) => {
      console.error("Failed to fetch authorized admins:", error);
    });
    return () => unsubscribe();
  }, [appId]);

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

  const handleAddAuthorizedAdmin = async () => {
    if (!newAdminIgn.trim() && !newAdminDcUsername.trim() && !newAdminDcId.trim()) {
      showToast("請至少填寫 遊戲角色 ID (IGN) 或 Discord 帳號/ID！", "error");
      return;
    }

    const docId = `admin_${Date.now()}`;
    try {
      const adminRef = doc(db, `artifacts/${appId}/public/data/authorized_admins/${docId}`);
      await setDoc(adminRef, {
        id: docId,
        ign: newAdminIgn.trim(),
        discordUsername: newAdminDcUsername.trim(),
        discordId: newAdminDcId.trim(),
        memo: newAdminMemo.trim() || '授權管理員',
        grantedAt: new Date().toISOString()
      });

      setNewAdminIgn('');
      setNewAdminDcUsername('');
      setNewAdminDcId('');
      setNewAdminMemo('');
      showToast(`🎉 成功將 【${newAdminIgn.trim() || newAdminDcUsername.trim()}】 設為授權管理員！`);
    } catch (err: any) {
      showToast(`授權失敗: ${err.message}`, "error");
    }
  };

  const handleRemoveAuthorizedAdmin = async (adminId: string, ign: string) => {
    if (confirm(`確定要撤銷 【${ign || '該成員'}】 的管理員授權嗎？`)) {
      try {
        const adminRef = doc(db, `artifacts/${appId}/public/data/authorized_admins/${adminId}`);
        await deleteDoc(adminRef);
        showToast(`已撤銷 【${ign || '該成員'}】 的管理員權限！`);
      } catch (err: any) {
        showToast(`撤銷失敗: ${err.message}`, "error");
      }
    }
  };

  const handleSaveDiscordConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cfgRef = doc(db, `artifacts/${appId}/public/data/discord/config`);
      await setDoc(cfgRef, discordConfig);
      
      if (discordConfig?.publicKey) {
        try {
          await fetch('/api/discord/set-public-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicKey: discordConfig.publicKey })
          });
        } catch (syncErr) {
          console.warn("Failed to sync public key to backend:", syncErr);
        }
      }

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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 bg-slate-100 border border-slate-200 rounded-2xl mb-3.5 select-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'members' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>👥 成員</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'admins' ? 'bg-white text-amber-700 shadow-sm border border-amber-300' : 'text-slate-600 hover:text-amber-700'}`}
          >
            <span>👑 授權管理 ({authorizedAdmins.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discord')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'discord' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>🛡️ Bot</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'webhooks' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span>📢 廣播</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center justify-center space-x-1 py-1.5 sm:py-2 rounded-xl font-bold text-xs transition ${activeTab === 'system' ? 'bg-rose-50 text-rose-700 shadow-sm border border-rose-200' : 'text-slate-600 hover:text-rose-700'}`}
          >
            <span>⚠️ 維護</span>
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
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setNewAdminIgn(activeChar.ign || '');
                                setNewAdminDcUsername(u.discord?.username || '');
                                setNewAdminDcId(u.discord?.id || u.userId || '');
                                setActiveTab('admins');
                                showToast(`已帶入 【${activeChar.ign}】 資料，請點擊「確認新增授權」！`);
                              }}
                              className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer"
                            >
                              👑 帶入授權
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserProfile(u.userId || u.id, activeChar.ign)}
                              className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2 py-0.5 rounded-lg text-[11px] transition cursor-pointer"
                            >
                              🗑️ 刪除
                            </button>
                          </div>
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

          {/* Tab Content: authorized admins */}
          {activeTab === 'admins' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 font-medium">
              <div className="border-b border-slate-200 pb-2.5">
                <h4 className="font-extrabold text-sm text-amber-800 flex items-center gap-1.5">
                  <span>👑 授權管理員設定 (免密碼自動驗證)</span>
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  主控管理員 (Master Admin) 可將特定成員加入授權名單。被授權的隊員登入其遊戲 ID 或 Discord 時，<strong>系統將自動辨識其身分並賦予全功能管理權限，無需每次手動打密碼！</strong>
                </p>
              </div>

              {/* Form to add Authorized Admin */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 text-xs">
                <h5 className="font-bold text-slate-800 flex items-center gap-1 text-xs">
                  <span>➕ 新增授權管理員</span>
                </h5>

                {/* Quick select from registered users */}
                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-bold">
                    從已登錄的公會成員快速選取
                  </label>
                  <select
                    onChange={(e) => {
                      const uId = e.target.value;
                      if (!uId) return;
                      const target = registeredUsers.find(u => u.id === uId || u.userId === uId);
                      if (target) {
                        const chars = target.characters || [{ ign: target.ign }];
                        const mainChar = chars[target.activeCharacterIndex || 0] || chars[0];
                        setNewAdminIgn(mainChar?.ign || '');
                        setNewAdminDcUsername(target.discord?.username || '');
                        setNewAdminDcId(target.discord?.id || target.userId || '');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold"
                  >
                    <option value="">-- 點此展開選單帶入成員資料 --</option>
                    {registeredUsers.map(u => {
                      const chars = u.characters || [{ ign: u.ign, job: u.job }];
                      const mainChar = chars[u.activeCharacterIndex || 0] || chars[0];
                      return (
                        <option key={u.id} value={u.id}>
                          👤 {mainChar?.ign} ({mainChar?.job}) {u.discord ? `[@${u.discord.username}]` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 font-bold">
                      遊戲角色 ID (IGN) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="例如: 補夢網"
                      value={newAdminIgn}
                      onChange={(e) => setNewAdminIgn(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-600 mb-1 font-bold">
                      Discord 用戶名 / ID (選填)
                    </label>
                    <input
                      type="text"
                      placeholder="例如: dreamcatcher"
                      value={newAdminDcUsername}
                      onChange={(e) => setNewAdminDcUsername(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 mb-1 font-bold">
                    權限職稱 / 備註 (選填)
                  </label>
                  <input
                    type="text"
                    placeholder="例如: 副團長 / 一隊隊長 / 幹部"
                    value={newAdminMemo}
                    onChange={(e) => setNewAdminMemo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddAuthorizedAdmin}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2 rounded-xl text-xs transition shadow active:scale-95 cursor-pointer"
                >
                  👑 確認新增授權管理員
                </button>
              </div>

              {/* List of currently authorized admins */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-slate-800 flex items-center justify-between">
                  <span>🛡️ 目前授權管理員名單 ({authorizedAdmins.length})</span>
                </h5>

                {authorizedAdmins.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs italic py-6 bg-white p-3 rounded-xl border border-slate-200">
                    目前尚未新增任何授權管理員（主控管理員仍可透過預設密碼登入）
                  </div>
                ) : (
                  authorizedAdmins.map((admin) => (
                    <div key={admin.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
                            👑 {admin.ign || '未知 IGN'}
                          </span>
                          {admin.memo && (
                            <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold">
                              📌 {admin.memo}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono space-x-2">
                          {admin.discordUsername && <span>Discord: @{admin.discordUsername}</span>}
                          {admin.discordId && <span>ID: {admin.discordId}</span>}
                          {admin.grantedAt && <span>• {new Date(admin.grantedAt).toLocaleDateString()} 授權</span>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAuthorizedAdmin(admin.id, admin.ign)}
                        className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold px-2.5 py-1 rounded-lg transition shrink-0 active:scale-95 cursor-pointer"
                      >
                        🗑️ 撤銷
                      </button>
                    </div>
                  ))
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] text-slate-600 font-bold">
                          🔑 應用程式公開金鑰 (Public Key) <span className="text-amber-600">（必填以通過 Discord 驗證）</span>
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!discordConfig?.publicKey?.trim()) {
                              showToast("請先輸入 Public Key", "error");
                              return;
                            }
                            try {
                              const res = await fetch('/api/discord/set-public-key', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ publicKey: discordConfig.publicKey.trim() })
                              });
                              const data = await res.json();
                              if (data.success) {
                                showToast("✅ 公開金鑰已立即同步至伺服器！現在可前往 Discord 儲存 URL。");
                              }
                            } catch (e: any) {
                              showToast(`同步失敗: ${e.message}`, "error");
                            }
                          }}
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold transition-colors"
                        >
                          ⚡ 立即同步到伺服器
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="請貼上 Discord Portal ➔ 一般資訊 中的「公開金鑰 (Public Key)」 (64位字元)"
                        value={discordConfig?.publicKey || ''}
                        onChange={(e) => setDiscordConfig({ ...discordConfig, publicKey: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        貼上後點擊上方「⚡ 立即同步到伺服器」或左下角「💾 儲存設定」，即可立即在 Discord Portal 儲存 Interactions Endpoint URL。
                      </p>
                    </div>
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
                        placeholder="開啟 DC 開發者模式，在頻道右鍵複製 ID"
                        value={discordConfig?.botChannelId || ''}
                        onChange={(e) => setDiscordConfig({ ...discordConfig, botChannelId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none font-mono"
                      />
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-[10px] text-indigo-900 space-y-1">
                      <p className="font-extrabold text-indigo-700">⚡ Discord 互動按鈕報名 (Interactions URL):</p>
                      <p className="text-slate-600">如需在 DC 點按鈕彈出報名選單，請至 Discord Developer Portal ➔ General Information ➔ 填入：</p>
                      <code className="block bg-white p-1.5 rounded border border-indigo-200 font-mono text-indigo-700 select-all font-bold">
                        {typeof window !== 'undefined' ? `${window.location.origin}/api/discord/interactions` : '/api/discord/interactions'}
                      </code>
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
