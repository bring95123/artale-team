import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  Profile, 
  Character, 
  DiscordUser, 
  DiscordConfig, 
  Boss, 
  BOSS_EMOJIS_LIST, 
  BOSS_GRADIENTS_PRESETS 
} from '../types';
import JobIcon from './JobIcon';

// ==========================================
// 1. Profile Modal
// ==========================================
interface ProfileModalProps {
  appId: string;
  customUid: string;
  discordUser: DiscordUser | null;
  discordConfig: DiscordConfig | null;
  jobCategories: { [category: string]: { [tier: string]: string[] } };
  profile: Profile;
  setProfile: (p: Profile) => void;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
  getDiscordLoginUrl: () => string;
  handleDisconnectDiscord: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  raids?: any[];
}

export function ProfileModal({
  appId,
  customUid,
  discordUser,
  discordConfig,
  jobCategories,
  profile,
  setProfile,
  showProfileModal,
  setShowProfileModal,
  getDiscordLoginUrl,
  handleDisconnectDiscord,
  showToast,
  raids
}: ProfileModalProps) {
  const [tempCharacters, setTempCharacters] = useState<Character[]>([]);
  const [tempActiveIndex, setTempActiveIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (showProfileModal) {
      if (profile.characters && profile.characters.length > 0) {
        setTempCharacters(JSON.parse(JSON.stringify(profile.characters)));
        setTempActiveIndex(profile.activeCharacterIndex);
      } else {
        setTempCharacters([{ ign: '', job: '主教', level: 120, memo: '' }]);
        setTempActiveIndex(0);
      }
    }
  }, [showProfileModal, profile]);

  if (!showProfileModal) return null;

  const findJobCategoryAndTier = (jobName: string) => {
    for (const [category, tiers] of Object.entries(jobCategories)) {
      if (tiers && typeof tiers === 'object' && !Array.isArray(tiers)) {
        for (const [tier, jobs] of Object.entries(tiers)) {
          if (jobs && Array.isArray(jobs) && jobs.includes(jobName)) {
            return { category, tier };
          }
        }
      }
    }
    return { category: '法師', tier: '4轉' };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordUser) {
      showToast("⚠️ 請先點擊上方按鈕連結 Discord 帳號才能儲存角色卡！", "error");
      return;
    }

    const hasEmptyIgn = tempCharacters.some(c => !c.ign.trim());
    if (hasEmptyIgn) {
      showToast("所有角色的 遊戲 ID (IGN) 均不可為空！", "error");
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        activeCharacterIndex: tempActiveIndex,
        characters: tempCharacters.map(c => ({
          ign: c.ign.trim(),
          job: c.job,
          level: Number(c.level) || 120,
          memo: (c.memo || '').trim()
        })),
        discord: discordUser || null
      };

      const profileRef = doc(db, `artifacts/${appId}/users/${customUid}/profile/info`);
      await setDoc(profileRef, profileData);

      const publicRef = doc(db, `artifacts/${appId}/public/data/registered_users/${customUid}`);
      await setDoc(publicRef, {
        userId: customUid,
        ...profileData,
        updatedAt: new Date().toISOString()
      });

      if (raids && raids.length > 0) {
        const activeChar = profileData.characters[profileData.activeCharacterIndex] || profileData.characters[0];
        if (activeChar) {
          for (const r of raids) {
            let needsUpdate = false;
            let updatedVotes = r.votes ? [...r.votes] : [];
            let updatedParticipants = r.participants ? [...r.participants] : [];

            updatedVotes = updatedVotes.map((v: any) => {
              if (v.userId === customUid) {
                needsUpdate = true;
                return {
                  ...v,
                  ign: activeChar.ign,
                  job: activeChar.job,
                  level: activeChar.level,
                  memo: activeChar.memo,
                  discord: discordUser || null
                };
              }
              return v;
            });

            updatedParticipants = updatedParticipants.map((p: any) => {
              if (p.userId === customUid) {
                needsUpdate = true;
                return {
                  ...p,
                  ign: activeChar.ign,
                  job: activeChar.job,
                  level: activeChar.level,
                  memo: activeChar.memo,
                  discord: discordUser || null
                };
              }
              return p;
            });

            if (needsUpdate) {
              const rRef = doc(db, `artifacts/${appId}/public/data/raids/${r.id}`);
              await updateDoc(rRef, {
                votes: updatedVotes,
                participants: updatedParticipants
              });
            }
          }
        }
      }

      setProfile(profileData);
      setShowProfileModal(false);
      showToast("角色身分檔案更新成功！");
    } catch (err: any) {
      console.error(err);
      showToast(`儲存失敗: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl relative my-4 flex flex-col max-h-[90vh]">
        <button 
          type="button"
          onClick={() => setShowProfileModal(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
        >
          ✕
        </button>
        
        <div className="border-b border-slate-100 pb-3 mb-3.5 shrink-0">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center space-x-2">
            <span>⚙️ 設定遊戲角色身分卡</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            登錄多個遊戲身分。連結 Discord 帳號，角色卡與出團紀錄自動雲端備份漫遊！
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* Discord Bind panel */}
          <div>
            {discordUser ? (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-2xl">
                <div className="flex items-center space-x-3 min-w-0">
                  <img 
                    src={discordUser.avatar} 
                    className="w-10 h-10 rounded-full border-2 border-[#5865F2] object-cover shrink-0" 
                    alt="Discord Avatar"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded font-black block w-max select-none">
                      🟢 已啟用 Discord 雲端備份
                    </span>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 truncate">@{discordUser.username}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectDiscord}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl transition active:scale-95 shrink-0 cursor-pointer"
                >
                  解除連結
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2.5">
                <h4 className="text-xs sm:text-sm font-black text-slate-800">連結 Discord 以漫遊保存進度</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  連結後，更換裝置或清除快取只要透過 Discord 登入即可一秒還原角色卡！
                </p>
                <div>
                  {discordConfig?.clientId ? (
                    <a
                      href={getDiscordLoginUrl()}
                      className="inline-flex items-center justify-center space-x-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold px-5 py-2.5 rounded-xl transition shadow-sm text-xs w-full sm:w-auto"
                    >
                      <span>⚡ 連結 Discord 帳號</span>
                    </a>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      請在底部「管理者控制台」先完成 Discord Client ID 配置方能啟用。
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Character forms */}
          <div className="relative">
            {!discordUser && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-4 border border-slate-200">
                <span className="text-3xl mb-1.5">🔒</span>
                <h4 className="text-sm font-black text-amber-800">出團角色卡已鎖定</h4>
                <p className="text-xs text-slate-600 max-w-sm mt-1 leading-relaxed">
                  系統已啟用 Discord 綁定。<br />
                  請先點擊上方按鈕完成 <strong className="text-indigo-700">Discord 連結認證</strong> 即可解鎖角色卡！
                </p>
              </div>
            )}

            <div className={`space-y-3 font-medium transition-all ${!discordUser ? 'blur-sm pointer-events-none opacity-40 select-none' : ''}`}>
              {tempCharacters.map((char, index) => {
                const derived = findJobCategoryAndTier(char.job);
                const currentCategory = derived.category;
                const currentTier = derived.tier;
                const catObj = jobCategories[currentCategory] || {};
                const availableJobs = (catObj && typeof catObj === 'object' && !Array.isArray(catObj))
                  ? (catObj[currentTier] || [])
                  : [];

                return (
                  <div key={index} className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="activeCharacter"
                          checked={tempActiveIndex === index}
                          onChange={() => setTempActiveIndex(index)}
                          className="text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        />
                        <span className="flex items-center space-x-1.5">
                          <JobIcon jobName={char.job} sizeClass="w-3.5 h-3.5" />
                          <span className={`text-xs sm:text-sm font-extrabold ${tempActiveIndex === index ? 'text-indigo-700' : 'text-slate-600'}`}>
                            {tempActiveIndex === index ? '🟢 當前出團主身分' : '設為當前出團身分'}
                          </span>
                        </span>
                      </label>

                      {tempCharacters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tempCharacters.filter((_, i) => i !== index);
                            setTempCharacters(updated);
                            if (tempActiveIndex >= updated.length) {
                              setTempActiveIndex(0);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                        >
                          🗑️ 移除此角色
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">遊戲 ID (IGN)</label>
                        <input
                          type="text"
                          required
                          value={char.ign}
                          onChange={(e) => {
                            const updated = [...tempCharacters];
                            updated[index].ign = e.target.value;
                            setTempCharacters(updated);
                          }}
                          placeholder="例: 夜影狂刀"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">等級 (Level)</label>
                        <input
                          type="number"
                          required
                          min={1}
                          max={200}
                          value={char.level}
                          onChange={(e) => {
                            const updated = [...tempCharacters];
                            updated[index].level = Number(e.target.value);
                            setTempCharacters(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">職業 (Job)</label>
                        <select
                          value={char.job}
                          onChange={(e) => {
                            const updated = [...tempCharacters];
                            updated[index].job = e.target.value;
                            setTempCharacters(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                        >
                          {Object.entries(jobCategories).map(([catName, tiers]) => {
                            const isNested = tiers && typeof tiers === 'object' && !Array.isArray(tiers);
                            if (isNested) {
                              return (
                                <optgroup key={catName} label={`=== ${catName} ===`}>
                                  {Object.entries(tiers as Record<string, string[]>).map(([tierName, jobList]) => (
                                    jobList.map(j => (
                                      <option key={j} value={j}>{tierName} - {j}</option>
                                    ))
                                  ))}
                                </optgroup>
                              );
                            }
                            return (
                              <optgroup key={catName} label={`=== ${catName} ===`}>
                                {(tiers as string[]).map(j => (
                                  <option key={j} value={j}>{j}</option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">備註說明 (選填)</label>
                      <input
                        type="text"
                        value={char.memo || ''}
                        onChange={(e) => {
                          const updated = [...tempCharacters];
                          updated[index].memo = e.target.value;
                          setTempCharacters(updated);
                        }}
                        placeholder="例: 有楓葉祝福20、極速領域滿"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setTempCharacters([...tempCharacters, { ign: '', job: '主教', level: 120, memo: '' }]);
                }}
                className="w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl text-xs font-bold text-slate-600 hover:text-indigo-700 bg-slate-50 hover:bg-indigo-50/50 transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>➕ 新增另一個遊戲分身角色</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3 text-xs font-bold select-none shrink-0">
          <button 
            type="button" 
            onClick={() => setShowProfileModal(false)} 
            className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-slate-700 transition cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !discordUser}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-2 rounded-xl transition shadow-sm font-bold flex items-center space-x-1 cursor-pointer"
          >
            {isSaving ? <span>儲存中...</span> : <span>💾 儲存角色卡</span>}
          </button>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 2. Boss Manager Modal
// ==========================================
interface BossManagerProps {
  appId: string;
  customBossesList: Boss[];
  showBossManagerModal: boolean;
  setShowBossManagerModal: (show: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  bosses?: any;
  setBosses?: any;
}

export function BossManagerModal({
  appId,
  customBossesList,
  showBossManagerModal,
  setShowBossManagerModal,
  showToast
}: BossManagerProps) {
  const [newBossData, setNewBossData] = useState({
    name: '',
    icon: '🔥',
    color: 'from-amber-600 to-red-700',
    maxPlayers: 18,
    desc: ''
  });

  if (!showBossManagerModal) return null;

  const handleCreateCustomBoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBossData.name.trim()) {
      showToast("請填寫 Boss 顯示名稱！", "error");
      return;
    }

    const customBossId = `custom_${Date.now()}`;
    try {
      const bossDocRef = doc(db, `artifacts/${appId}/public/data/bosses/${customBossId}`);
      await setDoc(bossDocRef, {
        id: customBossId,
        name: newBossData.name.trim(),
        icon: newBossData.icon,
        color: newBossData.color,
        maxPlayers: Number(newBossData.maxPlayers) || 18,
        desc: newBossData.desc.trim(),
        isCustom: true
      });
      setNewBossData({ name: '', icon: '🔥', color: 'from-amber-600 to-red-700', maxPlayers: 18, desc: '' });
      showToast("🎉 自訂 Boss 新增成功！");
    } catch (err: any) {
      showToast(`新增失敗: ${err.message}`, "error");
    }
  };

  const handleDeleteBoss = async (bossId: string, bossName: string) => {
    if (confirm(`確定要刪除自訂 Boss 【${bossName}】 嗎？`)) {
      try {
        const bossRef = doc(db, `artifacts/${appId}/public/data/bosses/${bossId}`);
        await deleteDoc(bossRef);
        showToast(`已成功刪除自訂 Boss 【${bossName}】！`);
      } catch (err: any) {
        showToast(`刪除失敗: ${err.message}`, "error");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl relative my-4 flex flex-col max-h-[90vh]">
        <button 
          type="button" 
          onClick={() => setShowBossManagerModal(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
        >
          ✕
        </button>
        
        <div className="border-b border-slate-100 pb-3 mb-3.5 shrink-0">
          <h3 className="text-lg sm:text-xl font-black text-indigo-700 flex items-center space-x-2">
            <span>👾 自訂突襲 Boss 管理</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">為伺服器新增全新的突襲 Boss。</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <form onSubmit={handleCreateCustomBoss} className="space-y-3 text-xs border-r-0 lg:border-r border-slate-200 pr-0 lg:pr-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center space-x-1">
              <span>➕ 新建突襲王</span>
            </h4>

            <div>
              <label className="block text-slate-600 mb-1 font-bold">Boss 顯示名稱</label>
              <input
                type="text"
                required
                placeholder="例如: 混沌黑龍王"
                value={newBossData.name}
                onChange={(e) => setNewBossData({ ...newBossData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 font-bold">選擇 Emoji 圖標 ({newBossData.icon})</label>
              <div className="grid grid-cols-6 gap-1 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                {BOSS_EMOJIS_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewBossData({ ...newBossData, icon: emoji })}
                    className={`text-lg p-1 rounded-lg hover:bg-slate-200 transition cursor-pointer ${newBossData.icon === emoji ? 'bg-indigo-100 border border-indigo-400' : 'border border-transparent'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-bold">最大出征人數</label>
              <input
                type="number"
                required
                placeholder="18"
                value={newBossData.maxPlayers}
                onChange={(e) => setNewBossData({ ...newBossData, maxPlayers: Number(e.target.value) || 18 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1.5 font-bold">選擇主題漸層</label>
              <div className="grid grid-cols-3 gap-1.5">
                {BOSS_GRADIENTS_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewBossData({ ...newBossData, color: preset.value })}
                    className={`p-1.5 rounded-lg border text-[10px] font-black text-center transition bg-gradient-to-r ${preset.value} cursor-pointer ${newBossData.color === preset.value ? 'ring-2 ring-indigo-500' : 'opacity-80 hover:opacity-100'}`}
                  >
                    <span className="text-white drop-shadow-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-bold">出征描述（選填）</label>
              <input
                type="text"
                placeholder="例: 極高血量與走位挑戰..."
                value={newBossData.desc}
                onChange={(e) => setNewBossData({ ...newBossData, desc: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              儲存至資料庫
            </button>
          </form>

          {/* List panel */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between text-xs">
              <span>🛠️ 目前自訂 Boss 列表</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                {customBossesList.length} 個
              </span>
            </h4>
            
            {customBossesList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic bg-slate-50 border border-slate-200 rounded-2xl">
                目前尚無任何自訂突襲 Boss
              </div>
            ) : (
              <div className="space-y-2">
                {customBossesList.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className="text-xl shrink-0">{b.icon || '👹'}</span>
                      <div className="truncate min-w-0">
                        <p className="font-extrabold text-slate-900 truncate text-xs sm:text-sm">{b.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">限制: {b.maxPlayers}人</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBoss(b.id, b.name)}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2 py-1 rounded-lg text-[10px] transition shrink-0 cursor-pointer"
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3 mt-3 text-xs font-bold select-none shrink-0">
          <button 
            type="button" 
            onClick={() => setShowBossManagerModal(false)} 
            className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-slate-700 font-bold transition cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 3. Job Manager Modal
// ==========================================
interface JobManagerProps {
  appId: string;
  jobCategories: { [category: string]: { [tier: string]: string[] } };
  setJobCategories: (c: any) => void;
  showJobManagerModal: boolean;
  setShowJobManagerModal: (show: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function JobManagerModal({
  appId,
  jobCategories,
  setJobCategories,
  showJobManagerModal,
  setShowJobManagerModal,
  showToast
}: JobManagerProps) {
  const [newJobData, setNewJobData] = useState({ category: '劍士', tier: '4轉', name: '' });

  if (!showJobManagerModal) return null;

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const jobName = newJobData.name.trim();
    if (!jobName) {
      showToast("請輸入職業名稱！", "error");
      return;
    }

    let exists = false;
    for (const catTiers of Object.values(jobCategories)) {
      if (catTiers && typeof catTiers === 'object' && !Array.isArray(catTiers)) {
        for (const jobs of Object.values(catTiers)) {
          if (jobs && jobs.includes(jobName)) exists = true;
        }
      } else if (Array.isArray(catTiers)) {
        if (catTiers.includes(jobName)) exists = true;
      }
    }

    if (exists) {
      showToast(`職業 【${jobName}】 已存在於列表中，請勿重複新增！`, "error");
      return;
    }

    const updatedCategories = JSON.parse(JSON.stringify(jobCategories));
    if (!updatedCategories[newJobData.category]) {
      updatedCategories[newJobData.category] = { '2轉': [], '3轉': [], '4轉': [] };
    }
    
    if (typeof updatedCategories[newJobData.category] !== 'object' || Array.isArray(updatedCategories[newJobData.category])) {
      updatedCategories[newJobData.category] = { '2轉': [], '3轉': [], '4轉': [jobName] };
    } else {
      if (!updatedCategories[newJobData.category][newJobData.tier]) {
        updatedCategories[newJobData.category][newJobData.tier] = [];
      }
      updatedCategories[newJobData.category][newJobData.tier].push(jobName);
    }

    try {
      const cfgRef = doc(db, `artifacts/${appId}/public/data/jobs/config`);
      await setDoc(cfgRef, updatedCategories);
      setJobCategories(updatedCategories);
      setNewJobData({ ...newJobData, name: '' });
      showToast(`成功將 【${jobName}】 新增至 【${newJobData.category} - ${newJobData.tier}】！`);
    } catch (err: any) {
      showToast(`新增職業失敗: ${err.message}`, "error");
    }
  };

  const handleDeleteJob = async (category: string, tier: string | null, jobName: string) => {
    if (confirm(`確定要刪除職業身分 【${jobName}】 嗎？`)) {
      const updatedCategories = JSON.parse(JSON.stringify(jobCategories));
      if (tier && updatedCategories[category] && updatedCategories[category][tier]) {
        updatedCategories[category][tier] = updatedCategories[category][tier].filter((j: string) => j !== jobName);
      } else if (Array.isArray(updatedCategories[category])) {
        updatedCategories[category] = updatedCategories[category].filter((j: string) => j !== jobName);
      }

      try {
        const cfgRef = doc(db, `artifacts/${appId}/public/data/jobs/config`);
        await setDoc(cfgRef, updatedCategories);
        setJobCategories(updatedCategories);
        showToast(`已成功將職業 【${jobName}】 移出系統！`);
      } catch (err: any) {
        showToast(`刪除職業失敗: ${err.message}`, "error");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl relative my-4 flex flex-col max-h-[90vh]">
        <button 
          type="button" 
          onClick={() => setShowJobManagerModal(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
        >
          ✕
        </button>
        
        <div className="border-b border-slate-100 pb-3 mb-3.5 shrink-0">
          <h3 className="text-lg sm:text-xl font-black text-teal-700 flex items-center space-x-2">
            <span>⚔️ 遠征隊職業管理</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">在五大類別中自由新增或刪除職業身分名稱。</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <form onSubmit={handleAddJob} className="space-y-3 text-xs border-r-0 lg:border-r border-slate-200 pr-0 lg:pr-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center space-x-1">
              <span>➕ 新增職業身分</span>
            </h4>

            <div>
              <label className="block text-slate-600 mb-1 font-bold">歸屬職業系</label>
              <select
                value={newJobData.category}
                onChange={(e) => setNewJobData({ ...newJobData, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
              >
                {Object.keys(jobCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-bold">轉職階段</label>
              <select
                value={newJobData.tier}
                onChange={(e) => setNewJobData({ ...newJobData, tier: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold cursor-pointer"
              >
                <option value="2轉">2轉 (Lv.30)</option>
                <option value="3轉">3轉 (Lv.70)</option>
                <option value="4轉">4轉 (Lv.120)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-bold">職業名稱</label>
              <input
                type="text"
                required
                placeholder="例如: 魂騎士, 破風使者"
                value={newJobData.name}
                onChange={(e) => setNewJobData({ ...newJobData, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-bold"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-2 rounded-xl text-xs shadow-sm transition cursor-pointer"
            >
              儲存並新增職業
            </button>
          </form>

          {/* List panel */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between text-xs">
              <span>🛠️ 職業分類一覽</span>
            </h4>
            
            <div className="space-y-3 text-xs">
              {Object.entries(jobCategories).map(([cat, tiers]) => {
                const isNested = tiers && typeof tiers === 'object' && !Array.isArray(tiers);
                return (
                  <div key={cat} className="space-y-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center space-x-1.5 border-b border-slate-200 pb-1">
                      <JobIcon jobName={cat === '法師' ? '主教' : (cat === '劍士' ? '英雄' : (cat === '弓箭手' ? '箭神' : (cat === '盜賊' ? '夜使者' : '拳霸')))} sizeClass="w-3.5 h-3.5" />
                      <span className="font-extrabold text-indigo-700 text-xs sm:text-sm">{cat}</span>
                    </div>
                    
                    {isNested ? (
                      ['2轉', '3轉', '4轉'].map(tier => {
                        const jobs = (tiers as any)[tier] || [];
                        return (
                          <div key={tier} className="space-y-1 pl-1.5 border-l-2 border-slate-200">
                            <span className="text-[10px] font-bold text-slate-500 block">{tier}職業：</span>
                            <div className="flex flex-wrap gap-1.5">
                              {jobs.length > 0 ? (
                                jobs.map((job: string) => (
                                  <span 
                                    key={job}
                                    className="inline-flex items-center bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-bold text-[11px] space-x-1 shadow-sm"
                                  >
                                    <span>{job}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => handleDeleteJob(cat, tier, job)}
                                      className="text-rose-500 hover:text-rose-700 font-black pl-1 cursor-pointer"
                                      title="刪除此職業"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">無設定</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(tiers) && (tiers as string[]).map((job) => (
                          <span 
                            key={job}
                            className="inline-flex items-center bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 font-bold text-[11px] space-x-1 shadow-sm"
                          >
                            <span>{job}</span>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteJob(cat, null, job)}
                              className="text-rose-500 hover:text-rose-700 font-black pl-1 cursor-pointer"
                              title="刪除此職業"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3 mt-3 text-xs font-bold select-none shrink-0">
          <button 
            type="button" 
            onClick={() => setShowJobManagerModal(false)} 
            className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl text-slate-700 font-bold transition cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}


// ==========================================
// 4. Voter details / Member detail cards
// ==========================================
interface VoterDetailProps {
  voter: any;
  isOpen: boolean;
  onClose: () => void;
}

export function VoterDetailModal({ voter, isOpen, onClose }: VoterDetailProps) {
  if (!isOpen || !voter) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 w-full max-w-sm shadow-2xl relative font-sans animate-in fade-in zoom-in-95 duration-200">
        <button 
          type="button"
          onClick={onClose} 
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition"
        >
          ✕
        </button>
        
        <div className="text-center pb-3 border-b border-slate-100 select-none">
          <span className="text-3xl block mb-1">🍁</span>
          <h3 className="text-base sm:text-lg font-black text-slate-900">隊員詳細身分角色卡</h3>
          <p className="text-[10px] text-slate-400 font-mono">NyxShade Expedition Member Card</p>
        </div>
        
        <div className="py-4 space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">遊戲 ID (IGN)</span>
            <span className="text-slate-900 text-sm sm:text-base font-black select-text">{voter.ign}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">當前職業</span>
            <span className="text-indigo-700 font-black flex items-center space-x-1.5 select-none">
              <JobIcon jobName={voter.job} sizeClass="w-3.5 h-3.5" />
              <span>{voter.job}</span>
            </span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-medium">角色等級</span>
            <span className="text-slate-900 font-mono text-sm sm:text-base font-bold select-none">Lv. {voter.level || '?'}</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 block text-[11px] select-none font-medium">💬 角色詳細備註 / 狀態說明</span>
            <div className="text-slate-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap bg-white border border-slate-200 p-2.5 rounded-lg min-h-[60px] font-sans">
              {voter.memo || '本角色尚無填寫出團備註。'}
            </div>
          </div>
        </div>
        
        <button 
          type="button"
          onClick={onClose} 
          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 rounded-xl text-xs transition active:scale-95 select-none cursor-pointer"
        >
          關閉視窗
        </button>
      </div>
    </div>
  );
}
