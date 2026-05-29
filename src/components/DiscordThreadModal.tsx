import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DiscordConfig } from '../types';
import JobIcon from './JobIcon';

interface DiscordThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyTitle: string;
  partyKey: string;
  threadTitle: string;
  setThreadTitle: (val: string) => void;
  threadMessage: string;
  setThreadMessage: (val: string) => void;
  onSend: (mode: 'webhook' | 'bot', targetValue: string) => Promise<void>;
  isSending: boolean;
  members: any[];
  discordConfig: DiscordConfig | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function DiscordThreadModal({
  isOpen,
  onClose,
  partyTitle,
  partyKey,
  threadTitle,
  setThreadTitle,
  threadMessage,
  setThreadMessage,
  onSend,
  isSending,
  members,
  discordConfig,
  showToast
}: DiscordThreadModalProps) {
  const [deliveryMode, setDeliveryMode] = React.useState<'webhook' | 'bot'>('webhook');
  const [selectedWebhookUrl, setSelectedWebhookUrl] = React.useState<string>('');
  const [customChannelId, setCustomChannelId] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen && discordConfig) {
      setSelectedWebhookUrl(discordConfig.webhookUrl || '');
      setCustomChannelId(discordConfig.botChannelId || '');
      // If Webhook is not configured but Bot is, default to bot mode automatically
      if (!discordConfig.webhookUrl && discordConfig.botToken) {
        setDeliveryMode('bot');
      } else {
        setDeliveryMode('webhook');
      }
    }
  }, [isOpen, discordConfig]);

  if (!isOpen) return null;

  // Count members with and without Discord linked
  const linkedMembers = members.filter(p => !p.isPlaceholder && p.discord && p.discord.id);
  const unlinkedMembers = members.filter(p => !p.isPlaceholder && (!p.discord || !p.discord.id));
  const activeMembers = members.filter(p => !p.isPlaceholder);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(threadMessage);
    showToast("📋 討論串首則訊息內容已複製到剪貼簿！", "success");
  };

  const handleCopyTitleAndMessage = () => {
    const formatted = `【討論串標題】: ${threadTitle}\n\n${threadMessage}`;
    navigator.clipboard.writeText(formatted);
    showToast("📋 討論串標題與首則內容已一併複製！", "success");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto font-semibold">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative my-8 text-slate-100 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors duration-150 text-xl"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex items-center space-x-3 mb-2 select-none">
            <span className="text-3xl">💬</span>
            <div>
              <h3 className="text-xl font-extrabold text-indigo-400">
                建立 Discord 小隊專屬討論串
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                將為 <span className="text-amber-400 font-bold">{partyTitle}</span> 的成員開啟獨立配備與時間討論串頻道。
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-6">
            
            {/* Left side: Form Settings */}
            <div className="lg:col-span-7 space-y-4">
              {/* Delivery Mode Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 select-none">
                  ⚡ 創串發送模式 (Delivery Mode)
                </label>
                <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('webhook')}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 ${deliveryMode === 'webhook' ? 'bg-indigo-600 text-white shadow' : 'bg-transparent text-slate-450 hover:bg-slate-900/50 text-slate-400'}`}
                  >
                    <span>🌐 Webhook 傳送</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('bot')}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-bold text-xs transition duration-150 ${deliveryMode === 'bot' ? 'bg-indigo-600 text-white shadow' : 'bg-transparent text-slate-450 hover:bg-slate-900/50 text-slate-400'}`}
                  >
                    <span>🤖 DC 機器人 (Bot)</span>
                  </button>
                </div>
              </div>

              {deliveryMode === 'webhook' ? (
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase mb-1.5 select-none">
                    🌐 發送至 Discord 目標頻道 (Webhook)
                  </label>
                  <select 
                    value={selectedWebhookUrl}
                    onChange={(e) => setSelectedWebhookUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-bold text-xs"
                  >
                    {discordConfig?.webhookUrl && (
                      <option value={discordConfig.webhookUrl}>
                        📢 主要廣播頻道 (預設 WEBHOOK)
                      </option>
                    )}
                    {discordConfig?.webhooks?.map((wh) => (
                      <option key={wh.id} value={wh.url}>
                        #{wh.name} (自訂頻道)
                      </option>
                    ))}
                    {!discordConfig?.webhookUrl && (!discordConfig?.webhooks || discordConfig.webhooks.length === 0) && (
                      <option value="">(⚠️ 伺服器管理者尚未配置任何 Webhook)</option>
                    )}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase mb-1.5 select-none">
                    🆔 目標文字/論壇頻道 ID (Target Channel ID)
                  </label>
                  <input 
                    type="text"
                    value={customChannelId}
                    onChange={(e) => setCustomChannelId(e.target.value)}
                    placeholder="請貼上文字頻道或討論區 Forum ID"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono font-bold text-xs"
                  />
                  {!discordConfig?.botToken ? (
                    <span className="text-[10px] text-rose-400 mt-1 block select-none">
                      ⚠️ 尚未在管理者後台配置 Bot Token 密鑰，請先進行設定。
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-1 block select-none">
                      💡 開發者模式下右鍵複製頻道。Bot 需具備發言及建立討論串權限。
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 select-none">
                  📌 討論串頻道名稱 (Thread Name)
                </label>
                <input 
                  type="text"
                  value={threadTitle}
                  onChange={(e) => setThreadTitle(e.target.value)}
                  placeholder="例如: 5/28普拉遠征一隊"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-bold text-sm"
                />
                <span className="text-[10px] text-slate-500 mt-1 block select-none">
                  💡 建議格式：[日期][Boss縮寫]遠征[隊伍名]，如 `5/28普拉遠征一隊`。
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase select-none">
                    📝 討論串首則訊息內容 (Starter Message)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline"
                  >
                    複製此欄
                  </button>
                </div>
                <textarea 
                  value={threadMessage}
                  onChange={(e) => setThreadMessage(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-xs leading-relaxed resize-none bg-slate-950"
                  placeholder="Enter starting instruction and player tags here..."
                />
              </div>
            </div>

            {/* Right side: Party & Discord Sync Status */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div className="space-y-3.5">
                <div className="select-none">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">
                    👥 小隊 Discord 綁定狀態 
                    <span className="ml-1 text-indigo-400 font-mono">({linkedMembers.length}/{activeMembers.length})</span>
                  </h4>
                  <div className="bg-slate-950/80 rounded-2xl border border-slate-800/80 p-3 space-y-2.5 text-xs max-h-[220px] overflow-y-auto">
                    {activeMembers.length === 0 ? (
                      <div className="text-slate-600 text-center py-4 italic">此小隊目前尚無錄取隊員。</div>
                    ) : (
                      members.map((p, idx) => {
                        if (p.isPlaceholder) return null;
                        const isLinked = p.discord && p.discord.id;
                        return (
                          <div key={idx} className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="font-mono text-slate-500 font-bold">{idx + 1}.</span>
                              <span className="text-slate-200 font-extrabold truncate" title={p.ign}>{p.ign}</span>
                              <span className="text-[10px] text-slate-450 text-slate-400 flex items-center shrink-0">
                                <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5 mr-1" />
                                {p.job.substring(0,2)}
                              </span>
                            </div>
                            
                            {isLinked ? (
                              <span className="bg-emerald-500/10 border border-emerald-505/20 text-emerald-450 text-emerald-400 font-mono text-[9px] px-1.5 py-0.5 rounded flex items-center">
                                <img src={p.discord.avatar} className="w-3 h-3 rounded-full mr-1 object-cover" />
                                @{p.discord.username.length > 8 ? p.discord.username.substring(0, 6) + '..' : p.discord.username}
                              </span>
                            ) : (
                              <span className="bg-rose-500/10 border border-rose-505/20 text-rose-455 text-rose-450 text-rose-400 font-bold text-[9px] px-1.5 py-0.5 rounded">
                                ⚠️ 尚未綁定
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {unlinkedMembers.length > 0 && (
                  <div className="bg-amber-600/10 border border-amber-600/20 text-amber-300 text-[11px] p-3 rounded-2xl flex items-start space-x-1.5 leading-relaxed select-none">
                    <span className="text-xs">⚠️</span>
                    <span>
                      本小隊尚有 <strong>{unlinkedMembers.length} 名隊員</strong> 未綁定 Discord，他們將無法被自動 <code className="bg-slate-900/60 px-1 py-0.5 rounded border border-slate-800">@pings</code> 提及標記，請提醒其至組隊系統連結帳號。
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[10px] text-slate-400 leading-relaxed space-y-1 mt-4 select-none">
                <p className="font-bold text-indigo-300">💡 運作機制與權限備忘：</p>
                <p>1. 討論串可透過 Webhook 或 Discord Bot 進行創串。為配合 Discord 機制，請確保目標頻道屬性支援建立討論串。</p>
                <p>2. 各組排班表確認後，點擊下面按鈕即可使用 Bot / Webhook 與對應的 DC 頻道進行討論串建立與標記成員！</p>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-5 mt-6 border-t border-slate-800 select-none">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSending}
              className="flex-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 py-3 rounded-xl text-slate-300 text-sm font-bold transition duration-150"
            >
              取消
            </button>

            <button 
              type="button" 
              onClick={handleCopyTitleAndMessage}
              className="flex-1 bg-slate-950 hover:bg-slate-905 border border-slate-800 hover:border-slate-700 py-3 rounded-xl text-slate-200 text-sm font-bold transition duration-155 duration-150"
            >
              📋 複製創串指令
            </button>

            {(() => {
              const targetValue = deliveryMode === 'webhook' ? selectedWebhookUrl : customChannelId;
              const canSend = deliveryMode === 'webhook' 
                ? (!!selectedWebhookUrl && activeMembers.length > 0)
                : (!!discordConfig?.botToken && !!customChannelId && activeMembers.length > 0);

              return (
                <button 
                  type="button" 
                  onClick={() => onSend(deliveryMode, targetValue)}
                  disabled={isSending || !canSend}
                  className={`flex-1 ${isSending || !canSend ? 'bg-indigo-900/30 text-indigo-400/50 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow'} py-3 rounded-xl text-sm font-extrabold transition duration-200 flex items-center justify-center space-x-2`}
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>正在建立並標記...</span>
                    </>
                  ) : (
                    <>
                      <span>💬 {deliveryMode === 'webhook' ? 'Webhook 傳送創串' : 'Bot 自動傳送親測'}</span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
