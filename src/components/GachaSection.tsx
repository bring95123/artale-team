import React, { useState, useEffect } from 'react';
import { GachaResult, Character, DiscordUser, DiscordConfig, GACHA_FORTUNES, GACHA_SPOTS, FORTUNE_DESCRIPTIONS } from '../types';
import FortuneDashboard from './FortuneDashboard';

interface GachaSectionProps {
  activeCharacter: Character;
  discordUser: DiscordUser | null;
  discordConfig: DiscordConfig | null;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  openProfileModal: () => void;
  onSaveFortune?: (result: GachaResult, wishingNote: string) => Promise<void>;
  fortunesList: any[];
  customUid: string | null;
}

export default function GachaSection({
  activeCharacter,
  discordUser,
  discordConfig,
  showToast,
  openProfileModal,
  onSaveFortune,
  fortunesList = [],
  customUid
}: GachaSectionProps) {
  const [gachaResult, setGachaResult] = useState<GachaResult | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('default');
  const [isSendingToDiscord, setIsSendingToDiscord] = useState(false);
  const [wishingNote, setWishingNote] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);

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
    const savedWish = localStorage.getItem('nyxshade_last_wishing_note');
    if (savedResult && savedTime) {
      if (!checkHasResetPassed(Number(savedTime))) {
        try {
          setGachaResult(JSON.parse(savedResult));
          if (savedWish) setWishingNote(savedWish);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const generateLuckyNumbers = () => {
    const numbers: number[] = [];
    while (numbers.length < 3) {
      const n = Math.floor(Math.random() * 10);
      if (!numbers.includes(n)) {
        numbers.push(n);
      }
    }
    return `${numbers[0]}, ${numbers[1]}, ${numbers[2]}`;
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
      const randomFortuneRaw = GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)];
      const randomSpot = GACHA_SPOTS[Math.floor(Math.random() * GACHA_SPOTS.length)];

      const pool = FORTUNE_DESCRIPTIONS[randomFortuneRaw.status] || [randomFortuneRaw.desc];
      const randomDesc = pool[Math.floor(Math.random() * pool.length)];

      const randomFortune = {
        ...randomFortuneRaw,
        desc: randomDesc
      };

      setGachaResult({
        fortune: randomFortune,
        luckyNumbers: generateLuckyNumbers(),
        spot: randomSpot
      });

      count++;
      if (count > 15) {
        clearInterval(interval);
        
        const finalFortuneRaw = GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)];
        const finalSpot = GACHA_SPOTS[Math.floor(Math.random() * GACHA_SPOTS.length)];
        const finalNumbers = generateLuckyNumbers();

        const finalPool = FORTUNE_DESCRIPTIONS[finalFortuneRaw.status] || [finalFortuneRaw.desc];
        const finalDesc = finalPool[Math.floor(Math.random() * finalPool.length)];

        const finalFortune = {
          ...finalFortuneRaw,
          desc: finalDesc
        };

        const finalResult = {
          fortune: finalFortune,
          luckyNumbers: finalNumbers,
          spot: finalSpot
        };

        setGachaResult(finalResult);
        setIsSpinning(false);

        localStorage.setItem('nyxshade_last_gacha_time', String(Date.now()));
        localStorage.setItem('nyxshade_last_gacha_result', JSON.stringify(finalResult));
        localStorage.setItem('nyxshade_last_wishing_note', wishingNote);

        if (onSaveFortune) {
          onSaveFortune(finalResult, wishingNote).catch((e) => console.error("Failed to save fortune to firestore", e));
        }

        showToast("🔮 今日好運轉蛋抽取完成！快秀出運勢給公會吧！");
      }
    }, 80);
  };

  const generateGachaImageBlob = async (
    fortuneStatus: string,
    fortuneDesc: string,
    luckyNumbers: string,
    spot: string,
    ign: string,
    job: string,
    level: number
  ): Promise<Blob> => {
    const width = 800;
    const height = 500;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create 2D canvas context");

    // 1. Draw slate space theme gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Beautiful glowing neon border
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.45)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, width - 8, height - 8);

    // Inner gold dashed border
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke?: string) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };

    // 3. Header title layout
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 13px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("⛩️  MAPLE LUCK SHRINE  ⛩️", 35, 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 26px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("🍁 楓之谷幸運神社 • 今日好運神籤 🔮", 35, 85);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(35, 105);
    ctx.lineTo(width - 35, 105);
    ctx.stroke();

    // 4. Character info slot
    drawRoundedRect(35, 120, 730, 42, 8, 'rgba(30, 41, 59, 0.65)', 'rgba(99, 102, 241, 0.3)');
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Microsoft JhengHei", sans-serif';
    ctx.fillText("求籤冒險者:", 50, 146);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 16px "Microsoft JhengHei", sans-serif';
    ctx.fillText(ign, 135, 146);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px "Microsoft JhengHei", sans-serif';
    ctx.fillText(`( ${job}  Lv.${level} )`, 135 + ctx.measureText(ign).width + 12, 146);

    // 5. Fortune status layout and colors
    const fortuneGrad = ctx.createLinearGradient(35, 180, 400, 450);
    if (fortuneStatus.includes('超大吉')) {
      fortuneGrad.addColorStop(0, '#ea580c');
      fortuneGrad.addColorStop(1, '#d97706');
    } else if (fortuneStatus.includes('大吉')) {
      fortuneGrad.addColorStop(0, '#10b981');
      fortuneGrad.addColorStop(1, '#0d9488');
    } else if (fortuneStatus.includes('中吉')) {
      fortuneGrad.addColorStop(0, '#2563eb');
      fortuneGrad.addColorStop(1, '#4f46e5');
    } else if (fortuneStatus.includes('吉')) {
      fortuneGrad.addColorStop(0, '#475569');
      fortuneGrad.addColorStop(1, '#334155');
    } else if (fortuneStatus.includes('末吉')) {
      fortuneGrad.addColorStop(0, '#d97706');
      fortuneGrad.addColorStop(1, '#ca8a04');
    } else if (fortuneStatus.includes('平') || fortuneStatus.includes('放空')) {
      fortuneGrad.addColorStop(0, '#7c3aed');
      fortuneGrad.addColorStop(1, '#4f46e5');
    } else if (fortuneStatus.includes('凶')) {
      fortuneGrad.addColorStop(0, '#dc2626');
      fortuneGrad.addColorStop(1, '#9f1239');
    } else {
      fortuneGrad.addColorStop(0, '#475569');
      fortuneGrad.addColorStop(1, '#1e293b');
    }

    drawRoundedRect(35, 180, 400, 255, 16, fortuneGrad);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("TODAY FORTUNE • 今日運勢", 55, 215);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText(fortuneStatus, 55, 252);

    // Draw wrapped text inside state card
    drawRoundedRect(52, 275, 365, 140, 12, 'rgba(0, 0, 0, 0.42)', 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial, "Microsoft JhengHei", sans-serif';

    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const chars = text.split('');
      let line = '';
      let currentY = y;
      for (let i = 0; i < chars.length; i++) {
        const testLine = line + chars[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, x, currentY);
          line = chars[i];
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x, currentY);
    };
    wrapText(fortuneDesc, 70, 310, 330, 24);

    // 6. Right side widgets
    // Widget 1: Lucky numbers
    drawRoundedRect(455, 180, 310, 115, 16, 'rgba(15, 23, 42, 0.65)', 'rgba(99, 102, 241, 0.25)');
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("LUCKY NUMBERS • 幸運數字", 475, 210);

    ctx.fillStyle = '#818cf8';
    ctx.font = 'bold 25px Courier, monospace';
    ctx.fillText(`🎲  [ ${luckyNumbers} ]`, 475, 248);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Microsoft JhengHei", sans-serif';
    ctx.fillText("與此尾數相配、或名字有相關的角色組隊最神！", 475, 274);

    // Widget 2: Upgrade destination
    drawRoundedRect(455, 315, 310, 120, 16, 'rgba(15, 23, 42, 0.65)', 'rgba(245, 158, 11, 0.25)');
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("BEST UPGRADE SPOT • 衝卷聖地", 475, 345);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Arial, "Microsoft JhengHei", sans-serif';
    wrapText(`🔨 ${spot}`, 475, 375, 270, 20);

    // 7. Footer details
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(35, 455);
    ctx.lineTo(width - 35, 455);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '11px Arial, "Microsoft JhengHei", sans-serif';
    ctx.fillText("NyxShade 命運神宮 • 壞掉不要找我喔 ✧｡٩(ˊᗜˋ)و✧｡", 35, 478);

    const datestr = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    ctx.fillText(datestr, width - 35 - ctx.measureText(datestr).width, 478);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      }, 'image/png');
    });
  };

  const handleSendFortuneToDiscord = async () => {
    if (!gachaResult || isSendingToDiscord) return;
    if (!discordConfig) return;

    let targetWebhookUrl = discordConfig.webhookUrl;
    let channelName = "預設通用頻道";

    if (selectedWebhookId !== 'default' && discordConfig.webhooks) {
      const found = discordConfig.webhooks.find(wh => wh.id === selectedWebhookId);
      if (found) {
        targetWebhookUrl = found.url;
        channelName = `#${found.name}`;
      }
    }

    if (!targetWebhookUrl) {
      showToast("⚠️ 所選的廣播頻道尚未設定 Webhook 連結！", "error");
      return;
    }

    setIsSendingToDiscord(true);
    showToast("🎨 正在為您精繪今日運勢卡片...", "info");

    const dcTag = discordUser ? `<@${discordUser.id}>` : '';
    const authorName = activeCharacter.ign;
    const job = activeCharacter.job;
    const level = activeCharacter.level;

    try {
      const imageBlob = await generateGachaImageBlob(
        gachaResult.fortune.status,
        gachaResult.fortune.desc,
        gachaResult.luckyNumbers,
        gachaResult.spot,
        authorName,
        job,
        level
      );

      const formData = new FormData();
      formData.append('files[0]', imageBlob, 'gacha_fortune.png');

      const payload = {
        content: `🔮 **楓之谷今日幸運求籤** ${dcTag} 推開了命運神社的門扉...`,
        embeds: [{
          title: `🍁 NyxShade 遠征幸運轉蛋報告 🔮`,
          description: `冒險者 **${authorName}** (${job} Lv.${level}) 的今日好運籤已經出爐！`,
          color: gachaResult.fortune.dcColor,
          image: {
            url: 'attachment://gacha_fortune.png'
          },
          footer: {
            text: `NyxShade 命運神宮 • 傳送至 ${channelName} ✧`
          },
          timestamp: new Date().toISOString()
        }]
      };

      formData.append('payload_json', JSON.stringify(payload));

      const response = await fetch(targetWebhookUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        showToast(`📢 成功將今日運勢卡片傳送到 Discord ${channelName} 頻道！`, "success");
      } else {
        throw new Error("Discord API rejected request");
      }
    } catch (err: any) {
      console.error(err);
      showToast("發送至 Discord 失敗，請確認該頻道 Webhook 網址是否正確！", "error");
    } finally {
      setIsSendingToDiscord(false);
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => setShowDashboard(!showDashboard)}
            className={`flex-1 md:flex-none border font-black px-4 py-3 rounded-xl shadow-md transition transform hover:-translate-y-0.5 active:scale-95 text-xs flex items-center justify-center space-x-1.5 ${
              showDashboard 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30' 
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
            }`}
          >
            <span>📊 {showDashboard ? '收合公會大數據' : '查看公會大數據'}</span>
          </button>

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

          {gachaResult && !isSpinning && (discordConfig?.webhookUrl || (discordConfig?.webhooks && discordConfig.webhooks.length > 0)) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900 border border-slate-750/35 p-1.5 rounded-xl shrink-0 w-full md:w-auto">
              <select
                value={selectedWebhookId}
                onChange={(e) => setSelectedWebhookId(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg py-2.5 px-2.5 outline-none font-bold sm:max-w-[140px]"
                title="選擇要發送的 Discord 頻道"
                disabled={isSendingToDiscord}
              >
                {discordConfig?.webhookUrl && (
                  <option value="default">📢 預設主要頻道</option>
                )}
                {discordConfig?.webhooks?.map(wh => (
                  <option key={wh.id} value={wh.id}>💬 #{wh.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSendFortuneToDiscord}
                disabled={isSendingToDiscord}
                className="bg-gradient-to-r from-[#5865F2] to-[#454FBF] hover:from-[#4752C4] hover:to-[#3b43a9] disabled:from-slate-800 disabled:to-slate-900 text-white font-black px-4 py-2.5 rounded-xl text-xs transition transform hover:-translate-y-0.5 active:scale-95 shadow-md flex items-center justify-center space-x-1.5 shrink-0 flex-1 sm:flex-none animate-pulse"
                title="將此好運勢精繪成圖卡，發佈至選定的 Discord 頻道！"
              >
                {isSendingToDiscord ? (
                  <span className="flex items-center space-x-1.5">
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full"></span>
                    <span>神卡繪製發送中...</span>
                  </span>
                ) : (
                  <span>🖼️ 秀圖片到 DC</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wishing Note Input Field */}
      {!gachaResult && !isSpinning && (
        <div className="mb-5 bg-indigo-950/20 border border-indigo-500/10 p-4 rounded-2xl">
          <label className="block text-xs font-black text-indigo-400 uppercase tracking-widest mb-1.5 font-mono select-none">
            ⭐ 撰寫今日星空願望 (選填，展示於公會星空祈願牆)
          </label>
          <input
            type="text"
            maxLength={60}
            value={wishingNote}
            onChange={(e) => setWishingNote(e.target.value)}
            placeholder="例如：希望今天衝10%手卷能成功一發入魂！"
            className="w-full bg-slate-950/90 border border-slate-800/80 focus:border-indigo-500/50 rounded-xl px-4 py-3 text-xs text-slate-205 text-slate-250 placeholder-slate-600 outline-none transition"
          />
        </div>
      )}
      {gachaResult && !isSpinning && (
        <div className="mb-5 p-3.5 bg-indigo-950/15 border border-indigo-550/10 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 select-none">
            <span className="text-sm">✨</span>
            <span className="text-xs text-slate-300 font-semibold">
              今日許願：<strong className="text-indigo-300 font-extrabold">“ {wishingNote || '希望衝裝順利、全隊爆寶！'} ”</strong>
            </span>
          </div>
          <button 
            type="button" 
            onClick={() => {
              const newWish = prompt("修改您的今日星空願望：", wishingNote);
              if (newWish !== null) {
                setWishingNote(newWish);
                localStorage.setItem('nyxshade_last_wishing_note', newWish);
                if (onSaveFortune) {
                  onSaveFortune(gachaResult, newWish).catch(e => console.error(e));
                }
                showToast("✨ 星空願望儲存成功！已同步展示於公會大數據看板！", "success");
              }
            }}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-black bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/25 shrink-0 select-none text-center"
          >
            ✏️ 修改今天的心願
          </button>
        </div>
      )}

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

      {showDashboard && (
        <div className="mt-8 pt-8 border-t border-indigo-900/40">
          <FortuneDashboard
            fortunesList={fortunesList}
            activeCharacter={activeCharacter}
            customUid={customUid}
            showToast={showToast}
          />
        </div>
      )}
    </div>
  );
}
