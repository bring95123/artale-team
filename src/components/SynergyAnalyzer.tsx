import React, { useState, useMemo } from 'react';
import { Participant, Boss } from '../types';
import JobIcon from './JobIcon';

interface SynergyAnalyzerProps {
  participants: Participant[];
  activeRaidId: string;
  partyCount: number;
  boss: Boss | undefined;
  isCreator: boolean;
  onApplyOptimization: (newParticipants: Participant[]) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

// Job matching helper categories
const isBishopPriest = (job: string) => {
  const s = job || '';
  return s.includes('主教') || s.includes('祭司') || s.toLowerCase().includes('bishop') || s.toLowerCase().includes('priest') || s.includes('僧侶');
};

const isDarkSpearman = (job: string) => {
  const s = job || '';
  return s.includes('黑騎士') || s.includes('龍騎士') || s.includes('槍騎兵') || s.toLowerCase().includes('knight') || s.toLowerCase().includes('spearman') || s.toLowerCase().includes('dk');
};

const isSharpBowman = (job: string) => {
  const s = job || '';
  return s.includes('箭神') || s.includes('神射手') || s.includes('遊俠') || s.includes('狙擊手') || s.toLowerCase().includes('bowmaster') || s.toLowerCase().includes('marksman') || s.toLowerCase().includes('ranger') || s.toLowerCase().includes('sniper') || s.includes('獵人') || s.includes('弩弓');
};

const isSpeedBuccaneer = (job: string) => {
  const s = job || '';
  return s.includes('拳霸') || s.includes('格鬥家') || s.includes('打手') || s.toLowerCase().includes('buccaneer') || s.toLowerCase().includes('marauder') || s.toLowerCase().includes('si');
};

const isRageHero = (job: string) => {
  const s = job || '';
  return s.includes('英雄') || s.includes('十字軍') || s.includes('狂戰士') || s.toLowerCase().includes('hero') || s.toLowerCase().includes('crusader') || s.toLowerCase().includes('rage');
};

const isPaladinOrders = (job: string) => {
  const s = job || '';
  if (s.includes('黑騎士') || s.includes('龍騎士') || s.includes('槍騎兵')) {
    return false;
  }
  return s.includes('聖騎士') || s.includes('白騎士') || s === '騎士' || s.toLowerCase().includes('paladin') || s.toLowerCase().includes('co') || s.toLowerCase().includes('order');
};

const isShadowerSmoke = (job: string) => {
  const s = job || '';
  return s.includes('暗影神偷') || s.includes('神偷') || s.includes('俠盜') || s.toLowerCase().includes('shadower') || s.toLowerCase().includes('smoke');
};

export default function SynergyAnalyzer({
  participants,
  activeRaidId,
  partyCount,
  boss,
  isCreator,
  onApplyOptimization,
  showToast
}: SynergyAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Filter actual active participants in lists
  const party1List = useMemo(() => participants.filter(p => p.party === '1' && !p.isPlaceholder), [participants]);
  const party2List = useMemo(() => participants.filter(p => p.party === '2' && !p.isPlaceholder), [participants]);
  const party3List = useMemo(() => participants.filter(p => p.party === '3' && !p.isPlaceholder), [participants]);
  const reservesList = useMemo(() => participants.filter(p => p.party === 'reserve' || !p.party), [participants]);

  // Compute party status/buffs helper
  const getPartyBuffs = (pList: Participant[]) => {
    const hasHS = pList.some(p => isBishopPriest(p.job));
    const hasHB = pList.some(p => isDarkSpearman(p.job));
    const hasSE = pList.some(p => isSharpBowman(p.job));
    const hasSI = pList.some(p => isSpeedBuccaneer(p.job));
    const hasRage = pList.some(p => isRageHero(p.job));
    const hasCO = pList.some(p => isPaladinOrders(p.job));
    const hasSmoke = pList.some(p => isShadowerSmoke(p.job));
    const hasMapleWarrior = pList.some(p => p.level >= 120);

    const buffs = [];
    if (hasHS) {
      buffs.push({
        id: 'hs',
        name: '神聖祈禱 (Holy Symbol)',
        effect: '組隊經驗值額外 +50% ~ +110%，提供滿滿聖光淨化庇佑。',
        color: 'border-blue-200 bg-blue-50/70 text-blue-900',
        icon: '⛪'
      });
    }
    if (hasHB) {
      buffs.push({
        id: 'hb',
        name: '神聖之火 (Hyper Body)',
        effect: '組隊最大血量(MaxHP)與魔力(MaxMP)增加 60%！高抗秒殺核心。',
        color: 'border-rose-200 bg-rose-50/70 text-rose-900',
        icon: '🔥'
      });
    }
    if (hasSE) {
      buffs.push({
        id: 'se',
        name: '會心之眼 (Sharp Eyes)',
        effect: '物理爆擊機率 +15%、爆擊最大傷害 +40%！打寶爆發神術。',
        color: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
        icon: '👁️'
      });
    }
    if (hasSI) {
      buffs.push({
        id: 'si',
        name: '極速領域 (Speed Infusion)',
        effect: '突破常規武器極速，攻擊速度強行提升 2 階，DPS 全面狂飆。',
        color: 'border-amber-200 bg-amber-50/70 text-amber-900',
        icon: '⚡'
      });
    }
    if (hasCO) {
      buffs.push({
        id: 'co',
        name: '戰鬥秩序 (Combat Orders)',
        effect: '突破技能極限上限，全體 4 轉技能等級上限 +2 級，能力全開！',
        color: 'border-violet-200 bg-violet-50/70 text-violet-900',
        icon: '🛡️'
      });
    }
    if (hasSmoke) {
      buffs.push({
        id: 'smoke',
        name: '煙霧彈障壁 (Smokescreen)',
        effect: '施放高科技煙幕，範圍內所有成員進入 30 秒完全無敵免疫傷害。',
        color: 'border-purple-200 bg-purple-50/70 text-purple-900',
        icon: '💨'
      });
    }
    if (hasRage) {
      buffs.push({
        id: 'rage',
        name: '憤怒之火 (Rage)',
        effect: '基礎物理攻擊力增加 20 點。物理職業輸出必備甜品。',
        color: 'border-slate-200 bg-slate-100 text-slate-800',
        icon: '⚔️'
      });
    }
    if (hasMapleWarrior) {
      buffs.push({
        id: 'mw',
        name: '楓葉祝福 (Maple Warrior)',
        effect: '全體主屬性百分比額外 +15%！神級全能被動加持。',
        color: 'border-pink-200 bg-pink-50/70 text-pink-900',
        icon: '🍁'
      });
    }

    return buffs;
  };

  // Calculate synergy score for a single party list (0 - 100)
  const calculatePartyScore = (pList: Participant[]) => {
    if (pList.length === 0) return 0;
    
    let score = 30; // base rating for presence
    
    const hasHS = pList.some(p => isBishopPriest(p.job));
    const hasHB = pList.some(p => isDarkSpearman(p.job));
    const hasSE = pList.some(p => isSharpBowman(p.job));
    const hasSI = pList.some(p => isSpeedBuccaneer(p.job));

    if (hasHS) score += 18;
    if (hasHB) score += 18;
    if (hasSE) score += 18;
    if (hasSI) score += 10;

    const distinctJobs = new Set(pList.map(p => p.job)).size;
    score += distinctJobs * 2;

    const avgLevel = pList.reduce((sum, p) => sum + p.level, 0) / pList.length;
    score += Math.min(10, avgLevel / 15);

    return Math.min(100, Math.round(score));
  };

  // Compute stats for current active armies
  const p1Score = useMemo(() => calculatePartyScore(party1List), [party1List]);
  const p2Score = useMemo(() => calculatePartyScore(party2List), [party2List]);
  const p3Score = useMemo(() => calculatePartyScore(party3List), [party3List]);

  const p1Buffs = useMemo(() => getPartyBuffs(party1List), [party1List]);
  const p2Buffs = useMemo(() => getPartyBuffs(party2List), [party2List]);
  const p3Buffs = useMemo(() => getPartyBuffs(party3List), [party3List]);

  const globalSynergyScore = useMemo(() => {
    let sum = p1Score;
    let counts = 1;

    if (partyCount >= 2) {
      sum += p2Score;
      counts++;
    }
    if (partyCount >= 3) {
      sum += p3Score;
      counts++;
    }

    return Math.round(sum / counts);
  }, [p1Score, p2Score, p3Score, partyCount]);

  // Overall evaluation text
  const evaluationRating = useMemo(() => {
    if (participants.length === 0) return { stars: '☆☆☆☆☆', text: '空空如也，隊友們還在路上...', color: 'text-slate-400' };
    if (globalSynergyScore >= 88) return { stars: '★★★★★', text: '夢幻極限隊伍！核心職業相性絕合，摧枯拉朽！', color: 'text-amber-600' };
    if (globalSynergyScore >= 75) return { stars: '★★★★☆', text: '頂規遠征陣容！主副 Buff 配備完整，推王猶如探囊取物。', color: 'text-emerald-600' };
    if (globalSynergyScore >= 60) return { stars: '★★★☆☆', text: '標準作戰小隊！生存或火力配備基本達標，注意走位！', color: 'text-indigo-600' };
    return { stars: '★★☆☆☆', text: '職業略顯鬆散！部分隊伍缺少關鍵 Healer 或 SE 大 Buff，建議最佳化。', color: 'text-rose-600' };
  }, [globalSynergyScore, participants]);

  // AI-like tactical advice list based on current layout
  const tacticalAdvices = useMemo(() => {
    const list: string[] = [];
    if (participants.length === 0) return ["💡 目前還沒有成員加入編組，在下方的名冊點選「錄取」即可同步分析！"];

    const bishopsInReserves = reservesList.filter(p => isBishopPriest(p.job));
    const bishopsIn1 = party1List.filter(p => isBishopPriest(p.job));
    const bishopsIn2 = party2List.filter(p => isBishopPriest(p.job));
    const bishopsIn3 = party3List.filter(p => isBishopPriest(p.job));

    if (party1List.length > 0 && bishopsIn1.length === 0) {
      list.push(`🔵 **遠征一隊 缺少主教/祭司**！該小隊將無法享受 Holy Symbol 的 EXP 經驗增幅，且遇到異常狀態無人解控。`);
    }
    if (partyCount >= 2 && party2List.length > 0 && bishopsIn2.length === 0) {
      list.push(`🟢 **遠征二隊 缺少主教/祭司**！建議調入專職輔助提供即時回復與神聖淨化。`);
    }
    if (partyCount >= 3 && party3List.length > 0 && bishopsIn3.length === 0) {
      list.push(`🟣 **遠征三隊 缺少主教/祭司**！Bishop 核心戰略地位關鍵。`);
    }

    if (bishopsInReserves.length > 0) {
      list.push(`⚠️ 出席警告：**預備/候補座中含有【主教/祭司：${bishopsInReserves.map(b => b.ign).join(', ')}】**！強烈建議將她/他調至缺少回復的主力隊中！`);
    }

    const hasBowmanIn1 = party1List.some(p => isSharpBowman(p.job));
    const nlsIn1 = party1List.filter(p => p.job === '夜使者');
    if (nlsIn1.length > 0 && !hasBowmanIn1) {
      list.push(`🎯 物理搭配警報：**遠征一隊 的【夜使者 (${nlsIn1.map(p=>p.ign).join(', ')})】隊中沒有「會心之眼」(SE) 射手**！夜使者的影分身與五鏢爆擊效益流失近 35%，建議將射手移至一隊同乘。`);
    }

    const hasBowmanIn2 = party2List.some(p => isSharpBowman(p.job));
    const nlsIn2 = party2List.filter(p => p.job === '夜使者');
    if (partyCount >= 2 && nlsIn2.length > 0 && !hasBowmanIn2) {
      list.push(`🎯 物理搭配警報：**遠征二隊 的【夜使者 (${nlsIn2.map(p=>p.ign).join(', ')})】未能與 箭神/神射手 配對過招**，爆擊收益受阻。`);
    }

    const totalDks = party1List.filter(p => isDarkSpearman(p.job)).length + 
                     (partyCount >= 2 ? party2List.filter(p => isDarkSpearman(p.job)).length : 0) + 
                     (partyCount >= 3 ? party3List.filter(p => isDarkSpearman(p.job)).length : 0);

    const squishies = participants.filter(p => p.party !== 'reserve' && (p.job === '夜使者' || p.job === '箭神' || p.job === '暗影神偷' || p.job === '神射手'));

    if (boss && ['horntail', 'papu_hard'].includes(boss.id) && squishies.length > 0 && totalDks === 0) {
      list.push(`❤️ 滅團高危警告：挑戰高難重案王 **${boss.name}** 生存壓力極大！隊中有皮脆紙防的盜賊與弓手，但**全主力隊均無【黑騎士】提供神聖之火 (HB)**，極易陷入大絕招直接空手秒殺的慘劇。`);
    }

    if (list.length === 0) {
      list.push("🏅 陣容無懈可擊！成員各歸其位，Buff 完全覆蓋，請指揮官直接帶隊碾壓 Boss 吧！");
    }

    return list.slice(0, 4);
  }, [participants, party1List, party2List, party3List, reservesList, partyCount, boss]);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-5 select-none" id="expedition-synergy-room">
      
      {/* Header and overview metric details */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-slate-100 pb-4 gap-3.5">
        <div>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] uppercase rounded-lg font-black tracking-wider">
            戰略指揮部 • 智慧核心
          </span>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
            <span>⚡ 遠征團戰力與 Buff 組合相性分析</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">智慧解構職業相性關聯，發揮 Holy Symbol / Sharp Eyes 最大覆蓋！</p>
        </div>

        {/* Dynamic score ring */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200 shrink-0">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#e2e8f0" strokeWidth="4" fill="transparent" />
              <circle cx="24" cy="24" r="20" stroke={globalSynergyScore >= 80 ? '#f59e0b' : globalSynergyScore >= 60 ? '#6366f1' : '#f43f5e'} strokeWidth="4" fill="transparent" 
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - globalSynergyScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono font-black text-slate-900 text-xs">{globalSynergyScore}%</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500 font-bold">總體相性指數</span>
              <span className={`text-xs font-black ${evaluationRating.color}`}>{evaluationRating.stars}</span>
            </div>
            <p className={`text-[11px] font-extrabold max-w-[210px] truncate leading-tight mt-0.5 ${globalSynergyScore >= 75 ? 'text-amber-700' : 'text-slate-700'}`}>{evaluationRating.text}</p>
          </div>
        </div>
      </div>

      {/* AI coach dynamic warnings panel wrapper */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-2">
        <h4 className="text-xs font-black text-amber-700 flex items-center gap-1.5">
          <span>🧠 遠征戰術指揮官の大局警報與提示：</span>
        </h4>
        <div className="space-y-2">
          {tacticalAdvices.map((advice, index) => {
            const isDanger = advice.includes('警告') || advice.includes('高危');
            const isPerfect = advice.includes('完美') || advice.includes('無懈可擊');
            
            return (
              <div 
                key={index} 
                className={`text-xs p-2.5 sm:p-3 rounded-xl border flex items-start gap-2 text-slate-800 leading-relaxed font-semibold transition ${
                  isDanger 
                    ? 'border-rose-300 bg-rose-50 text-rose-900 shadow-sm' 
                    : isPerfect 
                    ? 'border-amber-300 bg-amber-50 text-amber-900' 
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <span className="shrink-0 text-sm mt-0.5">
                  {isDanger ? '💀' : isPerfect ? '🏆' : '💡'}
                </span>
                <span dangerouslySetInnerHTML={{ __html: advice }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Tabs and Buff Layout detail panels */}
      <div>
        <div className="flex flex-wrap border-b border-slate-200 gap-1.5 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            📋 總體戰力綜覽
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('1')}
            className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === '1' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>一隊 ({party1List.length}/6)</span>
            <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[9px] font-mono">{p1Score}分</span>
          </button>
          {partyCount >= 2 && (
            <button
              type="button"
              onClick={() => setActiveTab('2')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === '2' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>二隊 ({party2List.length}/6)</span>
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[9px] font-mono">{p2Score}分</span>
            </button>
          )}
          {partyCount >= 3 && (
            <button
              type="button"
              onClick={() => setActiveTab('3')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === '3' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span>三隊 ({party3List.length}/6)</span>
              <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[9px] font-mono">{p3Score}分</span>
            </button>
          )}
        </div>

        {/* TAB PANELS RENDERS */}
        <div className="mt-3.5">
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono">
                
                {/* Party 1 Overview */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                    <span className="text-xs font-black text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      一隊
                    </span>
                    <span className="text-[11px] bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg">{p1Score} / 100分</span>
                  </div>
                  <div className="space-y-1">
                    {party1List.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic block py-2 text-center font-sans">無分配成員</span>
                    ) : (
                      party1List.map(p => (
                        <div key={p.userId + '-' + p.ign} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-xl border border-slate-200">
                          <span className="truncate font-bold text-slate-900 flex items-center gap-1">
                            <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                            <strong className="truncate max-w-[80px]">{p.ign}</strong>
                          </span>
                          <span className="text-[10px] text-slate-500 text-right">{p.job} • Lv.{p.level}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">已啟動組隊 Buff：</span>
                    <div className="flex flex-wrap gap-1">
                      {p1Buffs.length === 0 ? (
                        <span className="text-[10px] text-slate-400 italic">無加護</span>
                      ) : (
                        p1Buffs.map(b => (
                          <span key={b.id} className="text-[10px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md cursor-help shadow-sm" title={b.effect}>
                            {b.icon} {b.name.split(' (')[0]}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Party 2 Overview */}
                {partyCount >= 2 && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                      <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        二隊
                      </span>
                      <span className="text-[11px] bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg">{p2Score} / 100分</span>
                    </div>
                    <div className="space-y-1">
                      {party2List.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic block py-2 text-center font-sans">無分配成員</span>
                      ) : (
                        party2List.map(p => (
                          <div key={p.userId + '-' + p.ign} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-xl border border-slate-200">
                            <span className="truncate font-bold text-slate-900 flex items-center gap-1">
                              <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                              <strong className="truncate max-w-[80px]">{p.ign}</strong>
                            </span>
                            <span className="text-[10px] text-slate-500 text-right">{p.job} • Lv.{p.level}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">已啟動組隊 Buff：</span>
                      <div className="flex flex-wrap gap-1">
                        {p2Buffs.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">無加護</span>
                        ) : (
                          p2Buffs.map(b => (
                            <span key={b.id} className="text-[10px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md cursor-help shadow-sm" title={b.effect}>
                              {b.icon} {b.name.split(' (')[0]}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Party 3 Overview */}
                {partyCount >= 3 && (
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                      <span className="text-xs font-black text-violet-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        三隊
                      </span>
                      <span className="text-[11px] bg-white border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-lg">{p3Score} / 100分</span>
                    </div>
                    <div className="space-y-1">
                      {party3List.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic block py-2 text-center font-sans">無分配成員</span>
                      ) : (
                        party3List.map(p => (
                          <div key={p.userId + '-' + p.ign} className="flex items-center justify-between text-[11px] bg-white px-2 py-1 rounded-xl border border-slate-200">
                            <span className="truncate font-bold text-slate-900 flex items-center gap-1">
                              <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                              <strong className="truncate max-w-[80px]">{p.ign}</strong>
                            </span>
                            <span className="text-[10px] text-slate-500 text-right">{p.job} • Lv.{p.level}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">已啟動組隊 Buff：</span>
                      <div className="flex flex-wrap gap-1">
                        {p3Buffs.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">無加護</span>
                        ) : (
                          p3Buffs.map(b => (
                            <span key={b.id} className="text-[10px] bg-white text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded-md cursor-help shadow-sm" title={b.effect}>
                              {b.icon} {b.name.split(' (')[0]}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Individual detailed tabs */}
          {(activeTab === '1' || activeTab === '2' || activeTab === '3') && (() => {
            const currentPartyList = activeTab === '1' ? party1List : activeTab === '2' ? party2List : party3List;
            const currentBuffs = activeTab === '1' ? p1Buffs : activeTab === '2' ? p2Buffs : p3Buffs;
            const tabColor = activeTab === '1' ? 'text-blue-700 border-blue-200 bg-blue-50/30' : activeTab === '2' ? 'text-emerald-700 border-emerald-200 bg-emerald-50/30' : 'text-violet-700 border-violet-200 bg-violet-50/30';

            return (
              <div className="space-y-3.5">
                <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3 ${tabColor}`}>
                  <div className="flex items-center justify-between select-none font-mono">
                    <h5 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      🧙 遠征分隊 #{activeTab} • 冒險者陣線
                    </h5>
                    <span className="text-xs text-slate-500 font-bold">平均等級: {currentPartyList.length > 0 ? Math.round(currentPartyList.reduce((s, p) => s + p.level, 0) / currentPartyList.length) : 0} 階</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 select-none">
                    {currentPartyList.length === 0 ? (
                      <div className="col-span-full text-center py-4 text-xs text-slate-400 italic">空無一人。可在下方的分組面板中進行調度！</div>
                    ) : (
                      currentPartyList.map(p => (
                        <div key={p.userId + '-' + p.ign} className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center justify-center gap-1.5 shadow-sm">
                          {p.discord ? (
                            <img src={p.discord.avatar} className="w-7 h-7 rounded-full border border-slate-300 object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 text-xs">👥</div>
                          )}
                          <div className="min-w-0 w-full">
                            <p className="font-extrabold text-xs truncate text-slate-900" title={p.ign}>{p.ign}</p>
                            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                              <JobIcon jobName={p.job} sizeClass="w-3 h-3" />
                              <span className="max-w-[45px] truncate">{p.job}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                    🔮 此小隊目前享有之組隊技能 Buff (合計 {currentBuffs.length} 個)：
                  </h5>
                  {currentBuffs.length === 0 ? (
                    <div className="p-6 border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-500 italic bg-slate-50">
                      該分組未集結任何主力 Buff/Healer。
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {currentBuffs.map(b => (
                        <div key={b.id} className={`p-3.5 border rounded-2xl flex gap-3 shadow-sm ${b.color}`}>
                          <span className="text-2xl shrink-0 select-none bg-white p-2 rounded-xl border border-slate-200 h-max flex items-center justify-center shadow-sm">{b.icon}</span>
                          <div>
                            <h6 className="font-extrabold text-xs sm:text-sm">{b.name}</h6>
                            <p className="text-[11px] mt-0.5 font-medium leading-relaxed opacity-90">{b.effect}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
