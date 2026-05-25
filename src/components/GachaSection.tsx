import React, { useState, useEffect } from 'react';
import { GachaResult, Character, DiscordUser, DiscordConfig, GACHA_FORTUNES, GACHA_SPOTS } from '../types';

interface GachaSectionProps {
  activeCharacter: Character;
  discordUser: DiscordUser | null;
  discordConfig: DiscordConfig | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openProfileModal: () => void;
}

export default function GachaSection({
  activeCharacter,
  discordUser,
  discordConfig,
  showToast,
  openProfileModal
}: GachaSectionProps) {
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Check if daily reset has passed (08:00 AM)
  const checkHasResetPassed = (lastTimeMs: number) => {
    const lastDate = new Date(lastTimeMs);
    const now = new Date();

    const getEightAmTarget = (date: Date) => {
      const d = new Date(date);
      d.setHours(8, 0, 0, 0);
      return d.getTime();
    };

    const nowEightAm = getEightAmTarget(now);
    const lastEightAmThreshold = now.getTime() >= nowEightAm ? nowEightAm : nowEightAm - 24 * 60 * 60 * 1000;
    return lastTimeMs < lastEightAmThreshold;
  };

  useEffect(() => {
    const savedResult = localStorage.getItem('nyxshade_last_gacha_result');
    const savedTime = localStorage.getItem('nyxshade_last_gacha_time');
    if (savedResult && savedTime) {
      if (!checkHasResetPassed(Number(savedTime))) {
        try {
          setGachaResult(JSON.parse(savedResult));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const generateLuckyNumbers = () => {
    const n1 = Math.floor(Math.random() * 10);
    const n2 = Math.floor(Math.random() * 10);
    const n3 = Math.floor(Math.random() * 10);
    return `${n1}, ${n2}, ${n3}`;
  };

  const handleSpinGacha = () => {
    if (!activeCharacter || !activeCharacter.ign) {
      showToast("⚠️ 請先設定右上角的身分角色卡才能啟用轉蛋！", "error");
      openProfileModal();
      return;
    }

    const lastGachaTime = localStorage.getItem('nyxshade_last_gacha_time');
    if (lastGachaTime && !checkHasResetPassed(Number(lastGachaTime))) {
      showToast("🛑 今天已經求過籤囉！請靜候明日早上 08:00 重新解鎖神社。", "error");
      return;
    }

    setIsSpinning(true);
    setGachaResult(null);

    let count = 0;
    const interval = setInterval(() => {
      const randomFortune = GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)];
      const randomSpot = GACHA_SPOTS[Math.floor(Math.random() * GACHA_SPOTS.length)];

      setGachaResult({
        fortune: randomFortune,
        luckyNumbers: generateLuckyNumbers(),
        spot: randomSpot
      });

      count++;
      if (count > 15) {
        clearInterval(interval);
        
        const finalFortune = GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)];
        const finalSpot = GACHA_SPOTS[Math.floor(Math.random() * GACHA_SPOTS.length)];
        const finalNumbers = generateLuckyNumbers();

        const finalResult = {
          fortune: finalFortune,
          luckyNumbers: finalNumbers,
          spot: finalSpot
        };

        setGachaResult(finalResult);
        setIsSpinning(false);

        localStorage.setItem('nyxshade_last_gacha_time', String(Date.now()));
        localStorage.setItem('nyxshade_last_gacha_result', JSON.stringify(finalResult));

        showToast("🔮 今日好運轉蛋抽取完成！快秀出運勢給公會吧！");
      }
    }, 80);
  };

  const handleSendFortuneToDiscord = async () => {
    if (!gachaResult) return;
    if (!discordConfig || !discordConfig.webhookUrl) {
      showToast("⚠️ 請先在底部的管理者後台配置 Discord Webhook URL！", "error");
      return;
    }

    const dcTag = discordUser ? `<@${discordUser.id}>` : '';
    const authorName = activeCharacter.ign;
    const job = activeCharacter.job;
    const level = activeCharacter.level;
    
    const payload = {
      content: `🔮 **楓之谷今日幸運求籤** ${dcTag} 推開了命運神社的門扉...`,
      embeds: [{
        title: `🍁 NyxShade 遠征幸運轉蛋報告 🔮`,
        description: `冒險者 **${authorName}** (${job} Lv.${level}) 的今日好運籤已經出爐！`,
        color: gachaResult.fortune.dcColor,
        fields: [
          {
            name: "✨ 今日吉凶與運勢",
            value: `**${gachaResult.fortune.status}**\n*${gachaResult.fortune.desc}*`,
            inline: false
          },
          {
            name: "🎲 今日幸運數字",
            value: `**[ ${gachaResult.luckyNumbers} ]**`,
            inline: true
          },
          {
            name: "🔨 最佳衝裝聖地",
            value: `**${gachaResult.spot}**`,
            inline: true
          }
        ],
        footer: {
          text: "NyxShade 命運神宮 • 壞掉不要找我喔 ✧｡٩(ˊᗜˋ)و✧｡"
        },
        timestamp: new Date().toISOString()
      }]
    };

    try {
      const response = await fetch(discordConfig.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast("📢 成功將今日超狂運勢大方地秀到 Discord 頻道！", "success");
      } else {
        throw new Error("Discord API 拒絕了發送請求");
      }
    } catch (err: any) {
      console.error(err);
      showToast("發送至 Discord 失敗，請確認 Webhook URL 網址是否正確！", "error");
    }
  };

  return (
    <div id="gacha-panel" className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/25 shadow-xl relative overflow-hidden">
      <div className="absolute right-4 top-4 opacity-10 text-7xl select-none">🔮</div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-indigo-900/40 pb-4 mb-5">
        <div>
          <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 px-2.5 py-1 rounded-md font-extrabold select-none">
            MAPLE GACHA
          </span>
          <h3 className="text-xl font-black text-slate-100 flex items-center gap-2 mt-1.5">
            <span>🔮 楓之谷幸運神社</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            立刻來抽一發幸運神籤，看看今日衝裝與打寶運勢！（每人每天早上 08:00 重置一次喔）
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={handleSpinGacha}
            disabled={isSpinning}
            className="flex-1 md:flex-none bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-900 text-white font-black px-6 py-3 rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:scale-95 disabled:scale-100 disabled:translate-y-0 text-sm flex items-center justify-center space-x-2"
          >
            {isSpinning ? (
              <span className="flex items-center space-x-1.5">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full"></span>
                <span>神宮加持求籤中...</span>
              </span>
            ) : (
              <span>🎰 抽取今日好運轉蛋</span>
            )}
          </button>

          {gachaResult && !isSpinning && discordConfig?.webhookUrl && (
            <button
              type="button"
              onClick={handleSendFortuneToDiscord}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-black px-5 py-3 rounded-xl text-sm transition transform hover:-translate-y-0.5 active:scale-95 shadow-md flex items-center justify-center space-x-1.5 shrink-0 animate-pulse animate-bounce"
              title="將此好運勢以精美卡片發送到 Discord 頻道！"
            >
              <span>📢 秀運勢到 DC</span>
            </button>
          )}
        </div>
      </div>

      {/* Gacha Results Panel */}
      {gachaResult ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-350">
          {/* Status card */}
          <div className={`p-4 rounded-2xl border transition bg-gradient-to-br ${gachaResult.fortune.color} flex flex-col justify-between shadow-lg`}>
            <div>
              <span className="text-[10.5px] font-bold text-white/70 block uppercase tracking-wide">TODAY STATUS</span>
              <h4 className="text-lg font-black text-white mt-1 drop-shadow-md">{gachaResult.fortune.status}</h4>
            </div>
            <p className="text-xs text-white/95 leading-relaxed mt-4 bg-black/30 p-2.5 rounded-xl border border-white/10">
              {gachaResult.fortune.desc}
            </p>
          </div>

          {/* Lucky numbers card */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between shadow-lg">
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 block uppercase tracking-wide">LUCKY NUMBERS</span>
              <h4 className="text-xl font-black text-indigo-400 mt-1 flex items-center space-x-1.5 font-mono">
                <span>🎲</span>
                <span className="truncate tracking-wider">[ {gachaResult.luckyNumbers} ]</span>
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-4 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              今日大發幸運數字：與身邊含有這些數字的戰友一起出征吧！
            </p>
          </div>

          {/* Upgrade spot card */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between shadow-lg">
            <div>
              <span className="text-[10.5px] font-bold text-slate-500 block uppercase tracking-wide">BEST UPGRADE SPOT</span>
              <h4 className="text-base font-black text-amber-400 mt-1 flex items-center space-x-1.5">
                <span>🔨</span>
                <span className="truncate">衝裝首選聖地</span>
              </h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mt-4 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              {gachaResult.spot}
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs italic bg-slate-900/10 select-none">
          🔮 還沒有求籤喔！請點選上方「🎰 抽取今日好運轉蛋`」啟動運勢預測。
        </div>
      )}
    </div>
  );
}
