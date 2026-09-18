import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, getFirestore } from 'firebase/firestore';
import { Boss, BossGuideVideo, Character, DiscordUser, DEFAULT_JOB_CATEGORIES } from '../types';
import JobIcon from './JobIcon';

// Helper to extract YouTube video ID from various URL patterns
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If already pure 11 characters
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Common YouTube URL formats
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
    /^https?:\/\/(?:www\.)?youtube\.com\/live\/([\w-]{11})/
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

interface BossGuideHubProps {
  boss?: Boss;
  activeRaidId: string;
  appId: string;
  activeCharacter: Character;
  discordUser: DiscordUser | null;
  customUid: string;
  isCreator: boolean;
  isAdminLoggedIn: boolean;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// No preset mock videos - purely user uploaded
export default function BossGuideHub({
  boss,
  activeRaidId,
  appId,
  activeCharacter,
  discordUser,
  customUid,
  isCreator,
  isAdminLoggedIn,
  showToast
}: BossGuideHubProps) {
  const [guides, setGuides] = useState<BossGuideVideo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);

  // Form states for adding a new guide
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [inputJob, setInputJob] = useState('全體通用');
  const [inputDesc, setInputDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current boss key
  const currentBossId = boss?.id || 'general';
  const currentBossCleanName = boss?.name ? boss.name.split(' (')[0] : 'BOSS';

  // Extract all jobs for job selector
  const allJobOptions = useMemo(() => {
    const list: string[] = ['全體通用'];
    Object.values(DEFAULT_JOB_CATEGORIES).forEach(category => {
      Object.values(category).forEach(tierJobs => {
        tierJobs.forEach(j => {
          if (!list.includes(j)) list.push(j);
        });
      });
    });
    return list;
  }, []);

  // Sync guides from Firestore
  useEffect(() => {
    const db = getFirestore();
    const guidesRef = collection(db, `artifacts/${appId}/public/data/boss_guides`);

    const unsubscribe = onSnapshot(guidesRef, (snapshot) => {
      const serverGuides: BossGuideVideo[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as any;
        serverGuides.push({
          id: docSnap.id,
          ...data
        });
      });

      // Sort newest first
      serverGuides.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      setGuides(serverGuides);

      // Set initial video if none selected or if previous was deleted
      if (serverGuides.length > 0) {
        setSelectedVideoId(prev => (serverGuides.some(g => g.videoId === prev) ? prev : serverGuides[0].videoId));
      } else {
        setSelectedVideoId('');
      }
    }, (err) => {
      console.warn("Boss guides collection sync warning:", err);
      setGuides([]);
      setSelectedVideoId('');
    });

    return () => unsubscribe();
  }, [appId, currentBossId]);

  // Filtered list of guides based on selected job filter
  const filteredGuides = useMemo(() => {
    return guides.filter(g => {
      // Must match current boss or be general
      const matchBoss = !g.bossId || g.bossId === currentBossId || 
        (currentBossId.startsWith('zakum') && g.bossId.startsWith('zakum')) ||
        (currentBossId.startsWith('papu') && g.bossId.startsWith('papu'));
      if (!matchBoss && g.bossId !== 'general') return false;

      if (selectedJobFilter === 'all') return true;
      if (selectedJobFilter === 'my_job') {
        const myJob = activeCharacter?.job || '';
        return g.job === myJob || g.job === '全體通用';
      }
      return g.job === selectedJobFilter;
    });
  }, [guides, currentBossId, selectedJobFilter, activeCharacter?.job]);

  // The active video being played
  const activeVideo = useMemo(() => {
    return guides.find(g => g.videoId === selectedVideoId) || filteredGuides[0] || guides[0];
  }, [guides, selectedVideoId, filteredGuides]);

  // Parsed ID for real-time input preview
  const parsedPreviewVideoId = useMemo(() => {
    return extractYouTubeVideoId(inputUrl);
  }, [inputUrl]);

  // Handle submitting new YouTube video guide
  const handleAddGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractYouTubeVideoId(inputUrl);

    if (!videoId) {
      showToast("⚠️ 請輸入有效的 YouTube 影片網址！", "error");
      return;
    }

