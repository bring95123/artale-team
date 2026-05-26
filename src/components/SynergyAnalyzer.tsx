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
  const [optimizerPreview, setOptimizerPreview] = useState<Participant[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);

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

    // Calculate level 120+ members
    const hasMapleWarrior = pList.some(p => p.level >= 120);

    const buffs = [];
    if (hasHS) {
      buffs.push({
        id: 'hs',
        name: '神聖祈禱 (Holy Symbol)',
        effect: '組隊經驗值額外 +50% ~ +110%，提供滿滿聖光淨化庇佑。',
        color: 'border-blue-500/40 bg-blue-950/20 text-blue-300',
        icon: '⛪'
      });
    }
    if (hasHB) {
      buffs.push({
        id: 'hb',
        name: '神聖之火 (Hyper Body)',
        effect: '組隊最大血量(MaxHP)與魔力(MaxMP)增加 60%！高抗秒殺核心。',
        color: 'border-red-500/40 bg-red-950/20 text-red-300',
        icon: '🔥'
      });
    }
    if (hasSE) {
      buffs.push({
        id: 'se',
        name: '會心之眼 (Sharp Eyes)',
        effect: '物理爆擊機率 +15%、爆擊最大傷害 +40%！打寶爆發神術。',
        color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
        icon: '👁️'
      });
    }
    if (hasSI) {
      buffs.push({
        id: 'si',
        name: '極速領域 (Speed Infusion)',
        effect: '突破常規武器極速，攻擊速度強行提升 2 階，DPS 全面狂飆。',
        color: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
        icon: '⚡'
      });
    }
    if (hasCO) {
      buffs.push({
        id: 'co',
        name: '戰鬥秩序 (Combat Orders)',
        effect: '突破技能極限上限，全體 4 轉技能等級上限 +2 級，能力全開！',
        color: 'border-violet-500/40 bg-violet-950/20 text-violet-300',
        icon: '🛡️'
      });
    }
    if (hasSmoke) {
      buffs.push({
        id: 'smoke',
        name: '煙霧彈障壁 (Smokescreen)',
        effect: '施放高科技煙幕，範圍內所有成員進入 30 秒完全無敵免疫傷害。',
        color: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
        icon: '💨'
      });
    }
    if (hasRage) {
      buffs.push({
        id: 'rage',
        name: '憤怒之火 (Rage)',
        effect: '基礎物理攻擊力增加 20 點。物理職業輸出必備甜品。',
        color: 'border-slate-500/30 bg-slate-900/60 text-slate-300',
        icon: '⚔️'
      });
    }
    if (hasMapleWarrior) {
      buffs.push({
        id: 'mw',
        name: '楓葉祝福 (Maple Warrior)',
        effect: '全體主屬性百分比額外 +15%！神級全能被動加持。',
        color: 'border-pink-500/30 bg-pink-950/10 text-pink-300',
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

    // Core buffs are worth 15 points each
    if (hasHS) score += 18;
    if (hasHB) score += 18;
    if (hasSE) score += 18;
    if (hasSI) score += 10;

    // Balance multiplier based on count (ideal party has Healer + Bowman for physical, etc)
    const distinctJobs = new Set(pList.map(p => p.job)).size;
    score += distinctJobs * 2; // reward variety

    // High level bonus (average party level)
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
    if (participants.length === 0) return { stars: '☆☆☆☆☆', text: '空空如也，隊友們還踩在路上...', color: 'text-slate-500' };
    if (globalSynergyScore >= 88) return { stars: '★★★★★', text: '夢幻極限隊伍！核心職業相性絕合，摧枯拉朽！', color: 'text-amber-400' };
    if (globalSynergyScore >= 75) return { stars: '★★★★☆', text: '頂規遠征陣容！主副 Buff 配備完整，推王猶如探囊取物。', color: 'text-emerald-400' };
    if (globalSynergyScore >= 60) return { stars: '★★★☆☆', text: '標準作戰小隊！生存或火力配備基本達標，注意走位！', color: 'text-indigo-400' };
    return { stars: '★★☆☆☆', text: '職業略顯鬆散！部分隊伍缺少關鍵 Healer 或 SE 大 Buff，建議最佳化。', color: 'text-rose-400' };
  }, [globalSynergyScore, participants]);

  // AI-like tactical advice list based on current layout
  const tacticalAdvices = useMemo(() => {
    const list: string[] = [];
    if (participants.length === 0) return ["💡 目前還沒有成員加入編組，在下方的 Roster 點選「錄取」即可同步分析！"];

    // 1. check missing Healers globally vs reserves
    const bishopsInReserves = reservesList.filter(p => isBishopPriest(p.job));
    const bishopsIn1 = party1List.filter(p => isBishopPriest(p.job));
    const bishopsIn2 = party2List.filter(p => isBishopPriest(p.job));
    const bishopsIn3 = party3List.filter(p => isBishopPriest(p.job));

    const totalBishops = bishopsIn1.length + bishopsIn2.length + bishopsIn3.length + bishopsInReserves.length;

    // Check if any active team has NO Bishop
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

    // 2. check Night Lords vs Sharp Eyes synergy
    // Night lords do best when there is a Bowmaster/Marksman in their specific party.
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

    // 3. Boss specific HP / Tank warnings
    const totalDks = party1List.filter(p => isDarkSpearman(p.job)).length + 
                     (partyCount >= 2 ? party2List.filter(p => isDarkSpearman(p.job)).length : 0) + 
                     (partyCount >= 3 ? party3List.filter(p => isDarkSpearman(p.job)).length : 0);

    const squishies = participants.filter(p => p.party !== 'reserve' && (p.job === '夜使者' || p.job === '箭神' || p.job === '暗影神偷' || p.job === '神射手'));

    if (boss && ['horntail', 'pink_bean', 'papu_hard'].includes(boss.id) && squishies.length > 0 && totalDks === 0) {
      list.push(`❤️ 滅團高危警告：挑戰高難重案王 **${boss.name}** 生存壓力極大！隊中有皮脆紙防的盜賊與弓手，但**全主力隊均無【黑騎士】提供神聖之火 (HB)**，極易陷入大絕招直接空手秒殺的慘劇。`);
    }

    // 4. Buccaneer speed synergy
    const buccaneers = participants.filter(p => p.party !== 'reserve' && isSpeedBuccaneer(p.job));
    buccaneers.forEach(b => {
      const partyList = b.party === '1' ? party1List : b.party === '2' ? party2List : party3List;
      const physicals = partyList.filter(p => p.job !== b.job && !isBishopPriest(p.job));
      if (physicals.length === 0) {
        list.push(`⚡ 領域空放：【拳霸：${b.ign}】被單獨分在一隊，或者同隊缺少主力物理輸出，這讓 Speed Infusion (極速領域) 的攻擊速度增幅無處發揮！`);
      }
    });

    // 5. Perfect synergy combinations detection!
    if (party1List.some(p => isBishopPriest(p.job)) && party1List.some(p => isSharpBowman(p.job)) && party1List.some(p => p.job === '夜使者')) {
      list.push(`👑 完美狂暴組合：**遠征一隊 成功集結了【主教 Healer + 會心射手 + 夜使者輸出】**！已激發「終極物理會心狂暴組合」，是全隊的核心輸出重炮。`);
    }
    if (partyCount >= 2 && party2List.some(p => isBishopPriest(p.job)) && party2List.some(p => isSharpBowman(p.job)) && party2List.some(p => p.job === '夜使者')) {
      list.push(`👑 完美狂暴組合：**遠征二隊 已啟動「終極物理會心爆擊迴路」**！組隊設計非常有水準！`);
    }

    if (list.length === 0) {
      list.push("🏅 陣容無懈可擊！成員各歸其位，Buff 完全覆蓋，請指揮官直接帶隊碾壓 Boss 吧！");
    }

    return list.slice(0, 4); // return top 4 smart actionable alerts
  }, [participants, party1List, party2List, party3List, reservesList, partyCount, boss]);

  // Balance Optimization Algorithm (Heuristic)
  const generateOptimalLayout = () => {
    // 1. Gather all participants who are currently active (not placeholder, not reserves, or can be rearranged)
    // Actually we want to redistribute all non-placeholder players among active squads, filling Party 1, 2, 3 first.
    const realPlayers = participants.filter(p => !p.isPlaceholder);
    if (realPlayers.length === 0) {
      showToast("⚠️ 目前並無報名角色可進行最佳化排班！", "error");
      return;
    }

    // Bucket players into major core buffs:
    const bishops = realPlayers.filter(p => isBishopPriest(p.job));
    const spearmen = realPlayers.filter(p => isDarkSpearman(p.job));
    const bowmen = realPlayers.filter(p => isSharpBowman(p.job));
    const buccaneers = realPlayers.filter(p => isSpeedBuccaneer(p.job));

    // Special utilities list
    const cores = [...bishops, ...spearmen, ...bowmen, ...buccaneers];
    const coreIds = new Set(cores.map(p => `${p.userId}-${p.ign}-${p.job}`));

    // Others (high DPS, levels sorted)
    const others = realPlayers.filter(p => !coreIds.has(`${p.userId}-${p.ign}-${p.job}`))
                              .sort((a, b) => b.level - a.level); // sort others by level (protect high tier DPS)

    // Clear parties list
    const optimized: Participant[] = [];
    const partyCap = 6;
    
    // We will distribute characters into Party 1, 2, 3 sequentially
    const parties: Participant[][] = Array.from({ length: partyCount }, () => []);

    // Helper: find party with least count that doesn't have a buff category yet
    const distributeToParties = (players: Participant[], categoryChecker: (j: string) => boolean) => {
      players.forEach(player => {
        // Find an available party (under cap 6) that does NOT have this category yet
        let targetIdx = -1;
        
        // 1st pass: find a party that doesn't have this buff and is under limit
        for (let i = 0; i < partyCount; i++) {
          if (parties[i].length < partyCap && !parties[i].some(p => categoryChecker(p.job))) {
            targetIdx = i;
            break;
          }
        }

        // 2nd pass: if all parties already have this buff, find smallest party that is under limit
        if (targetIdx === -1) {
          let minLen = 999;
          for (let i = 0; i < partyCount; i++) {
            if (parties[i].length < partyCap && parties[i].length < minLen) {
              minLen = parties[i].length;
              targetIdx = i;
            }
          }
        }

        if (targetIdx !== -1) {
          parties[targetIdx].push({ ...player, party: String(targetIdx + 1) });
        } else {
          // Send overflow to reserve
          optimized.push({ ...player, party: 'reserve' });
        }
      });
    };

    // Distribute core slots to prevent overlap in individual teams:
    distributeToParties(bishops, isBishopPriest);
    distributeToParties(spearmen, isDarkSpearman);
    distributeToParties(bowmen, isSharpBowman);
    distributeToParties(buccaneers, isSpeedBuccaneer);

    // Fill remaining party slots with Others, sorted by high-level first
    const maxActiveUsers = partyCount * partyCap;
    
    others.forEach(player => {
      // Find smallest active party under size 6
      let targetIdx = -1;
      let minLen = partyCap;
      
      for (let i = 0; i < partyCount; i++) {
        if (parties[i].length < partyCap && parties[i].length < minLen) {
          minLen = parties[i].length;
          targetIdx = i;
        }
      }

      if (targetIdx !== -1) {
        parties[targetIdx].push({ ...player, party: String(targetIdx + 1) });
      } else {
        optimized.push({ ...player, party: 'reserve' });
      }
    });

    // Merge and append optimized entities
    for (let i = 0; i < partyCount; i++) {
      optimized.push(...parties[i]);
    }

    setOptimizerPreview(optimized);
    showToast("⚡ 已在下方為您渲染『智能星級相性排班』預覽方案！快對比看看吧 ➜", "info");
  };

  const applyOptimization = async () => {
    if (!optimizerPreview || isApplying) return;
    setIsApplying(true);
    showToast("🔄 正在批次寫入 Firebase 資料庫並通知 Discord Webhook...", "info");
    try {
      await onApplyOptimization(optimizerPreview);
      setOptimizerPreview(null);
      showToast("🎉 已成功套用完美星級排班！玩家組隊已同步大變身！", "success");
    } catch (e) {
      showToast("套用排班時出錯", "error");
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-6 select-none" id="expedition-synergy-room">
      
      {/* Header and overview metric details */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] uppercase rounded-lg font-black tracking-wider">
            戰略指揮部 • 智慧核心
          </span>
          <h3 className="text-lg md:text-xl font-extrabold text-white mt-1.5 flex items-center gap-2">
            <span>⚡ 遠征團戰力與 Buff 組合相性分析</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">智慧解構職業相性關聯，發揮 Holy Symbol / Sharp Eyes 最大覆蓋，協助團長秒排完美天團！</p>
        </div>

        {/* Dynamic score ring */}
        <div className="flex items-center gap-3.5 bg-slate-950 p-3 rounded-2xl border border-slate-800/80 shrink-0">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="4" fill="transparent" />
              <circle cx="24" cy="24" r="20" stroke={globalSynergyScore >= 80 ? '#fbbf24' : globalSynergyScore >= 60 ? '#818cf8' : '#f87171'} strokeWidth="4" fill="transparent" 
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 * (1 - globalSynergyScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-mono font-black text-slate-100 text-xs">{globalSynergyScore}%</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-bold">總體相性指數</span>
              <span className={`text-xs font-black ${evaluationRating.color}`}>{evaluationRating.stars}</span>
            </div>
            <p className={`text-[11px] font-extrabold max-w-[210px] break-words line-clamp-1 truncate leading-tight mt-0.5 ${globalSynergyScore >= 75 ? 'text-amber-400' : 'text-slate-300'}`}>{evaluationRating.text}</p>
          </div>
        </div>
      </div>

      {/* AI coach dynamic warnings panel wrapper */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4.5 space-y-2.5">
        <h4 className="text-xs font-black text-amber-500 flex items-center gap-1.5">
          <span>🧠 遠征戰術指揮官の大局警報與提示：</span>
        </h4>
        <div className="space-y-2.5">
          {tacticalAdvices.map((advice, index) => {
            const isDanger = advice.includes('警告') || advice.includes('高危');
            const isPerfect = advice.includes('完美') || advice.includes('無懈可擊');
            
            return (
              <div 
                key={index} 
                className={`text-xs p-3 rounded-xl border flex items-start gap-2.5 text-slate-300 leading-relaxed font-semibold transition ${
                  isDanger 
                    ? 'border-rose-950 bg-rose-500/5 text-rose-300 shadow shadow-rose-950/5 animate-pulse' 
                    : isPerfect 
                    ? 'border-amber-500/20 bg-amber-500/5 text-slate-200' 
                    : 'border-slate-850 bg-slate-900/40 text-slate-350'
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
        <div className="flex flex-wrap border-b border-slate-800 gap-1.5 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'all' ? 'bg-slate-805 bg-slate-800 border border-slate-700 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📋 總體戰力綜覽
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('1')}
            className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === '1' ? 'bg-blue-600/30 border border-blue-500 text-blue-200 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>🔵 遠征一隊 ({party1List.length}/6)</span>
            <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[9px] font-mono">{p1Score}分</span>
          </button>
          {partyCount >= 2 && (
            <button
              type="button"
              onClick={() => setActiveTab('2')}
              className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === '2' ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-200 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>🟢 遠征二隊 ({party2List.length}/6)</span>
              <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-mono">{p2Score}分</span>
            </button>
          )}
          {partyCount >= 3 && (
            <button
              type="button"
              onClick={() => setActiveTab('3')}
              className={`px-4.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${activeTab === '3' ? 'bg-violet-600/30 border border-violet-500 text-violet-200 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
              <span>🟣 遠征三隊 ({party3List.length}/6)</span>
              <span className="bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded text-[9px] font-mono">{p3Score}分</span>
            </button>
          )}
        </div>

        {/* TAB PANELS RENDERS */}
        <div className="mt-4">
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 font-mono">
                
                {/* Party 1 Overview */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-805 border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                    <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      一隊
                    </span>
                    <span className="text-[11px] bg-slate-900 border border-slate-800/80 text-slate-400 font-bold px-2 py-0.5 rounded-lg">{p1Score} / 100分</span>
                  </div>
                  <div className="space-y-1.5">
                    {party1List.length === 0 ? (
                      <span className="text-[11px] text-slate-600 italic block py-2 text-center font-sans">無分配成員</span>
                    ) : (
                      party1List.map(p => (
                        <div key={p.userId + '-' + p.ign} className="flex items-center justify-between text-[11px] bg-slate-900/40 px-2 py-1.5 rounded-xl border border-slate-900">
                          <span className="truncate text-slate-250 font-bold text-slate-100 flex items-center gap-1 bg-slate-950/20">
                            <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                            <strong className="truncate max-w-[80px]">{p.ign}</strong>
                          </span>
                          <span className="text-[10px] text-slate-450 text-slate-400 text-right">{p.job} • Lv.{p.level}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 font-sans">已啟動組隊 Buff：</span>
                    <div className="flex flex-wrap gap-1">
                      {p1Buffs.length === 0 ? (
                        <span className="text-[10px] text-slate-650 italic">無加護</span>
                      ) : (
                        p1Buffs.map(b => (
                          <span key={b.id} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800/80 px-2 py-0.5 rounded-lg cursor-help" title={b.effect}>
                            {b.icon} {b.name.split(' (')[0]}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Party 2 Overview */}
                {partyCount >= 2 && (
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-805 border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        二隊
                      </span>
                      <span className="text-[11px] bg-slate-900 border border-slate-800/80 text-slate-400 font-bold px-2 py-0.5 rounded-lg">{p2Score} / 100分</span>
                    </div>
                    <div className="space-y-1.5">
                      {party2List.length === 0 ? (
                        <span className="text-[11px] text-slate-600 italic block py-2 text-center font-sans">無分配成員</span>
                      ) : (
                        party2List.map(p => (
                          <div key={p.userId + '-' + p.ign} className="flex items-center justify-between text-[11px] bg-slate-900/40 px-2 py-1.5 rounded-xl border border-slate-900">
                            <span className="truncate text-slate-250 font-bold text-slate-100 flex items-center gap-1">
                              <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                              <strong className="truncate max-w-[80px]">{p.ign}</strong>
                            </span>
                            <span className="text-[10px] text-slate-450 text-slate-400 text-right">{p.job} • Lv.{p.level}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 font-sans">已啟動組隊 Buff：</span>
                      <div className="flex flex-wrap gap-1">
                        {p2Buffs.length === 0 ? (
                          <span className="text-[10px] text-slate-650 italic">無加護</span>
                        ) : (
                          p2Buffs.map(b => (
                            <span key={b.id} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800/80 px-2 py-0.5 rounded-lg cursor-help" title={b.effect}>
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
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-805 border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                      <span className="text-xs font-black text-violet-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        三隊
                      </span>
                      <span className="text-[11px] bg-slate-900 border border-slate-800/80 text-slate-400 font-bold px-2 py-0.5 rounded-lg">{p3Score} / 100分</span>
                    </div>
                    <div className="space-y-1.5">
                      {party3List.length === 0 ? (
                        <span className="text-[11px] text-slate-600 italic block py-2 text-center font-sans">無分配成員</span>
                      ) : (
                        party3List.map(p => (
                          <div key={p.userId + '-' + p.ign} className="flex items-center justify-between text-[11px] bg-slate-900/40 px-2 py-1.5 rounded-xl border border-slate-900">
                            <span className="truncate text-slate-250 font-bold text-slate-100 flex items-center gap-1">
                              <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                              <strong className="truncate max-w-[80px]">{p.ign}</strong>
                            </span>
                            <span className="text-[10px] text-slate-455 text-slate-400 text-right">{p.job} • Lv.{p.level}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3.5 pt-3 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5 font-sans">已啟動組隊 Buff：</span>
                      <div className="flex flex-wrap gap-1">
                        {p3Buffs.length === 0 ? (
                          <span className="text-[10px] text-slate-655 italic">無加護</span>
                        ) : (
                          p3Buffs.map(b => (
                            <span key={b.id} className="text-[10px] bg-slate-900 text-slate-300 border border-slate-800/80 px-2 py-0.5 rounded-lg cursor-help" title={b.effect}>
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

          {/* Individual detailed tabs showing big interactive cards for each buff */}
          {(activeTab === '1' || activeTab === '2' || activeTab === '3') && (() => {
            const currentPartyList = activeTab === '1' ? party1List : activeTab === '2' ? party2List : party3List;
            const currentBuffs = activeTab === '1' ? p1Buffs : activeTab === '2' ? p2Buffs : p3Buffs;
            const tabColor = activeTab === '1' ? 'text-blue-400 border-blue-500/30' : activeTab === '2' ? 'text-emerald-400 border-emerald-500/30' : 'text-violet-400 border-violet-500/30';

            return (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl bg-slate-950 border flex flex-col gap-4 ${tabColor}`}>
                  <div className="flex items-center justify-between mb-1 select-none font-mono">
                    <h5 className="text-sm font-black text-slate-100 flex items-center gap-1.5">
                      🧙 遠征分隊 #{activeTab} • 冒險者陣線
                    </h5>
                    <span className="text-xs text-slate-400 font-bold">小隊平均等級: {currentPartyList.length > 0 ? Math.round(currentPartyList.reduce((s, p) => s + p.level, 0) / currentPartyList.length) : 0} 階</span>
                  </div>

                  {/* List of members with clean avatars */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 select-none">
                    {currentPartyList.length === 0 ? (
                      <div className="col-span-full text-center py-4 text-xs text-slate-600 italic">空無一人。可在下方的分組面板中進行錄取調度！</div>
                    ) : (
                      currentPartyList.map(p => (
                        <div key={p.userId + '-' + p.ign} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center text-center justify-center gap-2">
                          {p.discord ? (
                            <img src={p.discord.avatar} className="w-8 h-8 rounded-full border border-[#5865F2]/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-850 flex items-center justify-center text-slate-400 border border-slate-800 text-xs">👥</div>
                          )}
                          <div className="min-w-0 w-full">
                            <p className="font-extrabold text-[12px] truncate text-slate-200" title={p.ign}>{p.ign}</p>
                            <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                              <JobIcon jobName={p.job} sizeClass="w-3.5 h-3.5" />
                              <span className="max-w-[50px] truncate">{p.job}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Simulated activated status effects */}
                <div>
                  <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">
                    🔮 此小隊目前享有之組隊技能 Buff (合計 {currentBuffs.length} 個)：
                  </h5>
                  {currentBuffs.length === 0 ? (
                    <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-600 italic bg-slate-950/20">
                      該分組未集結任何主力 Buff/Healer。將面臨極大防爆、續航與經驗折損風險！
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {currentBuffs.map(b => (
                        <div key={b.id} className={`p-4 border rounded-2xl flex gap-3.5 shadow-sm transition-all duration-300 hover:border-slate-600 ${b.color}`}>
                          <span className="text-3xl shrink-0 select-none bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40 h-max flex items-center justify-center">{b.icon}</span>
                          <div>
                            <h6 className="font-extrabold text-sm text-slate-100">{b.name}</h6>
                            <p className="text-[11px] text-slate-300 md:text-xs mt-1 font-semibold leading-relaxed">{b.effect}</p>
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

      {/* ADMIN CONSOLE / CREATOR SMART OPTIMIZER CONTROLS */}
      {isCreator && (
        <div className="border-t border-slate-800 pt-5 mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
            <div>
              <h4 className="text-xs font-black text-indigo-400 flex items-center gap-1.5 uppercase">
                <span>⚡ 遠征相性智慧優化調度演算法</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-1">
                點擊一鍵進行智慧分組運算，將所有 Buff 角色與 Healer 平均分流至一、二、三隊，讓整體遠征隊戰力最大化。
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={generateOptimalLayout}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transform hover:-translate-y-0.5 active:scale-95 transition"
              >
                <span>🪄 一鍵星級智能排班</span>
              </button>
              {optimizerPreview && (
                <button
                  type="button"
                  onClick={() => setOptimizerPreview(null)}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 font-bold px-3 py-2.5 rounded-xl text-xs transition"
                >
                  清除預覽
                </button>
              )}
            </div>
          </div>

          {/* Optimizer Preview Section */}
          {optimizerPreview && (
            <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4 shadow-lg ring-2 ring-indigo-505 ring-indigo-500/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-500/20 pb-3 gap-2">
                <div>
                  <h5 className="text-[13px] font-black text-amber-400 flex items-center gap-1.5">
                    <span>✨ 星級極致排班：一鍵神級大調度 (預覽)</span>
                  </h5>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">即將重新洗牌一、二、三隊與候補人員。預計將整體總體相性指数大幅提拉！</p>
                </div>
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={applyOptimization}
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black px-4.5 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/10 active:scale-95 transform transition flex items-center space-x-1"
                >
                  {isApplying ? (
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-slate-950/40 border-t-slate-950 rounded-full"></span>
                  ) : (
                    <span>💾 套用並同步存檔</span>
                  )}
                </button>
              </div>

              {/* Side by side preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono select-none">
                
                {/* Before vs After preview mapping */}
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-850 text-xs">
                  <span className="text-[11px] font-bold text-rose-400 block mb-2">🔴 原有不規則分組狀態：</span>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {participants.filter(p => !p.isPlaceholder).map(p => (
                      <div key={'bef-' + p.userId + '-' + p.ign} className="flex justify-between items-center text-[10.5px] bg-slate-950/40 px-2 py-1 rounded">
                        <span className="text-slate-300 truncate max-w-[120px] font-semibold">{p.ign} <span className="text-[9px] text-slate-500">({p.job})</span></span>
                        <span className="text-[9.5px] font-bold shrink-0 text-right">
                          {p.party === '1' ? '🔵 1 隊' : p.party === '2' ? '🟢 2 隊' : p.party === '3' ? '🟣 3 隊' : '🔸 候補'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/15 rounded-xl border border-indigo-500/20 text-xs">
                  <span className="text-[11px] font-bold text-amber-400 block mb-2">🌟 智能演算法分流方案：</span>
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {optimizerPreview.map(p => (
                      <div key={'aft-' + p.userId + '-' + p.ign} className="flex justify-between items-center text-[10.5px] bg-indigo-950/45 border border-indigo-750/30 px-2 py-1 rounded">
                        <span className="text-slate-100 truncate max-w-[120px] font-black">{p.ign} <span className="text-[9px] text-indigo-400">({p.job})</span></span>
                        <span className="text-[9.5px] font-black text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded shadow-sm">
                          {p.party === '1' ? '🔵 最佳化 1 隊' : p.party === '2' ? '🟢 最佳化 2 隊' : p.party === '3' ? '🟣 最佳化 3 隊' : '🔸 預留候補'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
