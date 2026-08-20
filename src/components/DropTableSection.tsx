import React, { useState, useRef } from 'react';

export const DropTableSection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dropUrl = "https://a2983456456.github.io/artale-drop/";

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className={`space-y-4 transition-all duration-300 ${
      isFullscreen 
        ? "fixed inset-0 z-50 bg-slate-950/95 p-3 sm:p-6 flex flex-col backdrop-blur-md" 
        : "w-full"
    }`}>
      {/* Top Header & Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg select-none">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📦</span>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-black text-slate-100">
                Artale 掉落物與怪物資料庫
              </h3>
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] rounded-full font-bold font-mono">
                內嵌資料庫
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              直接在遠征隊系統內查詢怪物掉落、裝備掉落率與道具來源資訊
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleRefresh}
            title="重新載入掉落物頁面"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition text-xs font-bold flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">重新整理</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "退出全螢幕" : "切換全螢幕檢視"}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-3 py-2 rounded-xl border border-slate-700 transition text-xs font-bold flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <span>{isFullscreen ? "🗗" : "⛶"}</span>
            <span className="hidden sm:inline">{isFullscreen ? "視窗模式" : "全螢幕"}</span>
          </button>

          <a
            href={dropUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="在新分頁開啟完整網頁"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 !text-white px-3.5 py-2 rounded-xl shadow font-extrabold text-xs flex items-center space-x-1.5 transition active:scale-95 cursor-pointer"
          >
            <span>新分頁開啟</span>
            <span>↗️</span>
          </a>
        </div>
      </div>

      {/* Embedded iFrame Frame */}
      <div className={`bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative transition-all ${
        isFullscreen ? "flex-1 w-full h-full min-h-0" : "h-[750px] sm:h-[820px] w-full"
      }`}>
        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-3 z-10 select-none">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-bold">
              正在載入 Artale 掉落物資料庫...
            </p>
          </div>
        )}

        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={dropUrl}
          title="Artale Drop Table Database"
          className="w-full h-full border-0 rounded-3xl bg-white"
          onLoad={() => setIsLoading(false)}
          allow="clipboard-read; clipboard-write; fullscreen"
          loading="lazy"
        />
      </div>
    </div>
  );
};
