import React, { useState, useRef, useEffect } from 'react';

export const DropTableSection: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [scaleMode, setScaleMode] = useState<'auto' | 'standard' | 'desktop'>('auto');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dropUrl = "https://a2983456456.github.io/artale-drop/";

  // Monitor container width to calculate desktop zoom scale on mobile
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  // The drop website starts breaking under ~768px (elements overlap at < 500px).
  // In Auto mode or Desktop mode on mobile, we render the iframe at virtual width 800px or 900px,
  // and scale down smoothly using CSS transform scale so everything is perfectly aligned.
  const targetVirtualWidth = 840; // Clean breakpoint width where the site layout does not overlap
  const isMobileScreen = containerWidth > 0 && containerWidth < 768;
  const isScaled = scaleMode === 'desktop' || (scaleMode === 'auto' && isMobileScreen);
  
  const scaleRatio = isScaled && containerWidth > 0 
    ? Math.min(1, containerWidth / targetVirtualWidth) 
    : 1;

  return (
    <div className={`space-y-3 transition-all duration-300 ${
      isFullscreen 
        ? "fixed inset-0 z-50 bg-slate-950/95 p-2 sm:p-5 flex flex-col backdrop-blur-md" 
        : "w-full"
    }`}>
      {/* Top Header & Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2.5 shadow-lg select-none">
        <div className="flex items-center space-x-2.5">
          <span className="text-xl sm:text-2xl">📦</span>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-lg font-black text-slate-100">
                Artale 掉落物資料庫
              </h3>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] sm:text-xs rounded-full font-bold font-mono">
                {isScaled ? "📱 手機防破版縮放中" : "寬螢幕標準"}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden xs:block">
              直接在遠征隊系統內查詢怪物掉落、裝備掉落率與道具來源資訊
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Scale Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setScaleMode('auto')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                scaleMode === 'auto' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="依據螢幕寬度自動套用最佳縮放"
            >
              自動
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('desktop')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                scaleMode === 'desktop' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="強制寬版桌面比例（防擠壓疊字）"
            >
              防擠壓
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('standard')}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                scaleMode === 'standard' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="原始 100% 比例"
            >
              原始
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            title="重新載入掉落物頁面"
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-700 transition text-xs font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">重整</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "退出全螢幕" : "切換全螢幕檢視"}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-slate-700 transition text-xs font-bold flex items-center space-x-1 cursor-pointer active:scale-95"
          >
            <span>{isFullscreen ? "🗗" : "⛶"}</span>
            <span className="hidden sm:inline">{isFullscreen ? "視窗" : "全螢幕"}</span>
          </button>

          <a
            href={dropUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="在新分頁開啟完整網頁"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 !text-white px-3 py-1.5 sm:py-2 rounded-xl shadow font-extrabold text-xs flex items-center space-x-1 transition active:scale-95 cursor-pointer"
          >
            <span>新分頁</span>
            <span>↗️</span>
          </a>
        </div>
      </div>

      {/* Embedded iFrame Frame Container */}
      <div 
        ref={containerRef}
        className={`bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative transition-all ${
          isFullscreen ? "flex-1 w-full h-full min-h-0" : "h-[620px] sm:h-[780px] md:h-[840px] w-full"
        }`}
      >
        {/* Loading Spinner Indicator */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center space-y-3 z-10 select-none">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-bold">
              正在載入 Artale 掉落物資料庫...
            </p>
          </div>
        )}

        {/* Scaled viewport container for mobile anti-breakage */}
        <div 
          className="w-full h-full overflow-auto relative"
          style={{
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {isScaled ? (
            <div
              style={{
                width: `${targetVirtualWidth}px`,
                height: `${(1 / scaleRatio) * 100}%`,
                transform: `scale(${scaleRatio})`,
                transformOrigin: 'top left',
              }}
              className="absolute top-0 left-0"
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={dropUrl}
                title="Artale Drop Table Database"
                className="w-full h-full border-0 bg-white"
                onLoad={() => setIsLoading(false)}
                allow="clipboard-read; clipboard-write; fullscreen"
                loading="lazy"
              />
            </div>
          ) : (
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={dropUrl}
              title="Artale Drop Table Database"
              className="w-full h-full border-0 bg-white"
              onLoad={() => setIsLoading(false)}
              allow="clipboard-read; clipboard-write; fullscreen"
              loading="lazy"
            />
          )}
        </div>
      </div>
    </div>
  );
};
