import React, { useState, useEffect } from 'react';
import { isStandalone, isIOSDevice, isAndroidDevice, isInAppBrowser } from '../pwa';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function PWAInstallModal({ isOpen, onClose, showToast }: PWAInstallModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [inApp, setInApp] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'auto' | 'ios' | 'android' | 'desktop'>('auto');

  useEffect(() => {
    const standalone = isStandalone();
    const ios = isIOSDevice();
    const android = isAndroidDevice();
    const inAppBrowser = isInAppBrowser();

    setIsAppInstalled(standalone);
    setIsIOS(ios);
    setIsAndroid(android);
    setInApp(inAppBrowser);

    if (ios) {
      setActiveTab('ios');
    } else if (android) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

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
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('🚀 正在為您安裝應用程式至主畫面...', 'info');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else if (isIOS) {
      showToast('📱 iPhone 請依下方教學：點擊 Safari 下方的「分享 📤」➔「加入主畫面 ➕」', 'info');
    } else {
      showToast('💡 請點選瀏覽器選單 (⋮) ➔ 選擇「安裝應用程式」或「加到主畫面」', 'info');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between relative z-10 pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
              <img src="/icons/icon.svg" alt="NyxShade App Icon" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
                <span>安裝 NyxShade 應用程式 (PWA)</span>
              </h3>
              <p className="text-[11px] text-amber-700 font-bold mt-0.5">
                像原生手機 App 一樣獨立視窗秒開、全螢幕無干擾
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="py-4 space-y-3.5 text-sm text-slate-700 relative z-10 overflow-y-auto">
          
          {/* In-App Browser Warning Alert */}
          {inApp && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed space-y-1">
              <div className="font-extrabold flex items-center space-x-1.5 text-rose-700">
                <span>⚠️ 目前處於社群 App 內嵌瀏覽器 (LINE / Discord / FB)</span>
              </div>
              <p className="text-[11px] text-rose-700/90">
                社群軟體內嵌瀏覽器限制無法直接安裝 PWA。請點擊螢幕右上角或右下角的 <span className="font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-rose-200">「⋮」或「...」</span> 選單，選擇 <span className="font-black text-amber-800">「以 Safari / Chrome 開啟」</span> 後再安裝！
              </p>
            </div>
          )}

          {isAppInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-3">
              <span className="text-3xl">✨</span>
              <div className="text-xs leading-relaxed font-bold">
                您目前已處於 <span className="text-emerald-700 font-extrabold">PWA 獨立應用程式模式</span>！系統已自動快取離線資源，可享受最流暢的組隊體驗。
              </div>
            </div>
          ) : (
            <>
              {/* Feature Pills */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-lg mb-0.5">⚡</span>
                  <span className="text-[11px] font-black text-slate-800">極速秒開</span>
                  <span className="text-[9px] text-slate-500">離線快取加速</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-lg mb-0.5">📱</span>
                  <span className="text-[11px] font-black text-slate-800">主畫面捷徑</span>
                  <span className="text-[9px] text-slate-500">桌面專屬圖示</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
                  <span className="text-lg mb-0.5">🖥️</span>
                  <span className="text-[11px] font-black text-slate-800">全螢幕體驗</span>
                  <span className="text-[9px] text-slate-500">無網址列干擾</span>
                </div>
              </div>

              {/* Tabs for platform instructions */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold select-none gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${activeTab === 'ios' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200 font-black' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🍎 iPhone / iPad
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${activeTab === 'android' ? 'bg-white text-amber-700 shadow-sm border border-slate-200 font-black' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  🤖 Android (安卓)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('desktop')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${activeTab === 'desktop' ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-black' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  💻 電腦 / Mac
                </button>
              </div>

              {/* iOS Safari Step-by-Step Guide */}
              {activeTab === 'ios' && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                  <div className="text-xs font-extrabold text-indigo-900 flex items-center justify-between">
                    <span>🍎 iPhone / iPad (Safari) 安裝步驟：</span>
                    <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">Apple 規範</span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-800">
                    <div className="flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <div>
                        請使用 <span className="text-indigo-700 font-bold">Safari 瀏覽器</span> 開啟此網頁，點擊底部（或頂部）的 <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-900 font-bold">「分享按鈕 📤」</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <div>
                        在彈出的選單中往下滑動，點選 <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-bold">「加入主畫面 ➕」</span>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <div>
                        點擊右上角的 <span className="text-white font-bold bg-indigo-600 px-2 py-0.5 rounded shadow-sm">「新增」</span>，即可在手機桌面生成 NyxShade 專屬圖示！
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    ℹ️ 說明：Apple iOS 系統規定所有網頁均無法由程式碼自動彈出安裝視窗，必須透過上述 3 個步驟手動加入。
                  </p>
                </div>
              )}

              {/* Android Chrome Guide */}
              {activeTab === 'android' && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="text-xs font-extrabold text-amber-900 flex items-center justify-between">
                    <span>🤖 Android (Chrome / Edge) 安裝步驟：</span>
                    {deferredPrompt && (
                      <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 font-bold">可一鍵安裝</span>
                    )}
                  </div>

                  <div className="space-y-2 text-xs text-slate-800">
                    {deferredPrompt ? (
                      <div className="p-3 bg-white rounded-xl border border-amber-300 text-center space-y-2 shadow-sm">
                        <p className="text-xs text-slate-700">您的 Android 瀏覽器已準備就緒，點擊下方按鈕即可立即安裝：</p>
                        <button
                          type="button"
                          onClick={handleInstallClick}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs transition shadow-md cursor-pointer"
                        >
                          📲 點此立即安裝到主畫面
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                          <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
                          <div>
                            使用 <span className="text-amber-800 font-bold">Chrome 瀏覽器</span>，點擊右上角的 <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-900 font-bold">「三個點 ⋮」</span> 選單
                          </div>
                        </div>

                        <div className="flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                          <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
                          <div>
                            點選 <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-bold">「安裝應用程式」</span> 或 <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 font-bold">「加到主畫面」</span>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-amber-100 shadow-sm">
                          <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
                          <div>
                            確認「安裝」，即可在手機應用程式列表與桌面找到 NyxShade！
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Desktop Guide */}
              {activeTab === 'desktop' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                    <span>💻 電腦版 (Windows / macOS / Chrome / Edge)：</span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-700">
                    <p className="leading-relaxed">
                      1. 請查看瀏覽器上方網址列的最右側，會出現一個 <span className="text-amber-800 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">「⬇️ 安裝應用程式」</span> 或 <span className="text-amber-800 font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300">「🖥️ 安裝」</span> 圖示。
                    </p>
                    <p className="leading-relaxed">
                      2. 點擊後選擇「安裝」，系統將會為您建立桌面捷徑並以獨立視窗秒速開啟！
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-2 justify-end relative z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            我知道了 / 關閉
          </button>
          {!isAppInstalled && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs transition shadow-md flex items-center space-x-1.5 cursor-pointer"
            >
              <span>📲 立即安裝 NyxShade App</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