    if (!inputTitle.trim()) {
      showToast("⚠️ 請輸入攻略影片標題！", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const guidesRef = collection(db, `artifacts/${appId}/public/data/boss_guides`);

      const newGuideData = {
        bossId: currentBossId,
        bossName: currentBossCleanName,
        raidId: activeRaidId,
        job: inputJob,
        title: inputTitle.trim(),
        youtubeUrl: inputUrl.trim(),
        videoId: videoId,
        desc: inputDesc.trim() || "",
        uploaderIgn: activeCharacter?.ign || "熱心冒險家",
        uploaderJob: activeCharacter?.job || inputJob,
        uploaderDiscord: discordUser ? {
          id: discordUser.id,
          username: discordUser.username,
          avatar: discordUser.avatar
        } : null,
        createdAt: Date.now()
      };

      const docRef = await addDoc(guidesRef, newGuideData);
      
      // Auto switch player to newly added video
      setSelectedVideoId(videoId);
      showToast(`🎉 成功上傳【${inputJob}】BOSS 攻略影片！`, "success");

      // Reset form and close modal
      setInputUrl('');
      setInputTitle('');
      setInputJob('全體通用');
      setInputDesc('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error("Failed to add video guide:", err);
      showToast(`上傳失敗: ${err.message || '請確認網路連線'}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting a guide
  const handleDeleteGuide = async (guide: BossGuideVideo) => {
    if (!confirm(`確定要刪除這部攻略影片嗎？\n「${guide.title}」`)) return;

    try {
      const db = getFirestore();
      await deleteDoc(doc(db, `artifacts/${appId}/public/data/boss_guides/${guide.id}`));
      showToast("已成功刪除該攻略影片！", "success");
    } catch (err: any) {
      console.error("Failed to delete video guide:", err);
      showToast(`刪除失敗: ${err.message}`, "error");
    }
  };

  return (
    <div 
      id="expedition-synergy-room" 
      className="bg-slate-900/95 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6 transition-all"
    >
      {/* Top Header & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-5 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10.5px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1">
              <span>🎬</span>
              <span>BOSS 實戰影音庫</span>
            </span>
            <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10.5px] font-bold rounded-lg flex items-center gap-1">
              <span>{boss?.icon || '👑'}</span>
              <span>{currentBossCleanName}</span>
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>📺 各職業打王實戰攻略影片專區</span>
          </h3>
        </div>

        {/* Action Button: Paste YouTube URL */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeCharacter?.job) {
                setInputJob(activeCharacter.job);
              }
              setIsAddModalOpen(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl transition shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-95 cursor-pointer border border-rose-400/40"
          >
            <span className="text-base">➕</span>
            <span>貼上 YT 攻略連結</span>
          </button>
        </div>
      </div>

      {/* Main YouTube Embedded Video Player */}
      {activeVideo ? (
        <div className={`space-y-3 transition-all ${theaterMode ? 'w-full' : ''}`}>
          {/* 16:9 Aspect Ratio Embedded Player */}
          <div className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?autoplay=0&rel=0&modestbranding=1`}
              title={activeVideo.title}
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Video Metadata Bar */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center space-x-1.5 bg-slate-900 border border-slate-750 px-2.5 py-0.5 rounded-lg text-xs font-black text-slate-200">
                  <JobIcon jobName={activeVideo.job} sizeClass="w-3.5 h-3.5" />
                  <span>{activeVideo.job}</span>
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  • 推薦者：<strong className="text-slate-200">{activeVideo.uploaderIgn || '冒險家'}</strong>
                </span>
                {activeVideo.uploaderDiscord && (
                  <span className="inline-flex items-center space-x-1 bg-[#5865F2]/10 border border-[#5865F2]/30 px-1.5 py-0.5 rounded text-[10.5px] font-bold text-indigo-300">
                    <img src={activeVideo.uploaderDiscord.avatar} className="w-3 h-3 rounded-full" />
                    <span>@{activeVideo.uploaderDiscord.username}</span>
                  </span>
                )}
              </div>

              <h4 className="text-base sm:text-lg font-black text-white break-words">
                {activeVideo.title}
              </h4>

              {activeVideo.desc && (
                <div className="text-xs sm:text-sm text-slate-300 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-400 shrink-0 mt-0.5">💡 攻略重點：</span>
                  <span className="break-words select-text">{activeVideo.desc}</span>
                </div>
              )}
            </div>

            {/* Quick Controls */}
            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setTheaterMode(!theaterMode)}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title={theaterMode ? '縮小播放模式' : '劇院放大模式'}
              >
                <span>{theaterMode ? '◻️ 預設大小' : '⬛ 劇院模式'}</span>
              </button>

              <a
                href={activeVideo.youtubeUrl || `https://www.youtube.com/watch?v=${activeVideo.videoId}`}
                target="_blank"
                rel="noreferrer noopener"
                className="bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-300 hover:text-red-400 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                title="在 YouTube 原生頁面開啟"
              >
                <span>↗️ 開啟 YT</span>
              </a>

              {(isCreator || isAdminLoggedIn || activeVideo.uploaderIgn === activeCharacter?.ign) && (
                <button
                  type="button"
                  onClick={() => handleDeleteGuide(activeVideo)}
                  className="bg-rose-950/60 hover:bg-rose-900/80 border border-rose-900/80 text-rose-300 px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="刪除這部影片"
                >
                  <span>🗑️ 刪除</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <span className="text-4xl block">📹</span>
          <h4 className="text-base font-bold text-slate-300">目前尚無此 Boss 的攻略影片</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            歡迎點擊上方「貼上 YT 攻略連結」，為團隊提供主教、夜使者、黑騎士等各職業的實戰影片！
          </p>
        </div>
      )}

      {/* Filter Tabs by Job */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-300">
            <span>🔍 選擇職業分類：</span>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            共 {filteredGuides.length} 部攻略影片
          </span>
        </div>

        {/* Scrollable Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedJobFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 border cursor-pointer ${
              selectedJobFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            全部攻略 ({guides.length})
          </button>

          {activeCharacter?.job && (
            <button
              type="button"
              onClick={() => setSelectedJobFilter('my_job')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 border flex items-center gap-1.5 cursor-pointer ${
                selectedJobFilter === 'my_job'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <span>⭐ 我的職業</span>
              <JobIcon jobName={activeCharacter.job} sizeClass="w-3.5 h-3.5" />
              <span>{activeCharacter.job}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setSelectedJobFilter('全體通用')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 border cursor-pointer ${
              selectedJobFilter === '全體通用'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            🌟 全體通用
          </button>

          {/* Popular raid job pills */}
          {['主教', '黑騎士', '夜使者', '箭神', '英雄', '聖騎士', '神射手', '拳霸', '槍神', '暗影神偷', '火毒大魔導', '冰雷大魔導'].map((jobName) => {
            const hasVideo = guides.some(g => g.job === jobName);
            return (
              <button
                key={jobName}
                type="button"
                onClick={() => setSelectedJobFilter(jobName)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shrink-0 border flex items-center gap-1 cursor-pointer ${
                  selectedJobFilter === jobName
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : hasVideo
                      ? 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 text-slate-600 border-slate-850 hover:text-slate-400'
                }`}
              >
                <JobIcon jobName={jobName} sizeClass="w-3.5 h-3.5" />
                <span>{jobName}</span>
                {hasVideo && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Video Grid Cards */}
      {filteredGuides.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuides.map((guide) => {
            const isPlaying = guide.videoId === activeVideo?.videoId;

            return (
              <div
                key={guide.id}
                onClick={() => {
                  setSelectedVideoId(guide.videoId);
                  // Smoothly scroll back to player if on mobile
                  const player = document.getElementById('expedition-synergy-room');
                  if (player && window.innerWidth < 768) {
                    player.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`group relative rounded-2xl border p-3 flex flex-col justify-between transition-all cursor-pointer select-none ${
                  isPlaying
                    ? 'bg-slate-850 border-rose-500/80 ring-2 ring-rose-500/30 shadow-xl shadow-rose-950/40'
                    : 'bg-slate-950/90 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 shadow-md'
                }`}
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 mb-3">
                  <img
                    src={`https://img.youtube.com/vi/${guide.videoId}/mqdefault.jpg`}
                    alt={guide.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to high quality or placeholder
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${guide.videoId}/hqdefault.jpg`;
                    }}
                  />

                  {/* Play Badge Icon */}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition shadow-lg ${
                      isPlaying 
                        ? 'bg-rose-600 text-white scale-110 shadow-rose-600/50' 
                        : 'bg-black/70 text-white group-hover:scale-110 group-hover:bg-red-600'
                    }`}>
                      <span className="text-base ml-0.5">▶</span>
                    </div>
                  </div>

                  {/* Playing Tag */}
                  {isPlaying && (
                    <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-md animate-pulse">
                      正在播放
                    </span>
                  )}

                  {/* Job Tag */}
                  <span className="absolute bottom-2 left-2 bg-slate-950/90 backdrop-blur border border-slate-750 px-2 py-0.5 rounded-lg text-[10px] font-black text-slate-200 flex items-center gap-1 shadow">
                    <JobIcon jobName={guide.job} sizeClass="w-3 h-3" />
                    <span>{guide.job}</span>
                  </span>
                </div>

                {/* Title & Info */}
                <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                  <h5 className="text-sm font-extrabold text-slate-100 group-hover:text-amber-300 transition line-clamp-2 leading-snug">
                    {guide.title}
                  </h5>

                  {guide.desc && (
                    <p className="text-xs text-slate-400 line-clamp-1 leading-normal">
                      {guide.desc}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>👤 {guide.uploaderIgn || '冒險家'}</span>
                    </div>
                    <span className="text-[10px] text-slate-600">點擊播放</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs">
          {guides.length === 0
            ? '目前尚未上傳任何影片，點擊右上角「貼上 YT 攻略連結」即可上傳專屬該 Boss 的實戰影片！'
            : '此篩選條件下目前無攻略影片。'}
        </div>
      )}

      {/* Modal: Add YouTube Guide Link */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 w-full max-w-lg shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white text-xl p-1 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🎬</span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                貼上 YouTube 攻略影片連結
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              將您推薦或親自錄製的【{currentBossCleanName}】職業打王影片貼在此處，方便團隊隊員直接線上觀摩！
            </p>

            <form onSubmit={handleAddGuide} className="space-y-4">
              {/* YouTube URL input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  YouTube 影片網址 (URL) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
                <span className="text-[10.5px] text-slate-500 mt-1 block">
                  支援標準網址、youtu.be 短網址或 Shorts 影片格式。
                </span>
              </div>

              {/* Live Preview Thumbnail if valid */}
              {parsedPreviewVideoId && (
                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
                    <img
                      src={`https://img.youtube.com/vi/${parsedPreviewVideoId}/mqdefault.jpg`}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 text-white text-xs">
                      ▶
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block mb-1">
                      ✓ 成功解析 Video ID: {parsedPreviewVideoId}
                    </span>
                    <p className="text-xs text-slate-300 truncate">預覽影片已就緒</p>
                  </div>
                </div>
              )}

              {/* Video Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  影片標題 / 攻略重點名稱 <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：【主教】龍王右頭誘惑控怪＋解死光站位教學"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {/* Applicable Job */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  適用職業 (Job) <span className="text-rose-400">*</span>
                </label>
                <select
                  value={inputJob}
                  onChange={(e) => setInputJob(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-rose-500 transition cursor-pointer"
                >
                  {allJobOptions.map(job => (
                    <option key={job} value={job}>
                      {job === '全體通用' ? '🌟 全體通用' : job}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  攻略心得備註 / 時間軸重點 (選填)
                </label>
                <textarea
                  rows={2}
                  placeholder="例如：注意 18 分鐘進本體前先補聖火，誘惑組跳至左邊石台..."
                  value={inputDesc}
                  onChange={(e) => setInputDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition"
                />
              </div>

              {/* Submitter info notice */}
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>發布者標註：</span>
                <span className="font-bold text-slate-200">
                  {activeCharacter?.ign ? `${activeCharacter.ign} (${activeCharacter.job})` : '當前角色卡'}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !parsedPreviewVideoId}
                  className={`flex-1 font-extrabold py-2.5 rounded-xl transition text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSubmitting || !parsedPreviewVideoId
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-rose-950/50 active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>上傳儲存中...</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>儲存並即刻發布</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
