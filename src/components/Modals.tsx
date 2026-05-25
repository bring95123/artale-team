import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
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
  showToast
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

  // Find category and tier of a job name
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
    return { category: '法師', tier: '4轉' }; // default backup fallback
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

      // sync to public registered users directory too for managers
      const publicRef = doc(db, `artifacts/${appId}/public/data/registered_users/${customUid}`);
      await setDoc(publicRef, {
        userId: customUid,
        ...profileData,
        updatedAt: new Date().toISOString()
      });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-semibold">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-8">
        <button 
          type="button"
          onClick={() => setShowProfileModal(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
        >
          ✕
        </button>
        
        <h3 className="text-2xl font-black text-white mb-2 flex items-center space-x-2">
          <span>⚙️ 設定我的遊戲角色身分卡</span>
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          登錄多個遊戲身分。連結 Discord 帳號，角色卡與出團紀錄自動雲端備份漫遊！
        </p>

        {/* Discord Bind panel */}
        <div className="mb-6 font-semibold">
          {discordUser ? (
            <div className="flex items-center justify-between bg-slate-950 border border-indigo-500/20 p-4 rounded-2xl shadow-inner">
              <div className="flex items-center space-x-3.5 min-w-0">
                <img 
                  src={discordUser.avatar} 
                  className="w-12 h-12 rounded-full border-2 border-[#5865F2] object-cover shrink-0" 
                  alt="Discord Avatar"
                />
                <div className="min-w-0">
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 px-2 py-0.5 rounded font-black block w-max select-none">
                    🟢 已啟用 Discord 雲端備份
                  </span>
                  <p className="text-sm font-black text-slate-100 mt-1 truncate">@{discordUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnectDiscord}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold px-4 py-2 rounded-xl transition active:scale-95 shrink-0"
              >
                解除連結
              </button>
            </div>
          ) : (
            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <h4 className="text-sm font-black text-slate-200">連結 Discord 以漫遊保存進度</h4>
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                連結後，不論清除瀏覽器快取還是更換裝置，只要透過 Discord 登入即可一秒還原所有的多角色卡與排班數據！
              </p>
              <div>
                {discordConfig?.clientId ? (
                  <a
                    href={getDiscordLoginUrl()}
                    className="inline-flex items-center justify-center space-x-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-extrabold px-6 py-3 rounded-xl transition shadow-lg transform active:scale-95 text-sm w-full sm:w-auto animate-pulse"
                  >
                    <span>⚡ 連結 Discord 帳號</span>
                  </a>
                ) : (
                  <div className="text-xs text-slate-600 italic">
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
            <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-slate-800">
              <span className="text-4xl mb-3">🔒</span>
              <h4 className="text-base font-black text-amber-405">出團角色卡已鎖定</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                系統目前已啟用 Discord 強制安全綁定。<br />
                請先點擊上方按鈕完成 <strong className="text-indigo-400">Discord 連結認證</strong> 即可解鎖建立、編輯與儲存角色卡！
              </p>
            </div>
          )}

          <div className={`space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 font-semibold transition-all duration-300 ${!discordUser ? 'blur-sm pointer-events-none opacity-40 select-none' : ''}`}>
            {tempCharacters.map((char, index) => {
              const derived = findJobCategoryAndTier(char.job);
              const currentCategory = derived.category;
              const currentTier = derived.tier;
              const catObj = jobCategories[currentCategory] || {};
              const availableJobs = (catObj && typeof catObj === 'object' && !Array.isArray(catObj))
                ? (catObj[currentTier] || [])
                : [];

              return (
                <div key={index} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="activeCharacter"
                        checked={tempActiveIndex === index}
                        onChange={() => setTempActiveIndex(index)}
                        className="text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-800 h-5 w-5"
                      />
                      <span className="flex items-center space-x-2">
                        <JobIcon jobName={char.job} sizeClass="w-4 h-4" />
                        <span className={`text-sm font-extrabold ${tempActiveIndex === index ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {tempActiveIndex === index ? '🟢 設為當前出團主身分' : '設為當前出團身分'}
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
                        className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                      >
                        🗑️ 刪除此角色
                      </button>
                    )}
                  </div>

                  {/* Character input form, highly polished, slate-900 bg ensures readable typed text */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">遊戲 ID (IGN)</label>
                      <input
                        type="text"
                        required={!!discordUser}
                        value={char.ign}
                        onChange={(e) => {
                          const updated = [...tempCharacters];
                          updated[index].ign = e.target.value;
                          setTempCharacters(updated);
                        }}
                        placeholder="例如：純粹"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                      />
                    </div>

                    {/* SELECT CONTROLS WITH GUARANTEED DARK BACKGROUND bg-slate-900 / bg-slate-950 */}
                    <div className="md:col-span-2 grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">1. 大系</label>
                        <select
                          value={currentCategory}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            const targetCatObj = jobCategories[newCat] || {};
                            const newJobs = (targetCatObj['4轉'] || Object.values(targetCatObj)[0] || []);
                            const updated = [...tempCharacters];
                            updated[index].job = newJobs[0] || '未知';
                            setTempCharacters(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-150 focus:outline-none cursor-pointer"
                        >
                          {Object.keys(jobCategories).map(cat => (
                            <option key={cat} value={cat} className="bg-slate-950 text-slate-100 font-bold">{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1">2. 轉職</label>
                        <select
                          value={currentTier}
                          onChange={(e) => {
                            const newTier = e.target.value;
                            const targetCatObj = jobCategories[currentCategory] || {};
                            const newJobs = targetCatObj[newTier] || [];
                            const updated = [...tempCharacters];
                            updated[index].job = newJobs[0] || '未知';
                            setTempCharacters(updated);
                          }}
                          className="w-full bg-slate-955 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-150 focus:outline-none cursor-pointer bg-slate-950"
                        >
                          <option value="2轉" className="bg-slate-955 text-slate-100">2轉 (Lv.30)</option>
                          <option value="3轉" className="bg-slate-955 text-slate-100">3轉 (Lv.70)</option>
                          <option value="4轉" className="bg-slate-955 text-slate-100">4轉 (Lv.120)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-amber-500 mb-1">3. 職業</label>
                        <select
                          value={char.job}
                          onChange={(e) => {
                            const updated = [...tempCharacters];
                            updated[index].job = e.target.value;
                            setTempCharacters(updated);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-amber-400 font-extrabold focus:outline-none cursor-pointer"
                        >
                          {availableJobs.map(j => (
                            <option key={j} value={j} className="bg-slate-950 text-slate-100">{j}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">等級 (Lv.)</label>
                      <input
                        type="number"
                        required={!!discordUser}
                        min={1}
                        max={200}
                        value={char.level}
                        onChange={(e) => {
                          const updated = [...tempCharacters];
                          updated[index].level = Number(e.target.value);
                          setTempCharacters(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base text-slate-100 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">💡 出團預設備註（錄取後會顯示在分組名單中！）</label>
                    <input
                      type="text"
                      value={char.memo || ''}
                      onChange={(e) => {
                        const updated = [...tempCharacters];
                        updated[index].memo = e.target.value;
                        setTempCharacters(updated);
                      }}
                      placeholder="例：已洗血、滿聖火、祈禱滿、天怒20"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {discordUser && (
            <button
              type="button"
              onClick={() => {
                setTempCharacters([...tempCharacters, { ign: '', job: '主教', level: 120, memo: '' }]);
              }}
              className="w-full bg-slate-950 hover:bg-slate-900 text-indigo-400 font-bold py-3 rounded-2xl text-sm transition border border-dashed border-slate-800 flex items-center justify-center space-x-2 mt-4"
            >
              <span>➕ 新增另一個遊戲身分角色卡</span>
            </button>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex space-x-4 pt-4 border-t border-slate-800 mt-6 select-none">
          <button 
            type="button" 
            onClick={() => setShowProfileModal(false)} 
            className="flex-1 bg-slate-800 hover:bg-slate-750 py-3 rounded-xl text-sm font-bold text-slate-300 transition"
          >
            取消
          </button>
          
          {discordUser && (
            <button 
              type="submit" 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold py-3 rounded-xl text-sm shadow-lg transition active:scale-95"
            >
              {isSaving ? "⏳ 儲存中..." : "確認並儲存變更"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}


// ==========================================
// 2. Boss Manager Modal (With optimized selects/inputs)
// ==========================================
interface BossManagerProps {
  appId: string;
  customBossesList: Boss[];
  showBossManagerModal: boolean;
  setShowBossManagerModal: (show: boolean) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  bosses: Boss[];
  setBosses: (b: Boss[]) => void;
}

export function BossManagerModal({
  appId,
  customBossesList,
  showBossManagerModal,
  setShowBossManagerModal,
  showToast
}: BossManagerProps) {
  const [newBossData, setNewBossData] = useState({ name: '', icon: '🔥', color: 'from-amber-600 to-red-700', maxPlayers: 18, desc: '' });

  if (!showBossManagerModal) return null;

  const handleCreateCustomBoss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBossData.name.trim()) {
      showToast("請填妥 Boss 顯示名稱！", "error");
      return;
    }
    try {
      const bossId = 'boss_' + Date.now();
      const bossRef = doc(db, `artifacts/${appId}/public/data/bosses/${bossId}`);
      await setDoc(bossRef, {
        id: bossId,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-semibold">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-8">
        <button 
          type="button" 
          onClick={() => setShowBossManagerModal(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
        >
          ✕
        </button>
        
        <h3 className="text-2xl font-black text-indigo-400 mb-2 flex items-center space-x-2">
          <span>👾 自訂突襲 Boss 管理工具</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">為伺服器新增全新的突襲 Boss。無須手動輸入 ID，系統將自動配置！</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form onSubmit={handleCreateCustomBoss} className="space-y-4 text-sm border-r border-slate-800/80 pr-0 lg:pr-6">
            <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-1.5">
              <span>➕ 新建突襲王</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Boss 顯示名稱</label>
              {/* FIXED background for high contrast input reading */}
              <input
                type="text"
                required
                placeholder="例如: 混沌黑龍王 (Chaos Horntail)"
                value={newBossData.name}
                onChange={(e) => setNewBossData({ ...newBossData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none text-slate-100 placeholder-slate-650"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-2">選擇 Emoji 圖標 ({newBossData.icon})</label>
                <div className="grid grid-cols-6 gap-1.5 p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                  {BOSS_EMOJIS_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewBossData({ ...newBossData, icon: emoji })}
                      className={`text-xl p-1.5 rounded-lg hover:bg-slate-800 transition ${newBossData.icon === emoji ? 'bg-indigo-650/30 border-indigo-500 scale-105' : 'border border-transparent'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 mb-1.5">最大出征人數</label>
                <input
                  type="number"
                  required
                  placeholder="18"
                  value={newBossData.maxPlayers}
                  onChange={(e) => setNewBossData({ ...newBossData, maxPlayers: Number(e.target.value) || 18 })}
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none text-slate-100 font-mono bg-slate-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">選擇卡片漸層主題色</label>
              <div className="grid grid-cols-3 gap-2">
                {BOSS_GRADIENTS_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewBossData({ ...newBossData, color: preset.value })}
                    className={`p-2 rounded-lg border text-[10px] font-black tracking-wide text-center transition bg-gradient-to-r ${preset.value} ${newBossData.color === preset.value ? 'border-amber-400 ring-2 ring-amber-400/30 scale-105' : 'border-slate-800 opacity-80 hover:opacity-100'}`}
                  >
                    <span className="text-white drop-shadow-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">出征要求描述（選填）</label>
              <input
                type="text"
                placeholder="例: 極高血量與走位挑戰..."
                value={newBossData.desc}
                onChange={(e) => setNewBossData({ ...newBossData, desc: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none text-slate-100 text-xs placeholder-slate-650"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md shadow-indigo-500/10 hover:brightness-110 active:scale-95 transition"
            >
              儲存至資料庫
            </button>
          </form>

          {/* List panel */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🛠️ 目前自訂 Boss 列表</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-bold">
                {customBossesList.length} 個
              </span>
            </h4>
            
            {customBossesList.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-xs italic bg-slate-950 border border-slate-800 rounded-2xl">
                目前尚無任何自訂突襲 Boss 紀錄
              </div>
            ) : (
              <div className="max-h-[350px] overflow-y-auto pr-2 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-800">
                {customBossesList.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition text-xs">
                    <div className="flex items-center space-x-3 truncate">
                      <span className="text-2xl shrink-0">{b.icon || '👹'}</span>
                      <div className="truncate min-w-0">
                        <p className="font-extrabold text-slate-100 truncate text-sm">{b.name}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-bold font-mono">人數限制: {b.maxPlayers}人</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBoss(b.id, b.name)}
                      className="bg-rose-950/30 hover:bg-rose-900/60 border border-rose-900/40 text-rose-300 font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition shrink-0"
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 border-t border-slate-800 pt-3 mt-6 text-xs font-bold select-none">
          <button 
            type="button"
            onClick={() => setShowBossManagerModal(false)}
            className="bg-slate-800 hover:bg-slate-750 px-5 py-2.5 rounded-xl text-slate-300 font-bold transition"
          >
            關閉面板
          </button>
        </div>

      </div>
    </div>
  );
}


// ==========================================
// 3. Job Manager Modal (With highly optimized selects/inputs)
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
      showToast(`成功將 【${jobName}】 新增至 【${newJobData.category} - ${newJobData.tier}】分類中！`);
    } catch (err: any) {
      showToast(`新增職業失敗: ${err.message}`, "error");
    }
  };

  const handleDeleteJob = async (category: string, tier: string | null, jobName: string) => {
    if (confirm(`確定要刪除職業身分 【${jobName}】 嗎？移除後將不提供在註冊選單。`)) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-semibold font-bold">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-8">
        <button 
          type="button" 
          onClick={() => setShowJobManagerModal(false)} 
          className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl"
        >
          ✕
        </button>
        
        <h3 className="text-2xl font-black text-teal-400 mb-2 flex items-center space-x-2">
          <span>⚔️ 遠征隊職業管理工具</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">管理員可在五大類別中自由新增或刪除各轉職階段的職業身分名稱。</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <form onSubmit={handleAddJob} className="space-y-4 text-sm border-r border-slate-800/80 pr-0 lg:pr-6">
            <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center space-x-1.5">
              <span>➕ 新增職業身分</span>
            </h4>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">選擇歸屬職業系</label>
              <select
                value={newJobData.category}
                onChange={(e) => setNewJobData({ ...newJobData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none text-slate-100 cursor-pointer"
              >
                {Object.keys(jobCategories).map(cat => (
                  <option key={cat} value={cat} className="bg-slate-950 text-slate-100">{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">選擇轉職階段</label>
              <select
                value={newJobData.tier}
                onChange={(e) => setNewJobData({ ...newJobData, tier: e.target.value })}
                className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3 py-2.5 focus:outline-none text-slate-100 cursor-pointer bg-slate-950"
              >
                <option value="2轉" className="bg-slate-955 text-slate-100">2轉 (Lv.30)</option>
                <option value="3轉" className="bg-slate-955 text-slate-100">3轉 (Lv.70)</option>
                <option value="4轉" className="bg-slate-955 text-slate-100">4轉 (Lv.120)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">職業名稱</label>
              {/* FIXED input background bg-slate-950 for typing visibility */}
              <input
                type="text"
                required
                placeholder="例如: 魂騎士, 破風使者"
                value={newJobData.name}
                onChange={(e) => setNewJobData({ ...newJobData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 focus:outline-none text-slate-100 placeholder-slate-650"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md shadow-teal-500/10 hover:brightness-110 active:scale-95 transition"
            >
              確認儲存並新增職業
            </button>
          </form>

          {/* List panel */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>🛠️ 職業分類一覽與刪除</span>
            </h4>
            
            <div className="max-h-[380px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 text-xs">
              {Object.entries(jobCategories).map(([cat, tiers]) => {
                const isNested = tiers && typeof tiers === 'object' && !Array.isArray(tiers);
                return (
                  <div key={cat} className="space-y-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="flex items-center space-x-2 border-b border-slate-800/60 pb-1 mb-2">
                      <JobIcon jobName={cat === '法師' ? '主教' : (cat === '劍士' ? '英雄' : (cat === '弓箭手' ? '箭神' : (cat === '盜賊' ? '夜使者' : '拳霸')))} sizeClass="w-4 h-4" />
                      <span className="font-extrabold text-indigo-300 text-sm">{cat}</span>
                    </div>
                    
                    {isNested ? (
                      ['2轉', '3轉', '4轉'].map(tier => {
                        const jobs = (tiers as any)[tier] || [];
                        return (
                          <div key={tier} className="space-y-1.5 pl-2 border-l border-slate-800/80">
                            <span className="text-[11px] font-bold text-amber-500/80 block">{tier}職業：</span>
                            <div className="flex flex-wrap gap-2">
                              {jobs.length > 0 ? (
                                jobs.map((job: string) => (
                                  <span 
                                    key={job}
                                    className="inline-flex items-center bg-slate-900 border border-slate-800/80 rounded-lg px-2.5 py-1 text-slate-300 font-extrabold space-x-1.5"
                                  >
                                    <span>{job}</span>
                                    <button 
                                      type="button" 
                                      onClick={() => handleDeleteJob(cat, tier, job)}
                                      className="text-rose-500 hover:text-rose-450 font-black pl-1 select-none transition"
                                      title="刪除此職業"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-600 italic">目前無職業設定</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(tiers) && (tiers as string[]).map((job) => (
                          <span 
                            key={job}
                            className="inline-flex items-center bg-slate-900 border border-slate-800/80 rounded-lg px-2.5 py-1 text-slate-300 font-extrabold space-x-1.5"
                          >
                            <span>{job}</span>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteJob(cat, null, job)}
                              className="text-rose-500 hover:text-rose-450 font-black pl-1 select-none transition animate-pulse"
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

        <div className="flex justify-end space-x-2 border-t border-slate-800 pt-3 mt-6 text-xs font-bold select-none">
          <button 
            type="button" 
            onClick={() => setShowJobManagerModal(false)} 
            className="bg-slate-850 hover:bg-slate-800 px-5 py-2.5 rounded-xl text-slate-300 font-bold transition border border-slate-800"
          >
            關閉職業管理
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative font-semibold font-bold animate-in fade-in zoom-in-95 duration-200">
        <button 
          type="button"
          onClick={onClose} 
          className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl transition-colors"
        >
          ✕
        </button>
        
        <div className="text-center pb-4 border-b border-slate-800 select-none">
          <span className="text-4xl block mb-2">🍁</span>
          <h3 className="text-lg font-black text-white">隊員詳細身分角色卡</h3>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">NyxShade Expedition Member Card</p>
        </div>
        
        <div className="py-6 space-y-4 text-sm">
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">遊戲 ID (IGN)</span>
            <span className="text-white text-base font-black select-text">{voter.ign}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">當前職業</span>
            <span className="text-indigo-400 font-black flex items-center space-x-1.5 select-none">
              <JobIcon jobName={voter.job} sizeClass="w-4 h-4" />
              <span>{voter.job}</span>
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-400">角色等級</span>
            <span className="text-white font-mono text-base font-bold select-none">Lv. {voter.level || '?'}</span>
          </div>
          <div className="p-3 bg-slate-955 rounded-xl border border-slate-820 space-y-2 bg-slate-950">
            <span className="text-slate-400 block text-xs select-none">💬 角色詳細備註 / 狀態說明</span>
            <div className="text-amber-300 text-sm leading-relaxed whitespace-pre-wrap bg-slate-900 border border-slate-800/80 p-3 rounded-lg min-h-[80px] font-sans font-medium">
              {voter.memo || '本角色尚無填寫出團備註。'}
            </div>
          </div>
        </div>
        
        <button 
          type="button"
          onClick={onClose} 
          className="w-full bg-slate-800 hover:bg-slate-755 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition active:scale-95 select-none border border-slate-800"
        >
          關閉視窗
        </button>
      </div>
    </div>
  );
}
