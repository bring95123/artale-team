import React, { useMemo, useState } from 'react';
import { GACHA_FORTUNES, GACHA_SPOTS } from '../types';
import JobIcon from './JobIcon';
import { motion } from 'motion/react';

interface FortuneRecord {
  id: string; // userId
  userId: string;
  ign: string;
  job: string;
  level: number;
  timestamp: number;
  fortuneStatus: string;
  fortuneColor: string;
  fortuneDesc: string;
  luckyNumbers: string;
  spot: string;
  wishingNote?: string;
  discord?: {
    username: string;
    avatar: string;
  } | null;
}

interface FortuneDashboardProps {
  fortunesList: FortuneRecord[];
  activeCharacter: { ign: string; job: string; level: number } | null;
  customUid: string | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Map fortune status to a numerical luck score for statistical aggregate analysis
const getLuckScore = (status: string): number => {
  const s = status || '';
  if (s.includes('超大吉')) return 100;
  if (s.includes('大吉')) return 85;
  if (s.includes('中吉')) return 70;
  if (s.includes('吉')) return 55;
  if (s.includes('末吉')) return 40;
  if (s.includes('平')) return 25;
  if (s.includes('凶')) return 10;
  return 50;
};

const getJobCategory = (job: string): string => {
  const s = job || '';
  if (['英雄', '十字軍', '狂戰士', '聖騎士', '騎士', '黑騎士', '龍騎士', '槍騎兵', '戰士', '劍士'].some(kw => s.includes(kw))) return '劍士';
  if (['主教', '祭司', '僧侶', '火毒', '冰雷', '魔導士', '大魔導士', '法師', '魔法師'].some(kw => s.includes(kw))) return '魔法師';
  if (['箭神', '神射手', '遊俠', '狙擊手', '獵人', '弩弓手', '弓箭手'].some(kw => s.includes(kw))) return '弓箭手';
  if (['暗影神偷', '夜使者', '神偷', '暗殺者', '俠盜', '刺客', '盜賊'].some(kw => s.includes(kw))) return '盜賊';
  if (['拳霸', '槍神', '格鬥家', '神槍手', '打手', '槍手', '海盜'].some(kw => s.includes(kw))) return '海盜';
  return '冒險家';
};

const getJobColor = (cat: string): string => {
  switch (cat) {
    case '劍士': return '#ef4444'; // Red
    case '魔法師': return '#3b82f6'; // Blue
    case '弓箭手': return '#10b981'; // Emerald
    case '盜賊': return '#a855f7'; // Purple
    case '海盜': return '#f59e0b'; // Amber
    default: return '#94a3b8'; // Slate
  }
};

export default function FortuneDashboard({
  fortunesList = [],
  activeCharacter,
  customUid,
  showToast
}: FortuneDashboardProps) {
  const [filterJobCategory, setFilterJobCategory] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'all'>('today');

  // Calculates whether a timestamp belongs to the current "today's pull" (after 8:00 AM reset)
  const isTodayPull = (timestamp: number) => {
    if (!timestamp) return false;
    const now = new Date();
    const pullDate = new Date(timestamp);

    const getEightAmTarget = (date: Date) => {
      const d = new Date(date);
      d.setHours(8, 0, 0, 0);
      return d.getTime();
    };

    const nowEightAm = getEightAmTarget(now);
    const lastEightAmThreshold = now.getTime() >= nowEightAm ? nowEightAm : nowEightAm - 24 * 60 * 60 * 1000;
    return timestamp >= lastEightAmThreshold;
  };

  // Filtered list based on active filters
  const filteredRecords = useMemo(() => {
    return fortunesList.filter(record => {
      // 1. Time Filter
      if (timeFilter === 'today' && !isTodayPull(record.timestamp)) {
        return false;
      }
      // 2. Job Filter
      if (filterJobCategory !== 'all') {
        const cat = getJobCategory(record.job);
        if (cat !== filterJobCategory) return false;
      }
      return true;
    }).sort((a, b) => b.timestamp - a.timestamp); // Sort by latest timestamp
  }, [fortunesList, filterJobCategory, timeFilter]);

  // Overall Statistics aggregates
  const stats = useMemo(() => {
    // Only compile stats for active list matching the current time filter (to be statistically honest!)
    const targetList = fortunesList.filter(r => timeFilter === 'today' ? isTodayPull(r.timestamp) : true);

    if (targetList.length === 0) {
      return {
        totalCount: 0,
        avgLuckScore: 0,
        luckiestPlayer: null,
        unluckiestPlayer: null,
        spotRankings: [],
        jobGroupLuck: {}
      };
    }

    let sumScore = 0;
    let maxScore = -1;
    let minScore = 999;
    let luckiest: FortuneRecord | null = null;
    let unluckiest: FortuneRecord | null = null;

    // Spot counts and score aggregates
    const spotMeta: { [name: string]: { count: number; sumScore: number } } = {};
    
    // Job family aggregates
    const jobGroupMeta: { [cat: string]: { count: number; sumScore: number } } = {
      '劍士': { count: 0, sumScore: 0 },
      '魔法師': { count: 0, sumScore: 0 },
      '弓箭手': { count: 0, sumScore: 0 },
      '盜賊': { count: 0, sumScore: 0 },
      '海盜': { count: 0, sumScore: 0 }
    };

    targetList.forEach(r => {
      const score = getLuckScore(r.fortuneStatus);
      sumScore += score;

      // Luckiest seeker selection
      if (score > maxScore || (score === maxScore && r.timestamp > (luckiest?.timestamp || 0))) {
        maxScore = score;
        luckiest = r;
      }

      // Unluckiest seeker selection
      if (score < minScore || (score === minScore && r.timestamp > (unluckiest?.timestamp || 0))) {
        minScore = score;
        unluckiest = r;
      }

      // Spot stats mapping
      // Extract main location name up to the emoji or space
      const spotRaw = r.spot || '';
      const spotClean = spotRaw.split(' (')[0] || '未知聖地';
      if (!spotMeta[spotClean]) {
        spotMeta[spotClean] = { count: 0, sumScore: 0 };
      }
      spotMeta[spotClean].count += 1;
      spotMeta[spotClean].sumScore += score;

      // Job group mapping
      const cat = getJobCategory(r.job);
      if (jobGroupMeta[cat]) {
        jobGroupMeta[cat].count += 1;
        jobGroupMeta[cat].sumScore += score;
      }
    });

    const averageLuck = Math.round(sumScore / targetList.length);

    // Sort spots by popularity and then average luck
    const sortedSpots = Object.entries(spotMeta).map(([name, data]) => ({
      name,
      count: data.count,
      avgLuck: Math.round(data.sumScore / data.count)
    })).sort((a, b) => b.count - a.count || b.avgLuck - a.avgLuck).slice(0, 5);

    // Calculate job percentage scores
    const finalJobLuck: { [cat: string]: number } = {};
    Object.entries(jobGroupMeta).forEach(([cat, data]) => {
      finalJobLuck[cat] = data.count > 0 ? Math.round(data.sumScore / data.count) : 0;
    });

    return {
      totalCount: targetList.length,
      avgLuckScore: averageLuck,
      luckiestPlayer: luckiest,
      unluckiestPlayer: unluckiest,
      spotRankings: sortedSpots,
      jobGroupLuck: finalJobLuck
    };
  }, [fortunesList, timeFilter]);

  // Overall Luck evaluation level words
  const luckEvaluation = useMemo(() => {
    const score = stats.avgLuckScore;
    if (stats.totalCount === 0) {
      return { text: '神殿幽靜，尚未有祈願者...', color: 'text-slate-500', icon: '🍃' };
    }
    if (score >= 80) {
      return { text: '極致紅金！公會歐皇降世，衝星衝卷概率暴增，團體出發必爆極品！', color: 'text-amber-400 font-extrabold', icon: '🌌' };
    }
    if (score >= 65) {
      return { text: '氣運亨通！公會上空祥雲籠罩，出征挑戰 Boss、洗練裝備有神秘加成。', color: 'text-emerald-400 font-bold', icon: '✨' };
    }
    if (score >= 45) {
      return { text: '運氣均衡！今天是一個平穩的日子，不宜隨意砸10%大卷，推薦扎實發育。', color: 'text-indigo-400', icon: '🌤️' };
    }
    return { text: '水逆罩頂！公會氣壓較低，走在路上注意地圖事故，衝卷必爆！推薦在神木村靜坐吸吸仙氣。', color: 'text-rose-400 font-bold', icon: '🌧️' };
  }, [stats]);

  // Count active fortune distribution details
  const gradeDistribution = useMemo(() => {
    const targetList = fortunesList.filter(r => timeFilter === 'today' ? isTodayPull(r.timestamp) : true);
    const countsRef: { [status: string]: number } = {
      '超大吉!': 0,
      '大吉': 0,
      '中吉': 0,
      '吉': 0,
      '末吉': 0,
      '平': 0,
      '凶': 0
    };

    targetList.forEach(r => {
      const s = r.fortuneStatus || '';
      if (s.includes('超大吉')) countsRef['超大吉!']++;
      else if (s.includes('大吉')) countsRef['大吉']++;
      else if (s.includes('中吉')) countsRef['中吉']++;
      else if (s.includes('吉')) countsRef['吉']++;
      else if (s.includes('末吉')) countsRef['末吉']++;
      else if (s.includes('平')) countsRef['平']++;
      else if (s.includes('凶')) countsRef['凶']++;
    });

    return Object.entries(countsRef).map(([grade, val]) => ({
      grade,
      count: val,
      percentage: targetList.length > 0 ? Math.round((val / targetList.length) * 100) : 0
    }));
  }, [fortunesList, timeFilter]);

  return (
    <div id="fortune-data-center" className="mb-8 p-6 md:p-8 rounded-3xl bg-slate-900 border border-indigo-505 border-indigo-500/15 shadow-2xl relative overflow-hidden select-none">
      
      {/* Background stardust glow ornaments */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-650/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-650/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header section with starry theme */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 border-b border-slate-800 pb-5 mb-6">
        <div>
          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] uppercase rounded-lg font-black tracking-wider">
            🔮 ✦ 星空大數據分析 ✦ 🔮
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-100 mt-2 flex items-center gap-2">
            <span>🌌 公會「星空運勢大數據」看板</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            即時解碼公會冒險家今日之「命運神籤分佈」、「衝裝聖地熱力點」與「各職業氣運修煉」大數據！
          </p>
        </div>

        {/* Dashboard Switch Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 select-none">
          <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${timeFilter === 'today' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              📅 僅看今日運勢 (08:00重置)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black transition-all ${timeFilter === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              📊 所有歷史累計
            </button>
          </div>
        </div>
      </div>

      {/* Primary Analytics Summary Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Metric Card 1: Prayers Count */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4.5">
          <span className="text-3xl bg-slate-900 border border-slate-850 p-3 rounded-2xl">🔮</span>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">今日累計參拜/祈福</span>
            <span className="text-2xl font-black text-slate-100 mt-0.5 block font-mono">
              {stats.totalCount} <span className="text-xs text-slate-400">位成員</span>
            </span>
          </div>
        </div>

        {/* Metric Card 2: Average Guild Luck index */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-4.5">
          <span className="text-3xl bg-slate-900 border border-slate-850 p-3 rounded-2xl">💫</span>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">公會平均歐氣值</span>
            <div className="flex items-end gap-2 mt-0.5">
              <span className="text-2xl font-black text-amber-400 font-mono leading-none">{stats.avgLuckScore}%</span>
              <span className="text-[10px] font-black text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded-md self-center">
                {stats.avgLuckScore >= 80 ? '超歐氣' : stats.avgLuckScore >= 60 ? '吉利' : stats.avgLuckScore >= 40 ? '平庸' : '水逆中'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric Card 3: Ultimate visual text review */}
        <div className="col-span-1 lg:col-span-2 p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex gap-3.5 items-center">
          <span className="text-3xl shrink-0 bg-slate-900/50 p-2.5 border border-slate-850 rounded-xl">{luckEvaluation.icon}</span>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">命運神官今日批註</span>
            <p className={`text-xs mt-1 leading-relaxed ${luckEvaluation.color}`}>{luckEvaluation.text}</p>
          </div>
        </div>

      </div>

      {/* BENTO GRID: Left stats panels, Right award + wall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Data-Charts aggregates (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Sub-card 1: Fortune Grade distribution */}
          <div className="p-5 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊 氣運神籤分佈佔比表</span>
            </h4>
            
            <div className="space-y-3 font-mono">
              {stats.totalCount === 0 ? (
                <div className="py-12 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-600 italic">
                  今日尚無大數據，等待公會成員抽取今日籤...
                </div>
              ) : (
                gradeDistribution.map(item => {
                  let barColor = 'bg-slate-600';
                  let textColor = 'text-slate-400';
                  if (item.grade === '超大吉!') { barColor = 'bg-radial from-orange-400 to-amber-500'; textColor = 'text-amber-400 font-extrabold'; }
                  else if (item.grade === '大吉') { barColor = 'bg-gradient-to-r from-emerald-500 to-teal-400'; textColor = 'text-emerald-400 font-bold'; }
                  else if (item.grade === '中吉') { barColor = 'bg-gradient-to-r from-blue-500 to-indigo-500'; textColor = 'text-blue-400'; }
                  else if (item.grade === '吉') { barColor = 'bg-slate-400'; textColor = 'text-slate-300'; }
                  else if (item.grade === '末吉') { barColor = 'bg-orange-500/80'; textColor = 'text-orange-400'; }
                  else if (item.grade === '平') { barColor = 'bg-purple-600'; textColor = 'text-purple-400'; }
                  else if (item.grade === '凶') { barColor = 'bg-red-650'; textColor = 'text-rose-500 font-bold'; }

                  return (
                    <div key={item.grade} className="flex items-center gap-3">
                      {/* Name badge */}
                      <span className={`w-18 text-[11px] truncate uppercase text-left ${textColor}`}>{item.grade}</span>
                      
                      {/* Interactive visual progress scale bar */}
                      <div className="flex-1 h-3.5 bg-slate-900 border border-slate-850/60 rounded-full overflow-hidden relative">
                        {item.count > 0 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${barColor}`}
                          />
                        )}
                        {item.percentage > 0 && (
                          <span className="absolute right-2 top-0 text-[9px] text-slate-350 leading-tight antialiased font-semibold">
                            {item.percentage}%
                          </span>
                        )}
                      </div>

                      {/* Count metric */}
                      <span className="w-8 text-[11px] text-right text-slate-500 font-bold">{item.count} 籤</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sub-card 2: Job class war of luck stats */}
          <div className="p-5 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚔️ 氣運大比拼</span>
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              平均各職業大系抽出的神籤氣運，分數越高今日推王衝卷加幅越完美！
            </p>

            {stats.totalCount === 0 ? (
              <div className="py-8 text-center text-xs text-slate-600 italic">尚無參拜戰績...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 font-mono select-none">
                {(Object.entries(stats.jobGroupLuck) as [string, number][]).map(([cat, score]) => {
                  const jobColor = getJobColor(cat);
                  
                  return (
                    <div key={cat} className="p-3 bg-slate-900/50 border border-slate-850/80 rounded-xl relative flex flex-col justify-between items-center text-center gap-2">
                      <span className="text-[11px] font-black tracking-wider text-slate-300">{cat}</span>
                      
                      {/* Vertical circular dynamic indicator */}
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="26" stroke="#101726" strokeWidth="3" fill="transparent" />
                          <circle cx="32" cy="32" r="26" stroke={jobColor} strokeWidth="3.5" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 26}
                            strokeDashoffset={2 * Math.PI * 26 * (1 - score / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute font-mono font-black text-slate-200 text-xs">{score}%</span>
                      </div>

                      <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 border border-slate-800 rounded-md">
                        {score >= 80 ? '👑 極神' : score >= 60 ? '✨ 瑞兆' : score >= 40 ? '🌱 平穩' : '🌧️ 待洗'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-card 3: Ultimate sacred upgrade spots ranking */}
          <div className="p-5 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔨 公會今日最佳「衝星衝卷 • 風水寶地榜」</span>
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              根據全體成員今日已抽中神籤結果，智慧列出最佳名勝，附帶今日累積參拜次數及該寶地平均好運加幅。
            </p>

            <div className="space-y-2.5">
              {stats.totalCount === 0 ? (
                <div className="py-8 text-center text-xs text-slate-600 italic">尚未挖掘到今日最佳衝卷點...</div>
              ) : stats.spotRankings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-600 italic">暫無有效位置數據...</div>
              ) : (
                stats.spotRankings.map((spot, index) => {
                  return (
                    <div key={spot.name} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-850 text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs shadow-md ${
                          index === 0 ? 'bg-amber-500 text-slate-950' : 
                          index === 1 ? 'bg-slate-350 text-slate-900' : 
                          index === 2 ? 'bg-amber-800 text-slate-100' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-extrabold text-slate-200">{spot.name}</span>
                      </div>

                      <div className="flex items-center gap-3.5 font-mono">
                        <span className="text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-md font-semibold text-[10.5px]">
                          📢 累計參拜：{spot.count} 次
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-black ${
                          spot.avgLuck >= 80 ? 'bg-amber-500/10 text-amber-300' : 
                          spot.avgLuck >= 60 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-950 text-slate-450'
                        }`}>
                          歐氣值: {spot.avgLuck}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Awards panel & Starry Wishing Wall (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Subcard A: Guild stars of fortune (Luckiest / Unluckiest) */}
          <div className="p-5 bg-slate-955 bg-gradient-to-b from-indigo-950/30 to-slate-950 border border-slate-800/80 rounded-2xl space-y-4">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏆 今日公會「命運之星」得主</span>
            </h4>

            {stats.totalCount === 0 || !stats.luckiestPlayer ? (
              <div className="py-12 text-center text-xs text-slate-600 italic">
                命運輪盤尚未開啟...
              </div>
            ) : (
              <div className="space-y-4 select-none">
                
                {/* LUCKIEST PLAYER CARD */}
                <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-indigo-500/5 border border-amber-500/30 rounded-xl relative overflow-hidden">
                  <div className="absolute right-3 top-3 text-7xl opacity-5 select-none font-black">👑</div>
                  <span className="text-[9px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black tracking-wider uppercase block w-max shadow">
                    🥇 今日公會大歐皇 (Sun Bearer)
                  </span>
                  
                  <div className="flex items-center gap-3.5 mt-3">
                    {stats.luckiestPlayer.discord ? (
                      <img src={stats.luckiestPlayer.discord.avatar} className="w-10 h-10 rounded-full border-2 border-amber-500 shadow-md shadow-amber-500/15" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center border-2 border-amber-500 text-slate-350 text-lg">☀️</div>
                    )}
                    <div>
                      <h5 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                        <span>{stats.luckiestPlayer.ign}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Lv.{stats.luckiestPlayer.level}</span>
                      </h5>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                        <JobIcon jobName={stats.luckiestPlayer.job} sizeClass="w-3 h-3" />
                        <span>{stats.luckiestPlayer.job}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 p-2 rounded-lg bg-black/40 text-[11px] leading-relaxed border border-white/5 space-y-1 text-slate-300">
                    <p className="text-amber-300 font-black flex items-center gap-1">
                      <span>🔮 求中：</span> 
                      <span>{stats.luckiestPlayer.fortuneStatus}</span>
                    </p>
                    <p className="text-slate-400 line-clamp-2 italic">“ {stats.luckiestPlayer.fortuneDesc} ”</p>
                  </div>
                </div>

                {/* UNLUCKIEST PLAYER CARD */}
                {stats.unluckiestPlayer && stats.unluckiestPlayer.id !== stats.luckiestPlayer.id && (
                  <div className="p-3.5 bg-gradient-to-r from-red-500/5 to-slate-900 border border-red-500/20 rounded-xl relative overflow-hidden">
                    <div className="absolute right-3 top-3 text-7xl opacity-5 select-none font-black">💀</div>
                    <span className="text-[9px] bg-red-500/15 text-rose-400 border border-red-500/30 px-2 py-0.5 rounded font-black tracking-wider uppercase block w-max">
                      🌧️ 今日公會水逆王 (Dark Dweller)
                    </span>
                    
                    <div className="flex items-center gap-3.5 mt-3">
                      {stats.unluckiestPlayer.discord ? (
                        <img src={stats.unluckiestPlayer.discord.avatar} className="w-10 h-10 rounded-full border-2 border-rose-500/30 shadow-md" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center border-2 border-slate-700 text-slate-500 text-lg">🌫️</div>
                      )}
                      <div>
                        <h5 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                          <span>{stats.unluckiestPlayer.ign}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Lv.{stats.unluckiestPlayer.level}</span>
                        </h5>
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                          <JobIcon jobName={stats.unluckiestPlayer.job} sizeClass="w-3 h-3" />
                          <span>{stats.unluckiestPlayer.job}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3.5 p-2 rounded-lg bg-black/40 text-[11px] leading-relaxed border border-white/5 space-y-1 text-slate-300">
                      <p className="text-rose-400 font-black flex items-center gap-1">
                        <span>💀 求中：</span> 
                        <span>{stats.unluckiestPlayer.fortuneStatus}</span>
                      </p>
                      <p className="text-slate-400 line-clamp-2 italic font-semibold">“ 今天別亂衝裝，去買張椅子在村莊發呆最吉利唷！ ”</p>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Subcard B: Starry Wishing Wall Grid panel list */}
          <div className="p-5 bg-slate-950 border border-slate-800/80 rounded-2xl flex flex-col h-[400px]">
            <div className="mb-3">
              <h4 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⭐ 星空祈願牆 (Guild Wishing Wall)</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">看大家都在許願什麼吧！在求籤前寫下心願即可展示在此！</p>
            </div>

            {/* Scrollable container of sticky notes */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-slate-300 select-none">
              {filteredRecords.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 text-xs italic py-12">
                  <span>💫 祈願牆繁星寂靜</span>
                  <span className="mt-1">符合當前篩選條件的祈福籤為空。</span>
                </div>
              ) : (
                filteredRecords.map(record => {
                  const luckGrade = record.fortuneStatus || '平';
                  const isGoldGlow = luckGrade.includes('超大吉');
                  const isGoodGlow = luckGrade.includes('大吉');

                  // Funny Maple default wish if empty
                  const defaultWishText = record.wishingNote 
                    ? record.wishingNote 
                    : record.job === '主教' ? '希望能輕鬆洗到完美神聖祈禱與全隊滿溢的頂級奶量！⛪' 
                    : record.job === '夜使者' ? '希望今日鏢鏢到肉、衝30%卷軸白字狂暴出擊！⭐' 
                    : record.job === '黑騎士' ? '希望能抱緊HP血條、全隊永不罹難斷氣！🔥' 
                    : '希望今天打寶推王能掉極品，白裝成功一擊必殺！🔨';

                  return (
                    <div 
                      key={record.id + '-' + record.timestamp} 
                      className={`p-3.5 rounded-2xl border transition duration-300 flex flex-col gap-2 relative group hover:border-slate-600 ${
                        isGoldGlow ? 'bg-amber-950/20 border-amber-500/35 shadow-amber-500/5 shadow' :
                        isGoodGlow ? 'bg-emerald-950/15 border-emerald-500/25' : 'bg-slate-900/60 border-slate-850'
                      }`}
                    >
                      {/* Note Header: User avatar & details */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {record.discord ? (
                            <img src={record.discord.avatar} className="w-6 h-6 rounded-full border border-slate-700" />
                          ) : (
                            <span className="text-xs">👤</span>
                          )}
                          <div>
                            <span className="text-xs font-black text-slate-100 block max-w-[100px] truncate" title={record.ign}>{record.ign}</span>
                            <div className="flex items-center gap-1 text-[9px] text-slate-450 text-slate-400 font-mono scale-95 origin-left">
                              <JobIcon jobName={record.job} sizeClass="w-2.5 h-2.5" />
                              <span className="truncate">{record.job}</span>
                            </div>
                          </div>
                        </div>

                        {/* Fortune badge indicator */}
                        <div className="text-right">
                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-bold ${
                            isGoldGlow ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' :
                            isGoodGlow ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}>
                            {luckGrade.replace('【', '').split('】')[1] || luckGrade}
                          </span>
                          <span className="block text-[8px] text-slate-500 font-mono mt-1">
                            {new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Note Body: Wishing note or fallback text */}
                      <p className="text-[11px] leading-relaxed text-slate-200 mt-1 pl-1 border-l-2 border-indigo-500/30 font-semibold bg-indigo-950/10 py-1 px-1.5 rounded-r">
                        ✨ {defaultWishText}
                      </p>

                      {/* Small metadata details details */}
                      <div className="flex items-center justify-between text-[9px] text-slate-500 pl-1">
                        <span>📍  {record.spot.split(' (')[0]}</span>
                        <span className="font-mono">🎲 {record.luckyNumbers}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
