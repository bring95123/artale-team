import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DiscordConfig } from '../types';

interface SavedChannel {
  id: string;
  name: string;
}

interface InteractiveCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  raid: any;
  bossName: string;
  discordConfig: DiscordConfig | null;
  onSend: (targetChannelId: string, customNote?: string) => Promise<void>;
  isSending: boolean;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STORAGE_KEY = 'nyxshade_saved_discord_channels';

export default function InteractiveCardModal({
  isOpen,
  onClose,
  raid,
  bossName,
  discordConfig,
  onSend,
  isSending,
  showToast
}: InteractiveCardModalProps) {
  const [targetChannelId, setTargetChannelId] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [savedChannels, setSavedChannels] = useState<SavedChannel[]>([]);
  const [channelNameInput, setChannelNameInput] = useState<string>('');
  const [showSaveInline, setShowSaveInline] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (discordConfig?.botChannelId) {
        setTargetChannelId(discordConfig.botChannelId);
      }
      
      // Load saved channels from local storage
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setSavedChannels(parsed);
          }
        }
      } catch (e) {
        console.warn("Failed to load saved channels:", e);
      }
    }
  }, [isOpen, discordConfig]);

  if (!isOpen || !raid) return null;

  const handleSaveCurrentChannel = () => {
    const id = targetChannelId.trim();
    const name = channelNameInput.trim() || `頻道 ${id.slice(-4)}`;
    if (!id) {
      showToast("⚠️ 請先輸入頻道 ID 再進行記錄！", "error");
      return;
    }

    const exists = savedChannels.find(c => c.id === id);
    let updated: SavedChannel[];
    if (exists) {
      updated = savedChannels.map(c => c.id === id ? { ...c, name } : c);
    } else {
      updated = [...savedChannels, { id, name }];
    }

    setSavedChannels(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast(`⭐ 已成功記錄頻道「${name}」！`);
      setChannelNameInput('');
      setShowSaveInline(false);
    } catch (e) {
      showToast("保存頻道記錄失敗", "error");
    }
  };

  const handleDeleteSavedChannel = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedChannels.filter(c => c.id !== idToDelete);
    setSavedChannels(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast("已刪除該頻道記錄");
    } catch (e) {}
  };

  const handleSendCard = async () => {
    if (!targetChannelId.trim()) {
      showToast("⚠️ 請輸入目標 Discord 文字或論壇頻道 ID！", "error");
      return;
    }
    await onSend(targetChannelId.trim(), customNote.trim());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto font-semibold">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative my-auto text-slate-900 font-sans"
        >
          {/* Close button */}
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition-colors duration-150 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex items-center space-x-3 mb-3 pr-10">
            <span className="text-3xl">🤖</span>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-indigo-700">
                發送 Discord 互動招募卡片
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                將為 <span className="text-amber-700 font-bold">{raid.title || bossName}</span> 發送帶有按鈕的卡片
              </p>
            </div>
          </div>

          <div className="space-y-4 my-4">
            {/* Target Channel Section */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-indigo-900 uppercase">
                  🎯 目標 Discord 頻道 ID (Channel ID) <span className="text-red-500">*</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setShowSaveInline(!showSaveInline)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-1 underline cursor-pointer"
                >
                  <span>{showSaveInline ? '收起記錄欄' : '⭐ 記錄目前頻道 ID'}</span>
                </button>
              </div>

              {/* Saved Channels Selector Chips */}
              {savedChannels.length > 0 && (
                <div className="mb-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1.5">⭐ 已記錄的常用頻道（點擊代入）：</span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {savedChannels.map((c) => {
                      const isSelected = targetChannelId.trim() === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setTargetChannelId(c.id)}
                          className={`inline-flex items-center text-xs px-2.5 py-1 rounded-xl border font-bold cursor-pointer transition active:scale-95 ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm ring-2 ring-indigo-400/30' 
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="mr-1 font-sans">{c.name}</span>
                          <span className="text-[10px] opacity-70 font-mono mr-1">({c.id.slice(-4)})</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedChannel(c.id, e)}
                            className="hover:text-rose-400 pl-1 font-bold"
                            title="刪除此記錄"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inline Save Form */}
              {showSaveInline && (
                <div className="mb-2 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-indigo-900 block">⭐ 將輸入框中的頻道 ID 保存為常用頻道</span>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={channelNameInput}
                      onChange={(e) => setChannelNameInput(e.target.value)}
                      placeholder="設定別名，例：09/01 招募頻道"
                      className="flex-1 bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCurrentChannel}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm cursor-pointer shrink-0"
                    >
                      儲存記錄
                    </button>
                  </div>
                </div>
              )}

              <input
                type="text"
                value={targetChannelId}
                onChange={(e) => setTargetChannelId(e.target.value)}
                placeholder="例如：123456789012345678"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
              
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between items-center">
                <span>1. 開啟 DC 開發者模式 2. 右鍵頻道複製 ID</span>
                {discordConfig?.botChannelId && targetChannelId !== discordConfig.botChannelId && (
                  <button
                    type="button"
                    onClick={() => setTargetChannelId(discordConfig.botChannelId!)}
                    className="text-indigo-600 hover:underline font-bold"
                  >
                    帶入預設頻道 ({discordConfig.botChannelId.slice(-4)})
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase mb-1.5">
                📝 額外備註 / 招募叮嚀 (選填)
              </label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={2}
                placeholder="例如：今晚 21:00 準時集合，請自備萬能藥與聖魂！"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-medium"
              />
            </div>

            {/* Interactive Buttons Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                ✨ 將在 Discord 卡片下方產生的互動按鈕預覽：
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-sm opacity-90">
                  <span>🙋 快速報名 / 選擇角色卡</span>
                </span>
                <span className="bg-rose-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-sm opacity-90">
                  <span>❌ 取消報名</span>
                </span>
                <span className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-sm opacity-90">
                  <span>📋 隊伍現況</span>
                </span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium pt-1 space-y-0.5">
                <span>💡 提醒：若在 DC 點按鈕顯示「未及時回應」，請確認已在 Discord Developer Portal 的 <b>INTERACTIONS ENDPOINT URL</b> 填入本系統網址。</span>
                <span className="block text-emerald-700 font-bold">🔄 系統已啟動：後台將每 60 秒 (1 分鐘) 自動定時巡檢並同步刷新 Discord 卡片！</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSendCard}
              disabled={isSending || !targetChannelId.trim()}
              className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
            >
              {isSending ? (
                <span>🚀 發送中...</span>
              ) : (
                <span>🚀 發送卡片至指定頻道</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
