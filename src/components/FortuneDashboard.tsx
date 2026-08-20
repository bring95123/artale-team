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
  if (s.includes('超大吉') || s.includes('大吉')) return 100;
  if (s.includes('中吉')) return 85;
  if (s.includes('小吉')) return 70;
  if (s.includes('吉')) return 55;
  if (s.includes('末吉')) return 40;
  if (s.includes('平')) return 25;
  if (s.includes('大凶')) return 5;
  if (s.includes('凶')) return 15;
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
    case '魔法師': return '#0284c7'; // Blue
    case '弓箭手': return '#16a34a'; // Emerald
    case '盜賊': return '#7c3aed'; // Purple
    case '海盜': return '#d97706'; // Amber
    default: return '#64748b'; // Slate
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
      const spotKey = r.spot.split(' (')[0] || r.spot;
      if (!spotMeta[spotKey]) {
        spotMeta[spotKey] = { count: 0, sumScore: 0 };
      }
      spotMeta[spotKey].count += 1;
      spotMeta[spotKey].sumScore += score;

      // Job Group stats mapping
      const cat = getJobCategory(r.job);
      if (jobGroupMeta[cat]) {
        jobGroupMeta[cat].count += 1;
        jobGroupMeta[cat].sumScore += score;
      }
    });

    const avgLuckScore = Math.round(sumScore / targetList.length);

    // Sort spots by score and prayer count
    const spotRankings = Object.entries(spotMeta).map(([name, data]) => {
      return {
        name,
        count: data.count,
        avgLuck: Math.round(data.sumScore / data.count)
      };
    }).sort((a, b) => b.avgLuck !== a.avgLuck ? b.avgLuck - a.avgLuck : b.count - a.count).slice(0, 5);

    // Compute job group luck averages
    const jobGroupLuck: { [cat: string]: number } = {};
    Object.entries(jobGroupMeta).forEach(([cat, data]) => {
      jobGroupLuck[cat] = data.count > 0 ? Math.round(data.sumScore / data.count) : 50;
    });

    return {
      totalCount: targetList.length,
      avgLuckScore,
      luckiestPlayer: luckiest,
      unluckiestPlayer: unluckiest,
      spotRankings,
      jobGroupLuck
    };
  }, [fortunesList, timeFilter]);

  // Grade breakdown distribution (大吉, 中吉, 小吉, etc.)
  const gradeDistribution = useMemo(() => {
    const targetList = fortunesList.filter(r => timeFilter === 'today' ? isTodayPull(r.timestamp) : true);
    const counts: { [k: string]: number } = {
      '大吉': 0,
      '中吉': 0,
      '小吉': 0,
      '吉': 0,
      '末吉': 0,
      '凶': 0,
      '大凶': 0
    };

    targetList.forEach(r => {
      const s = r.fortuneStatus || '';
      if (s.includes('大吉')) counts['大吉']++;
      else if (s.includes('中吉')) counts['中吉']++;
      else if (s.includes('小吉')) counts['小吉']++;
      else if (s.includes('末吉')) counts['末吉']++;
      else if (s.includes('大凶')) counts['大凶']++;
      else if (s.includes('凶')) counts['凶']++;
      else counts['吉']++;
    });

    const total = targetList.length || 1;
    return Object.entries(counts).map(([grade, count]) => ({
      grade,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }, [fortunesList, timeFilter]);

  // Overall luck condition evaluation text
  const luckEvaluation = useMemo(() => {
    const score = stats.avgLuckScore;
    if (score >= 85) return { text: "天道降福！公會今日鴻運當頭，推倒黑龍王衝卷大獲全勝之兆！", color: "text-amber-700 font-extrabold", icon: "☀️" };
    if (score >= 70) return { text: "吉星高照！整體氣運平穩偏上，合適組織遠征隊與組隊任務！", color: "text-emerald-700 font-bold", icon: "✨" };
    if (score >= 50) return { text: "平常之心！今日無風無浪，謹慎點卷，穩紮穩打即可破關。", color: "text-indigo-700", icon: "🌱" };
    return { text: "水逆警報！命運神官提醒大家：今日衝裝宜收手，多在村莊發呆吟詩！", color: "text-rose-700 font-bold", icon: "🌧️" };
  }, [stats.avgLuckScore]);

  return (
    <div id="fortune-data-center" className="mb-6 p-4 sm:p-6 md:p-8 rounded-3xl bg-white border border-slate-200 shadow-md relative overflow-hidden select-none">
      
      {/* Header section with starry theme */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
        <div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] uppercase rounded-lg font-black tracking-wider">
            🔮 ✦ 星空大數據分析 ✦ 🔮
          </span>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 mt-2 flex items-center gap-2">
            <span>🌌 公會「星空運勢大數據」看板</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            即時解碼公會冒險家今日之「命運神籤分佈」、「衝裝聖地熱力點」與「各職業氣運修煉」大數據！
          </p>
        </div>

        {/* Dashboard Switch Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0 select-none">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${timeFilter === 'today' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
            >
              📅 僅看今日 (08:00重置)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('all')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${timeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
            >
              📊 所有歷史累計
            </button>
          </div>
        </div>
      </div>

      {/* Primary Analytics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        
        {/* Metric Card 1: Prayers Count */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5">
          <span className="text-2xl sm:text-3xl bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">🔮</span>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">今日累計參拜/祈福</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block font-mono">
              {stats.totalCount} <span className="text-xs text-slate-500 font-normal">位成員</span>
            </span>
          </div>
        </div>

        {/* Metric Card 2: Average Guild Luck index */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3.5">
          <span className="text-2xl sm:text-3xl bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm">💫</span>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">公會平均歐氣值</span>
            <div className="flex items-end gap-2 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono leading-none">{stats.avgLuckScore}%</span>
              <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md self-center">
                {stats.avgLuckScore >= 80 ? '超歐氣' : stats.avgLuckScore >= 60 ? '吉利' : stats.avgLuckScore >= 40 ? '平庸' : '水逆中'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric Card 3: Ultimate visual text review */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-3 items-center">
          <span className="text-2xl sm:text-3xl shrink-0 bg-white p-2.5 border border-slate-200 rounded-xl shadow-sm">{luckEvaluation.icon}</span>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">命運神官今日批註</span>
            <p className={`text-xs mt-0.5 leading-relaxed ${luckEvaluation.color}`}>{luckEvaluation.text}</p>
          </div>
        </div>

      </div>

      {/* BENTO GRID: Left stats panels, Right award + wall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* LEFT COLUMN: Data-Charts aggregates (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Sub-card 1: Fortune Grade distribution */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊 氣運神籤分佈佔比表</span>
            </h4>
            
            <div className="space-y-2.5 font-mono">
              {stats.totalCount === 0 ? (
                <div className="py-8 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-400 italic">
                  今日尚無大數據，等待公會成員抽取今日籤...
                </div>
              ) : (
                gradeDistribution.map(item => {
                  let barColor = 'bg-slate-400';
                  let textColor = 'text-slate-600';
                  if (item.grade === '大吉') { barColor = 'bg-gradient-to-r from-amber-500 to-orange-500'; textColor = 'text-amber-800 font-extrabold'; }
                  else if (item.grade === '中吉') { barColor = 'bg-gradient-to-r from-emerald-500 to-teal-500'; textColor = 'text-emerald-800 font-bold'; }
                  else if (item.grade === '小吉') { barColor = 'bg-gradient-to-r from-blue-500 to-indigo-500'; textColor = 'text-blue-800 font-semibold'; }
                  else if (item.grade === '吉') { barColor = 'bg-slate-400'; textColor = 'text-slate-700'; }
                  else if (item.grade === '末吉') { barColor = 'bg-orange-400'; textColor = 'text-orange-800'; }
                  else if (item.grade === '凶') { barColor = 'bg-purple-500'; textColor = 'text-purple-800'; }
                  else if (item.grade === '大凶') { barColor = 'bg-rose-500'; textColor = 'text-rose-800 font-bold'; }

                  return (
                    <div key={item.grade} className="flex items-center gap-2.5 sm:gap-3">
                      <span className={`w-14 sm:w-16 text-[11px] truncate uppercase text-left ${textColor}`}>{item.grade}</span>
                      
                      <div className="flex-1 h-3.5 bg-slate-200 rounded-full overflow-hidden relative">
                        {item.count > 0 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${barColor}`}
                          />
                        )}
                        {item.percentage > 0 && (
                          <span className="absolute right-2 top-0 text-[9px] text-slate-800 leading-tight antialiased font-semibold">
                            {item.percentage}%
                          </span>
                        )}
                      </div>

                      <span className="w-10 text-[11px] text-right text-slate-500 font-bold">{item.count} 籤</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sub-card 2: Job class war of luck stats */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚔️ 氣運大比拼</span>
            </h4>
            <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
              平均各職業大系抽出的神籤氣運，分數越高今日推王衝卷加幅越完美！
            </p>

            {stats.totalCount === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 italic">尚無參拜戰績...</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 font-mono select-none">
                {(Object.entries(stats.jobGroupLuck) as [string, number][]).map(([cat, score]) => {
                  const jobColor = getJobColor(cat);
                  
                  return (
                    <div key={cat} className="p-2.5 bg-white border border-slate-200 rounded-xl relative flex flex-col justify-between items-center text-center gap-1.5 shadow-sm">
                      <span className="text-[11px] font-black tracking-wider text-slate-800">{cat}</span>
                      
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="32" cy="32" r="26" stroke="#e2e8f0" strokeWidth="3" fill="transparent" />
                          <circle cx="32" cy="32" r="26" stroke={jobColor} strokeWidth="3.5" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 26}
                            strokeDashoffset={2 * Math.PI * 26 * (1 - score / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute font-mono font-black text-slate-800 text-xs">{score}%</span>
                      </div>

                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 border border-slate-200 rounded-md font-bold">
                        {score >= 80 ? '👑 極神' : score >= 60 ? '✨ 瑞兆' : score >= 40 ? '🌱 平穩' : '🌧️ 待洗'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-card 3: Ultimate sacred upgrade spots ranking */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔨 公會今日最佳「衝星衝卷 • 風水寶地榜」</span>
            </h4>

            <div className="space-y-2">
              {stats.totalCount === 0 || stats.spotRankings.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 italic">尚未挖掘到今日最佳衝卷點...</div>
              ) : (
                stats.spotRankings.map((spot, index) => {
                  return (
                    <div key={spot.name} className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs shadow-sm ${
                          index === 0 ? 'bg-amber-500 text-white' : 
                          index === 1 ? 'bg-slate-300 text-slate-800' : 
                          index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs">{spot.name}</span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 font-mono">
                        <span className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                          參拜：{spot.count} 次
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          spot.avgLuck >= 80 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 
                          spot.avgLuck >= 60 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          歐氣: {spot.avgLuck}%
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
        <div className="lg:col-span-5 space-y-5">
          
          {/* Subcard A: Guild stars of fortune (Luckiest / Unluckiest) */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
            <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>🏆 今日公會「命運之星」得主</span>
            </h4>

            {stats.totalCount === 0 || !stats.luckiestPlayer ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                命運輪盤尚未開啟...
              </div>
            ) : (
              <div className="space-y-3 select-none">
                
                {/* LUCKIEST PLAYER CARD */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl relative overflow-hidden shadow-sm">
                  <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded font-black tracking-wider uppercase block w-max shadow-sm">
                    🥇 今日公會大歐皇
                  </span>
                  
                  <div className="flex items-center gap-3 mt-2.5">
                    {stats.luckiestPlayer.discord ? (
                      <img src={stats.luckiestPlayer.discord.avatar} className="w-9 h-9 rounded-full border-2 border-amber-500 shadow-sm object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-400 text-amber-800 text-base">☀️</div>
                    )}
                    <div>
                      <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{stats.luckiestPlayer.ign}</span>
                        <span className="text-[10px] text-slate-500 font-mono">Lv.{stats.luckiestPlayer.level}</span>
                      </h5>
                      <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono mt-0.5">
                        <JobIcon jobName={stats.luckiestPlayer.job} sizeClass="w-3 h-3" />
                        <span>{stats.luckiestPlayer.job}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 p-2 rounded-lg bg-white/80 text-[11px] leading-relaxed border border-amber-200 space-y-0.5 text-slate-800">
                    <p className="text-amber-800 font-black flex items-center gap-1">
                      <span>🔮 求中：</span> 
                      <span>{stats.luckiestPlayer.fortuneStatus}</span>
                    </p>
                    <p className="text-slate-600 line-clamp-2 italic">“ {stats.luckiestPlayer.fortuneDesc} ”</p>
                  </div>
                </div>

                {/* UNLUCKIEST PLAYER CARD */}
                {stats.unluckiestPlayer && stats.unluckiestPlayer.id !== stats.luckiestPlayer.id && (
                  <div className="p-3.5 bg-gradient-to-r from-rose-50 to-slate-50 border border-rose-200 rounded-xl relative overflow-hidden shadow-sm">
                    <span className="text-[9px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-black tracking-wider uppercase block w-max">
                      🌧️ 今日公會水逆王
                    </span>
                    
                    <div className="flex items-center gap-3 mt-2.5">
                      {stats.unluckiestPlayer.discord ? (
                        <img src={stats.unluckiestPlayer.discord.avatar} className="w-9 h-9 rounded-full border-2 border-rose-300 shadow-sm object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center border-2 border-slate-300 text-slate-600 text-base">🌫️</div>
                      )}
                      <div>
                        <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{stats.unluckiestPlayer.ign}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Lv.{stats.unluckiestPlayer.level}</span>
                        </h5>
                        <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono mt-0.5">
                          <JobIcon jobName={stats.unluckiestPlayer.job} sizeClass="w-3 h-3" />
                          <span>{stats.unluckiestPlayer.job}</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 p-2 rounded-lg bg-white/80 text-[11px] leading-relaxed border border-rose-200 space-y-0.5 text-slate-800">
                      <p className="text-rose-700 font-black flex items-center gap-1">
                        <span>💀 求中：</span> 
                        <span>{stats.unluckiestPlayer.fortuneStatus}</span>
                      </p>
                      <p className="text-slate-600 line-clamp-2 italic font-semibold">“ 今天別亂衝裝，去買張椅子在村莊發呆最吉利唷！ ”</p>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Subcard B: Starry Wishing Wall Grid panel list */}
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col h-[380px]">
            <div className="mb-2.5">
              <h4 className="text-xs font-black text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>⭐ 星空祈願牆 (Guild Wishing Wall)</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">在求籤前寫下心願即可展示在此！</p>
            </div>

            {/* Scrollable container of sticky notes */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-slate-700 select-none">
              {filteredRecords.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs italic py-8">
                  <span>💫 祈願牆繁星寂靜</span>
                  <span className="mt-1">符合當前篩選條件的祈福籤為空。</span>
                </div>
              ) : (
                filteredRecords.map(record => {
                  const luckGrade = record.fortuneStatus || '吉';
                  const isGoldGlow = luckGrade.includes('大吉') || luckGrade.includes('超大吉');
                  const isGoodGlow = luckGrade.includes('中吉') || luckGrade.includes('小吉');

                  const defaultWishText = record.wishingNote 
                    ? record.wishingNote 
                    : record.job === '主教' ? '希望能輕鬆洗到完美神聖祈禱與全隊滿溢的頂級奶量！⛪' 
                    : record.job === '夜使者' ? '希望今日鏢鏢到肉、衝30%卷軸白字狂暴出擊！⭐' 
                    : record.job === '黑騎士' ? '希望能抱緊HP血條、全隊永不罹難斷氣！🔥' 
                    : '希望今天打寶推王能掉極品，白裝成功一擊必殺！🔨';

                  return (
                    <div 
                      key={record.id + '-' + record.timestamp} 
                      className={`p-3 rounded-2xl border transition duration-200 flex flex-col gap-1.5 shadow-sm ${
                        isGoldGlow ? 'bg-amber-50/70 border-amber-200' :
                        isGoodGlow ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Note Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {record.discord ? (
                            <img src={record.discord.avatar} className="w-5 h-5 rounded-full border border-slate-300 object-cover" />
                          ) : (
                            <span className="text-xs">👤</span>
                          )}
                          <div>
                            <span className="text-xs font-black text-slate-900 block max-w-[100px] truncate" title={record.ign}>{record.ign}</span>
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                              <JobIcon jobName={record.job} sizeClass="w-2.5 h-2.5" />
                              <span className="truncate">{record.job}</span>
                            </div>
                          </div>
                        </div>

                        {/* Fortune badge indicator */}
                        <div className="text-right">
                          <span className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-bold ${
                            isGoldGlow ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            isGoodGlow ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {luckGrade.replace('【', '').split('】')[1] || luckGrade}
                          </span>
                          <span className="block text-[8px] text-slate-400 font-mono mt-0.5">
                            {new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Note Body */}
                      <p className="text-[11px] leading-relaxed text-slate-800 pl-1 border-l-2 border-indigo-400 font-semibold bg-indigo-50/40 py-1 px-1.5 rounded-r">
                        ✨ {defaultWishText}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-[9px] text-slate-500 pl-1">
                        <span>📍 {record.spot.split(' (')[0]}</span>
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
