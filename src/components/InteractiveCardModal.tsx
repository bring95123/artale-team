import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DiscordConfig } from '../types';

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

  useEffect(() => {
    if (isOpen && discordConfig) {
      setTargetChannelId(discordConfig.botChannelId || '');
    }
  }, [isOpen, discordConfig]);

  if (!isOpen || !raid) return null;

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
          className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative my-auto text-slate-900"
        >
          {/* Close button */}
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition-colors duration-150 p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
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
            <div>
              <label className="block text-xs font-bold text-indigo-900 uppercase mb-1.5">
                🎯 目標 Discord 頻道 ID (Channel ID) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetChannelId}
                onChange={(e) => setTargetChannelId(e.target.value)}
                placeholder="例如：123456789012345678"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                <p>1：開啟 Discord 的「開發者模式」</p>
                <p>2 : 點選頻道右鍵複製頻道ID</p>
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
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Interactive Buttons Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                ✨ 將在 Discord 卡片下方產生的互動按鈕預覽：
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-sm opacity-90">
                  <span>🙋 快速報名 / 變更職業</span>
                </span>
                <span className="bg-rose-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-sm opacity-90">
                  <span>❌ 取消報名</span>
                </span>
                <span className="bg-slate-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 shadow-sm opacity-90">
                  <span>📋 隊伍現況</span>
                </span>
              </div>
              <p className="text-[10px] text-amber-700 font-medium pt-1">
                💡 提醒：若在 DC 點按鈕顯示「未及時回應」，請確認已在 Discord Developer Portal 的 <b>INTERACTIONS ENDPOINT URL</b> 填入本系統網址。
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSendCard}
              disabled={isSending || !targetChannelId.trim()}
              className="px-5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center space-x-1.5"
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
