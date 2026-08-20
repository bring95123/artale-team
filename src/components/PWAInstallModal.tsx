import React, { useState, useEffect } from 'react';
import { isStandalone, isIOSDevice } from '../pwa';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function PWAInstallModal({ isOpen, onClose, showToast }: PWAInstallModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    setIsAppInstalled(isStandalone());
    setIsIOS(isIOSDevice());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      showToast('🎉 恭喜！NyxShade 已成功安裝至您的桌面/主畫面！', 'success');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('🚀 正在為您安裝應用程式...', 'info');
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // Guide shown in UI
    } else {
      showToast('💡 提示：若瀏覽器未跳出安裝窗，可點擊網址列右側的「安裝」圖示或瀏覽器選單中的「安裝應用程式」', 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-lg shadow-amber-500/20 shrink-0 flex items-center justify-center overflow-hidden">
              <img src="/icons/icon.svg" alt="NyxShade App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <span>安裝 NyxShade 應用程式 (PWA)</span>
              </h3>
              <p className="text-xs text-amber-400 font-bold mt-0.5">
                像原生 App 一樣獨立視窗秒開、全螢幕無干擾
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="py-5 space-y-4 text-sm text-slate-300 relative z-10">
          {isAppInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-3">
              <span className="text-2xl">✨</span>
              <div className="text-xs leading-relaxed font-bold">
                您目前已處於 <span className="text-emerald-400 font-extrabold">PWA 獨立應用程式模式</span>！系統已自動快取離線資源，可享受最流暢的組隊體驗。
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">⚡</span>
                  <span className="text-xs font-black text-slate-200">極速秒開</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">離線快取加速</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">📱</span>
                  <span className="text-xs font-black text-slate-200">主畫面捷徑</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">桌面專屬圖示</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-800 flex flex-col items-center justify-center">
                  <span className="text-xl mb-1">🖥️</span>
                  <span className="text-xs font-black text-slate-200">全螢幕體驗</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">無瀏覽器網址列</span>
                </div>
              </div>

              {/* iOS Safari Guide */}
              {isIOS ? (
                <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2.5">
                  <div className="text-xs font-extrabold text-indigo-300 flex items-center space-x-1.5">
                    <span>🍎 iOS (iPhone / iPad) 安裝方式：</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>
                      點擊 Safari 瀏覽器底部（或頂部）的 <span className="text-white font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">「分享按鈕 📤」</span>
                    </li>
                    <li>
                      向下滾動選單，點選 <span className="text-amber-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">「加入主畫面 ➕」</span>
                    </li>
                    <li>
                      點擊右上角「新增」，即可在手機桌面生成 NyxShade 專屬 App 圖示！
                    </li>
                  </ol>
                </div>
              ) : (
                /* Chrome / Edge / Android Direct Install */
                <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-extrabold text-amber-400 flex items-center space-x-1.5">
                    <span>🤖 Android / Chrome / Edge / Windows / Mac 安裝方式：</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    點擊下方「立即安裝」按鈕，或點擊瀏覽器網址列右側的 <span className="text-amber-300 font-bold">「⬇️ 安裝應用程式」</span> 圖示，即可直接安裝為獨立視窗執行！
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap gap-2.5 justify-end relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
          >
            關閉
          </button>
          {!isAppInstalled && !isIOS && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center space-x-1.5 cursor-pointer"
            >
              <span>📲 立即安裝 NyxShade App</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
